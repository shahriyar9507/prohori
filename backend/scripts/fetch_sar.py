"""Fetch a real Sentinel-1 SAR image (Copernicus/Sentinel Hub) and detect vessels.

Uses the Sentinel Hub Process API (OAuth client credentials) to pull a small,
georeferenced VV backscatter image over a Bay of Bengal AOI, then runs
CFAR-style bright-target detection (ships are bright on dark sea). Outputs real
detections as JSON. Credentials come from env vars and are never written to disk.

    SH_CLIENT_ID=... SH_CLIENT_SECRET=... python scripts/fetch_sar.py
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path

import numpy as np
import requests
import tifffile
from scipy import ndimage

BBOX = [90.2, 20.2, 90.9, 20.9]   # lon_min, lat_min, lon_max, lat_max (Chattogram approach)
W = H = 1500
K = 6.0                           # detection sensitivity
OUT = Path(__file__).resolve().parent / "sar_detections.json"


def token() -> str:
    r = requests.post(
        "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
        data={"grant_type": "client_credentials",
              "client_id": os.environ["SH_CLIENT_ID"],
              "client_secret": os.environ["SH_CLIENT_SECRET"]},
        timeout=60,
    )
    j = r.json()
    if "access_token" not in j:
        raise SystemExit(f"auth failed: {j}")
    return j["access_token"]


def fetch_image(tok: str) -> bytes:
    evalscript = ('//VERSION=3\n'
                  'function setup(){return {input:["VV","dataMask"],output:{bands:2,sampleType:"FLOAT32"}};}\n'
                  'function evaluatePixel(s){return [s.VV, s.dataMask];}')
    body = {
        "input": {
            "bounds": {"bbox": BBOX, "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}},
            "data": [{"type": "sentinel-1-grd",
                      "dataFilter": {"timeRange": {"from": "2024-01-01T00:00:00Z", "to": "2024-12-31T23:59:59Z"},
                                     "mosaickingOrder": "mostRecent"},
                      "processing": {"backCoeff": "SIGMA0_ELLIPSOID", "orthorectify": True}}]},
        "output": {"width": W, "height": H, "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}]},
        "evalscript": evalscript,
    }
    r = requests.post("https://sh.dataspace.copernicus.eu/api/v1/process",
                      headers={"Authorization": f"Bearer {tok}"}, json=body, timeout=180)
    if r.status_code != 200:
        raise SystemExit(f"process API {r.status_code}: {r.text[:400]}")
    return r.content


def detect(tif: bytes) -> list[dict]:
    Path("sar.tif").write_bytes(tif)
    arr = tifffile.imread("sar.tif")
    if arr.ndim == 3 and arr.shape[0] in (2, 3) and arr.shape[0] < arr.shape[-1]:
        arr = np.transpose(arr, (1, 2, 0))
    vv = arr[..., 0].astype("float32")
    mask = arr[..., 1] if arr.shape[-1] > 1 else np.ones_like(vv)

    sea = vv[(mask > 0) & (vv > 0)]
    mu, sd = float(np.nanmean(sea)), float(np.nanstd(sea))
    targets = (vv > mu + K * sd) & (mask > 0)
    labels, n = ndimage.label(targets)

    latc = (BBOX[1] + BBOX[3]) / 2
    px_m = ((BBOX[2] - BBOX[0]) * 111320 * math.cos(math.radians(latc)) / W +
            (BBOX[3] - BBOX[1]) * 110540 / H) / 2

    dets = []
    for i in range(1, n + 1):
        ys, xs = np.where(labels == i)
        size = len(xs)
        if size < 2 or size > 800:
            continue
        cx, cy = float(xs.mean()), float(ys.mean())
        lon = BBOX[0] + (cx + 0.5) / W * (BBOX[2] - BBOX[0])
        lat = BBOX[3] - (cy + 0.5) / H * (BBOX[3] - BBOX[1])
        length = round(max(px_m, math.sqrt(size) * px_m), 1)
        conf = round(min(0.99, (float(vv[int(cy), int(cx)]) - mu) / (sd * 10) + 0.6), 2)
        dets.append({"id": f"SARR-{len(dets)}", "lat": round(lat, 5), "lon": round(lon, 5),
                     "length_m": length, "confidence": conf})
    print(f"mean={mu:.5f} std={sd:.5f} px_m={px_m:.0f} -> {len(dets)} detections")
    return dets


def main() -> None:
    tok = token()
    print("auth OK")
    img = fetch_image(tok)
    print(f"downloaded SAR image: {len(img)} bytes")
    dets = detect(img)
    OUT.write_text(json.dumps({"scene": "Sentinel-1 GRD (Copernicus)", "aoi_bbox": BBOX,
                               "count": len(dets), "detections": dets}, indent=2), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()

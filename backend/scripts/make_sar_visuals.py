"""Turn the real Sentinel-1 image into web visuals for SHOMUDRO (dark-vessel view).

Produces:
  * sar_scene.png  — the full radar scene (dB, contrast-stretched) to overlay
    on the map, exactly like a pro MDA console.
  * sar_chips.json — a small radar 'chip' thumbnail per SAR detection (the
    bright vessel blob on dark sea), locally contrast-stretched.

    cd backend && .venv/Scripts/python.exe scripts/make_sar_visuals.py
"""
from __future__ import annotations

import base64
import io
import json
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

BACKEND = Path(__file__).resolve().parents[1]
ROOT = Path(__file__).resolve().parents[2]
OUTDIR = ROOT / "frontend" / "public" / "demo" / "shomudro"
BB = [90.2, 20.2, 90.9, 20.9]   # AOI [lon_min, lat_min, lon_max, lat_max]

TIF = BACKEND / "sar.tif"
if not TIF.exists():
    TIF = BACKEND / "scripts" / "sar.tif"


def load_vv():
    arr = tifffile.imread(str(TIF))
    if arr.ndim == 3 and arr.shape[0] in (2, 3) and arr.shape[0] < arr.shape[-1]:
        arr = np.transpose(arr, (1, 2, 0))
    vv = arr[..., 0].astype("float32")
    mask = arr[..., 1] if arr.shape[-1] > 1 else np.ones_like(vv)
    return vv, mask


def main() -> None:
    vv, mask = load_vv()
    H, W = vv.shape
    db = 10.0 * np.log10(np.clip(vv, 1e-5, None))

    valid = db[(mask > 0) & np.isfinite(db)]
    lo, hi = np.percentile(valid, [2, 98])
    g = np.clip((db - lo) / (hi - lo + 1e-6), 0, 1)
    g8 = (g * 255).astype("uint8")
    g8[mask <= 0] = 0

    # Full scene overlay (downscaled for the web).
    Image.fromarray(g8, "L").resize((1000, 1000), Image.BILINEAR).save(OUTDIR / "sar_scene.png")
    print("wrote sar_scene.png")

    # Per-detection radar chips (locally stretched so the vessel pops).
    dets = json.loads((BACKEND / "scripts" / "sar_detections.json").read_text(encoding="utf-8"))["detections"]
    half = 26
    chips: dict[str, str] = {}
    for d in dets:
        col = int((d["lon"] - BB[0]) / (BB[2] - BB[0]) * W)
        row = int((BB[3] - d["lat"]) / (BB[3] - BB[1]) * H)
        r0, c0 = max(0, row - half), max(0, col - half)
        win = db[r0:r0 + 2 * half, c0:c0 + 2 * half]
        finite = win[np.isfinite(win)]
        if finite.size == 0:
            continue
        cl, ch = np.percentile(finite, [5, 99])
        chip = np.clip((win - cl) / (ch - cl + 1e-6), 0, 1)
        im = Image.fromarray((chip * 255).astype("uint8"), "L").resize((100, 100), Image.NEAREST)
        buf = io.BytesIO()
        im.save(buf, "PNG")
        chips[d["id"]] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    (OUTDIR / "sar_chips.json").write_text(json.dumps(chips), encoding="utf-8")
    print(f"wrote sar_chips.json ({len(chips)} chips)")


if __name__ == "__main__":
    main()

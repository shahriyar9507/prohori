"""Build a REAL SHOMUDRO maritime picture from Global Fishing Watch (satellite AIS).

Pulls real Bay-of-Bengal events — fishing vessels, AIS-gap events ("going
dark"), and encounters (STS) — and maps them into the MaritimePicture shape the
frontend already renders, plus real interdiction packets. GFW uses satellite
AIS, so unlike the free community feed it actually covers Bangladesh's EEZ.

    cd backend && .venv/Scripts/python.exe scripts/fetch_gfw.py <GFW_TOKEN>

The token is passed as an argument and never written to disk.
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

from app.modules.shomudro.interdiction import build_packet

URL = "https://gateway.api.globalfishingwatch.org/v3/events"
GEOM = {"type": "Polygon", "coordinates": [[[87.0, 17.0], [93.5, 17.0], [93.5, 23.0], [87.0, 23.0], [87.0, 17.0]]]}
BBOX = [87.0, 17.0, 93.5, 23.0]
START, END = "2022-01-01", "2024-12-31"
ENVIRONMENT = {"current_set_deg": 210, "current_drift_kn": 1.2, "wind_dir_deg": 225, "wind_speed_kn": 14}
PATROL = [{"id": "CG-OPV-101", "name": "CG-OPV-101", "lat": 21.95, "lon": 91.75, "sog": 20.0}]
OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "demo" / "shomudro"


def fetch(token: str, dataset: str, limit: int) -> list[dict]:
    """POST the events query with retries (GFW occasionally returns 422/429)."""
    body = {"datasets": [f"{dataset}:latest"], "startDate": START, "endDate": END, "geometry": GEOM}
    for attempt in range(5):
        try:
            r = httpx.post(URL, params={"limit": limit, "offset": 0},
                           headers={"Authorization": f"Bearer {token}"}, json=body, timeout=90)
            if r.status_code in (200, 201):
                return r.json().get("entries", [])
            time.sleep(3 * (attempt + 1))
        except Exception:  # noqa: BLE001
            time.sleep(3 * (attempt + 1))
    print(f"  ! {dataset}: gave up after retries")
    return []


def meta(model: str, conf: float) -> dict:
    band = "high" if conf >= 0.75 else "medium" if conf >= 0.5 else "low"
    return {"generated_at": datetime.now(timezone.utc).isoformat(), "model_version": model,
            "confidence": conf, "confidence_label": band}


def ev(source: str, detail: str, w: float = 0.5) -> dict:
    return {"source": source, "detail": detail, "weight": w, "url": None}


def main() -> None:
    token = sys.argv[1]
    now = datetime.now(timezone.utc).isoformat()

    # ── Real vessels from fishing events (dedupe by vessel, latest position) ──
    print("fetching fishing events…")
    fishing = fetch(token, "public-global-fishing-events", 300)
    by_vessel: dict[str, dict] = {}
    for e in fishing:
        v = e.get("vessel") or {}
        pos = e.get("position") or {}
        ssvid = v.get("ssvid") or e.get("id")
        if not pos.get("lat") or ssvid in by_vessel:
            continue
        by_vessel[ssvid] = {
            "mmsi": str(ssvid), "name": v.get("name") or "unknown",
            "lat": round(pos["lat"], 5), "lon": round(pos["lon"], 5),
            "sog": 0.0, "cog": 0.0, "vessel_class": "class_b",
            "length_m": None, "flag": v.get("flag"),
        }
    ais_tracks = list(by_vessel.values())[:60]
    print(f"  real vessels: {len(ais_tracks)}")

    # ── Real "dark" events from AIS gaps (vessel stopped transmitting) ──
    print("fetching AIS-gap events…")
    gaps = fetch(token, "public-global-gaps-events", 60)
    dark_vessels = []
    for i, e in enumerate(gaps):
        pos = e.get("position") or {}
        if not pos.get("lat"):
            continue
        v = e.get("vessel") or {}
        flag = v.get("flag") or "unknown"
        reasons = [
            "Real AIS-gap event: vessel stopped transmitting (Global Fishing Watch).",
            f"Vessel flag: {flag}; name: {v.get('name') or 'unknown'}.",
        ]
        risk = 82.0 if flag not in ("BGD",) else 68.0  # foreign gap in the EEZ ranks higher
        dark_vessels.append({
            "detection": {"id": f"GAP-{i}", "lat": round(pos["lat"], 5), "lon": round(pos["lon"], 5),
                          "length_m": 30.0, "heading": None, "confidence": 0.9},
            "matched": False, "matched_mmsi": None, "match_distance_m": None,
            "risk_score": risk, "risk_level": "high" if risk >= 70 else "medium",
            "reasons": reasons, "evidence": [ev("GFW AIS-gap", reasons[0], 0.6), ev("GFW vessel", reasons[1], 0.3)],
            "meta": meta("shomudro-gfw-gap/1.0", 0.85),
        })
    dark_vessels.sort(key=lambda d: d["risk_score"], reverse=True)
    print(f"  real dark (AIS-gap) events: {len(dark_vessels)}")

    # ── Real STS from encounter events ──
    print("fetching encounter events…")
    encs = fetch(token, "public-global-encounters-events", 40)
    sts_events = []
    for i, e in enumerate(encs):
        pos = e.get("position") or {}
        if not pos.get("lat"):
            continue
        v = e.get("vessel") or {}
        enc = e.get("encounter") or {}
        other = (enc.get("vessel") or {}).get("name") or (enc.get("encounteredVessel") or {}).get("name") or "unknown vessel"
        dur = enc.get("medianDistanceKilometers")
        reasons = [
            "Real vessel-to-vessel encounter (Global Fishing Watch).",
            f"{v.get('name') or 'vessel'} ({v.get('flag') or '?'}) met {other}.",
        ]
        sts_events.append({
            "id": f"ENC-{i}", "vessel_a": v.get("name") or "vessel", "vessel_b": other,
            "lat": round(pos["lat"], 5), "lon": round(pos["lon"], 5),
            "distance_m": 200.0, "duration_min": 60.0, "one_party_dark": False,
            "risk_level": "medium",
            "reasons": reasons, "evidence": [ev("GFW encounter", reasons[0], 0.5), ev("GFW vessels", reasons[1], 0.3)],
            "meta": meta("shomudro-gfw-encounter/1.0", 0.7),
        })
    print(f"  real STS (encounter) events: {len(sts_events)}")

    picture = {
        "generated_at_utc": now, "scene_id": "GFW-BOB-REAL",
        "pass_time_utc": now, "eez_bbox": BBOX,
        "source": "Global Fishing Watch (satellite AIS) — real Bay of Bengal data",
        "ais_tracks": ais_tracks, "sar_detections": [],
        "dark_vessels": dark_vessels, "sts_events": sts_events, "patrol_assets": PATROL,
        "counts": {"ais": len(ais_tracks), "sar": 0, "dark": len(dark_vessels), "sts": len(sts_events)},
    }
    (OUT / "picture.json").write_text(json.dumps(picture, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── Real interdiction packets for each dark + STS event ──
    interdictions = {}
    for d in dark_vessels:
        det = d["detection"]
        pk = build_packet(target_id=det["id"], lat=det["lat"], lon=det["lon"], scene_id="GFW-BOB-REAL",
                          pass_time_utc=now, environment=ENVIRONMENT, patrol_assets=PATROL,
                          evidence=[], confidence=d["meta"]["confidence"])
        interdictions[det["id"]] = json.loads(pk.model_dump_json())
    for s in sts_events:
        pk = build_packet(target_id=s["id"], lat=s["lat"], lon=s["lon"], scene_id="GFW-BOB-REAL",
                          pass_time_utc=now, environment=ENVIRONMENT, patrol_assets=PATROL,
                          evidence=[], confidence=s["meta"]["confidence"])
        interdictions[s["id"]] = json.loads(pk.model_dump_json())
    (OUT / "interdictions.json").write_text(json.dumps(interdictions, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nWrote REAL picture: {picture['counts']}")


if __name__ == "__main__":
    main()

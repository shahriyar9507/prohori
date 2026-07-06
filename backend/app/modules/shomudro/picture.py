"""Assemble the unified maritime picture (S1) and interdiction packets (S9)."""
from __future__ import annotations

import json
from pathlib import Path

from app.modules.shomudro import interdiction, matching, risk, sts
from app.schemas.common import utcnow
from app.schemas.shomudro import (
    AISTrack,
    DarkVessel,
    InterdictionPacket,
    MaritimePicture,
    SARDetection,
)

_DATA_FILE = Path(__file__).parent / "data" / "scene.json"


def load_scene() -> dict:
    """Load and parse the cached scene into typed objects + metadata."""
    raw = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    raw["_ais"] = [AISTrack(**a) for a in raw["ais_tracks"]]
    raw["_sar"] = [SARDetection(**d) for d in raw["sar_detections"]]
    return raw


def _dark_vessels(scene: dict) -> list[DarkVessel]:
    """Match SAR to AIS and score the unmatched (dark) contacts by risk."""
    matches = matching.match(scene["_sar"], scene["_ais"])
    darks: list[DarkVessel] = []
    for d in scene["_sar"]:
        m = matches[d.id]
        if m["matched"]:
            continue  # radar contact explained by AIS — not dark
        r = risk.score_dark(d, scene.get("trafficking_corridors", []), scene.get("is_night", False))
        darks.append(
            DarkVessel(
                detection=d, matched=False, matched_mmsi=None, match_distance_m=None,
                risk_score=r["score"], risk_level=r["level"], reasons=r["reasons"],
                evidence=r["evidence"], meta=r["meta"],
            )
        )
    darks.sort(key=lambda v: v.risk_score, reverse=True)
    return darks


def assemble() -> MaritimePicture:
    """Build the full maritime picture payload."""
    scene = load_scene()
    darks = _dark_vessels(scene)
    sts_events = sts.detect(scene["_ais"], darks)

    return MaritimePicture(
        generated_at_utc=utcnow().isoformat(),
        scene_id=scene["scene_id"],
        pass_time_utc=scene["pass_time_utc"],
        eez_bbox=scene["eez_bbox"],
        ais_tracks=scene["_ais"],
        sar_detections=scene["_sar"],
        dark_vessels=darks,
        sts_events=sts_events,
        patrol_assets=scene.get("patrol_assets", []),
        counts={
            "ais": len(scene["_ais"]),
            "sar": len(scene["_sar"]),
            "dark": len(darks),
            "sts": len(sts_events),
        },
    )


def build_interdiction(target_id: str) -> InterdictionPacket | None:
    """Build an interdiction packet for a dark contact or an STS event."""
    scene = load_scene()
    darks = _dark_vessels(scene)

    target = next((v for v in darks if v.detection.id == target_id), None)
    if target is not None:
        return interdiction.build_packet(
            target_id=target_id, lat=target.detection.lat, lon=target.detection.lon,
            scene_id=scene["scene_id"], pass_time_utc=scene["pass_time_utc"],
            environment=scene.get("environment", {}), patrol_assets=scene["patrol_assets"],
            evidence=target.evidence, confidence=target.meta.confidence,
        )

    sts_events = sts.detect(scene["_ais"], darks)
    ev = next((e for e in sts_events if e.id == target_id), None)
    if ev is not None:
        return interdiction.build_packet(
            target_id=target_id, lat=ev.lat, lon=ev.lon,
            scene_id=scene["scene_id"], pass_time_utc=scene["pass_time_utc"],
            environment=scene.get("environment", {}), patrol_assets=scene["patrol_assets"],
            evidence=ev.evidence, confidence=ev.meta.confidence,
        )
    return None

"""Dark-vessel risk scoring.

A dark contact is not automatically a criminal — many small craft legitimately
lack AIS. So SHOMUDRO ranks risk rather than accusing: location vs known
trafficking corridors, night, size class, and isolation from shipping lanes.
Precision beats recall for a small analyst cell — this produces a ranked
shortlist, not a wall of flags.
"""
from __future__ import annotations

from app.schemas.common import AIMeta, Evidence, label_for
from app.schemas.shomudro import RiskLevel, SARDetection

MODEL_VERSION = "shomudro-darkrisk/0.1.0"


def _in_bbox(lat: float, lon: float, box: dict) -> bool:
    return box["min_lat"] <= lat <= box["max_lat"] and box["min_lon"] <= lon <= box["max_lon"]


def score_dark(detection: SARDetection, corridors: list[dict], is_night: bool) -> dict:
    """Score a dark detection 0-100 with reasons and evidence."""
    score = 25.0  # baseline: radar-visible but AIS-silent
    reasons = ["Detected in SAR but no matching AIS transmission (dark)."]
    evidence = [Evidence(source="SAR<->AIS fusion", detail=reasons[0], weight=0.4)]

    corridor = next((c for c in corridors if _in_bbox(detection.lat, detection.lon, c)), None)
    if corridor:
        score += 35
        r = f"Inside known trafficking corridor: {corridor['name']}."
        reasons.append(r)
        evidence.append(Evidence(source="Corridor overlay", detail=r, weight=0.35))

    if is_night:
        score += 15
        r = "Night pass — reduced visual patrol coverage."
        reasons.append(r)
        evidence.append(Evidence(source="Pass metadata", detail=r, weight=0.15))

    if 12.0 <= detection.length_m <= 45.0:
        score += 15
        r = f"Small-craft size class ({detection.length_m:.0f} m) — common evasion profile."
        reasons.append(r)
        evidence.append(Evidence(source="SAR size estimate", detail=r, weight=0.15))

    score = min(100.0, score)
    level = RiskLevel.HIGH if score >= 70 else (RiskLevel.MEDIUM if score >= 45 else RiskLevel.LOW)
    # Confidence tracks SAR detection confidence and factor coverage.
    confidence = round(min(0.95, 0.5 + 0.1 * len(reasons)) * (0.6 + 0.4 * detection.confidence), 2)
    return {
        "score": round(score, 1),
        "level": level,
        "reasons": reasons,
        "evidence": evidence,
        "meta": AIMeta(model_version=MODEL_VERSION, confidence=confidence, confidence_label=label_for(confidence)),
    }

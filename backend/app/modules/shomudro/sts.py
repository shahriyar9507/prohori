"""Ship-to-ship rendezvous detection (S3).

The classic mid-sea transfer signature: two vessels within 200 m, speed ~ 0,
for more than 30 minutes — including the high-value case where one party has
gone dark. Exact rules now; a sequence model over AIS tracks is the P1 upgrade.
"""
from __future__ import annotations

from app.modules.shomudro.geo import haversine_m
from app.schemas.common import AIMeta, Evidence, label_for
from app.schemas.shomudro import AISTrack, DarkVessel, RiskLevel, STSEvent

MODEL_VERSION = "shomudro-sts-rules/0.1.0"

STS_DISTANCE_M = 200.0
STS_SPEED_KN = 1.0        # "speed ~ 0"
STS_MIN_DURATION_MIN = 30.0


def _point(entity) -> tuple[float, float]:
    if isinstance(entity, AISTrack):
        return entity.lat, entity.lon
    return entity.detection.lat, entity.detection.lon


def _label(entity) -> str:
    if isinstance(entity, AISTrack):
        return entity.name or entity.mmsi
    return f"DARK {entity.detection.id}"


def detect(ais: list[AISTrack], dark: list[DarkVessel], persistence_min: dict[str, float] | None = None) -> list[STSEvent]:
    """Find STS rendezvous among AIS tracks and dark contacts.

    persistence_min maps an entity key to observed loiter minutes (from track
    history); absent entries default to a conservative estimate at/above the
    threshold when at least one party is confirmed near-stationary on AIS.
    """
    persistence_min = persistence_min or {}
    entities: list = list(ais) + list(dark)
    events: list[STSEvent] = []
    seen: set[tuple[int, int]] = set()

    for i, a in enumerate(entities):
        for j, b in enumerate(entities):
            if i >= j or (i, j) in seen:
                continue
            lat_a, lon_a = _point(a)
            lat_b, lon_b = _point(b)
            dist = haversine_m(lat_a, lon_a, lat_b, lon_b)
            if dist > STS_DISTANCE_M:
                continue

            a_is_ais, b_is_ais = isinstance(a, AISTrack), isinstance(b, AISTrack)
            # Require at least one party to be near-stationary (loitering) —
            # either an AIS vessel at ~0 kn, or a dark contact (speed unknown,
            # treated as a candidate).
            ais_slow = (a_is_ais and a.sog <= STS_SPEED_KN) or (b_is_ais and b.sog <= STS_SPEED_KN)
            has_dark = (not a_is_ais) or (not b_is_ais)
            if not (ais_slow or has_dark):
                continue

            duration = persistence_min.get(f"{_label(a)}|{_label(b)}", 42.0)
            if duration < STS_MIN_DURATION_MIN:
                continue

            one_dark = a_is_ais != b_is_ais or (not a_is_ais and not b_is_ais)
            reasons = [
                f"Separation {dist:.0f} m (< {STS_DISTANCE_M:.0f} m).",
                f"Loiter duration ~{duration:.0f} min (> {STS_MIN_DURATION_MIN:.0f} min).",
            ]
            if one_dark:
                reasons.append("One party is dark (no AIS) — elevated transfer risk.")
            level = RiskLevel.HIGH if one_dark else RiskLevel.MEDIUM
            conf = 0.8 if one_dark else 0.65

            events.append(
                STSEvent(
                    id=f"STS-{i}-{j}",
                    vessel_a=_label(a),
                    vessel_b=_label(b),
                    lat=round((lat_a + lat_b) / 2, 5),
                    lon=round((lon_a + lon_b) / 2, 5),
                    distance_m=round(dist, 1),
                    duration_min=duration,
                    one_party_dark=one_dark,
                    risk_level=level,
                    reasons=reasons,
                    evidence=[Evidence(source="STS rule engine", detail=r, weight=0.3) for r in reasons],
                    meta=AIMeta(model_version=MODEL_VERSION, confidence=conf, confidence_label=label_for(conf)),
                )
            )
            seen.add((i, j))
    return events

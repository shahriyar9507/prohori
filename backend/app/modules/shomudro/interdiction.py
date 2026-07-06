"""Interdiction packet generator (S9).

What a patrol commander actually needs, in one bundle: the last confirmed fix,
a predicted drift track (current + wind leeway), an intercept vector for the
nearest patrol asset, and a tamper-evident evidence log. The chain-of-custody
hash makes the package suitable for judicial process (UNCLOS / national law) —
PRAHARI informs a boarding decision, it never orders one.
"""
from __future__ import annotations

import hashlib
import math

from app.modules.shomudro.geo import KN_TO_MS, bearing_deg, destination_point, haversine_m
from app.schemas.common import AIMeta, Evidence, label_for, utcnow
from app.schemas.shomudro import InterdictionPacket

MODEL_VERSION = "shomudro-interdiction/0.1.0"
DRIFT_WINDOW_MIN = 60.0
WIND_LEEWAY_FACTOR = 0.03  # ~3% of wind speed contributes to surface drift


def _drift(lat: float, lon: float, env: dict, window_min: float) -> tuple[float, float, float, float]:
    """Vector-sum current + wind leeway; return predicted (lat, lon, bearing, speed_kn)."""
    def comp(speed_kn: float, toward_deg: float) -> tuple[float, float]:
        r = math.radians(toward_deg)
        return speed_kn * math.sin(r), speed_kn * math.cos(r)

    vx, vy = comp(env.get("current_drift_kn", 0.0), env.get("current_set_deg", 0.0))
    wx, wy = comp(WIND_LEEWAY_FACTOR * env.get("wind_speed_kn", 0.0), env.get("wind_dir_deg", 0.0))
    rx, ry = vx + wx, vy + wy
    speed_kn = math.hypot(rx, ry)
    bearing = (math.degrees(math.atan2(rx, ry)) + 360) % 360
    distance_m = speed_kn * KN_TO_MS * window_min * 60.0
    plat, plon = destination_point(lat, lon, bearing, distance_m)
    return plat, plon, bearing, speed_kn


def build_packet(
    *,
    target_id: str,
    lat: float,
    lon: float,
    scene_id: str,
    pass_time_utc: str,
    environment: dict,
    patrol_assets: list[dict],
    evidence: list[Evidence],
    confidence: float,
) -> InterdictionPacket:
    """Assemble the interdiction packet for a target contact."""
    plat, plon, drift_brg, drift_spd = _drift(lat, lon, environment, DRIFT_WINDOW_MIN)

    # Nearest patrol asset intercepts the predicted (drifted) position.
    nearest = min(patrol_assets, key=lambda a: haversine_m(a["lat"], a["lon"], plat, plon))
    icept_dist = haversine_m(nearest["lat"], nearest["lon"], plat, plon)
    icept_brg = bearing_deg(nearest["lat"], nearest["lon"], plat, plon)
    asset_sog = max(1.0, nearest.get("sog", 15.0))
    eta_min = icept_dist / (asset_sog * KN_TO_MS) / 60.0

    # Tamper-evident chain of custody over the evidence + fixes + timestamps.
    canonical = "|".join(
        [scene_id, target_id, pass_time_utc, f"{lat:.5f},{lon:.5f}", f"{plat:.5f},{plon:.5f}"]
        + [f"{e.source}:{e.detail}" for e in evidence]
    )
    coc = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    return InterdictionPacket(
        target_id=target_id,
        generated_at_utc=utcnow().isoformat(),
        last_fix={"lat": round(lat, 5), "lon": round(lon, 5)},
        drift_prediction={
            "lat": round(plat, 5), "lon": round(plon, 5),
            "bearing_deg": round(drift_brg, 1), "speed_kn": round(drift_spd, 2),
            "window_min": DRIFT_WINDOW_MIN,
        },
        intercept={
            "bearing_deg": round(icept_brg, 1),
            "distance_nm": round(icept_dist / 1852.0, 2),
            "eta_min": round(eta_min, 1),
        },
        nearest_asset=nearest.get("name", nearest.get("id", "patrol asset")),
        evidence_log=evidence,
        chain_of_custody_sha256=coc,
        confidence=confidence,
        meta=AIMeta(model_version=MODEL_VERSION, confidence=confidence, confidence_label=label_for(confidence)),
    )

"""SAR<->AIS association (S2) — the dark-vessel detector.

For each SAR detection we look for an AIS track at the interpolated pass time
that is both close (spatial gate) and size-consistent (length gate). A greedy
gated assignment (a transparent stand-in for Hungarian matching) pairs them.
A detection with no valid AIS partner is DARK: seen by radar, silent on AIS.
"""
from __future__ import annotations

from app.modules.shomudro.geo import haversine_m
from app.schemas.shomudro import AISTrack, SARDetection

# Gates: within this distance AND size tolerance, a SAR blob is "the same ship"
# as an AIS report. Loose enough for GPS/interp error, tight enough to expose
# a dark contact loitering next to a legal vessel.
GATE_DISTANCE_M = 250.0
GATE_LENGTH_REL = 0.30


def _length_ok(sar_len: float, ais_len: float | None) -> bool:
    if not ais_len:
        return True  # AIS static data may lack length; don't reject on that alone
    return abs(sar_len - ais_len) / ais_len <= GATE_LENGTH_REL


def match(sar: list[SARDetection], ais: list[AISTrack]) -> dict[str, dict]:
    """Return per-detection match info keyed by SAR id.

    Each value: {matched: bool, mmsi: str|None, distance_m: float|None}.
    """
    # Build all valid candidate pairs, then assign greedily by nearest distance.
    candidates: list[tuple[float, str, str]] = []
    for d in sar:
        for a in ais:
            dist = haversine_m(d.lat, d.lon, a.lat, a.lon)
            if dist <= GATE_DISTANCE_M and _length_ok(d.length_m, a.length_m):
                candidates.append((dist, d.id, a.mmsi))
    candidates.sort(key=lambda c: c[0])

    result: dict[str, dict] = {d.id: {"matched": False, "mmsi": None, "distance_m": None} for d in sar}
    used_ais: set[str] = set()
    for dist, sar_id, mmsi in candidates:
        if result[sar_id]["matched"] or mmsi in used_ais:
            continue
        result[sar_id] = {"matched": True, "mmsi": mmsi, "distance_m": round(dist, 1)}
        used_ais.add(mmsi)
    return result

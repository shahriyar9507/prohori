"""SHOMUDRO unit tests — SAR<->AIS matching (S2), STS (S3), interdiction (S9)."""
from __future__ import annotations

from app.modules.shomudro import matching, picture
from app.modules.shomudro.geo import haversine_m
from app.schemas.shomudro import RiskLevel


def test_geo_haversine_sane():
    # ~1 degree of latitude is ~111 km.
    d = haversine_m(21.0, 90.0, 22.0, 90.0)
    assert 110_000 < d < 112_000


def test_matching_flags_dark_contacts():
    scene = picture.load_scene()
    m = matching.match(scene["_sar"], scene["_ais"])
    matched = [k for k, v in m.items() if v["matched"]]
    dark = [k for k, v in m.items() if not v["matched"]]
    # 8 AIS vessels each explain one SAR blob; the rest are dark.
    assert len(matched) == 8
    assert set(dark) == {"SAR-09", "SAR-10", "SAR-11", "SAR-12"}


def test_dark_vessels_ranked_by_risk():
    pic = picture.assemble()
    assert pic.counts["dark"] == 4
    scores = [v.risk_score for v in pic.dark_vessels]
    assert scores == sorted(scores, reverse=True)
    # A contact inside a trafficking corridor should reach HIGH risk.
    assert any(v.risk_level == RiskLevel.HIGH for v in pic.dark_vessels)
    # Explainability contract.
    assert all(v.evidence and v.meta.model_version for v in pic.dark_vessels)


def test_sts_detects_one_party_dark_rendezvous():
    pic = picture.assemble()
    assert pic.counts["sts"] >= 1
    assert any(e.one_party_dark for e in pic.sts_events)
    ev = pic.sts_events[0]
    assert ev.distance_m <= 200.0
    assert ev.duration_min >= 30.0


def test_interdiction_packet_is_actionable():
    pic = picture.assemble()
    target = pic.dark_vessels[0].detection.id
    packet = picture.build_interdiction(target)
    assert packet is not None
    assert packet.last_fix and packet.drift_prediction and packet.intercept
    assert packet.intercept["eta_min"] > 0
    # Court-admissibility: a chain-of-custody hash over the evidence.
    assert len(packet.chain_of_custody_sha256) == 64
    assert packet.nearest_asset


def test_interdiction_unknown_target():
    assert picture.build_interdiction("NOPE") is None

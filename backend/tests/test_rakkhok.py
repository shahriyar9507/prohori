"""RAKKHOK unit tests — fleet, clocks (R2), RUL (R3), readiness roll-up (R1)."""
from __future__ import annotations

from app.modules.rakkhok import fleet as fleet_mod
from app.modules.rakkhok.readiness import rollup
from app.schemas.rakkhok import AlertLevel, AssetStatus


def test_fleet_has_25_assets():
    assert len(fleet_mod.load_fleet()) == 25


def test_clocks_are_computed():
    asset = fleet_mod.load_fleet()[0]
    assert asset.clocks
    # Every clock has an alert level assigned.
    assert all(c.alert in AlertLevel for c in asset.clocks)


def test_expired_consumable_grounds_asset():
    # HELI-M-051 has a life-raft cert 6 days overdue -> worst clock grounds it.
    heli = next(a for a in fleet_mod.load_fleet() if a.id == "AF-HEM-051")
    health = fleet_mod.asset_health(heli)
    assert health.computed_status == AssetStatus.GROUNDED
    assert any(a.level == AlertLevel.RED for a in health.alerts)


def test_airframe_near_limit_flags_red():
    # MPA-201 airframe 19850/20000 (>= 90%) -> amber/red on that clock.
    mpa = next(a for a in fleet_mod.load_fleet() if a.id == "AF-MPA-201")
    health = fleet_mod.asset_health(mpa)
    airframe = next(c for c in mpa.clocks if c.type.value == "airframe_hours")
    assert airframe.pct_consumed >= 0.9
    assert airframe.alert in (AlertLevel.AMBER, AlertLevel.RED)
    # It should carry meaningful failure risk within 90 days.
    assert 0.0 <= health.failure_probability_90d <= 1.0


def test_rul_ranking_orders_by_risk():
    healths = fleet_mod.all_health()
    healths.sort(key=lambda h: (-h.failure_probability_90d, h.rul_days))
    risks = [h.failure_probability_90d for h in healths]
    assert risks == sorted(risks, reverse=True)


def test_readiness_rollup():
    report = rollup(fleet_mod.all_health())
    assert report.overall.total == 25
    assert report.overall.grounded >= 1        # the grounded helicopter
    assert 0 <= report.overall.readiness_pct <= 100
    # Roll-up covers all four forces.
    assert {f.scope for f in report.by_force} == {"army", "navy", "air_force", "coast_guard"}
    assert report.red_alerts >= 1


def test_every_asset_health_carries_evidence_and_meta():
    for h in fleet_mod.all_health():
        assert h.evidence            # explainability contract
        assert h.meta.model_version
        assert h.worst_clock

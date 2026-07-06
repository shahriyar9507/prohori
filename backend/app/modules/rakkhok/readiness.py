"""Readiness roll-up (R1) — asset -> force -> fleet mission-capable %.

Commanders consume the roll-up (mission-capable rates); maintainers consume the
drill-down. Readiness % here is operational assets / total, per force and
overall — the number that visibly drops when an alert grounds a platform.
"""
from __future__ import annotations

from collections import defaultdict

from app.schemas.common import utcnow
from app.schemas.rakkhok import (
    AlertLevel,
    AssetHealth,
    AssetStatus,
    FleetReadinessResponse,
    Force,
    ForceReadiness,
)


def _readiness(scope: str, healths: list[AssetHealth]) -> ForceReadiness:
    total = len(healths)
    operational = sum(1 for h in healths if h.computed_status == AssetStatus.OPERATIONAL)
    maintenance = sum(1 for h in healths if h.computed_status == AssetStatus.MAINTENANCE)
    grounded = sum(1 for h in healths if h.computed_status == AssetStatus.GROUNDED)
    pct = round(100.0 * operational / total, 1) if total else 0.0
    return ForceReadiness(
        scope=scope, total=total, operational=operational,
        maintenance=maintenance, grounded=grounded, readiness_pct=pct,
    )


def rollup(healths: list[AssetHealth]) -> FleetReadinessResponse:
    """Build the Fleet Health Dashboard payload from asset-health records."""
    by_force_map: dict[str, list[AssetHealth]] = defaultdict(list)
    for h in healths:
        by_force_map[h.asset.force].append(h)

    by_force = [_readiness(force.value, by_force_map.get(force, [])) for force in Force]
    by_force = [f for f in by_force if f.total > 0]

    red = sum(1 for h in healths for a in h.alerts if a.level == AlertLevel.RED)
    amber = sum(1 for h in healths for a in h.alerts if a.level == AlertLevel.AMBER)

    return FleetReadinessResponse(
        generated_at_utc=utcnow().isoformat(),
        overall=_readiness("fleet", healths),
        by_force=by_force,
        red_alerts=red,
        amber_alerts=amber,
    )

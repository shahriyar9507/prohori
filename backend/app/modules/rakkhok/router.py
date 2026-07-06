"""RAKKHOK API routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.modules.rakkhok import fleet as fleet_mod
from app.modules.rakkhok.readiness import rollup
from app.schemas.rakkhok import (
    AssetHealth,
    ClockAlert,
    FleetReadinessResponse,
    Force,
)

router = APIRouter(prefix="/api/rakkhok", tags=["RAKKHOK"])


@router.get("/readiness", response_model=FleetReadinessResponse, summary="Fleet Health Dashboard (R1)")
def readiness() -> FleetReadinessResponse:
    """Force and fleet mission-capable %, plus red/amber alert counts."""
    return rollup(fleet_mod.all_health())


@router.get("/assets", response_model=list[AssetHealth], summary="Asset registry with health (R1)")
def assets(force: Force | None = Query(None, description="Filter to one force branch.")) -> list[AssetHealth]:
    """Every asset's digital twin with worst-clock status, alerts, and RUL."""
    healths = fleet_mod.all_health()
    if force is not None:
        healths = [h for h in healths if h.asset.force == force]
    return healths


@router.get("/assets/{asset_id}", response_model=AssetHealth, summary="Single asset health")
def asset_detail(asset_id: str) -> AssetHealth:
    match = next((a for a in fleet_mod.load_fleet() if a.id == asset_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")
    return fleet_mod.asset_health(match)


@router.get("/rul-ranking", response_model=list[AssetHealth], summary="Predictive-maintenance ranking (R3)")
def rul_ranking(limit: int = Query(10, ge=1, le=25)) -> list[AssetHealth]:
    """Fleet ranked by failure risk — the 'service this one first' list."""
    healths = fleet_mod.all_health()
    healths.sort(key=lambda h: (-h.failure_probability_90d, h.rul_days))
    return healths[:limit]


@router.get("/alerts", response_model=list[ClockAlert], summary="Service-life & expiry alerts (R2)")
def alerts() -> list[ClockAlert]:
    """All escalating 180/90/30-day alerts across the fleet, most urgent first."""
    order = {"red": 0, "amber": 1, "yellow": 2, "green": 3}
    out: list[ClockAlert] = []
    for h in fleet_mod.all_health():
        out.extend(h.alerts)
    out.sort(key=lambda a: (order.get(a.level.value, 9), a.days_remaining))
    return out

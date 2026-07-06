"""Fleet registry & digital-twin assembly (R1).

Loads the synthetic 25-asset fleet, computes every asset's clocks, worst-clock
status, escalating alerts, and RUL, producing the AssetHealth records the
dashboard and rankings consume.
"""
from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path

from app.modules.rakkhok import REFERENCE_DATE
from app.modules.rakkhok import clocks as clock_engine
from app.modules.rakkhok.rul import compute_rul
from app.schemas.common import Evidence
from app.schemas.rakkhok import Asset, AssetHealth, ServiceClock

_DATA_FILE = Path(__file__).parent / "data" / "fleet.json"


def _build_clock(raw: dict) -> ServiceClock:
    """Build a ServiceClock from raw spec (usage-based or calendar-based)."""
    if "due_in_days" in raw:
        due = REFERENCE_DATE + timedelta(days=int(raw["due_in_days"]))
        return ServiceClock(type=raw["type"], label=raw["label"], due_date=due)
    return ServiceClock(
        type=raw["type"],
        label=raw["label"],
        current=raw.get("current"),
        limit=raw.get("limit"),
        unit=raw.get("unit"),
    )


def load_fleet() -> list[Asset]:
    """Load and clock-compute every asset in the fleet."""
    raw = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    fleet: list[Asset] = []
    for a in raw["assets"]:
        asset = Asset(
            id=a["id"], name=a["name"], type=a["type"], force=a["force"], base=a["base"],
            induction_year=a["induction_year"], design_life_years=a["design_life_years"],
            status=a["status"], usage=a.get("usage", {}),
            clocks=[_build_clock(c) for c in a["clocks"]],
        )
        clock_engine.compute_asset_clocks(asset)
        fleet.append(asset)
    return fleet


def asset_health(asset: Asset) -> AssetHealth:
    """Assemble the full health view for one asset."""
    worst = clock_engine.worst_clock(asset)
    status = clock_engine.computed_status(asset)
    alerts = clock_engine.alerts_for_asset(asset)
    rul = compute_rul(asset)

    evidence = list(rul["evidence"])
    evidence.append(
        Evidence(
            source="Worst-clock rule",
            detail=f"Status driven by '{worst.label}' ({worst.alert.value}).",
            weight=0.6,
        )
    )
    return AssetHealth(
        asset=asset,
        worst_clock=worst,
        computed_status=status,
        alerts=alerts,
        rul_days=rul["rul_days"],
        rul_confidence=rul["confidence"],
        failure_probability_90d=rul["failure_probability_90d"],
        evidence=evidence,
        meta=rul["meta"],
    )


def all_health() -> list[AssetHealth]:
    """Health view for the whole fleet."""
    return [asset_health(a) for a in load_fleet()]

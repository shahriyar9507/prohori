"""RAKKHOK (asset readiness) schemas.

RAKKHOK keeps a digital twin of every defense asset and answers bluntly:
"Is this platform expired? Is it still being flown? How many are actually
mission-capable?" Readiness rolls up asset -> unit -> force as mission-capable
percentages; an asset is grounded by its *worst* clock.
"""
from __future__ import annotations

from datetime import date
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.common import AIMeta, Evidence


class Force(str, Enum):
    ARMY = "army"
    NAVY = "navy"
    AIR_FORCE = "air_force"
    COAST_GUARD = "coast_guard"


class AssetStatus(str, Enum):
    OPERATIONAL = "operational"
    MAINTENANCE = "maintenance"
    GROUNDED = "grounded"


class ClockType(str, Enum):
    """The independent 'clocks' that can each ground an asset."""

    AIRFRAME_HOURS = "airframe_hours"      # total airframe/hull hours vs design life
    ENGINE_TBO = "engine_tbo"              # engine hours since overhaul vs TBO
    HULL_SURVEY = "hull_survey"            # calendar-based survey/inspection
    CONSUMABLE = "consumable"              # battery / life-raft / consumable expiry
    CERTIFICATION = "certification"        # airworthiness / certification renewal


class AlertLevel(str, Enum):
    RED = "red"        # <= 30 days / past due — act now
    AMBER = "amber"    # <= 90 days — procurement action
    YELLOW = "yellow"  # <= 180 days — budget-cycle awareness
    GREEN = "green"    # nominal


class ServiceClock(BaseModel):
    """One life-limit clock on an asset (usage- or calendar-based)."""

    type: ClockType
    label: str
    # Usage-based clocks use current/limit in `unit`; calendar clocks use due_date.
    current: float | None = None
    limit: float | None = None
    unit: str | None = None
    due_date: date | None = None
    # Computed:
    remaining: float = 0.0          # units or days remaining (can be negative = overdue)
    remaining_kind: str = "days"    # "days" or the usage unit
    pct_consumed: float = 0.0
    alert: AlertLevel = AlertLevel.GREEN


class Asset(BaseModel):
    """Digital twin of a single defense asset."""

    id: str
    name: str
    type: str                        # generic designation, e.g. "MPA-2 Maritime Patrol Aircraft"
    force: Force
    base: str
    induction_year: int
    design_life_years: int
    status: AssetStatus
    clocks: list[ServiceClock] = Field(default_factory=list)
    usage: dict[str, float] = Field(default_factory=dict, description="Usage counters (hours, nm, rounds).")


class AssetHealth(BaseModel):
    """An asset annotated with its worst clock, alerts, and RUL."""

    asset: Asset
    worst_clock: ServiceClock
    computed_status: AssetStatus
    alerts: list["ClockAlert"] = Field(default_factory=list)
    rul_days: float
    rul_confidence: float
    failure_probability_90d: float
    evidence: list[Evidence] = Field(default_factory=list)
    meta: AIMeta


class ClockAlert(BaseModel):
    """An escalating service-life alert (R2)."""

    asset_id: str
    asset_name: str
    clock: ClockType
    level: AlertLevel
    days_remaining: float
    message: str


class ForceReadiness(BaseModel):
    """Readiness roll-up for a force branch (or the whole fleet)."""

    scope: str
    total: int
    operational: int
    maintenance: int
    grounded: int
    readiness_pct: float


class FleetReadinessResponse(BaseModel):
    """R1 — the Fleet Health Dashboard payload."""

    generated_at_utc: str
    overall: ForceReadiness
    by_force: list[ForceReadiness]
    red_alerts: int
    amber_alerts: int


AssetHealth.model_rebuild()

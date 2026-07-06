"""Service-life & expiry logic (R2) — the escalating 180/90/30-day alerts.

An asset is grounded by its *worst* clock: a platform 'green' on airframe hours
is still un-flyable if one consumable is past due. This module computes each
clock's remaining life and alert level, and derives the asset's real status.
"""
from __future__ import annotations

from app.modules.rakkhok import REFERENCE_DATE
from app.schemas.rakkhok import (
    AlertLevel,
    Asset,
    AssetStatus,
    ClockAlert,
    ServiceClock,
)

# Calendar alert thresholds (days) matching real staff-work rhythm:
# budget cycle (180) -> procurement action (90) -> operational workaround (30).
_DAY_RED = 30
_DAY_AMBER = 90
_DAY_YELLOW = 180

# Usage-based alert thresholds (fraction of limit consumed).
_USE_RED = 1.0
_USE_AMBER = 0.9
_USE_YELLOW = 0.8


def _calendar_alert(days_remaining: float) -> AlertLevel:
    if days_remaining <= _DAY_RED:
        return AlertLevel.RED
    if days_remaining <= _DAY_AMBER:
        return AlertLevel.AMBER
    if days_remaining <= _DAY_YELLOW:
        return AlertLevel.YELLOW
    return AlertLevel.GREEN


def _usage_alert(pct: float) -> AlertLevel:
    if pct >= _USE_RED:
        return AlertLevel.RED
    if pct >= _USE_AMBER:
        return AlertLevel.AMBER
    if pct >= _USE_YELLOW:
        return AlertLevel.YELLOW
    return AlertLevel.GREEN


def compute_clock(clock: ServiceClock) -> ServiceClock:
    """Populate remaining / pct / alert for one clock, in place, and return it."""
    if clock.due_date is not None:
        days = (clock.due_date - REFERENCE_DATE).days
        clock.remaining = float(days)
        clock.remaining_kind = "days"
        # If a calendar limit is past due, treat as fully consumed.
        clock.pct_consumed = 1.0 if days <= 0 else round(max(0.0, 1 - days / 365.0), 3)
        clock.alert = _calendar_alert(days)
    elif clock.limit:
        remaining = clock.limit - (clock.current or 0.0)
        clock.remaining = round(remaining, 1)
        clock.remaining_kind = clock.unit or "units"
        clock.pct_consumed = round(min(1.5, (clock.current or 0.0) / clock.limit), 3)
        clock.alert = _usage_alert(clock.pct_consumed)
    return clock


_ALERT_RANK = {AlertLevel.RED: 3, AlertLevel.AMBER: 2, AlertLevel.YELLOW: 1, AlertLevel.GREEN: 0}


def compute_asset_clocks(asset: Asset) -> Asset:
    """Compute every clock on an asset."""
    for c in asset.clocks:
        compute_clock(c)
    return asset


def worst_clock(asset: Asset) -> ServiceClock:
    """The clock in the most severe state (grounds the asset)."""
    return max(
        asset.clocks,
        key=lambda c: (_ALERT_RANK[c.alert], -c.remaining if c.remaining_kind == "days" else -c.pct_consumed),
    )


def computed_status(asset: Asset) -> AssetStatus:
    """Real status: grounded if any clock is exceeded, else the declared status."""
    for c in asset.clocks:
        past_due = (c.remaining_kind == "days" and c.remaining <= 0) or c.pct_consumed >= 1.0
        if past_due:
            return AssetStatus.GROUNDED
    return asset.status


def alerts_for_asset(asset: Asset) -> list[ClockAlert]:
    """All non-green clock alerts for an asset."""
    out: list[ClockAlert] = []
    for c in asset.clocks:
        if c.alert == AlertLevel.GREEN:
            continue
        remaining_txt = (
            f"{int(c.remaining)} days" if c.remaining_kind == "days"
            else f"{c.remaining:.0f} {c.remaining_kind} ({c.pct_consumed*100:.0f}% used)"
        )
        verb = "OVERDUE" if ((c.remaining_kind == "days" and c.remaining <= 0) or c.pct_consumed >= 1.0) else "due in"
        out.append(
            ClockAlert(
                asset_id=asset.id,
                asset_name=asset.name,
                clock=c.type,
                level=c.alert,
                days_remaining=c.remaining if c.remaining_kind == "days" else -1,
                message=f"{asset.name}: {c.label} {verb} {remaining_txt}.",
            )
        )
    return out

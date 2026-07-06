"""Remaining-Useful-Life prediction (R3) — Weibull survival analysis.

A transparent survival model on the asset's driving usage counter. Life is
modelled as Weibull with a wear-out shape (k>1, increasing hazard), scaled to
the component's design limit. We report:
  * RUL in days (remaining usage / utilization rate), and
  * the conditional probability of failure within the next 90 days.

An accurate-but-late alert is useless to a maintenance officer, so alert
lead-time matters as much as point accuracy (blueprint eval target). Gradient
boosting on richer histories is the P1 upgrade; the survival core and its
explainability stay identical.
"""
from __future__ import annotations

import math

from app.schemas.common import AIMeta, Evidence, label_for
from app.schemas.rakkhok import Asset, ServiceClock

MODEL_VERSION = "rakkhok-rul-weibull/0.1.0"
SHAPE_K = 2.5  # Weibull shape >1 => wear-out (hazard rises with use)


def _survival(x: float, scale: float, k: float = SHAPE_K) -> float:
    """Weibull survival function S(x) = exp(-(x/scale)^k)."""
    if scale <= 0:
        return 0.0
    return math.exp(-((max(0.0, x) / scale) ** k))


def _conditional_failure(u: float, horizon: float, scale: float, k: float = SHAPE_K) -> float:
    """P(fail before u+horizon | survived to u)."""
    s_u = _survival(u, scale, k)
    if s_u <= 0:
        return 1.0
    return max(0.0, min(1.0, 1.0 - _survival(u + horizon, scale, k) / s_u))


def _driving_usage_clock(asset: Asset) -> ServiceClock | None:
    """The usage-based clock closest to its limit — the wear-out driver."""
    usage_clocks = [c for c in asset.clocks if c.limit and c.remaining_kind != "days"]
    return max(usage_clocks, key=lambda c: c.pct_consumed) if usage_clocks else None


def compute_rul(asset: Asset) -> dict:
    """Return RUL days, 90-day failure probability, confidence, and evidence."""
    evidence: list[Evidence] = []
    clock = _driving_usage_clock(asset)
    util = float(asset.usage.get("util_per_day", 0.0))

    if clock and clock.limit:
        scale = clock.limit                       # characteristic life ~ design limit
        u = clock.current or 0.0
        remaining_usage = max(0.0, clock.limit - u)
        rul_days = remaining_usage / util if util > 0 else remaining_usage
        horizon_usage = 90.0 * util if util > 0 else 0.1 * clock.limit
        fp90 = _conditional_failure(u, horizon_usage, scale)
        confidence = 0.85 if util > 0 else 0.6
        evidence.append(
            Evidence(
                source="RUL · Weibull survival",
                detail=(
                    f"Driving clock '{clock.label}': {u:.0f}/{clock.limit:.0f} {clock.unit} "
                    f"consumed ({clock.pct_consumed*100:.0f}%), Weibull k={SHAPE_K}."
                ),
                weight=0.7,
            )
        )
    else:
        # Calendar/consumable-driven asset: RUL is the nearest calendar deadline.
        cal = [c for c in asset.clocks if c.remaining_kind == "days"]
        rul_days = min((c.remaining for c in cal), default=3650.0)
        fp90 = 0.8 if rul_days <= 90 else (0.3 if rul_days <= 180 else 0.08)
        confidence = 0.55
        evidence.append(
            Evidence(
                source="RUL · calendar-limited",
                detail="No usage-based wear driver; RUL set by nearest calendar/consumable deadline.",
                weight=0.6,
            )
        )

    return {
        "rul_days": round(rul_days, 1),
        "failure_probability_90d": round(fp90, 3),
        "confidence": confidence,
        "evidence": evidence,
        "meta": AIMeta(model_version=MODEL_VERSION, confidence=confidence, confidence_label=label_for(confidence)),
    }

# RAKKHOK (রক্ষক) — Defense Asset Lifecycle & Readiness

> *"Is this platform expired? Is it still being flown? How many are actually mission-capable?"*

RAKKHOK keeps a digital twin of every defense asset, tracks its multiple
life-limit clocks, predicts remaining useful life, and rolls readiness up from
asset to force. It is Module 2 of PRAHARI.

## Features in this module

| ID | Feature | Status |
|----|---------|--------|
| **R1** | Fleet Health Dashboard — readiness %, operational/maintenance/grounded, drill-down | ✅ MVP |
| **R2** | Service-Life & Expiry Tracker — multi-clock countdowns, 180/90/30-day escalating alerts | ✅ MVP |
| **R3** | Predictive Maintenance (RUL) — Weibull survival, fleet ranked by failure risk | ✅ MVP |

## Doctrine baked in

- **Worst-clock rule.** Each asset has independent clocks — airframe hours,
  engine TBO, hull survey, consumable expiry, certification. An asset is
  grounded by its *worst* clock: green on hours but one expired life-raft cert
  still means un-flyable.
- **Readiness rolls up.** asset → force → fleet, as mission-capable %. The
  number visibly drops when an alert grounds a platform.
- **Escalating alerts.** 180 → 90 → 30 days, matching budget-cycle →
  procurement-action → operational-workaround staff rhythm.
- **RUL with lead-time.** An accurate-but-late alert is useless; the model
  reports both RUL days and the 90-day failure probability.

## RUL model (R3)

Transparent Weibull survival on each asset's driving usage counter:
`S(x) = exp(-(x/scale)^k)` with wear-out shape `k = 2.5`, scaled to the design
limit. Reports RUL in days (remaining usage ÷ utilization rate) and the
conditional probability of failure within 90 days. Pure-Python, no heavy deps.
Gradient boosting on richer maintenance histories is the P1 upgrade; the
survival core and its explainability stay identical.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/rakkhok/readiness` | Fleet Health Dashboard: readiness %, counts, alert totals. |
| `GET` | `/api/rakkhok/assets` | Asset registry with health. Query: `force`. |
| `GET` | `/api/rakkhok/assets/{id}` | One asset's digital twin. |
| `GET` | `/api/rakkhok/rul-ranking` | Fleet ranked by failure risk ("service first"). |
| `GET` | `/api/rakkhok/alerts` | All escalating service-life alerts, most urgent first. |

## Data

- **Fleet:** `data/fleet.json` — 25 synthetic assets across Army/Navy/Air
  Force/Coast Guard. Generic, fictional designations only; **no real hull/tail
  numbers or real force inventory**. Clocks are anchored to a fixed reference
  date (`REFERENCE_DATE = 2026-07-06`) so the demo state is deterministic for
  judging (an aircraft crossing its airframe-life threshold; a helicopter
  grounded by a trivially expired consumable).

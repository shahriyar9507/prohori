"""RAKKHOK — defense asset lifecycle & readiness module."""

from datetime import date

# Fixed reference "today" so the demo shows the same compelling readiness state
# every time it is judged (an asset crossing its life threshold, a grounding by
# a trivial expired consumable). Override via RAKKHOK_REFERENCE_DATE if needed.
REFERENCE_DATE = date(2026, 7, 6)

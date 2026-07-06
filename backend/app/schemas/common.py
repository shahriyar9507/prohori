"""Shared schemas enforcing PRAHARI's explainability contract (design law #3).

Every AI-derived output in the platform carries its evidence chain, a
confidence value, and provenance metadata. No bare numbers are ever returned
to a user — a score without its reasoning is not actionable for a commander,
an analyst, or a judge.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    """Timezone-aware current UTC timestamp (used for `generated_at`)."""
    return datetime.now(timezone.utc)


class ConfidenceLabel(str, Enum):
    """Human-readable confidence band that accompanies every numeric score."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INSUFFICIENT = "insufficient"  # triggers refusal-to-generate on briefs


class Evidence(BaseModel):
    """A single, citable reason behind a score, alert, or recommendation."""

    source: str = Field(..., description="Where this evidence came from, e.g. 'GDELT', 'UN Comtrade'.")
    detail: str = Field(..., description="The specific fact or signal, in plain language.")
    weight: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Relative contribution of this evidence to the outcome (0–1).",
    )
    url: str | None = Field(None, description="Citation link, if the source is web-addressable.")


class AIMeta(BaseModel):
    """Provenance stamped on every AI-derived response."""

    generated_at: datetime = Field(default_factory=utcnow)
    model_version: str = Field(..., description="Model or rule-engine version that produced this output.")
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidence_label: ConfidenceLabel


def label_for(confidence: float) -> ConfidenceLabel:
    """Map a 0–1 confidence value to its band."""
    if confidence >= 0.75:
        return ConfidenceLabel.HIGH
    if confidence >= 0.5:
        return ConfidenceLabel.MEDIUM
    if confidence >= 0.25:
        return ConfidenceLabel.LOW
    return ConfidenceLabel.INSUFFICIENT

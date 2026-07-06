"""DRISHTI (geopolitical intelligence) schemas.

DRISHTI turns world events into a Bangladesh-relevance-ranked feed (D1) and,
on demand, a Do/Avoid national-interest brief with citations (D4).
"""
from __future__ import annotations

from datetime import date
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.common import AIMeta, Evidence


class Sector(str, Enum):
    """Policy sector an event touches — drives sector-relevance scoring."""

    TRADE = "trade"
    SECURITY = "security"
    ENERGY = "energy"
    WATER = "water"
    LABOUR = "labour"          # overseas labour markets / remittance
    DIPLOMACY = "diplomacy"
    CLIMATE = "climate"
    HEALTH = "health"
    OTHER = "other"


class Severity(str, Enum):
    """Alert-severity color language shared with the UI."""

    RED = "red"        # act now
    AMBER = "amber"    # 30–90 day window
    GREEN = "green"    # nominal / informational


class EventRecord(BaseModel):
    """A single world event, normalized from GDELT (or the cached snapshot)."""

    id: str
    title: str
    summary: str
    event_date: date
    actors: list[str] = Field(default_factory=list, description="Countries/orgs involved.")
    sectors: list[Sector] = Field(default_factory=list)
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    source: str = "GDELT"
    url: str | None = None
    # GDELT signal fields (weak supervision for scoring):
    goldstein: float | None = Field(None, ge=-10, le=10, description="Cooperation(+)/conflict(-) scale.")
    tone: float | None = Field(None, description="Average sentiment tone of coverage.")


class RelevanceComponent(BaseModel):
    """One transparent component of the Bangladesh Relevance Score."""

    name: str
    score: float = Field(..., ge=0.0, le=100.0)
    weight: float = Field(..., ge=0.0, le=1.0)
    reason: str


class ScoredEvent(BaseModel):
    """An event annotated with its Bangladesh Relevance Score and full reasoning."""

    event: EventRecord
    relevance_score: float = Field(..., ge=0.0, le=100.0)
    severity: Severity
    components: list[RelevanceComponent]
    evidence: list[Evidence]
    meta: AIMeta


class EventRadarResponse(BaseModel):
    """D1 — the ranked Global Event Radar feed."""

    generated_at_utc: str
    total: int
    events: list[ScoredEvent]
    filters_applied: dict[str, str | None] = Field(default_factory=dict)
    live_source: bool = Field(..., description="True if served from live GDELT, False if cached snapshot.")

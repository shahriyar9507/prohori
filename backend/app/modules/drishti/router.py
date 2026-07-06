"""DRISHTI API routes."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.modules.drishti import gdelt
from app.modules.drishti.relevance import score_and_rank
from app.schemas.common import utcnow
from app.schemas.drishti import EventRadarResponse, Sector, Severity

router = APIRouter(prefix="/api/drishti", tags=["DRISHTI"])


@router.get("/events", response_model=EventRadarResponse, summary="Global Event Radar (D1)")
async def event_radar(
    sector: Sector | None = Query(None, description="Filter to a single policy sector."),
    severity: Severity | None = Query(None, description="Filter by alert severity band."),
    min_score: float = Query(0.0, ge=0.0, le=100.0, description="Minimum Bangladesh Relevance Score."),
    limit: int = Query(50, ge=1, le=200),
) -> EventRadarResponse:
    """Return world events ranked by Bangladesh Relevance Score, most relevant first.

    Each event carries its full component breakdown, evidence chain, and
    confidence — the explainability contract (design law #3).
    """
    events, live = await gdelt.get_events()
    scored = score_and_rank(events)

    if sector is not None:
        scored = [s for s in scored if sector in s.event.sectors]
    if severity is not None:
        scored = [s for s in scored if s.severity == severity]
    scored = [s for s in scored if s.relevance_score >= min_score]
    scored = scored[:limit]

    return EventRadarResponse(
        generated_at_utc=utcnow().isoformat(),
        total=len(scored),
        events=scored,
        filters_applied={
            "sector": sector.value if sector else None,
            "severity": severity.value if severity else None,
            "min_score": str(min_score),
        },
        live_source=live,
    )

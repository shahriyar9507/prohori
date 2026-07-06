"""DRISHTI API routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.modules.drishti import gdelt
from app.modules.drishti.brief import generate_brief
from app.modules.drishti.qa import ask as ask_prahari
from app.modules.drishti.relevance import score_and_rank, score_event
from app.schemas.common import utcnow
from app.schemas.drishti import (
    AskRequest,
    AskResponse,
    DoAvoidBrief,
    EventRadarResponse,
    Language,
    Sector,
    Severity,
)

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


@router.get(
    "/events/{event_id}/brief",
    response_model=DoAvoidBrief,
    summary="Do/Avoid Advisor brief for one event (D4)",
)
async def do_avoid_brief(
    event_id: str,
    language: Language = Query(Language.EN, description="Brief language (English or Bangla)."),
) -> DoAvoidBrief:
    """Generate a two-column national-interest brief for a specific event.

    Refuses (with reason) when evidence is below the confidence floor.
    """
    events, _ = await gdelt.get_events()
    match = next((e for e in events if e.id == event_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found in the current feed.")
    return await generate_brief(score_event(match), language=language.value)


@router.post("/ask", response_model=AskResponse, summary="Ask-PRAHARI bilingual Q&A (C2)")
async def ask(request: AskRequest) -> AskResponse:
    """Answer a natural-language question (Bangla or English) grounded in the feed."""
    return await ask_prahari(request.question, request.language)

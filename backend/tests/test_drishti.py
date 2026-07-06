"""DRISHTI unit tests — relevance scoring (D1) and Do/Avoid brief (D4).

Run:  cd backend && pip install -r requirements-dev.txt && pytest
"""
from __future__ import annotations

from datetime import date

import pytest

from app.modules.drishti import gdelt
from app.modules.drishti.brief import generate_brief
from app.modules.drishti.qa import ask
from app.modules.drishti.relevance import score_and_rank, score_event
from app.schemas.drishti import EventRecord, Language, Sector, Severity


def _event(**kw) -> EventRecord:
    base = dict(
        id="t1",
        title="Test event",
        summary="A test event.",
        event_date=date(2026, 7, 1),
        actors=[],
        sectors=[],
    )
    base.update(kw)
    return EventRecord(**base)


# ─── D1: relevance scoring ────────────────────────────────────────────────

def test_bangladesh_direct_event_scores_high():
    ev = _event(
        title="Bangladesh signs trade agreement",
        summary="A trade deal affecting the Bay of Bengal.",
        actors=["Bangladesh", "India"],
        sectors=[Sector.TRADE],
        location="Bay of Bengal",
        goldstein=5.0,
        tone=2.0,
    )
    scored = score_event(ev)
    assert scored.relevance_score >= 70
    assert scored.severity == Severity.RED
    # Explainability contract: components + evidence + provenance present.
    assert len(scored.components) == 4
    assert scored.evidence
    assert scored.meta.model_version


def test_distant_unrelated_event_scores_low():
    ev = _event(
        title="Local council meeting in a distant country",
        summary="A routine municipal matter with no regional link.",
        actors=["Chile"],
        sectors=[Sector.OTHER],
        location="Santiago",
    )
    scored = score_event(ev)
    assert scored.relevance_score < 45
    assert scored.severity in (Severity.AMBER, Severity.GREEN)


def test_ranking_is_descending():
    events = gdelt.load_demo_events()
    ranked = score_and_rank(events)
    scores = [s.relevance_score for s in ranked]
    assert scores == sorted(scores, reverse=True)
    # The border-security and port events should outrank the distant election.
    ids = [s.event.id for s in ranked]
    assert ids.index("evt-2026-0705-border") < ids.index("evt-2026-0627-election-distant")


def test_confidence_reflects_signal_completeness():
    rich = score_event(_event(actors=["Bangladesh"], sectors=[Sector.TRADE],
                              location="Dhaka", goldstein=3.0))
    thin = score_event(_event())
    assert rich.meta.confidence > thin.meta.confidence


# ─── D4: Do/Avoid brief ───────────────────────────────────────────────────

async def test_brief_generated_for_rich_event():
    ev = _event(
        title="Gulf state revises worker quota",
        summary="A labour policy change affecting remittance.",
        actors=["Saudi Arabia", "Bangladesh"],
        sectors=[Sector.LABOUR],
        location="Riyadh",
        goldstein=2.0,
    )
    brief = await generate_brief(score_event(ev))
    assert brief.refused is False
    assert brief.do and brief.avoid          # both columns populated
    assert brief.decision_window
    # Every recommendation carries at least one citation.
    assert all(rec.citations for rec in brief.do)


async def test_brief_refuses_on_thin_evidence():
    ev = _event(title="Vague report", summary="Unclear.", actors=[], sectors=[])
    brief = await generate_brief(score_event(ev))
    assert brief.refused is True
    assert brief.refusal_reason
    assert not brief.do and not brief.avoid


# ─── C2: Ask-PRAHARI ──────────────────────────────────────────────────────

async def test_ask_returns_grounded_answer():
    resp = await ask("What is happening with Teesta water?", Language.EN)
    assert resp.answer
    assert resp.referenced_events        # retrieval found grounding events
    assert resp.evidence


async def test_ask_bangla_locale():
    resp = await ask("Teesta", Language.BN)
    assert resp.language == Language.BN
    assert resp.answer

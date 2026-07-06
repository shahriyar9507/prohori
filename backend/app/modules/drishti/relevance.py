"""Bangladesh Relevance Score — the transparent scoring engine behind D1.

Design law #1 (Bangladesh-first) and #3 (explainability) meet here: every
event is scored 0–100 for how much it matters to Bangladesh, and the score is
never a black box — it decomposes into four weighted, human-readable
components, each carrying the reason it contributed.

The engine is a deliberate, auditable heuristic rather than an opaque model,
so an analyst can challenge any number. An LLM judgement layer (P1) refines
these components; the structure and explainability stay identical.
"""
from __future__ import annotations

from app.schemas.common import (
    AIMeta,
    Evidence,
    label_for,
)
from app.schemas.drishti import (
    EventRecord,
    RelevanceComponent,
    ScoredEvent,
    Sector,
    Severity,
)

MODEL_VERSION = "drishti-relevance-heuristic/0.1.0"

# ─── Actor relevance tiers ────────────────────────────────────────────────
# How directly an involved country/actor touches Bangladesh's interests.
BANGLADESH = {"bangladesh", "dhaka", "bd", "bgd"}

# Tier 1: immediate neighbours & top-tier strategic partners (score 100).
ACTOR_TIER_1 = {
    "india", "china", "myanmar", "burma",
}
# Tier 2: major trade/security/labour partners (score 80).
ACTOR_TIER_2 = {
    "united states", "usa", "us", "pakistan", "saudi arabia", "united arab emirates",
    "uae", "qatar", "malaysia", "japan", "russia", "european union", "eu",
}
# Tier 3: relevant wider actors (score 55).
ACTOR_TIER_3 = {
    "united kingdom", "uk", "germany", "france", "turkey", "iran", "indonesia",
    "singapore", "south korea", "sri lanka", "nepal", "bhutan", "maldives",
    "kuwait", "oman", "bahrain", "italy", "canada", "australia", "vietnam",
    "thailand", "world bank", "imf", "wto", "united nations", "un", "asean",
    "brics", "saarc", "bimstec",
}

# ─── Sector weights (importance to Bangladesh) ────────────────────────────
# Remittance (labour) and RMG trade are existential to the economy; water and
# security are core national-interest sectors; hence their high weights.
SECTOR_WEIGHT: dict[Sector, float] = {
    Sector.TRADE: 1.00,
    Sector.LABOUR: 0.95,
    Sector.SECURITY: 0.95,
    Sector.WATER: 0.90,
    Sector.ENERGY: 0.85,
    Sector.DIPLOMACY: 0.75,
    Sector.CLIMATE: 0.80,
    Sector.HEALTH: 0.55,
    Sector.OTHER: 0.35,
}

# ─── Geographic proximity keywords ────────────────────────────────────────
PROXIMITY_TERMS = {
    "high": {"bay of bengal", "bangladesh", "chattogram", "chittagong", "mongla",
             "payra", "cox's bazar", "teesta", "ganges", "brahmaputra", "rohingya"},
    "region": {"south asia", "indian ocean", "myanmar", "india", "andaman",
               "kolkata", "yangon", "rakhine", "sri lanka", "nepal", "bhutan"},
}

# ─── Component weights (must sum to 1.0) ──────────────────────────────────
W_ACTOR = 0.40
W_SECTOR = 0.30
W_GEOGRAPHY = 0.15
W_MAGNITUDE = 0.15


def _norm(text: str) -> str:
    return text.strip().lower()


def _actor_component(event: EventRecord) -> tuple[RelevanceComponent, list[Evidence]]:
    """Score based on who is involved. Bangladesh direct => max."""
    actors = [_norm(a) for a in event.actors]
    evidence: list[Evidence] = []

    if any(a in BANGLADESH for a in actors):
        score = 100.0
        reason = "Bangladesh is a direct party to this event."
        evidence.append(Evidence(source="Actor analysis", detail=reason, weight=W_ACTOR))
    elif any(a in ACTOR_TIER_1 for a in actors):
        score = 88.0
        hit = next(a for a in actors if a in ACTOR_TIER_1)
        reason = f"Involves an immediate neighbour / top-tier partner ({hit.title()})."
        evidence.append(Evidence(source="Actor analysis", detail=reason, weight=W_ACTOR))
    elif any(a in ACTOR_TIER_2 for a in actors):
        score = 72.0
        hit = next(a for a in actors if a in ACTOR_TIER_2)
        reason = f"Involves a major trade / security / labour partner ({hit.title()})."
        evidence.append(Evidence(source="Actor analysis", detail=reason, weight=W_ACTOR))
    elif any(a in ACTOR_TIER_3 for a in actors):
        score = 50.0
        hit = next(a for a in actors if a in ACTOR_TIER_3)
        reason = f"Involves a relevant wider actor ({hit.title()})."
        evidence.append(Evidence(source="Actor analysis", detail=reason, weight=W_ACTOR))
    else:
        score = 15.0
        reason = "No directly Bangladesh-relevant actor identified."
        evidence.append(Evidence(source="Actor analysis", detail=reason, weight=W_ACTOR))

    return RelevanceComponent(name="Actor relevance", score=score, weight=W_ACTOR, reason=reason), evidence


def _sector_component(event: EventRecord) -> tuple[RelevanceComponent, list[Evidence]]:
    """Score based on the most Bangladesh-critical sector the event touches."""
    if not event.sectors:
        reason = "No policy sector tagged; treated as general interest."
        return (
            RelevanceComponent(name="Sector relevance", score=25.0, weight=W_SECTOR, reason=reason),
            [Evidence(source="Sector analysis", detail=reason, weight=W_SECTOR)],
        )

    best = max(event.sectors, key=lambda s: SECTOR_WEIGHT.get(s, 0.35))
    score = SECTOR_WEIGHT.get(best, 0.35) * 100.0
    reason = f"Touches the '{best.value}' sector (high national-interest weight)."
    return (
        RelevanceComponent(name="Sector relevance", score=score, weight=W_SECTOR, reason=reason),
        [Evidence(source="Sector analysis", detail=reason, weight=W_SECTOR)],
    )


def _geography_component(event: EventRecord) -> tuple[RelevanceComponent, list[Evidence]]:
    """Score based on geographic proximity to Bangladesh / the Bay of Bengal."""
    haystack = " ".join([_norm(event.title), _norm(event.summary), _norm(event.location or "")])
    if any(term in haystack for term in PROXIMITY_TERMS["high"]):
        score, reason = 100.0, "Directly concerns Bangladesh territory or the Bay of Bengal."
    elif any(term in haystack for term in PROXIMITY_TERMS["region"]):
        score, reason = 65.0, "Occurs in the immediate South Asia / Indian Ocean region."
    else:
        score, reason = 30.0, "Occurs outside the immediate region (global spillover only)."
    return (
        RelevanceComponent(name="Geographic proximity", score=score, weight=W_GEOGRAPHY, reason=reason),
        [Evidence(source="Geographic analysis", detail=reason, weight=W_GEOGRAPHY)],
    )


def _magnitude_component(event: EventRecord) -> tuple[RelevanceComponent, list[Evidence]]:
    """Score based on event intensity from GDELT signals (Goldstein + tone)."""
    if event.goldstein is None and event.tone is None:
        reason = "No intensity signal available; assumed moderate."
        return (
            RelevanceComponent(name="Event magnitude", score=40.0, weight=W_MAGNITUDE, reason=reason),
            [Evidence(source="Magnitude analysis", detail=reason, weight=W_MAGNITUDE)],
        )

    # Larger absolute Goldstein (strong cooperation OR conflict) => more significant.
    g = abs(event.goldstein) if event.goldstein is not None else 0.0
    g_score = min(g / 10.0, 1.0) * 100.0
    # Strongly negative tone also signals significance.
    t = abs(event.tone) if event.tone is not None else 0.0
    t_score = min(t / 10.0, 1.0) * 100.0
    score = round(0.6 * g_score + 0.4 * t_score, 1)
    reason = (
        f"Intensity from GDELT signals (Goldstein={event.goldstein}, tone={event.tone}); "
        "stronger cooperation or conflict raises significance."
    )
    return (
        RelevanceComponent(name="Event magnitude", score=score, weight=W_MAGNITUDE, reason=reason),
        [Evidence(source="Magnitude analysis", detail=reason, weight=W_MAGNITUDE)],
    )


def _severity_for(score: float) -> Severity:
    if score >= 70:
        return Severity.RED
    if score >= 45:
        return Severity.AMBER
    return Severity.GREEN


def _confidence_for(event: EventRecord) -> float:
    """Confidence reflects how complete the input signal is."""
    present = sum(
        [
            bool(event.actors),
            bool(event.sectors),
            bool(event.location),
            event.goldstein is not None or event.tone is not None,
        ]
    )
    return round(0.4 + 0.15 * present, 2)  # 0.40 (nothing) → 1.00 (all four)


def score_event(event: EventRecord) -> ScoredEvent:
    """Compute the Bangladesh Relevance Score for one event, with full reasoning."""
    components: list[RelevanceComponent] = []
    evidence: list[Evidence] = []

    for builder in (_actor_component, _sector_component, _geography_component, _magnitude_component):
        component, ev = builder(event)
        components.append(component)
        evidence.extend(ev)

    relevance = round(sum(c.score * c.weight for c in components), 1)
    confidence = _confidence_for(event)

    return ScoredEvent(
        event=event,
        relevance_score=relevance,
        severity=_severity_for(relevance),
        components=components,
        evidence=evidence,
        meta=AIMeta(
            model_version=MODEL_VERSION,
            confidence=confidence,
            confidence_label=label_for(confidence),
        ),
    )


def score_and_rank(events: list[EventRecord]) -> list[ScoredEvent]:
    """Score a batch of events and return them ranked by relevance, descending."""
    scored = [score_event(e) for e in events]
    scored.sort(key=lambda s: s.relevance_score, reverse=True)
    return scored

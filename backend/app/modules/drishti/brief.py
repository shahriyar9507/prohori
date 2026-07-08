"""D4 — Do/Avoid Advisor.

Produces a two-column national-interest brief for a specific event: recommended
actions vs actions to avoid, each with reasoning and citations, plus hedges and
a decision window. Grounded in the precedent knowledge base so nothing is
invented; refuses when evidence is too thin (design law #3).

The deterministic path (below) fully powers the demo. When an LLM provider is
configured, it only *rephrases* the situation and why-it-matters narrative in
the requested language from the SAME grounded facts — it never adds claims.
"""
from __future__ import annotations

import re
from datetime import date

from app.llm import complete, is_enabled
from app.modules.drishti import knowledge
from app.schemas.common import AIMeta, Evidence, label_for
from app.schemas.drishti import (
    DoAvoidBrief,
    Recommendation,
    ScoredEvent,
    Sector,
)

MODEL_VERSION = "drishti-doavoid/0.1.0"
_CONFIDENCE_FLOOR = 0.5  # below this, refuse rather than guess

# First/second-order framing per sector for the "why it matters" narrative.
_ORDER_EFFECTS: dict[Sector, str] = {
    Sector.TRADE: "first-order effect on export earnings and jobs; second-order effect on foreign-exchange reserves.",
    Sector.LABOUR: "first-order effect on overseas employment and remittance inflows; second-order effect on the balance of payments.",
    Sector.WATER: "first-order effect on dry-season agriculture; second-order effect on rural livelihoods and food security.",
    Sector.SECURITY: "first-order effect on border stability; second-order effect on diplomatic bandwidth and defence posture.",
    Sector.ENERGY: "first-order effect on energy-import cost and supply; second-order effect on industrial output and prices.",
    Sector.DIPLOMACY: "first-order effect on partner relationships; second-order effect on negotiating leverage across files.",
    Sector.CLIMATE: "first-order effect on coastal safety; second-order effect on disaster-response asset readiness.",
}


def _decision_window(relevance: float, severity: str) -> str:
    if severity == "red":
        return "Hours to a few days — this sits inside an active decision window."
    if severity == "amber":
        return "Roughly 30–90 days — act within the current staff-work cycle."
    return "No immediate deadline — monitor and revisit as the situation develops."


def _deterministic_narrative(scored: ScoredEvent) -> tuple[str, str]:
    """Build situation + why-it-matters from grounded event facts only."""
    e = scored.event
    situation = e.summary

    sectors = e.sectors or [Sector.OTHER]
    effects = [_ORDER_EFFECTS[s] for s in sectors if s in _ORDER_EFFECTS]
    actors = ", ".join(a for a in e.actors if a.lower() != "bangladesh") or "the parties involved"
    why = (
        f"Relevance to Bangladesh is scored {scored.relevance_score:.0f}/100 "
        f"({scored.severity.value.upper()}). Involving {actors}, it carries "
        + (" ".join(effects) if effects else "cross-cutting national-interest effects.")
    )
    return situation, why


async def _live_context() -> str:
    """A compact digest of today's current headlines, used to ground the brief in
    the real-time situation (what partners are doing NOW), so an older event is
    always analyzed against today's live status."""
    try:
        from app.modules.drishti.news import get_live_events
        events = await get_live_events() or []
    except Exception:  # noqa: BLE001
        return ""
    lines = []
    for e in events[:12]:
        actors = ", ".join(a for a in e.actors if a.lower() != "bangladesh") or "—"
        lines.append(f"- ({e.event_date}) {e.title} [{actors}]")
    return "\n".join(lines)


async def _llm_narrative(scored: ScoredEvent, language: str) -> tuple[str, str] | None:
    """Real-time comparative analysis via LLM in the requested language.

    The target event may be several days old; the model is given TODAY'S live
    headline context and asked to relate the event to the current situation —
    what the relevant countries appear to be doing now and the present state of
    the relationship — producing genuine research, not just a rephrase.
    """
    if not is_enabled():
        return None
    e = scored.event
    today = date.today().isoformat()
    lang_name = "Bangla" if language == "bn" else "English"
    live = await _live_context()
    system = (
        "You are DRISHTI, a Bangladesh-first strategic-intelligence analyst. "
        f"Today's date is {today}. You receive ONE target event (which may be a "
        "few days old) plus a LIVE CONTEXT of today's current Bangladesh-related "
        "headlines. Produce a real-time comparative assessment: relate the target "
        "event to the CURRENT situation — what the relevant countries/partners "
        "appear to be doing now (cite the live context where relevant), the "
        "present state of the diplomatic/trade relationship, and how the picture "
        "has moved since the event. Be analytical, specific and neutral toward all "
        "foreign states. Do not fabricate precise statistics. No markdown, "
        "asterisks or headings. Respond in " + lang_name + " and output EXACTLY "
        "these two labeled lines and nothing else:\n"
        "SITUATION: <2–3 sentences: what happened and where it stands as of today>\n"
        "ANALYSIS: <a rich paragraph on why it matters for Bangladesh now — "
        "first- and second-order effects, the live comparison, and what partners "
        "are currently doing>"
    )
    user = (
        f"TARGET EVENT\nTitle: {e.title}\nSummary: {e.summary}\n"
        f"Event date: {e.event_date} (today is {today})\n"
        f"Actors: {', '.join(e.actors)}\nSectors: {', '.join(s.value for s in e.sectors)}\n"
        f"Relevance score: {scored.relevance_score}/100, severity {scored.severity.value}.\n\n"
        f"LIVE CONTEXT — today's current Bangladesh headlines:\n{live or '(none available)'}"
    )
    out = await complete(system, user)
    if not out:
        return None

    # Robustly split on the SITUATION:/ANALYSIS: markers (labels may be localized
    # by the model, so fall back to paragraph splitting if markers are absent).
    text = out.replace("*", "").replace("#", "").strip()
    m_s = re.search(r"SITUATION\s*[:：]", text, re.I)
    m_a = re.search(r"ANALYSIS\s*[:：]", text, re.I)
    if m_s and m_a and m_a.start() > m_s.start():
        situation = text[m_s.end():m_a.start()].strip()
        why = text[m_a.end():].strip()
        if situation and why:
            return situation, why
    parts = [p.strip() for p in text.split("\n") if p.strip()]
    if len(parts) >= 2:
        return parts[0], " ".join(parts[1:])
    return text, text


async def generate_brief(scored: ScoredEvent, language: str = "en") -> DoAvoidBrief:
    """Generate the Do/Avoid brief for one scored event."""
    e = scored.event
    sectors = [s for s in e.sectors if s in knowledge.SECTOR_PLAYBOOK]

    # Refuse on insufficient evidence.
    if scored.meta.confidence < _CONFIDENCE_FLOOR or not sectors:
        conf = min(scored.meta.confidence, 0.24)
        return DoAvoidBrief(
            event_id=e.id,
            title=e.title,
            situation=e.summary,
            why_it_matters="Insufficient grounded evidence to issue a national-interest recommendation.",
            do=[],
            avoid=[],
            hedges=[],
            decision_window="Not assessed — awaiting more information.",
            refused=True,
            refusal_reason=(
                "Evidence below the confidence floor or no mapped policy sector. "
                "PRAHARI refuses to generate advice rather than speculate (design law #3)."
            ),
            evidence=scored.evidence,
            meta=AIMeta(model_version=MODEL_VERSION, confidence=conf, confidence_label=label_for(conf)),
            narrative_source="deterministic",
        )

    # Gather grounded DO / AVOID / HEDGE from the sector playbooks.
    do: list[Recommendation] = []
    avoid: list[Recommendation] = []
    hedges: list[str] = []
    cited_ids: set[str] = set()

    for sector in sectors:
        pb = knowledge.playbook_for(sector)
        for action, cites in pb.get("do", []):
            do.append(Recommendation(action=action, rationale=f"[{sector.value}] national-interest action.", citations=cites))
            cited_ids.update(cites)
        for action, cites in pb.get("avoid", []):
            avoid.append(Recommendation(action=action, rationale=f"[{sector.value}] risk to avoid.", citations=cites))
            cited_ids.update(cites)
        for action, cites in pb.get("hedge", []):
            hedges.append(action)
            cited_ids.update(cites)

    # Evidence = event evidence + cited precedents.
    evidence = list(scored.evidence)
    for prec in knowledge.precedents_for(sorted(cited_ids)):
        evidence.append(Evidence(source=prec["source"], detail=f"{prec['title']}: {prec['detail']}", weight=0.5))

    # Narrative: LLM if available, else deterministic.
    narrative_source = "deterministic"
    narrative = await _llm_narrative(scored, language)
    if narrative is not None:
        situation, why = narrative
        narrative_source = "llm"
    else:
        situation, why = _deterministic_narrative(scored)

    # Brief confidence: anchored to event confidence, lifted by grounding coverage.
    conf = round(min(0.95, scored.meta.confidence * 0.6 + 0.1 * len(cited_ids)), 2)

    return DoAvoidBrief(
        event_id=e.id,
        title=e.title,
        situation=situation,
        why_it_matters=why,
        do=do,
        avoid=avoid,
        hedges=hedges,
        decision_window=_decision_window(scored.relevance_score, scored.severity.value),
        refused=False,
        evidence=evidence,
        meta=AIMeta(model_version=MODEL_VERSION, confidence=conf, confidence_label=label_for(conf)),
        narrative_source=narrative_source,
    )

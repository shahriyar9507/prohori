"""C2 — Ask-PRAHARI: bilingual (Bangla + English) natural-language Q&A.

Retrieval-grounded: the answer is built from events actually present in the
DRISHTI feed, with citations. The deterministic path answers from the matched
events directly (demo-safe); when an LLM is configured it composes a fluent
answer in the requested language from the SAME retrieved events — never beyond
them. Bangla is a first-class locale (design law #6).
"""
from __future__ import annotations

from app.llm import complete, is_enabled
from app.modules.drishti import gdelt
from app.modules.drishti.relevance import score_and_rank
from app.schemas.common import AIMeta, Evidence, label_for
from app.schemas.drishti import AskResponse, Language, ScoredEvent

MODEL_VERSION = "drishti-ask/0.1.0"

# Minimal EN↔theme keyword map so retrieval works on either language's terms.
_STOPWORDS = {"the", "a", "an", "of", "for", "to", "and", "or", "is", "are", "what",
              "how", "why", "in", "on", "about", "does", "do", "with", "bangladesh"}


def _match_score(question: str, scored: ScoredEvent) -> int:
    """Count overlapping meaningful tokens between question and event text."""
    q_tokens = {t for t in question.lower().replace("?", " ").split() if t not in _STOPWORDS and len(t) > 2}
    e = scored.event
    haystack = " ".join(
        [e.title.lower(), e.summary.lower(), " ".join(a.lower() for a in e.actors),
         " ".join(s.value for s in e.sectors)]
    )
    return sum(1 for t in q_tokens if t in haystack)


def _deterministic_answer(question: str, matches: list[ScoredEvent], language: Language) -> str:
    if not matches:
        if language == Language.BN:
            return "এই মুহূর্তে DRISHTI ফিডে এই প্রশ্নের সাথে সরাসরি সম্পর্কিত কোনো ঘটনা পাওয়া যায়নি।"
        return "No event directly related to this question is currently in the DRISHTI feed."

    top = matches[0]
    others = matches[1:3]
    if language == Language.BN:
        lines = [
            f"সবচেয়ে প্রাসঙ্গিক ঘটনা: “{top.event.title}” "
            f"(বাংলাদেশ প্রাসঙ্গিকতা স্কোর {top.relevance_score:.0f}/১০০, গুরুত্ব: {top.severity.value})।",
        ]
        if others:
            lines.append("সম্পর্কিত অন্যান্য ঘটনা: " + "; ".join(f"“{m.event.title}”" for m in others) + "।")
        lines.append("বিস্তারিত সুপারিশের জন্য সংশ্লিষ্ট ঘটনার Do/Avoid ব্রিফ দেখুন।")
        return " ".join(lines)

    lines = [
        f"The most relevant event is “{top.event.title}” "
        f"(Bangladesh Relevance {top.relevance_score:.0f}/100, severity {top.severity.value}).",
        top.event.summary,
    ]
    if others:
        lines.append("Related events: " + "; ".join(f"“{m.event.title}”" for m in others) + ".")
    lines.append("Open that event's Do/Avoid brief for specific recommendations.")
    return " ".join(lines)


async def _llm_answer(question: str, matches: list[ScoredEvent], language: Language) -> str | None:
    if not is_enabled() or not matches:
        return None
    lang_name = "Bangla" if language == Language.BN else "English"
    context = "\n".join(
        f"- {m.event.title} (relevance {m.relevance_score:.0f}/100): {m.event.summary}"
        for m in matches[:4]
    )
    system = (
        "You are Ask-PRAHARI, a Bangladesh-first intelligence assistant. Answer "
        f"in {lang_name}, neutrally toward all states, using ONLY the events listed. "
        "If they do not answer the question, say so. Do not invent facts."
    )
    return await complete(system, f"Question: {question}\n\nEvents:\n{context}")


async def ask(question: str, language: Language = Language.EN) -> AskResponse:
    """Answer a natural-language question grounded in the DRISHTI event feed."""
    events, _ = await gdelt.get_events()
    scored = score_and_rank(events)

    ranked = sorted(scored, key=lambda s: _match_score(question, s), reverse=True)
    matches = [s for s in ranked if _match_score(question, s) > 0][:4]

    answer_source = "deterministic"
    answer = await _llm_answer(question, matches, language)
    if answer:
        answer_source = "llm"
    else:
        answer = _deterministic_answer(question, matches, language)

    evidence = [
        Evidence(source=m.event.source, detail=m.event.title, weight=0.5, url=m.event.url)
        for m in matches
    ]
    confidence = 0.3 + min(len(matches), 3) * 0.2  # 0.3 (no match) → 0.9 (3+ matches)

    return AskResponse(
        question=question,
        language=language,
        answer=answer,
        referenced_events=[m.event.id for m in matches],
        evidence=evidence,
        meta=AIMeta(model_version=MODEL_VERSION, confidence=round(confidence, 2), confidence_label=label_for(confidence)),
        answer_source=answer_source,
    )

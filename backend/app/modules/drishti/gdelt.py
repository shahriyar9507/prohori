"""GDELT ingestion for DRISHTI (D1).

Two paths, one interface:
  * cached snapshot  — the default; fast and immune to upstream outages, so the
    judged demo never breaks (rulebook: the demo must stay live and responsive).
  * live GDELT DOC 2.0 — recent worldwide coverage mentioning Bangladesh and
    key partners, mapped into our normalized EventRecord.

Live results feed the SAME relevance engine and explainability contract as the
cached snapshot; only the data origin differs.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path

import httpx

from app.config import get_settings
from app.schemas.drishti import EventRecord, Sector

_DATA_FILE = Path(__file__).parent / "data" / "demo_events.json"

# Lightweight sector inference for live articles (the LLM extractor upgrades
# this in P1; for MVP we keep it transparent and keyword-based).
_SECTOR_KEYWORDS: dict[Sector, tuple[str, ...]] = {
    Sector.TRADE: ("trade", "export", "import", "tariff", "garment", "rmg", "textile", "port"),
    Sector.LABOUR: ("worker", "labour", "labor", "remittance", "migrant", "recruitment"),
    Sector.SECURITY: ("border", "security", "military", "clash", "attack", "patrol", "defence", "defense"),
    Sector.ENERGY: ("energy", "gas", "power", "fuel", "oil", "lng"),
    Sector.WATER: ("water", "river", "teesta", "ganges", "flood", "dam"),
    Sector.DIPLOMACY: ("summit", "talks", "agreement", "treaty", "diplomat", "minister", "cooperation"),
    Sector.CLIMATE: ("cyclone", "climate", "monsoon", "weather", "storm", "flood"),
}


def _infer_sectors(text: str) -> list[Sector]:
    low = text.lower()
    found = [s for s, kws in _SECTOR_KEYWORDS.items() if any(k in low for k in kws)]
    return found or [Sector.OTHER]


def load_demo_events() -> list[EventRecord]:
    """Load the cached, Bangladesh-relevant demo snapshot."""
    raw = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    return [EventRecord(**e) for e in raw["events"]]


async def fetch_live_events(limit: int = 30) -> list[EventRecord]:
    """Fetch recent GDELT coverage relevant to Bangladesh and map to EventRecord.

    Uses the public GDELT DOC 2.0 API (no key required). On any failure the
    caller falls back to the cached snapshot.
    """
    settings = get_settings()
    query = '(Bangladesh OR "Bay of Bengal") sourcelang:english'
    params = {
        "query": query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": str(limit),
        "sort": "datedesc",
    }
    url = "https://api.gdeltproject.org/api/v2/doc/doc"

    async with httpx.AsyncClient(timeout=settings.gdelt_timeout_seconds) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        payload = resp.json()

    events: list[EventRecord] = []
    for i, art in enumerate(payload.get("articles", [])):
        title = art.get("title") or "(untitled)"
        seendate = art.get("seendate", "")
        try:
            event_date = datetime.strptime(seendate[:8], "%Y%m%d").date()
        except (ValueError, TypeError):
            event_date = date.today()
        events.append(
            EventRecord(
                id=f"gdelt-live-{i}-{seendate}",
                title=title,
                summary=title,  # DOC API gives no body; title is the available signal
                event_date=event_date,
                actors=["Bangladesh"],  # query-guaranteed; richer extraction is P1 (LLM)
                sectors=_infer_sectors(title),
                location=art.get("sourcecountry"),
                source=f"GDELT live · {art.get('domain', 'web')}",
                url=art.get("url"),
                goldstein=None,
                tone=None,
            )
        )
    return events


async def get_events() -> tuple[list[EventRecord], bool]:
    """Return (events, live_source). Falls back to cached snapshot on any issue."""
    settings = get_settings()
    if settings.drishti_use_live_gdelt:
        try:
            live = await fetch_live_events()
            if live:
                return live, True
        except Exception:  # noqa: BLE001 — deliberate: never break the demo on upstream failure
            pass
    return load_demo_events(), False

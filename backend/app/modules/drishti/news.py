"""Real-time news ingestion for DRISHTI (D1).

Pulls live, current headlines from Google News RSS (free, keyless) and structures
them with a transparent keyword extractor — so the event feed is genuinely
real-time. Results are cached briefly to stay responsive and polite to the
source; the frontend polls the /events endpoint for live updates.
"""
from __future__ import annotations

import re
import time
from datetime import date, datetime
from xml.etree import ElementTree as ET

import httpx

from app.schemas.drishti import EventRecord, Sector

_QUERIES = [
    "Bangladesh trade export tariff garment RMG",
    "Bangladesh India Teesta border",
    "Bangladesh China port investment",
    "Bangladesh Myanmar Rohingya",
    "Bangladesh remittance migrant workers Gulf",
    "Bangladesh energy gas power",
    "Bangladesh foreign policy diplomacy US EU",
]
_ACTORS = {
    "india": "India", "china": "China", "myanmar": "Myanmar", "rohingya": "Myanmar",
    "united states": "United States", " us ": "United States", "u.s.": "United States",
    "european union": "European Union", " eu ": "European Union", "saudi": "Saudi Arabia",
    "uae": "United Arab Emirates", "qatar": "Qatar", "pakistan": "Pakistan", "japan": "Japan",
    "russia": "Russia", "malaysia": "Malaysia", "nepal": "Nepal", "sri lanka": "Sri Lanka",
    "bimstec": "BIMSTEC", "world bank": "World Bank", "imf": "IMF",
}
_SECTOR_KW = {
    Sector.TRADE: ("trade", "export", "import", "tariff", "garment", "rmg", "textile", "gsp", "apparel"),
    Sector.LABOUR: ("worker", "labour", "labor", "remittance", "migrant", "recruitment", "wage"),
    Sector.SECURITY: ("border", "security", "military", "clash", "attack", "defence", "defense", "troop"),
    Sector.ENERGY: ("energy", "gas", "power", "fuel", "oil", "lng", "electricity"),
    Sector.WATER: ("water", "river", "teesta", "ganges", "flood", "dam", "barrage"),
    Sector.DIPLOMACY: ("summit", "talks", "agreement", "treaty", "diplomat", "minister", "visit", "deal", "relations", "cooperation"),
    Sector.CLIMATE: ("cyclone", "climate", "monsoon", "storm", "flood", "disaster"),
}
_POS = ("deal", "agreement", "partnership", "cooperation", "resume", "sign", "invest", "boost", "support", "aid")
_NEG = ("clash", "tension", "dispute", "alarm", "worried", "threat", "ban", "cut", "fall", "drop", "concern", "crisis", "slump")

_CACHE: dict = {"events": None, "ts": 0.0}
_TTL = 900.0  # 15 minutes


def _sectors(text: str) -> list[Sector]:
    low = text.lower()
    return [s for s, kws in _SECTOR_KW.items() if any(k in low for k in kws)] or [Sector.DIPLOMACY]


def _actors(text: str) -> list[str]:
    low = f" {text.lower()} "
    out = ["Bangladesh"]
    for kw, name in _ACTORS.items():
        if kw in low and name not in out:
            out.append(name)
    return out


def _intensity(text: str) -> float:
    low = text.lower()
    return max(-9.0, min(9.0, sum(2 for w in _POS if w in low) - sum(2.5 for w in _NEG if w in low)))


async def fetch_live_news() -> list[EventRecord]:
    """Fetch and structure current Bangladesh-relevant headlines from Google News."""
    items: dict[str, dict] = {}
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        for q in _QUERIES:
            try:
                r = await client.get("https://news.google.com/rss/search",
                                     params={"q": f"{q} when:21d", "hl": "en-US", "gl": "US", "ceid": "US:en"})
                for it in ET.fromstring(r.text).iter("item"):
                    title = (it.findtext("title") or "").strip()
                    if not title or title in items:
                        continue
                    src = it.find("source")
                    source = (src.text if src is not None else "News") or "News"
                    clean = re.sub(r"\s+-\s+[^-]+$", "", title).strip()
                    try:
                        d = datetime.strptime((it.findtext("pubDate") or "")[:16], "%a, %d %b %Y").date()
                    except ValueError:
                        d = date.today()
                    items[title] = {"title": clean, "source": source, "url": it.findtext("link"), "date": d}
            except Exception:  # noqa: BLE001
                continue

    events: list[EventRecord] = []
    seen: set[str] = set()
    for it in sorted(items.values(), key=lambda x: x["date"], reverse=True):
        key = it["title"].lower()[:40]
        if key in seen:
            continue
        seen.add(key)
        inten = _intensity(it["title"])
        events.append(EventRecord(
            id="evt-" + re.sub(r"[^a-z0-9]+", "-", it["title"].lower())[:44].strip("-"),
            title=it["title"], summary=it["title"], event_date=it["date"],
            actors=_actors(it["title"]), sectors=_sectors(it["title"]), location=None,
            source=f"{it['source']} (Google News)", url=it["url"], goldstein=inten, tone=inten,
        ))
        if len(events) >= 16:
            break
    return events


async def get_live_events() -> list[EventRecord] | None:
    """Cached real-time events (refreshes every _TTL seconds)."""
    now = time.time()
    if _CACHE["events"] and now - _CACHE["ts"] < _TTL:
        return _CACHE["events"]
    try:
        ev = await fetch_live_news()
        if ev:
            _CACHE.update(events=ev, ts=now)
            return ev
    except Exception:  # noqa: BLE001
        pass
    return _CACHE["events"]

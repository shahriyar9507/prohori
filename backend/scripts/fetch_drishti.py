"""Build REAL DRISHTI data: live news events + Gemini briefs + World Bank economics.

Quota-light design: the events are REAL (Google News RSS) and structured with a
transparent keyword extractor (no LLM calls), so Gemini is spent only on the
Do/Avoid briefs for the top events. All real, all free.

    cd backend && python scripts/fetch_drishti.py
"""
from __future__ import annotations

import asyncio
import json
import re
import time
from datetime import date, datetime
from pathlib import Path
from xml.etree import ElementTree as ET

import httpx

from app.llm import is_enabled
from app.modules.drishti.brief import generate_brief
from app.modules.drishti.relevance import score_event
from app.schemas.common import utcnow
from app.schemas.drishti import EventRadarResponse, EventRecord, Sector

OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "demo" / "drishti"

QUERIES = [
    "Bangladesh trade export tariff garment RMG",
    "Bangladesh India Teesta border",
    "Bangladesh China port investment loan",
    "Bangladesh Myanmar Rohingya",
    "Bangladesh remittance migrant workers Gulf",
    "Bangladesh energy gas power LNG",
    "Bangladesh foreign policy diplomacy US EU",
]

ACTORS = {
    "india": "India", "china": "China", "myanmar": "Myanmar", "rohingya": "Myanmar",
    "united states": "United States", " us ": "United States", "u.s.": "United States",
    "european union": "European Union", " eu ": "European Union", "saudi": "Saudi Arabia",
    "uae": "United Arab Emirates", "qatar": "Qatar", "pakistan": "Pakistan", "japan": "Japan",
    "russia": "Russia", "malaysia": "Malaysia", "nepal": "Nepal", "bhutan": "Bhutan",
    "sri lanka": "Sri Lanka", "bimstec": "BIMSTEC", "world bank": "World Bank", "imf": "IMF",
}
SECTOR_KW = {
    Sector.TRADE: ("trade", "export", "import", "tariff", "garment", "rmg", "textile", "gsp", "apparel"),
    Sector.LABOUR: ("worker", "labour", "labor", "remittance", "migrant", "recruitment", "job", "wage"),
    Sector.SECURITY: ("border", "security", "military", "clash", "attack", "defence", "defense", "troop", "arms"),
    Sector.ENERGY: ("energy", "gas", "power", "fuel", "oil", "lng", "electricity", "grid"),
    Sector.WATER: ("water", "river", "teesta", "ganges", "flood", "dam", "barrage"),
    Sector.DIPLOMACY: ("summit", "talks", "agreement", "treaty", "diplomat", "minister", "visit", "deal", "relations", "cooperation"),
    Sector.CLIMATE: ("cyclone", "climate", "monsoon", "storm", "flood", "disaster"),
}
POS = ("deal", "agreement", "partnership", "cooperation", "resume", "sign", "invest", "boost", "support", "aid")
NEG = ("clash", "tension", "dispute", "alarm", "worried", "threat", "ban", "cut", "fall", "drop", "concern", "crisis", "slump")


def infer_sectors(text: str) -> list[Sector]:
    low = text.lower()
    found = [s for s, kws in SECTOR_KW.items() if any(k in low for k in kws)]
    return found or [Sector.DIPLOMACY]


def infer_actors(text: str) -> list[str]:
    low = f" {text.lower()} "
    out = ["Bangladesh"]
    for kw, name in ACTORS.items():
        if kw in low and name not in out:
            out.append(name)
    return out


def infer_intensity(text: str) -> float:
    low = text.lower()
    score = sum(2 for w in POS if w in low) - sum(2.5 for w in NEG if w in low)
    return max(-9.0, min(9.0, score))


def fetch_news() -> list[dict]:
    items: dict[str, dict] = {}
    with httpx.Client(timeout=30, follow_redirects=True) as client:
        for q in QUERIES:
            try:
                r = client.get("https://news.google.com/rss/search",
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
            except Exception as e:  # noqa: BLE001
                print("  rss err:", str(e)[:70])
            time.sleep(1)
    return list(items.values())


def build_event(item: dict) -> EventRecord:
    title = item["title"]
    inten = infer_intensity(title)
    return EventRecord(
        id="evt-" + re.sub(r"[^a-z0-9]+", "-", title.lower())[:44].strip("-"),
        title=title, summary=title, event_date=item["date"],
        actors=infer_actors(title), sectors=infer_sectors(title), location=None,
        source=f"{item['source']} (Google News)", url=item["url"],
        goldstein=inten, tone=inten,
    )


def fetch_worldbank() -> dict:
    codes = {"Exports (US$)": "NE.EXP.GNFS.CD", "Imports (US$)": "NE.IMP.GNFS.CD",
             "Remittances (US$)": "BX.TRF.PWKR.CD.DT", "GDP (US$)": "NY.GDP.MKTP.CD",
             "External debt (US$)": "DT.DOD.DECT.CD"}
    out: dict[str, list] = {}
    with httpx.Client(timeout=30) as client:
        for name, code in codes.items():
            try:
                data = client.get(f"https://api.worldbank.org/v2/country/BGD/indicator/{code}",
                                  params={"format": "json", "per_page": "20", "date": "2012:2023"}).json()
                series = sorted(({"year": int(p["date"]), "value": p["value"]} for p in (data[1] or []) if p["value"] is not None),
                                key=lambda x: x["year"])
                out[name] = series
            except Exception as e:  # noqa: BLE001
                print("  wb err", name, str(e)[:50])
    return out


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print("1) real headlines…")
    news = fetch_news()
    news.sort(key=lambda x: x["date"], reverse=True)
    print(f"   {len(news)} unique; building events…")

    scored = sorted((score_event(build_event(it)) for it in news), key=lambda s: s.relevance_score, reverse=True)
    # de-dup near-identical titles, keep top 14
    seen, top = set(), []
    for s in scored:
        key = s.event.title.lower()[:40]
        if key in seen:
            continue
        seen.add(key)
        top.append(s)
        if len(top) >= 14:
            break

    print(f"2) Gemini briefs for top {min(6, len(top))} (EN+BN)… enabled={is_enabled()}")
    briefs: dict[str, dict] = {}
    for s in top[:6]:
        for lang in ("en", "bn"):
            b = await generate_brief(s, lang)
            briefs[f"{s.event.id}:{lang}"] = b.model_dump(mode="json")
            print(f"   {s.event.id[:34]}:{lang} -> {b.narrative_source}")
            await asyncio.sleep(4)

    print("3) World Bank…")
    econ = fetch_worldbank()

    resp = EventRadarResponse(generated_at_utc=utcnow().isoformat(), total=len(top), events=top,
                              filters_applied={"sector": None, "severity": None, "min_score": "0.0"}, live_source=True)
    (OUT / "events.json").write_text(json.dumps(resp.model_dump(mode="json"), ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "briefs.json").write_text(json.dumps(briefs, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "econ.json").write_text(json.dumps(econ, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nDONE -> {len(top)} REAL events, {len(briefs)} briefs, {len(econ)} econ series")


if __name__ == "__main__":
    asyncio.run(main())

"""Export deterministic demo API responses to static JSON.

Produces the exact payloads the frontend expects, so the deployed site can run
fully self-contained (no backend to keep alive) for judging — while the real
dynamic backend remains available for anyone who runs the stack. Run:

    cd backend && .venv/Scripts/python.exe scripts/export_demo.py
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from app.modules.drishti import gdelt
from app.modules.drishti.brief import generate_brief
from app.modules.drishti.relevance import score_and_rank, score_event
from app.modules.rakkhok import fleet as rk
from app.modules.rakkhok.readiness import rollup
from app.modules.shomudro import picture as sh
from app.schemas.common import utcnow
from app.schemas.drishti import EventRadarResponse

OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "demo"


def _write(rel: str, obj) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    if hasattr(obj, "model_dump"):
        data = obj.model_dump(mode="json")
    elif isinstance(obj, list):
        data = [o.model_dump(mode="json") if hasattr(o, "model_dump") else o for o in obj]
    else:
        data = obj
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", rel)


async def main() -> None:
    # ── DRISHTI ──────────────────────────────────────────────
    events, live = await gdelt.get_events()
    scored = score_and_rank(events)
    _write("drishti/events.json", EventRadarResponse(
        generated_at_utc=utcnow().isoformat(), total=len(scored), events=scored,
        filters_applied={"sector": None, "severity": None, "min_score": "0.0"}, live_source=live,
    ))
    briefs = {}
    for e in events:
        for lang in ("en", "bn"):
            b = await generate_brief(score_event(e), lang)
            briefs[f"{e.id}:{lang}"] = b.model_dump(mode="json")
    _write("drishti/briefs.json", briefs)

    # ── RAKKHOK ──────────────────────────────────────────────
    healths = rk.all_health()
    _write("rakkhok/readiness.json", rollup(healths))
    _write("rakkhok/assets.json", healths)
    ranking = sorted(healths, key=lambda h: (-h.failure_probability_90d, h.rul_days))[:8]
    _write("rakkhok/rul-ranking.json", ranking)
    order = {"red": 0, "amber": 1, "yellow": 2, "green": 3}
    alerts = [a for h in healths for a in h.alerts]
    alerts.sort(key=lambda a: (order.get(a.level.value, 9), a.days_remaining))
    _write("rakkhok/alerts.json", alerts)

    # ── SHOMUDRO ─────────────────────────────────────────────
    pic = sh.assemble()
    _write("shomudro/picture.json", pic)
    interdictions = {}
    for d in pic.dark_vessels:
        p = sh.build_interdiction(d.detection.id)
        if p:
            interdictions[d.detection.id] = p.model_dump(mode="json")
    for e in pic.sts_events:
        p = sh.build_interdiction(e.id)
        if p:
            interdictions[e.id] = p.model_dump(mode="json")
    _write("shomudro/interdictions.json", interdictions)

    print("\nDemo export complete ->", OUT)


if __name__ == "__main__":
    asyncio.run(main())

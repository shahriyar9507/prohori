# DRISHTI (দৃষ্টি) — Geopolitical & Diplomatic Intelligence

> *"Not what happened — but what should Bangladesh do, avoid, or hedge against."*

DRISHTI turns the world's event stream into a Bangladesh-relevance-ranked feed
and, on demand, a cited **Do/Avoid** national-interest brief. It is Module 1 of
PRAHARI.

## Features in this module

| ID | Feature | Status |
|----|---------|--------|
| **D1** | Global Event Radar — events ranked by Bangladesh Relevance Score | ✅ MVP |
| **D4** | Do/Avoid Advisor — two-column brief with citations, refuses on low evidence | ✅ MVP |
| **C2** | Ask-PRAHARI — bilingual (Bangla + English) grounded Q&A | ✅ MVP |
| **C3** | Explainability — every output carries evidence chain + confidence | ✅ MVP |

## How the Bangladesh Relevance Score works

A transparent, auditable heuristic (0–100) — never a black box. Four weighted
components, each returning its own reasoning:

| Component | Weight | Basis |
|-----------|--------|-------|
| Actor relevance | 0.40 | Is Bangladesh / a neighbour / a major partner involved? |
| Sector relevance | 0.30 | Remittance (labour) & RMG trade weighted highest |
| Geographic proximity | 0.15 | Bay of Bengal / South Asia focus |
| Event magnitude | 0.15 | Cooperation/conflict intensity signal from the keyword extractor |

Severity bands: **≥70 = red** (act now) · **45–69 = amber** (30–90 day window)
· **<45 = green** (nominal). An LLM judgement layer refines these in P1; the
structure and explainability stay identical.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/drishti/events` | Ranked event radar. Query: `sector`, `severity`, `min_score`, `limit`. |
| `GET` | `/api/drishti/events/{id}/brief` | Do/Avoid brief for one event. Query: `language` (`en`/`bn`). |
| `POST` | `/api/drishti/ask` | Ask-PRAHARI Q&A. Body: `{ question, language }`. |

Interactive docs: run the backend and open `/docs`.

## Data & grounding

- **Events:** live **Google News RSS** (`news.py`, keyless) is the primary feed,
  cached ~15 min. A baked snapshot (`data/demo_events.json`, 14 Bangladesh-relevant
  events) serves the instant static demo, and a secondary GDELT DOC 2.0 path
  (`gdelt.py`) is available when `DRISHTI_USE_LIVE_GDELT=True` (off by default).
- **Recommendations:** grounded in `knowledge.py` (per-sector DO/AVOID/HEDGE
  playbooks). Every recommendation cites its evidence.
- **Do/Avoid narrative:** the deployed LLM is **Google Gemini 2.5 Flash-Lite**
  (via the OpenAI-compatible adapter), producing a real-time comparative read of
  the event against today's live headline context. Point `LLM_BASE_URL` at a
  local Ollama/vLLM endpoint instead to go sovereign/air-gapped. With no key, a
  deterministic grounded narrative keeps the demo alive.

## Run locally

```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload            # API at http://localhost:8000
pytest                                    # run the DRISHTI test suite
```

Then start the frontend (`cd frontend && npm install && npm run dev`) and open
the DRISHTI tab.

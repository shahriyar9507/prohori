# PRAHARI — The Sentinel
### Sovereign AI for National Strategic Intelligence & Defense Readiness
**SciBlitz AI Challenge 2026 · Track E — National Defence**
*(This is the source for the required ≤8-page project report PDF. Export to PDF at ≥10 pt with figures.)*

---

## 1. Problem Statement

Bangladesh faces three simultaneous decision problems, each drowning in data yet starved of *intelligence*:

1. **Geopolitical blindness.** Events that reshape Bangladesh's interests — a third-country port deal, a sanctions regime, a garment-buyer policy shift — are analysed reactively, weeks after the decision window has closed. Analysis is siloed across MoFA, Commerce, Defence and the Coast Guard with no shared picture and no institutional memory.
2. **Readiness opacity.** Defense platforms are grounded by surprise: a "healthy" aircraft is un-flyable on one expired consumable; spare-part lines run dry before the next procurement cycle; commanders lack an honest, live mission-capable picture.
3. **A porous sea.** Bangladesh guards a maritime zone larger than its landmass (~118,813 km²) with a small patrol fleet. Vessels "go dark" (switch off AIS) to smuggle, traffic, and fish illegally — an estimated hundreds of millions of USD/year lost to IUU fishing alone.

**The common failure: the data exists; the intelligence does not.**

## 2. Proposed Solution

PRAHARI is a sovereign, bilingual (Bangla + English), human-in-the-loop AI decision-support platform with three modules on one shared core, feeding one National Situation Dashboard:

- **DRISHTI** — geopolitical intelligence: ranks world events by a **Bangladesh Relevance Score** and produces a cited **Do/Avoid** national-interest brief.
- **RAKKHOK** — asset readiness: digital twin per asset, service-life/expiry alerts, **Weibull RUL** prediction, and force-level mission-capable %.
- **SHOMUDRO** — maritime awareness: fuses Sentinel-1 SAR with AIS to detect **dark vessels** and **ship-to-ship rendezvous**, and generates an **interdiction packet**.

Every output is **explainable** (evidence chain + confidence), **Bangladesh-first** (ends in a recommendation), and **advisory only** (officers decide).

## 3. Methodology

A single deployable FastAPI backend exposes the three modules behind one API; a React + Vite command-center frontend consumes it, with `react-simple-maps` for the DRISHTI world map and Mapbox GL JS / Google Maps for the SHOMUDRO tactical map. The frontend loads an instant baked JSON snapshot, then polls the live backend for fresh events and briefs, so the demo is fast and cannot go down. There is no database in the MVP: the backend reads local JSON data files and calls live public APIs. All MVP data sources are free and keyless (or free-tier): **Google News RSS** (primary live feed), **World Bank Open Data**, **Global Fishing Watch**, **Copernicus Sentinel-1**, and **Google Gemini** (2.5 Flash-Lite, via a pluggable OpenAI-compatible adapter that can point at a local open-weight model instead). GDELT DOC 2.0 is available as an opt-in secondary path. The larger production vision — a five-layer streaming platform (Kafka, PostGIS/TimescaleDB, a Neo4j knowledge graph, vector search) — is documented as a roadmap, **not built** in this MVP.

## 4. AI/ML Approach

| Module | AI/ML component | Method |
|---|---|---|
| DRISHTI | Event extraction | Transparent, auditable keyword engine — tags each headline with actors, policy sectors, and a cooperation/conflict intensity signal (no black box) |
| DRISHTI | Bangladesh Relevance Score | Transparent weighted model — actor (0.40) + sector (0.30) + geography (0.15) + magnitude (0.15); each component carries its own reasoning |
| DRISHTI | Do/Avoid brief | Real-time comparative analysis by **Google Gemini** (2.5 Flash-Lite) grounding the target event against today's live headline context, over per-sector DO/AVOID/HEDGE playbooks; **mandatory citations; refuses below a confidence floor**; deterministic grounded fallback when no LLM is configured; sovereign-capable (swap the endpoint for a local model) |
| DRISHTI | Ask-PRAHARI | Bilingual keyword-grounded Q&A over the current feed |
| RAKKHOK | RUL | Weibull survival analysis (wear-out shape k=2.5) on each asset's driving usage counter → RUL days + 90-day failure probability |
| RAKKHOK | Readiness | Worst-clock grounding rule + asset→force roll-up |
| SHOMUDRO | Dark detection | Gated greedy SAR⋈AIS association (distance + size gates); unmatched = dark; risk scoring by corridor/night/size |
| SHOMUDRO | STS | Rule engine: <200 m, ≈0 kn, >30 min, incl. one-party-dark |

Production upgrades (documented as roadmap, not overpromised and **not present in this MVP**): fine-tuned multilingual LLM for event extraction (≥85% F1 target), YOLOv8/11 on xView3 for live SAR vessel detection, sequence models for AIS anomalies, and gradient-boosting on real logbooks for RUL.

## 5. Results

- **Working full-stack MVP**, all three modules, deployed as a self-contained live URL (never depends on a sleeping backend) that then upgrades to live data — real-time Google News headlines and freshly-generated Gemini briefs — by polling the backend.
- **21 automated tests pass** across the three modules (relevance scoring & refusal, worst-clock grounding, RUL risk ordering, SAR⋈AIS dark identification, one-party-dark STS, interdiction packet with chain-of-custody hash).
- **Demo scene:** 14 ranked Bangladesh-relevant events; a 25-asset fleet with a live service-life alert and a grounding; a Bay of Bengal scene (8 AIS tracks, 12 SAR detections) resolving to 4 dark contacts and one one-party-dark STS rendezvous with a generated interdiction packet.
- Every AI output carries its evidence chain and confidence; the Do/Avoid advisor refuses rather than hallucinate on thin evidence.

## 6. Limitations & Future Work

- **SAR is pre-computed** for the demo (live YOLO on Sentinel-1 needs weights + GPU + scene download that cannot be guaranteed live during judging); the detection pipeline is the documented production path.
- **Relevance & RUL** are transparent heuristics/survival models in the MVP; the LLM-judgement and gradient-boosting upgrades are P1.
- **SAR physics:** small wooden craft return weakly; close-to-shore is the hard case — optical-imagery fusion is the Phase-3 answer.
- **Roadmap:** P1 pilot (Coast Guard champion) → P2 national inter-agency picture → P3 persistent EEZ coverage, air-gapped sovereign deployment, and continuous retraining.

## 7. Ethics & Governance

Human-in-the-loop by design (no autonomous action); tracks vessels and states, never private citizens; maritime operations follow UNCLOS and national law; immutable audit trail for oversight; open-weight models fine-tuned and hosted in-country. See [`MODEL_AND_DATA_CARD.md`](MODEL_AND_DATA_CARD.md) and [`ATTRIBUTION.md`](ATTRIBUTION.md).

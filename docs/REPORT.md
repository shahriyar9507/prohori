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

A single deployable FastAPI backend exposes the three modules behind one API; a React + MapLibre command-center frontend consumes it. The production design is a five-layer sovereign, air-gappable platform (Kafka, PostGIS, TimescaleDB, Neo4j, Qdrant, locally-hosted LLMs); the hackathon MVP collapses this into one app with cached, deterministic demo data so the live demo is fast and reliable. All MVP data sources are free (GDELT, Sentinel-1/Copernicus, xView3, AIS, Global Fishing Watch, UN Comtrade).

## 4. AI/ML Approach

| Module | AI/ML component | Method |
|---|---|---|
| DRISHTI | Bangladesh Relevance Score | Transparent weighted model — actor (0.40) + sector (0.30) + geography (0.15) + magnitude (0.15); GDELT Goldstein/tone as signals |
| DRISHTI | Do/Avoid brief | Retrieval-augmented generation grounded in a precedent knowledge base; **mandatory citations; refuses below a confidence floor**; sovereign-capable LLM (local or hosted) with deterministic fallback |
| DRISHTI | Ask-PRAHARI | Bilingual retrieval-grounded Q&A |
| RAKKHOK | RUL | Weibull survival analysis (wear-out shape k=2.5) on each asset's driving usage counter → RUL days + 90-day failure probability |
| RAKKHOK | Readiness | Worst-clock grounding rule + asset→force roll-up |
| SHOMUDRO | Dark detection | Gated greedy SAR↔AIS association (distance + size gates); unmatched = dark; risk scoring by corridor/night/size |
| SHOMUDRO | STS | Rule engine: <200 m, ≈0 kn, >30 min, incl. one-party-dark |

Production upgrades (documented, not overpromised): fine-tuned multilingual LLM for event extraction (≥85% F1 target), YOLOv8/11 on xView3 for SAR, sequence models for AIS, gradient boosting for RUL.

## 5. Results

- **Working full-stack MVP**, all three modules, deployed as a self-contained live URL (never depends on a sleeping backend).
- **21 automated tests pass** across the three modules (relevance scoring & refusal, worst-clock grounding, RUL risk ordering, SAR↔AIS dark identification, one-party-dark STS, interdiction packet with chain-of-custody hash).
- **Demo scene:** 10 ranked geopolitical events; a 25-asset fleet with a live service-life alert and a grounding; a Bay of Bengal scene resolving to 4 dark contacts and one one-party-dark STS rendezvous with a generated interdiction packet.
- Every AI output carries its evidence chain and confidence; the Do/Avoid advisor refuses rather than hallucinate on thin evidence.

## 6. Limitations & Future Work

- **SAR is pre-computed** for the demo (live YOLO on Sentinel-1 needs weights + GPU + scene download that cannot be guaranteed live during judging); the detection pipeline is the documented production path.
- **Relevance & RUL** are transparent heuristics/survival models in the MVP; the LLM-judgement and gradient-boosting upgrades are P1.
- **SAR physics:** small wooden craft return weakly; close-to-shore is the hard case — optical-imagery fusion is the Phase-3 answer.
- **Roadmap:** P1 pilot (Coast Guard champion) → P2 national inter-agency picture → P3 persistent EEZ coverage, air-gapped sovereign deployment, and continuous retraining.

## 7. Ethics & Governance

Human-in-the-loop by design (no autonomous action); tracks vessels and states, never private citizens; maritime operations follow UNCLOS and national law; immutable audit trail for oversight; open-weight models fine-tuned and hosted in-country. See [`MODEL_AND_DATA_CARD.md`](MODEL_AND_DATA_CARD.md) and [`ATTRIBUTION.md`](ATTRIBUTION.md).

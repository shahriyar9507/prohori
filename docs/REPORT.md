# PRAHARI (প্রহরী) — The Sentinel
### Sovereign AI for National Strategic Intelligence & Defense Readiness
**Team DatourX · SciBlitz AI Challenge 2026 · Track E — National Defence**

Live demo: **https://prahari.vercel.app** · Backend API: **https://prahari-backend-5b6b.onrender.com** · Repository: **https://github.com/shahriyar9507/prohori**

*(This document is the source for the submitted ≤8-page project report PDF, structured per Rulebook §7.1: Problem → Solution → Methodology → AI/ML approach → Results → Limitations & future work.)*

---

## 1. Problem Statement

Bangladesh faces three simultaneous national-security decision problems, each drowning in data yet starved of *intelligence*:

1. **Geopolitical blindness.** Events that reshape Bangladesh's interests — a third-country port agreement, a garment-buyer policy shift, a sanctions regime, a water-sharing standoff — are discovered reactively, often weeks after the decision window has closed. Analysis is siloed across MoFA, Commerce, Defence and the Coast Guard, with no shared picture, no institutional memory, and no evidence trail behind judgment calls.
2. **Readiness opacity.** Defense platforms are grounded by surprise: a "healthy" aircraft becomes un-flyable on one expired certification; consumable and overhaul clocks are tracked in spreadsheets; commanders lack an honest, live mission-capable percentage for the force.
3. **A porous sea.** Bangladesh guards a maritime zone larger than its landmass (~118,813 km²) with a small patrol fleet. Vessels "go dark" — switch off AIS transponders — to smuggle, traffic and fish illegally; IUU fishing alone is estimated to cost hundreds of millions of USD per year.

**The common failure: the data already exists — free, open, real-time — but the intelligence does not.**

## 2. Proposed Solution

**PRAHARI** ("The Sentinel") is a sovereign, bilingual (Bangla + English), human-in-the-loop AI decision-support platform that turns open data into recommendations with the evidence attached. Three modules run on one shared explainability core, unified by a **National Situation** dashboard:

| Module | Domain | What it delivers |
|---|---|---|
| **DRISHTI** (দৃষ্টি, *Vision*) | Geopolitical & diplomatic intelligence | Real-time news → **Bangladesh Relevance Score** (0–100) → an AI **Do/Avoid brief** that analyses the event against *today's* live situation, with citations and confidence |
| **RAKKHOK** (রক্ষক, *Guardian*) | Defense asset lifecycle & readiness | Digital twin per asset → service-life countdown clocks (180/90/30-day alerts) → **Weibull RUL** prediction and 90-day failure risk → force-level mission-capable % |
| **SHOMUDRO** (সমুদ্র, *Sea*) | Maritime domain awareness | Sentinel-1 SAR ⋈ satellite AIS fusion → **dark vessels** and **STS rendezvous** → a court-ready **interdiction packet** with a chain-of-custody hash |

Design laws applied to every output: **Bangladesh-first** (every output ends in a recommendation scored for national interest), **human-in-the-loop** (PRAHARI advises; authorized officers decide), **explainability as P0** (every number carries evidence + confidence, and the system *refuses* on thin evidence), **sovereign & air-gappable** (pluggable LLM adapter; nothing sensitive must leave national infrastructure), **open-data-first**, and **bilingual by design**.

## 3. Methodology & System Architecture

**Architecture.** A single FastAPI (Python 3.11) backend exposes all three modules behind one API; a React 18 + Vite command-center frontend consumes it. The MVP deliberately uses no database: the backend reads versioned JSON data files and calls live public APIs, which keeps the whole system deployable on free tiers and air-gappable by construction.

```
Google News RSS ──┐                                       ┌─ DRISHTI view (world map, charts, news wall, brief)
World Bank API  ──┤   FastAPI backend (Render)            ├─ RAKKHOK view (readiness, risk table, digital twin)
Global Fishing  ──┼─► /api/drishti · /api/rakkhok         ├─ SHOMUDRO view (Mapbox/Google tactical map)
 Watch (AIS)      │   /api/shomudro  + explainability     ├─ National Situation (C1 posture + alert stream)
Sentinel-1 SAR ──┤   core (Evidence + AIMeta on all)      │
Gemini (LLM)   ──┘        ▲ baked JSON snapshot           └─ React 18 + Vite (Vercel) — bilingual, dark/light
                          └───────── frontend polls live API every 5 min ─────────┘
```

**Resilient hybrid delivery.** The frontend ships with a **baked JSON snapshot** of the full demo (static mode), so the public URL loads instantly and can never be taken down by a sleeping backend. It then **polls the live backend every 5 minutes** for fresh events and requests real Gemini briefs on demand (22-second timeout guard with a grounded instant fallback). Judges therefore always see a working product that *upgrades itself* to live data.

**Real-time ingestion (DRISHTI).** The backend queries Google News RSS with 7 Bangladesh-focused query sets (trade/RMG, India–Teesta–border, China–port–investment, Myanmar–Rohingya, remittances–Gulf, energy, foreign policy) over a 21-day window, de-duplicates, extracts structure, and caches for 15 minutes — a genuinely live, keyless feed.

**Real maritime data (SHOMUDRO).** The Bay of Bengal picture is built from **real Global Fishing Watch satellite data** (24 AIS tracks, 60 AIS-gap "dark" events, 40 encounter events) fused with a **real Copernicus Sentinel-1 SAR scene** (19 radar vessel detections with per-contact radar chips). SAR detections were pre-computed offline with a CFAR detector (threshold μ + 6σ) so the fusion, risk-scoring, STS and interdiction logic all run for real without a GPU during judging.

**Deployment.** Frontend on Vercel (static bake + live API base); backend on Render (uvicorn, health check, CORS pinned to the frontend origins); Python pinned to 3.11.9. Total infrastructure cost: $0.

## 4. AI/ML Approach

AI is the core of the product, not a peripheral call: every module's central artefact (relevance score, brief, RUL, dark-vessel identification) is produced by an AI/ML component with an explicit, auditable design.

| Module | Component | Method (exactly as deployed) |
|---|---|---|
| DRISHTI | Event extraction | Transparent keyword engine over each headline: 17-actor map, 7 policy-sector keyword sets, and a cooperation/conflict **intensity signal** (+2 per cooperative term, −2.5 per conflictual term, clamped ±9). Fully auditable — no black box at the ingestion layer. |
| DRISHTI | **Bangladesh Relevance Score** | 4-component weighted model: **actor 0.40** (tiered: Bangladesh-direct 100, India/China/Myanmar 88, US/EU/Gulf/Japan… 72, wider region 50), **sector 0.30** (trade 1.00, labour/security 0.95, water 0.90, energy 0.85 …), **geography 0.15**, **magnitude 0.15** (from the intensity signal). Severity: **≥70 RED, ≥45 AMBER, else GREEN**. Each component returns its own reasoning string. |
| DRISHTI | **Do/Avoid brief** (Gemini) | **Real-time comparative analysis** by **Google Gemini 2.5 Flash-Lite**: the model receives the target event *plus a digest of the 12 most-recent live headlines and today's date*, and must relate the event to the current situation — what partners are doing now, the present state of the relationship — over grounded per-sector DO/AVOID/HEDGE playbooks with cited precedents. Strict `SITUATION:/ANALYSIS:` output contract; **refuses below a 0.5 confidence floor**; deterministic grounded fallback whenever the LLM is unavailable. Served through an OpenAI-compatible adapter with rate-limit retry — swap one base URL to run a local open-weight model fully air-gapped. |
| DRISHTI | Ask-PRAHARI | Bilingual (EN/BN) Q&A grounded by token-overlap retrieval over the live feed (top-4 events); LLM composes only from retrieved facts, with a deterministic bilingual fallback. |
| RAKKHOK | **Remaining Useful Life** | **Weibull survival analysis** `S(x) = exp(−(x/scale)^k)` with wear-out shape **k = 2.5**; scale = the driving clock's design limit; RUL = (limit − current)/utilisation; 90-day failure risk = the conditional probability `1 − S(u+90d·util)/S(u)`. Calendar-only assets fall back to deadline-driven risk. |
| RAKKHOK | Readiness & alerts | **Worst-clock grounding rule** (an asset is only as healthy as its most-consumed clock; any overdue clock ⇒ grounded); calendar alert windows **30/90/180 days** (red/amber/yellow), usage thresholds 100%/90%/80%; force-level roll-up to mission-capable %. |
| SHOMUDRO | **Dark-vessel detection** | Gated greedy **SAR ⋈ AIS association**: distance gate ≤250 m and length gate ±30%; a radar contact with no valid AIS partner = **dark**. Risk score: baseline 25, +35 in a known trafficking corridor, +15 night pass, +15 small-craft length (12–45 m); HIGH ≥70. |
| SHOMUDRO | STS rendezvous | Rule engine: two vessels **<200 m** apart, **≤1 kn**, **≥30 min**, including the one-party-dark case (⇒ HIGH risk). |
| SHOMUDRO | Interdiction packet | Drift prediction (current + 3% wind leeway over 60 min), intercept vector/ETA to the nearest patrol asset, and a **SHA-256 chain-of-custody hash** over scene, fixes and the full evidence log — built for court admissibility. |
| Core | Explainability contract | Every AI output carries `Evidence[]` (source, detail, weight) and `AIMeta` (model version, confidence, confidence label). Confidence < 0.25 is labelled *insufficient* and recommendation generation is refused. |

**Why this approach wins on the rubric:** the judged criterion is *effective, appropriate, well-integrated use of AI* — PRAHARI combines a foundation model (Gemini) where language reasoning is genuinely needed, with transparent statistical models (Weibull survival, weighted relevance, gated association) where auditability is a national-security requirement. Every choice is explainable to a commander.

## 5. Results

- **A complete, working, deployed product** — all three modules plus the National Situation dashboard, live at a public URL with no login, fully responsive (phone/tablet/desktop) and fully bilingual (EN/বাংলা).
- **Genuinely real data end-to-end:** live Google News headlines (refreshed every 15 min server-side, polled every 5 min client-side), real World Bank macro series (2012–2023), real GFW satellite AIS (24 tracks, 60 dark-gap events, 40 encounters), a real Sentinel-1 SAR scene (19 detections + radar chips), and real Gemini-generated briefs.
- **21 automated backend tests pass** across the three modules: relevance scoring & refusal behaviour, worst-clock grounding, RUL risk ordering, SAR⋈AIS dark identification, one-party-dark STS, and interdiction-packet hashing.
- **Demo scene at judging:** ~14–16 ranked live events with Do/Avoid briefs; a 25-asset fleet with live service-life alerts, one grounding and a full digital-twin health report; a Bay of Bengal picture resolving 19 SAR contacts against AIS into dark-vessel candidates and STS shortlists, each generating an interdiction packet with a verifiable hash.
- **Explainability delivered, not promised:** every score, brief, alert and packet in the UI exposes its evidence chain and confidence; the advisor visibly refuses when evidence is thin.

## 6. Limitations & Future Work

- **SAR detection is pre-computed.** Running a neural SAR detector live requires GPU + scene download that cannot be guaranteed during judging; the CFAR-detected real scene stands in. **P1:** YOLOv8/11 fine-tuned on xView3 for live detection, incl. the hard close-to-shore case.
- **Transparent heuristics by choice.** Relevance and RUL are auditable statistical models in the MVP; **P1** upgrades are a fine-tuned multilingual extractor (target ≥85% F1) and gradient-boosting RUL on real maintenance logbooks — without abandoning the evidence contract.
- **RAKKHOK data is synthetic** (25 fictional assets) because real force inventories are classified; the pipeline is designed so a real registry drops in without code changes.
- **Free-tier constraints.** The backend sleeps after inactivity (mitigated by the static bake + wake-on-poll); Gemini free-tier rate limits occasionally trigger the deterministic fallback (mitigated by retry/backoff + instant grounded briefs).
- **Roadmap.** P1 pilot with a Coast Guard champion (live AIS streaming, YOLO SAR); P2 national inter-agency picture (streaming bus, geospatial + time-series stores, knowledge graph); P3 persistent EEZ coverage, fully air-gapped sovereign deployment with locally-hosted open-weight models, and continuous retraining.

## 7. Ethics & Governance

Human-in-the-loop by design — no autonomous action of any kind; PRAHARI tracks **vessels and state-level actors, never private citizens**; maritime logic follows UNCLOS-aligned evidence practice (timestamps + chain-of-custody hashing); every AI output is attributable (model version, confidence, evidence) and auditable; demo fleet data is openly fictional. Full details: [`MODEL_AND_DATA_CARD.md`](MODEL_AND_DATA_CARD.md) · [`ATTRIBUTION.md`](ATTRIBUTION.md).

---

**Team DatourX** · PRAHARI is open source under **AGPL-3.0** · © 2026 DatourX

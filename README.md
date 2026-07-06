<div align="center">

# 🛡️ PRAHARI — *The Sentinel*

### Sovereign AI for National Strategic Intelligence & Defense Readiness

**দৃষ্টি · রক্ষক · সমুদ্র** — one brain that answers, every day:
### *"What is best for Bangladesh — and what must Bangladesh avoid?"*

<br/>

![Track](https://img.shields.io/badge/Track_E-National_Defence-0b3d2e?style=for-the-badge)
![Event](https://img.shields.io/badge/SciBlitz_AI_Challenge-2026-1e6091?style=for-the-badge)
![Status](https://img.shields.io/badge/status-in_development-f59e0b?style=for-the-badge)

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-frontend-61DAFB?logo=react&logoColor=black)
![MapLibre](https://img.shields.io/badge/MapLibre-GL-1e6091?logo=maplibre&logoColor=white)
![License](https://img.shields.io/badge/license-AGPL--3.0-green)

</div>

---

## 🎯 The Problem

> **The data exists. The intelligence does not.**

Events that decide Bangladesh's future — a third-country port deal, a new sanctions regime, a dark vessel running contraband across the Bay of Bengal, a patrol aircraft quietly grounded by one expired component — are today discovered **reactively, weeks after the decision window has closed**. Analysis is fragmented across MoFA, Commerce, Defence and the Coast Guard, with no shared picture and no institutional memory.

Bangladesh guards a maritime zone **larger than its landmass** (~118,813 km² of territorial waters + EEZ) with a small patrol fleet, sits at a contested great-power crossroads, and loses an estimated **hundreds of millions of USD a year to IUU fishing** alone.

**PRAHARI turns raw open data into a decision — with the evidence attached.**

---

## 🧩 Three Modules, One Sentinel

| | Module | Bangla | What it does |
|---|---|---|---|
| 👁️ | **DRISHTI** | দৃষ্টি (Vision) | **Geopolitical & diplomatic intelligence.** GDELT world-events + treaties + trade data → AI event extraction → knowledge graph → a **Bangladesh Relevance Score** → a two-column **Do / Avoid brief with cited sources**. |
| 🛡️ | **RAKKHOK** | রক্ষক (Guardian) | **Defense asset lifecycle & readiness.** A digital twin per asset, service-life & expiry countdowns (180/90/30-day alerts), ML **Remaining-Useful-Life** prediction, and live **fleet-readiness %**. |
| 🌊 | **SHOMUDRO** | সমুদ্র (Sea) | **Maritime domain awareness.** Sentinel-1 SAR vessel detection cross-correlated with AIS — *radar-visible + AIS-silent = a **dark vessel*** — plus **ship-to-ship rendezvous** detection and one-click **interdiction packets**. |

All three feed **one National Situation Dashboard** with role-based views (PMO / MoFA / Armed Forces / Navy / Coast Guard / analyst).

---

## ✨ Non-Negotiable Design Laws

1. **🇧🇩 Bangladesh-first** — every output ends in a *recommendation scored for national interest*, never just a summary.
2. **🧑‍✈️ Human-in-the-loop** — PRAHARI **advises; authorized officers decide.** No autonomous action, ever.
3. **🔍 Explainability is P0** — every score, alert and recommendation carries its **evidence chain, sources and confidence**. It refuses to answer on low evidence rather than hallucinate.
4. **🔒 Sovereign & air-gappable** — designed for locally-hosted open-weight models; no sensitive data leaves national infrastructure.
5. **🆓 Open-data-first** — the entire MVP runs on **free public data** (GDELT, UN Treaty Collection, UN Comtrade, Sentinel-1/Copernicus, xView3, AIS, Global Fishing Watch, Open-Meteo).
6. **🌐 Bilingual by design** — Bangla + English, in UI, reports and voice. Bangla is a first-class citizen.
7. **⚖️ Legal & proportionate** — maritime ops follow **UNCLOS**; PRAHARI tracks *vessels and states, never private citizens*; evidence packages are built for court admissibility.

---

## 🏗️ Architecture

PRAHARI is designed as a five-layer sovereign platform. The **hackathon MVP** implements the shaded path — a single deployable web app — while the full microservice/air-gap architecture is the documented production roadmap.

```
┌──────────────────────────────────────────────────────────────────────┐
│  5. SECURITY ENVELOPE   RBAC · MFA · audit log · network segmentation  │
├──────────────────────────────────────────────────────────────────────┤
│  4. APPLICATION         React + MapLibre dashboard · FastAPI services  │  ◀── MVP
│  3. AI LAYER            LLM event-extraction & RAG · SAR CV (YOLO) ·    │  ◀── MVP
│                         AIS anomaly/STS models · RUL survival models   │
│  2. DATA PLATFORM       PostgreSQL+PostGIS · TimescaleDB · Neo4j ·      │
│                         Qdrant · object store                          │
│  1. INGESTION           GDELT · treaties · AIS · Sentinel-1 · GFW · IoT │  ◀── MVP
└──────────────────────────────────────────────────────────────────────┘
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for data flows, data sources and the ML approach.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React · MapLibre GL · Vite |
| **Backend** | Python 3.11 · FastAPI · Pydantic v2 |
| **AI / ML** | Open-weight & foundation LLMs (event extraction + RAG Do/Avoid briefs) · YOLO-family SAR vessel detection (xView3-trained) · sequence + rule models for AIS/STS · gradient-boosting + Weibull survival for RUL |
| **Data** | PostgreSQL + PostGIS · GDELT · Sentinel-1 (Copernicus) · AIS · Global Fishing Watch · UN Comtrade |
| **Deploy (MVP)** | Static frontend on Vercel/Netlify · FastAPI backend on Render/Hugging Face Spaces |

---

## 🎬 The 7-Minute Demo

1. **DRISHTI (2 min)** — live ranked world-event feed → click a real event → auto **Do/Avoid brief with cited sources** → ask a question in Bangla, get a spoken answer.
2. **RAKKHOK (2 min)** — 25-asset demo fleet → readiness-% dashboard → an aircraft crosses its service-life threshold and **fires an alert** → the RUL ranking shows *what to service first*.
3. **SHOMUDRO (3 min — the wow moment)** — a real Sentinel-1 scene → vessel detections → AIS overlay → **unmatched dark contacts** light up the map → one shows a ship-to-ship rendezvous pattern → PRAHARI generates the **interdiction packet**.

---

## 🗺️ Build Roadmap (this repository)

We build **module by module**, each to deploy-ready demo quality:

- [ ] **Module 1 — DRISHTI** *(in progress)* : GDELT ingestion → relevance ranking (D1) · RAG Do/Avoid brief with citations (D4) · Bangla Q&A (C2).
- [ ] **Module 2 — RAKKHOK** : 25-asset registry · expiry alerts (R1–R2) · simple RUL model (R3).
- [ ] **Module 3 — SHOMUDRO** : Sentinel-1 detection · AIS overlay & dark matching (S1–S2) · STS rule detector (S3) · interdiction packet (S9).
- [ ] **Integration** : unified National Situation Dashboard (C1) · explainability layer (C3) · live deployment.

Priorities are locked as **P0** (48h MVP) → **P1** (pilot) → **P2** (national) → **P3** (full sentinel). See [`docs/`](docs/).

---

## 📦 Repository Structure

```
prohori/
├── README.md
├── LICENSE
├── docs/                      Project plan, team structure, architecture, model & data card
├── modules/
│   ├── drishti/              Module 1 — geopolitical intelligence
│   ├── rakkhok/              Module 2 — asset readiness
│   └── shomudro/             Module 3 — maritime awareness
├── backend/                   FastAPI application (API gateway + services)
└── frontend/                  React + MapLibre dashboard
```

---

## 🏆 SciBlitz AI Challenge 2026 — Compliance

| Requirement | Where |
|---|---|
| AI/ML is central & meaningful | Event extraction, RAG briefs, SAR CV, RUL — see [`docs/MODEL_AND_DATA_CARD.md`](docs/MODEL_AND_DATA_CARD.md) |
| Live public URL | *(added on deployment)* |
| Public GitHub repo w/ README | ✅ this repository |
| Commit history in competition window | ✅ developed May–July 2026 |
| Model & Data Card | [`docs/MODEL_AND_DATA_CARD.md`](docs/MODEL_AND_DATA_CARD.md) |
| Third-party attribution | [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md) |

---

<div align="center">

**PRAHARI** · Track E — National Defence · SciBlitz AI Challenge 2026 · IEEE Student Branch, CUET

*It never acts. It makes sure the people who do, act with the full picture.*

</div>

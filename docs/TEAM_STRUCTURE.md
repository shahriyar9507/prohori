# PRAHARI — Team Structure, Chain of Command & Locked Feature Set

Companion document to `PRAHARI_Project_Plan.pdf` (AI Hackathon 2026 blueprint).

---

## 1. Project Summary (from the blueprint)

PRAHARI ("The Sentinel") is a sovereign, AI-powered national strategic intelligence and defense readiness platform for Bangladesh. It answers one question daily: **"What is best for Bangladesh — and what must Bangladesh avoid?"** It is built as three integrated modules ("shields") on one shared data-and-AI core:

| Module | Meaning | Function | Primary Users |
|---|---|---|---|
| **DRISHTI** (Vision) | Geopolitical & diplomatic intelligence engine | Reads global events/treaties/trade deals and converts them into Bangladesh-specific Do/Avoid recommendations | MoFA, PMO, Commerce, AFD |
| **RAKKHOK** (Guardian) | Defense asset lifecycle & readiness monitor | Digital twin of every aircraft/vessel/vehicle/radar — expiry tracking, predictive maintenance (RUL), fleet readiness % | Army, Navy, Air Force logistics |
| **SHOMUDRO** (Sea) | Maritime domain awareness & dark-vessel detection | Fuses AIS + Sentinel-1 SAR imagery to detect ships that switch off transponders (smuggling, trafficking, IUU fishing, STS transfers) | Navy, Coast Guard, Fisheries |

**Key design principles:** Bangladesh-first analytics, human-in-the-loop, sovereign/air-gappable (locally hosted open-weight models), open-data-first (GDELT, UN treaties, Sentinel-1, AIS, Global Fishing Watch — all free at MVP), bilingual Bangla + English.

**Tech stack (from architecture section):** FastAPI microservices, Kafka event bus, PostgreSQL + PostGIS, TimescaleDB, Neo4j knowledge graph, Qdrant vector DB, locally hosted fine-tuned open-weight LLMs (Llama-class), YOLOv8/11 for SAR vessel detection, Transformer sequence models for AIS anomalies, survival models (Weibull/gradient boosting) for RUL, React + MapLibre dashboard, Bangla PDF/TTS output, zero-trust security (RBAC + MFA, audit log, air-gap deployable).

**Roadmap:** Phase 0 = 48h hackathon MVP → Phase 1 (months 1–6) Coast Guard pilot → Phase 2 (months 7–18) national deployment → Phase 3 (months 19–36) full sentinel with RF geolocation and regional data-sharing.

---

## 2. Chain of Command — Full Production Organization

```
LEVEL 0 — GOVERNANCE
└── Project Sponsor / Steering Committee (Govt. stakeholders: PMO, MoFA, AFD, Navy, Coast Guard)
    └── Advisory Board (domain experts, ethics/legal oversight)

LEVEL 1 — PROJECT LEADERSHIP
└── Project Director (overall delivery authority)
    ├── Product Manager (roadmap, feature priorities, stakeholder demos)
    ├── Program/Scrum Master (sprints, coordination, risk register)
    └── Chief Solution Architect / CTO-equivalent (all technical decisions)

LEVEL 2 — TECHNICAL LEADS (report to Chief Architect)
    ├── AI/ML Lead
    ├── Data Engineering Lead
    ├── Backend/Platform Lead
    ├── Frontend/UX Lead
    ├── DevOps & Security Lead
    ├── QA Lead
    └── 3 × Module Owners (DRISHTI, RAKKHOK, SHOMUDRO — one senior engineer each,
        cross-cutting responsibility for their shield end-to-end)

LEVEL 3 — ENGINEERING TEAMS (details below)

LEVEL 4 — DOMAIN & SUPPORT (report to Product Manager)
    ├── Geopolitical/IR Analyst (DRISHTI SME)
    ├── Defense Maintenance Officer, retd. (RAKKHOK SME)
    ├── Naval/Maritime Operations Officer (SHOMUDRO SME)
    ├── Legal & Ethics Advisor (UNCLOS, evidence admissibility, privacy)
    ├── Bangla Linguist / Localization Specialist
    └── Technical Writer / Documentation
```

### Level 3 — Full engineering roster (production phase, ~28–35 people)

**A. AI/ML Team (under AI/ML Lead) — 7–9 people**
| Role | Count | Responsibilities | Key skills |
|---|---|---|---|
| NLP / LLM Engineer | 2 | Event extraction from GDELT/news, RAG Do/Avoid briefs, knowledge-graph reasoning, fine-tuning open-weight models | Python, HuggingFace, LoRA fine-tuning, RAG, structured-output decoding |
| Bangla NLP Engineer | 1 | Bangla report generation, TTS voice briefings, bilingual UX | Bangla LLM fine-tuning, TTS |
| Computer Vision Engineer (SAR) | 2 | Sentinel-1 vessel detection, xView3 training, SAR↔AIS dark matching | YOLOv8/11, SAR preprocessing (SNAP/sentinelsat), remote sensing |
| ML Engineer (time-series) | 1–2 | AIS anomaly/STS Transformer models, RUL survival analysis (Weibull, gradient boosting, LSTM), C-MAPSS pre-training | Sequence models, survival analysis, anomaly detection |
| MLOps Engineer | 1 | Model registry, retraining pipelines, eval harnesses (F1/nDCG targets from §9), on-prem GPU serving | MLflow/KServe, GPU infra, vLLM |

**B. Data Engineering Team (under Data Lead) — 4–5 people**
| Role | Count | Responsibilities |
|---|---|---|
| Data Engineer (streaming) | 2 | GDELT 15-min stream, AIS live feed (aisstream.io/Spire), Kafka pipelines |
| Data Engineer (batch/geo) | 1 | Sentinel-1 Copernicus download/orchestration, Global Fishing Watch, UN Comtrade, treaty scrapers |
| Database Engineer | 1 | PostgreSQL+PostGIS, TimescaleDB, Neo4j knowledge graph, Qdrant vector DB — schema, tuning, sync |
| OCR/Document Pipeline Engineer | 1 | Logbook digitization for RAKKHOK, treaty/PDF ingestion for DRISHTI |

**C. Backend/Platform Team (under Backend Lead) — 4–5 people**
| Role | Count | Responsibilities |
|---|---|---|
| Senior Backend Engineer (Python) | 2–3 | FastAPI microservices, Kafka event bus, alerting engine (SMS/push), report generator (Bangla PDF) |
| Geospatial Engineer | 1 | EEZ geometry, track interpolation, drift prediction, intercept-vector computation, patrol-route optimization |
| Integration/API Engineer | 1 | Inter-agency API bus (C7), auth (RBAC+MFA), audit log (C4) |

**D. Frontend/UX Team (under Frontend Lead) — 4 people**
| Role | Count | Responsibilities |
|---|---|---|
| Frontend Engineer (React + MapLibre) | 2 | National Situation Dashboard, live maritime map, fleet health screens |
| Mobile Developer | 1 | Secure companion app, voice briefings (Phase 2) |
| UI/UX Designer | 1 | Role-based views (PMO/MoFA/Navy/CG/analyst), bilingual design system |

**E. DevOps & Security Team (under DevOps/Sec Lead) — 3–4 people**
| Role | Count | Responsibilities |
|---|---|---|
| DevOps Engineer | 2 | Kubernetes/containerized stack, CI/CD, sovereign data-centre + air-gapped deployment (C5), GPU cluster |
| Cybersecurity Engineer | 1 | Zero-trust, network segmentation by classification, pen-testing, encryption |
| SRE (Phase 2+) | 1 | Uptime, monitoring, batch-sync for air-gapped sites |

**F. QA Team (under QA Lead) — 3 people**
| Role | Count | Responsibilities |
|---|---|---|
| QA / Test Automation Engineer | 2 | API/UI test suites, load testing |
| ML Evaluation Engineer | 1 | Model eval per §9 targets (≥85% F1 event extraction, xView3 detection F1, RUL RMSE, citation validity), red-team reviews |

### Hackathon team (Phase 0 — 48 hours, 5–6 people)

| # | Role | Owns | Hackathon deliverable |
|---|---|---|---|
| 1 | Team Lead / Full-stack Architect | Integration, demo flow | Unified dashboard shell, glue APIs, 7-min demo storyline |
| 2 | NLP/LLM Engineer | DRISHTI | GDELT ingestion + relevance ranking + RAG Do/Avoid brief + Bangla Q&A |
| 3 | CV/ML Engineer | SHOMUDRO | Pre-trained xView3 detector on one Sentinel-1 AOI, AIS overlay, dark matching, STS rule detector |
| 4 | Backend/Data Engineer | RAKKHOK + pipelines | Asset registry (25 synthetic assets), expiry alerts, simple RUL model, Kafka/DB setup |
| 5 | Frontend Engineer | UI | React + MapLibre map dashboard, fleet health screen, event feed |
| 6 | Pitch/Domain Lead (can double as designer) | Story & polish | Pitch deck, Bangla output review, demo rehearsal |

---

## 3. Locked Feature Set (all modules — final)

Priorities: **P0** = Hackathon MVP (48h) · **P1** = Pilot (months 1–6) · **P2** = National deployment (7–18) · **P3** = Full sentinel (19–36)

### DRISHTI — 10 features (locked)
| ID | Feature | Priority | Owner team |
|---|---|---|---|
| D1 | Global Event Radar (Bangladesh Relevance Score 0–100) | **P0** | NLP + Data |
| D2 | Bilateral Relationship Tracker | P1 | NLP + Graph |
| D3 | Treaty & Deal Analyzer | P1 | NLP + OCR |
| D4 | Do / Avoid Advisor (RAG brief with citations) | **P0** | NLP/LLM |
| D5 | Scenario Simulator (war-gaming) | P3 | ML + Backend |
| D6 | Early-Warning Alerts | P1 | Backend + NLP |
| D7 | Negotiation Copilot | P2 | NLP/LLM |
| D8 | Daily National Brief (Bangla+English, text+audio) | P1 (Bangla text output P0) | Bangla NLP |
| D9 | Institutional Memory archive | P2 | Data + Graph |
| D10 | Disinformation Watch | P2 | NLP |

### RAKKHOK — 9 features (locked)
| ID | Feature | Priority | Owner team |
|---|---|---|---|
| R1 | Fleet Health Dashboard | **P0** | Frontend + Backend |
| R2 | Service-Life & Expiry Tracker (180/90/30-day alerts) | **P0** | Backend |
| R3 | Predictive Maintenance / RUL ranking | **P0** (simple model) → P1 (full) | ML time-series |
| R4 | Spare-Parts Intelligence | P1 | ML + Backend |
| R5 | Maintenance Scheduler (availability optimizer) | P2 | ML + Backend |
| R6 | Mission Readiness Simulator | P2 | ML + Geo |
| R7 | Lifecycle Cost Analytics | P2 | Data + Backend |
| R8 | Incident & Defect Registry (photo/voice, Bangla) | P1 | Backend + Bangla NLP |
| R9 | Procurement Advisor (links to DRISHTI) | P3 | NLP + Graph |

### SHOMUDRO — 10 features (locked)
| ID | Feature | Priority | Owner team |
|---|---|---|---|
| S1 | Live Maritime Picture (EEZ map) | **P0** | Frontend + Geo |
| S2 | Dark Vessel Detector (SAR↔AIS correlation) | **P0** | CV + Geo |
| S3 | STS Rendezvous Alert (rule detector: <200 m, speed≈0, >30 min) | **P0** (rules) → P1 (sequence model) | ML time-series |
| S4 | AIS Spoofing & Identity Check | P1 | ML |
| S5 | IUU Fishing Monitor (65-day ban, EEZ intrusion) | P1 | ML + GFW data |
| S6 | Trafficking Corridor Watch | P1 | ML + Geo |
| S7 | Patrol Optimizer | P2 | Geo/OR |
| S8 | Port & Anchorage Watch (Chattogram/Mongla/Payra) | P2 | Data + Backend |
| S9 | Evidence Package Generator (chain-of-custody hashes) | **P0** (basic interdiction packet) → P1 (court-ready) | Backend + Legal |
| S10 | Environmental Sentinel (oil spill, cyclone SAR support) | P2 | CV |

### Cross-cutting — 7 features (locked)
| ID | Feature | Priority |
|---|---|---|
| C1 | National Situation Dashboard (role-based) | **P0** (single view) → P2 (full RBAC roles) |
| C2 | Ask-PRAHARI natural-language interface (Bangla+English) | **P0** (basic Bangla Q&A) → P1 |
| C3 | Explainable AI layer (evidence chain + confidence) | **P0** — non-negotiable from day 1 |
| C4 | Audit & accountability log | P1 |
| C5 | Offline / air-gapped mode | P2 |
| C6 | Voice briefings & mobile app | P2 |
| C7 | API & inter-agency bus | P2 |

**P0 total = the exact MVP scope in §11 of the blueprint:** GDELT ingestion + relevance ranking (D1), RAG Do/Avoid brief (D4), asset registry + expiry alerts + simple RUL (R1–R3), Sentinel-1 detection on one AOI + AIS dark matching (S1–S2), STS rule detector (S3), interdiction packet (S9 basic), unified map dashboard (C1), Bangla output (C2/C3).

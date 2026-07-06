# PRAHARI — System Architecture

> How raw open data becomes a decision with evidence attached.

## 1. Five-layer architecture

| Layer | Role | Components |
|---|---|---|
| **1. Ingestion** | Connectors & schedulers | GDELT stream (15-min), news/RSS, treaty-DB scrapers, UN Comtrade, AIS feed, Sentinel-1 via Copernicus Data Space, Global Fishing Watch, logbook OCR, IoT (MQTT) |
| **2. Data platform** | Lake + warehouse + graph | Object store (raw imagery/text) · PostgreSQL + PostGIS (geospatial) · TimescaleDB (AIS/sensor time-series) · Neo4j (geopolitical knowledge graph) · Qdrant (vector search) |
| **3. AI layer** | Models & pipelines | Open-weight/foundation LLMs (event extraction + RAG) · YOLO-family SAR CV · sequence + rule models on AIS · survival models for RUL |
| **4. Application** | Services & UX | FastAPI microservices · React + MapLibre dashboard · alerting · Bangla PDF/TTS report engine |
| **5. Security** | Zero-trust envelope | RBAC + MFA · E2E encryption · network segmentation per classification · immutable audit log · air-gap deployable |

**MVP note:** the hackathon build collapses layers 1–4 into a single deployable FastAPI + React app with a Postgres/PostGIS store and cached demo data, so it runs on a free public URL and stays live for judging. The full microservice + air-gap topology above is the production roadmap.

## 2. Module data flows

- **DRISHTI:** world text → LLM event extraction (structured JSON: actors, action, sector, magnitude, location, date) → knowledge graph (nations, ministries, ports, treaties, deals; edges: ally/creditor/rival/supplier) → Bangladesh-relevance scoring → Do/Avoid brief (situation · why it matters · DO · AVOID · hedges · decision window · confidence · citations).
- **RAKKHOK:** logbooks (OCR) / sensor exports → digital-twin record → RUL + readiness models → 180/90/30-day alerts + maintenance schedule → unit/base/force readiness roll-up.
- **SHOMUDRO:** AIS stream + Sentinel-1 scene → CV vessel detection → track interpolation to pass time → SAR↔AIS association (Hungarian matching with gating) → dark/anomaly risk scoring → interdiction packet (last fix, drift prediction, intercept vector, evidence log).

## 3. Data sources (all MVP sources are free)

| Source | Provides | Cost | Feeds |
|---|---|---|---|
| GDELT Project | Global events, 100+ languages, 15-min updates | Free | DRISHTI event radar |
| UN Treaty Collection / WTO | Treaties, trade agreements, legal texts | Free | Treaty analyzer |
| UN Comtrade / World Bank / IMF | Trade, debt, macro exposure | Free | Relevance & impact scoring |
| Sentinel-1 (Copernicus Data Space) | Bay of Bengal SAR, all-weather | Free | Dark-vessel detection |
| xView3-SAR dataset | Labelled SAR scenes for dark-vessel ML | Free | CV model training |
| AIS (aisstream.io → Spire) | Live ship positions | Free tier → paid | Maritime picture, anomalies |
| Global Fishing Watch API | Fishing activity, encounters, AIS gaps | Free | IUU, STS validation |
| Open-Meteo / BMD | Wind, current, cyclone | Free | Drift prediction |

## 4. ML approach & evaluation targets

| Task | Approach | Target |
|---|---|---|
| Event extraction | LLM w/ JSON-schema structured decoding; CAMEO codes as weak supervision | ≥ 85% F1 vs hand-labelled set |
| Bangladesh Relevance Score | Graph proximity + LLM judgement + trade/exposure stats | nDCG vs expert ranking |
| Do/Avoid brief | RAG over graph + precedents; mandatory citations; refuse on low evidence | Expert panel + citation validity |
| SAR vessel detection | YOLOv8/11 on SSDD + LS-SSDD + xView3 | xView3 F1 incl. close-to-shore |
| Dark matching (SAR↔AIS) | Spatio-temporal association, Hungarian matching with gating | Match accuracy vs ground truth |
| AIS anomaly / STS | Sequence model + rule layer (STS: <200 m, speed≈0, >30 min) | Precision on GFW encounters |
| RUL | Gradient boosting + Weibull survival; LSTM where IoT exists | RUL RMSE + alert lead-time |

## 5. Engineering conventions

- **Frontend is React** + MapLibre GL. Python 3.11+, FastAPI, Pydantic v2; type hints + docstrings mandatory.
- Every AI-output API response carries `score/verdict`, `confidence`, `evidence[]`, `generated_at`, `model_version`. **No bare numbers.**
- Config via environment variables; **secrets never committed**; services containerized.
- Geometries in PostGIS (EPSG:4326); EEZ boundary as a versioned reference layer.
- Bilingual (English + Bangla) behind an i18n layer from day one.
- Audit: every recommendation read and alert acknowledgment emits an append-only, hash-chained audit event.

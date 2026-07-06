# PRAHARI — System Architecture, Data Sources & ML Approach

Read before writing any pipeline, schema, service, or model code.

## 1. Five-layer architecture

| Layer | Role | Components |
|---|---|---|
| 1. Ingestion | Connectors & schedulers | GDELT stream (15-min), RSS/news APIs, treaty-DB scrapers, UN Comtrade, AIS feed (aisstream.io free tier → Spire/exactEarth at scale), Sentinel-1 via Copernicus Data Space, Global Fishing Watch API, logbook OCR uploads, IoT gateways (MQTT) |
| 2. Data platform | Lake + warehouse + graph | Object store (raw imagery/text) → PostgreSQL + PostGIS (geospatial) · TimescaleDB (AIS/sensor time-series) · Neo4j (geopolitical knowledge graph) · Qdrant (vector/semantic search) |
| 3. AI layer | Models & pipelines | Locally hosted fine-tuned open-weight LLMs (Llama-class) · YOLO-family CV pipeline for SAR · Transformer sequence models on AIS tracks · survival models for RUL · simulation engine |
| 4. Application | Services & UX | FastAPI microservices · Kafka event bus · React + MapLibre dashboard · mobile app (P2) · alerting (SMS/secure push) · Bangla PDF report engine |
| 5. Security | Zero-trust envelope | RBAC + MFA · end-to-end encryption · network segmentation per classification level · immutable audit logging · air-gap deployable |

## 2. Module data flows

- **DRISHTI:** world text → LLM event extraction (structured JSON: actors, action type, sector, magnitude, location, date; any language → one schema) → knowledge graph (nations, leaders, ministries, companies, ports, treaties, deals, disputes; edges: ally/creditor/rival/supplier/guarantor) → Bangladesh-relevance scoring → Do/Avoid recommendation brief (situation, why it matters, DO, AVOID, hedges, decision-window timeline, confidence, citations).
- **RAKKHOK:** logbooks (OCR) / MMS exports / IoT sensors → digital-twin record update (type, manufacturer, induction date, design life, usage counters, overhaul history, status) → RUL + readiness models → alerts + maintenance schedule → unit/base/force readiness roll-up.
- **SHOMUDRO:** AIS stream + Sentinel-1 scene → CV vessel detection → track interpolation to pass time → SAR↔AIS association (Hungarian matching with gating) → dark/anomaly risk scoring (location vs trafficking corridors, night, behaviour, history) → interdiction packet (last fix, drift prediction from current+wind, intercept vector, evidence log).

## 3. Data sources (all MVP sources are free)

| Source | Provides | Cost | Feeds |
|---|---|---|---|
| GDELT Project | Global events, 100+ languages, 15-min updates | Free | D1 event radar |
| UN Treaty Collection / WTO / gazettes | Treaties, trade agreements, legal texts | Free | D3 analyzer |
| UN Comtrade, World Bank, IMF | Trade, debt, macro exposure | Free | Relevance & impact scoring |
| Sentinel-1 (Copernicus Data Space) | Bay of Bengal SAR, ~6–12-day revisit, all-weather | Free | S2 dark-vessel detection |
| xView3-SAR dataset | 1,000+ labelled SAR scenes purpose-built for dark-vessel ML | Free | CV model training |
| AIS (aisstream.io → Spire/exactEarth) | Live global ship positions | Free tier → paid | S1 picture, anomaly detection |
| Global Fishing Watch API | Fishing activity, encounters (STS), loitering, AIS gaps | Free | S5 IUU, S3 validation |
| Open-Meteo / BMD | Wind, current, cyclone | Free | Drift prediction, patrol planning |
| Government feeds (later) | Logbooks, MMS exports, coastal radar, classified | Internal | RAKKHOK + fusion upgrade |

Scale-up (P2/P3 only, never MVP): daily SAR tasking (ICEYE/Umbra), RF geolocation (HawkEye 360-class).

## 4. ML approach & evaluation targets (contractual)

| Task | Approach | Evaluation target |
|---|---|---|
| Event extraction | Fine-tuned multilingual LLM, JSON-schema structured decoding; GDELT/CAMEO codes as weak supervision | ≥ 85% F1 vs hand-labelled set |
| Bangladesh Relevance Score | Graph proximity + LLM judgement + trade/exposure statistics | nDCG ranking agreement with expert analysts |
| Do/Avoid recommendation | RAG over knowledge graph + precedent archive; chain-of-analysis prompting; self-consistency; mandatory citations; refuse on low evidence | Expert panel scoring; citation validity rate |
| Scenario simulation | Causal graphs + Monte-Carlo over historical analogues; sensitivity analysis shown to user | Backtest on 20 historical BD-relevant events |
| SAR vessel detection | YOLOv8/11 on SSDD + LS-SSDD + xView3, fine-tuned on Bay of Bengal scenes | xView3 detection F1, incl. close-to-shore F1 |
| Dark matching (SAR↔AIS) | Spatio-temporal association, track interpolation to pass time, Hungarian matching with gating | Match accuracy on known ground truth |
| AIS anomaly / STS | Sequence Transformer + rule layer (gaps; rendezvous: < 200 m, speed ≈ 0, > 30 min) | Alert precision on GFW labelled encounters |
| RUL | Gradient boosting + Weibull survival on usage counters; LSTM on IoT streams; NASA C-MAPSS pre-training | RUL RMSE + alert lead-time |
| Bangla NLP & briefing | Bangla-capable LLM fine-tune; TTS | Native-reviewer fluency |

## 5. Engineering conventions for this repo

- **Frontend framework is React — confirmed team decision (2026-07-06).** All web UI is React + MapLibre GL for maps; do not propose Vue/Angular/Svelte or other map libraries. State/data fetching and component conventions follow the frontend persona in `experts.md`.
- Python 3.11+, FastAPI, Pydantic v2 models everywhere; type hints mandatory; docstrings on public functions.
- Every AI-output API response includes: `score/verdict`, `confidence`, `evidence[]` (source refs), `generated_at`, `model_version`. No bare numbers.
- Config via environment variables; secrets never committed; all services containerized (Docker) with a compose file that brings the full demo up with one command.
- Geospatial: store geometries in PostGIS (EPSG:4326), compute in appropriate projected CRS; EEZ boundary as a versioned reference layer.
- Kafka topic naming: `<module>.<entity>.<event>` (e.g., `shomudro.ais.position`, `rakkhok.asset.alert`, `drishti.event.extracted`).
- Bilingual: user-facing strings behind an i18n layer from day 1 (English + Bangla); Bangla is a first-class locale, not a translation pass at the end.
- Audit: every read of a recommendation and every alert acknowledgment emits an audit event (append-only, hash-chained) — even in the MVP, stub the interface.
- Tests: the 7-minute demo path gets an end-to-end smoke test; model code ships with an eval script wired to the targets in §4.

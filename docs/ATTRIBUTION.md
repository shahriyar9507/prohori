# Third-Party Attribution

PRAHARI is built on open data and open-source software. Everything actually used in this repository is credited below, as required by the SciBlitz AI Challenge 2026 rulebook (§10.2). This list is verified against `frontend/package.json`, `backend/requirements.txt`, `render.yaml`, and `frontend/vercel.json`.

## Data sources & live APIs

| Resource | Provider | Use in PRAHARI | License / terms |
|---|---|---|---|
| Google News RSS | Google | DRISHTI real-time headline feed (primary) | Free, keyless |
| World Bank Open Data API | The World Bank | Bangladesh macro context (remittances, GDP, reserves, trade) | Open data, free |
| Global Fishing Watch API | Global Fishing Watch | AIS vessel tracks for the SHOMUDRO maritime picture | CC BY-NC 4.0 / API terms |
| Copernicus Sentinel-1 (SAR) | ESA / Copernicus Data Space Ecosystem | All-weather radar scene of the Bay of Bengal (SHOMUDRO) | Copernicus open licence |
| Google Gemini API | Google | Real-time comparative Do/Avoid briefs & bilingual Q&A (deployed model `gemini-2.5-flash-lite`) | Google Gemini API terms |
| GDELT DOC 2.0 API | The GDELT Project | Optional secondary event path (off by default) | Open, free |
| Wikipedia / Wikimedia REST API | Wikimedia Foundation | RAKKHOK equipment-class photos (fetched by platform class) | Content CC BY-SA / public domain — attribution per image; see wikimedia.org licensing |
| DuckDuckGo icon service | DuckDuckGo | DRISHTI news-publisher logos (favicon by source domain) | Per DuckDuckGo terms; initials fallback used otherwise |

## Frontend software

| Library | Provider | License |
|---|---|---|
| React | Meta | MIT |
| Vite | Evan You / Vite team | MIT |
| Recharts | Recharts contributors | MIT |
| react-simple-maps | z creative labs / contributors | MIT |
| world-atlas (Natural Earth TopoJSON) | Mike Bostock / Natural Earth | Public domain (Natural Earth); code MIT |
| Mapbox GL JS | Mapbox | Mapbox Web SDK terms (BSD-style for older 1.x; 3.x under Mapbox TOS) |
| Google Maps JavaScript API | Google | Google Maps Platform terms |
| lucide-react (Feather-derived icons) | Lucide contributors (fork of Feather Icons) | ISC (Lucide) / MIT (Feather) |
| prop-types | Meta | MIT |

## Backend software & models

| Library / model | Provider | License |
|---|---|---|
| FastAPI | Sebastián Ramírez | MIT |
| Uvicorn | Encode | BSD-3-Clause |
| Pydantic / pydantic-settings | Pydantic Services | MIT |
| httpx | Encode | BSD-3-Clause |
| python-dotenv | Saurabh Kumar | BSD-3-Clause |
| OpenAI Python client (`openai`) | OpenAI | Apache-2.0 |
| Google Gemini 2.5 Flash-Lite | Google | Accessed via the OpenAI-compatible endpoint; provider-agnostic (swappable for a local Ollama/vLLM open-weight model) |

## Development-only tooling (not shipped in the runtime API)

The offline data-fetch scripts under `backend/scripts/` use `numpy`, `scipy`, `tifffile`, and `websockets` (all from `requirements-dev.txt`); tests use `pytest` / `pytest-asyncio`. These are not runtime dependencies of the deployed backend.

## Roadmap-only references (documented, not used in this build)

For transparency about the production trajectory (see `ARCHITECTURE.md` §7): Ultralytics YOLO (AGPL-3.0) for SAR vessel detection trained on **xView3-SAR** (DIU / xView, research-open); aisstream.io / Spire for live AIS; UN Comtrade for trade-exposure scoring; and gradient-boosting / survival libraries (scikit-learn BSD-3, lifelines MIT) for richer RUL. **None of these are present in the MVP.**

*The MVP maps (SHOMUDRO) use Mapbox GL JS and the Google Maps JS API, and the DRISHTI world map uses react-simple-maps — MapLibre GL is not used.*

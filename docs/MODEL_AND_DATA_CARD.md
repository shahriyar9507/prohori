# PRAHARI — Model & Data Card

*SciBlitz AI Challenge 2026 · Track E — National Defence. This card is maintained as the project is built and will be exported to the required single-page PDF at submission.*

## AI/ML components — what is actually deployed in the MVP

| Module | AI component | Approach (as built) | Model(s) / provider | License |
|---|---|---|---|---|
| DRISHTI | Event extraction | **Transparent keyword engine** — tags each headline with actors, policy sectors and a cooperation/conflict intensity signal. Fully auditable; no model. | Custom (rules) | AGPL-3.0 (this project) |
| DRISHTI | Do/Avoid brief | **Real-time comparative analysis**: the target event is grounded against a digest of today's live headlines over per-sector DO/AVOID/HEDGE playbooks. Mandatory citations; refuses below a confidence floor; deterministic grounded fallback when no LLM is configured. | **Google Gemini 2.5 Flash-Lite** via an OpenAI-compatible adapter — **pluggable / air-gappable** (swap the base URL for a local Ollama/vLLM open-weight model) | Google Gemini API terms; adapter is provider-agnostic |
| DRISHTI | Bangladesh Relevance Score | **4-component weighted heuristic** — actor (0.40) + sector (0.30) + geography (0.15) + magnitude (0.15); each component returns its own reasoning. No graph, no LLM. | Custom (transparent) | AGPL-3.0 (this project) |
| DRISHTI | Ask-PRAHARI | Bilingual (Bangla/English) keyword-grounded Q&A over the current feed; same LLM adapter, deterministic fallback. | Gemini / local model (pluggable) | as above |
| RAKKHOK | Remaining-Useful-Life | **Weibull survival analysis**, `S(x)=exp(−(x/scale)^k)`, wear-out shape **k = 2.5**, on each asset's driving usage counter → RUL days + 90-day conditional failure probability. Pure-Python, no heavy deps. | Custom (transparent) | AGPL-3.0 (this project) |
| SHOMUDRO | Dark-vessel detection | **Gated greedy SAR⋈AIS association** (≤250 m distance gate, ±30% length gate; a transparent stand-in for Hungarian matching); a SAR contact with no valid AIS partner = **dark**. Risk scoring by corridor / night / small-craft size. | Custom (transparent) | AGPL-3.0 (this project) |
| SHOMUDRO | STS rendezvous | Rule engine: two vessels <200 m, ≈0 kn, >30 min, incl. one-party-dark. | Custom (rules) | AGPL-3.0 (this project) |

> **On SAR:** the MVP runs on a **bundled Sentinel-1 scene** (real Copernicus imagery, pre-computed contacts) so the fusion, risk, STS and interdiction logic all run for real without a GPU during judging. A trained **YOLO-family SAR vessel detector** (xView3/SSDD) is the documented **production upgrade — not present in this MVP** (see roadmap in `ARCHITECTURE.md`).

## Datasets

| Dataset | Source | Use in MVP | License / terms |
|---|---|---|---|
| Google News RSS | news.google.com | Real-time Bangladesh-relevant headlines (DRISHTI primary feed) | Free, keyless |
| World Bank Open Data | data.worldbank.org | Bangladesh macro context (remittances, GDP, reserves, trade) | Open, free |
| Global Fishing Watch | globalfishingwatch.org | AIS vessel tracks for the maritime picture (SHOMUDRO) | CC BY-NC 4.0 / API terms |
| Sentinel-1 GRD (SAR) | Copernicus Data Space | All-weather radar scene of the Bay of Bengal (SHOMUDRO) | Copernicus open licence |
| Synthetic fleet (25 assets) | Generated for this project | RAKKHOK digital-twin demo | Original — fictional, no real inventory |
| GDELT Event Database | gdeltproject.org | Optional secondary event path (off by default) | Open, free |

> **Not used in the MVP, listed for roadmap transparency:** xView3-SAR (iuu.xview.us, research/open) for SAR model training; aisstream.io / Spire for live AIS streaming; UN Comtrade for trade-exposure scoring. These belong to the production upgrades, not the current build.

## Known limitations & ethical considerations

- **Human-in-the-loop by design.** PRAHARI never acts autonomously; every output is a *recommendation* for an authorized officer. No autonomous interdiction, diplomacy or maintenance action.
- **Explainability required.** Every score/alert/brief exposes its evidence chain, sources and confidence; the system refuses to generate on low evidence rather than hallucinate.
- **SAR limits.** Small wooden craft return weakly to SAR; close-to-shore detection is the hard case. Optical fusion is the documented Phase-3 answer — not overpromised.
- **LLM hallucination risk.** Mitigated by grounding every brief in extracted event facts + per-sector playbooks + today's live headline digest, mandatory citations, a strict `SITUATION:`/`ANALYSIS:` output contract, refusal below a confidence floor, a deterministic fallback, and analyst sign-off before any brief circulates.
- **Privacy proportionality.** Tracks *vessels and state-level actors, never private citizens*; disinformation analysis stays at narrative/cluster level.
- **Bias.** Relevance scoring is reviewed so the system does not systematically ignore or inflate any region or partner.
- **Demo data is fictional.** All asset hull/tail numbers and fleet figures are synthetic; no real force inventory is presented as fact.

*All third-party models, datasets and libraries are attributed in [`ATTRIBUTION.md`](ATTRIBUTION.md).*

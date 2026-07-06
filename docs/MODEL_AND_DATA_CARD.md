# PRAHARI — Model & Data Card

*SciBlitz AI Challenge 2026 · Track E — National Defence. This card is maintained as the project is built and will be exported to the required single-page PDF at submission.*

## AI/ML components

| Module | AI component | Approach | Model(s) / provider | License |
|---|---|---|---|---|
| DRISHTI | Event extraction | LLM with JSON-schema structured decoding over GDELT text | *(open-weight LLM / foundation API — recorded at build)* | *(recorded)* |
| DRISHTI | Do/Avoid brief | Retrieval-augmented generation with mandatory citations; refusal on low evidence | *(recorded)* | *(recorded)* |
| DRISHTI | Bangladesh Relevance Score | Graph proximity + LLM judgement + trade/exposure statistics | Heuristic + LLM | — |
| RAKKHOK | Remaining-Useful-Life | Gradient boosting + Weibull survival analysis on usage counters | scikit-learn / lifelines | BSD / MIT |
| SHOMUDRO | SAR vessel detection | YOLO-family detector | Ultralytics YOLO, trained on xView3/SSDD | AGPL-3.0 (Ultralytics) |
| SHOMUDRO | Dark matching & STS | Spatio-temporal SAR↔AIS association + rule layer (STS: <200 m, speed≈0, >30 min) | Custom | MIT |

## Datasets

| Dataset | Source | Use | License / terms |
|---|---|---|---|
| GDELT Event Database | gdeltproject.org | World-event ingestion & relevance ranking | Open, free |
| Sentinel-1 GRD | Copernicus Data Space | SAR vessel detection | Copernicus open licence |
| xView3-SAR | iuu.xview.us | SAR dark-vessel model training | Research/open |
| AIS positions | aisstream.io | Live maritime picture, anomaly detection | Free tier |
| Global Fishing Watch | globalfishingwatch.org | STS / IUU validation labels | CC BY-NC / API terms |
| UN Comtrade | comtradeplus.un.org | Trade-exposure scoring | Open |
| Synthetic fleet (25 assets) | Generated for this project | RAKKHOK demo | Original — fictional, no real inventory |

## Known limitations & ethical considerations

- **Human-in-the-loop by design.** PRAHARI never acts autonomously; every output is a *recommendation* for an authorized officer. No autonomous interdiction, diplomacy or maintenance action.
- **Explainability required.** Every score/alert/brief exposes its evidence chain, sources and confidence; the system refuses to generate on low evidence rather than hallucinate.
- **SAR limits.** Small wooden craft return weakly to SAR; close-to-shore detection is the hard case. Optical fusion is the documented Phase-3 answer — not overpromised.
- **LLM hallucination risk.** Mitigated by strict RAG, mandatory citations, refusal on low evidence, and mandatory analyst sign-off before any brief circulates.
- **Privacy proportionality.** Tracks *vessels and state-level actors, never private citizens*; disinformation analysis stays at narrative/cluster level.
- **Bias.** Relevance scoring is reviewed so the system does not systematically ignore or inflate any region or partner.
- **Demo data is fictional.** All asset hull/tail numbers and fleet figures are synthetic; no real force inventory is presented as fact.

*All third-party models, datasets and libraries are attributed in [`ATTRIBUTION.md`](ATTRIBUTION.md).*

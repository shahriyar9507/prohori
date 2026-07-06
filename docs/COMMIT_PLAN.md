# PRAHARI — Full Commit Plan

> Every planned commit for the whole project, in order. We build **module by module** (DRISHTI → RAKKHOK → SHOMUDRO → integration → deploy). Each commit is atomic, uses [Conventional Commits](https://www.conventionalcommits.org/), and maps to a locked feature ID (see `docs/` / the `prahari` skill). Checkboxes are ticked as each commit lands.

**Legend:** feature IDs — `D#` DRISHTI · `R#` RAKKHOK · `S#` SHOMUDRO · `C#` cross-cutting. Priority: **P0** = hackathon MVP.

---

## Phase 0 — Foundation
- [x] `chore: initialize PRAHARI repository with decorated foundation` — README, LICENSE (AGPL-3.0), .gitignore, docs (plan, team, architecture, model & data card, attribution), folder scaffold. **(done — a029438)**

## Phase 1 — Module 1: DRISHTI (Geopolitical Intelligence)
- [x] `feat(drishti): FastAPI backend scaffold with evidence-carrying schemas` — app entry, config (env-based), common response envelope (`score/verdict`, `confidence`, `evidence[]`, `generated_at`, `model_version`).
- [x] `feat(drishti): Bangladesh Relevance Score engine` — transparent, explainable 0–100 scoring (actor / sector / geography / magnitude components). **[D1, C3, P0]**
- [x] `feat(drishti): GDELT ingestion client with cached demo snapshot` — live GDELT + offline fallback so the demo never breaks. **[D1, P0]**
- [x] `feat(drishti): Global Event Radar API` — ranked, filterable event feed endpoints. **[D1, P0]**
- [x] `feat(drishti): Do/Avoid advisor with RAG + mandatory citations` — two-column national-interest brief; refuses on low evidence; pluggable/sovereign LLM with deterministic fallback. **[D4, C3, P0]**
- [x] `feat(drishti): Ask-PRAHARI bilingual Q&A (Bangla + English)` — NL query over the DRISHTI knowledge base. **[C2, P0]**
- [x] `test(drishti): relevance scoring + brief structure unit tests`
- [x] `feat(frontend): React + Vite + MapLibre scaffold with command-center theme` — dark navy theme, i18n (EN/BN) layer, severity color language. **[C1, C3]**
- [x] `feat(frontend): DRISHTI view — event radar, Do/Avoid brief, Ask-PRAHARI, evidence chain` — ranked feed, filters, relevance badges, two-column brief with citations, bilingual toggle. **[D1, D4, C2, C3]**
- [x] `docs(drishti): module README + API reference`

## Phase 2 — Module 2: RAKKHOK (Asset Readiness)
- [ ] `feat(rakkhok): 25-asset synthetic fleet registry + digital-twin schema` — mixed fleet, realistic induction years, usage counters. **[R1, P0]**
- [ ] `feat(rakkhok): service-life & expiry tracker with 180/90/30-day alerts` — multiple clocks (airframe / TBO / hull survey / consumable / certification); grounded-by-worst-clock. **[R2, P0]**
- [ ] `feat(rakkhok): Remaining-Useful-Life predictor` — gradient boosting + Weibull survival on usage counters; fleet ranked by failure risk. **[R3, P0]**
- [ ] `feat(rakkhok): fleet readiness roll-up API` — asset → unit → base → force mission-capable %. **[R1, P0]**
- [ ] `test(rakkhok): RUL eval (RMSE + lead-time) + expiry alert tests`
- [ ] `feat(frontend): fleet health dashboard with big-number readiness tiles` — drill-down to tail/hull number. **[R1]**
- [ ] `feat(frontend): RUL ranking + live service-life alert view` — the "service this one first" screen. **[R2, R3]**
- [ ] `docs(rakkhok): module README`

## Phase 3 — Module 3: SHOMUDRO (Maritime Awareness)
- [ ] `feat(shomudro): Sentinel-1 SAR vessel detection pipeline` — YOLO (xView3-trained) over a Bay of Bengal AOI; cached scene for the demo. **[S2, P0]**
- [ ] `feat(shomudro): AIS ingestion + track interpolation to pass time` — demo AIS feed + interpolation. **[S1, P0]**
- [ ] `feat(shomudro): SAR↔AIS dark-vessel matching` — Hungarian matching with gating; radar-visible + AIS-silent = dark. **[S2, P0]**
- [ ] `feat(shomudro): STS rendezvous rule detector` — distance <200 m, speed ≈0, >30 min; one-party-dark cases. **[S3, P0]**
- [ ] `feat(shomudro): interdiction packet generator` — last fix, drift prediction, intercept vector, evidence log, chain-of-custody hash. **[S9, P0]**
- [ ] `test(shomudro): matching accuracy + STS precision tests`
- [ ] `feat(frontend): live maritime picture (MapLibre EEZ map)` — AIS tracks, SAR detections, dark flags, weather overlay. **[S1]**
- [ ] `feat(frontend): dark-contact shortlist + interdiction packet view` — ranked daily list; one-click packet. **[S2, S9]**
- [ ] `docs(shomudro): module README`

## Phase 4 — Integration & cross-cutting
- [ ] `feat(core): unified National Situation Dashboard` — single command view over all three modules, role-based. **[C1, P0]**
- [ ] `feat(core): explainability layer surfaced across all AI outputs` — evidence-chain expander everywhere. **[C3, P0]**
- [ ] `feat(core): append-only, hash-chained audit log stub` — who saw what. **[C4]**
- [ ] `feat(deploy): Dockerfiles + docker-compose for one-command demo` — the whole stack up with one command.
- [ ] `ci: GitHub Actions — lint, test, build` — the demo path must never break.

## Phase 5 — Deployment & submission
- [ ] `chore(deploy): deploy backend + frontend to public URLs` — Render/HF Spaces + Vercel; live public URL.
- [ ] `docs: final README polish, 7-minute demo script, model & data card PDF export`
- [ ] `docs: add live URL + demo video link + submission checklist` — SciBlitz deliverables complete.

---

### Conventions
- **One logical change per commit**; every commit builds (no broken `main`).
- Commit body explains *why*, references the feature ID, and — for AI/model commits — notes the eval target.
- Never commit secrets, API keys, raw datasets, or model weights (enforced by `.gitignore`).
- Frontend and backend for the same feature may be separate commits so history reads clearly.

*This plan is the contract for the repository's story. It is updated if scope changes — but P0 items are never silently dropped.*

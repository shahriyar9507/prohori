# Team DatourX — Roles & Module Ownership

**Project:** PRAHARI (প্রহরী, *"The Sentinel"*) — National Strategic Intelligence & Defense Readiness for Bangladesh.
**Team / authority:** **DatourX**.
**Event:** SciBlitz AI Challenge 2026 · Track E — National Defence.

This is a short, honest map of who owns what. PRAHARI is deliberately built as **three domain modules riding one shared explainability core**, unified by a single National Situation page — so ownership follows that same shape.

---

## What we built (scope this team delivered)

- A single deployable **FastAPI** backend exposing all three modules, plus a **React + Vite** command-center frontend that runs live against the backend *or* fully offline from a baked JSON bundle.
- **DRISHTI** — real-time Google News → transparent relevance scoring → Gemini Do/Avoid briefs with citations.
- **RAKKHOK** — digital-twin asset readiness with service-life clocks and Weibull RUL.
- **SHOMUDRO** — SAR⋈AIS dark-vessel detection, STS rendezvous, and interdiction packets.
- **National Situation** posture page + an **explainability** layer (evidence chain + confidence) across every output.
- Bilingual Bangla/English throughout, a dark command-center UI, and free public deployments on Vercel + Render.

---

## Module ownership

| Area | Owns | Key deliverables |
|---|---|---|
| **Shared core & integration** | App shell, module tabs, theme + i18n (Bangla/English), Pydantic schemas, the LLM adapter, the National Situation page, and the static-demo bake | One cohesive product; the "no bare numbers" evidence/confidence contract; the demo that never goes down |
| **DRISHTI** (Geopolitical intelligence) | News ingestion, transparent keyword extraction, the 4-component Bangladesh Relevance Score, the Do/Avoid brief + Ask-PRAHARI, and the DRISHTI UI (world map, charts, news wall) | Ranked event radar, cited real-time briefs, bilingual Q&A |
| **RAKKHOK** (Asset readiness) | The synthetic fleet, service-life clocks, Weibull RUL, readiness roll-up, and the RAKKHOK UI (KPI cards, risk table, health report) | Fleet mission-capable %, service-first ranking, digital-twin health cards |
| **SHOMUDRO** (Maritime awareness) | SAR⋈AIS matching, STS detection, risk scoring, interdiction packets, and the dual-provider tactical map UI | Dark-vessel shortlist, STS alerts, chain-of-custody interdiction packets |

Because the modules share one backend and one design system, everyone also carries a slice of the shared core — the split above is about primary responsibility, not silos.

---

## Roles

| Role | Responsibility |
|---|---|
| **Lead / full-stack architect** | Product shape, integration, the National Situation page, deployment, and the demo storyline. |
| **DRISHTI engineer** | Geopolitical pipeline end-to-end: ingestion, relevance, briefs, Q&A, and the DRISHTI screens. |
| **RAKKHOK engineer** | Asset-readiness pipeline and UI: clocks, RUL, readiness math, and the digital-twin views. |
| **SHOMUDRO engineer** | Maritime pipeline and UI: SAR⋈AIS fusion, STS, interdiction, and the tactical map. |
| **Frontend / UX** | The dark bilingual design system, charts, maps, and animations across all modules. |
| **Domain & story** | Bangladesh-first framing, Bangla review, ethics/legal grounding (UNCLOS, human-in-the-loop), pitch and rehearsal. |

On a small team these hats are worn by overlapping people; the table describes the work, not a headcount.

---

## Design laws every role upholds

Bangladesh-first · human-in-the-loop (PRAHARI advises, officers decide) · explainability is non-negotiable (evidence + confidence on every output; refuse on thin evidence) · sovereign & air-gappable (pluggable LLM adapter) · open-data-first · bilingual by design · legal & proportionate (vessels and states, never private citizens).

---

*© 2026 DatourX — licensed under AGPL-3.0. See [`../LICENSE`](../LICENSE).*

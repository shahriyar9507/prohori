# PRAHARI — ~7-Minute Demo Script & Submission Checklist

## The live demo storyline (protect this order)

Order: **National Situation → DRISHTI → RAKKHOK → SHOMUDRO**. The deployed site is live — it loads an instant baked snapshot, then upgrades to real data (a **LIVE** badge and "updated N min ago" appear once it polls the backend). Point at that badge early — the news is genuinely current.

**Open (20s).** "Bangladesh has the data. It doesn't have the intelligence. PRAHARI — The Sentinel — turns raw open data into a decision, with the evidence attached. One platform, three modules." Toggle **EN → বাং** once to prove Bangla is first-class, and flick the **light/dark** switch — the dark command-center is the default.

### 0 · National Situation — the one-glance picture (30s)
1. Open the **National Situation** page from the header button. Show the **animated posture gauge** and the **three module status cards** (DRISHTI / RAKKHOK / SHOMUDRO).
2. Point at the **cross-module alert stream** — "one national picture, three domains, updating together." Click a status card to jump straight into that module.

### 1 · DRISHTI — Geopolitical intelligence (2 min)
1. Point at the command hero and the scrolling **live-signals ticker**, then the event feed: real **Google News** headlines ranked by **Bangladesh Relevance Score**, red/amber/green severity pills. Note the **LIVE** badge — "this refreshed minutes ago."
2. Show the **zoomable, clickable world map** (pulsing actor markers, arcs to Dhaka) — click a country to filter the feed. Glance at the animated **KPI cards** (sparkline + delta) and the Recharts panels (sector/severity donuts, sentiment split, top actors, signal-volume trend), the **early-warning board**, and the **news wall with real publisher logos**.
3. Open an event (e.g. the **Teesta water talks** or a port-investment item) → the **Do/Avoid brief**: a **real-time comparative** read — Gemini analyses the event against *today's* live headline context (what partners are doing now) — with situation, why-it-matters, the DO and AVOID columns **with citations**, hedges, a decision window, the World Bank economic-context line, and a relevance breakdown. "It shows instantly with a grounded fallback, then upgrades to the full Gemini brief in the background."
4. Expand the **evidence chain** — "every number shows its work; confidence and sources on every claim." Then in **Ask-PRAHARI**, ask a question in Bangla → grounded answer. "It refuses when evidence is thin — it never bluffs."

### 2 · RAKKHOK — Asset readiness (2 min)
1. Show the **fleet-readiness KPI cards** (sparklines), mission-capable %, and per-force readiness bars.
2. Scroll the **failure-risk table** — real equipment photos, status pills, risk bars. "A helicopter shows **grounded** — not by airframe hours, but by one expired life-raft certificate. That's the worst-clock rule: green on paper, un-flyable in reality."
3. Open an asset's **digital-twin health report**: ring gauges (mission-capable, Weibull RUL, 90-day failure risk), the **180/90/30-day** service-life countdown clocks, and **Do-now / Watch** recommendations with evidence. "This is what to service first."

### 3 · SHOMUDRO — Maritime awareness (2–3 min, the wow moment)
1. The **EEZ tactical map** (Mapbox GL — try 3D terrain, or switch to Google Maps): blue AIS tracks, grey SAR detections with the **SAR-scene overlay**, **red dark contacts**, one amber **STS** marker, the green Coast Guard patrol asset. Toggle a layer or two.
2. "Every red dot is visible to radar but silent on AIS — a **dark vessel**. They're ranked; the top one sits inside a known trafficking corridor, at night." Open a contact profile — radar chips, confidence bars, evidence reasons.
3. Click the **STS rendezvous**: two vessels ~137 m apart, one of them dark — a classic mid-sea transfer signature.
4. Generate the **interdiction packet**: last fix, drift prediction, intercept vector + ETA for the nearest patrol boat, and a **SHA-256 chain-of-custody hash** for court admissibility.
5. Close: "PRAHARI never acts. It makes sure the officers who do, act with the full picture — under UNCLOS, with an audit trail."

## Recording tips
- Record at 1080p, 3–5 min (rulebook: judges watch the video first). Host unlisted on YouTube or Drive with link sharing.
- Warm the live URL right before recording, and again on the morning you submit, so the Render backend is awake and the **LIVE** badge is showing.
- Keep the browser zoom ~90% so the map + panels fit.

## Submission checklist (SciBlitz AI Challenge 2026)

- [x] **Live public URL** — **https://prahari.vercel.app** (deployed to Vercel, static & self-contained, no login).
- [x] **Public GitHub repo** — `github.com/shahriyar9507/prohori` with README, tech stack, setup, commit history in-window.
- [ ] **Project report PDF (≤8 pp)** — export [`REPORT.md`](REPORT.md).
- [ ] **Demo video (3–5 min)** — record the storyline above; unlisted link.
- [ ] **Model & Data Card PDF (1 p)** — export [`MODEL_AND_DATA_CARD.md`](MODEL_AND_DATA_CARD.md).
- [x] **Track** — E (National Defence).
- [ ] Confirm the hosted app is awake on final-day evening (warm both the Vercel URL and the Render backend so the LIVE badge shows).

## Deploy (already done — for reference / redeploy)

**Live URL: https://prahari.vercel.app** (deployed via the Vercel CLI from `frontend/`).

- **Redeploy after changes:** `cd frontend && vercel deploy --prod --yes --scope <your-scope> --token <token>`
- **GitHub auto-deploy (optional):** on vercel.com import the `prohori` repo and set **Root Directory = `frontend`** (the repo is a monorepo — frontend + backend — so Vercel must target the frontend service). `frontend/vercel.json` handles the static build.
- **Netlify alternative:** New site from Git → base `frontend`, build `VITE_STATIC_DEMO=1 npm run build`, publish `frontend/dist`.
- **Optional dynamic backend:** deploy `backend/` (FastAPI) to Render/Hugging Face Spaces and set `VITE_API_BASE_URL` on the frontend for live-dynamic mode.

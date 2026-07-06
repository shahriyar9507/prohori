# PRAHARI — 7-Minute Demo Script & Submission Checklist

## The 7-minute live demo (protect this storyline)

**Open (15s).** "Bangladesh has the data. It doesn't have the intelligence. PRAHARI — The Sentinel — turns raw open data into a decision, with the evidence attached. One platform, three modules." Show the dashboard; toggle **EN → বাং** once to prove Bangla is first-class.

### 1 · DRISHTI — Geopolitical intelligence (2 min)
1. Point at the **Global Event Radar**: events ranked by **Bangladesh Relevance Score**, red/amber/green.
2. Click the **Teesta water talks** (or the port-investment) event → the **Do/Avoid brief** opens: situation, why-it-matters (first/second-order effects), the DO and AVOID columns **with citations**, hedges, and a decision window.
3. Expand the **evidence chain** — "every number shows its work; confidence and sources on every claim."
4. In **Ask-PRAHARI**, type a question in Bangla → grounded answer. "It refuses to answer when evidence is thin — it never bluffs."

### 2 · RAKKHOK — Asset readiness (2 min)
1. Show the **fleet readiness tiles**: mission-capable %, operational/maintenance/grounded, red/amber alerts, per-force bars.
2. "A helicopter shows **grounded** — not by airframe hours, but by one expired life-raft certificate. That's the worst-clock rule: green on paper, un-flyable in reality."
3. Show the **Service-First RUL ranking** — "this is what to service first," with 90-day failure-risk bars and the escalating 180/90/30-day alerts.

### 3 · SHOMUDRO — Maritime awareness (3 min, the wow moment)
1. The **EEZ map**: blue AIS tracks, grey SAR detections, **red dark contacts**, one amber **STS** marker, the green Coast Guard patrol asset.
2. "Every red dot is visible to radar but silent on AIS — a **dark vessel**. They're ranked; the top one sits inside a known trafficking corridor, at night."
3. Click the **STS rendezvous**: two vessels 137 m apart, one of them dark — a classic mid-sea transfer signature.
4. Click it → **interdiction packet**: last fix, drift prediction, intercept vector + ETA for the nearest patrol boat, and a **SHA-256 chain-of-custody hash** for court admissibility.
5. Close: "PRAHARI never acts. It makes sure the officers who do, act with the full picture — under UNCLOS, with an audit trail."

## Recording tips
- Record at 1080p, 3–5 min (rulebook: judges watch the video first). Host unlisted on YouTube or Drive with link sharing.
- Warm the live URL right before recording and again the morning of July 9.
- Keep the browser zoom ~90% so the map + panels fit.

## Submission checklist (SciBlitz AI Challenge 2026)

- [ ] **Live public URL** — deploy the frontend (static, self-contained) to Vercel/Netlify; paste in the form.
- [x] **Public GitHub repo** — `github.com/shahriyar9507/prohori` with README, tech stack, setup, commit history in-window.
- [ ] **Project report PDF (≤8 pp)** — export [`REPORT.md`](REPORT.md).
- [ ] **Demo video (3–5 min)** — record the storyline above; unlisted link.
- [ ] **Model & Data Card PDF (1 p)** — export [`MODEL_AND_DATA_CARD.md`](MODEL_AND_DATA_CARD.md).
- [x] **Track** — E (National Defence).
- [ ] Confirm the hosted app is awake the evening of July 16 (Final Day prep).

## Deploy the live URL (one of these)

**Easiest — Vercel from GitHub (no CLI):**
1. Go to **vercel.com → Add New → Project → Import** the `prohori` repo.
2. Vercel reads `vercel.json` automatically (build = static demo mode). Click **Deploy**.
3. Copy the `*.vercel.app` URL → that's your live public URL. It's fully static, so it never sleeps.

**Alternative — Netlify:** New site from Git → pick `prohori` → build `cd frontend && VITE_STATIC_DEMO=1 npm run build`, publish `frontend/dist`.

**Optional dynamic backend:** deploy `backend/` (FastAPI) to Render/Hugging Face Spaces and set `VITE_API_BASE_URL` on the frontend to make it live-dynamic instead of static.

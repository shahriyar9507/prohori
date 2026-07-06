# PRAHARI — Locked Feature Set & Priorities

Priorities: **P0** = 48-hour hackathon MVP · **P1** = Pilot (months 1–6) · **P2** = National deployment (months 7–18) · **P3** = Full sentinel (months 19–36).
Rules: never pull P2/P3 into MVP scope; never drop a P0 without flagging; every feature ships with its evidence-chain/explainability surface (C3 applies globally).

## DRISHTI — Geopolitical & Diplomatic Intelligence (D1–D10)

| ID | Feature | What it does | Priority |
|---|---|---|---|
| D1 | Global Event Radar | Real-time world-event feed auto-ranked by Bangladesh Relevance Score (0–100); filter by region/sector/severity | **P0** |
| D2 | Bilateral Relationship Tracker | Live health index per bilateral relationship + key third-party pairs; trend, drivers, disputes, pending agreements | P1 |
| D3 | Treaty & Deal Analyzer | Upload/auto-fetch treaty text → obligations, exit clauses, penalties, asymmetries; compares vs similar deals; flags unfavourable clauses | P1 |
| D4 | Do / Avoid Advisor | Two-column national-interest brief: recommended actions vs actions to avoid, with reasoning, precedents, confidence | **P0** |
| D5 | Scenario Simulator (war-gaming) | What-if engine over economic/security/diplomatic dimensions; historical analogues + causal models | P3 |
| D6 | Early-Warning Alerts | Threshold push alerts: border escalation, commodity shocks, garment-buyer policy shifts, partner sanctions exposure | P1 |
| D7 | Negotiation Copilot | Pre-meeting dossier per counterpart: interests, red lines, positions, pressures, leverage points | P2 |
| D8 | Daily National Brief | Auto morning brief (Bangla + English, text + audio) per role: PMO, MoFA, AFD, Commerce | P1 (Bangla text P0) |
| D9 | Institutional Memory | Searchable archive linking past decisions to outcomes; feeds future recommendations | P2 |
| D10 | Disinformation Watch | Detects coordinated narrative campaigns against Bangladesh; traces origin clusters (narrative level only) | P2 |

## RAKKHOK — Defense Asset Lifecycle & Readiness (R1–R9)

| ID | Feature | What it does | Priority |
|---|---|---|---|
| R1 | Fleet Health Dashboard | Per force: totals, operational/maintenance/grounded, readiness %, trends, drill-down to tail/hull number | **P0** |
| R2 | Service-Life & Expiry Tracker | Countdowns: airframe life, engine TBO, hull surveys, consumable expiry, certifications; 180/90/30-day escalating alerts | **P0** |
| R3 | Predictive Maintenance (RUL) | ML remaining-useful-life per critical component; fleet ranked by failure risk | **P0** simple → P1 full |
| R4 | Spare-Parts Intelligence | Inventory vs predicted demand; "runs out before next procurement cycle" flags; explicit cannibalisation trade-offs | P1 |
| R5 | Maintenance Scheduler | Auto-drafts calendars maximizing fleet availability (never too many platforms in the shop at once) | P2 |
| R6 | Mission Readiness Simulator | "Surge 6 patrol vessels for 21 days — what breaks and when?" | P2 |
| R7 | Lifecycle Cost Analytics | Total cost of ownership; flags upkeep-exceeds-replacement assets | P2 |
| R8 | Incident & Defect Registry | Photo/voice defect reporting (Bangla); AI clusters recurring defects fleet-wide | P1 |
| R9 | Procurement Advisor | Cross-references DRISHTI supplier-country risk: sanctions, spare-part dependency, vendor-nation reliability | P3 |

## SHOMUDRO — Maritime Domain Awareness (S1–S10)

| ID | Feature | What it does | Priority |
|---|---|---|---|
| S1 | Live Maritime Picture | Unified EEZ map: AIS tracks, SAR detections, dark flags, patrol positions, weather overlay | **P0** |
| S2 | Dark Vessel Detector | SAR↔AIS correlation; ranked daily list of unmatched vessels with position, size, heading, risk score | **P0** |
| S3 | STS Rendezvous Alert | Two-vessel mid-sea meeting detection (distance < 200 m, speed ≈ 0, > 30 min), incl. one-party-dark cases | **P0** rules → P1 sequence model |
| S4 | AIS Spoofing & Identity Check | Cloned MMSIs, impossible tracks, identity vs radar size-class mismatch | P1 |
| S5 | IUU Fishing Monitor | Trawling/loitering classification in restricted zones, sanctuaries, 65-day ban; EEZ intrusion alerts | P1 |
| S6 | Trafficking Corridor Watch | Known departure zones + seasonal route models; night small-craft cluster anomalies | P1 |
| S7 | Patrol Optimizer | Daily patrol routes maximizing hotspot coverage under fuel/asset constraints | P2 |
| S8 | Port & Anchorage Watch | Chattogram/Mongla/Payra: unusual dwell, undeclared arrivals, sanctioned-vessel calls | P2 |
| S9 | Evidence Package Generator | One-click legal bundle: imagery, tracks, timestamps, chain-of-custody hashes, court-admissible | **P0** basic interdiction packet → P1 court-ready |
| S10 | Environmental Sentinel | Oil-spill/slick detection from same SAR; cyclone-time vessel safety + search-and-rescue support | P2 |

## Cross-cutting (C1–C7)

| ID | Feature | What it does | Priority |
|---|---|---|---|
| C1 | National Situation Dashboard | Single command view of all three modules; role-based access | **P0** single view → P2 full RBAC roles |
| C2 | Ask-PRAHARI | Natural-language interface (Bangla + English) over the whole knowledge graph | **P0** basic Bangla Q&A → P1 |
| C3 | Explainable AI layer | Every score/alert/recommendation exposes evidence chain, sources, confidence | **P0 — non-negotiable, day 1** |
| C4 | Audit & accountability log | Immutable log: who saw what; which recommendations informed which decisions | P1 |
| C5 | Offline / air-gapped mode | Full function on sovereign infrastructure; periodic batch sync; no foreign cloud | P2 |
| C6 | Voice briefings & mobile app | Daily audio brief + secure mobile companion | P2 |
| C7 | API & inter-agency bus | Standards-based APIs; ministries integrate without replacing systems | P2 |

## The exact P0 (hackathon MVP) build list

GDELT ingestion + relevance ranking (D1) · RAG Do/Avoid brief with citations (D4) · asset registry of 25 synthetic assets + expiry alerts + simple RUL model (R1–R3) · Sentinel-1 detection pre-trained on xView3, one Bay of Bengal AOI (S2) · AIS overlay + dark matching (S1/S2) · STS rule detector (S3) · basic interdiction packet (S9) · unified map dashboard (C1) · Bangla output (C2/C3/D8-text).

**Explicitly excluded from MVP (roadmap only):** classified integrations, IoT retrofits, RF-constellation data, full scenario simulator (D5), mobile app, air-gap hardening.

## 7-minute demo storyline (protect at all costs)

1. **DRISHTI (2 min):** live ranked event feed → click a real event → auto Do/Avoid brief with cited sources → ask a question in Bangla, get a spoken answer.
2. **RAKKHOK (2 min):** 25-asset demo fleet → readiness % dashboard → an aircraft crosses its service-life threshold and triggers an alert → RUL ranking shows what to service first.
3. **SHOMUDRO (3 min, the wow moment):** real Sentinel-1 scene processed live → vessel detections → AIS overlay → unmatched dark contacts highlighted on the map → one contact shows an STS-rendezvous pattern → system generates the interdiction packet.

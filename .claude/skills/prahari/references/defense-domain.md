# PRAHARI — Defense & Maritime Domain Knowledge

Use this when building features, demo data, prompts, or copy that must sound credible to real officers, analysts, and judges. This is the knowledge the defense personas in `experts.md` draw on.

## 1. Bangladesh strategic context (DRISHTI framing)

- Bangladesh sits at a strategically contested crossroads: great-power competition in the Bay of Bengal, shifting trade blocs, sensitive neighbour relationships (India, Myanmar), and a maritime zone larger than the national landmass (~118,813 km² territorial waters + EEZ).
- The problem PRAHARI solves is stated as: **data exists, intelligence does not.** Events affecting Bangladesh (a third-country port deal, a sanctions regime, a new trade corridor) are analysed reactively, weeks after the decision window closed; analysis is fragmented across MoFA, Commerce, Defence, Shipping with no shared picture and no institutional memory.
- Every DRISHTI output must pass the "Bangladesh-first filter": not *what happened*, but *what should Bangladesh do, avoid, negotiate, or hedge against* — with first/second/third-order effects across trade, remittance, security, energy, water, and labour markets.
- Sensitive-topic discipline: briefs are analytical and neutral in tone toward all foreign states; recommendations are framed as national-interest options, never as hostility toward any country. Confidence and evidence accompany every claim.

## 2. Readiness doctrine (RAKKHOK realism)

- **Readiness rolls up:** individual asset → unit → base → force, expressed as availability/mission-capable percentages. Commanders consume the roll-up; maintainers consume the drill-down.
- **Multiple clocks per asset:** airframe hours, engine hours since overhaul (TBO), calendar-based hull surveys, consumable/battery expiry, certification renewals. An asset is grounded by its *worst* clock — a "healthy" aircraft with one expired component is not flyable. Feature R2 exists to answer bluntly: "Is this aircraft expired? Is it still being flown? How many are actually flyable?"
- **Usage counters that drive lifecycle:** flight hours, engine hours, nautical miles, rounds fired.
- **The paper problem:** logbooks are handwritten, abbreviation-heavy, and force-specific; OCR ingestion must tolerate this. Data quality improves only if technician input is effortless (photo/voice defect reports in Bangla — R8).
- **Cannibalisation** (stripping parts from one platform to keep another operational) happens everywhere and is usually tracked informally. PRAHARI's stance: surface it as an explicit, costed trade-off (R4), never hide it.
- **Failure modes today:** surprise groundings, platforms unavailable during cyclone response or search-and-rescue, panic procurement at premium prices. These are the pain points every RAKKHOK screen should visibly kill.
- **Alert cadence:** 180/90/30-day escalating alerts match real staff-work rhythm (budget cycle → procurement action → operational workaround).
- Predictive-maintenance value benchmark for pitches: 10–25% maintenance cost reduction (industry standard range).

## 3. Dark-vessel tradecraft (SHOMUDRO realism)

- **AIS basics:** legal vessels broadcast identity (MMSI), position, course, speed. Class A (large/commercial) vs Class B (small craft) matters; many small fishing craft legitimately have weak/no AIS — not every dark contact is criminal. Risk scoring, not binary accusation.
- **"Going dark":** deliberately switching off AIS — the signature behaviour of smuggling, human trafficking, IUU fishing, and ship-to-ship (STS) contraband transfer. The core detection logic: **vessel visible in SAR imagery but absent from AIS at the interpolated pass time = dark vessel.**
- **Pre-dark tells on AIS itself:** sudden AIS gaps, open-sea loitering, two tracks converging to near-zero separation with matched speed (STS signature: distance < 200 m, speed ≈ 0, duration > 30 min), impossible speed jumps (GPS/AIS spoofing), broadcast identity conflicting with radar size class, cloned MMSIs.
- **Sentinel-1 SAR:** all-weather, day/night, sees through monsoon cloud — but revisit is ~6–12 days on the free tier. Therefore continuous AIS-anomaly analytics must carry detection between passes; commercial daily tasking (ICEYE/Umbra) and RF geolocation (HawkEye 360-class) are the P2/P3 upgrade path, never an MVP dependency.
- **SAR limits (be honest in pitches):** small wooden craft return weakly or not at all; the roadmap answer is optical-imagery fusion in Phase 3. Close-to-shore detection is the hard case — that's why xView3's close-to-shore F1 is a named metric.
- **Interdiction packet contents (what a patrol commander actually needs):** last confirmed fix, predicted drift/track from current + wind, intercept vector for the nearest asset, and an evidence log. Court admissibility requires imagery, tracks, timestamps, and chain-of-custody hashes (S9).
- **Bay of Bengal specifics:** ~118,813 km² to cover with a small patrol fleet — physical patrol alone cannot cover it; monsoon season degrades optical but not SAR; the 65-day fishing ban is a hard enforcement window for S5; Chattogram, Mongla, Payra are the anchorages for S8; trafficking routes through the Bay are among the region's most active, with night small-craft cluster departures from known coastal zones; IUU fishing drains an estimated hundreds of millions USD/year.
- **Operational constraint for alerting:** the pilot cell is ~5 Coast Guard analysts. Precision beats recall — a ranked daily shortlist of high-risk contacts, not a wall of flags. Dual-analyst confirmation for high-severity alerts.

## 4. Governance red lines (apply everywhere)

1. PRAHARI **never acts autonomously** — it informs interdiction, diplomacy, and maintenance decisions made by authorised officers under existing law and rules of engagement.
2. Maritime operations follow **UNCLOS** and national law; evidence packages are for judicial process, not extrajudicial action.
3. Tracks **vessels and state-level actors, not private citizens**; disinformation work stays at narrative/cluster level.
4. Every recommendation: sources + confidence; immutable audit trail for parliamentary and internal oversight.
5. Open-weight models fine-tuned and hosted **in-country**; nothing sensitive leaves national infrastructure.
6. Anti-over-trust controls: red-team reviews, dual-analyst confirmation on high-severity, published error rates.

## 5. Realistic synthetic demo data (RAKKHOK's 25-asset fleet)

When generating demo assets, make them pass an officer's sniff test:
- Mixed fleet: transport aircraft, maritime patrol aircraft, helicopters, offshore patrol vessels, fast patrol boats, coastal radars, vehicles, generators.
- Realistic distributions: induction years spread over 5–35 years; some assets near airframe-life or TBO limits; at least one platform grounded by a trivial expired consumable (the classic case); a spare-part line predicted to run out before the next procurement cycle.
- Story beats the demo needs: one aircraft crossing its service-life threshold live (triggers the R2 alert), an RUL ranking that clearly says "service this one first," and a readiness % that visibly drops when the alert fires.
- Use generic type designations (e.g., "MPA-2 Maritime Patrol Aircraft", "OPV Shongram-class") — plausible but fictional; never present real hull/tail numbers or real force inventory as fact.

## 6. Adoption & risk playbook (business/pitch persona support)

| Risk | Mitigation (from blueprint §14.2) |
|---|---|
| Satellite revisit gaps (free tier) | Continuous AIS-anomaly detection between SAR passes; commercial tasking in Phase 2 |
| LLM hallucination in briefs | Strict RAG, mandatory citations, refusal on low evidence, analyst sign-off before circulation |
| Inter-agency data-sharing resistance | Start with one champion agency (Coast Guard); federated architecture — agencies keep data custody |
| Adversary adaptation (spoofing, wooden craft) | Multi-sensor fusion roadmap (optical, RF) in Phase 3 |
| Talent retention | EWU/BUET university pipeline; documented, containerised stack against key-person risk |

Roadmap exit criteria to quote: Phase 1 = detection precision ≥ 80% and 2 real interdictions supported; Phase 2 = inter-agency operating picture + live readiness reporting; Phase 3 = persistent EEZ coverage + measurable smuggling-route disruption.

# SHOMUDRO (সমুদ্র) — Maritime Domain Awareness

> *"Radar-visible + AIS-silent = a dark vessel."*

SHOMUDRO fuses Sentinel-1 SAR detections with AIS to surface dark vessels and
ship-to-ship transfers across Bangladesh's ~118,813 km² EEZ, then generates an
actionable interdiction packet. It is Module 3 of PRAHARI — the demo's wow
moment.

## Features in this module

| ID | Feature | Status |
|----|---------|--------|
| **S1** | Live Maritime Picture — unified EEZ map: AIS, SAR, dark flags, patrol assets | ✅ MVP |
| **S2** | Dark Vessel Detector — SAR↔AIS correlation, ranked daily shortlist by risk | ✅ MVP |
| **S3** | STS Rendezvous Alert — two-vessel mid-sea meeting, incl. one-party-dark | ✅ MVP |
| **S9** | Interdiction Packet — last fix, drift, intercept vector, chain-of-custody | ✅ MVP |

## The detection chain

1. **SAR detection** — a **bundled Sentinel-1 scene** (`data/scene.json`, real
   Copernicus imagery over a Bay of Bengal AOI) provides the vessel-like radar
   contacts. A trained **YOLO / xView3** detector is the documented *production*
   path — pre-computed here so the demo runs fast and judge-safe without a GPU;
   the fusion, risk, STS and interdiction logic all run for real on the scene.
2. **AIS interpolation** — legal vessels' AIS positions are interpolated to the
   satellite-pass time.
3. **SAR↔AIS matching** — a gated greedy assignment (distance + size gates; a
   transparent stand-in for Hungarian matching) pairs radar blobs to AIS
   reports. **No valid partner ⇒ dark.**
4. **Risk scoring** — dark contacts ranked by trafficking-corridor overlap,
   night pass, and small-craft size class. Precision over recall for a small
   analyst cell.
5. **STS detection** — two vessels < 200 m, ~0 kn, > 30 min; one-party-dark
   flagged as elevated risk.
6. **Interdiction packet** — drift prediction (current + wind leeway), intercept
   vector from the nearest patrol asset, and a SHA-256 chain-of-custody hash for
   court admissibility (UNCLOS / national law). PRAHARI informs; officers decide.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/shomudro/picture` | Live maritime picture (AIS + SAR + dark + STS). |
| `GET` | `/api/shomudro/dark-vessels` | Ranked dark-vessel shortlist. |
| `GET` | `/api/shomudro/sts` | STS rendezvous alerts. |
| `GET` | `/api/shomudro/interdiction/{target_id}` | Interdiction packet for a dark contact or STS event. |

## Data & honesty

- **Scene:** `data/scene.json` — cached Bay of Bengal scene (8 AIS tracks, 12 SAR
  detections; 4 dark, one one-party-dark STS pair). Positions are illustrative.
- **SAR is honestly pre-computed** for the demo — running YOLO on live Sentinel-1
  needs model weights + GPU + scene download, which cannot be guaranteed live
  during judging. The detection *pipeline and model* are the documented
  production path; the fusion, risk, STS, and interdiction logic all run for
  real on the scene.
- **SAR limits stated, not hidden:** small wooden craft return weakly to SAR;
  close-to-shore is the hard case. Optical-imagery fusion is the Phase-3 answer.

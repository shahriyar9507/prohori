"""SHOMUDRO (maritime domain awareness) schemas.

Core logic: a vessel visible in SAR imagery but absent from AIS at the
interpolated satellite-pass time is a DARK vessel. SHOMUDRO fuses Sentinel-1
SAR detections with AIS, flags dark contacts and ship-to-ship rendezvous, and
generates an actionable interdiction packet.
"""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.common import AIMeta, Evidence


class VesselClass(str, Enum):
    CLASS_A = "class_a"      # large/commercial, strong AIS
    CLASS_B = "class_b"      # small craft, weak/intermittent AIS
    UNKNOWN = "unknown"


class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AISTrack(BaseModel):
    """An AIS-reporting vessel, interpolated to the SAR pass time."""

    mmsi: str
    name: str | None = None
    lat: float
    lon: float
    sog: float = Field(..., description="Speed over ground (knots).")
    cog: float = Field(..., description="Course over ground (degrees).")
    vessel_class: VesselClass = VesselClass.CLASS_A
    length_m: float | None = None


class SARDetection(BaseModel):
    """A vessel-like object detected in a Sentinel-1 SAR scene."""

    id: str
    lat: float
    lon: float
    length_m: float
    heading: float | None = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class DarkVessel(BaseModel):
    """A SAR detection with no matching AIS track — ranked by risk."""

    detection: SARDetection
    matched: bool
    matched_mmsi: str | None = None
    match_distance_m: float | None = None
    risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: RiskLevel
    reasons: list[str] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    meta: AIMeta


class STSEvent(BaseModel):
    """A ship-to-ship rendezvous (possible mid-sea transfer)."""

    id: str
    vessel_a: str
    vessel_b: str
    lat: float
    lon: float
    distance_m: float
    duration_min: float
    one_party_dark: bool
    risk_level: RiskLevel
    reasons: list[str] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    meta: AIMeta


class InterdictionPacket(BaseModel):
    """S9 — the actionable bundle a patrol commander needs."""

    target_id: str
    generated_at_utc: str
    last_fix: dict[str, float]
    drift_prediction: dict[str, float] = Field(..., description="Predicted position after drift window.")
    intercept: dict[str, float] = Field(..., description="Bearing/distance/ETA from nearest patrol asset.")
    nearest_asset: str
    evidence_log: list[Evidence]
    chain_of_custody_sha256: str
    confidence: float
    meta: AIMeta


class MaritimePicture(BaseModel):
    """S1 — the unified maritime picture payload."""

    generated_at_utc: str
    scene_id: str
    pass_time_utc: str
    eez_bbox: list[float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat].")
    ais_tracks: list[AISTrack]
    sar_detections: list[SARDetection]
    dark_vessels: list[DarkVessel]
    sts_events: list[STSEvent]
    patrol_assets: list[dict]
    counts: dict[str, int]

"""SHOMUDRO API routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.modules.shomudro import picture
from app.schemas.shomudro import DarkVessel, InterdictionPacket, MaritimePicture, STSEvent

router = APIRouter(prefix="/api/shomudro", tags=["SHOMUDRO"])


@router.get("/picture", response_model=MaritimePicture, summary="Live Maritime Picture (S1)")
def maritime_picture() -> MaritimePicture:
    """Unified EEZ picture: AIS tracks, SAR detections, dark contacts, STS events."""
    return picture.assemble()


@router.get("/dark-vessels", response_model=list[DarkVessel], summary="Dark Vessel shortlist (S2)")
def dark_vessels() -> list[DarkVessel]:
    """Ranked daily list of radar-visible, AIS-silent contacts (highest risk first)."""
    return picture.assemble().dark_vessels


@router.get("/sts", response_model=list[STSEvent], summary="STS rendezvous alerts (S3)")
def sts_events() -> list[STSEvent]:
    """Ship-to-ship rendezvous detections (< 200 m, ~0 kn, > 30 min)."""
    return picture.assemble().sts_events


@router.get(
    "/interdiction/{target_id}",
    response_model=InterdictionPacket,
    summary="Interdiction packet for a contact or STS event (S9)",
)
def interdiction_packet(target_id: str) -> InterdictionPacket:
    """Generate the actionable interdiction bundle for a dark contact or STS event."""
    packet = picture.build_interdiction(target_id)
    if packet is None:
        raise HTTPException(status_code=404, detail=f"Target '{target_id}' not found among dark contacts or STS events.")
    return packet

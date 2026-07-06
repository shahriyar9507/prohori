"""DRISHTI grounding knowledge base for the Do/Avoid Advisor (D4).

Two grounded resources back every recommendation so briefs cite evidence
rather than invent it (design law #3):

  * PRECEDENTS — short, neutral reference notes the brief can cite.
  * SECTOR_PLAYBOOK — national-interest DO / AVOID / HEDGE options per sector,
    drafted from the strategic-analyst and ambassador personas.

This is a deliberately small, auditable corpus for the MVP. In production it is
replaced by RAG over the Neo4j knowledge graph + a precedent archive; the
citation contract stays identical.
"""
from __future__ import annotations

from app.schemas.drishti import Sector

# ─── Precedent / reference corpus (citable) ───────────────────────────────
PRECEDENTS: dict[str, dict[str, str]] = {
    "PREC-TRADE-DIVERSIFY": {
        "title": "Export concentration risk in ready-made garments",
        "detail": "A large share of export earnings concentrated in one sector and a "
                  "few destination markets amplifies exposure to any single buyer's "
                  "policy shift; diversification of both product and market reduces shock.",
        "source": "PRAHARI reference note · trade-exposure analysis",
    },
    "PREC-LABOUR-REMITTANCE": {
        "title": "Remittance dependence on a small set of destinations",
        "detail": "Overseas-worker remittances are a primary source of foreign exchange; "
                  "quota or policy changes in a major destination country transmit quickly "
                  "to the balance of payments, making destination diversification strategic.",
        "source": "PRAHARI reference note · remittance exposure",
    },
    "PREC-WATER-TRANSBOUNDARY": {
        "title": "Transboundary river flow negotiations",
        "detail": "Dry-season flow allocation on shared rivers is best pursued through "
                  "sustained technical dialogue with data-sharing; linkage to unrelated "
                  "disputes tends to stall progress.",
        "source": "PRAHARI reference note · transboundary water",
    },
    "PREC-INFRA-DEBT": {
        "title": "Large infrastructure financing and debt sustainability",
        "detail": "Major externally-financed infrastructure can advance connectivity but "
                  "warrants scrutiny of financing terms, debt sustainability, and strategic "
                  "control clauses before commitment.",
        "source": "PRAHARI reference note · infrastructure financing",
    },
    "PREC-BORDER-DEESCALATE": {
        "title": "Border-incident de-escalation practice",
        "detail": "Localized border incidents are best contained through established "
                  "border-liaison mechanisms and factual verification before public "
                  "escalation, preserving space for diplomacy.",
        "source": "PRAHARI reference note · border management",
    },
    "PREC-REGIONAL-CONNECTIVITY": {
        "title": "Regional connectivity frameworks",
        "detail": "Participation in regional connectivity and trade-facilitation "
                  "frameworks can expand market access while balancing relationships "
                  "among multiple partners.",
        "source": "PRAHARI reference note · regional cooperation",
    },
    "PREC-CLIMATE-PREPARE": {
        "title": "Cyclone preparedness and coastal readiness",
        "detail": "Early-warning lead time and pre-positioned response assets materially "
                  "reduce loss of life and economic damage during Bay of Bengal cyclone events.",
        "source": "PRAHARI reference note · disaster preparedness",
    },
}

# ─── Sector playbooks (DO / AVOID / HEDGE) ────────────────────────────────
# Each item pairs guidance with the precedent IDs that support it.
SECTOR_PLAYBOOK: dict[Sector, dict[str, list[tuple[str, list[str]]]]] = {
    Sector.TRADE: {
        "do": [
            ("Assess exposure of affected export categories and quantify the earnings at risk.",
             ["PREC-TRADE-DIVERSIFY"]),
            ("Open early technical engagement with the counterpart to shape the outcome.",
             ["PREC-REGIONAL-CONNECTIVITY"]),
        ],
        "avoid": [
            ("Avoid reactive public statements before the trade impact is quantified.",
             ["PREC-TRADE-DIVERSIFY"]),
        ],
        "hedge": [
            ("Accelerate market and product diversification to reduce single-buyer dependence.",
             ["PREC-TRADE-DIVERSIFY"]),
        ],
    },
    Sector.LABOUR: {
        "do": [
            ("Engage the destination country's labour ministry to clarify and shape the policy.",
             ["PREC-LABOUR-REMITTANCE"]),
            ("Model the remittance and balance-of-payments impact across scenarios.",
             ["PREC-LABOUR-REMITTANCE"]),
        ],
        "avoid": [
            ("Avoid assuming the change is permanent before official clarification.",
             ["PREC-LABOUR-REMITTANCE"]),
        ],
        "hedge": [
            ("Expand recruitment channels to additional destination markets to spread risk.",
             ["PREC-LABOUR-REMITTANCE"]),
        ],
    },
    Sector.WATER: {
        "do": [
            ("Sustain the technical dialogue and propose joint data-sharing on flow.",
             ["PREC-WATER-TRANSBOUNDARY"]),
        ],
        "avoid": [
            ("Avoid linking the water file to unrelated bilateral disputes.",
             ["PREC-WATER-TRANSBOUNDARY"]),
        ],
        "hedge": [
            ("Advance domestic water-storage and efficiency measures in parallel.",
             ["PREC-WATER-TRANSBOUNDARY"]),
        ],
    },
    Sector.SECURITY: {
        "do": [
            ("Verify facts through the established border-liaison mechanism before acting.",
             ["PREC-BORDER-DEESCALATE"]),
            ("Maintain proportionate patrol posture and keep diplomatic channels open.",
             ["PREC-BORDER-DEESCALATE"]),
        ],
        "avoid": [
            ("Avoid public escalation before verification.",
             ["PREC-BORDER-DEESCALATE"]),
        ],
        "hedge": [
            ("Prepare contingency posture while prioritizing de-escalation.",
             ["PREC-BORDER-DEESCALATE"]),
        ],
    },
    Sector.ENERGY: {
        "do": [
            ("Review energy-import route exposure and near-term supply cover.",
             ["PREC-INFRA-DEBT"]),
        ],
        "avoid": [
            ("Avoid committing to financing terms before a debt-sustainability review.",
             ["PREC-INFRA-DEBT"]),
        ],
        "hedge": [
            ("Diversify supply routes and maintain strategic reserves.",
             ["PREC-INFRA-DEBT"]),
        ],
    },
    Sector.DIPLOMACY: {
        "do": [
            ("Engage constructively while preserving balance among partners.",
             ["PREC-REGIONAL-CONNECTIVITY"]),
        ],
        "avoid": [
            ("Avoid commitments that constrain flexibility with other partners.",
             ["PREC-REGIONAL-CONNECTIVITY"]),
        ],
        "hedge": [
            ("Keep parallel channels open with all major partners.",
             ["PREC-REGIONAL-CONNECTIVITY"]),
        ],
    },
    Sector.CLIMATE: {
        "do": [
            ("Confirm early-warning dissemination and pre-position response assets.",
             ["PREC-CLIMATE-PREPARE"]),
        ],
        "avoid": [
            ("Avoid delaying coastal advisories pending further certainty.",
             ["PREC-CLIMATE-PREPARE"]),
        ],
        "hedge": [
            ("Ready search-and-rescue and relief logistics for rapid activation.",
             ["PREC-CLIMATE-PREPARE"]),
        ],
    },
}


def precedents_for(sector_ids: list[str]) -> list[dict[str, str]]:
    """Return the precedent records for a set of precedent IDs."""
    out: list[dict[str, str]] = []
    for pid in sector_ids:
        if pid in PRECEDENTS:
            rec = dict(PRECEDENTS[pid])
            rec["id"] = pid
            out.append(rec)
    return out


def playbook_for(sector: Sector) -> dict[str, list[tuple[str, list[str]]]]:
    """Return the DO/AVOID/HEDGE playbook for a sector (empty if none)."""
    return SECTOR_PLAYBOOK.get(sector, {"do": [], "avoid": [], "hedge": []})

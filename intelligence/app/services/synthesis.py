"""
Synthesis & confidence scoring layer.
Takes raw provider outputs and produces a structured, scored VehicleReport.
This is where coverage + corroboration logic lives.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional

from ..models.vehicle import (
    ConfidenceLevel,
    CoverageMap,
    DataPoint,
    HistoryEvent,
    EventType,
    Recall,
    RecallStatus,
    RiskFlag,
    RiskSeverity,
    VehicleIdentity,
    VehicleReport,
)


def build_identity(nhtsa_data: Dict[str, Any], vin: str) -> VehicleIdentity:
    def dp(value: Optional[str], source: str = "NHTSA VIN Decoder") -> Optional[DataPoint]:
        if value is None:
            return None
        return DataPoint(value=value, source=source, confidence=ConfidenceLevel.HIGH)

    engine_desc = None
    if nhtsa_data.get("engine") and nhtsa_data.get("engine_cylinders"):
        engine_desc = f"{nhtsa_data['engine']}L {nhtsa_data['engine_cylinders']}-cyl"
    elif nhtsa_data.get("engine"):
        engine_desc = f"{nhtsa_data['engine']}L"

    return VehicleIdentity(
        vin=vin,
        year=dp(nhtsa_data.get("year")),
        make=dp(nhtsa_data.get("make")),
        model=dp(nhtsa_data.get("model")),
        trim=dp(nhtsa_data.get("trim")),
        body_style=dp(nhtsa_data.get("body_style")),
        engine=dp(engine_desc),
        transmission=dp(nhtsa_data.get("transmission")),
        drive_type=dp(nhtsa_data.get("drive_type")),
        plant_country=dp(nhtsa_data.get("plant_country")),
        nhtsa_raw=nhtsa_data,
    )


def build_recalls(raw_recalls: List[Dict], make: str, model: str) -> List[Recall]:
    recalls = []
    for r in raw_recalls:
        status = RecallStatus.OPEN
        remedy = r.get("Remedy", "") or ""
        if remedy.strip():
            status = RecallStatus.CLOSED

        recalls.append(Recall(
            campaign_id=r.get("NHTSACampaignNumber", "unknown"),
            component=r.get("Component", "Unknown component"),
            summary=r.get("Summary", "No summary available"),
            consequence=r.get("Consequence") or None,
            remedy=remedy or None,
            status=status,
            recall_date=r.get("ReportReceivedDate") or None,
            source="NHTSA Recall Database",
        ))
    return recalls


def build_events_from_carfax(carfax_data: Dict) -> List[HistoryEvent]:
    if carfax_data.get("_stub"):
        return []

    events = []
    for record in carfax_data.get("service_records", []):
        events.append(HistoryEvent(
            event_type=EventType.SERVICE,
            date=record.get("date"),
            description=record.get("description", "Service record"),
            source="CARFAX",
            source_confidence=ConfidenceLevel.MEDIUM,
            odometer=record.get("odometer"),
            location=record.get("location"),
            raw=record,
        ))

    for event in carfax_data.get("ownership_history", []):
        events.append(HistoryEvent(
            event_type=EventType.OWNERSHIP_CHANGE,
            date=event.get("date"),
            description=f"Ownership change — {event.get('state', 'unknown state')}",
            source="CARFAX",
            source_confidence=ConfidenceLevel.HIGH,
            odometer=event.get("odometer"),
            raw=event,
        ))

    for accident in carfax_data.get("accident_records", []):
        events.append(HistoryEvent(
            event_type=EventType.ACCIDENT,
            date=accident.get("date"),
            description=accident.get("description", "Reported accident"),
            source="CARFAX",
            source_confidence=ConfidenceLevel.HIGH,
            raw=accident,
        ))

    return events


def build_events_from_autocheck(ac_data: Dict) -> List[HistoryEvent]:
    if ac_data.get("_stub"):
        return []

    events = []
    for entry in ac_data.get("odometer_history", []):
        events.append(HistoryEvent(
            event_type=EventType.ODOMETER,
            date=entry.get("date"),
            description=f"Odometer reading: {entry.get('reading', '?')} miles",
            source="AutoCheck",
            source_confidence=ConfidenceLevel.HIGH,
            odometer=entry.get("reading"),
            raw=entry,
        ))
    for auction in ac_data.get("auction_history", []):
        events.append(HistoryEvent(
            event_type=EventType.AUCTION,
            date=auction.get("date"),
            description=f"Auction sale — {auction.get('location', 'unknown location')}",
            source="AutoCheck",
            source_confidence=ConfidenceLevel.HIGH,
            raw=auction,
        ))
    return events


def build_events_from_marketcheck(mc_data: Dict) -> List[HistoryEvent]:
    if mc_data.get("_stub") or mc_data.get("_empty"):
        return []

    events: List[HistoryEvent] = []

    for odo in mc_data.get("odometer_history", []):
        reading = odo.get("reading")
        if not reading:
            continue
        events.append(HistoryEvent(
            event_type=EventType.ODOMETER,
            date=odo.get("date"),
            description=f"Reported mileage: {reading:,} mi at {odo.get('source', 'unknown')} ({odo.get('location', '')})",
            source="MarketCheck",
            source_confidence=ConfidenceLevel.MEDIUM,
            odometer=reading,
        ))

    for auction in mc_data.get("auction_history", []):
        miles_str = f" — {auction['miles']:,} mi" if auction.get("miles") else ""
        events.append(HistoryEvent(
            event_type=EventType.AUCTION,
            date=auction.get("date"),
            description=f"Auction listing: {auction.get('seller', 'unknown')} in {auction.get('location', '?')}{miles_str}",
            source="MarketCheck",
            source_confidence=ConfidenceLevel.HIGH,
            odometer=auction.get("miles"),
        ))

    for own in mc_data.get("ownership_signals", []):
        seller_type = own.get("seller_type", "unknown")
        if seller_type in ("auction", "wholesale"):
            continue  # already captured above
        events.append(HistoryEvent(
            event_type=EventType.OWNERSHIP_CHANGE,
            date=own.get("date"),
            description=f"Listed for sale ({seller_type}) — {own.get('state', '?')}",
            source="MarketCheck",
            source_confidence=ConfidenceLevel.MEDIUM,
            odometer=own.get("odometer"),
        ))

    return events


def detect_risk_flags(
    identity: Optional[VehicleIdentity],
    recalls: List[Recall],
    carfax_data: Dict,
    nmvtis_data: Dict,
    events: List[HistoryEvent],
    marketcheck_data: Optional[Dict] = None,
) -> List[RiskFlag]:
    flags: List[RiskFlag] = []

    open_recalls = [r for r in recalls if r.status == RecallStatus.OPEN]
    if open_recalls:
        flags.append(RiskFlag(
            severity=RiskSeverity.HIGH,
            category="Open Safety Recall",
            description=f"{len(open_recalls)} open safety recall(s). Components: {', '.join(r.component for r in open_recalls[:3])}.",
            source="NHTSA",
        ))

    title_brand = nmvtis_data.get("title_brand", "not_available")
    if title_brand not in ("not_available", None, "clean"):
        flags.append(RiskFlag(
            severity=RiskSeverity.HIGH,
            category="Title Brand",
            description=f"Title branded as: {title_brand}",
            source="NMVTIS",
        ))

    if nmvtis_data.get("salvage"):
        flags.append(RiskFlag(
            severity=RiskSeverity.HIGH,
            category="Salvage Title",
            description="Vehicle has a salvage title record.",
            source="NMVTIS",
        ))

    if not carfax_data.get("_stub"):
        accident_count = carfax_data.get("accident_count", 0) or 0
        if accident_count > 0:
            flags.append(RiskFlag(
                severity=RiskSeverity.MEDIUM,
                category="Reported Accidents",
                description=f"{accident_count} reported accident(s) in CARFAX.",
                source="CARFAX",
            ))

    # MarketCheck-specific risk signals
    if marketcheck_data and not marketcheck_data.get("_stub"):
        if marketcheck_data.get("odometer_rollback_detected"):
            flags.append(RiskFlag(
                severity=RiskSeverity.HIGH,
                category="Odometer Rollback",
                description=marketcheck_data.get("rollback_detail") or "Mileage decreased between listings — possible odometer fraud.",
                source="MarketCheck",
            ))

        auction_count = len(marketcheck_data.get("auction_history", []))
        if auction_count >= 3:
            flags.append(RiskFlag(
                severity=RiskSeverity.MEDIUM,
                category="Multiple Auction Appearances",
                description=f"Vehicle appeared at auction {auction_count} times — may indicate repeated wholesale cycling.",
                source="MarketCheck",
            ))

        states = marketcheck_data.get("states_seen", [])
        if len(states) >= 4:
            flags.append(RiskFlag(
                severity=RiskSeverity.LOW,
                category="High Geographic Movement",
                description=f"Vehicle tracked across {len(states)} states: {', '.join(states)}.",
                source="MarketCheck",
            ))

    return flags


def compute_confidence_score(
    nhtsa_ok: bool,
    carfax_data: Dict,
    autocheck_data: Dict,
    nmvtis_data: Dict,
    recalls_ok: bool,
    obd_data: Optional[Dict],
    marketcheck_data: Optional[Dict] = None,
) -> float:
    """
    Weighted scoring model. Max 100 points.

      NHTSA identity       25 pts  — vehicle spec anchor
      NHTSA recalls        20 pts  — safety compliance
      MarketCheck history  25 pts  — listing/odometer/auction history
      CARFAX/AutoCheck     30 pts  — accident + service records (15 each)
      NMVTIS title         15 pts  — salvage/brand status
      OBD scan             10 pts  — current physical condition (bonus)

    With NHTSA + MarketCheck only: 45+25 = 70/100
    Full stack: 100/100
    """
    score = 0.0

    if nhtsa_ok:
        score += 25.0

    if recalls_ok:
        score += 20.0

    mc_live = marketcheck_data and not marketcheck_data.get("_stub") and not marketcheck_data.get("_error")
    if mc_live:
        score += 25.0

    carfax_live = not carfax_data.get("_stub") and not carfax_data.get("_error")
    autocheck_live = not autocheck_data.get("_stub") and not autocheck_data.get("_error")
    if carfax_live:
        score += 15.0
    if autocheck_live:
        score += 15.0

    nmvtis_live = not nmvtis_data.get("_stub")
    if nmvtis_live:
        score += 15.0

    if obd_data and not obd_data.get("_stub"):
        score += 10.0

    # Cap at 100 (OBD is bonus that can offset missing sources)
    return round(min(score, 100.0), 1)


def build_coverage_map(
    nhtsa_ok: bool,
    carfax_data: Dict,
    autocheck_data: Dict,
    nmvtis_data: Dict,
    obd_data: Optional[Dict],
    marketcheck_data: Optional[Dict] = None,
) -> CoverageMap:
    def stub_status(data: Dict, label: str) -> str:
        return "available" if not data.get("_stub") else f"not_available — {label}"

    mc_live = marketcheck_data and not marketcheck_data.get("_stub")

    return CoverageMap(
        identity="nhtsa_verified" if nhtsa_ok else "not_available",
        ownership_history="marketcheck" if mc_live else stub_status(carfax_data, "add MARKETCHECK_API_KEY"),
        accident_history=stub_status(carfax_data, "add CARFAX_API_KEY"),
        title_status=stub_status(nmvtis_data, "add NMVTIS_API_KEY"),
        recall_status="nhtsa_verified" if nhtsa_ok else "not_available",
        service_records="not_available — dealer repair logs inaccessible via any API",
        obd_scan="verified" if (obd_data and not obd_data.get("_stub")) else "not_available",
        telematics="not_available",
    )


def build_data_gaps(
    carfax_data: Dict,
    autocheck_data: Dict,
    nmvtis_data: Dict,
    obd_data: Optional[Dict],
    marketcheck_data: Optional[Dict] = None,
) -> List[str]:
    gaps = []
    mc_live = marketcheck_data and not marketcheck_data.get("_stub")

    if not mc_live:
        gaps.append("Listing/odometer/auction history not available — set MARKETCHECK_API_KEY (free tier, instant signup)")
    if carfax_data.get("_stub"):
        gaps.append("Accident and dealer-reported service records not available (requires CARFAX partner agreement)")
    if autocheck_data.get("_stub"):
        gaps.append("AutoCheck wholesale history not available (requires Experian data partnership)")
    if nmvtis_data.get("_stub"):
        gaps.append("Title brand / salvage status not verified (requires NMVTIS provider contract)")
    if not obd_data or obd_data.get("_stub"):
        gaps.append("No physical OBD scan — current mechanical condition unverified")
    gaps.append("Private repair history is not accessible — only reported service events shown")
    return gaps


def build_buyer_summary(
    identity: Optional[VehicleIdentity],
    recalls: List[Recall],
    risk_flags: List[RiskFlag],
    confidence_score: float,
    data_gaps: List[str],
) -> str:
    parts = []

    if identity:
        year = identity.year.value if identity.year else "?"
        make = identity.make.value if identity.make else "?"
        model = identity.model.value if identity.model else "?"
        parts.append(f"This is a {year} {make} {model}.")

    open_recalls = [r for r in recalls if r.status == RecallStatus.OPEN]
    if open_recalls:
        parts.append(f"There are {len(open_recalls)} open safety recall(s) requiring attention.")
    elif recalls:
        parts.append(f"All {len(recalls)} known recall(s) appear to have remedies on record.")
    else:
        parts.append("No recalls found for this vehicle configuration.")

    high_flags = [f for f in risk_flags if f.severity == RiskSeverity.HIGH]
    medium_flags = [f for f in risk_flags if f.severity == RiskSeverity.MEDIUM]
    if high_flags:
        parts.append(f"High-risk indicators present: {'; '.join(f.category for f in high_flags)}.")
    elif medium_flags:
        parts.append(f"Moderate concerns noted: {'; '.join(f.category for f in medium_flags)}.")
    else:
        parts.append("No major risk indicators detected in available data.")

    parts.append(
        f"Confidence score: {confidence_score}/100. "
        "This reflects coverage of available data sources, not vehicle condition."
    )

    if data_gaps:
        parts.append(f"Data gaps: {len(data_gaps)} source(s) not available — see details.")

    return " ".join(parts)


def _noop() -> None: pass  # marker — vinaudit removed, kept for git history clarity


def build_events_from_vinaudit(va_data: Dict) -> List[HistoryEvent]:
    """Extract timeline events from VinAudit unified response."""
    if va_data.get("_stub"):
        return []
    events: List[HistoryEvent] = []

    for acc in va_data.get("accident_records", []):
        events.append(HistoryEvent(
            event_type=EventType.ACCIDENT,
            date=acc.get("date"),
            description=acc.get("description") or "Accident record",
            source="VinAudit",
            source_confidence=ConfidenceLevel.HIGH,
            location=acc.get("location"),
            raw=acc,
        ))

    for own in va_data.get("ownership_history", []):
        events.append(HistoryEvent(
            event_type=EventType.OWNERSHIP_CHANGE,
            date=own.get("date"),
            description=f"Ownership record — {own.get('state', 'state unknown')}",
            source="VinAudit",
            source_confidence=ConfidenceLevel.HIGH,
            odometer=own.get("odometer"),
            raw=own,
        ))

    for odo in va_data.get("odometer_history", []):
        events.append(HistoryEvent(
            event_type=EventType.ODOMETER,
            date=odo.get("date"),
            description=f"Odometer reading: {odo.get('reading', '?')} miles",
            source="VinAudit",
            source_confidence=ConfidenceLevel.HIGH,
            odometer=odo.get("reading"),
            raw=odo,
        ))

    for title in va_data.get("title_events", []):
        brand = title.get("brand")
        if brand and brand not in ("clean", "none", None):
            events.append(HistoryEvent(
                event_type=EventType.TITLE_BRAND,
                date=title.get("date"),
                description=f"Title branded: {brand} — {title.get('state', '')}",
                source="VinAudit",
                source_confidence=ConfidenceLevel.HIGH,
                odometer=title.get("odometer"),
                raw=title,
            ))

    return events


async def synthesize(
    vin: str,
    nhtsa_decode: Dict,
    nhtsa_error: Optional[str],
    raw_recalls: List[Dict],
    recalls_error: Optional[str],
    carfax_data: Dict,
    autocheck_data: Dict,
    nmvtis_data: Dict,
    marketcheck_data: Optional[Dict] = None,
    obd_data: Optional[Dict] = None,
) -> VehicleReport:
    mc_live = marketcheck_data and not marketcheck_data.get("_stub") and not marketcheck_data.get("_error")

    sources_queried = ["NHTSA VIN Decoder", "NHTSA Recalls", "MarketCheck", "CARFAX", "AutoCheck", "NMVTIS"]
    sources_available: List[str] = []

    identity = None
    nhtsa_ok = False
    if not nhtsa_error and nhtsa_decode.get("make"):
        nhtsa_ok = True
        sources_available.append("NHTSA VIN Decoder")
        identity = build_identity(nhtsa_decode, vin)

    recalls_ok = False
    recalls: List[Recall] = []
    if not recalls_error and raw_recalls is not None:
        recalls_ok = True
        sources_available.append("NHTSA Recalls")
        make = (identity.make.value if identity and identity.make else "") or ""
        model = (identity.model.value if identity and identity.model else "") or ""
        recalls = build_recalls(raw_recalls, make, model)

    events: List[HistoryEvent] = []

    if mc_live:
        sources_available.append("MarketCheck")
        events += build_events_from_marketcheck(marketcheck_data)

    if not carfax_data.get("_stub"):
        sources_available.append("CARFAX")
        events += build_events_from_carfax(carfax_data)

    if not autocheck_data.get("_stub"):
        sources_available.append("AutoCheck")
        events += build_events_from_autocheck(autocheck_data)

    if not nmvtis_data.get("_stub"):
        sources_available.append("NMVTIS")

    events.sort(key=lambda e: e.date or "", reverse=True)

    risk_flags = detect_risk_flags(
        identity, recalls, carfax_data, nmvtis_data, events, marketcheck_data
    )
    confidence_score = compute_confidence_score(
        nhtsa_ok, carfax_data, autocheck_data, nmvtis_data, recalls_ok, obd_data, marketcheck_data
    )
    coverage_map = build_coverage_map(
        nhtsa_ok, carfax_data, autocheck_data, nmvtis_data, obd_data, marketcheck_data
    )
    data_gaps = build_data_gaps(
        carfax_data, autocheck_data, nmvtis_data, obd_data, marketcheck_data
    )
    buyer_summary = build_buyer_summary(identity, recalls, risk_flags, confidence_score, data_gaps)
    open_recall_count = len([r for r in recalls if r.status == RecallStatus.OPEN])

    return VehicleReport(
        vin=vin,
        identity=identity,
        events=events,
        recalls=recalls,
        open_recall_count=open_recall_count,
        risk_flags=risk_flags,
        confidence_score=confidence_score,
        coverage_map=coverage_map,
        buyer_summary=buyer_summary,
        data_gaps=data_gaps,
        sources_queried=sources_queried,
        sources_available=sources_available,
    )

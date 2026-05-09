from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class DataPoint(BaseModel):
    value: Any
    source: str
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    confidence: ConfidenceLevel = ConfidenceLevel.UNKNOWN
    note: Optional[str] = None


class VehicleIdentity(BaseModel):
    vin: str
    year: Optional[DataPoint] = None
    make: Optional[DataPoint] = None
    model: Optional[DataPoint] = None
    trim: Optional[DataPoint] = None
    body_style: Optional[DataPoint] = None
    engine: Optional[DataPoint] = None
    transmission: Optional[DataPoint] = None
    drive_type: Optional[DataPoint] = None
    plant_country: Optional[DataPoint] = None
    nhtsa_raw: Optional[Dict[str, Any]] = None


class EventType(str, Enum):
    OWNERSHIP_CHANGE = "ownership_change"
    ACCIDENT = "accident"
    SERVICE = "service"
    RECALL_REPAIR = "recall_repair"
    TITLE_BRAND = "title_brand"
    ODOMETER = "odometer"
    AUCTION = "auction"
    INSURANCE_CLAIM = "insurance_claim"


class HistoryEvent(BaseModel):
    event_type: EventType
    date: Optional[str] = None
    description: str
    source: str
    source_confidence: ConfidenceLevel
    odometer: Optional[int] = None
    location: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None


class RecallStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    UNKNOWN = "unknown"


class Recall(BaseModel):
    campaign_id: str
    component: str
    summary: str
    consequence: Optional[str] = None
    remedy: Optional[str] = None
    status: RecallStatus
    recall_date: Optional[str] = None
    source: str


class RiskSeverity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RiskFlag(BaseModel):
    severity: RiskSeverity
    category: str
    description: str
    source: str


class CoverageMap(BaseModel):
    identity: str = "not_available"
    ownership_history: str = "not_available"
    accident_history: str = "not_available"
    title_status: str = "not_available"
    recall_status: str = "not_available"
    service_records: str = "not_available"
    obd_scan: str = "not_available"
    telematics: str = "not_available"


class VehicleReport(BaseModel):
    vin: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    identity: Optional[VehicleIdentity] = None
    events: List[HistoryEvent] = []
    recalls: List[Recall] = []
    open_recall_count: int = 0
    risk_flags: List[RiskFlag] = []
    confidence_score: float = Field(0.0, ge=0.0, le=100.0)
    coverage_map: CoverageMap = Field(default_factory=CoverageMap)
    buyer_summary: str = ""
    data_gaps: List[str] = []
    sources_queried: List[str] = []
    sources_available: List[str] = []

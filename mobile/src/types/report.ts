export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export interface DataPoint {
  value: unknown;
  source: string;
  fetched_at: string;
  confidence: ConfidenceLevel;
  note?: string;
}

export interface VehicleIdentity {
  vin: string;
  year?: DataPoint;
  make?: DataPoint;
  model?: DataPoint;
  trim?: DataPoint;
  body_style?: DataPoint;
  engine?: DataPoint;
  transmission?: DataPoint;
  drive_type?: DataPoint;
  plant_country?: DataPoint;
}

export type EventType =
  | "ownership_change"
  | "accident"
  | "service"
  | "recall_repair"
  | "title_brand"
  | "odometer"
  | "auction"
  | "insurance_claim";

export interface HistoryEvent {
  event_type: EventType;
  date?: string;
  description: string;
  source: string;
  source_confidence: ConfidenceLevel;
  odometer?: number;
  location?: string;
}

export type RecallStatus = "open" | "closed" | "unknown";

export interface Recall {
  campaign_id: string;
  component: string;
  summary: string;
  consequence?: string;
  remedy?: string;
  status: RecallStatus;
  recall_date?: string;
  source: string;
}

export type RiskSeverity = "high" | "medium" | "low";

export interface RiskFlag {
  severity: RiskSeverity;
  category: string;
  description: string;
  source: string;
}

export interface CoverageMap {
  identity: string;
  ownership_history: string;
  accident_history: string;
  title_status: string;
  recall_status: string;
  service_records: string;
  obd_scan: string;
  telematics: string;
}

export interface VehicleReport {
  vin: string;
  generated_at: string;
  identity?: VehicleIdentity;
  events: HistoryEvent[];
  recalls: Recall[];
  open_recall_count: number;
  risk_flags: RiskFlag[];
  confidence_score: number;
  coverage_map: CoverageMap;
  buyer_summary: string;
  data_gaps: string[];
  sources_queried: string[];
  sources_available: string[];
}

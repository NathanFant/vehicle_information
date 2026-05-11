const BASE = import.meta.env.VITE_API_URL ?? "https://vehicle-information-nathanfants-projects.vercel.app";

export async function lookupVin(vin: string): Promise<VehicleReport> {
  const res = await fetch(`${BASE}/vin/${vin.toUpperCase().trim()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Server error ${res.status}`);
  }
  return res.json();
}

export async function lookupPlate(state: string, plate: string): Promise<{ vin: string }> {
  const res = await fetch(`${BASE}/plate/${encodeURIComponent(state)}/${encodeURIComponent(plate.toUpperCase().trim())}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Server error ${res.status}`);
  }
  return res.json();
}

export interface FieldValue {
  value: string | null;
  source: string;
  confidence: "high" | "medium" | "low";
  note?: string | null;
}

export interface VehicleIdentity {
  vin: string;
  year: FieldValue | null;
  make: FieldValue | null;
  model: FieldValue | null;
  trim: FieldValue | null;
  body_style: FieldValue | null;
  engine: FieldValue | null;
  transmission: FieldValue | null;
  drive_type: FieldValue | null;
  plant_country: FieldValue | null;
}

export interface RiskFlag {
  flag: string;
  severity: "high" | "medium" | "low";
  detail: string;
  source: string;
}

export interface Recall {
  campaign_number: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string | null;
  status: "open" | "closed" | "unknown";
}

export interface HistoryEvent {
  date: string | null;
  event_type: string;
  description: string;
  odometer: number | null;
  location: string | null;
  source: string;
}

export interface VehicleReport {
  vin: string;
  generated_at: string;
  identity: VehicleIdentity | null;
  confidence_score: number;
  buyer_summary: string;
  risk_flags: RiskFlag[];
  recalls: Recall[];
  open_recall_count: number;
  events: HistoryEvent[];
  data_gaps: string[];
  sources_queried: string[];
  sources_available: string[];
  coverage_map: Record<string, string>;
}

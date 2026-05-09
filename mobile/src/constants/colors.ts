export const Colors = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceElevated: "#273449",
  border: "#334155",
  primary: "#3b82f6",
  primaryDark: "#2563eb",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  white: "#ffffff",
} as const;

export const RiskColors = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
} as const;

export const EventTypeColors: Record<string, string> = {
  accident: "#ef4444",
  ownership_change: "#3b82f6",
  service: "#22c55e",
  recall_repair: "#f59e0b",
  title_brand: "#ef4444",
  odometer: "#8b5cf6",
  auction: "#f97316",
  insurance_claim: "#ec4899",
};

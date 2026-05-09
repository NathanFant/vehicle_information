import { useState, useCallback } from "react";
import type { VehicleReport } from "../types/report";

// Development: use 10.0.2.2 for Android emulator, localhost for web/iOS sim
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

interface UseLookupResult {
  report: VehicleReport | null;
  loading: boolean;
  error: string | null;
  lookup: (vin: string) => Promise<void>;
  reset: () => void;
}

export function useVinLookup(): UseLookupResult {
  const [report, setReport] = useState<VehicleReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (vin: string) => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch(`${API_BASE}/vin/${vin.toUpperCase().trim()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setReport(json as VehicleReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error — check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReport(null);
    setError(null);
    setLoading(false);
  }, []);

  return { report, loading, error, lookup, reset };
}

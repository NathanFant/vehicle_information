import type { VehicleReport } from "../types/report.js";

interface CacheEntry {
  report: VehicleReport;
  expires_at: number;
}

// In-memory cache. Replace with Redis in production.
const cache = new Map<string, CacheEntry>();

// NHTSA data is stable; event history can change daily.
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function getCached(vin: string): VehicleReport | null {
  const entry = cache.get(vin);
  if (!entry) return null;
  if (Date.now() > entry.expires_at) {
    cache.delete(vin);
    return null;
  }
  return entry.report;
}

export function setCached(vin: string, report: VehicleReport): void {
  cache.set(vin, { report, expires_at: Date.now() + TTL_MS });
}

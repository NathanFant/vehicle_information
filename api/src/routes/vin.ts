import { Hono } from "hono";
import { getCached, setCached } from "../cache/vin-cache.js";
import type { VehicleReport } from "../types/report.js";

const INTELLIGENCE_BASE = process.env.INTELLIGENCE_URL ?? "http://localhost:8000";
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

const vin = new Hono();

vin.get("/:vin", async (c) => {
  const rawVin = c.req.param("vin").toUpperCase().trim();

  if (!VIN_RE.test(rawVin)) {
    return c.json({ error: "Invalid VIN — must be 17 characters, no I/O/Q." }, 422);
  }

  const cached = getCached(rawVin);
  if (cached) {
    return c.json({ ...cached, _cached: true });
  }

  let report: VehicleReport;
  try {
    const upstream = await fetch(`${INTELLIGENCE_BASE}/vin/${rawVin}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) {
      const body = await upstream.text();
      return c.json({ error: "Intelligence service error", detail: body }, upstream.status);
    }
    report = (await upstream.json()) as VehicleReport;
  } catch (err) {
    return c.json({ error: "Intelligence service unreachable", detail: String(err) }, 503);
  }

  setCached(rawVin, report);
  return c.json(report);
});

vin.post("/:vin/obd", async (c) => {
  const rawVin = c.req.param("vin").toUpperCase().trim();
  if (!VIN_RE.test(rawVin)) {
    return c.json({ error: "Invalid VIN" }, 422);
  }

  const body = await c.req.json().catch(() => ({}));

  let report: VehicleReport;
  try {
    const upstream = await fetch(`${INTELLIGENCE_BASE}/vin/${rawVin}/obd`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return c.json({ error: "Intelligence service error", detail: text }, upstream.status);
    }
    report = (await upstream.json()) as VehicleReport;
  } catch (err) {
    return c.json({ error: "Intelligence service unreachable", detail: String(err) }, 503);
  }

  // Don't cache OBD-augmented reports — each scan is unique
  return c.json(report);
});

export default vin;

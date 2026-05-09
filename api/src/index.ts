import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import vinRoutes from "./routes/vin.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok", service: "vehicle-history-gateway" }));

app.route("/api/vin", vinRoutes);

const port = Number(process.env.PORT ?? 3001);

console.log(`Vehicle History Gateway starting on :${port}`);
serve({ fetch: app.fetch, port });

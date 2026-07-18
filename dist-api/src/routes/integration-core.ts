/**
 * Integration Core Routes — Phase 3A
 *
 * GET  /api/integration-core/registry   — full registry snapshot (all adapters)
 * GET  /api/integration-core/activity   — recent cross-category activity log
 * GET  /api/integration-core/metrics    — per-integration latency/retry snapshot
 * POST /api/integration-core/:id/test   — manual on-demand connection test
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { integrationRegistry } from "../services/integration-core/registry.js";
import { integrationActivityLogger } from "../services/integration-core/activity-logger.js";
import { metricsCollector } from "../services/integration-core/metrics-collector.js";
import { bootstrapIntegrationCore } from "../services/integration-core/bootstrap.js";

bootstrapIntegrationCore();

const router: IRouter = Router();

// ── GET /api/integration-core/registry ─────────────────────────────────────

router.get("/integration-core/registry", (_req: Request, res: Response) => {
  res.json({
    integrations: integrationRegistry.getAll(),
    summary:      integrationRegistry.getSummary(),
    timestamp:    new Date().toISOString(),
  });
});

// ── GET /api/integration-core/activity ─────────────────────────────────────

router.get("/integration-core/activity", (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
  res.json({ activity: integrationActivityLogger.getRecent(limit) });
});

// ── GET /api/integration-core/metrics ──────────────────────────────────────

router.get("/integration-core/metrics", (_req: Request, res: Response) => {
  res.json({ metrics: metricsCollector.getAllSnapshots() });
});

// ── POST /api/integration-core/:id/test ────────────────────────────────────

router.post("/integration-core/:id/test", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const result = await integrationRegistry.runTest(id);
    res.json({ ok: true, id, result, entry: integrationRegistry.getEntry(id) });
  } catch (err: any) {
    req.log.error({ err, id }, "integration-core/test failed");
    res.status(400).json({ error: err.message });
  }
});

export default router;

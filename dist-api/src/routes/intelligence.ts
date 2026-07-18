/**
 * Intelligence Routes — Phase 2 service layer endpoints.
 *
 * GET  /api/intelligence/status              — all provider infos + scheduler + jobs
 * GET  /api/intelligence/health              — run live health checks (slow, ~5s)
 * GET  /api/intelligence/logs                — recent request logs
 * GET  /api/intelligence/logs/stats          — aggregated log statistics
 * GET  /api/intelligence/jobs                — background job queue
 * POST /api/intelligence/jobs/:id/run        — trigger a job
 * GET  /api/intelligence/scheduler           — scheduled task list
 * POST /api/intelligence/scheduler/:id/run   — manual trigger
 * POST /api/intelligence/cache/clear         — flush AI router cache
 * POST /api/intelligence/command             — AI Command Bar (smart routing)
 * GET  /api/intelligence/notifications       — recent notifications
 * POST /api/intelligence/notifications/:id/read — mark notification read
 * GET  /api/intelligence/secrets             — which secrets are configured (no values)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { providerManager } from "../services/provider-manager.js";
import { aiRouter } from "../services/ai-router.js";
import { intelligenceLogger } from "../services/intelligence-logger.js";
import { notificationService } from "../services/notification-service.js";
import { jobQueue } from "../services/job-queue.js";
import { scheduler } from "../services/scheduler.js";
import { secretsManager } from "../services/secrets-manager.js";

const router: IRouter = Router();

// ── GET /api/intelligence/status ───────────────────────────────────────────

router.get("/intelligence/status", (_req: Request, res: Response) => {
  const summary     = providerManager.getStatusSummary();
  const routerStats = aiRouter.getStats();
  const logStats    = intelligenceLogger.getStats();
  const jobs        = jobQueue.getStats();
  const scheduledJobs = scheduler.getJobs();
  const secrets     = secretsManager.getStatuses();
  const notifications = notificationService.getRecent(10);

  res.json({
    providers:        summary.providers,
    lastHealthRun:    summary.lastHealthRun,
    configuredCount:  summary.configuredCount,
    connectedCount:   summary.connectedCount,
    router:           routerStats,
    logs:             logStats,
    jobs,
    scheduler:        scheduledJobs,
    secrets:          secrets.map(({ envVar: _, ...rest }) => rest), // strip env var names
    notifications,
    timestamp:        new Date().toISOString(),
  });
});

// ── GET /api/intelligence/health ───────────────────────────────────────────
// Triggers live health checks across all providers (~5 seconds)

router.get("/intelligence/health", async (req: Request, res: Response) => {
  try {
    const reports = await providerManager.runHealthChecks();
    res.json({ reports, timestamp: new Date().toISOString() });
  } catch (err: any) {
    req.log.error({ err }, "intelligence/health failed");
    res.status(500).json({ error: "Health check failed" });
  }
});

// ── GET /api/intelligence/logs ─────────────────────────────────────────────

router.get("/intelligence/logs", (req: Request, res: Response) => {
  const limit  = Math.min(Number(req.query["limit"] ?? 50), 200);
  const logs   = intelligenceLogger.getRecent(limit);
  res.json({ logs, total: logs.length });
});

// ── GET /api/intelligence/logs/stats ──────────────────────────────────────

router.get("/intelligence/logs/stats", (_req: Request, res: Response) => {
  res.json(intelligenceLogger.getStats());
});

// ── GET /api/intelligence/jobs ─────────────────────────────────────────────

router.get("/intelligence/jobs", (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
  res.json({
    jobs:  jobQueue.getRecent(limit),
    stats: jobQueue.getStats(),
  });
});

// ── POST /api/intelligence/jobs/:id/run ───────────────────────────────────

router.post("/intelligence/jobs/:id/run", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    await jobQueue.runNow(id);
    res.json({ ok: true, job: jobQueue.get(id) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/intelligence/scheduler ───────────────────────────────────────

router.get("/intelligence/scheduler", (_req: Request, res: Response) => {
  res.json({ tasks: scheduler.getJobs() });
});

// ── POST /api/intelligence/scheduler/:id/run ──────────────────────────────

router.post("/intelligence/scheduler/:id/run", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    await scheduler.runNow(id);
    res.json({ ok: true, task: scheduler.getJob(id) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/intelligence/cache/clear ────────────────────────────────────

router.post("/intelligence/cache/clear", (_req: Request, res: Response) => {
  aiRouter.clearCache();
  res.json({ ok: true, message: "AI router cache cleared" });
});

// ── POST /api/intelligence/command ────────────────────────────────────────
// AI Command Bar — smart routing with intent detection

router.post("/intelligence/command", async (req: Request, res: Response) => {
  const { command, preferredProvider } = req.body as {
    command?: string;
    preferredProvider?: string;
  };

  if (!command?.trim()) {
    res.status(400).json({ error: "command is required" }); return;
  }

  const systemPrompt = `You are TLIS — TikTok Luxury Intelligence System. 
You are a world-class luxury content strategist and TikTok intelligence engine.
Respond with actionable, specific intelligence. Format your response clearly.
Focus on luxury niches: quiet luxury, old money, capsule wardrobes, fine fragrances, luxury travel.
Be concise, confident, and luxury-brand-appropriate in tone.`;

  try {
    const result = await aiRouter.generate(command.trim(), {
      preferredProvider,
      opts: {
        systemPrompt,
        maxTokens: 800,
        temperature: 0.8,
      },
      requestType: "command",
      noCache: true,
    });

    res.json({
      response: result.text,
      provider: result.provider,
      model:    result.model,
      latencyMs: result.latencyMs,
    });
  } catch (err: any) {
    req.log.error({ err }, "intelligence/command failed");
    res.status(500).json({ error: "Command processing failed. Try again." });
  }
});

// ── GET /api/intelligence/notifications ───────────────────────────────────

router.get("/intelligence/notifications", (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
  res.json({
    notifications: notificationService.getRecent(limit),
    unreadCount:   notificationService.unreadCount(),
  });
});

// ── POST /api/intelligence/notifications/:id/read ─────────────────────────

router.post("/intelligence/notifications/:id/read", (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const ok = notificationService.markRead(id);
  res.json({ ok });
});

// ── POST /api/intelligence/notifications/read-all ─────────────────────────

router.post("/intelligence/notifications/read-all", (_req: Request, res: Response) => {
  notificationService.markAllRead();
  res.json({ ok: true });
});

// ── GET /api/intelligence/secrets ─────────────────────────────────────────

router.get("/intelligence/secrets", (_req: Request, res: Response) => {
  const statuses = secretsManager.getStatuses();
  res.json({
    secrets: statuses.map(({ envVar: _, ...rest }) => rest),
    summary: secretsManager.getSummary(),
  });
});

// ── GET /api/intelligence/router/stats ────────────────────────────────────

router.get("/intelligence/router/stats", (_req: Request, res: Response) => {
  res.json(aiRouter.getStats());
});

export default router;

/**
 * Background Scheduler — periodic refresh for all intelligence providers.
 *
 * Each task runs on a configurable interval (5m, 15m, 30m, 1h, or manual).
 * Tasks are lightweight — they just warm the caches in each service so the
 * next client request gets a fresh result instantly.
 *
 * Usage:
 *   scheduler.getJobs()          → ScheduledTask[]
 *   scheduler.runNow("trends")   → triggers immediately
 *   scheduler.setInterval("trends", 15 * 60_000)
 */

import { logger } from "../lib/logger.js";
import { notificationService } from "./notification-service.js";
import { jobQueue } from "./job-queue.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type ScheduleInterval = 5 | 15 | 30 | 60 | "manual";

export interface ScheduledTask {
  id:          string;
  name:        string;
  intervalMs:  number | null;
  lastRunAt?:  string;
  nextRunAt?:  string;
  lastStatus?: "success" | "error";
  lastError?:  string;
  runCount:    number;
  enabled:     boolean;
}

type TaskFn = () => Promise<void>;

interface TaskEntry {
  task:       ScheduledTask;
  fn:         TaskFn;
  timer?:     ReturnType<typeof setInterval>;
}

// ── Scheduler ─────────────────────────────────────────────────────────────

class Scheduler {
  private readonly entries = new Map<string, TaskEntry>();

  /**
   * Register a recurring task. Call once at startup.
   * @param intervalMinutes — pass null for manual-only tasks
   */
  register(
    id: string,
    name: string,
    fn: TaskFn,
    intervalMinutes: number | null = null,
  ): void {
    const intervalMs = intervalMinutes ? intervalMinutes * 60_000 : null;

    const task: ScheduledTask = {
      id,
      name,
      intervalMs,
      runCount: 0,
      enabled:  intervalMs !== null,
      nextRunAt: intervalMs
        ? new Date(Date.now() + intervalMs).toISOString()
        : undefined,
    };

    const entry: TaskEntry = { task, fn };
    this.entries.set(id, entry);

    if (intervalMs) {
      entry.timer = setInterval(() => this.execute(id), intervalMs);
      logger.info({ id, intervalMs }, "scheduler: task registered");
    } else {
      logger.info({ id }, "scheduler: manual task registered");
    }
  }

  async runNow(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Scheduler task '${id}' not found`);
    await this.execute(id);
  }

  setInterval(id: string, intervalMinutes: number): void {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Scheduler task '${id}' not found`);

    if (entry.timer) clearInterval(entry.timer);

    const intervalMs = intervalMinutes * 60_000;
    entry.task.intervalMs = intervalMs;
    entry.task.enabled    = true;
    entry.task.nextRunAt  = new Date(Date.now() + intervalMs).toISOString();
    entry.timer = setInterval(() => this.execute(id), intervalMs);
    logger.info({ id, intervalMinutes }, "scheduler: interval updated");
  }

  disable(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (entry.timer) clearInterval(entry.timer);
    entry.task.enabled   = false;
    entry.task.nextRunAt = undefined;
  }

  getJobs(): ScheduledTask[] {
    return [...this.entries.values()].map(e => ({ ...e.task }));
  }

  getJob(id: string): ScheduledTask | undefined {
    return this.entries.get(id) ? { ...this.entries.get(id)!.task } : undefined;
  }

  private async execute(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) return;

    const { task, fn } = entry;
    const start = Date.now();
    logger.debug({ id }, "scheduler: running task");

    try {
      await fn();
      task.lastRunAt  = new Date().toISOString();
      task.lastStatus = "success";
      task.lastError  = undefined;
      task.runCount++;
      if (task.intervalMs) {
        task.nextRunAt = new Date(Date.now() + task.intervalMs).toISOString();
      }
      logger.info({ id, latencyMs: Date.now() - start }, "scheduler: task completed");
    } catch (err: any) {
      task.lastRunAt  = new Date().toISOString();
      task.lastStatus = "error";
      task.lastError  = String(err?.message ?? err);
      task.runCount++;
      logger.error({ id, err }, "scheduler: task failed");
      notificationService.push("error", `Scheduler: ${task.name} failed`,
        task.lastError, { severity: "warning" });
    }

    // Also enqueue as a job for the job queue UI
    jobQueue.enqueue(`[Scheduled] ${task.name}`, async () => {
      // job already ran — just record it as immediate completion
    }, { priority: 3 });
  }
}

export const scheduler = new Scheduler();

// ── Boot-time task registration ────────────────────────────────────────────
// Lazy imports to avoid circular dependencies at module load time.

async function registerTasks(): Promise<void> {
  const { getLuxurySummary }       = await import("./google-trends.js");
  const { getLuxuryRedditSummary } = await import("./reddit.js");
  const { getAhrefsIntelligence }  = await import("./ahrefs.js");
  const { getSearchAnalytics }     = await import("./search-console.js");
  const { providerManager }        = await import("./provider-manager.js");

  // Google Trends — refresh every 15 minutes
  scheduler.register("trends", "Google Trends Refresh",
    async () => { await getLuxurySummary(logger); },
    15,
  );

  // Reddit — refresh every 30 minutes
  scheduler.register("reddit", "Reddit Intelligence Refresh",
    async () => { await getLuxuryRedditSummary(logger); },
    30,
  );

  // Ahrefs SEO — refresh every 30 minutes
  scheduler.register("ahrefs", "Ahrefs SEO Refresh",
    async () => { await getAhrefsIntelligence(logger); },
    30,
  );

  // Search Console — refresh every 60 minutes
  scheduler.register("search-console", "Search Console Refresh",
    async () => { await getSearchAnalytics(logger); },
    60,
  );

  // AI Provider health — every 10 minutes
  scheduler.register("ai-health", "AI Provider Health Check",
    async () => { await providerManager.runHealthChecks(); },
    10,
  );

  // Executive Brief — every 60 minutes (manual only for now)
  scheduler.register("executive-brief", "Executive Brief Generation", async () => {}, null);

  logger.info("scheduler: all tasks registered");
}

// Run after a brief delay so all modules finish initialising
setTimeout(() => registerTasks().catch(err => {
  logger.error({ err }, "scheduler: failed to register tasks");
}), 3_000);

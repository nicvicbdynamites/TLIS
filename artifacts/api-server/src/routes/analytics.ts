import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ── GET /api/analytics/dashboard ──────────────────────────────────────────
router.get("/analytics/dashboard", async (_req: Request, res: Response) => {
  try {
    // 1. Fetch Calendar Posts aggregation
    const calendarQuery = `
      SELECT 
        status,
        platform,
        niche,
        COUNT(*)::integer as count
      FROM public.calendar_posts
      GROUP BY status, platform, niche
    `;
    const calendarRes = await pool.query(calendarQuery);

    // 2. Fetch User Profile aggregation
    const profilesQuery = `
      SELECT 
        plan,
        COUNT(*)::integer as count,
        SUM(credits_used)::integer as total_credits_used,
        SUM(credits_limit)::integer as total_credits_limit
      FROM public.profiles
      GROUP BY plan
    `;
    const profilesRes = await pool.query(profilesQuery);

    // 3. Fetch Telemetry Stats (AI Requests) if table exists
    let telemetryStats = { totalRequests: 0, totalCostUsd: 0, avgLatencyMs: 0 };
    try {
      const telemetryQuery = `
        SELECT 
          COUNT(*)::integer as total_requests,
          COALESCE(SUM(cost_usd), 0)::double precision as total_cost,
          COALESCE(AVG(latency_ms), 0)::integer as avg_latency
        FROM ai_requests
      `;
      const telemetryRes = await pool.query(telemetryQuery);
      if (telemetryRes.rows.length > 0) {
        telemetryStats = {
          totalRequests: telemetryRes.rows[0].total_requests,
          totalCostUsd: telemetryRes.rows[0].total_cost,
          avgLatencyMs: telemetryRes.rows[0].avg_latency,
        };
      }
    } catch {
      // Table may not exist yet, fallback
    }

    // 4. Fetch daily cost tracking trend if table exists
    let dailyCosts: Array<{ day: string; cost: number; requests: number }> = [];
    try {
      const dailyQuery = `
        SELECT 
          day,
          COALESCE(SUM(total_cost_usd), 0)::double precision as cost,
          COALESCE(SUM(total_requests), 0)::integer as requests
        FROM ai_cost_tracking
        GROUP BY day
        ORDER BY day DESC
        LIMIT 14
      `;
      const dailyRes = await pool.query(dailyQuery);
      dailyCosts = dailyRes.rows.map((row: any) => ({
        day: row.day,
        cost: row.cost,
        requests: row.requests,
      })).reverse();
    } catch {
      // Table may not exist yet
    }

    // Aggregate posts by status
    const statusCounts: Record<string, number> = { draft: 0, scheduled: 0, posted: 0, viral: 0 };
    const platformCounts: Record<string, number> = {};
    const nicheCounts: Record<string, number> = {};

    calendarRes.rows.forEach((row: any) => {
      const { status, platform, niche, count } = row;
      if (status && statusCounts[status] !== undefined) {
        statusCounts[status] += count;
      }
      if (platform) {
        platformCounts[platform] = (platformCounts[platform] || 0) + count;
      }
      if (niche) {
        nicheCounts[niche] = (nicheCounts[niche] || 0) + count;
      }
    });

    res.json({
      success: true,
      summary: {
        totalPosts: calendarRes.rows.reduce((sum: number, r: any) => sum + r.count, 0),
        status: statusCounts,
        platforms: platformCounts,
        niches: nicheCounts,
      },
      profiles: profilesRes.rows,
      telemetry: telemetryStats,
      costTrend: dailyCosts,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch analytics dashboard data");
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;

/**
 * Integration Core Bootstrap — registers every adapter (AI/research/stub)
 * into the registry and wires the two supporting scheduler tasks:
 *
 *  - "integration-ai-sync" (10m): cache-only refresh of AI entries. AI health
 *    checks themselves still run exactly once, driven by the existing
 *    scheduler "ai-health" task via providerManager — this task never calls
 *    provider.health() itself, it only mirrors already-computed state.
 *  - "provider-health" (5m): live health sweep for research + stub adapters
 *    only (excludes "ai" — see above).
 *
 * Idempotent — safe to call multiple times (e.g. if the route module is
 * ever imported twice); only the first call has any effect.
 */

import { logger } from "../../lib/logger.js";
import { scheduler } from "../scheduler.js";
import { secretsManager } from "../secrets-manager.js";
import {
  geminiProvider, openAIProvider, claudeProvider,
  deepSeekProvider, grokProvider, mistralProvider,
} from "../intelligence/index.js";
import { integrationRegistry } from "./registry.js";
import { AiAdapter } from "./adapters/ai-adapter.js";
import { ResearchAdapter } from "./adapters/research-adapter.js";
import { StubAdapter } from "./adapters/stub-adapter.js";

let bootstrapped = false;

export function bootstrapIntegrationCore(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  registerAiAdapters();
  void registerResearchAdapters();
  registerStubAdapters();
  registerSchedulerTasks();

  logger.info("integration-core: bootstrap complete");
}

function registerAiAdapters(): void {
  [geminiProvider, openAIProvider, claudeProvider, deepSeekProvider, grokProvider, mistralProvider]
    .forEach(p => integrationRegistry.register(new AiAdapter(p)));
}

async function registerResearchAdapters(): Promise<void> {
  const { getLuxurySummary }       = await import("../google-trends.js");
  const { getLuxuryRedditSummary } = await import("../reddit.js");
  const { getAhrefsIntelligence }  = await import("../ahrefs.js");
  const { getSearchAnalytics }     = await import("../search-console.js");

  integrationRegistry.register(new ResearchAdapter({
    id: "google-trends", name: "Google Trends", priority: 10,
    isConfigured: () => true,
    fetchSummary: log => getLuxurySummary(log),
    deriveStatus: r => ({ success: r.source !== "fallback", message: `source: ${r.source}` }),
  }));

  integrationRegistry.register(new ResearchAdapter({
    id: "reddit", name: "Reddit", priority: 11,
    isConfigured: () => secretsManager.isConfigured("reddit_id") && secretsManager.isConfigured("reddit_secret"),
    fetchSummary: log => getLuxuryRedditSummary(log),
    deriveStatus: r => ({ success: r.source !== "fallback", message: `source: ${r.source}` }),
  }));

  integrationRegistry.register(new ResearchAdapter({
    id: "ahrefs", name: "Ahrefs", priority: 12,
    isConfigured: () => secretsManager.isConfigured("ahrefs"),
    fetchSummary: log => getAhrefsIntelligence(log),
    deriveStatus: r => ({ success: r.source === "live" || r.source === "cached", message: `source: ${r.source}` }),
  }));

  integrationRegistry.register(new ResearchAdapter({
    id: "search-console", name: "Google Search Console", priority: 13,
    isConfigured: () => secretsManager.isConfigured("google_search"),
    fetchSummary: log => getSearchAnalytics(log),
    deriveStatus: r => ({ success: r.source === "live" || r.source === "cached", message: `source: ${r.source}` }),
  }));
}

function registerStubAdapters(): void {
  integrationRegistry.register(new StubAdapter({
    id: "semrush", name: "SEMrush", category: "research", priority: 20, secretKeys: ["semrush"],
  }));
  integrationRegistry.register(new StubAdapter({
    id: "tiktok", name: "TikTok", category: "social", priority: 30, secretKeys: ["tiktok"],
  }));
  integrationRegistry.register(new StubAdapter({
    id: "instagram", name: "Instagram", category: "social", priority: 31, secretKeys: ["instagram"],
  }));
  integrationRegistry.register(new StubAdapter({
    id: "youtube", name: "YouTube", category: "social", priority: 32, secretKeys: ["youtube"],
  }));
  integrationRegistry.register(new StubAdapter({
    id: "pinterest", name: "Pinterest", category: "social", priority: 33, secretKeys: ["pinterest"],
  }));
}

function registerSchedulerTasks(): void {
  scheduler.register(
    "integration-ai-sync", "Integration Core: AI Registry Sync",
    async () => { await integrationRegistry.refreshCategory("ai"); },
    10,
  );

  scheduler.register(
    "provider-health", "Integration Core: Provider Health Sweep",
    async () => { await integrationRegistry.refreshAllExcept(["ai"]); },
    5,
  );

  // Scheduler tasks only fire on their first interval boundary (10m / 5m), so
  // without a warm-up the registry would show every entry as "initializing"
  // for several minutes after every boot. Mirror provider-manager's own
  // pattern with one-time, cache-cheap warm-up reads shortly after startup.
  setTimeout(() => { integrationRegistry.refreshCategory("ai").catch(() => {}); }, 6_000);
  setTimeout(() => { integrationRegistry.refreshAllExcept(["ai"]).catch(() => {}); }, 7_000);
}

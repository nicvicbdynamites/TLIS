/**
 * Integration Activity Logger — bounded ring buffer of activity events across
 * ALL integration categories (ai/research/social), surfaced via
 * GET /api/integration-core/activity for the Integration Hub's log panel.
 *
 * Note: this is a separate ledger from `intelligenceLogger` (which only
 * records AI generate/analyze calls for the Intelligence Service Layer). It
 * does not replace or duplicate that state — it captures a different view
 * (integration-level connection/health events) for a different UI surface.
 */

import type { IntegrationCategory } from "./types.js";

export interface IntegrationActivityEntry {
  id:            string;
  timestamp:     string;
  integrationId: string;
  category:      IntegrationCategory;
  action:        string;
  status:        "success" | "error" | "info" | "warning";
  detail?:       string;
  latencyMs?:    number;
}

class IntegrationActivityLogger {
  private readonly entries: IntegrationActivityEntry[] = [];
  private readonly maxEntries = 300;

  record(entry: Omit<IntegrationActivityEntry, "id" | "timestamp">): IntegrationActivityEntry {
    const full: IntegrationActivityEntry = {
      ...entry,
      id:        crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.entries.unshift(full);
    if (this.entries.length > this.maxEntries) this.entries.splice(this.maxEntries);
    return full;
  }

  getRecent(n = 50): IntegrationActivityEntry[] {
    return this.entries.slice(0, n);
  }
}

export const integrationActivityLogger = new IntegrationActivityLogger();

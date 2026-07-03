/**
 * AI Orchestration schema (Phase 4A) — server-only telemetry for the AI
 * Provider Manager / AI Router. The browser never touches these tables
 * directly; they're written by `ai-persistence.ts` in api-server as a
 * fire-and-forget mirror of what's already tracked in-memory by
 * `intelligenceLogger` and `providerManager`.
 *
 * This is a separate Postgres database (Drizzle) from the app's Supabase
 * instance — do not conflate the two.
 */

import { pgTable, serial, text, integer, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── ai_requests — one row per completed AI Router request ──────────────────

export const aiRequestsTable = pgTable("ai_requests", {
  id:           serial("id").primaryKey(),
  provider:     text("provider").notNull(),
  model:        text("model"),
  requestType:  text("request_type").notNull().default("generate"),
  status:       text("status").notNull(), // "success" | "error" | "cached"
  promptPreview: text("prompt_preview"), // first ~300 chars only, never full payloads
  inputTokens:  integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd:      doublePrecision("cost_usd"),
  latencyMs:    integer("latency_ms").notNull(),
  error:        text("error"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiRequestSchema = createInsertSchema(aiRequestsTable).omit({ id: true, createdAt: true });
export type InsertAiRequest = z.infer<typeof insertAiRequestSchema>;
export type AiRequest = typeof aiRequestsTable.$inferSelect;

// ── ai_provider_usage — running per-provider aggregate (one row per provider) ─

export const aiProviderUsageTable = pgTable("ai_provider_usage", {
  id:                serial("id").primaryKey(),
  provider:          text("provider").notNull().unique(),
  totalRequests:     integer("total_requests").notNull().default(0),
  totalInputTokens:  integer("total_input_tokens").notNull().default(0),
  totalOutputTokens: integer("total_output_tokens").notNull().default(0),
  totalCostUsd:      doublePrecision("total_cost_usd").notNull().default(0),
  avgLatencyMs:      integer("avg_latency_ms").notNull().default(0),
  successRate:       integer("success_rate").notNull().default(0), // 0-100
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiProviderUsageSchema = createInsertSchema(aiProviderUsageTable).omit({ id: true, updatedAt: true });
export type InsertAiProviderUsage = z.infer<typeof insertAiProviderUsageSchema>;
export type AiProviderUsage = typeof aiProviderUsageTable.$inferSelect;

// ── ai_provider_health — health-check history ───────────────────────────────

export const aiProviderHealthTable = pgTable("ai_provider_health", {
  id:        serial("id").primaryKey(),
  provider:  text("provider").notNull(),
  status:    text("status").notNull(),
  latencyMs: integer("latency_ms"),
  model:     text("model"),
  error:     text("error"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiProviderHealthSchema = createInsertSchema(aiProviderHealthTable).omit({ id: true, checkedAt: true });
export type InsertAiProviderHealth = z.infer<typeof insertAiProviderHealthSchema>;
export type AiProviderHealth = typeof aiProviderHealthTable.$inferSelect;

// ── ai_models — known model catalog per provider ────────────────────────────

export const aiModelsTable = pgTable("ai_models", {
  id:             serial("id").primaryKey(),
  provider:       text("provider").notNull(),
  modelId:        text("model_id").notNull(),
  label:          text("label"),
  contextWindow:  integer("context_window"),
  supportsImages: boolean("supports_images").notNull().default(false),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiModelSchema = createInsertSchema(aiModelsTable).omit({ id: true, updatedAt: true });
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type AiModel = typeof aiModelsTable.$inferSelect;

// ── ai_cost_tracking — daily cost rollups per provider+model ────────────────

export const aiCostTrackingTable = pgTable("ai_cost_tracking", {
  id:                serial("id").primaryKey(),
  provider:          text("provider").notNull(),
  model:             text("model"),
  day:               text("day").notNull(), // "YYYY-MM-DD" (UTC) bucket
  totalRequests:     integer("total_requests").notNull().default(0),
  totalInputTokens:  integer("total_input_tokens").notNull().default(0),
  totalOutputTokens: integer("total_output_tokens").notNull().default(0),
  totalCostUsd:      doublePrecision("total_cost_usd").notNull().default(0),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiCostTrackingSchema = createInsertSchema(aiCostTrackingTable).omit({ id: true, updatedAt: true });
export type InsertAiCostTracking = z.infer<typeof insertAiCostTrackingSchema>;
export type AiCostTracking = typeof aiCostTrackingTable.$inferSelect;

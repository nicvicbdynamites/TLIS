// ────────────────────────────────────────────────────────────────────────────
//  Module 5 — Audit Logging
//
//  Fire-and-forget action trail. Every call is best-effort: audit logging
//  must never block or fail a user-facing action, so every function here
//  swallows its own errors.
// ────────────────────────────────────────────────────────────────────────────

import { supabase, getAuthUserId, getDeviceId } from "./supabase";

export type AuditStatus = "success" | "error" | "pending";

export interface AuditLogEntry {
  id:            string;
  userId:        string | null;
  action:        string;
  module:        string;
  provider:      string;
  durationMs:    number | null;
  status:        AuditStatus;
  tokens:        number | null;
  estimatedCost: number | null;
  createdAt:     string;
}

export interface LogAuditInput {
  action:         string;
  module?:        string;
  provider?:      string;
  durationMs?:    number;
  status?:        AuditStatus;
  tokens?:        number;
  estimatedCost?: number;
  metadata?:      Record<string, unknown>;
}

/** Records an action to the audit trail. Never throws. */
export async function logAudit(input: LogAuditInput): Promise<void> {
  if (!supabase) return;
  try {
    const userId = await getAuthUserId();
    await supabase.from("audit_logs").insert({
      user_id:        userId,
      device_id:      getDeviceId(),
      action:         input.action,
      module:         input.module ?? "",
      provider:       input.provider ?? "",
      duration_ms:    input.durationMs ?? null,
      status:         input.status ?? "success",
      tokens:         input.tokens ?? null,
      estimated_cost: input.estimatedCost ?? null,
      metadata:       input.metadata ?? {},
    });
  } catch {
    // Audit logging is best-effort — never surface a failure to the user.
  }
}

function rowToAuditEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id:            String(row["id"]),
    userId:        row["user_id"] ? String(row["user_id"]) : null,
    action:        String(row["action"] ?? ""),
    module:        String(row["module"] ?? ""),
    provider:      String(row["provider"] ?? ""),
    durationMs:    row["duration_ms"] != null ? Number(row["duration_ms"]) : null,
    status:        (row["status"] as AuditStatus) ?? "success",
    tokens:        row["tokens"] != null ? Number(row["tokens"]) : null,
    estimatedCost: row["estimated_cost"] != null ? Number(row["estimated_cost"]) : null,
    createdAt:     String(row["created_at"] ?? new Date().toISOString()),
  };
}

/** Fetches the current user's most recent audit log entries. */
export async function fetchAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => rowToAuditEntry(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

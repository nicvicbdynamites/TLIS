// ────────────────────────────────────────────────────────────────────────────
//  Module 7 — Settings Danger Zone: data export + user-owned content deletion
//
//  Scope note: the browser only ever holds the anon/authenticated Supabase
//  key, never the service-role key, so a real `auth.users` deletion is not
//  possible from client code. "Delete My Data" therefore removes every row
//  the signed-in user owns across the content tables below (permitted by
//  existing RLS `auth.uid() = user_id` policies), clears local caches, and
//  signs the user out. It intentionally leaves the auth account itself,
//  organization/workspace membership, and audit history untouched — full
//  account closure is a support-assisted action, communicated in the UI.
// ────────────────────────────────────────────────────────────────────────────

import { supabase, getAuthUserId, fetchUserProfile } from "./supabase";
import { fetchOrCreateMyWorkspace } from "./organization";
import { fetchAuditLog } from "./audit";
import { loadVault } from "./vault";
import { loadCalendar } from "./calendar";
import { logAudit } from "./audit";

const OWNED_CONTENT_TABLES = [
  "vault_entries",
  "vault_collections",
  "calendar_posts",
  "ai_generations",
  "saved_outputs",
  "content_packs",
  "tiktok_workspaces",
  "tiktok_accounts",
] as const;

export interface ExportedAccountData {
  exportedAt: string;
  profile: unknown;
  workspace: unknown;
  recentActivity: unknown;
  vault: unknown;
  calendar: unknown;
  cloudTables: Record<string, unknown[]>;
}

/** Gathers all data the signed-in user owns into a single downloadable JSON payload. */
export async function exportAllMyData(userId: string): Promise<ExportedAccountData> {
  const cloudTables: Record<string, unknown[]> = {};

  if (supabase) {
    await Promise.all(
      OWNED_CONTENT_TABLES.map(async (table) => {
        try {
          const { data, error } = await supabase!.from(table).select("*").eq("user_id", userId);
          if (error) throw error;
          cloudTables[table] = data ?? [];
        } catch {
          cloudTables[table] = [];
        }
      })
    );
  }

  const [profile, workspace, recentActivity] = await Promise.all([
    fetchUserProfile(userId).catch(() => null),
    fetchOrCreateMyWorkspace(userId).catch(() => null),
    fetchAuditLog(200).catch(() => []),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile,
    workspace,
    recentActivity,
    vault: loadVault(),
    calendar: loadCalendar(),
    cloudTables,
  };
}

/** Triggers a browser download of the exported data as a JSON file. */
export function downloadExportedData(data: ExportedAccountData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tlis-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface DeleteContentResult {
  success: boolean;
  errors: string[];
}

/**
 * Permanently deletes every row the signed-in user owns across content
 * tables, clears local caches, and logs the action before doing so (the
 * audit_logs table itself is intentionally left intact).
 */
export async function deleteAllMyContent(userId: string): Promise<DeleteContentResult> {
  const errors: string[] = [];
  await logAudit({ action: "Requested deletion of all owned content", module: "settings", status: "pending" });

  if (supabase) {
    for (const table of OWNED_CONTENT_TABLES) {
      try {
        const { error } = await supabase.from(table).delete().eq("user_id", userId);
        if (error) throw error;
      } catch (err) {
        errors.push(`${table}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  try {
    localStorage.removeItem("tlis_vault");
    localStorage.removeItem("tlis_calendar_v1");
  } catch {
    // localStorage may be unavailable (private browsing) — non-fatal.
  }

  const success = errors.length === 0;
  await logAudit({
    action: success ? "Deleted all owned content" : "Deletion of owned content completed with errors",
    module: "settings",
    status: success ? "success" : "error",
  });

  return { success, errors };
}

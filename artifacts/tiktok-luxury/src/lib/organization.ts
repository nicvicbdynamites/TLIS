// ────────────────────────────────────────────────────────────────────────────
//  Module 4 — Organization / Workspace / Members / Projects
//
//  NOTE ON NAMING: this file's `Workspace` type is the org-level container
//  from `supabase-migration-phase3b.sql` (`public.workspaces`). It is a
//  completely different concept from `TikTokWorkspace` in lib/supabase.ts
//  (table `tiktok_workspaces`), which represents a per-account marketing
//  workspace inside module 13's Workspace page. The two are never merged or
//  cross-referenced. Today every account has exactly one organization and
//  one workspace (auto-provisioned on sign-up) — the schema is ready for
//  multi-workspace / multi-member growth without further migrations.
// ────────────────────────────────────────────────────────────────────────────

import { supabase } from "./supabase";
import type { Role } from "./rbac";

export interface Organization {
  id:        string;
  ownerId:   string;
  name:      string;
  slug:      string;
  plan:      "free" | "pro" | "enterprise";
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id:             string;
  organizationId: string;
  name:           string;
  slug:           string;
  createdAt:      string;
  updatedAt:      string;
}

export interface WorkspaceMember {
  id:          string;
  workspaceId: string;
  userId:      string;
  role:        Role;
  createdAt:   string;
}

export interface Project {
  id:          string;
  workspaceId: string;
  name:        string;
  description: string;
  status:      "active" | "paused" | "archived";
  createdAt:   string;
  updatedAt:   string;
}

/** The full picture for the current user's single org/workspace. */
export interface MyWorkspaceContext {
  organization: Organization;
  workspace:    Workspace;
  role:         Role;
  memberCount:  number;
}

function rowToOrg(row: Record<string, unknown>): Organization {
  return {
    id:        String(row["id"]),
    ownerId:   String(row["owner_id"]),
    name:      String(row["name"] ?? "My Organization"),
    slug:      String(row["slug"] ?? ""),
    plan:      (row["plan"] as Organization["plan"]) ?? "free",
    createdAt: String(row["created_at"] ?? new Date().toISOString()),
    updatedAt: String(row["updated_at"] ?? new Date().toISOString()),
  };
}

function rowToWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id:             String(row["id"]),
    organizationId: String(row["organization_id"]),
    name:           String(row["name"] ?? "Default Workspace"),
    slug:           String(row["slug"] ?? ""),
    createdAt:      String(row["created_at"] ?? new Date().toISOString()),
    updatedAt:      String(row["updated_at"] ?? new Date().toISOString()),
  };
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id:          String(row["id"]),
    workspaceId: String(row["workspace_id"]),
    name:        String(row["name"] ?? ""),
    description: String(row["description"] ?? ""),
    status:      (row["status"] as Project["status"]) ?? "active",
    createdAt:   String(row["created_at"] ?? new Date().toISOString()),
    updatedAt:   String(row["updated_at"] ?? new Date().toISOString()),
  };
}

/**
 * Fetches the current user's organization + workspace + role + member count.
 * If the trigger-based auto-provisioning (supabase-migration-phase3b.sql)
 * hasn't run for this account yet — e.g. the migration was applied after
 * this user signed up and the back-fill step was skipped — this function
 * provisions one on the fly so the UI never shows an empty state.
 */
export async function fetchOrCreateMyWorkspace(userId: string): Promise<MyWorkspaceContext | null> {
  if (!supabase) return null;

  try {
    const { data: memberRows, error: memberErr } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, user_id, role, created_at")
      .eq("user_id", userId)
      .limit(1);

    if (!memberErr && memberRows && memberRows.length > 0) {
      const member = memberRows[0] as Record<string, unknown>;
      const workspaceId = String(member["workspace_id"]);

      const { data: wsRow, error: wsErr } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId)
        .single();
      if (wsErr || !wsRow) return null;
      const workspace = rowToWorkspace(wsRow as Record<string, unknown>);

      const { data: orgRow, error: orgErr } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", workspace.organizationId)
        .single();
      if (orgErr || !orgRow) return null;

      const { count } = await supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      return {
        organization: rowToOrg(orgRow as Record<string, unknown>),
        workspace,
        role: ((member["role"] as Role) ?? "owner"),
        memberCount: count ?? 1,
      };
    }

    // No membership found — provision a default org + workspace for this user.
    return await provisionDefaultWorkspace(userId);
  } catch {
    return null;
  }
}

async function provisionDefaultWorkspace(userId: string): Promise<MyWorkspaceContext | null> {
  if (!supabase) return null;
  try {
    const { data: orgRow, error: orgErr } = await supabase
      .from("organizations")
      .insert({ owner_id: userId, name: "My Organization", slug: `org-${userId.slice(0, 8)}` })
      .select()
      .single();
    if (orgErr || !orgRow) return null;
    const organization = rowToOrg(orgRow as Record<string, unknown>);

    const { data: wsRow, error: wsErr } = await supabase
      .from("workspaces")
      .insert({ organization_id: organization.id, name: "Default Workspace", slug: "default" })
      .select()
      .single();
    if (wsErr || !wsRow) return null;
    const workspace = rowToWorkspace(wsRow as Record<string, unknown>);

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: userId, role: "owner" })
      .select()
      .single();

    return { organization, workspace, role: "owner", memberCount: 1 };
  } catch {
    return null;
  }
}

export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id:          String(row["id"]),
    workspaceId: String(row["workspace_id"]),
    userId:      String(row["user_id"]),
    role:        (row["role"] as Role) ?? "viewer",
    createdAt:   String(row["created_at"] ?? new Date().toISOString()),
  }));
}

export async function fetchProjects(workspaceId: string): Promise<Project[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => rowToProject(row as Record<string, unknown>));
}

export async function createProject(
  workspaceId: string,
  name: string,
  description = ""
): Promise<Project | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .insert({ workspace_id: workspaceId, name, description })
    .select()
    .single();
  if (error || !data) return null;
  return rowToProject(data as Record<string, unknown>);
}

export async function renameOrganization(orgId: string, name: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("organizations")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", orgId);
  return !error;
}

export async function renameWorkspace(workspaceId: string, name: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("workspaces")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", workspaceId);
  return !error;
}

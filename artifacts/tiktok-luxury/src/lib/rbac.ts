// ────────────────────────────────────────────────────────────────────────────
//  Module 3 — Role-Based Access Control
//
//  Roles are stored in two places, by design:
//   - `profiles.role`         — the user's default/global role (used as the
//                                effective role while each account has a
//                                single organization + single workspace).
//   - `workspace_members.role`— the per-workspace role, ready for the day a
//                                workspace has more than one member.
//
//  Real enforcement of data access happens in Postgres via Supabase Row
//  Level Security (see supabase-migration-phase3b.sql) — this module is a
//  client-side convenience layer for gating UI affordances, not a security
//  boundary by itself.
// ────────────────────────────────────────────────────────────────────────────

export type Role = "owner" | "admin" | "manager" | "analyst" | "viewer";

export const ROLES: Role[] = ["owner", "admin", "manager", "analyst", "viewer"];

export const ROLE_LABELS: Record<Role, string> = {
  owner:   "Owner",
  admin:   "Admin",
  manager: "Manager",
  analyst: "Analyst",
  viewer:  "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner:   "Full control — billing, members, and all data",
  admin:   "Manage members and all workspace data",
  manager: "Create and edit content, no member management",
  analyst: "Read-only access plus report exports",
  viewer:  "Read-only access",
};

// Lower number = more privileged
const ROLE_RANK: Record<Role, number> = {
  owner:   0,
  admin:   1,
  manager: 2,
  analyst: 3,
  viewer:  4,
};

export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

/** True if `role` meets or exceeds the privilege of `minRole`. */
export function hasMinRole(role: Role | null | undefined, minRole: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] <= ROLE_RANK[minRole];
}

/** Convenience checks used throughout the app. */
export const canManageMembers = (role: Role | null | undefined) => hasMinRole(role, "admin");
export const canEditContent   = (role: Role | null | undefined) => hasMinRole(role, "manager");
export const canExportReports = (role: Role | null | undefined) => hasMinRole(role, "analyst");

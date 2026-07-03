# TLIS — Phase 3B: Platform Core Services — Final Deliverables

Date: 2026-07-03
Scope: `artifacts/tiktok-luxury` (React + Vite + wouter, Supabase auth/data) and its Supabase backend. `artifacts/api-server` was not modified in this phase.

---

## 1. Architecture Summary

Phase 3B layered production SaaS infrastructure on top of the existing TLIS prototype without touching its UI or feature surface (Executive Command Center, Integration Hub, AI routing, Supabase sync all preserved as-is).

**New concepts introduced:**

- **Org hierarchy**: `organizations` → `workspaces` → `workspace_members` → `projects`. Every user gets a default organization + workspace auto-provisioned on first authenticated load (`lib/organization.ts`). This is a distinct concept from the pre-existing `tiktok_workspaces` table (per-TikTok-account marketing workspace) — names were deliberately kept separate to avoid collision.
- **RBAC**: A `Role` enum (`owner > admin > manager > analyst > viewer`) stored on both `profiles.role` (effective/default role) and `workspace_members.role` (per-workspace, for future multi-member workspaces). Enforcement is a two-layer model:
  - **Real boundary**: Postgres Row Level Security policies (source of truth).
  - **UI convenience layer**: `lib/rbac.ts` (`hasMinRole`, `canManageMembers`, `canEditContent`, `canExportReports`) — gates affordances only, not a security boundary by itself.
- **Audit logging**: Fire-and-forget `logAudit()` writes to `audit_logs` on sign-in/sign-out, preference changes, and workspace renames. Read via `/audit-log` page.
- **Platform health**: `/platform-health` page aggregates API server health (`/api/healthz`, `/api/intelligence/status`, `/api/integration-core/registry`) with a live Supabase connectivity check into one status board.
- **Settings hardening**: real profile/workspace/theme data wiring, Danger Zone, JSON Export/Import of a user's workspace/vault/calendar/saved-outputs data.
- **Resilience**: App-wide `ErrorBoundary`, Zod validation on auth/settings forms, and a centralized `RequireAuth` gate (`App.tsx`) added last (after e2e verification) so no route was ever silently broken mid-phase.
- **Cloud-wins data pattern**: existing tables (`vault_entries`, `calendar_posts`, etc.) and new tables (`executive_briefs`, `automation_history`, `research_sessions`, `alerts`, `notifications`, `usage_events`) share one convention — `user_id` (authenticated) or `device_id` (anonymous) ownership, RLS policies `auth_own_*` / `anon_unowned_*`.

**Non-negotiables preserved:** no UI redesign, Executive Command Center/Integration Hub/AI routing/Supabase sync untouched functionally, mobile responsiveness intact, TypeScript zero-error across all 4 typechecked workspace packages.

---

## 2. Files Created / Modified

Diff stat vs. pre-Phase-3B baseline (commit `9594a28`):

```
 public/opengraph.jpg                        | (recompressed, no visual change)
 src/App.tsx                                 | +114 -42   (routes, RequireAuth gate, ErrorBoundary wrap)
 src/components/ErrorBoundary.tsx            | NEW  (+76)
 src/components/layout.tsx                   | +5 -0     (nav entries: audit log, platform health)
 src/lib/account-data.ts                     | NEW  (+130)  export/import data aggregation
 src/lib/audit.ts                            | NEW  (+88)   logAudit() / fetchAuditLog()
 src/lib/auth.tsx                            | +3   (sign-in/out audit hooks)
 src/lib/integration-service.ts              | NEW  (+196)  Integration Hub data layer used by platform-health
 src/lib/organization.ts                     | NEW  (+243)  org/workspace auto-provision, rename, members, projects
 src/lib/rbac.ts                             | NEW  (+59)   Role type, permission helpers
 src/lib/supabase.ts                         | +34         UserProfile role/timezone/preferred_ai_provider/theme
                                                             + fetchRecentActivityFromCloud fix
 src/lib/validation.ts                       | NEW  (+57)   Zod schemas for auth/settings forms
 src/pages/audit.tsx                         | NEW  (+134)  Audit Log page
 src/pages/auth.tsx                          | +34 -8      /auth/login, /auth/register, /auth/forgot-password, /auth/reset-password
 src/pages/integration-hub.tsx               | +271 -96    wired to integration-service.ts
 src/pages/platform-health.tsx               | NEW  (+355) Platform Health page
 src/pages/profile.tsx                       | +148 -8     workspace/preferences card, role display
 src/pages/settings.tsx                      | +258 -18    workspace section, Danger Zone, Export/Import, loading fix
 supabase-migration-phase3b.sql              | NEW  (+540) full idempotent migration (source of truth for schema)
 supabase-fix-rls-recursion.sql              | scratch patch file, created+applied+deleted during this session

20 files changed, 2663 insertions(+), 156 deletions(-)
```

No existing page, component, or route was removed or redesigned; all additions are net-new files or additive edits to existing ones.

---

## 3. Database Schema Summary

Source of truth: `artifacts/tiktok-luxury/supabase-migration-phase3b.sql` (idempotent — safe to re-run).

**Extended:**
- `profiles` — added `role`, `timezone`, `preferred_ai_provider`, `theme`.

**New tables:**
| Table | Purpose | Ownership / RLS pattern |
|---|---|---|
| `organizations` | Top-level tenant | owner via `org_owner_all`; members via `org_member_read` (uses `my_organization_ids()`) |
| `workspaces` | Org sub-unit | owner via `workspace_owner_all` (uses `my_member_organization_ids()`); members via `workspace_member_read` |
| `workspace_members` | User↔workspace + per-workspace role | self-row via `workspace_member_self`; peers via `workspace_member_peers_read` (uses `my_workspace_ids()`) |
| `projects` | Workspace sub-unit | `project_workspace_member` |
| `audit_logs` | Action trail (user, action, module, provider, duration, status, tokens, cost) | `auth_own_audit_logs` / `anon_unowned_audit_logs` |
| `executive_briefs`, `automation_history`, `research_sessions`, `alerts`, `notifications`, `usage_events` | Cloud sync for previously localStorage-only data | `auth_own_*` / `anon_unowned_*` (cloud-wins) |

**Helper functions (all `SECURITY DEFINER STABLE`, `EXECUTE` granted only to `authenticated`):**
- `my_workspace_ids()` — workspaces the caller belongs to (breaks `workspace_members` self-referential recursion).
- `my_organization_ids()` — organizations the caller owns.
- `my_member_organization_ids()` — organizations backing workspaces the caller is a member of (breaks `organizations` ↔ `workspaces` cross-table recursion).
- `handle_new_user()` — profile bootstrap trigger.

**Known-safe:** all other existing tables' policies (`vault_entries`, `calendar_posts`, etc.) use simple `auth.uid() = user_id` checks — audited this phase, no recursion risk.

**Important distinction:** `tiktok_workspaces` (pre-existing, per-TikTok-account marketing workspace) is unrelated to the new `workspaces` org-hierarchy table. Do not merge or rename either.

---

## 4. Auth Flow

1. `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` all render `AuthPage`, differing only in which tab starts active. `/login` remains canonical (used by Supabase's email confirmation/password-recovery redirect links).
2. `AuthProvider` (`lib/auth.tsx`) wraps the app; on sign-in/sign-out it fires `logAudit()`.
3. `RequireAuth` in `App.tsx` gates every non-auth route: while the Supabase session is hydrating it renders a loading skeleton (never redirects prematurely — avoids a login-page flash for already-authenticated users on refresh/deep link); once resolved, unauthenticated users are redirected to `/login`.
4. On first authenticated load, `fetchOrCreateMyWorkspace()` (`lib/organization.ts`) auto-provisions a default organization + workspace + `workspace_members` row + default project if none exist yet.
5. Zod schemas (`lib/validation.ts`) validate the auth and settings forms client-side before submission.

---

## 5. Workspace Flow

1. `fetchOrCreateMyWorkspace(userId)` — idempotent get-or-create for the user's organization/workspace/membership/default project. This is the function that was blocked for this entire session by the RLS recursion bug (see Test Report) and is now verified working end-to-end.
2. Settings → Workspace section: shows Organization Name, Workspace Name, Your Role badge, member list, plan. Rename actions (`renameOrganization`, `renameWorkspace`) call `logAudit()` on success.
3. Profile page also surfaces workspace context plus editable preferences (timezone, preferred AI provider, theme) via `updateProfilePreferences`.
4. RBAC gates (`lib/rbac.ts`) determine which workspace actions (member management, content editing, report export) are exposed per role — UI-layer only, real enforcement is RLS.

---

## 6. Audit Log Flow

1. `logAudit({ action, module, provider?, durationMs?, status?, tokens?, estimatedCost? })` — fire-and-forget insert into `audit_logs`, never blocks the calling UI action and never throws into the caller.
2. Wired into: sign-in, sign-out, preference save (profile), workspace rename (settings).
3. `/audit-log` page (`fetchAuditLog(limit=100)`) lists the caller's own recent actions, most recent first, RLS-scoped to `auth_own_audit_logs`.
4. Deferred (see Phase 4 roadmap): replicating the same cloud-wins pattern for `executive_briefs`/`automation_history`/`research_sessions`/`alerts`/`notifications`/`usage_events` client-side — tables and RLS already exist in the migration, but no client read/write library wraps them yet.

---

## 7. Test Report

**Method:** Playwright-based e2e testing skill, plus direct Supabase REST simulation (sign in via `/auth/v1/token`, then chain `workspace_members` → `workspaces` → `organizations` fetches with the user's JWT) to reproduce the exact browser RLS path faster than full e2e for backend-only debugging.

**Test user:** `tlis.e2e.test@example.com`, role `owner`, pre-provisioned org/workspace (kept live for future regression runs — do not delete).

**Bugs found and fixed this phase:**

1. **RLS infinite recursion (Postgres 42P17)** between `organizations` and `workspaces` policies — cross-table mutual recursion (table A's policy subqueried table B, and vice versa), not a self-reference, so it wasn't caught by the original self-recursion audit. Symptom: Settings → Workspace fields stuck permanently disabled, `fetchOrCreateMyWorkspace` failed silently. Fixed via `my_organization_ids()` / `my_member_organization_ids()` `SECURITY DEFINER` helpers. Verified via direct REST simulation (workspace_members/workspaces/organizations/peers-read all 200, previously 500) and confirmed by full e2e re-run.
2. **`fetchRecentActivityFromCloud` TypeError** (`q.eq is not a function`) — `.eq()` was called on the raw `.from()` query builder before `.select()` was chained; Supabase JS v2 only exposes `.eq()` after `.select()`/`.update()`/etc. This silently broke the dashboard's Recent Activity widget on every load. Fixed by reordering to `.select(...).eq("user_id", userId)...` across all 5 parallel sub-queries.

**Final e2e run: PASS.** Confirmed: login → dashboard renders → Settings → Workspace section loads within a few seconds, fields become enabled, role badge shows "Owner" → rename+save → "Saved" confirmation with checkmark, no errors.

**Typecheck:** clean across all 4 checked packages (`api-server`, `mockup-sandbox`, `tiktok-luxury`, `scripts`) as of the final change in this phase.

**Not covered / residual gaps:**
- Console-error absence on the dashboard could not be *conclusively* re-verified by the automated test tooling on the final run (a known tooling limitation, not a reported failure) — mitigated by direct code review confirming the fix is a correct, minimal reordering matching the Supabase JS v2 API, and by the fact the same test tooling *did* catch this exact error before the fix.
- No dedicated mobile-viewport e2e pass was re-run after the two bug fixes in this session (an earlier mobile-responsiveness pass was done during Module 12 setup, before these two bugs were found — should be re-confirmed in Phase 4 or a quick follow-up).
- Multi-member workspace scenarios (peers-read policy, `workspace_members.role` divergence from `profiles.role`) are exercised by RLS policy design but not by an end-to-end multi-user test (only one test user exists).

---

## 8. Production Readiness Report

**Green:**
- TypeScript strict, zero errors across the workspace.
- RLS is the real security boundary on every new and existing user-data table; verified no self- or cross-table recursion remains.
- Auth gate (`RequireAuth`) added last, after full e2e verification, so no route was ever exposed unauthenticated during development.
- `ErrorBoundary` wraps the whole app — a component crash degrades to a fallback UI instead of a blank screen.
- Zod validation on auth/settings forms rejects malformed input client-side before it reaches Supabase.
- Fire-and-forget audit logging never blocks or breaks the calling action on failure.
- Platform Health page gives an at-a-glance view of API server / AI providers / Supabase connectivity for operators.

**Yellow / follow-up before a hard production launch:**
- Audit-log/cloud-wins pattern is not yet extended to `executive_briefs`/`automation_history`/`research_sessions`/`alerts`/`notifications`/`usage_events` — those tables exist and are RLS-protected, but the app still only writes them to `localStorage`, so cross-device sync is missing for that data (not lost, not insecure — just not synced yet).
- Only one test account has been exercised; no multi-member-workspace or multi-tenant-isolation test has been run against another real second account.
- No automated CI is wired up yet for the `typecheck`/e2e steps — currently a manual pre-ship habit.
- The Reddit and Google Trends `dailyTrending` integrations are logging fallback/warning states in the API server logs (pre-existing, upstream API friction — not part of this phase's scope, but worth triage before a hard launch since they affect the Executive Command Center's live-data claims).

**Red:** none identified that block a soft launch.

---

## 9. Phase 4 Roadmap (proposed)

1. Extend the cloud-wins pattern to the remaining six tables (`executive_briefs`, `automation_history`, `research_sessions`, `alerts`, `notifications`, `usage_events`) so all user data syncs across devices, not just vault/calendar/workspace.
2. Multi-member workspace UX: invite flow, member role management UI (gated by `canManageMembers`), and a second real test account to validate `workspace_member_peers_read` end-to-end.
3. CI wiring: run `pnpm run typecheck` (and ideally the e2e suite) automatically on every push/merge.
4. Investigate and stabilize the Reddit/Google-Trends upstream API friction currently surfacing as warnings in the API server logs.
5. Add a dedicated mobile-viewport e2e regression pass as a standing checklist item after any Settings/Dashboard change (this phase's two bugs were both desktop-e2e-caught; mobile wasn't re-verified post-fix).
6. Consider promoting the informal "draw the table-to-table RLS subquery graph, look for cycles" audit into a small lint script or checklist step run against any future migration SQL, given this phase found a cross-table recursion the original self-recursion-only audit missed.

---

## 10. Migration Instructions

1. Open the Supabase project's SQL Editor.
2. Paste and run the full contents of `artifacts/tiktok-luxury/supabase-migration-phase3b.sql` (idempotent — safe even if parts were already applied in a previous partial run).
3. Run the verification `SELECT` at the end of the file and confirm it returns the expected new tables/columns.
4. If you see `42P17 infinite recursion detected in policy` on any table after running: it almost certainly means the file was only partially applied (large pastes can silently truncate). Re-run the full file again in one paste — do not run only a fragment. If it persists, check `select pg_get_expr(polqual, polrelid) from pg_policy where polrelid = 'public.<table>'::regclass` for the affected table and compare against the file's current policy text.
5. No environment variables changed in this phase; existing `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` remain sufficient.
6. No `api-server` changes in this phase — no redeploy of that artifact is required for Phase 3B specifically.

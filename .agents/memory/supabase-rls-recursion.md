---
name: Supabase RLS self-referential policy recursion
description: A policy on table X that subqueries table X itself causes Postgres 42P17 infinite recursion — every SELECT on X fails.
---

## Rule
Never write an RLS policy whose `USING`/`WITH CHECK` clause subqueries the *same table* the policy is attached to (e.g. a "peers in my group" policy on a membership table that subqueries that same membership table). Postgres raises `42P17 infinite recursion detected in policy` because policies are evaluated per-row and the subquery re-triggers RLS on the same table.

**Why:** Hit this building a membership table (`workspace_members`) with a "read other members of workspaces I belong to" policy that subqueried `workspace_members` from within its own policy. Every SELECT on the table failed, which transitively broke every other table/policy that subqueried it too (parent org/workspace read policies), so a client-side "auto-provision workspace on first login" flow silently failed forever.

**How to apply:**
- Wrap the self-lookup in a `SECURITY DEFINER STABLE` SQL function (e.g. `my_workspace_ids() RETURNS SETOF uuid`) that queries the table directly, bypassing RLS for that one lookup. `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated;`.
- Reference `SELECT my_workspace_ids()` in the policy instead of a raw subquery on the same table.
- Route policies on *other* tables that need the same "my workspace ids" check through the same helper too, for consistency — those aren't recursive but benefit from one source of truth.
- Have a code-review/architect pass specifically check any new multi-tenant RLS schema for this pattern before handing migration SQL to the user — it's easy to miss since the SQL parses fine and only fails at query time.

**Variant: mutual recursion across two DIFFERENT tables (harder to spot).** The same 42P17 error also happens when table A's policy subqueries table B, and table B's policy subqueries table A (e.g. `organizations.org_member_read` subqueries `workspaces`, while `workspaces.workspace_owner_all` subqueries `organizations`) — neither policy references its own table, so a naive "does this policy subquery itself" check misses it. Fix identically: wrap each cross-table lookup in its own `SECURITY DEFINER` helper (e.g. `my_organization_ids()`, `my_member_organization_ids()`) so neither policy ever triggers RLS evaluation on the other table. When auditing multi-tenant RLS, draw the table-to-table subquery graph across ALL policies and check for any cycle, not just self-loops.

**Debugging gotcha:** if a user says they "re-ran" a fixed migration file but a direct REST/API check still shows the old recursion error, don't assume the fix is wrong — verify what's actually in the DB first (e.g. `select pg_get_expr(polqual, polrelid) from pg_policy where polrelid = 'public.<table>'::regclass`). A long multi-hundred-line SQL file re-paste can silently fail partway through or use a stale copy; a small self-contained patch (just the changed functions/policies, <60 lines) is much more reliable to get applied correctly than asking for the whole file again.

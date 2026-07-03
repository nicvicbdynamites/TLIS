---
name: RLS self-ownership escalation on membership/junction tables
description: A "FOR ALL USING (auth.uid() = user_id)" policy on a membership table lets a user self-insert into ANY parent row they can guess the UUID of, and self-promote their role.
---

## Rule
On a membership/junction table (user ↔ parent-resource, e.g. `workspace_members`, `team_members`, `project_collaborators`) with a `role` column, a policy of the shape:

```sql
create policy "x_self" on memberships for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

only constrains *who the row is about*, not *which parent resource* or *what role* it grants. Any authenticated user can INSERT `{user_id: me, parent_id: <any UUID>, role: 'owner'}` for a parent resource they don't belong to, instantly gaining access to that resource, its children, and its other members' data. `FOR ALL` also lets them later UPDATE their own row to escalate `role` further.

**Why:** Found this in a multi-tenant org→workspace→workspace_members hierarchy. The self-row policy was written to let a user provision their *own* first-time membership (the intended flow: create org → create workspace → insert own membership row), but nothing in the policy tied the INSERT to a parent the user actually owns/created — it only checked identity, not scope. An architect review pass caught it; it was not caught by earlier recursion-focused RLS audits because the policy has zero self-reference or cross-table subquery — it's a scoping gap, not a syntax/logic-cycle bug.

**How to apply:**
- Split any `FOR ALL` self-row policy on a membership table into separate commands:
  - `SELECT`: self-row read, safe to leave broad (`auth.uid() = user_id`).
  - `INSERT`: self-row insert, but `WITH CHECK` must ALSO constrain the parent-resource FK to one the caller legitimately owns/created (e.g. `parent_id IN (SELECT id FROM parents WHERE owner_id = auth.uid())`, wrapped in a `SECURITY DEFINER` helper to avoid recursion) — do not allow an arbitrary `role` value on self-insert (only allow the row from the intended provisioning flow, e.g. hardcode/constrain `role = 'owner'` for first-time self-provisioning, not any role the client sends).
  - `DELETE`: self-row delete ("leave"), safe to leave broad.
  - No `UPDATE` in the self-policy at all — role changes must go through a *separate* owner/admin-scoped policy (`FOR ALL` restricted to parent resources the caller owns), never through the self-row policy.
- After splitting, verify via `select polname, polcmd from pg_policy where polrelid = '<table>'::regclass` that the old broad policy is gone and exactly the expected narrow ones exist (`polcmd`: `r`=select, `a`=insert, `d`=delete, `w`=update, `*`=all).
- Always re-run the app's normal read/write regression flow after tightening (e.g. full login → settings → save) to confirm the legitimate self-provisioning path still works — narrowing scope is easy to over-tighten and break the intended flow.

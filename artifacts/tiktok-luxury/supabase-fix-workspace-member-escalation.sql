-- ──────────────────────────────────────────────────────────────
-- SECURITY FIX: workspace_members privilege-escalation patch
--
-- The original "workspace_member_self" policy was
-- `FOR ALL USING/WITH CHECK (auth.uid() = user_id)` with no constraint on
-- workspace_id or role. That let ANY authenticated user INSERT a membership
-- row granting themselves role='owner' in ANY workspace whose UUID they
-- learn (cross-tenant escalation), and let an existing member UPDATE their
-- own role (viewer -> owner self-promotion).
--
-- This patch is idempotent — safe to run once, standalone, in the Supabase
-- SQL Editor. It has also been folded into the full
-- supabase-migration-phase3b.sql file for future fresh installs.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.my_owned_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT w.id
  FROM public.workspaces w
  WHERE w.organization_id IN (SELECT public.my_organization_ids());
$$;

REVOKE ALL ON FUNCTION public.my_owned_workspace_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_owned_workspace_ids() TO authenticated;

DROP POLICY IF EXISTS "workspace_member_self" ON public.workspace_members;

DROP POLICY IF EXISTS "workspace_member_self_read" ON public.workspace_members;
CREATE POLICY "workspace_member_self_read" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace_member_self_insert" ON public.workspace_members;
CREATE POLICY "workspace_member_self_insert" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id IN (SELECT public.my_owned_workspace_ids())
  );

DROP POLICY IF EXISTS "workspace_member_self_delete" ON public.workspace_members;
CREATE POLICY "workspace_member_self_delete" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace_member_owner_manage" ON public.workspace_members;
CREATE POLICY "workspace_member_owner_manage" ON public.workspace_members
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT public.my_owned_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.my_owned_workspace_ids()));

-- Verification: policies on workspace_members after the patch.
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.workspace_members'::regclass;

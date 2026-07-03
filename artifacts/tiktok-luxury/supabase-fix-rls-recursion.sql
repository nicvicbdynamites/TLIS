-- ============================================================
--  TLIS — Standalone fix for RLS recursion (42P17) between
--  organizations <-> workspaces policies.
--
--  Run this ONCE in Supabase → SQL Editor → New Query → Run All.
--  It is idempotent and safe to re-run. It does NOT touch any data,
--  only three function definitions and two policy definitions.
-- ============================================================

-- Re-declare in case it doesn't exist yet (safe no-op if it already does).
CREATE OR REPLACE FUNCTION public.my_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_workspace_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_workspace_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.organizations WHERE owner_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_organization_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_organization_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_member_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT w.organization_id
  FROM public.workspaces w
  WHERE w.id IN (SELECT public.my_workspace_ids());
$$;

REVOKE ALL ON FUNCTION public.my_member_organization_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_member_organization_ids() TO authenticated;

DROP POLICY IF EXISTS "org_member_read" ON public.organizations;
CREATE POLICY "org_member_read" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.my_member_organization_ids())
  );

DROP POLICY IF EXISTS "workspace_owner_all" ON public.workspaces;
CREATE POLICY "workspace_owner_all" ON public.workspaces
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT public.my_organization_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT public.my_organization_ids())
  );

-- Verification query — run it after the statements above to confirm the
-- new policy is live. It should print the my_organization_ids() version,
-- NOT a raw "SELECT organizations.id FROM organizations WHERE ..." subquery.
select polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'public.workspaces'::regclass;

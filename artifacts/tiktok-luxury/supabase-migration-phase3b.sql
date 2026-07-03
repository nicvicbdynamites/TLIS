-- ============================================================
--  TLIS — Phase 3B Migration: Platform Core Services
--  Run this ONCE in Supabase → SQL Editor → New Query → Run All
--
--  Adds:
--    1. profiles          — role, timezone, preferred_ai_provider, theme columns
--    2. organizations      — top-level tenant container (Module 4)
--    3. workspaces          — org-scoped workspace (Module 4, NOT the same as
--                             the existing `tiktok_workspaces` table — that
--                             table is untouched and serves a different,
--                             per-account marketing-workspace purpose)
--    4. workspace_members   — role-scoped membership (Module 3/4)
--    5. projects            — workspace-scoped projects (Module 4)
--    6. audit_logs          — action/audit trail (Module 5)
--    7. executive_briefs, automation_history, research_sessions,
--       alerts, notifications, usage_events — remaining localStorage-only
--       data moved to Supabase (Module 6)
--
--  Safe to run multiple times — every statement is idempotent
--  (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
--   DROP POLICY/TRIGGER IF EXISTS before CREATE).
--
--  Does NOT modify or rename any existing table
--  (profiles, vault_entries, vault_collections, calendar_posts,
--   ai_generations, saved_outputs, content_packs, tiktok_accounts,
--   tiktok_workspaces are left exactly as they are, only new columns
--   are ever added to `profiles`).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shared updated_at trigger fn — already created by earlier migrations,
-- CREATE OR REPLACE is idempotent and safe to repeat here.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
--  1. PROFILES — extend with role / preferences (Module 2, 3)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role                 TEXT NOT NULL DEFAULT 'owner'
                            CHECK (role IN ('owner','admin','manager','analyst','viewer')),
  ADD COLUMN IF NOT EXISTS timezone             TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS preferred_ai_provider TEXT NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS theme                TEXT NOT NULL DEFAULT 'dark'
                            CHECK (theme IN ('dark','light','system'));

-- The very first user to sign up on a fresh install has no organization yet,
-- so they are provisioned as 'owner' by default (see handle_new_user below
-- and lib/organization.ts auto-provision on first authenticated load).

-- ──────────────────────────────────────────────────────────────
--  2. ORGANIZATIONS  (Module 4)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'My Organization',
  slug        TEXT        NOT NULL DEFAULT '',
  plan        TEXT        NOT NULL DEFAULT 'free'
                          CHECK (plan IN ('free','pro','enterprise')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single org per owner in the current scope — also prevents concurrent tabs
-- from racing `provisionDefaultWorkspace` into creating duplicate orgs.
DROP INDEX IF EXISTS idx_organizations_owner_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_owner_all" ON public.organizations;
CREATE POLICY "org_owner_all" ON public.organizations
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- NOTE: the "members of an org may read it" policy is created further below
-- (section 4), after workspaces/workspace_members exist, since it needs to
-- subquery those tables.

DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
--  3. WORKSPACES  (Module 4 — org-level workspace, distinct from
--     the existing per-account `tiktok_workspaces` table)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspaces (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL DEFAULT 'Default Workspace',
  slug            TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_org_id ON public.workspaces(organization_id);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
--  4. WORKSPACE_MEMBERS  (Module 3, 4 — RBAC membership)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL DEFAULT 'owner'
                            CHECK (role IN ('owner','admin','manager','analyst','viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id      ON public.workspace_members(user_id);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper: returns the caller's workspace ids without going
-- through RLS on workspace_members itself. This is required because any
-- policy on workspace_members that subqueries workspace_members directly
-- causes Postgres error 42P17 "infinite recursion detected in policy" —
-- every policy on a table is evaluated (OR'd) for every row check, so a
-- self-referential subquery re-triggers the same policy recursively.
-- Policies on OTHER tables (organizations, workspaces, projects) that
-- subquery workspace_members are not recursive, but they are routed
-- through this same helper for consistency and to avoid re-running RLS
-- on workspace_members on every check.
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

DROP POLICY IF EXISTS "workspace_member_self" ON public.workspace_members;
CREATE POLICY "workspace_member_self" ON public.workspace_members
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- A user can also read (but not write) other members of a workspace they belong to
DROP POLICY IF EXISTS "workspace_member_peers_read" ON public.workspace_members;
CREATE POLICY "workspace_member_peers_read" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT public.my_workspace_ids())
  );

-- Now that workspace_members exists, wire up the org-level "members may
-- read their org" policy deferred from section 2 above.
DROP POLICY IF EXISTS "org_member_read" ON public.organizations;
CREATE POLICY "org_member_read" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT w.organization_id
      FROM public.workspaces w
      WHERE w.id IN (SELECT public.my_workspace_ids())
    )
  );

-- Workspace read/write scoped to org owner or workspace members
DROP POLICY IF EXISTS "workspace_owner_all" ON public.workspaces;
CREATE POLICY "workspace_owner_all" ON public.workspaces
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "workspace_member_read" ON public.workspaces;
CREATE POLICY "workspace_member_read" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.my_workspace_ids())
  );

-- ──────────────────────────────────────────────────────────────
--  5. PROJECTS  (Module 4 — workspace-scoped projects)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.projects (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL DEFAULT 'Default Project',
  description   TEXT        NOT NULL DEFAULT '',
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','paused','archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON public.projects(workspace_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_workspace_member" ON public.projects;
CREATE POLICY "project_workspace_member" ON public.projects
  FOR ALL TO authenticated
  USING (
    workspace_id IN (SELECT public.my_workspace_ids())
  )
  WITH CHECK (
    workspace_id IN (SELECT public.my_workspace_ids())
  );

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
--  6. AUDIT_LOGS  (Module 5)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id       TEXT        NOT NULL DEFAULT '',
  action          TEXT        NOT NULL,
  module          TEXT        NOT NULL DEFAULT '',
  provider        TEXT        NOT NULL DEFAULT '',
  duration_ms     INTEGER,
  status          TEXT        NOT NULL DEFAULT 'success'
                              CHECK (status IN ('success','error','pending')),
  tokens          INTEGER,
  estimated_cost  NUMERIC(10,6),
  ip_address      TEXT        NOT NULL DEFAULT 'unknown',
  device_label    TEXT        NOT NULL DEFAULT 'unknown',
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module      ON public.audit_logs(module);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_own_audit_logs" ON public.audit_logs;
CREATE POLICY "auth_own_audit_logs" ON public.audit_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "anon_unowned_audit_logs" ON public.audit_logs;
CREATE POLICY "anon_unowned_audit_logs" ON public.audit_logs
  FOR ALL TO anon
  USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- ──────────────────────────────────────────────────────────────
--  7. REMAINING LOCALSTORAGE DATA → SUPABASE  (Module 6)
--     Same cloud-wins / device_id-fallback convention as
--     vault_entries / calendar_posts / ai_generations.
-- ──────────────────────────────────────────────────────────────

-- 7a. executive_briefs
CREATE TABLE IF NOT EXISTS public.executive_briefs (
  id          TEXT        PRIMARY KEY,
  device_id   TEXT        NOT NULL DEFAULT '',
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL DEFAULT '',
  content     JSONB       NOT NULL DEFAULT '{}',
  niche       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_executive_briefs_device_id ON public.executive_briefs(device_id);
CREATE INDEX IF NOT EXISTS idx_executive_briefs_created_at ON public.executive_briefs(created_at DESC);
ALTER TABLE public.executive_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_own_executive_briefs" ON public.executive_briefs;
CREATE POLICY "auth_own_executive_briefs" ON public.executive_briefs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "anon_unowned_executive_briefs" ON public.executive_briefs;
CREATE POLICY "anon_unowned_executive_briefs" ON public.executive_briefs
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);
DROP TRIGGER IF EXISTS set_executive_briefs_updated_at ON public.executive_briefs;
CREATE TRIGGER set_executive_briefs_updated_at
  BEFORE UPDATE ON public.executive_briefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7b. automation_history
CREATE TABLE IF NOT EXISTS public.automation_history (
  id          TEXT        PRIMARY KEY,
  device_id   TEXT        NOT NULL DEFAULT '',
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  workflow    TEXT        NOT NULL DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'completed'
                          CHECK (status IN ('completed','failed','running')),
  details     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_history_device_id  ON public.automation_history(device_id);
CREATE INDEX IF NOT EXISTS idx_automation_history_created_at ON public.automation_history(created_at DESC);
ALTER TABLE public.automation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_own_automation_history" ON public.automation_history;
CREATE POLICY "auth_own_automation_history" ON public.automation_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "anon_unowned_automation_history" ON public.automation_history;
CREATE POLICY "anon_unowned_automation_history" ON public.automation_history
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- 7c. research_sessions
CREATE TABLE IF NOT EXISTS public.research_sessions (
  id          TEXT        PRIMARY KEY,
  device_id   TEXT        NOT NULL DEFAULT '',
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  query       TEXT        NOT NULL DEFAULT '',
  results     JSONB       NOT NULL DEFAULT '{}',
  provider    TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_research_sessions_device_id  ON public.research_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created_at ON public.research_sessions(created_at DESC);
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_own_research_sessions" ON public.research_sessions;
CREATE POLICY "auth_own_research_sessions" ON public.research_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "anon_unowned_research_sessions" ON public.research_sessions;
CREATE POLICY "anon_unowned_research_sessions" ON public.research_sessions
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- 7d. alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id          TEXT        PRIMARY KEY,
  device_id   TEXT        NOT NULL DEFAULT '',
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL DEFAULT 'info'
                          CHECK (type IN ('info','warning','critical')),
  title       TEXT        NOT NULL DEFAULT '',
  message     TEXT        NOT NULL DEFAULT '',
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON public.alerts(device_id);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_own_alerts" ON public.alerts;
CREATE POLICY "auth_own_alerts" ON public.alerts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "anon_unowned_alerts" ON public.alerts;
CREATE POLICY "anon_unowned_alerts" ON public.alerts
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- 7e. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          TEXT        PRIMARY KEY,
  device_id   TEXT        NOT NULL DEFAULT '',
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL DEFAULT '',
  message     TEXT        NOT NULL DEFAULT '',
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON public.notifications(device_id);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_own_notifications" ON public.notifications;
CREATE POLICY "auth_own_notifications" ON public.notifications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "anon_unowned_notifications" ON public.notifications;
CREATE POLICY "anon_unowned_notifications" ON public.notifications
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- 7f. usage_events (Module 10 — usage history, superset of ai_generations for
--     non-AI actions like exports, logins, syncs)
CREATE TABLE IF NOT EXISTS public.usage_events (
  id          TEXT        PRIMARY KEY,
  device_id   TEXT        NOT NULL DEFAULT '',
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL DEFAULT '',
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_events_device_id  ON public.usage_events(device_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON public.usage_events(created_at DESC);
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_own_usage_events" ON public.usage_events;
CREATE POLICY "auth_own_usage_events" ON public.usage_events
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "anon_unowned_usage_events" ON public.usage_events;
CREATE POLICY "anon_unowned_usage_events" ON public.usage_events
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- ──────────────────────────────────────────────────────────────
--  8. AUTO-PROVISION DEFAULT ORG + WORKSPACE ON SIGN-UP
--     Extends the existing handle_new_user() trigger so every new
--     Supabase Auth user automatically gets: profile row (already
--     handled by supabase-migration-v2.sql) + a personal
--     organization + a default workspace + an 'owner' membership.
--     Idempotent: ON CONFLICT DO NOTHING everywhere.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_org_id UUID;
  new_ws_id  UUID;
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.organizations (owner_id, name, slug)
  VALUES (NEW.id, 'My Organization', 'org-' || substr(NEW.id::text, 1, 8))
  RETURNING id INTO new_org_id;

  INSERT INTO public.workspaces (organization_id, name, slug)
  VALUES (new_org_id, 'Default Workspace', 'default')
  RETURNING id INTO new_ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_ws_id, NEW.id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Back-fill: give any pre-existing auth users (who signed up before this
-- migration ran) a personal organization + default workspace if they don't
-- already have one. Safe to re-run — WHERE NOT EXISTS guards every insert.
DO $$
DECLARE
  u RECORD;
  new_org_id UUID;
  new_ws_id  UUID;
BEGIN
  FOR u IN SELECT id FROM auth.users LOOP
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE owner_id = u.id) THEN
      INSERT INTO public.organizations (owner_id, name, slug)
      VALUES (u.id, 'My Organization', 'org-' || substr(u.id::text, 1, 8))
      RETURNING id INTO new_org_id;

      INSERT INTO public.workspaces (organization_id, name, slug)
      VALUES (new_org_id, 'Default Workspace', 'default')
      RETURNING id INTO new_ws_id;

      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (new_ws_id, u.id, 'owner')
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────
--  9. VERIFY — run this block last to confirm all new tables exist
-- ──────────────────────────────────────────────────────────────

SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations',
    'workspaces',
    'workspace_members',
    'projects',
    'audit_logs',
    'executive_briefs',
    'automation_history',
    'research_sessions',
    'alerts',
    'notifications',
    'usage_events'
  )
ORDER BY tablename;

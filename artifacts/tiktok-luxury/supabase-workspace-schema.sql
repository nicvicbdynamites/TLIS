-- ============================================================
--  Module 12 — TikTok Workspace
--  Run in Supabase SQL Editor:
--  https://supabase.com/dashboard/project/qzprgjffapommkqeapwy/sql
-- ============================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.tiktok_workspaces (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  workspace_name    TEXT        NOT NULL DEFAULT '',
  account_name      TEXT        NOT NULL DEFAULT '',
  username          TEXT        NOT NULL DEFAULT '',
  platform          TEXT        NOT NULL DEFAULT 'TikTok',
  niche             TEXT        NOT NULL DEFAULT '',
  audience          TEXT        NOT NULL DEFAULT '',
  goal              TEXT        NOT NULL DEFAULT '',
  posting_frequency TEXT        NOT NULL DEFAULT '',
  status            TEXT        NOT NULL DEFAULT 'active',
  notes             TEXT        NOT NULL DEFAULT '',
  CONSTRAINT tiktok_workspaces_status_check
    CHECK (status IN ('active', 'paused', 'archived'))
);

-- 2. updated_at trigger function (shared, idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to tiktok_workspaces
DROP TRIGGER IF EXISTS set_tiktok_workspaces_updated_at ON public.tiktok_workspaces;
CREATE TRIGGER set_tiktok_workspaces_updated_at
  BEFORE UPDATE ON public.tiktok_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.tiktok_workspaces ENABLE ROW LEVEL SECURITY;

-- 5. Drop policy if it already exists (safe re-run)
DROP POLICY IF EXISTS "workspace_owner_only" ON public.tiktok_workspaces;

-- 6. RLS policy — authenticated users see/write only their own rows
CREATE POLICY "workspace_owner_only"
  ON public.tiktok_workspaces
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Index for fast user lookups
CREATE INDEX IF NOT EXISTS tiktok_workspaces_user_id_idx
  ON public.tiktok_workspaces (user_id);

-- 8. Verification — should return one row describing the table
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'tiktok_workspaces'
ORDER BY ordinal_position;

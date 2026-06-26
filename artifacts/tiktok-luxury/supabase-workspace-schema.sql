-- ============================================================
--  Module 12 — TikTok Workspace
--  Run this SQL in your Supabase project's SQL Editor:
--  https://supabase.com/dashboard/project/qzprgjffapommkqeapwy/sql
-- ============================================================

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
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'paused', 'archived')),
  notes             TEXT        NOT NULL DEFAULT ''
);

-- Enable Row Level Security
ALTER TABLE public.tiktok_workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can only read/write their own rows
CREATE POLICY "workspace_owner_only"
  ON public.tiktok_workspaces
  FOR ALL
  TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Optional: index on user_id for faster queries
CREATE INDEX IF NOT EXISTS tiktok_workspaces_user_id_idx
  ON public.tiktok_workspaces (user_id);

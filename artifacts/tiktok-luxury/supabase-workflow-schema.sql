-- ============================================================
--  Module 13 — Workspace Workflow Engine
--  Run in Supabase SQL Editor:
--  https://supabase.com/dashboard/project/qzprgjffapommkqeapwy/sql
-- ============================================================

-- 1. Add workspace_id to content_packs (links pack to a workspace)
ALTER TABLE public.content_packs
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 2. Add workflow_stage to content_packs (Generated → Saved → Scheduled → Published)
ALTER TABLE public.content_packs
  ADD COLUMN IF NOT EXISTS workflow_stage TEXT NOT NULL DEFAULT 'generated';

-- 3. Add workspace_id to vault_entries
ALTER TABLE public.vault_entries
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 4. Add workspace_id to calendar_posts
ALTER TABLE public.calendar_posts
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 5. Indexes for fast workspace-scoped queries
CREATE INDEX IF NOT EXISTS content_packs_workspace_id_idx
  ON public.content_packs (workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vault_entries_workspace_id_idx
  ON public.vault_entries (workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS calendar_posts_workspace_id_idx
  ON public.calendar_posts (workspace_id)
  WHERE workspace_id IS NOT NULL;

-- 6. Verification — confirm new columns exist
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('content_packs', 'vault_entries', 'calendar_posts')
  AND column_name IN ('workspace_id', 'workflow_stage')
ORDER BY table_name, column_name;

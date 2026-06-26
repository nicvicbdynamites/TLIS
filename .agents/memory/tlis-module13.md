---
name: TLIS Module 13 — Workspace Workflow Engine
description: Active Workspace context + WorkflowProgress component + workflow stage auto-advance pattern
---

# TLIS Module 13 — Workspace Workflow Engine

## What it does
- `workspace-context.tsx` (WorkspaceProvider + useActiveWorkspace hook) persists the active workspace ID in localStorage (`tlis_active_workspace_id`)
- WorkspacePage: clicking "Open & Activate" calls `setActiveWorkspace(w)` and navigates to detail view
- ContentPackGenerator: reads `activeWorkspace` from context; pre-fills niche/audience/platform; shows dismissible banner; tags saved packs with `workspaceId` + `workflowStage`
- WorkflowProgress: 4-step bar (generated → saved → scheduled → published); clicking a bar advances stage via `updateWorkflowStageToCloud`

## SQL migration required (manual)
Run `supabase-workflow-schema.sql` in Supabase SQL editor:
- ALTER TABLE content_packs ADD COLUMN workspace_id UUID REFERENCES tiktok_workspaces(id), ADD COLUMN workflow_stage TEXT DEFAULT 'generated'
- ALTER TABLE vault_entries ADD COLUMN workspace_id UUID REFERENCES tiktok_workspaces(id)
- ALTER TABLE calendar_posts ADD COLUMN workspace_id UUID REFERENCES tiktok_workspaces(id)
- Plus indexes on workspace_id for all three tables

**Why:** Without the SQL migration the workspace linking functions will silently fail (Supabase ignores unknown columns on upsert by default, but RLS will still apply).

## Platform mapping (workspace → content pack)
- "Instagram" → "Instagram Reels"
- "YouTube" → "YouTube Shorts"
- "TikTok" → "TikTok"
- Others → keep current form value

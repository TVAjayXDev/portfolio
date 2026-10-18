-- =============================================================================
-- Migration: 20261018000009_drop_case_study_and_add_projects_section.sql
-- Description: 
-- 1. Drops legacy case_study JSON column from public.projects.
-- 2. Adds 'projects' section row to public.sections (idempotent, ordered after featured_project).
-- =============================================================================

-- 1. Drop case_study column from public.projects if it exists
ALTER TABLE public.projects DROP COLUMN IF EXISTS case_study;

-- 2. Shift sort_order for sections coming after featured_project (order 4) if 'projects' not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sections WHERE id = 'projects') THEN
    UPDATE public.sections SET sort_order = sort_order + 1 WHERE sort_order >= 5;
  END IF;
END $$;

-- 3. Idempotently insert 'projects' section
INSERT INTO public.sections (id, title, subtitle, is_visible, sort_order)
VALUES ('projects', 'Projects', 'Independent builds and applications', true, 5)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    is_visible = EXCLUDED.is_visible;

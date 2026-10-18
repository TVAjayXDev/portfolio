-- =============================================================================
-- Migration: 20261017000004_stage6a_crud.sql
-- Description:
-- 1. Adds about_text (nullable) and footer_text to site_settings.
-- 2. Adds partial unique index on public.projects so only one project can be featured.
-- 3. Adds case_study_markdown and team columns to public.projects.
-- =============================================================================

-- 1. Site Settings Additions
alter table public.site_settings
  add column if not exists about_text text,
  add column if not exists footer_text text;

-- 2. Projects Enhancements
alter table public.projects
  add column if not exists case_study_markdown text,
  add column if not exists team text;

-- 3. Partial Unique Index: Only one project can have is_featured = true
create unique index if not exists projects_featured_unique
  on public.projects (is_featured)
  where is_featured = true;

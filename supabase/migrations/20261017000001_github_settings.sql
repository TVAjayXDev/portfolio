-- -----------------------------------------------------------------------------
-- Stage 4 Migration: Add github_pinned_repos and github_hidden_repos to site_settings
-- -----------------------------------------------------------------------------

alter table public.site_settings
  add column if not exists github_pinned_repos text[] not null default '{}'::text[],
  add column if not exists github_hidden_repos text[] not null default '{}'::text[];

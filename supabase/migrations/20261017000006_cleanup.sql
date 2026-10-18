-- =============================================================================
-- Migration: 20261017000006_cleanup.sql
-- Description:
-- 1. Projects case study column unification:
--    Ensures no row has unmigrated case_study_markdown before dropping it.
--    Standardizes public.projects strictly on 'content'.
-- 2. Experience organization column unification:
--    Ensures all records use 'organization'.
--    Copies legacy 'company' values to 'organization' where empty, then drops 'company'.
-- =============================================================================

-- 1. Unify projects.content
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'case_study_markdown'
  ) then
    execute 'update public.projects set content = case_study_markdown where (content is null or content = '''') and case_study_markdown is not null and case_study_markdown <> ''''';
  end if;
end $$;

alter table public.projects drop column if exists case_study_markdown;

-- 2. Unify experience.organization
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'experience' and column_name = 'company'
  ) then
    execute 'update public.experience set organization = company where (organization is null or organization = '''') and company is not null and company <> ''''';
  end if;
end $$;

alter table public.experience drop column if exists company;

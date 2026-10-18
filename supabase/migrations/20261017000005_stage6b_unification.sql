-- =============================================================================
-- Migration: 20261017000005_stage6b_unification.sql
-- Description:
-- 1. Expands projects.status CHECK constraint to include all form options:
--    ('completed', 'in_progress', 'planned', 'coming_soon', 'live').
-- 2. Case study column unification:
--    Ensures 'content' column exists on public.projects.
--    Migrates any case_study_markdown into content and drops case_study_markdown.
-- 3. Experience organization column alignment:
--    Ensures 'organization' column exists on public.experience, migrating from
--    legacy 'company' column if present.
-- 4. Creates 'post-covers' storage bucket for blog post thumbnails/covers
--    (public read, admin-only write, image types only, max 5 MB).
-- =============================================================================

-- 1. Expand projects.status CHECK constraint
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('completed', 'in_progress', 'planned', 'coming_soon', 'live'));

-- 2. Ensure content column exists on public.projects
alter table public.projects add column if not exists content text;

-- 3. Case study column unification: standardize on 'content'
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'case_study_markdown'
  ) then
    update public.projects
    set content = case_study_markdown
    where (content is null or content = '') and case_study_markdown is not null and case_study_markdown <> '';

    alter table public.projects drop column case_study_markdown;
  end if;
end $$;

-- 4. Experience table schema alignment: ensure organization exists
alter table public.experience add column if not exists organization text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'experience' and column_name = 'company'
  ) then
    update public.experience
    set organization = company
    where organization is null and company is not null;
  end if;
end $$;

-- 5. Create 'post-covers' storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-covers',
  'post-covers',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Storage RLS Policies for 'post-covers'
create policy "Public can view post covers"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'post-covers');

create policy "Admins can upload post covers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-covers' and public.is_admin());

create policy "Admins can update post covers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-covers' and public.is_admin())
  with check (bucket_id = 'post-covers' and public.is_admin());

create policy "Admins can delete post covers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-covers' and public.is_admin());

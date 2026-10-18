-- =============================================================================
-- T V AJAY PORTFOLIO: COMPLETE DATABASE SETUP (setup_all.sql)
-- Paste this entire file into the Supabase SQL Editor on a fresh project.
-- =============================================================================


-- =============================================================================
-- MIGRATION 1/6: 20261017000000_init_schema.sql
-- =============================================================================

-- =============================================================================
-- T V Ajay Personal Portfolio Database Schema & RLS Policies
-- =============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Admin Users Table (Explicit Admin Authorization Table)
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- Security Definer Function: is_admin()
-- Returns true ONLY when auth.uid() is found in public.admin_users.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = public;

-- -----------------------------------------------------------------------------
-- Trigger Function: set_updated_at()
-- Automatically updates updated_at column on row modification.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- -----------------------------------------------------------------------------
-- 2. Site Settings Table (Single row configuration)
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id integer primary key default 1,
  site_title text not null default 'T V Ajay | Portfolio',
  name text not null default 'T V Ajay',
  title text not null default 'Computer Science Engineering Student',
  headline text not null default 'T V Ajay',
  subtitle text not null default 'Computer Science Engineering student who enjoys building practical projects with AI, learning new technologies, and turning ideas into working solutions.',
  email text not null default 'tvajay0@gmail.com',
  github_url text not null default 'https://github.com/TVAjayXDev',
  linkedin_url text not null default 'https://www.linkedin.com/in/t-v-ajay-b047013a5/',
  availability_badge_text text not null default 'Open to internships',
  availability_badge_active boolean not null default true,
  seo_description text not null default 'Computer Science Engineering student who enjoys building practical projects with AI, learning new technologies, and turning ideas into working solutions.',
  og_image_url text,
  resume_url text,
  resume_updated_at timestamp with time zone,
  github_pinned_repos text[] not null default '{}'::text[],
  github_hidden_repos text[] not null default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint single_row_site_settings check (id = 1)
);

create trigger tr_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Sections Table (Order and visibility of home page modules)
-- -----------------------------------------------------------------------------
create table if not exists public.sections (
  id text primary key,
  title text not null,
  subtitle text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger tr_sections_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Projects Table (is_published defaults to false)
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text not null unique,
  tagline text,
  description text not null default '',
  content text default '',
  team text,
  demo_url text,
  github_url text,
  image_url text,
  status text not null default 'live' check (status in ('live', 'in_progress', 'coming_soon')),
  is_featured boolean not null default false,
  is_published boolean not null default false,
  technologies text[] default '{}',
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger tr_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Ensure legacy case_study JSON column is dropped if table pre-existed
ALTER TABLE public.projects DROP COLUMN IF EXISTS case_study;

-- -----------------------------------------------------------------------------
-- 5. Skills Table (is_published defaults to false)
-- -----------------------------------------------------------------------------
create table if not exists public.skills (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null default 'Languages',
  icon text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger tr_skills_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Education Table (is_published defaults to false)
-- -----------------------------------------------------------------------------
create table if not exists public.education (
  id uuid default gen_random_uuid() primary key,
  institution text not null,
  degree text not null,
  field_of_study text,
  start_year text,
  end_year text,
  grade text,
  current_semester text,
  description text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger tr_education_updated_at
  before update on public.education
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Experience Table (is_published defaults to false, dates nullable)
-- -----------------------------------------------------------------------------
create table if not exists public.experience (
  id uuid default gen_random_uuid() primary key,
  role text not null,
  organization text not null,
  location text,
  start_date text,
  end_date text,
  description text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger tr_experience_updated_at
  before update on public.experience
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Certifications Table (is_published defaults to false)
-- -----------------------------------------------------------------------------
create table if not exists public.certifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  issuer text not null,
  issue_date text not null,
  credential_id text,
  credential_url text,
  certificate_file_url text,
  thumbnail_url text,
  category text not null default 'General',
  skills text[] default '{}',
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger tr_certifications_updated_at
  before update on public.certifications
  for each row execute function public.set_updated_at();

-- Ensure new columns exist even if table pre-existed
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS category text not null default 'General';
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS skills text[] default '{}';

-- -----------------------------------------------------------------------------
-- 9. Posts (Blog / Learning Log) Table (is_published defaults to false)
-- -----------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  cover_image_url text,
  read_time text default '5 min read',
  tags text[] default '{}',
  is_published boolean not null default false,
  published_at timestamp with time zone,
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger tr_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. Messages Table (Strict validation check constraints)
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  name text not null check (char_length(trim(name)) between 1 and 100),
  email text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  subject text check (subject is null or (char_length(trim(subject)) between 1 and 200)),
  message text not null check (char_length(trim(message)) between 1 and 2000),
  is_read boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================================================
-- Row Level Security (RLS) Setup
-- =============================================================================

alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.sections enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.education enable row level security;
alter table public.experience enable row level security;
alter table public.certifications enable row level security;
alter table public.posts enable row level security;
alter table public.messages enable row level security;

-- Admin Users policies
create policy "Admins can view admin_users"
  on public.admin_users for select
  to authenticated
  using (public.is_admin());

-- Site Settings policies
create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "Admins can update site settings"
  on public.site_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Sections policies
create policy "Public can read visible sections"
  on public.sections for select
  to anon, authenticated
  using (true);

create policy "Admins can manage sections"
  on public.sections for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Projects policies
create policy "Public can view published projects"
  on public.projects for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

create policy "Admins can manage projects"
  on public.projects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Skills policies
create policy "Public can view published skills"
  on public.skills for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

create policy "Admins can manage skills"
  on public.skills for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Education policies
create policy "Public can view published education"
  on public.education for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

create policy "Admins can manage education"
  on public.education for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Experience policies
create policy "Public can view published experience"
  on public.experience for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

create policy "Admins can manage experience"
  on public.experience for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Certifications policies
create policy "Public can view published certifications"
  on public.certifications for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

create policy "Admins can manage certifications"
  on public.certifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Posts policies
create policy "Public can view published posts"
  on public.posts for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

create policy "Admins can manage posts"
  on public.posts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Messages policies:
-- Anonymous users get INSERT only with strict is_read=false and is_archived=false checks.
-- NO SELECT, UPDATE or DELETE policy for anon.
create policy "Anon and authenticated can insert contact messages"
  on public.messages for insert
  to anon, authenticated
  with check (
    is_read = false
    and is_archived = false
  );

create policy "Admins can view messages"
  on public.messages for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update messages"
  on public.messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete messages"
  on public.messages for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- Storage Buckets Configuration with File Type and Size Limits
-- =============================================================================
-- Certificates: PDF, PNG, JPG, WEBP (Max 10 MB = 10,485,760 bytes)
-- Resume: PDF only (Max 10 MB = 10,485,760 bytes)
-- Project Images: PNG, JPG, WEBP, GIF (Max 5 MB = 5,242,880 bytes)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  (
    'certificates',
    'certificates',
    true,
    10485760,
    array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'resume',
    'resume',
    true,
    10485760,
    array['application/pdf']
  ),
  (
    'project-images',
    'project-images',
    true,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS policies (Public SELECT dropped; only admin can view/list objects via API)
create policy "Admin view certificates"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'certificates' and public.is_admin());

create policy "Admin upload certificates"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'certificates' and public.is_admin());

create policy "Admin update certificates"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'certificates' and public.is_admin());

create policy "Admin delete certificates"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'certificates' and public.is_admin());

create policy "Admin view resume"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'resume' and public.is_admin());

create policy "Admin upload resume"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resume' and public.is_admin());

create policy "Admin update resume"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'resume' and public.is_admin());

create policy "Admin delete resume"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resume' and public.is_admin());

create policy "Admin view project images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin());

create policy "Admin upload project images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images' and public.is_admin());

create policy "Admin update project images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin());

create policy "Admin delete project images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin());

-- =============================================================================
-- MIGRATION 2/6: 20261017000001_github_settings.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Stage 4 Migration: Add github_pinned_repos and github_hidden_repos to site_settings
-- -----------------------------------------------------------------------------

alter table public.site_settings
  add column if not exists github_pinned_repos text[] not null default '{}'::text[],
  add column if not exists github_hidden_repos text[] not null default '{}'::text[];

-- =============================================================================
-- MIGRATION 3/6: 20261017000002_admin_mfa_aal2.sql
-- =============================================================================

-- =============================================================================
-- Migration: 20261017000002_admin_mfa_aal2.sql
-- Description:
-- 1. Adds public.is_admin_member() for membership-only verification.
-- 2. Updates public.is_admin() to require BOTH admin membership AND AAL2 in auth.jwt().
-- 3. Creates public.auth_rate_limits table with SECURITY DEFINER functions for
--    persistent IP and email throttling across serverless invocations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Function: public.is_admin_member()
-- Returns true if auth.uid() exists in public.admin_users (regardless of AAL).
-- Used by middleware and login handlers to verify admin membership before MFA.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin_member()
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = public;

-- -----------------------------------------------------------------------------
-- 2. Function: public.is_admin()
-- Returns true ONLY when auth.uid() exists in public.admin_users AND
-- the JWT token has reached AAL2 (authenticator assurance level 2, verified via TOTP).
-- Used by all table RLS policies and storage policies.
-- An aal1 token for the admin cannot read protected drafts or write to any table.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  ) and (coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2');
end;
$$ language plpgsql security definer set search_path = public;

-- -----------------------------------------------------------------------------
-- 3. Persistent Rate Limiting Table: public.auth_rate_limits
-- Stores failed login attempt counters and lockout timestamps across serverless invocations.
-- -----------------------------------------------------------------------------
create table if not exists public.auth_rate_limits (
  key text primary key,
  attempt_count integer not null default 0,
  last_attempt timestamp with time zone default timezone('utc'::text, now()) not null,
  locked_until timestamp with time zone
);

alter table public.auth_rate_limits enable row level security;
-- No direct public RLS access: access is strictly through SECURITY DEFINER functions below

-- -----------------------------------------------------------------------------
-- 4. Function: check_auth_throttle(p_key text)
-- Returns JSON: { "is_locked": boolean, "seconds_remaining": integer }
-- -----------------------------------------------------------------------------
create or replace function public.check_auth_throttle(p_key text)
returns jsonb as $$
declare
  v_rec record;
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_remaining integer;
begin
  select * into v_rec from public.auth_rate_limits where key = p_key;
  if not found then
    return jsonb_build_object('is_locked', false, 'seconds_remaining', 0);
  end if;

  -- Reset counter if last attempt was more than 15 minutes ago
  if v_rec.last_attempt < (v_now - interval '15 minutes') then
    update public.auth_rate_limits
    set attempt_count = 0, locked_until = null, last_attempt = v_now
    where key = p_key;
    return jsonb_build_object('is_locked', false, 'seconds_remaining', 0);
  end if;

  -- Check if actively locked
  if v_rec.locked_until is not null and v_rec.locked_until > v_now then
    v_remaining := ceil(extract(epoch from (v_rec.locked_until - v_now)))::integer;
    return jsonb_build_object('is_locked', true, 'seconds_remaining', v_remaining);
  end if;

  return jsonb_build_object('is_locked', false, 'seconds_remaining', 0);
end;
$$ language plpgsql security definer set search_path = public;

-- -----------------------------------------------------------------------------
-- 5. Function: record_auth_failed_attempt(p_key text)
-- Increments failed count and applies progressive lockout delays:
-- 5 attempts: 15s lock
-- 6 attempts: 30s lock
-- 7 attempts: 60s lock
-- 8+ attempts: 15m (900s) lock
-- Returns JSON: { "locked": boolean, "lockout_seconds": integer }
-- -----------------------------------------------------------------------------
create or replace function public.record_auth_failed_attempt(p_key text)
returns jsonb as $$
declare
  v_rec record;
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_count integer;
  v_lock_seconds integer := 0;
  v_locked_until timestamp with time zone := null;
begin
  select * into v_rec from public.auth_rate_limits where key = p_key for update;

  if not found then
    insert into public.auth_rate_limits (key, attempt_count, last_attempt)
    values (p_key, 1, v_now);
    return jsonb_build_object('locked', false, 'lockout_seconds', 0);
  end if;

  -- If last attempt was older than 15 minutes, reset count
  if v_rec.last_attempt < (v_now - interval '15 minutes') then
    v_count := 1;
  else
    v_count := v_rec.attempt_count + 1;
  end if;

  if v_count >= 8 then
    v_lock_seconds := 900; -- 15 minutes
  elsif v_count = 7 then
    v_lock_seconds := 60;  -- 1 minute
  elsif v_count = 6 then
    v_lock_seconds := 30;  -- 30 seconds
  elsif v_count = 5 then
    v_lock_seconds := 15;  -- 15 seconds
  end if;

  if v_lock_seconds > 0 then
    v_locked_until := v_now + (v_lock_seconds || ' seconds')::interval;
  end if;

  update public.auth_rate_limits
  set attempt_count = v_count,
      last_attempt = v_now,
      locked_until = v_locked_until
  where key = p_key;

  return jsonb_build_object(
    'locked', v_lock_seconds > 0,
    'lockout_seconds', v_lock_seconds
  );
end;
$$ language plpgsql security definer set search_path = public;

-- -----------------------------------------------------------------------------
-- 6. Function: clear_auth_throttle(p_key text)
-- Cleans up entries on successful authentication
-- -----------------------------------------------------------------------------
create or replace function public.clear_auth_throttle(p_key text)
returns void as $$
begin
  delete from public.auth_rate_limits where key = p_key;
end;
$$ language plpgsql security definer set search_path = public;

-- -----------------------------------------------------------------------------
-- 7. Permissions: Grant execution to anon and authenticated
-- -----------------------------------------------------------------------------
grant execute on function public.is_admin_member() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.check_auth_throttle(text) to anon, authenticated;
grant execute on function public.record_auth_failed_attempt(text) to anon, authenticated;
grant execute on function public.clear_auth_throttle(text) to anon, authenticated;

-- =============================================================================
-- MIGRATION 4/6: 20261017000003_secure_rate_limits.sql
-- =============================================================================

-- =============================================================================
-- Migration: 20261017000003_secure_rate_limits.sql
-- Description:
-- 1. Tightens rate-limiting RPC permissions:
--    REVOKES EXECUTE from PUBLIC, anon, and authenticated.
--    GRANTS EXECUTE strictly and exclusively to service_role.
-- 2. Enforces lockout design:
--    - The email-only key ('email:%') caps lockout at 60 seconds maximum to
--      prevent external Denial of Service against the admin's account.
--    - The IP key ('ip:%') and IP+email pair keys continue to enforce the full
--      progressive delay up to 15 minutes (900 seconds).
-- 3. Confirms RLS enabled on auth_rate_limits with zero policies.
-- =============================================================================

-- Ensure RLS is active with zero public policies
alter table public.auth_rate_limits enable row level security;

-- -----------------------------------------------------------------------------
-- Function: record_auth_failed_attempt(p_key text)
-- Updated with asymmetric lockout caps:
-- - email-only keys ('email:%'): capped at 60s max lockout.
-- - IP and compound keys: full progressive lockout up to 900s (15m).
-- -----------------------------------------------------------------------------
create or replace function public.record_auth_failed_attempt(p_key text)
returns jsonb as $$
declare
  v_rec record;
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_count integer;
  v_lock_seconds integer := 0;
  v_locked_until timestamp with time zone := null;
  v_is_email_key boolean := p_key like 'email:%';
begin
  select * into v_rec from public.auth_rate_limits where key = p_key for update;

  if not found then
    insert into public.auth_rate_limits (key, attempt_count, last_attempt)
    values (p_key, 1, v_now);
    return jsonb_build_object('locked', false, 'lockout_seconds', 0);
  end if;

  -- Reset if last attempt was older than 15 minutes
  if v_rec.last_attempt < (v_now - interval '15 minutes') then
    v_count := 1;
  else
    v_count := v_rec.attempt_count + 1;
  end if;

  if v_is_email_key then
    -- Email-only lockout design:
    -- 5 attempts: 15s lock
    -- 6 attempts: 30s lock
    -- 7+ attempts: 60s MAX lockout (prevents denial of service on admin email)
    if v_count >= 7 then
      v_lock_seconds := 60;
    elsif v_count = 6 then
      v_lock_seconds := 30;
    elsif v_count = 5 then
      v_lock_seconds := 15;
    end if;
  else
    -- IP and Compound pair lockout design:
    -- 5 attempts: 15s lock
    -- 6 attempts: 30s lock
    -- 7 attempts: 60s lock
    -- 8+ attempts: 900s (15 minutes) lockout
    if v_count >= 8 then
      v_lock_seconds := 900;
    elsif v_count = 7 then
      v_lock_seconds := 60;
    elsif v_count = 6 then
      v_lock_seconds := 30;
    elsif v_count = 5 then
      v_lock_seconds := 15;
    end if;
  end if;

  if v_lock_seconds > 0 then
    v_locked_until := v_now + (v_lock_seconds || ' seconds')::interval;
  end if;

  update public.auth_rate_limits
  set attempt_count = v_count,
      last_attempt = v_now,
      locked_until = v_locked_until
  where key = p_key;

  return jsonb_build_object(
    'locked', v_lock_seconds > 0,
    'lockout_seconds', v_lock_seconds
  );
end;
$$ language plpgsql security definer set search_path = public;

-- -----------------------------------------------------------------------------
-- Revoke all execute rights from public, anon, and authenticated
-- -----------------------------------------------------------------------------
revoke execute on function public.check_auth_throttle(text) from public, anon, authenticated;
revoke execute on function public.record_auth_failed_attempt(text) from public, anon, authenticated;
revoke execute on function public.clear_auth_throttle(text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Grant execute rights strictly to service_role
-- -----------------------------------------------------------------------------
grant execute on function public.check_auth_throttle(text) to service_role;
grant execute on function public.record_auth_failed_attempt(text) to service_role;
grant execute on function public.clear_auth_throttle(text) to service_role;

-- =============================================================================
-- MIGRATION 5/6: 20261017000004_stage6a_crud.sql
-- =============================================================================

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

-- =============================================================================
-- MIGRATION 6/6: 20261017000005_stage6b_unification.sql
-- =============================================================================

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

-- =============================================================================
-- Migration: 20261017000007_stage8.sql
-- Description:
-- 1. Defense-in-depth bucket-level storage limits:
--    - resume: 5 MB (5,242,880 bytes), application/pdf only.
--    - certificates: 10 MB (10,485,760 bytes), application/pdf, image/png, image/jpeg, image/webp.
-- 2. Contact form lockdown:
--    - Drops anon insert policy on public.messages.
--    - Revokes INSERT on public.messages from anon, authenticated, public.
--    - Ensures all contact messages must flow through the server route with service_role.
-- 3. Messages table constraints:
--    - Enforces message length between 10 and 3000 chars.
--    - Enforces subject length up to 150 chars.
-- 4. Contact form persistent rate limiting:
--    - Creates public.contact_rate_limits table with RLS enabled and zero public policies.
--    - Creates check_contact_rate_limit(p_ip_hash text) RPC function.
--    - Revokes execute from public, anon, authenticated; grants strictly to service_role.
-- =============================================================================

-- 1. Bucket limits as defense in depth
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf']
where id = 'resume';

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
where id = 'certificates';

-- 2. Lockdown public.messages against direct client inserts
drop policy if exists "Anon and authenticated can insert contact messages" on public.messages;
revoke insert on table public.messages from anon, authenticated, public;

-- 3. Align message length and subject constraints (10-3000 chars for message, up to 150 for subject)
alter table public.messages drop constraint if exists messages_message_check;
alter table public.messages add constraint messages_message_check check (char_length(trim(message)) between 10 and 3000);

alter table public.messages drop constraint if exists messages_subject_check;
alter table public.messages add constraint messages_subject_check check (subject is null or (char_length(trim(subject)) between 1 and 150));

-- 4. Contact rate limits table
create table if not exists public.contact_rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamp with time zone not null default timezone('utc'::text, now()),
  last_attempt timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.contact_rate_limits enable row level security;

-- 5. Persistent rate-limiting function (service_role only)
create or replace function public.check_contact_rate_limit(p_ip_hash text default null)
returns jsonb as $$
declare
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_ip_key text;
  v_daily_key text := 'global:daily:' || to_char(v_now, 'YYYY-MM-DD');
  v_ip_rec record;
  v_daily_rec record;
  v_ip_count integer := 1;
  v_daily_count integer := 1;
begin
  -- 1. Global daily cap: max 50 messages/day across all visitors
  select * into v_daily_rec from public.contact_rate_limits where key = v_daily_key for update;
  if found then
    if v_daily_rec.count >= 50 then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'Daily global threshold reached. Please contact directly via email.',
        'retry_after_seconds', 86400
      );
    end if;
    v_daily_count := v_daily_rec.count + 1;
    update public.contact_rate_limits
    set count = v_daily_count,
        last_attempt = v_now
    where key = v_daily_key;
  else
    insert into public.contact_rate_limits (key, count, window_start, last_attempt)
    values (v_daily_key, 1, v_now, v_now);
  end if;

  -- 2. Per-IP hourly cap: max 3 messages per 1 hour rolling window
  -- (If no IP could be determined, only the global daily cap applies; never share one bucket across everyone)
  if p_ip_hash is not null and p_ip_hash <> '' then
    v_ip_key := 'ip:' || p_ip_hash;
    select * into v_ip_rec from public.contact_rate_limits where key = v_ip_key for update;
    if found then
      if v_ip_rec.window_start < (v_now - interval '1 hour') then
        update public.contact_rate_limits
        set count = 1,
            window_start = v_now,
            last_attempt = v_now
        where key = v_ip_key;
        v_ip_count := 1;
      else
        if v_ip_rec.count >= 3 then
          return jsonb_build_object(
            'allowed', false,
            'reason', 'Hourly message limit reached. Please wait before sending another message.',
            'retry_after_seconds', extract(epoch from ((v_ip_rec.window_start + interval '1 hour') - v_now))::integer
          );
        end if;
        v_ip_count := v_ip_rec.count + 1;
        update public.contact_rate_limits
        set count = v_ip_count,
            last_attempt = v_now
        where key = v_ip_key;
      end if;
    else
      insert into public.contact_rate_limits (key, count, window_start, last_attempt)
      values (v_ip_key, 1, v_now, v_now);
    end if;

    return jsonb_build_object(
      'allowed', true,
      'count', v_ip_count,
      'remaining', 3 - v_ip_count
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'global_daily_count', v_daily_count
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Revoke execute from public, anon, and authenticated; grant strictly to service_role
revoke execute on function public.check_contact_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_contact_rate_limit(text) to service_role;

-- =============================================================================
-- SEED DATA: seed.sql
-- =============================================================================

-- =============================================================================
-- T V Ajay Personal Portfolio Initial Seed Data
-- Uses "insert ... on conflict do nothing" exclusively.
-- Zero "delete from" statements. Never overwrites content edited in admin.
-- =============================================================================

-- 1. Site Settings (Only inserted if table is empty)
insert into public.site_settings (
  id,
  site_title,
  name,
  title,
  headline,
  subtitle,
  email,
  github_url,
  linkedin_url,
  availability_badge_text,
  availability_badge_active,
  seo_description,
  resume_url,
  resume_updated_at,
  github_pinned_repos,
  github_hidden_repos
) values (
  1,
  'T V Ajay | Portfolio',
  'T V Ajay',
  'Computer Science Engineering Student',
  'T V Ajay',
  'Computer Science Engineering student who enjoys building practical projects with AI, learning new technologies, and turning ideas into working solutions.',
  'tvajay0@gmail.com',
  'https://github.com/TVAjayXDev',
  'https://www.linkedin.com/in/t-v-ajay-b047013a5/',
  'Open to internships',
  true,
  'Computer Science Engineering student who enjoys building practical projects with AI, learning new technologies, and turning ideas into working solutions.',
  null,
  null,
  '{}'::text[],
  '{}'::text[]
) on conflict (id) do nothing;

-- 2. Sections Order and Visibility Seed
insert into public.sections (id, title, subtitle, is_visible, sort_order) values
  ('hero', 'Hero', 'Student & Developer', true, 1),
  ('about', 'About', 'Academic background and technical foundations', true, 2),
  ('skills', 'Skills', 'Technical capabilities and tools', true, 3),
  ('featured_project', 'Featured Project', 'Clinical governance AI assistant', true, 4),
  ('projects', 'Projects', 'Independent builds and applications', true, 5),
  ('coming_soon', 'In Progress', 'Active projects in development', true, 6),
  ('github', 'Live GitHub Repositories', 'Open source repositories and code', true, 7),
  ('education', 'Education', 'Academic qualifications', true, 8),
  ('experience', 'Experience', 'Hackathons and activities', true, 9),
  ('certifications', 'Certifications', 'Verified certifications', true, 10),
  ('blog', 'Blog', 'Technical writeups and learnings', true, 11),
  ('contact', 'Contact', 'Get in touch for internships and collaborations', true, 12)
on conflict (id) do nothing;

-- 3. Skills Seed (ONLY HTML, TypeScript, Supabase)
insert into public.skills (name, category, is_published, sort_order) values
  ('HTML', 'Languages', true, 1),
  ('TypeScript', 'Languages', true, 2),
  ('Supabase', 'Cloud & DB', true, 3)
on conflict do nothing;

-- 4. Education Seed
-- B.E. CSE is published with null description.
-- 10th and 12th are unpublished drafts with null years and null grades.
insert into public.education (
  institution,
  degree,
  field_of_study,
  start_year,
  end_year,
  grade,
  current_semester,
  description,
  is_published,
  sort_order
) values
  (
    'Vidyavardhaka College of Engineering (VTU)',
    'B.E. Computer Science & Engineering',
    'Computer Science & Engineering',
    '2025',
    '2029',
    'CGPA 7.98',
    '3rd Semester',
    null,
    true,
    1
  ),
  (
    '[12th/PUC: College Name Placeholder]',
    'Pre-University College (12th)',
    'PCMC / Science',
    null,
    null,
    null,
    null,
    null,
    false,
    2
  ),
  (
    '[10th: School Name Placeholder]',
    'Secondary School Leaving Certificate (10th)',
    'General',
    null,
    null,
    null,
    null,
    null,
    false,
    3
  )
on conflict do nothing;

-- 5. Experience Seed (Dates and location null; no invented years or locations)
insert into public.experience (
  role,
  organization,
  location,
  start_date,
  end_date,
  description,
  is_published,
  sort_order
) values (
  'Participant',
  'HackSpirit 1.0, VVCE Mysore',
  null,
  null,
  null,
  'Participant at HackSpirit 1.0 hackathon, VVCE Mysore.',
  true,
  1
) on conflict do nothing;

-- 6. Projects Seed
-- TrustLens: clinical governance AI assistant (team "Cache Me Outside", empty technologies array until confirmed in admin)
-- CampusLink & CampusFinance: in progress, title and status only (null tagline, empty description, empty technologies)
insert into public.projects (
  title,
  slug,
  tagline,
  description,
  content,
  team,
  demo_url,
  github_url,
  status,
  is_featured,
  is_published,
  technologies,
  sort_order
) values
  (
    'TrustLens',
    'trustlens',
    'Clinical Governance AI Assistant',
    'A clinical governance AI assistant that answers hospital staff questions only from uploaded institutional documents, with paragraph-level citations, conflict detection, document hierarchy weighting and a provenance audit trail.',
    '# TrustLens: Clinical Governance AI Assistant

> **Note:** The live deployment uses synthetic demonstration data and does not constitute clinical guidance.

## Overview
TrustLens is a clinical governance AI assistant designed to answer hospital staff questions strictly and only from uploaded institutional documents. It eliminates ungrounded assertions by enforcing paragraph-level citations, conflict detection across document versions, hierarchical document weighting, and an immutable provenance audit trail.

## The Problem
Hospital clinicians and medical staff navigate institutional standard operating procedures (SOPs), infection control guidelines, and clinical protocols across intranet portals. Generic LLM solutions are unsafe in clinical contexts because they risk generating ungrounded advice, conflating outdated protocols with active guidance, or synthesizing assertions without traceability.

## Key Features

### 1. Strict Grounded Answering
TrustLens answers queries solely from uploaded institutional documents. If an answer cannot be grounded directly in the provided text, the system explicitly refuses to speculate.

### 2. Paragraph-Level Citations
Every recommendation and factual assertion is linked to an exact paragraph citation within the source document, providing clinicians with verifiable references.

### 3. Conflict Detection
When multiple institutional documents or revision drafts contain contradictory guidance, TrustLens flags the discrepancy rather than guessing.

### 4. Document Hierarchy Weighting
Policies are prioritized according to institutional authority—institutional directives override departmental guidelines, and newer revisions supersede older ones.

### 5. Provenance Audit Trail
Every query, retrieved context snippet, and generated answer is recorded with a provenance audit trail for governance compliance.

## Team
- **Cache Me Outside**

## Deployment
- **Live URL**: [https://trustlens-jet-omega.vercel.app/](https://trustlens-jet-omega.vercel.app/)
',
    'Cache Me Outside',
    'https://trustlens-jet-omega.vercel.app/',
    null,
    'live',
    true,
    true,
    array[]::text[],
    1
  ),
  (
    'CampusLink',
    'campuslink',
    null,
    '',
    '',
    null,
    null,
    null,
    'in_progress',
    false,
    true,
    array[]::text[],
    2
  ),
  (
    'CampusFinance',
    'campusfinance',
    null,
    '',
    '',
    null,
    null,
    null,
    'in_progress',
    false,
    true,
    array[]::text[],
    3
  )
on conflict (slug) do nothing;


-- =============================================================================
-- MIGRATION 7/7: 20261017000007_stage8.sql
-- =============================================================================

-- 1. Bucket limits as defense in depth
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf']
where id = 'resume';

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
where id = 'certificates';

-- 2. Lockdown public.messages against direct client inserts
drop policy if exists "Anon and authenticated can insert contact messages" on public.messages;
revoke insert on table public.messages from anon, authenticated, public;

-- 3. Align message length and subject constraints (10-3000 chars for message, up to 150 for subject)
alter table public.messages drop constraint if exists messages_message_check;
alter table public.messages add constraint messages_message_check check (char_length(trim(message)) between 10 and 3000);

alter table public.messages drop constraint if exists messages_subject_check;
alter table public.messages add constraint messages_subject_check check (subject is null or (char_length(trim(subject)) between 1 and 150));

-- 4. Contact rate limits table
create table if not exists public.contact_rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamp with time zone not null default timezone('utc'::text, now()),
  last_attempt timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.contact_rate_limits enable row level security;

-- 5. Persistent rate-limiting function (service_role only)
create or replace function public.check_contact_rate_limit(p_ip_hash text default null)
returns jsonb as $$
declare
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_ip_key text;
  v_daily_key text := 'global:daily:' || to_char(v_now, 'YYYY-MM-DD');
  v_ip_rec record;
  v_daily_rec record;
  v_ip_count integer := 1;
  v_daily_count integer := 1;
begin
  -- 1. Global daily cap: max 50 messages/day across all visitors
  select * into v_daily_rec from public.contact_rate_limits where key = v_daily_key for update;
  if found then
    if v_daily_rec.count >= 50 then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'Daily global threshold reached. Please contact directly via email.',
        'retry_after_seconds', 86400
      );
    end if;
    v_daily_count := v_daily_rec.count + 1;
    update public.contact_rate_limits
    set count = v_daily_count,
        last_attempt = v_now
    where key = v_daily_key;
  else
    insert into public.contact_rate_limits (key, count, window_start, last_attempt)
    values (v_daily_key, 1, v_now, v_now);
  end if;

  -- 2. Per-IP hourly cap: max 3 messages per 1 hour rolling window
  -- (If no IP could be determined, only the global daily cap applies; never share one bucket across everyone)
  if p_ip_hash is not null and p_ip_hash <> '' then
    v_ip_key := 'ip:' || p_ip_hash;
    select * into v_ip_rec from public.contact_rate_limits where key = v_ip_key for update;
    if found then
      if v_ip_rec.window_start < (v_now - interval '1 hour') then
        update public.contact_rate_limits
        set count = 1,
            window_start = v_now,
            last_attempt = v_now
        where key = v_ip_key;
        v_ip_count := 1;
      else
        if v_ip_rec.count >= 3 then
          return jsonb_build_object(
            'allowed', false,
            'reason', 'Hourly message limit reached. Please wait before sending another message.',
            'retry_after_seconds', extract(epoch from ((v_ip_rec.window_start + interval '1 hour') - v_now))::integer
          );
        end if;
        v_ip_count := v_ip_rec.count + 1;
        update public.contact_rate_limits
        set count = v_ip_count,
            last_attempt = v_now
        where key = v_ip_key;
      end if;
    else
      insert into public.contact_rate_limits (key, count, window_start, last_attempt)
      values (v_ip_key, 1, v_now, v_now);
    end if;

    return jsonb_build_object(
      'allowed', true,
      'count', v_ip_count,
      'remaining', 3 - v_ip_count
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'global_daily_count', v_daily_count
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Revoke execute from public, anon, and authenticated; grant strictly to service_role
revoke execute on function public.check_contact_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_contact_rate_limit(text) to service_role;


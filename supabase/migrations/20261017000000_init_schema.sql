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

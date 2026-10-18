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
  ('coming_soon', 'In Progress', 'Active projects in development', true, 5),
  ('github', 'Live GitHub Repositories', 'Open source repositories and code', true, 6),
  ('education', 'Education', 'Academic qualifications', true, 7),
  ('experience', 'Experience', 'Hackathons and activities', true, 8),
  ('certifications', 'Certifications', 'Verified certifications', true, 9),
  ('blog', 'Blog', 'Technical writeups and learnings', true, 10),
  ('contact', 'Contact', 'Get in touch for internships and collaborations', true, 11)
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

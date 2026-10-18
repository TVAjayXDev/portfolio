-- =============================================================================
-- Migration: 20261018000008_certifications_schema.sql
-- Description: Ensures thumbnail_url, category, and skills columns exist on
--              the public.certifications table.
-- =============================================================================

ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS category text not null default 'General';
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS skills text[] default '{}';

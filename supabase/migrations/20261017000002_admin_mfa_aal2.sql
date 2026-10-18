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

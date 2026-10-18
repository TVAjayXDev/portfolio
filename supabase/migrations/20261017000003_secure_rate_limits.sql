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

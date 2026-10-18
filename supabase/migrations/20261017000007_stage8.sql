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

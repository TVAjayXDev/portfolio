begin;

-- =============================================================================
-- Comprehensive RLS Security Test Script for T V Ajay Portfolio
--
-- IMPORTANT: Run in the Supabase SQL Editor.
-- The entire test suite observes real state inside this transaction and
-- ends with ROLLBACK. No DDL repairs are performed.
-- =============================================================================

do $$
declare
  v_count int;
  v_tests_passed int := 0;
  v_fake_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid := gen_random_uuid();
  v_test_obj_id uuid := gen_random_uuid();
  v_throttle_status jsonb;
  v_record_status jsonb;
  v_contact_status jsonb;
begin
  raise notice '=====================================================';
  raise notice 'RUNNING RLS SECURITY POLICY TEST SUITE (TRANSACTIONAL)';
  raise notice '=====================================================';

  -- -------------------------------------------------------------------
  -- SETUP: Fake users in auth.users, admin membership, test objects & message
  -- (All setup records exist only within this transaction and are rolled back)
  -- -------------------------------------------------------------------
  execute 'reset role';
  set local role postgres;

  -- 1. Insert fake admin and non-admin users into auth.users (satisfies FK constraints)
  insert into auth.users (id, aud, role, email)
  values
    (v_admin_user_id, 'authenticated', 'authenticated', 'test-admin-' || v_admin_user_id || '@example.invalid'),
    (v_fake_user_id, 'authenticated', 'authenticated', 'test-user-' || v_fake_user_id || '@example.invalid');

  -- 2. Add fake admin into public.admin_users
  insert into public.admin_users (user_id) values (v_admin_user_id);

  -- 3. Ensure baseline site_settings exists
  insert into public.site_settings (id, site_title, headline)
  values (1, 'T V Ajay | Portfolio', 'T V Ajay')
  on conflict (id) do nothing;

  -- 4. Ensure an unpublished education draft exists to test draft filtering
  insert into public.education (institution, degree, is_published, sort_order)
  values ('Test Engineering College', 'B.E. Computer Science', false, 9999);

  -- 5. Admin uploads test object to storage.objects in 'certificates' bucket
  insert into storage.objects (id, bucket_id, name, owner, metadata)
  values (v_test_obj_id, 'certificates', 'test-cert-token-secure.pdf', v_admin_user_id, '{"mimetype":"application/pdf"}'::jsonb);

  -- 6. Insert test message for admin inbox test (under postgres role, since anon insert is revoked)
  insert into public.messages (id, name, email, subject, message, is_read, is_archived)
  values (gen_random_uuid(), 'Dr. Alex', 'alex@hospital.org', 'Internship Inquiry', 'Hello Ajay, let us discuss an internship opportunity.', false, false);

  -- -------------------------------------------------------------------
  -- SUITE 1: ANONYMOUS VISITOR (anon)
  -- -------------------------------------------------------------------
  execute 'reset role';
  set local role anon;
  set local request.jwt.claims to '{"role":"anon"}';

  -- 1A: Anon reading published projects
  select count(*) into v_count from public.projects where is_published = true;
  assert v_count >= 1, 'FAIL: Anon could not read published projects';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 1A: Anon can read published projects (count: %)', v_count;

  -- 1B: Anon reading unpublished education rows (MUST RETURN 0)
  select count(*) into v_count from public.education where is_published = false;
  assert v_count = 0, 'FAIL: Anon could read unpublished education drafts!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 1B: Anon CANNOT read unpublished education rows (count: 0)';

  -- 1C: Anon reading messages table (MUST RETURN 0)
  select count(*) into v_count from public.messages;
  assert v_count = 0, 'FAIL: Anon could read messages table!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 1C: Anon CANNOT read messages table (count: 0)';

  -- 1D: Anon listing storage objects (MUST RETURN 0)
  select count(*) into v_count from storage.objects where bucket_id = 'certificates';
  assert v_count = 0, 'FAIL: Anon could list storage objects!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 1D: Anon CANNOT list objects in storage buckets (count: 0)';

  -- 1E: Anon direct INSERT on messages table is strictly BLOCKED (privilege revoked)
  begin
    insert into public.messages (name, email, subject, message, is_read, is_archived)
    values ('Attacker Bot', 'bot@spammer.org', 'Inquiry', 'Attempting direct insert via REST anon key', false, false);
    raise exception 'FAIL: Anon was able to insert directly into messages table!';
  exception when insufficient_privilege then
    v_tests_passed := v_tests_passed + 1;
    raise notice '[PASS] Test 1E: Anon direct INSERT on messages is strictly BLOCKED (insufficient_privilege)';
  end;

  -- 1F: Anon direct INSERT with is_read=true is strictly BLOCKED
  begin
    insert into public.messages (name, email, message, is_read, is_archived)
    values ('Spoofed Admin', 'spoof@attacker.com', 'Trying to mark as read', true, false);
    raise exception 'FAIL: Anon was able to insert message with is_read=true!';
  exception when insufficient_privilege then
    v_tests_passed := v_tests_passed + 1;
    raise notice '[PASS] Test 1F: Anon direct INSERT with is_read=true is strictly BLOCKED';
  end;

  -- 1G: Anon direct INSERT with is_archived=true is strictly BLOCKED
  begin
    insert into public.messages (name, email, message, is_read, is_archived)
    values ('Spoofed Admin', 'spoof@attacker.com', 'Trying to archive directly', false, true);
    raise exception 'FAIL: Anon was able to insert message with is_archived=true!';
  exception when insufficient_privilege then
    v_tests_passed := v_tests_passed + 1;
    raise notice '[PASS] Test 1G: Anon direct INSERT with is_archived=true is strictly BLOCKED';
  end;

  -- 1H: Anon direct INSERT of malformed payload is strictly BLOCKED
  begin
    insert into public.messages (name, email, message)
    values ('', 'invalid-email', '');
    raise exception 'FAIL: Anon was able to insert into messages!';
  exception when insufficient_privilege then
    v_tests_passed := v_tests_passed + 1;
    raise notice '[PASS] Test 1H: Anon direct INSERT on messages is uniformly denied';
  end;

  -- 1I: Anon inserting into projects (MUST FAIL per RLS WITH CHECK)
  begin
    insert into public.projects (title, slug, description, status)
    values ('Hacked Project', 'hacked', 'Exploit', 'live');
    raise exception 'FAIL: Anon was able to insert into projects!';
  exception when insufficient_privilege then
    v_tests_passed := v_tests_passed + 1;
    raise notice '[PASS] Test 1I: Anon blocked from INSERT on projects table';
  end;

  -- 1J: Anon updating site_settings (MUST AFFECT 0 ROWS per RLS USING clause)
  update public.site_settings set site_title = 'Defaced Portfolio' where id = 1;
  get diagnostics v_count = row_count;
  assert v_count = 0, 'FAIL: Anon was able to update site_settings!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 1J: Anon CANNOT update site_settings (rows affected: 0)';

  -- -------------------------------------------------------------------
  -- SUITE 2: SIGNED-IN NON-ADMIN USER (authenticated, not in admin_users)
  -- -------------------------------------------------------------------
  execute 'reset role';
  set local role authenticated;
  execute format('set local request.jwt.claims to ''{"sub":"%s", "role":"authenticated", "email":"regular_visitor@example.com"}''', v_fake_user_id);

  -- 2A: Non-admin updating site_settings (MUST AFFECT 0 ROWS per RLS USING clause)
  update public.site_settings set site_title = 'Unauthorized Title' where id = 1;
  get diagnostics v_count = row_count;
  assert v_count = 0, 'FAIL: Non-admin was able to update site_settings!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 2A: Signed-in non-admin CANNOT update site_settings (rows affected: 0)';

  -- 2B: Non-admin reading messages (MUST RETURN 0)
  select count(*) into v_count from public.messages;
  assert v_count = 0, 'FAIL: Non-admin was able to read messages!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 2B: Signed-in non-admin CANNOT read messages (count: 0)';

  -- 2C: Non-admin reading admin_users table (MUST RETURN 0)
  select count(*) into v_count from public.admin_users;
  assert v_count = 0, 'FAIL: Non-admin was able to inspect admin_users!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 2C: Signed-in non-admin CANNOT read admin_users list (count: 0)';

  -- 2D: Non-admin listing storage objects (MUST RETURN 0)
  select count(*) into v_count from storage.objects where bucket_id = 'certificates';
  assert v_count = 0, 'FAIL: Non-admin was able to list storage objects!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 2D: Signed-in non-admin CANNOT list storage objects (count: 0)';

  -- -------------------------------------------------------------------
  -- SUITE 3A: ADMIN WITH PASSWORD-ONLY (AAL1, NOT ELEVATED BY MFA)
  -- -------------------------------------------------------------------
  execute 'reset role';
  set local role authenticated;
  execute format('set local request.jwt.claims to ''{"sub":"%s", "role":"authenticated", "aal":"aal1"}''', v_admin_user_id);

  -- 3A.1: Admin membership check succeeds
  assert public.is_admin_member() = true, 'FAIL: is_admin_member() must return true for admin user';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3A.1: public.is_admin_member() returns TRUE for admin user';

  -- 3A.2: is_admin() MUST return FALSE at AAL1
  assert public.is_admin() = false, 'FAIL: is_admin() must return FALSE when JWT is only AAL1';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3A.2: public.is_admin() returns FALSE for AAL1 admin token';

  -- 3A.3: Admin with AAL1 token CANNOT write or update site_settings
  update public.site_settings set site_title = 'AAL1 Deface' where id = 1;
  get diagnostics v_count = row_count;
  assert v_count = 0, 'FAIL: AAL1 admin was able to update site_settings!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3A.3: AAL1 admin token CANNOT write/update site_settings (rows affected: 0)';

  -- 3A.4: Admin with AAL1 token CANNOT read messages
  select count(*) into v_count from public.messages;
  assert v_count = 0, 'FAIL: AAL1 admin was able to read messages!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3A.4: AAL1 admin token CANNOT read messages (count: 0)';

  -- 3A.5: Admin with AAL1 token CANNOT read unpublished drafts
  select count(*) into v_count from public.education where is_published = false;
  assert v_count = 0, 'FAIL: AAL1 admin was able to view unpublished drafts!';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3A.5: AAL1 admin token CANNOT view unpublished drafts (count: 0)';

  -- -------------------------------------------------------------------
  -- SUITE 3B: AUTHORIZED ADMIN WITH ELEVATED MFA (AAL2)
  -- -------------------------------------------------------------------
  execute 'reset role';
  set local role authenticated;
  execute format('set local request.jwt.claims to ''{"sub":"%s", "role":"authenticated", "aal":"aal2"}''', v_admin_user_id);

  -- 3B.1: Admin checking is_admin() function with AAL2
  assert public.is_admin() = true, 'FAIL: is_admin() did not evaluate to true for AAL2 admin';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3B.1: public.is_admin() correctly returns TRUE for AAL2 admin';

  -- 3B.2: AAL2 Admin reading unpublished education drafts
  select count(*) into v_count from public.education where is_published = false;
  assert v_count >= 1, 'FAIL: AAL2 Admin could not see unpublished education drafts';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3B.2: AAL2 Admin CAN view unpublished drafts (count: %)', v_count;

  -- 3B.3: AAL2 Admin reading contact messages
  select count(*) into v_count from public.messages;
  assert v_count >= 1, 'FAIL: AAL2 Admin could not read messages';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3B.3: AAL2 Admin CAN read incoming messages in inbox (count: %)', v_count;

  -- 3B.4: AAL2 Admin updating site_settings
  update public.site_settings set headline = 'T V Ajay' where id = 1;
  get diagnostics v_count = row_count;
  assert v_count = 1, 'FAIL: AAL2 Admin could not update site_settings';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3B.4: AAL2 Admin CAN update site_settings (rows affected: 1)';

  -- 3B.5: AAL2 Admin listing storage objects
  select count(*) into v_count from storage.objects where bucket_id = 'certificates' and id = v_test_obj_id;
  assert v_count = 1, 'FAIL: AAL2 Admin could not list storage objects';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 3B.5: AAL2 Admin CAN list storage objects (found test object: 1)';

  -- -------------------------------------------------------------------
  -- SUITE 4: PERSISTENT RATE LIMITING (service_role ONLY)
  -- -------------------------------------------------------------------
  execute 'reset role';
  set local role service_role;
  set local request.jwt.claims to '{"role":"service_role"}';

  -- 4A: Initially not locked
  v_throttle_status := public.check_auth_throttle('test-rl-key');
  assert (v_throttle_status->>'is_locked')::boolean = false, 'FAIL: throttle should be unlocked initially';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 4A: check_auth_throttle correctly starts unlocked (service_role)';

  -- 4B: Record 5 failed attempts -> 5th triggers 15s lock
  perform public.record_auth_failed_attempt('test-rl-key');
  perform public.record_auth_failed_attempt('test-rl-key');
  perform public.record_auth_failed_attempt('test-rl-key');
  perform public.record_auth_failed_attempt('test-rl-key');
  v_record_status := public.record_auth_failed_attempt('test-rl-key');
  assert (v_record_status->>'locked')::boolean = true, 'FAIL: 5th attempt must lock';
  assert (v_record_status->>'lockout_seconds')::int = 15, 'FAIL: 5th attempt lock must be 15s';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 4B: 5 failed attempts persistent lock triggered (15s) (service_role)';

  -- 4C: Clear throttle resets state
  perform public.clear_auth_throttle('test-rl-key');
  v_throttle_status := public.check_auth_throttle('test-rl-key');
  assert (v_throttle_status->>'is_locked')::boolean = false, 'FAIL: throttle should be clear after clear_auth_throttle';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 4C: clear_auth_throttle successfully resets persistent record (service_role)';

  -- 4D: Throttle functions must raise insufficient_privilege for anon AND authenticated
  -- 4D.1: Test under role 'anon'
  execute 'reset role';
  set local role anon;
  set local request.jwt.claims to '{"role":"anon"}';

  begin
    execute 'select public.check_auth_throttle(''probe-anon-key'')';
    raise exception 'FAIL: anon was able to execute check_auth_throttle!';
  exception when insufficient_privilege then
    -- Expected: execute revoked from anon
  end;

  begin
    execute 'select public.record_auth_failed_attempt(''probe-anon-key'')';
    raise exception 'FAIL: anon was able to execute record_auth_failed_attempt!';
  exception when insufficient_privilege then
    -- Expected: execute revoked from anon
  end;

  begin
    execute 'select public.clear_auth_throttle(''probe-anon-key'')';
    raise exception 'FAIL: anon was able to execute clear_auth_throttle!';
  exception when insufficient_privilege then
    -- Expected: execute revoked from anon
  end;

  begin
    execute 'select public.check_contact_rate_limit(''probe-anon-hash'')';
    raise exception 'FAIL: anon was able to execute check_contact_rate_limit!';
  exception when insufficient_privilege then
    -- Expected: execute revoked from anon
  end;

  -- 4D.2: Test under role 'authenticated'
  execute 'reset role';
  set local role authenticated;
  execute format('set local request.jwt.claims to ''{"sub":"%s", "role":"authenticated"}''', v_fake_user_id);

  begin
    execute 'select public.check_auth_throttle(''probe-auth-key'')';
    raise exception 'FAIL: authenticated was able to execute check_auth_throttle!';
  exception when insufficient_privilege then
    -- Expected: execute revoked from authenticated
  end;

  begin
    execute 'select public.record_auth_failed_attempt(''probe-auth-key'')';
    raise exception 'FAIL: authenticated was able to execute record_auth_failed_attempt!';
  exception when insufficient_privilege then
    -- Expected: execute revoked from authenticated
  end;

  begin
    execute 'select public.clear_auth_throttle(''probe-auth-key'')';
    raise exception 'FAIL: authenticated was able to execute clear_auth_throttle!';
  exception when insufficient_privilege then
    -- Expected: execute revoked from authenticated
  end;

  begin
    execute 'select public.check_contact_rate_limit(''probe-auth-hash'')';
    raise exception 'FAIL: authenticated was able to execute check_contact_rate_limit!';
  exception when insufficient_privilege then
    -- Expected: execute revoked from authenticated
  end;

  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 4D: Throttle functions strictly raise insufficient_privilege for anon and authenticated';

  -- 4E: check_contact_rate_limit operates under service_role
  execute 'reset role';
  set local role service_role;
  set local request.jwt.claims to '{"role":"service_role"}';

  v_contact_status := public.check_contact_rate_limit('test-salted-hash-service-role');
  assert (v_contact_status->>'allowed')::boolean = true, 'FAIL: check_contact_rate_limit should allow initial attempt';
  v_tests_passed := v_tests_passed + 1;
  raise notice '[PASS] Test 4E: check_contact_rate_limit correctly executes under service_role';

  raise notice '=====================================================';
  raise notice 'ALL % RLS, MFA AAL2, AND AUTHORIZATION TESTS PASSED!', v_tests_passed;
  raise notice '=====================================================';
end $$;

rollback;

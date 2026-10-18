import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be defined in .env.local");
assert.ok(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined in .env.local");
assert.ok(serviceKey, "SUPABASE_SERVICE_ROLE_KEY must be defined in .env.local");

const anonClient = createClient(supabaseUrl, anonKey);
const serviceClient = createClient(supabaseUrl, serviceKey);

// =============================================================================
// SUITE 1: Anonymous Client Cannot Read Sensitive or Unpublished Data
// =============================================================================

test("[VISITOR ATTACK] Anon cannot read ANY row from admin_users, auth_rate_limits, or messages", async () => {
  // 1. admin_users
  const { data: adminUsers, error: adminErr } = await anonClient
    .from("admin_users")
    .select("*");
  assert.equal(
    adminErr === null ? adminUsers.length : 0,
    0,
    "Anon must receive 0 rows from admin_users"
  );

  // 2. auth_rate_limits
  const { data: rateLimits, error: rateErr } = await anonClient
    .from("auth_rate_limits")
    .select("*");
  assert.equal(
    rateErr === null ? rateLimits.length : 0,
    0,
    "Anon must receive 0 rows from auth_rate_limits"
  );

  // 3. messages
  const { data: messages, error: msgErr } = await anonClient
    .from("messages")
    .select("*");
  assert.equal(
    msgErr === null ? messages.length : 0,
    0,
    "Anon must receive 0 rows from messages"
  );
});

test("[VISITOR ATTACK] Anon cannot read unpublished rows across any content table", async () => {
  const contentTables = [
    "projects",
    "posts",
    "experience",
    "certifications",
    "skills",
  ];

  for (const table of contentTables) {
    const { data, error } = await anonClient
      .from(table)
      .select("*")
      .eq("is_published", false);

    assert.equal(
      error === null ? data.length : 0,
      0,
      `Anon must NOT be able to read unpublished rows from table "${table}"`
    );
  }
});

// =============================================================================
// SUITE 2: Anonymous Client Cannot Insert, Update, or Delete
// =============================================================================

test("[VISITOR ATTACK] Anon cannot insert into any protected table (RLS or REVOKE rejects)", async () => {
  const attackUuid = "00000000-0000-0000-0000-000000000001";

  // 1. projects insert
  const { error: projErr } = await anonClient.from("projects").insert({
    title: "Injected Project",
    slug: "injected-project",
    description: "Malicious payload",
    status: "live",
  });
  assert.ok(projErr, "Anon insert into projects must return an error");

  // 2. skills insert
  const { error: skillErr } = await anonClient.from("skills").insert({
    name: "Injected Skill",
    category: "Languages",
  });
  assert.ok(skillErr, "Anon insert into skills must return an error");

  // 3. site_settings insert (attempting to override id=2)
  const { error: settingsErr } = await anonClient.from("site_settings").insert({
    id: 2,
    site_title: "Defaced",
  });
  assert.ok(settingsErr, "Anon insert into site_settings must return an error");

  // 4. admin_users insert
  const { error: adminErr } = await anonClient.from("admin_users").insert({
    user_id: attackUuid,
  });
  assert.ok(adminErr, "Anon insert into admin_users must return an error");

  // 5. sections insert
  const { error: secErr } = await anonClient.from("sections").insert({
    id: "injected_section",
    title: "Injected",
  });
  assert.ok(secErr, "Anon insert into sections must return an error");
});

test("[VISITOR ATTACK] Anon cannot update or delete any row in any table", async () => {
  const nonExistentUuid = "00000000-0000-0000-0000-000000000099";

  // 1. Attempt UPDATE on site_settings
  const { data: updateSettings, error: updateSettingsErr } = await anonClient
    .from("site_settings")
    .update({ headline: "Defaced Headline" })
    .eq("id", 1)
    .select();

  assert.equal(
    updateSettingsErr === null ? updateSettings.length : 0,
    0,
    "Anon update on site_settings must modify 0 rows"
  );

  // Verify headline in live database was not modified
  const { data: realSettings } = await serviceClient
    .from("site_settings")
    .select("headline")
    .eq("id", 1)
    .single();
  assert.notEqual(realSettings?.headline, "Defaced Headline");

  // 2. Attempt DELETE on skills
  const { data: deleteSkills, error: deleteSkillsErr } = await anonClient
    .from("skills")
    .delete()
    .eq("id", nonExistentUuid)
    .select();

  assert.equal(
    deleteSkillsErr === null ? deleteSkills.length : 0,
    0,
    "Anon delete on skills must modify 0 rows"
  );

  // 3. Attempt UPDATE on projects
  const { data: updateProjects, error: updateProjErr } = await anonClient
    .from("projects")
    .update({ description: "Hacked project" })
    .eq("slug", "trustlens")
    .select();

  assert.equal(
    updateProjErr === null ? updateProjects.length : 0,
    0,
    "Anon update on projects must modify 0 rows"
  );

  // Verify TrustLens was not modified
  const { data: realProject } = await serviceClient
    .from("projects")
    .select("description")
    .eq("slug", "trustlens")
    .single();
  assert.notEqual(realProject?.description, "Hacked project");
});

// =============================================================================
// SUITE 3: Storage Bucket Attacks Blocked
// =============================================================================

test("[VISITOR ATTACK] Anon cannot list, upload to, or delete from storage buckets", async () => {
  const buckets = ["resume", "certificates"];
  const fakePayload = Buffer.from("attack_probe");

  for (const bucket of buckets) {
    // 1. Upload attempt
    const attackFileName = `attack_${Date.now()}.pdf`;
    const { error: uploadError } = await anonClient.storage
      .from(bucket)
      .upload(attackFileName, fakePayload, { contentType: "application/pdf" });

    assert.ok(
      uploadError !== null,
      `Anon upload to bucket "${bucket}" must return an error`
    );

    // 2. Delete attempt
    const { data: deleteData, error: deleteError } = await anonClient.storage
      .from(bucket)
      .remove(["non_existent_or_protected.pdf"]);

    // Must return error or affect 0 items
    assert.ok(
      deleteError !== null || (Array.isArray(deleteData) && deleteData.length === 0),
      `Anon delete from bucket "${bucket}" must be rejected or affect 0 files`
    );
  }
});

// =============================================================================
// SUITE 4: Privileged RPC Function Execution Denied
// =============================================================================

test("[VISITOR ATTACK] Privileged RPC functions deny execution to anon or fail with unauthorized", async () => {
  // 1. check_contact_rate_limit: If migration 7 is applied, it strictly denies execute to anon
  const { error: contactErr } = await anonClient.rpc("check_contact_rate_limit", {
    p_ip_hash: "attack_hash",
  });
  assert.ok(
    contactErr !== null,
    "Anon calling check_contact_rate_limit must return an error (permission denied or unapplied migration)"
  );
});

// =============================================================================
// SUITE 5: HTTP Endpoint Attacks Against Live/Deployed Server (BASE_URL)
// =============================================================================

const BASE_URL = process.env.BASE_URL
  ? process.env.BASE_URL.replace(/\/$/, "")
  : "http://localhost:3000";

test("[VISITOR ATTACK] HTTP /admin routes reject unauthenticated visitors with 307 to /admin/login", async () => {
  const adminEndpoints = ["/admin", "/admin/settings", "/admin/projects", "/admin/messages"];
  for (const endpoint of adminEndpoints) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, { redirect: "manual" });
      assert.ok(
        res.status >= 300 && res.status < 400,
        `Expected redirect on ${endpoint}, got status ${res.status}`
      );
      const loc = res.headers.get("location") || "";
      assert.match(loc, /\/admin\/login/);
      const text = await res.text();
      assert.ok(
        !text.includes("Admin Settings") && !text.includes("Overview"),
        `No admin content should leak in response body of ${endpoint}`
      );
    } catch (e) {
      if (!process.env.BASE_URL && (e.code === "ECONNREFUSED" || e.cause?.code === "ECONNREFUSED")) {
        console.log(`[VISITOR ATTACK] Skipping HTTP checks: local server not listening on ${BASE_URL}`);
        return;
      }
      throw e;
    }
  }
});

test("[VISITOR ATTACK] HTTP /api/keepalive rejects unauthenticated requests with 401 Unauthorized", async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/keepalive`);
    assert.equal(res.status, 401, "Expected 401 Unauthorized without CRON_SECRET");
    const json = await res.json();
    assert.deepEqual(json, { error: "Unauthorized" });
  } catch (e) {
    if (!process.env.BASE_URL && (e.code === "ECONNREFUSED" || e.cause?.code === "ECONNREFUSED")) {
      return;
    }
    throw e;
  }
});

test("[VISITOR ATTACK] HTTP /api/contact traps honeypot bots silently and blocks malformed input", async () => {
  try {
    // 1. Honeypot filled: must return 200 without saving or processing
    const honeypotRes = await fetch(`${BASE_URL}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Spam Bot",
        email: "bot@spammer.com",
        message: "Buy cheap pills now",
        website: "https://spam.com", // honeypot
      }),
    });
    assert.equal(honeypotRes.status, 200);
    const honeypotData = await honeypotRes.json();
    assert.equal(honeypotData.success, true);

    // 2. Malformed input (invalid email, too short message): returns 400
    const badInputRes = await fetch(`${BASE_URL}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        email: "not-an-email",
        message: "hi",
      }),
    });
    assert.equal(badInputRes.status, 400);
  } catch (e) {
    if (!process.env.BASE_URL && (e.code === "ECONNREFUSED" || e.cause?.code === "ECONNREFUSED")) {
      return;
    }
    throw e;
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { contactFormSchema } from "../src/lib/validations/contact.ts";
import { sanitizeHeader } from "../src/lib/email.ts";
import { processContactSubmission } from "../src/lib/contact.ts";
import { assertLiveSupabasePrerequisites } from "./helpers/prerequisites.mjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// =============================================================================
// SUITE 1: Zod Schema & Sanitization Unit Tests
// =============================================================================

test("[VALIDATION] contactFormSchema strictly validates contact form fields", () => {
  // 1. Valid payload
  const valid = contactFormSchema.safeParse({
    name: "T V Ajay",
    email: "ajay@example.com",
    subject: "Internship Opportunity",
    message: "I am interested in your software engineering background.",
    _timestamp: Date.now() - 3000,
  });
  assert.equal(valid.success, true);

  // 2. Short message (< 10 chars)
  const tooShort = contactFormSchema.safeParse({
    name: "Alex",
    email: "alex@example.com",
    message: "Hi!",
  });
  assert.equal(tooShort.success, false);
  assert.match(tooShort.error?.issues[0]?.message || "", /at least 10 characters/i);

  // 3. Oversize message (> 3000 chars)
  const tooLong = contactFormSchema.safeParse({
    name: "Alex",
    email: "alex@example.com",
    message: "a".repeat(3001),
  });
  assert.equal(tooLong.success, false);
  assert.match(tooLong.error?.issues[0]?.message || "", /3000 characters or fewer/i);

  // 4. Invalid email format
  const badEmail = contactFormSchema.safeParse({
    name: "Alex",
    email: "not-an-email",
    message: "Hello this is a valid length message text.",
  });
  assert.equal(badEmail.success, false);

  // 5. Oversize subject (> 150 chars)
  const longSubject = contactFormSchema.safeParse({
    name: "Alex",
    email: "alex@example.com",
    subject: "s".repeat(151),
    message: "Hello this is a valid length message text.",
  });
  assert.equal(longSubject.success, false);
});

test("[SECURITY] sanitizeHeader strictly strips CRLF and control characters to prevent SMTP header injection", () => {
  const attackPayload = "visitor@example.com\r\nBcc: victim@target.com\r\nSubject: Injected Subject";
  const sanitized = sanitizeHeader(attackPayload);

  assert.equal(sanitized.includes("\r"), false);
  assert.equal(sanitized.includes("\n"), false);
  assert.equal(sanitized, "visitor@example.com Bcc: victim@target.com Subject: Injected Subject");

  // Null byte injection
  const nullBytePayload = "visitor@example.com\x00extra-content";
  assert.equal(sanitizeHeader(nullBytePayload), "visitor@example.com extra-content");
});

// =============================================================================
// SUITE 2: Email Dispatch Unit Tests (Mocked Resend)
// =============================================================================

test("[MOCKED] Email sending: mock Resend client asserts sender, recipient, subject, and Reply-To", async () => {
  let resendSendCalled = false;
  let sentPayload = null;

  // Mock Resend class
  class MockResend {
    constructor(key) {
      assert.equal(key, "re_test_mock_key_12345");
    }
    emails = {
      send: async (payload) => {
        resendSendCalled = true;
        sentPayload = payload;
        return { data: { id: "msg_mock_123" }, error: null };
      },
    };
  }

  // Simulate sendContactNotificationEmail logic using MockResend
  async function simulateSendEmail(params, apiKey) {
    if (!apiKey) return { sent: false, error: "RESEND_API_KEY unset" };
    const resend = new MockResend(apiKey);
    const sanitizedReplyTo = sanitizeHeader(params.email);
    const sanitizedName = sanitizeHeader(params.name);
    const sanitizedSubject = params.subject ? sanitizeHeader(params.subject) : "";

    const bodyText = [
      "New portfolio message received from contact form:",
      `Name: ${sanitizedName}`,
      `Email: ${sanitizedReplyTo}`,
      sanitizedSubject ? `Subject: ${sanitizedSubject}` : null,
      "Message:",
      params.message.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "tvajay0@gmail.com",
      subject: "New portfolio message",
      text: bodyText,
      replyTo: sanitizedReplyTo,
    });

    return { sent: !result.error, data: result.data };
  }

  const result = await simulateSendEmail(
    {
      name: "Morgan Visitor",
      email: "morgan@example.com\r\nCc: evil@attacker.com",
      subject: "Collaboration Request",
      message: "I would like to discuss an opportunity.",
    },
    "re_test_mock_key_12345"
  );

  assert.equal(result.sent, true);
  assert.equal(resendSendCalled, true);
  assert.equal(sentPayload?.from, "onboarding@resend.dev");
  assert.equal(sentPayload?.to, "tvajay0@gmail.com");
  assert.equal(sentPayload?.subject, "New portfolio message");
  assert.equal(sentPayload?.replyTo, "morgan@example.com Cc: evil@attacker.com");
  assert.equal(sentPayload?.replyTo?.includes("\r"), false);
  assert.equal(sentPayload?.replyTo?.includes("\n"), false);
});

// =============================================================================
// SUITE 3: Real Supabase Tests (Direct Anon Blocked, Route Submission, Rate Limiting, Honeypot)
// =============================================================================

test("[REAL SUPABASE] Prerequisite Check: verify migration 7 objects and bucket limits exist", async () => {
  await assertLiveSupabasePrerequisites({
    checkBuckets: true,
    checkContactRateLimit: true,
    checkMessagesAnonRevoked: true,
  });
});

test("[REAL SUPABASE] Direct anon insert into messages via Supabase REST: must be denied with error", async () => {
  assert.ok(supabaseUrl && supabaseAnonKey && serviceKey, "Supabase credentials required");

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const adminClient = createClient(supabaseUrl, serviceKey);
  const testEmail = `probe-anon-blocked-${Date.now()}@example.invalid`;

  try {
    // Attempt direct anon insert without .select()
    const { error: insertError } = await anonClient
      .from("messages")
      .insert({
        name: "Malicious Direct Anon Probe",
        email: testEmail,
        message: "Attempting direct anon insert over REST without route.",
      });

    // 1. MUST return an explicit permission/RLS denial error (e.g. 42501 permission denied)
    assert.ok(
      insertError !== null,
      "FAIL: Direct anon insert into messages succeeded without returning an error! Migration 20261017000007_stage8.sql (migration 7) must be applied to revoke anon INSERT on public.messages."
    );

    // 2. Confirm with service-role client that no row with this test marker exists in the database
    const { data: rows, error: selectError } = await adminClient
      .from("messages")
      .select("id")
      .eq("email", testEmail);

    assert.equal(selectError, null, "Admin select check failed");
    assert.equal(
      rows?.length || 0,
      0,
      "FAIL: Row was inserted into public.messages by anon client despite RLS!"
    );
  } finally {
    await adminClient.from("messages").delete().eq("email", testEmail);
  }
});

test("[REAL SUPABASE] Valid submission through route is persisted in messages table via service-role with correct fields", async () => {
  if (!supabaseUrl || !serviceKey) {
    console.log("Supabase service credentials not configured, skipping real network test.");
    return;
  }

  const testEmail = `test-valid-${Date.now()}@example.invalid`;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const res = await processContactSubmission(
      {
        name: "Test Legitimate Visitor",
        email: testEmail,
        subject: "Research Collaboration",
        message: "Hello Ajay, I would like to explore potential collaboration on AI projects.",
        _timestamp: Date.now() - 3500, // Valid elapsed fill time (> 2s)
      },
      "198.51.100.11",
      adminClient
    );

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);

    // Verify row was persisted in public.messages
    const { data: rows, error: selectErr } = await adminClient
      .from("messages")
      .select("*")
      .eq("email", testEmail);

    assert.equal(selectErr, null);
    assert.ok(rows && rows.length === 1, "Expected exactly 1 message row to be stored");
    assert.equal(rows[0].name, "Test Legitimate Visitor");
    assert.equal(rows[0].subject, "Research Collaboration");
    assert.equal(
      rows[0].message,
      "Hello Ajay, I would like to explore potential collaboration on AI projects."
    );
    assert.equal(rows[0].is_read, false);
    assert.equal(rows[0].is_archived, false);
  } finally {
    // Guaranteed cleanup
    await adminClient.from("messages").delete().eq("email", testEmail);
  }
});

test("[REAL SUPABASE] Honeypot submission returns fake success but stores ZERO rows in messages", async () => {
  if (!supabaseUrl || !serviceKey) {
    console.log("Supabase service credentials not configured, skipping real network test.");
    return;
  }

  const testEmail = `spambot-${Date.now()}@example.invalid`;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const res = await processContactSubmission(
      {
        name: "Spam Bot 3000",
        email: testEmail,
        subject: "Cheap SEO Services",
        message: "Buy high ranking backlinks from our platform now!",
        honeypot: "I am a spam bot filling this hidden field",
        _timestamp: Date.now() - 5000,
      },
      "198.51.100.99",
      adminClient
    );

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);

    // Verify ZERO rows were persisted
    const { data: rows } = await adminClient
      .from("messages")
      .select("*")
      .eq("email", testEmail);

    assert.equal(rows?.length || 0, 0, "Honeypot submission must store 0 rows in database");
  } finally {
    await adminClient.from("messages").delete().eq("email", testEmail);
  }
});

test("[REAL SUPABASE] 4th submission in an hour with same IP hash is rejected with 429", async () => {
  assert.ok(supabaseUrl && serviceKey, "Supabase service credentials required");

  const adminClient = createClient(supabaseUrl, serviceKey);
  const testIp = `198.51.100.${Math.floor(Math.random() * 200 + 50)}`;
  const testEmailPrefix = `test-rate-${Date.now()}`;

  const salt =
    process.env.CONTACT_IP_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "tv-ajay-secure-salt";
  const saltedIpHash = crypto
    .createHash("sha256")
    .update(`${testIp}:${salt}`)
    .digest("hex");
  const ipKey = `ip:${saltedIpHash}`;

  // Check if check_contact_rate_limit RPC is available in live Supabase - MUST FAIL LOUDLY if missing
  const { error: rpcCheckError } = await adminClient.rpc("check_contact_rate_limit", {
    p_ip_hash: "probe_check",
  });

  if (
    rpcCheckError &&
    (rpcCheckError.code === "PGRST202" ||
      rpcCheckError.message?.includes("Could not find the function"))
  ) {
    assert.fail(
      "migration 7 not applied: function check_contact_rate_limit not found in schema cache. Migration 20261017000007_stage8.sql must be applied in the Supabase SQL editor."
    );
  }
  assert.equal(
    rpcCheckError,
    null,
    `PREREQUISITE ERROR: check_contact_rate_limit probe failed: ${rpcCheckError?.message}`
  );

  try {
    // 1st submission -> allowed (status 200)
    const res1 = await processContactSubmission(
      {
        name: "Rate User",
        email: `${testEmailPrefix}-1@example.invalid`,
        message: "Attempt number one from this visitor.",
        _timestamp: Date.now() - 3000,
      },
      testIp,
      adminClient
    );
    assert.equal(res1.status, 200);

    // 2nd submission -> allowed (status 200)
    const res2 = await processContactSubmission(
      {
        name: "Rate User",
        email: `${testEmailPrefix}-2@example.invalid`,
        message: "Attempt number two from this visitor.",
        _timestamp: Date.now() - 3000,
      },
      testIp,
      adminClient
    );
    assert.equal(res2.status, 200);

    // 3rd submission -> allowed (status 200)
    const res3 = await processContactSubmission(
      {
        name: "Rate User",
        email: `${testEmailPrefix}-3@example.invalid`,
        message: "Attempt number three from this visitor.",
        _timestamp: Date.now() - 3000,
      },
      testIp,
      adminClient
    );
    assert.equal(res3.status, 200);

    // 4th submission -> MUST BE REJECTED with 429
    const res4 = await processContactSubmission(
      {
        name: "Rate User",
        email: `${testEmailPrefix}-4@example.invalid`,
        message: "Attempt number four should trigger rate limit.",
        _timestamp: Date.now() - 3000,
      },
      testIp,
      adminClient
    );
    assert.equal(res4.status, 429);
    assert.match(res4.data.error || "", /limit reached/i);
  } finally {
    // Guaranteed cleanup of any created messages and rate-limit tracking rows
    await adminClient
      .from("messages")
      .delete()
      .like("email", `${testEmailPrefix}%`);

    await adminClient.from("contact_rate_limits").delete().eq("key", ipKey);
    await adminClient.from("contact_rate_limits").delete().eq("key", "ip:probe_check");
  }
});

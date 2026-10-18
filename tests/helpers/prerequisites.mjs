import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

/**
 * Validates that all required Supabase database objects, RPC functions, constraints,
 * and bucket configurations are deployed in the live project before running real-Supabase test suites.
 * FAILS LOUDLY if any prerequisite or migration is missing.
 */
export async function assertLiveSupabasePrerequisites(options = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  assert.ok(supabaseUrl, "PREREQUISITE ERROR: NEXT_PUBLIC_SUPABASE_URL is not set.");
  assert.ok(anonKey, "PREREQUISITE ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  assert.ok(serviceKey, "PREREQUISITE ERROR: SUPABASE_SERVICE_ROLE_KEY is not set.");

  const serviceClient = createClient(supabaseUrl, serviceKey);
  const anonClient = createClient(supabaseUrl, anonKey);

  // 1. Verify Storage Bucket Configurations (Stage 7 / Migration 7)
  if (options.checkBuckets !== false) {
    const { data: buckets, error: bucketError } = await serviceClient.storage.listBuckets();
    assert.equal(
      bucketError,
      null,
      `PREREQUISITE ERROR: Failed to list storage buckets: ${bucketError?.message}`
    );

    const resumeBucket = buckets?.find((b) => b.name === "resume");
    const certsBucket = buckets?.find((b) => b.name === "certificates");

    assert.ok(
      resumeBucket,
      "PREREQUISITE ERROR: 'resume' storage bucket does not exist in live Supabase project."
    );
    assert.equal(
      resumeBucket.file_size_limit,
      5242880,
      "PREREQUISITE ERROR: 'resume' bucket file_size_limit must be 5242880 bytes (5 MB)."
    );
    assert.deepEqual(
      resumeBucket.allowed_mime_types,
      ["application/pdf"],
      "PREREQUISITE ERROR: 'resume' bucket allowed_mime_types must be ['application/pdf']."
    );

    assert.ok(
      certsBucket,
      "PREREQUISITE ERROR: 'certificates' storage bucket does not exist in live Supabase project."
    );
    assert.equal(
      certsBucket.file_size_limit,
      10485760,
      "PREREQUISITE ERROR: 'certificates' bucket file_size_limit must be 10485760 bytes (10 MB)."
    );
  }

  // 2. Verify Contact Rate Limit RPC Function (Stage 8 / Migration 7)
  if (options.checkContactRateLimit) {
    const { error: rpcError } = await serviceClient.rpc("check_contact_rate_limit", {
      p_ip_hash: "prereq_probe",
    });

    if (rpcError && (rpcError.code === "PGRST202" || rpcError.message?.includes("Could not find the function"))) {
      throw new Error(
        "PREREQUISITE ERROR: function public.check_contact_rate_limit(p_ip_hash) not found in schema cache. Migration 20261017000007_stage8.sql (migration 7) has not been applied in the Supabase SQL editor."
      );
    }
  }

  // 3. Verify Anon INSERT on public.messages is revoked (Stage 8 / Migration 7)
  if (options.checkMessagesAnonRevoked) {
    const probeEmail = `prereq-probe-${Date.now()}@example.invalid`;
    const { error: anonInsertError } = await anonClient.from("messages").insert({
      name: "Prereq Probe",
      email: probeEmail,
      message: "Testing anon insert permissions",
    });

    // Clean up if it slipped through
    await serviceClient.from("messages").delete().eq("email", probeEmail);

    if (!anonInsertError) {
      throw new Error(
        "PREREQUISITE ERROR: Anonymous insert into public.messages succeeded! Migration 20261017000007_stage8.sql (migration 7) has not been applied to drop policy and revoke INSERT on public.messages from anon."
      );
    }
  }

  return { serviceClient, anonClient };
}

import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  validateImageBuffer,
  detectFileSignature,
  MAX_IMAGE_SIZE,
} from "../src/lib/file-validation.ts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required");
assert.ok(serviceKey, "SUPABASE_SERVICE_ROLE_KEY is required");

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// =============================================================================
// REQUIREMENT A7: Admin Route Probe (Signed-Out Client, No Redirect Following)
// =============================================================================
test("[A7 PROBE] All 12 /admin/* routes return 307 redirect to /admin/login with zero admin body content", async () => {
  const adminRoutes = [
    "/admin",
    "/admin/settings",
    "/admin/about",
    "/admin/sections",
    "/admin/projects",
    "/admin/skills",
    "/admin/education",
    "/admin/experience",
    "/admin/certifications",
    "/admin/blog",
    "/admin/resume",
    "/admin/messages",
  ];

  for (const route of adminRoutes) {
    const res = await fetch(`http://localhost:3000${route}`, {
      method: "GET",
      redirect: "manual", // CRITICAL: Do NOT follow redirect
    });

    const status = res.status;
    const location = res.headers.get("location") || "";
    const bodyText = await res.text();

    // 1. Must return HTTP 307 Temporary Redirect (or 302)
    assert.ok(
      status === 307 || status === 302,
      `Route ${route} returned status ${status}, expected 307 or 302 redirect`
    );

    // 2. Redirect target must point to /admin/login
    assert.ok(
      location.includes("/admin/login"),
      `Route ${route} redirected to "${location}", expected /admin/login`
    );

    // 3. Body MUST NOT leak admin panel content or sensitive data
    assert.ok(
      bodyText.length < 500,
      `Route ${route} body too large (${bodyText.length} bytes) for an empty redirect`
    );
    assert.equal(
      bodyText.includes("<aside"),
      false,
      `Route ${route} body contains <aside> navigation!`
    );
    assert.equal(
      bodyText.includes("AdminSidebar"),
      false,
      `Route ${route} body contains AdminSidebar!`
    );
    assert.equal(
      bodyText.includes("Sign out"),
      false,
      `Route ${route} body contains "Sign out"!`
    );
    assert.equal(
      bodyText.includes("Logout"),
      false,
      `Route ${route} body contains "Logout"!`
    );
  }

  // 4. /admin/login itself must return 200 OK for signed-out visitors
  const loginRes = await fetch("http://localhost:3000/admin/login", {
    method: "GET",
    redirect: "manual",
  });
  assert.equal(loginRes.status, 200, "/admin/login should return 200 OK");

  // 5. Admin API / Action endpoints must return 401/403 to signed-out clients
  const apiRes = await fetch("http://localhost:3000/api/admin/overview", {
    method: "GET",
    redirect: "manual",
  });
  assert.ok(
    [401, 403].includes(apiRes.status),
    `/api/admin/overview returned status ${apiRes.status}, expected 401 or 403`
  );
  const apiBody = await apiRes.json().catch(() => ({}));
  assert.equal(apiBody.error, "Unauthorized", "API response error must be Unauthorized");
});

// =============================================================================
// REQUIREMENT A8: Schema Honesty & Real-DB Certifications Persistence
// =============================================================================
test("[A8 SCHEMA] Verify live database schema columns against code requirements", async () => {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  assert.equal(res.status, 200, "Failed to query PostgREST OpenAPI catalog");
  const spec = await res.json();
  const defs = spec.definitions || {};

  // Verify certifications table columns
  assert.ok(defs.certifications, "certifications table missing from DB");
  const certCols = Object.keys(defs.certifications.properties || {});

  const requiredCertCols = [
    "id",
    "title",
    "issuer",
    "issue_date",
    "expiry_date",
    "credential_id",
    "credential_url",
    "certificate_file_url",
    "thumbnail_url",
    "category",
    "skills",
    "is_published",
    "sort_order",
  ];

  for (const col of requiredCertCols) {
    assert.ok(
      certCols.includes(col),
      `certifications table missing required column: ${col}`
    );
  }
});

test("[A8 REAL-DB] Save certificate with category, thumbnail, and skills, read back, and clean up in finally", async () => {
  let createdId = null;

  try {
    const probePayload = {
      title: "Real-DB Schema Persistence Probe",
      issuer: "Amazon Web Services",
      issue_date: "October 2026",
      credential_id: "AWS-ARCH-2026-XYZ",
      credential_url: "https://aws.amazon.com/verify/AWS-ARCH-2026-XYZ",
      category: "Cloud Architecture",
      thumbnail_url: "https://example.com/thumbnails/aws-solutions-architect.webp",
      skills: ["AWS", "Terraform", "Kubernetes", "Microservices"],
      is_published: true,
      sort_order: 99,
    };

    // 1. Insert probe record into live Supabase database
    const { data: inserted, error: insertError } = await adminClient
      .from("certifications")
      .insert(probePayload)
      .select("id, title, issuer, category, thumbnail_url, skills, is_published")
      .single();

    assert.equal(insertError, null, `Insert failed: ${insertError?.message}`);
    assert.ok(inserted?.id, "Inserted record must have an ID");
    createdId = inserted.id;

    // 2. Read back from database independently
    const { data: fetched, error: fetchError } = await adminClient
      .from("certifications")
      .select("id, title, issuer, category, thumbnail_url, skills, is_published")
      .eq("id", createdId)
      .single();

    assert.equal(fetchError, null, `Fetch failed: ${fetchError?.message}`);
    assert.ok(fetched, "Fetched record must not be null");

    // 3. Assert category, thumbnail_url, and skills match exactly
    assert.equal(fetched.title, "Real-DB Schema Persistence Probe");
    assert.equal(fetched.issuer, "Amazon Web Services");
    assert.equal(fetched.category, "Cloud Architecture");
    assert.equal(
      fetched.thumbnail_url,
      "https://example.com/thumbnails/aws-solutions-architect.webp"
    );
    assert.deepEqual(fetched.skills, [
      "AWS",
      "Terraform",
      "Kubernetes",
      "Microservices",
    ]);
    assert.equal(fetched.is_published, true);
  } finally {
    // 4. Guaranteed cleanup: delete probe row from DB
    if (createdId) {
      const { error: deleteError } = await adminClient
        .from("certifications")
        .delete()
        .eq("id", createdId);
      assert.equal(deleteError, null, `Cleanup delete failed: ${deleteError?.message}`);
    }

    // 5. Verify certifications table has 0 test rows remaining
    const { count } = await adminClient
      .from("certifications")
      .select("*", { count: "exact", head: true });
    assert.equal(count, 0, "certifications table should have 0 rows remaining");
  }
});

// =============================================================================
// REQUIREMENT A9: Project Image & Blog Cover Upload Limit and Signature Check
// =============================================================================
test("[A9 VALIDATION] 4 MB image limit and authentic file signature enforcement", () => {
  assert.equal(MAX_IMAGE_SIZE, 4 * 1024 * 1024, "MAX_IMAGE_SIZE must be exactly 4 MB");

  // 1. Oversized image (> 4 MB)
  const oversizedBuffer = Buffer.alloc(4.5 * 1024 * 1024);
  // PNG signature
  oversizedBuffer[0] = 0x89;
  oversizedBuffer[1] = 0x50;
  oversizedBuffer[2] = 0x4e;
  oversizedBuffer[3] = 0x47;
  oversizedBuffer[4] = 0x0d;
  oversizedBuffer[5] = 0x0a;
  oversizedBuffer[6] = 0x1a;
  oversizedBuffer[7] = 0x0a;

  const oversizedResult = validateImageBuffer(oversizedBuffer, oversizedBuffer.length);
  assert.equal(oversizedResult.valid, false);
  assert.ok(
    oversizedResult.error?.includes("4 MB"),
    `Error message should mention 4 MB, got: ${oversizedResult.error}`
  );

  // 2. Reject SVG payload disguised as image
  const svgPayload = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>`
  );
  const svgResult = validateImageBuffer(svgPayload, svgPayload.length);
  assert.equal(svgResult.valid, false, "SVG payloads must be rejected");

  // 3. Reject HTML / Script payload
  const htmlPayload = Buffer.from(`<html><script>evil()</script></html>`);
  const htmlResult = validateImageBuffer(htmlPayload, htmlPayload.length);
  assert.equal(htmlResult.valid, false, "HTML payloads must be rejected");

  // 4. Reject arbitrary binary payload without authentic signature
  const randomPayload = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb]);
  const randomResult = validateImageBuffer(randomPayload, randomPayload.length);
  assert.equal(randomResult.valid, false, "Random binary without image signature must be rejected");

  // 5. Accept valid PNG <= 4 MB
  const validPng = Buffer.alloc(1024);
  validPng[0] = 0x89;
  validPng[1] = 0x50;
  validPng[2] = 0x4e;
  validPng[3] = 0x47;
  validPng[4] = 0x0d;
  validPng[5] = 0x0a;
  validPng[6] = 0x1a;
  validPng[7] = 0x0a;

  const pngResult = validateImageBuffer(validPng, validPng.length);
  assert.equal(pngResult.valid, true);
  assert.equal(pngResult.mimeType, "image/png");
  assert.equal(pngResult.extension, "png");
  assert.ok(pngResult.storageFileName?.endsWith(".png"));

  // 6. Accept valid JPEG <= 4 MB
  const validJpeg = Buffer.alloc(1024);
  validJpeg[0] = 0xff;
  validJpeg[1] = 0xd8;
  validJpeg[2] = 0xff;
  validJpeg[3] = 0xe0;

  const jpegResult = validateImageBuffer(validJpeg, validJpeg.length);
  assert.equal(jpegResult.valid, true);
  assert.equal(jpegResult.mimeType, "image/jpeg");
  assert.equal(jpegResult.extension, "jpg");
  assert.ok(jpegResult.storageFileName?.endsWith(".jpg"));

  // 7. Accept valid WebP <= 4 MB
  const validWebp = Buffer.alloc(1024);
  validWebp.write("RIFF", 0);
  validWebp.write("WEBP", 8);

  const webpResult = validateImageBuffer(validWebp, validWebp.length);
  assert.equal(webpResult.valid, true);
  assert.equal(webpResult.mimeType, "image/webp");
  assert.equal(webpResult.extension, "webp");
  assert.ok(webpResult.storageFileName?.endsWith(".webp"));

  // 8. Accept valid GIF <= 4 MB
  const validGif = Buffer.alloc(1024);
  validGif.write("GIF89a", 0);

  const gifResult = validateImageBuffer(validGif, validGif.length);
  assert.equal(gifResult.valid, true);
  assert.equal(gifResult.mimeType, "image/gif");
  assert.equal(gifResult.extension, "gif");
  assert.ok(gifResult.storageFileName?.endsWith(".gif"));
});

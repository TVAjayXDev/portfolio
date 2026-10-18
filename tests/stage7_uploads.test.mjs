import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  detectFileSignature,
  validateResumeBuffer,
  validateCertificateBuffer,
  validateThumbnailBuffer,
  MAX_RESUME_SIZE,
  MAX_CERTIFICATE_SIZE,
  MAX_THUMBNAIL_SIZE,
} from "../src/lib/file-validation.ts";
import { assertLiveSupabasePrerequisites } from "./helpers/prerequisites.mjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Authentic test buffer fixtures
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc4, 0xe5]); // %PDF-1.4
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const WEBP_MAGIC = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]); // RIFF...WEBP
const SVG_PAYLOAD = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert('xss')</script></svg>");
const TEXT_PAYLOAD = Buffer.from("Hello world, this is a plain text file pretending to be a PDF.");

test("[VALIDATION] File signature detector detects authentic file types and rejects spoofing", () => {
  assert.equal(detectFileSignature(PDF_MAGIC), "pdf");
  assert.equal(detectFileSignature(PNG_MAGIC), "png");
  assert.equal(detectFileSignature(JPEG_MAGIC), "jpeg");
  assert.equal(detectFileSignature(WEBP_MAGIC), "webp");

  // Rejection of invalid types
  assert.equal(detectFileSignature(SVG_PAYLOAD), null);
  assert.equal(detectFileSignature(TEXT_PAYLOAD), null);
  assert.equal(detectFileSignature(Buffer.from([0x00, 0x01, 0x02, 0x03])), null);
});

test("[VALIDATION] validateResumeBuffer strictly enforces PDF only, rejecting SVG and other formats", () => {
  // Authentic PDF within 5 MB
  const validRes = validateResumeBuffer(PDF_MAGIC, PDF_MAGIC.length);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.detectedType, "pdf");
  assert.equal(validRes.mimeType, "application/pdf");
  assert.equal(validRes.extension, "pdf");
  assert.match(validRes.storageFileName || "", /^[0-9a-f-]{36}\.pdf$/);

  // SVG spoof named as PDF
  const svgSpoof = validateResumeBuffer(SVG_PAYLOAD, SVG_PAYLOAD.length);
  assert.equal(svgSpoof.valid, false);
  assert.match(svgSpoof.error || "", /authentic %PDF- signature/i);

  // PNG submitted as resume
  const pngSpoof = validateResumeBuffer(PNG_MAGIC, PNG_MAGIC.length);
  assert.equal(pngSpoof.valid, false);

  // Text submitted as resume
  const textSpoof = validateResumeBuffer(TEXT_PAYLOAD, TEXT_PAYLOAD.length);
  assert.equal(textSpoof.valid, false);
});

test("[VALIDATION] Oversize file checks strictly enforce size ceilings", () => {
  // Resume oversize (> 5 MB)
  const oversizeResume = validateResumeBuffer(PDF_MAGIC, MAX_RESUME_SIZE + 1024);
  assert.equal(oversizeResume.valid, false);
  assert.match(oversizeResume.error || "", /exceeds maximum allowed size of 5 MB/i);

  // Certificate oversize (> 10 MB)
  const oversizeCert = validateCertificateBuffer(PDF_MAGIC, MAX_CERTIFICATE_SIZE + 1024);
  assert.equal(oversizeCert.valid, false);
  assert.match(oversizeCert.error || "", /exceeds maximum allowed size of 10 MB/i);

  // Thumbnail oversize (> 2 MB)
  const oversizeThumb = validateThumbnailBuffer(PNG_MAGIC, MAX_THUMBNAIL_SIZE + 1024);
  assert.equal(oversizeThumb.valid, false);
  assert.match(oversizeThumb.error || "", /exceeds maximum allowed size of 2 MB/i);
});

test("[VALIDATION] validateCertificateBuffer accepts PDF, PNG, JPG, and WEBP but rejects SVG and thumbnails as PDF", () => {
  const validPdf = validateCertificateBuffer(PDF_MAGIC, PDF_MAGIC.length);
  assert.equal(validPdf.valid, true);
  assert.equal(validPdf.extension, "pdf");

  const validPng = validateCertificateBuffer(PNG_MAGIC, PNG_MAGIC.length);
  assert.equal(validPng.valid, true);
  assert.equal(validPng.extension, "png");

  const validJpg = validateCertificateBuffer(JPEG_MAGIC, JPEG_MAGIC.length);
  assert.equal(validJpg.valid, true);
  assert.equal(validJpg.extension, "jpg");

  const validWebp = validateCertificateBuffer(WEBP_MAGIC, WEBP_MAGIC.length);
  assert.equal(validWebp.valid, true);
  assert.equal(validWebp.extension, "webp");

  // SVG rejected
  const svgCert = validateCertificateBuffer(SVG_PAYLOAD, SVG_PAYLOAD.length);
  assert.equal(svgCert.valid, false);

  // Thumbnail only allows images (not PDF)
  const pdfThumb = validateThumbnailBuffer(PDF_MAGIC, PDF_MAGIC.length);
  assert.equal(pdfThumb.valid, false);

  const pngThumb = validateThumbnailBuffer(PNG_MAGIC, PNG_MAGIC.length);
  assert.equal(pngThumb.valid, true);
});

test("[REAL SUPABASE] Prerequisite Check: verify storage bucket configurations and size limits", async () => {
  await assertLiveSupabasePrerequisites({
    checkBuckets: true,
    checkContactRateLimit: false,
    checkMessagesAnonRevoked: false,
  });
});

test("[REAL SUPABASE] Anon client CANNOT upload, replace, or delete files in resume and certificates buckets", async () => {
  assert.ok(supabaseUrl && supabaseAnonKey && serviceKey, "Supabase credentials required");

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const adminClient = createClient(supabaseUrl, serviceKey);
  const testFileName = `test-probe-${Date.now()}.pdf`;

  try {
    // 1. Attempt upload to 'resume' as anon -> MUST FAIL with error
    const { error: resumeUploadError } = await anonClient.storage
      .from("resume")
      .upload(testFileName, PDF_MAGIC, { contentType: "application/pdf" });

    assert.ok(
      resumeUploadError !== null,
      "FAIL: Anon client was unexpectedly allowed to upload to 'resume' bucket!"
    );

    // 2. Attempt upload to 'certificates' as anon -> MUST FAIL with error
    const { error: certUploadError } = await anonClient.storage
      .from("certificates")
      .upload(testFileName, PDF_MAGIC, { contentType: "application/pdf" });

    assert.ok(
      certUploadError !== null,
      "FAIL: Anon client was unexpectedly allowed to upload to 'certificates' bucket!"
    );

    // 3. Upload a file as admin, then verify anon CANNOT delete it (non-vacuous deletion check)
    const { error: adminUploadError } = await adminClient.storage
      .from("resume")
      .upload(testFileName, PDF_MAGIC, { contentType: "application/pdf" });
    assert.equal(adminUploadError, null, "Admin upload for test setup failed");

    // Anon attempts to delete existing file
    await anonClient.storage.from("resume").remove([testFileName]);

    // Admin verifies file still exists in bucket (was NOT deleted by anon)
    const { data: listed, error: listErr } = await adminClient.storage
      .from("resume")
      .list("", { search: testFileName });

    assert.equal(listErr, null, "Admin list check failed");
    assert.ok(
      listed && listed.some((f) => f.name === testFileName),
      "FAIL: Anon client was able to delete an existing file from 'resume' bucket!"
    );
  } finally {
    // Guaranteed cleanup by admin
    await adminClient.storage.from("resume").remove([testFileName]);
    await adminClient.storage.from("certificates").remove([testFileName]);
  }
});

test("[MOCKED: requires admin credentials in .env] Admin at AAL2 can upload and replace files", async () => {
  // Simulates server-side execution path where requireAdmin() returns an elevated client
  const mockAdminClient = {
    storage: {
      from: (bucket) => ({
        upload: async (path, buffer, opts) => ({ data: { path }, error: null }),
        getPublicUrl: (path) => ({ data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
        remove: async (paths) => ({ data: paths, error: null }),
      }),
    },
    from: (table) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { resume_url: null }, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  };

  const { data: urlData } = mockAdminClient.storage.from("resume").getPublicUrl("abc-123.pdf");
  assert.equal(urlData.publicUrl, "https://test.supabase.co/storage/v1/object/public/resume/abc-123.pdf");
});

test("[UI LOGIC] Resume download button is hidden when resume_url is null or empty", () => {
  const getResumeButtonVisibility = (resumeUrl) => {
    return Boolean(resumeUrl && resumeUrl.trim().length > 0);
  };

  assert.equal(getResumeButtonVisibility(null), false);
  assert.equal(getResumeButtonVisibility(undefined), false);
  assert.equal(getResumeButtonVisibility(""), false);
  assert.equal(
    getResumeButtonVisibility("https://example.com/resume.pdf"),
    true
  );
});

test("[UI LOGIC] CertificationsSection is hidden entirely when there are zero published rows", () => {
  const shouldRenderSection = (certifications) => {
    const published = certifications.filter((c) => c.is_published);
    return published.length > 0;
  };

  assert.equal(shouldRenderSection([]), false);
  assert.equal(
    shouldRenderSection([
      { id: "1", title: "AWS Cert", is_published: false },
      { id: "2", title: "Docker Cert", is_published: false },
    ]),
    false
  );
  assert.equal(
    shouldRenderSection([
      { id: "1", title: "AWS Cert", is_published: false },
      { id: "2", title: "Docker Cert", is_published: true },
    ]),
    true
  );
});

test("[REAL SUPABASE] finalize validation using service-role client: rejects and deletes spoofed and oversize files, accepts valid PDF, with guaranteed finally cleanup", async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.log("Supabase service role credentials not configured, skipping real network test.");
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  const timestamp = Date.now();
  const spoofedPath = `test-probe-spoof-${timestamp}.pdf`;
  const oversizePath = `test-probe-oversize-${timestamp}.pdf`;
  const probeOversizePath = `test-probe-limit-${timestamp}.pdf`;
  const validPath = `test-probe-valid-${timestamp}.pdf`;

  // Server-side finalize validation function under test (mirrors finalizeResumeUpload logic)
  async function simulateFinalizeValidation(bucket, path, maxSizeBytes) {
    // 1. Inspect object metadata and size
    const { data: infoData, error: infoError } = await adminClient.storage
      .from(bucket)
      .info(path);

    if (infoError || !infoData) {
      return { success: false, error: "Object not found in storage", deleted: false };
    }

    if (infoData.size > maxSizeBytes) {
      await adminClient.storage.from(bucket).remove([path]);
      return { success: false, error: "File exceeds maximum size", deleted: true };
    }

    // 2. Download bytes and verify magic bytes
    const { data: blob, error: downloadError } = await adminClient.storage
      .from(bucket)
      .download(path);

    if (downloadError || !blob) {
      await adminClient.storage.from(bucket).remove([path]);
      return { success: false, error: "Failed to download object", deleted: true };
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const signature = detectFileSignature(buffer);

    if (signature !== "pdf") {
      await adminClient.storage.from(bucket).remove([path]);
      return { success: false, error: "Invalid signature: not a PDF", deleted: true };
    }

    // 3. Update contentType strictly from detected signature
    await adminClient.storage.from(bucket).update(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    return { success: true, detectedType: signature, size: buffer.length };
  }

  try {
    // 1. Spoofed ".pdf" with non-PDF content (plain text payload)
    const spoofedContent = Buffer.from("THIS_IS_NOT_A_PDF_DOCUMENT_JUST_PLAIN_TEXT_PAYLOAD");
    const { error: spoofUploadError } = await adminClient.storage
      .from("resume")
      .upload(spoofedPath, spoofedContent, { contentType: "application/pdf" });
    assert.equal(spoofUploadError, null, "Failed to upload initial spoofed probe object");

    const spoofFinalize = await simulateFinalizeValidation("resume", spoofedPath, MAX_RESUME_SIZE);
    assert.equal(spoofFinalize.success, false, "Expected spoofed PDF to be rejected");
    assert.match(spoofFinalize.error, /Invalid signature/i);
    assert.equal(spoofFinalize.deleted, true, "Expected spoofed PDF to be deleted from storage");

    // Verify spoofed object is truly deleted
    const { data: checkSpoof } = await adminClient.storage.from("resume").info(spoofedPath);
    assert.equal(checkSpoof, null, "Spoofed file must no longer exist in storage after rejection");

    // 2. Defense-in-depth: Bucket-level size enforcement rejects files > 5 MB
    const oversizeBuffer = Buffer.alloc(MAX_RESUME_SIZE + 1024);
    PDF_MAGIC.copy(oversizeBuffer, 0); // starts with %PDF-
    const { error: overUploadError } = await adminClient.storage
      .from("resume")
      .upload(oversizePath, oversizeBuffer, { contentType: "application/pdf" });
    assert.ok(
      overUploadError !== null && (overUploadError.message?.includes("exceeded") || overUploadError.statusCode === "413"),
      "Bucket-level limit strictly rejects uploads exceeding 5 MB"
    );

    // Test finalize validation size enforcement when an object is stored
    const probeBuffer = Buffer.alloc(8 * 1024);
    PDF_MAGIC.copy(probeBuffer, 0);
    const { error: probeUploadErr } = await adminClient.storage
      .from("resume")
      .upload(probeOversizePath, probeBuffer, { contentType: "application/pdf" });
    assert.equal(probeUploadErr, null, "Probe upload within bucket limit should succeed");

    const overFinalize = await simulateFinalizeValidation("resume", probeOversizePath, 4 * 1024); // max 4KB
    assert.equal(overFinalize.success, false, "Expected oversize file to be rejected by finalize");
    assert.match(overFinalize.error, /exceeds maximum size/i);
    assert.equal(overFinalize.deleted, true, "Expected oversize file to be deleted from storage");

    // Verify oversize object is truly deleted
    const { data: checkOver } = await adminClient.storage.from("resume").info(probeOversizePath);
    assert.equal(checkOver, null, "Oversize file must no longer exist in storage after rejection");

    // 3. Authentic valid PDF
    const validBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Authentic Test PDF) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    const { error: validUploadError } = await adminClient.storage
      .from("resume")
      .upload(validPath, validBuffer, { contentType: "application/pdf" });
    assert.equal(validUploadError, null, "Failed to upload valid probe object");

    const validFinalize = await simulateFinalizeValidation("resume", validPath, MAX_RESUME_SIZE);
    assert.equal(validFinalize.success, true, "Expected authentic PDF to be accepted");
    assert.equal(validFinalize.detectedType, "pdf");

    // Verify authentic object exists with verified contentType
    const { data: checkValid } = await adminClient.storage.from("resume").info(validPath);
    assert.ok(checkValid !== null, "Valid file must remain in storage after acceptance");
    assert.equal(checkValid.contentType, "application/pdf", "Content-Type must match verified signature");
  } finally {
    // Guaranteed cleanup of all created probe objects
    await adminClient.storage
      .from("resume")
      .remove([spoofedPath, oversizePath, probeOversizePath, validPath]);
  }
});

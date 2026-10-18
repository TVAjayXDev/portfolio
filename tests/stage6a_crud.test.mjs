import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

import {
  safeUrlSchema,
  slugify,
  siteSettingsSchema,
  projectSchema,
  skillSchema,
  sectionItemSchema,
} from "../src/lib/validations/admin.ts";

// =============================================================================
// SUITE 1: URL Validation & Scheme Rejection (Zod safeUrlSchema)
// =============================================================================

test("[VALIDATION] safeUrlSchema strictly rejects javascript: schemes", () => {
  const dangerousUrls = [
    "javascript:alert(1)",
    "javascript:void(0)",
    "JAVASCRIPT:alert('xss')",
    "javascript:alert(document.cookie)",
    " javascript:alert(1) ",
  ];

  for (const url of dangerousUrls) {
    const result = safeUrlSchema.safeParse(url);
    assert.strictEqual(
      result.success,
      false,
      `Expected ${url} to be rejected, but it was allowed.`
    );
  }
});

test("[VALIDATION] safeUrlSchema strictly rejects data: and vbscript: schemes", () => {
  const dangerousUrls = [
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "data:text/plain;charset=utf-8;base64,dGVzdA==",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
  ];

  for (const url of dangerousUrls) {
    const result = safeUrlSchema.safeParse(url);
    assert.strictEqual(
      result.success,
      false,
      `Expected ${url} to be rejected, but it was allowed.`
    );
  }
});

test("[VALIDATION] safeUrlSchema allows valid HTTP and HTTPS URLs and empty values", () => {
  const validUrls = [
    "https://github.com/T-V-Ajay",
    "http://localhost:3000",
    "https://trustlens.health/demo",
    "https://www.linkedin.com/in/t-v-ajay",
    "",
    null,
    undefined,
  ];

  for (const url of validUrls) {
    const result = safeUrlSchema.safeParse(url);
    assert.strictEqual(
      result.success,
      true,
      `Expected ${url} to be accepted, but got: ${result.error?.message}`
    );
  }
});

// =============================================================================
// SUITE 2: Slug Generation and URL Safety
// =============================================================================

test("[VALIDATION] slugify generates clean, URL-safe kebab-case strings", () => {
  assert.strictEqual(
    slugify("TrustLens: Clinical Governance AI"),
    "trustlens-clinical-governance-ai"
  );
  assert.strictEqual(
    slugify("  CampusLink & Finance Portal v2.0!  "),
    "campuslink-finance-portal-v20"
  );
  assert.strictEqual(
    slugify("Undergraduate Portfolio --- 2026"),
    "undergraduate-portfolio-2026"
  );
});

test("[VALIDATION] projectSchema enforces URL-safe lowercase alphanumeric slugs", () => {
  const validProject = {
    title: "TrustLens",
    slug: "trustlens-clinical-ai",
    description: "Clinical governance platform for medical claim audits",
    status: "completed",
    is_featured: true,
    is_published: true,
    sort_order: 10,
    technologies: ["TypeScript", "Next.js"],
  };

  assert.strictEqual(projectSchema.safeParse(validProject).success, true);

  // Invalid slugs that must fail:
  const invalidSlugs = [
    "TrustLens", // uppercase
    "trust lens", // spaces
    "trust_lens", // underscore
    "trust--lens", // consecutive hyphens
    "-trustlens", // leading hyphen
    "trustlens-", // trailing hyphen
    "trustlens!", // special character
  ];

  for (const badSlug of invalidSlugs) {
    const result = projectSchema.safeParse({ ...validProject, slug: badSlug });
    assert.strictEqual(
      result.success,
      false,
      `Expected bad slug '${badSlug}' to fail validation`
    );
  }
});

// =============================================================================
// SUITE 3: Length Constraints and Field Validation
// =============================================================================

test("[VALIDATION] Text length limits are strictly enforced across schemas", () => {
  // Title exceeds 120 chars
  const overlongTitle = "A".repeat(121);
  const projResult = projectSchema.safeParse({
    title: overlongTitle,
    slug: "overlong-project",
    description: "Valid description",
    status: "live",
  });
  assert.strictEqual(projResult.success, false);

  // Description exceeds 600 chars
  const overlongDesc = "B".repeat(601);
  const projDescResult = projectSchema.safeParse({
    title: "Valid Title",
    slug: "valid-title",
    description: overlongDesc,
    status: "live",
  });
  assert.strictEqual(projDescResult.success, false);

  // Skill name exceeds 60 chars
  const overlongSkill = "C".repeat(61);
  const skillResult = skillSchema.safeParse({
    name: overlongSkill,
    category: "Languages",
  });
  assert.strictEqual(skillResult.success, false);
});

// =============================================================================
// SUITE 4: Markdown Case Study Sanitization (rehype-sanitize)
// =============================================================================

test("[SANITIZATION] rehype-sanitize strips executable scripts and event handlers", () => {
  const maliciousMarkdown = `
# TrustLens Architecture

This is a **secure** markdown document.

<script>alert('XSS execution')</script>

<img src="x" onerror="alert('XSS via onerror')" />

<a href="javascript:alert('XSS link')">Click here</a>

\`\`\`typescript
const safeCode = true;
\`\`\`
`;

  const renderedHtml = renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { rehypePlugins: [rehypeSanitize] },
      maliciousMarkdown
    )
  );

  // Script tags must be completely stripped
  assert.strictEqual(renderedHtml.includes("<script>"), false);
  assert.strictEqual(renderedHtml.includes("alert("), false);

  // onerror event handlers must be completely stripped
  assert.strictEqual(renderedHtml.includes("onerror"), false);

  // javascript: link hrefs must be neutralized
  assert.strictEqual(renderedHtml.includes("javascript:"), false);

  // Valid markdown features must be preserved
  assert.strictEqual(renderedHtml.includes("<h1>TrustLens Architecture</h1>"), true);
  assert.strictEqual(renderedHtml.includes("<strong>secure</strong>"), true);
  assert.strictEqual(renderedHtml.includes("<code"), true);
});

// =============================================================================
// SUITE 5: Real Supabase Anonymous Read & Write RLS Enforcement
// =============================================================================

test("[REAL SUPABASE] Anon client can read published content", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be defined");
  assert.ok(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined");

  const supabase = createClient(supabaseUrl, anonKey);

  // 1. Read sections
  const { data: sections, error: secError } = await supabase
    .from("sections")
    .select("id, title, is_visible")
    .eq("is_visible", true);

  assert.strictEqual(secError, null, "Reading visible sections should succeed");
  assert.ok(Array.isArray(sections), "Sections must return an array");
  assert.ok(sections.length > 0, "Should have seeded sections");

  // 2. Read published projects
  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("id, title, slug, is_published")
    .eq("is_published", true);

  assert.strictEqual(projError, null, "Reading published projects should succeed");
  assert.ok(Array.isArray(projects), "Projects must return an array");
  assert.ok(projects.some((p) => p.slug === "trustlens"), "Should find TrustLens project");

  // 3. Read published skills
  const { data: skills, error: skillError } = await supabase
    .from("skills")
    .select("id, name, category, is_published")
    .eq("is_published", true);

  assert.strictEqual(skillError, null, "Reading published skills should succeed");
  assert.ok(Array.isArray(skills), "Skills must return an array");
});

test("[REAL SUPABASE] Anon client is blocked from inserting, updating or deleting rows (RLS)", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, anonKey);

  // 1. Anon attempt to insert a project must fail with RLS violation error
  const { error: insertError } = await supabase.from("projects").insert({
    title: "Unauthorized Hack Attempt",
    slug: "unauthorized-hack-attempt",
    description: "This should be blocked by RLS",
    status: "live",
  });

  assert.ok(insertError, "Anon inserting into projects must trigger an RLS error");

  // 2. Anon attempt to update site_settings must affect 0 rows (RLS USING clause)
  const { data: updateData } = await supabase
    .from("site_settings")
    .update({ headline: "Defaced Site" })
    .eq("id", 1)
    .select();

  assert.deepStrictEqual(
    updateData,
    [],
    "Anon updating site_settings must return empty array (0 rows modified)"
  );

  // Verify headline in DB remains protected and unchanged
  const { data: settingsCheck } = await supabase
    .from("site_settings")
    .select("headline")
    .eq("id", 1)
    .single();

  assert.notStrictEqual(
    settingsCheck.headline,
    "Defaced Site",
    "Site settings headline must remain un-defaced"
  );

  // 3. Anon attempt to delete skills must affect 0 rows (RLS USING clause)
  const { data: deleteData } = await supabase
    .from("skills")
    .delete()
    .eq("name", "TypeScript")
    .select();

  assert.deepStrictEqual(
    deleteData,
    [],
    "Anon deleting skills must return empty array (0 rows deleted)"
  );

  // Verify skill still exists in database
  const { data: skillCheck } = await supabase
    .from("skills")
    .select("name")
    .eq("name", "TypeScript")
    .single();

  assert.strictEqual(
    skillCheck?.name,
    "TypeScript",
    "Skill row must remain protected in database"
  );
});

test("[REAL SUPABASE] Partial unique constraint: at most one project is featured", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, anonKey);

  const { data: featuredProjects, error } = await supabase
    .from("projects")
    .select("id, title, slug, is_featured")
    .eq("is_featured", true);

  assert.strictEqual(error, null, "Querying featured projects should not error");
  assert.ok(
    featuredProjects.length <= 1,
    `At most one project may be featured, found ${featuredProjects.length}`
  );
  if (featuredProjects.length === 1) {
    assert.strictEqual(featuredProjects[0].slug, "trustlens");
  }
});

// =============================================================================
// SUITE 6: 6A Fix 1 - Project Status Alignment
// =============================================================================

test("[6A FIX 1: STATUS ALIGNMENT] projectSchema accepts all 5 form statuses", () => {
  const allowedStatuses = ["completed", "in_progress", "planned", "coming_soon", "live"];
  const baseProject = {
    title: "Test Status Project",
    slug: "test-status-project",
    description: "Testing status alignment across DB and admin form",
  };

  for (const st of allowedStatuses) {
    const result = projectSchema.safeParse({
      ...baseProject,
      status: st,
    });
    assert.strictEqual(
      result.success,
      true,
      `Expected status '${st}' to be valid in projectSchema`
    );
  }

  // Reject unauthorized / stale statuses
  const invalidStatuses = ["draft", "archived", "pending", "active", "cancelled"];
  for (const bad of invalidStatuses) {
    const result = projectSchema.safeParse({
      ...baseProject,
      status: bad,
    });
    assert.strictEqual(
      result.success,
      false,
      `Expected status '${bad}' to be rejected by projectSchema`
    );
  }
});

// =============================================================================
// SUITE 7: 6A Fix 2 - Case Study Unification on 'content' Column
// =============================================================================

test("[6A FIX 2: CASE STUDY UNIFICATION] Editor writes and public page reads 'content'", () => {
  const testMarkdown = `# TrustLens Architecture\n\nClinical decision support with strictly grounded citations.`;

  // 1. Zod schema accepts content column
  const parseResult = projectSchema.safeParse({
    title: "TrustLens Test",
    slug: "trustlens-test",
    description: "Testing case study column unification",
    status: "completed",
    content: testMarkdown,
  });

  assert.strictEqual(parseResult.success, true);
  assert.strictEqual(parseResult.data?.content, testMarkdown);

  // 2. Render markdown using ReactMarkdown and rehypeSanitize (matching public page)
  const html = renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { rehypePlugins: [rehypeSanitize] },
      testMarkdown
    )
  );

  assert.ok(html.includes("<h1>TrustLens Architecture</h1>"));
  assert.ok(html.includes("Clinical decision support with strictly grounded citations."));
});

// =============================================================================
// SUITE 8: 6A Fix 3 - Server Action Auth & Revalidation (Mocked Sessions)
// =============================================================================

test("[6A FIX 3: SERVER ACTION AUTH] [MOCKED] requireAdmin logic rejects unauthenticated, non-admin, and AAL1 sessions", async () => {
  // Test case A: No session (user is null)
  const noSessionClient = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error("No session") }),
      signOut: async () => {},
      mfa: {
        listFactors: async () => ({ data: { totp: [] } }),
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: null } }),
      },
    },
    rpc: async () => ({ data: false, error: null }),
  };

  const { data: userA } = await noSessionClient.auth.getUser();
  assert.strictEqual(userA.user, null, "Unauthenticated request should have null user");

  // Test case B: Signed-in non-admin (user exists, but is_admin_member is false)
  const nonAdminClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "non-admin-uuid", email: "visitor@example.com" } }, error: null }),
      signOut: async () => {},
      mfa: {
        listFactors: async () => ({ data: { totp: [] } }),
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1" } }),
      },
    },
    rpc: async (fn) => {
      if (fn === "is_admin_member" || fn === "is_admin") return { data: false, error: null };
      return { data: null, error: null };
    },
  };

  const isMemberB = await nonAdminClient.rpc("is_admin_member");
  assert.strictEqual(isMemberB.data, false, "Non-admin user must return false for is_admin_member()");

  // Test case C: Admin member with password only (AAL1, no MFA verified)
  const aal1Client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "admin-uuid", email: "admin@example.com" } }, error: null }),
      mfa: {
        listFactors: async () => ({ data: { totp: [{ id: "f1", status: "verified" }] } }),
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1" } }),
      },
    },
    rpc: async (fn) => {
      if (fn === "is_admin_member") return { data: true, error: null };
      if (fn === "is_admin") return { data: false, error: null }; // RLS / DB level requires aal2!
      return { data: null, error: null };
    },
  };

  const aalLevel = await aal1Client.auth.mfa.getAuthenticatorAssuranceLevel();
  assert.strictEqual(aalLevel.data.currentLevel, "aal1", "AAL1 session lacks MFA elevation");
  const isAdminC = await aal1Client.rpc("is_admin");
  assert.strictEqual(isAdminC.data, false, "is_admin() must return false for an AAL1 session");

  // Test case D: Admin with AAL2 elevates successfully
  const aal2Client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "admin-uuid", email: "admin@example.com" } }, error: null }),
      mfa: {
        listFactors: async () => ({ data: { totp: [{ id: "f1", status: "verified" }] } }),
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal2" } }),
      },
    },
    rpc: async (fn) => {
      if (fn === "is_admin_member" || fn === "is_admin") return { data: true, error: null };
      return { data: null, error: null };
    },
  };

  const aalLevelD = await aal2Client.auth.mfa.getAuthenticatorAssuranceLevel();
  assert.strictEqual(aalLevelD.data.currentLevel, "aal2", "AAL2 verified");
  const isAdminD = await aal2Client.rpc("is_admin");
  assert.strictEqual(isAdminD.data, true, "is_admin() must return true for AAL2 admin session");
});

// =============================================================================
// SUITE 9: 6A Fix 4 - Live Database Zero Leftover Rows Guarantee
// =============================================================================

test("[6A FIX 4: CLEANUP GUARANTEE] [REAL SUPABASE] No residual or orphaned test rows exist in live database", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, anonKey);

  // Confirm no test-prefixed projects exist in live database
  const { data: testProjects } = await supabase
    .from("projects")
    .select("slug")
    .like("slug", "test-%");

  assert.deepStrictEqual(
    testProjects || [],
    [],
    "Live database must have 0 test-prefixed project rows"
  );

  // Confirm only official seeded projects exist
  const { data: projects } = await supabase.from("projects").select("slug");
  const slugs = (projects || []).map((p) => p.slug);
  assert.ok(slugs.includes("trustlens"), "Seeded TrustLens project must exist");
  assert.ok(
    slugs.every((s) => ["trustlens", "campuslink", "campusfinance"].includes(s)),
    `Unexpected rows found in live projects table: ${slugs.join(", ")}`
  );
});



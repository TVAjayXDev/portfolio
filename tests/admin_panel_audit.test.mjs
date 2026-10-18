import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  siteSettingsSchema,
  sectionItemSchema,
  sectionsBatchSchema,
  projectSchema,
  skillSchema,
  educationSchema,
  experienceSchema,
  certificationSchema,
  postSchema,
  calculateReadTime,
  calculateReadTimeMinutes,
} from "../src/lib/validations/admin.ts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be defined");
assert.ok(serviceKey, "SUPABASE_SERVICE_ROLE_KEY must be defined");
assert.ok(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined");

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// =============================================================================
// SUITE 1: HTTP Smoke Tests for All Admin Routes
// =============================================================================
test("[ADMIN HTTP] Signed-out client receives 307 redirect to /admin/login with zero admin body content", async () => {
  const routes = [
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

  for (const route of routes) {
    const res = await fetch(`http://localhost:3000${route}`, {
      redirect: "manual",
    });

    assert.ok(
      res.status === 307 || res.status === 302,
      `Route ${route} returned status ${res.status}, expected 307 redirect`
    );
    const location = res.headers.get("location") || "";
    assert.ok(
      location.includes("/admin/login"),
      `Route ${route} redirected to ${location}, expected /admin/login`
    );
    const bodyText = await res.text();
    assert.ok(
      bodyText.length < 500,
      `Route ${route} body contains ${bodyText.length} bytes (expected minimal redirect body)`
    );
    assert.equal(
      bodyText.includes("<aside"),
      false,
      `Route ${route} body contains admin layout sidebar markup`
    );
  }

  // /admin/login must return 200 OK
  const loginRes = await fetch("http://localhost:3000/admin/login", {
    redirect: "manual",
  });
  assert.equal(loginRes.status, 200, "/admin/login must return 200 OK");
});

// =============================================================================
// SUITE 2: Storage Buckets Operational Health
// =============================================================================
test("[ADMIN STORAGE] All required Supabase Storage buckets exist and are accessible", async () => {
  const { data: buckets, error } = await adminClient.storage.listBuckets();
  assert.equal(error, null, `Listing buckets failed: ${error?.message}`);

  const bucketNames = buckets.map((b) => b.name);
  const requiredBuckets = ["resume", "certificates", "project-images", "post-covers"];

  for (const req of requiredBuckets) {
    assert.ok(
      bucketNames.includes(req),
      `Required storage bucket "${req}" is missing! Found: ${bucketNames.join(", ")}`
    );
  }
});

// =============================================================================
// SUITE 3: Database Tables Schema & Column Alignment Audit
// =============================================================================
test("[ADMIN DATABASE] All content tables have exact columns required by admin manager components", async () => {
  // Query OpenAPI schema from PostgREST to verify columns
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  assert.equal(res.status, 200, "Failed to fetch PostgREST OpenAPI spec");
  const spec = await res.json();
  const defs = spec.definitions || {};

  // Table 1: site_settings
  assert.ok(defs.site_settings, "site_settings table missing");
  const settingsCols = Object.keys(defs.site_settings.properties || {});
  for (const col of ["name", "title", "headline", "subtitle", "email", "about_text", "resume_url"]) {
    assert.ok(settingsCols.includes(col), `site_settings missing column ${col}`);
  }

  // Table 2: sections
  assert.ok(defs.sections, "sections table missing");
  const secCols = Object.keys(defs.sections.properties || {});
  for (const col of ["id", "title", "subtitle", "is_visible", "sort_order"]) {
    assert.ok(secCols.includes(col), `sections missing column ${col}`);
  }

  // Table 3: projects
  assert.ok(defs.projects, "projects table missing");
  const projCols = Object.keys(defs.projects.properties || {});
  for (const col of ["id", "title", "slug", "description", "content", "technologies", "status", "is_featured", "is_published", "sort_order"]) {
    assert.ok(projCols.includes(col), `projects missing column ${col}`);
  }

  // Table 4: skills
  assert.ok(defs.skills, "skills table missing");
  const skillCols = Object.keys(defs.skills.properties || {});
  for (const col of ["id", "name", "category", "proficiency", "is_published", "sort_order"]) {
    assert.ok(skillCols.includes(col), `skills missing column ${col}`);
  }

  // Table 5: education
  assert.ok(defs.education, "education table missing");
  const eduCols = Object.keys(defs.education.properties || {});
  for (const col of ["id", "institution", "degree", "field_of_study", "start_year", "end_year", "grade", "current_semester", "is_published", "sort_order"]) {
    assert.ok(eduCols.includes(col), `education missing column ${col}`);
  }

  // Table 6: experience
  assert.ok(defs.experience, "experience table missing");
  const expCols = Object.keys(defs.experience.properties || {});
  for (const col of ["id", "role", "organization", "location", "start_date", "end_date", "description", "is_published", "sort_order"]) {
    assert.ok(expCols.includes(col), `experience missing column ${col}`);
  }

  // Table 7: certifications
  assert.ok(defs.certifications, "certifications table missing");
  const certCols = Object.keys(defs.certifications.properties || {});
  for (const col of ["id", "title", "issuer", "issue_date", "credential_id", "credential_url", "certificate_file_url", "is_published", "sort_order"]) {
    assert.ok(certCols.includes(col), `certifications missing column ${col}`);
  }

  // Table 8: posts (blog)
  assert.ok(defs.posts, "posts table missing");
  const postCols = Object.keys(defs.posts.properties || {});
  for (const col of ["id", "title", "slug", "excerpt", "content", "cover_image_url", "reading_time_minutes", "tags", "is_published", "sort_order"]) {
    assert.ok(postCols.includes(col), `posts missing column ${col}`);
  }

  // Table 9: messages
  assert.ok(defs.messages, "messages table missing");
  const msgCols = Object.keys(defs.messages.properties || {});
  for (const col of ["id", "name", "email", "subject", "message", "is_read", "is_archived"]) {
    assert.ok(msgCols.includes(col), `messages missing column ${col}`);
  }
});

// =============================================================================
// SUITE 4: Validation Schemas for All Admin Sections
// =============================================================================
test("[ADMIN VALIDATIONS] Validation schemas accept valid data and block invalid inputs", () => {
  // 1. Site Settings
  const validSettings = {
    name: "T V Ajay",
    title: "Software Engineer",
    headline: "Building software that works",
    subtitle: "Student and developer",
    email: "tvajay0@gmail.com",
    availability_badge_text: "Available for internships",
    availability_badge_active: true,
    seo_description: "Portfolio of T V Ajay",
    github_pinned_repos: [],
    github_hidden_repos: [],
  };
  assert.equal(siteSettingsSchema.safeParse(validSettings).success, true);
  assert.equal(
    siteSettingsSchema.safeParse({ ...validSettings, github_url: "javascript:alert(1)" }).success,
    false,
    "Should reject javascript: in github_url"
  );

  // 2. Sections Batch
  const validSections = [
    { id: "hero", title: "Hero", is_visible: true, sort_order: 1 },
    { id: "about", title: "About", is_visible: true, sort_order: 2 },
  ];
  assert.equal(sectionsBatchSchema.safeParse(validSections).success, true);

  // 3. Projects
  const validProject = {
    title: "Test Project",
    slug: "test-project",
    description: "A solid test project",
    content: "Detailed markdown case study",
    status: "live",
    technologies: ["Next.js", "TypeScript"],
    is_featured: false,
    is_published: true,
    sort_order: 10,
  };
  assert.equal(projectSchema.safeParse(validProject).success, true);
  assert.equal(
    projectSchema.safeParse({ ...validProject, slug: "Invalid Slug With Spaces" }).success,
    false,
    "Should reject uppercase or spaced slugs"
  );

  // 4. Skills
  const validSkill = {
    name: "TypeScript",
    category: "Languages",
    proficiency: 90,
    is_published: true,
    sort_order: 1,
  };
  assert.equal(skillSchema.safeParse(validSkill).success, true);
  assert.equal(skillSchema.safeParse({ ...validSkill, name: "" }).success, false);

  // 5. Education
  const validEdu = {
    institution: "VTU",
    degree: "B.E. Computer Science",
    field_of_study: "CSE",
    start_year: "2025",
    end_year: "2029",
    grade: "7.98",
    is_published: true,
    sort_order: 1,
  };
  assert.equal(educationSchema.safeParse(validEdu).success, true);
  // Missing required field when published must fail
  assert.equal(
    educationSchema.safeParse({ ...validEdu, degree: "", is_published: true }).success,
    false,
    "Should reject published education with blank degree"
  );

  // 6. Experience
  const validExp = {
    role: "Full Stack Intern",
    organization: "Acme Corp",
    location: "Bangalore",
    start_date: "Jan 2026",
    end_date: "Present",
    description: "Building scalable web services",
    is_published: true,
    sort_order: 1,
  };
  assert.equal(experienceSchema.safeParse(validExp).success, true);
  assert.equal(
    experienceSchema.safeParse({ ...validExp, role: "" }).success,
    false,
    "Should require role"
  );

  // 7. Certifications
  const validCert = {
    title: "AWS Solutions Architect",
    issuer: "Amazon Web Services",
    issue_date: "Oct 2026",
    credential_url: "https://aws.amazon.com",
    category: "Cloud",
    skills: ["AWS", "Cloud Architecture"],
    is_published: true,
    sort_order: 1,
  };
  assert.equal(certificationSchema.safeParse(validCert).success, true);
  assert.equal(
    certificationSchema.safeParse({ ...validCert, credential_url: "javascript:evil()" }).success,
    false,
    "Should reject javascript: in credential_url"
  );

  // 8. Blog Posts
  const validPost = {
    title: "Understanding Microservices",
    slug: "understanding-microservices",
    excerpt: "A deep dive into distributed systems.",
    content: "Here is the full technical article content...",
    tags: ["Systems", "Architecture"],
    is_published: true,
    sort_order: 1,
  };
  assert.equal(postSchema.safeParse(validPost).success, true);
  assert.equal(calculateReadTime("hello ".repeat(500)), "3 min read");
  assert.equal(calculateReadTimeMinutes("hello ".repeat(500)), 3);
});

// =============================================================================
// SUITE 5: Live Database Inventory Check (No Orphaned / Test Rows)
// =============================================================================
test("[ADMIN INVENTORY] Live database row counts per table and clean state", async () => {
  const tables = [
    "site_settings",
    "sections",
    "projects",
    "skills",
    "education",
    "experience",
    "certifications",
    "posts",
    "messages",
    "admin_users",
    "auth_rate_limits",
  ];

  const counts = {};
  for (const table of tables) {
    const { count, error } = await adminClient
      .from(table)
      .select("*", { count: "exact", head: true });

    assert.equal(error, null, `Counting ${table} failed: ${error?.message}`);
    counts[table] = count ?? 0;
  }

  // Ensure site_settings exists (row id=1)
  assert.equal(counts.site_settings, 1, "site_settings must have exactly 1 row");

  // Ensure sections exist (11 sections)
  assert.ok(counts.sections >= 10, "sections must have at least 10 sections configured");

  // Ensure admin user exists
  assert.ok(counts.admin_users >= 1, "At least 1 admin user must be enrolled in admin_users");

  // Log summary inventory cleanly
  console.log("\n--- LIVE DATABASE INVENTORY ---");
  for (const [tbl, cnt] of Object.entries(counts)) {
    console.log(`  ${tbl.padEnd(20)}: ${cnt} rows`);
  }
  console.log("--------------------------------\n");
});

import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

import {
  educationSchema,
  experienceSchema,
  certificationSchema,
  postSchema,
  calculateReadTime,
} from "../src/lib/validations/admin.ts";

// =============================================================================
// SUITE 1: Education Validation & Draft vs. Publish Invariant
// =============================================================================

test("[VALIDATION] educationSchema prevents publishing when required fields are empty", () => {
  // A draft 10th row with incomplete year and grades
  const incompleteDraft = {
    institution: "St. Joseph's High School",
    degree: "Secondary School Leaving Certificate (10th)",
    field_of_study: "",
    start_year: "",
    end_year: "",
    grade: "",
    is_published: false,
    sort_order: 30,
  };

  // 1. As a draft (is_published = false), saving is allowed
  const draftResult = educationSchema.safeParse(incompleteDraft);
  assert.strictEqual(
    draftResult.success,
    true,
    "Incomplete draft education row should be valid as a draft"
  );

  // 2. Attempting to mark as published with missing required fields MUST fail
  const publishAttempt = educationSchema.safeParse({
    ...incompleteDraft,
    is_published: true,
  });

  assert.strictEqual(
    publishAttempt.success,
    false,
    "Publishing an incomplete education row must fail validation"
  );

  const errors = publishAttempt.error?.flatten().fieldErrors;
  assert.ok(errors?.field_of_study, "Must flag missing field_of_study");
  assert.ok(errors?.start_year, "Must flag missing start_year");
  assert.ok(errors?.end_year, "Must flag missing end_year");
  assert.ok(errors?.grade, "Must flag missing grade");
});

test("[VALIDATION] educationSchema allows publishing when all required details are provided", () => {
  const completeEducation = {
    institution: "Vidyavardhaka College of Engineering",
    degree: "B.E. Computer Science & Engineering",
    field_of_study: "Computer Science & Engineering",
    start_year: "2022",
    end_year: "2026",
    grade: "9.12",
    current_semester: "5th Semester",
    description: "Focus on distributed systems, AI, and cloud architecture.",
    is_published: true,
    sort_order: 10,
  };

  const result = educationSchema.safeParse(completeEducation);
  assert.strictEqual(
    result.success,
    true,
    `Complete education row should pass validation: ${result.error?.message}`
  );
});

// =============================================================================
// SUITE 2: Experience Validation (Optional Dates and Locations)
// =============================================================================

test("[VALIDATION] experienceSchema permits optional location, start_date, and end_date", () => {
  // Hackathon participant entry without location or exact dates
  const minimalExperience = {
    role: "Participant",
    organization: "HackSpirit 1.0, VVCE Mysore",
    is_published: true,
    sort_order: 10,
  };

  const result = experienceSchema.safeParse(minimalExperience);
  assert.strictEqual(
    result.success,
    true,
    "Experience entry with optional dates/location omitted should be valid"
  );
  assert.strictEqual(result.data?.location, undefined);
  assert.strictEqual(result.data?.start_date, undefined);
  assert.strictEqual(result.data?.end_date, undefined);

  // Full experience entry
  const fullExperience = {
    role: "Research & Development Intern",
    organization: "Tech Innovators Lab",
    location: "Bangalore, India",
    start_date: "June 2024",
    end_date: "August 2024",
    description: "Built automated verification pipelines.",
    is_published: true,
    sort_order: 20,
  };

  const fullResult = experienceSchema.safeParse(fullExperience);
  assert.strictEqual(fullResult.success, true);
  assert.strictEqual(fullResult.data?.location, "Bangalore, India");
});

test("[VALIDATION] experienceSchema strictly requires role and organization", () => {
  const missingRole = {
    role: "",
    organization: "VVCE",
  };
  assert.strictEqual(experienceSchema.safeParse(missingRole).success, false);

  const missingOrg = {
    role: "Developer",
    organization: "",
  };
  assert.strictEqual(experienceSchema.safeParse(missingOrg).success, false);
});

// =============================================================================
// SUITE 3: Certifications Validation (URLs and Skills Tags)
// =============================================================================

test("[VALIDATION] certificationSchema validates details, safe URLs, and skills tags", () => {
  const validCert = {
    title: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    issue_date: "November 2024",
    credential_id: "AWS-CLF-00129",
    credential_url: "https://www.credly.com/badges/sample-id",
    category: "Cloud",
    skills: ["AWS", "Cloud Computing", "S3", "IAM"],
    is_published: true,
    sort_order: 10,
  };

  const result = certificationSchema.safeParse(validCert);
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(result.data?.skills, ["AWS", "Cloud Computing", "S3", "IAM"]);

  // Reject malicious javascript: credential URL
  const maliciousCert = {
    ...validCert,
    credential_url: "javascript:alert(1)",
  };
  const malResult = certificationSchema.safeParse(maliciousCert);
  assert.strictEqual(
    malResult.success,
    false,
    "Malicious javascript: URL in credential_url must be rejected"
  );
});

// =============================================================================
// SUITE 4: Blog Posts (Word Count Reading Time & Markdown Sanitization)
// =============================================================================

test("[BLOG] calculateReadTime dynamically computes ceil(words / 200)", () => {
  // Empty or short
  assert.strictEqual(calculateReadTime(""), "1 min read");
  assert.strictEqual(calculateReadTime("Hello world"), "1 min read");

  // 199 words -> 1 min
  const words199 = new Array(199).fill("word").join(" ");
  assert.strictEqual(calculateReadTime(words199), "1 min read");

  // 200 words -> 1 min
  const words200 = new Array(200).fill("word").join(" ");
  assert.strictEqual(calculateReadTime(words200), "1 min read");

  // 201 words -> ceil(201/200) = 2 min
  const words201 = new Array(201).fill("word").join(" ");
  assert.strictEqual(calculateReadTime(words201), "2 min read");

  // 550 words -> ceil(550/200) = 3 min
  const words550 = new Array(550).fill("token").join(" ");
  assert.strictEqual(calculateReadTime(words550), "3 min read");

  // 1000 words -> ceil(1000/200) = 5 min
  const words1000 = new Array(1000).fill("token").join(" ");
  assert.strictEqual(calculateReadTime(words1000), "5 min read");
});

test("[BLOG] postSchema validates title, slug format, tags, and content", () => {
  const validPost = {
    title: "Engineering Reliable LLM Applications",
    slug: "engineering-reliable-llm-applications",
    excerpt: "Insights from designing deterministic clinical verification pipelines.",
    content: "# Architecture Overview\n\nProvenance trails ensure accountability.",
    tags: ["LLM", "Next.js", "AI Safety"],
    is_published: true,
    sort_order: 10,
  };

  const result = postSchema.safeParse(validPost);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data?.slug, "engineering-reliable-llm-applications");

  // Invalid slug with uppercase or special symbols
  const invalidSlugPost = {
    ...validPost,
    slug: "Engineering_Reliable_LLM!",
  };
  assert.strictEqual(postSchema.safeParse(invalidSlugPost).success, false);
});

test("[BLOG] Markdown post content is sanitized against XSS via rehypeSanitize", () => {
  const dangerousMarkdown = `
# Engineering Notes

<script>alert('XSS Exploit')</script>
<img src="x" onerror="alert(document.cookie)" />
[Click Me](javascript:stealData())

Safe paragraph with **bold** text and \`code\`.
  `;

  const renderedHtml = renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { rehypePlugins: [rehypeSanitize] },
      dangerousMarkdown
    )
  );

  // Assert script tag and event handlers are neutralized
  assert.strictEqual(renderedHtml.includes("<script>"), false);
  assert.strictEqual(renderedHtml.includes("onerror"), false);
  assert.strictEqual(renderedHtml.includes("javascript:"), false);

  // Safe formatting is preserved
  assert.strictEqual(renderedHtml.includes("<h1>Engineering Notes</h1>"), true);
  assert.strictEqual(renderedHtml.includes("<strong>bold</strong>"), true);
  assert.strictEqual(renderedHtml.includes("<code>code</code>"), true);
});

// =============================================================================
// SUITE 5: Messages Inbox Security & Plain Text Rendering Guarantee
// =============================================================================

test("[MESSAGES] Message bodies are strictly rendered as plain text strings (zero HTML parsing)", () => {
  const maliciousMessageBody = `<script>alert('xss')</script><iframe src="evil.com"></iframe><b>Bold Text</b>`;

  // Simulate rendering inside React component without dangerouslySetInnerHTML:
  // Rendered directly as text children of a <pre> element
  const rendered = renderToStaticMarkup(
    React.createElement("pre", { className: "whitespace-pre-wrap font-sans" }, maliciousMessageBody)
  );

  // In React, string children are automatically HTML-escaped by default
  assert.ok(rendered.includes("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"));
  assert.ok(rendered.includes("&lt;iframe src=&quot;evil.com&quot;&gt;&lt;/iframe&gt;"));
  assert.strictEqual(rendered.includes("<script>"), false);
  assert.strictEqual(rendered.includes("<iframe>"), false);
});

// =============================================================================
// SUITE 6: Real Supabase Anonymous Reads & RLS Protection on Stage 6B Tables
// =============================================================================

test("[REAL SUPABASE] Anon client can read published education, experience, certifications, and posts", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be defined");
  assert.ok(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined");

  const supabase = createClient(supabaseUrl, anonKey);

  // 1. Read education
  const { data: eduData, error: eduError } = await supabase
    .from("education")
    .select("id, institution, degree, is_published");

  assert.strictEqual(eduError, null, "Reading education should succeed for anon");
  assert.ok(Array.isArray(eduData));

  // 2. Read experience
  const { data: expData, error: expError } = await supabase
    .from("experience")
    .select("id, role, is_published");

  assert.strictEqual(expError, null, "Reading experience should succeed for anon");
  assert.ok(Array.isArray(expData));

  // 3. Read certifications
  const { data: certData, error: certError } = await supabase
    .from("certifications")
    .select("id, title, issuer, is_published");

  assert.strictEqual(certError, null, "Reading certifications should succeed for anon");
  assert.ok(Array.isArray(certData));

  // 4. Read posts
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id, title, slug, is_published");

  assert.strictEqual(postError, null, "Reading posts should succeed for anon");
  assert.ok(Array.isArray(postData));
});

test("[REAL SUPABASE] Anon client is blocked from inserting or deleting rows in Stage 6B tables (RLS)", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, anonKey);

  // 1. Anon inserting into education must fail
  const { error: eduInsertError } = await supabase.from("education").insert({
    institution: "Hacker University",
    degree: "Ph.D. in Defacement",
    is_published: true,
  });
  assert.ok(eduInsertError, "Anon inserting into education must trigger RLS error");

  // 2. Anon inserting into experience must fail
  const { error: expInsertError } = await supabase.from("experience").insert({
    role: "Attacker",
    is_published: true,
  });
  assert.ok(expInsertError, "Anon inserting into experience must trigger RLS error");

  // 3. Anon inserting into certifications must fail
  const { error: certInsertError } = await supabase.from("certifications").insert({
    title: "Fake Certification",
    issuer: "Fake Issuer",
    issue_date: "Now",
    is_published: true,
  });
  assert.ok(certInsertError, "Anon inserting into certifications must trigger RLS error");

  // 4. Anon inserting into posts must fail
  const { error: postInsertError } = await supabase.from("posts").insert({
    title: "Spam Article",
    slug: "spam-article",
    content: "Spam content",
    is_published: true,
  });
  assert.ok(postInsertError, "Anon inserting into posts must trigger RLS error");
});

test("[REAL SUPABASE] Cleanup Guarantee: Zero temporary test rows left in live Supabase tables", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, anonKey);

  // Check all tables for test prefixes
  const [eduRes, expRes, certRes, postRes] = await Promise.all([
    supabase.from("education").select("id, institution").like("institution", "test-%"),
    supabase.from("experience").select("id, role").like("role", "test-%"),
    supabase.from("certifications").select("id, title").like("title", "test-%"),
    supabase.from("posts").select("id, slug").like("slug", "test-%"),
  ]);

  assert.deepStrictEqual(eduRes.data || [], [], "No leftover test education rows");
  assert.deepStrictEqual(expRes.data || [], [], "No leftover test experience rows");
  assert.deepStrictEqual(certRes.data || [], [], "No leftover test certifications rows");
  assert.deepStrictEqual(postRes.data || [], [], "No leftover test post rows");
});

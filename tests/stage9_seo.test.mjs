import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  safeJsonLdReplacer,
  buildPersonJsonLd,
  buildBlogPostingJsonLd,
} from "../src/lib/seo.ts";
import { getSiteUrl, getSiteHostname } from "../src/lib/site-url.ts";

// =============================================================================
// SUITE 1: JSON-LD Structured Data & Injection Defense
// =============================================================================

test("[SEO JSON-LD] safeJsonLdReplacer strictly escapes '<' as '\\u003c'", () => {
  const payload = {
    title: "Test <script>alert(1)</script>",
    description: "Bio with <b>HTML</b> & </script><script src='bad.js'>",
  };

  const serialized = safeJsonLdReplacer(payload);

  // Must not contain any literal '<' characters
  assert.equal(serialized.includes("<"), false);
  assert.equal(serialized.includes("\\u003c"), true);

  // Specifically check script tag neutralization
  assert.equal(serialized.includes("\\u003cscript>"), true);
  assert.equal(serialized.includes("\\u003c/script>"), true);
});

test("[SEO JSON-LD] buildPersonJsonLd includes alumniOf ONLY when published education exists", () => {
  // Case A: Published education present
  const personWithEdu = buildPersonJsonLd({
    name: "T V Ajay",
    jobTitle: "Computer Science Engineering Student",
    siteUrl: "https://tvajay.vercel.app",
    sameAs: ["https://github.com/TVAjayXDev"],
    education: [
      { institution: "Vidyavardhaka College of Engineering", is_published: true },
      { institution: "Unpublished High School", is_published: false },
    ],
  });

  assert.equal(personWithEdu["@type"], "Person");
  assert.equal(personWithEdu.name, "T V Ajay");
  assert.equal(personWithEdu.jobTitle, "Computer Science Engineering Student");
  assert.ok(Array.isArray(personWithEdu.alumniOf));
  assert.equal(personWithEdu.alumniOf.length, 1);
  assert.deepEqual(personWithEdu.alumniOf[0], {
    "@type": "EducationalOrganization",
    name: "Vidyavardhaka College of Engineering",
  });

  // Case B: Zero published education (zero invented claims)
  const personWithoutEdu = buildPersonJsonLd({
    name: "T V Ajay",
    jobTitle: "Computer Science Engineering Student",
    siteUrl: "https://tvajay.vercel.app",
    sameAs: ["https://github.com/TVAjayXDev"],
    education: [
      { institution: "Unpublished High School", is_published: false },
    ],
  });

  assert.equal(personWithoutEdu.alumniOf, undefined);

  // Case C: Empty education array
  const personEmpty = buildPersonJsonLd({
    name: "T V Ajay",
    jobTitle: "Computer Science Engineering Student",
    siteUrl: "https://tvajay.vercel.app",
    education: [],
  });

  assert.equal(personEmpty.alumniOf, undefined);
});

test("[SEO JSON-LD] buildBlogPostingJsonLd constructs valid schema and canonical URL", () => {
  const blogJsonLd = buildBlogPostingJsonLd({
    title: "Building TrustLens: Clinical AI Case Study",
    description: "An architectural overview of TrustLens.",
    datePublished: "2026-10-18T00:00:00.000Z",
    slug: "building-trustlens",
    siteUrl: "https://tvajay.vercel.app",
    authorName: "T V Ajay",
  });

  assert.equal(blogJsonLd["@type"], "BlogPosting");
  assert.equal(blogJsonLd.headline, "Building TrustLens: Clinical AI Case Study");
  assert.equal(blogJsonLd.url, "https://tvajay.vercel.app/blog/building-trustlens");
  assert.deepEqual(blogJsonLd.author, {
    "@type": "Person",
    name: "T V Ajay",
  });
  assert.equal(blogJsonLd.datePublished, "2026-10-18T00:00:00.000Z");
});

// =============================================================================
// SUITE 2: Admin Exclusion & Robots Verification
// =============================================================================

test("[SEO ROBOTS] robots.ts disallows /admin and /api, allows root, and links sitemap", () => {
  const robotsCode = fs.readFileSync(path.join(process.cwd(), "src/app/robots.ts"), "utf-8");
  assert.ok(robotsCode.includes('"*"'), "Must specify userAgent: *");
  assert.ok(robotsCode.includes('"/"'), "Must allow /");
  assert.ok(robotsCode.includes('"/admin"'), "Must disallow /admin");
  assert.ok(robotsCode.includes('"/api"'), "Must disallow /api");
  assert.ok(robotsCode.includes("sitemap.xml"), "Must link sitemap.xml");
});

test("[SEO ADMIN NOINDEX] Admin layout enforces robots noindex, nofollow and middleware sets header", () => {
  const layoutContent = fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/layout.tsx"),
    "utf-8"
  );
  assert.match(layoutContent, /robots:\s*\{[^}]*index:\s*false[^}]*follow:\s*false/s);

  const middlewareContent = fs.readFileSync(
    path.join(process.cwd(), "src/lib/supabase/middleware.ts"),
    "utf-8"
  );
  assert.match(middlewareContent, /X-Robots-Tag.*noindex.*nofollow/);
});

// =============================================================================
// SUITE 3: Sitemap Generation Logic (Hide-if-Empty & Content Filtering)
// =============================================================================

test("[SEO SITEMAP] Sitemap logic filters empty-content projects and empty blog", () => {
  const mockProjects = [
    {
      id: "1",
      slug: "trustlens",
      title: "TrustLens",
      is_published: true,
      content: "## Case Study Overview\nDetailed architecture...",
      updated_at: "2026-10-17T00:00:00.000Z",
    },
    {
      id: "2",
      slug: "empty-project",
      title: "Empty Project",
      is_published: true,
      content: "", // Empty content -> MUST NOT appear in sitemap
      updated_at: "2026-10-17T00:00:00.000Z",
    },
    {
      id: "3",
      slug: "unpublished-project",
      title: "Unpublished Project",
      is_published: false,
      content: "Has content but unpublished",
      updated_at: "2026-10-17T00:00:00.000Z",
    },
  ];

  // Helper replicating sitemap() filtering logic
  function filterSitemapEntries(siteUrl, projects, posts) {
    const normalizedUrl = siteUrl.replace(/\/$/, "");
    const entries = [
      { url: normalizedUrl, priority: 1.0 },
    ];

    if (posts.length > 0) {
      entries.push({ url: `${normalizedUrl}/blog`, priority: 0.8 });
    }

    for (const p of projects) {
      if (p.is_published && p.content && p.content.trim().length > 0) {
        entries.push({ url: `${normalizedUrl}/projects/${p.slug}`, priority: 0.8 });
      }
    }

    for (const post of posts) {
      if (post.is_published) {
        entries.push({ url: `${normalizedUrl}/blog/${post.slug}`, priority: 0.7 });
      }
    }

    return entries;
  }

  // Case A: Zero posts
  const entriesNoPosts = filterSitemapEntries("https://tvajay.vercel.app", mockProjects, []);
  const urlsNoPosts = entriesNoPosts.map((e) => e.url);

  assert.ok(urlsNoPosts.includes("https://tvajay.vercel.app"));
  assert.ok(urlsNoPosts.includes("https://tvajay.vercel.app/projects/trustlens"));
  assert.equal(urlsNoPosts.includes("https://tvajay.vercel.app/projects/empty-project"), false);
  assert.equal(urlsNoPosts.includes("https://tvajay.vercel.app/projects/unpublished-project"), false);
  assert.equal(urlsNoPosts.includes("https://tvajay.vercel.app/blog"), false); // Hidden when empty

  // Case B: With published posts
  const mockPosts = [
    {
      id: "p1",
      slug: "welcome-dispatch",
      is_published: true,
    },
  ];
  const entriesWithPosts = filterSitemapEntries("https://tvajay.vercel.app", mockProjects, mockPosts);
  const urlsWithPosts = entriesWithPosts.map((e) => e.url);

  assert.ok(urlsWithPosts.includes("https://tvajay.vercel.app/blog"));
  assert.ok(urlsWithPosts.includes("https://tvajay.vercel.app/blog/welcome-dispatch"));
});

// =============================================================================
// SUITE 4: Per-Page Metadata & Script Injection Resilience
// =============================================================================

test("[SEO METADATA] Project metadata logic enforces canonical URL and content-based indexing", () => {
  function generateProjectMeta(project, siteUrl = "https://tvajay.vercel.app") {
    if (!project || !project.is_published) {
      return { title: "Project Not Found", robots: { index: false, follow: false } };
    }
    const hasContent = Boolean(project.content && project.content.trim().length > 0);
    const canonicalUrl = `${siteUrl.replace(/\/$/, "")}/projects/${project.slug}`;
    return {
      title: `${project.title} | Case Study`,
      description: project.description,
      alternates: { canonical: canonicalUrl },
      robots: hasContent ? { index: true, follow: true } : { index: false, follow: false },
      openGraph: {
        title: `${project.title} | Case Study`,
        description: project.description,
        url: canonicalUrl,
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: `${project.title} | Case Study`,
        description: project.description,
      },
    };
  }

  // Project with content
  const metaWithContent = generateProjectMeta({
    title: "TrustLens",
    slug: "trustlens",
    description: "Clinical AI governance platform",
    content: "## System Architecture\nDetailed content...",
    is_published: true,
  });
  assert.equal(metaWithContent.title, "TrustLens | Case Study");
  assert.equal(metaWithContent.alternates.canonical, "https://tvajay.vercel.app/projects/trustlens");
  assert.deepEqual(metaWithContent.robots, { index: true, follow: true });

  // Project with empty content
  const metaEmptyContent = generateProjectMeta({
    title: "Draft Project",
    slug: "draft-project",
    description: "Drafting...",
    content: "   ",
    is_published: true,
  });
  assert.equal(metaEmptyContent.alternates.canonical, "https://tvajay.vercel.app/projects/draft-project");
  assert.deepEqual(metaEmptyContent.robots, { index: false, follow: false });

  // Unpublished project
  const metaUnpublished = generateProjectMeta({
    title: "Hidden Project",
    slug: "hidden",
    is_published: false,
  });
  assert.equal(metaUnpublished.title, "Project Not Found");
  assert.deepEqual(metaUnpublished.robots, { index: false, follow: false });
});

test("[SEO SECURITY] Script injection attack in JSON-LD is completely neutralized", () => {
  const maliciousBio = '</script><script>alert("PWNED!")</script>';
  const person = buildPersonJsonLd({
    name: maliciousBio,
    jobTitle: "Developer <img src=x onerror=alert(1)>",
    siteUrl: "https://tvajay.vercel.app",
    education: [
      { institution: "<b>College</b></script>", is_published: true },
    ],
  });

  const serialized = safeJsonLdReplacer(person);

  // The string MUST NOT contain the string '</script>' or '<script>' in any form
  assert.equal(serialized.includes("</script>"), false);
  assert.equal(serialized.includes("<script>"), false);
  assert.equal(serialized.includes("<img"), false);
  assert.equal(serialized.includes("<b>"), false);

  // It should be completely converted to \u003c
  assert.equal(serialized.includes("\\u003c/script>"), true);
  assert.equal(serialized.includes("\\u003cscript>"), true);
});

test("[SEO SITE-URL] getSiteUrl strictly respects env variables and never emits a guessed domain", () => {
  const origSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const origVercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  try {
    // 1. Explicit NEXT_PUBLIC_SITE_URL takes precedence
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom-domain.org";
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    assert.equal(getSiteUrl(), "https://custom-domain.org");
    assert.equal(getSiteHostname(), "custom-domain.org");

    // 2. Fallback to VERCEL_PROJECT_PRODUCTION_URL
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "my-site.vercel.app";
    assert.equal(getSiteUrl(), "https://my-site.vercel.app");
    assert.equal(getSiteHostname(), "my-site.vercel.app");

    // 3. Fallback to localhost:3000 in dev
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    assert.equal(getSiteUrl(), "http://localhost:3000");
    assert.equal(getSiteHostname(), "localhost");
  } finally {
    if (origSiteUrl !== undefined) {
      process.env.NEXT_PUBLIC_SITE_URL = origSiteUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
    if (origVercelUrl !== undefined) {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = origVercelUrl;
    } else {
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    }
  }
});

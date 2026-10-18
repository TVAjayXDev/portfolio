/**
 * SEO & Structured Data Utilities
 * Strictly escapes '<' as '\u003c' to prevent script breakout / XSS in application/ld+json scripts.
 * Adheres to zero invented claims - pulls strictly from database-backed properties.
 */

export function safeJsonLdReplacer(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export interface PersonJsonLdOptions {
  name: string;
  jobTitle: string;
  siteUrl: string;
  sameAs?: Array<string | null | undefined>;
  education?: Array<{ institution: string; is_published: boolean }>;
}

export function buildPersonJsonLd(options: PersonJsonLdOptions): Record<string, unknown> {
  const person: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: options.name,
    jobTitle: options.jobTitle,
    url: options.siteUrl,
  };

  const validSameAs = (options.sameAs || []).filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0
  );
  if (validSameAs.length > 0) {
    person.sameAs = validSameAs;
  }

  // alumniOf ONLY if published education rows exist in the database; zero invented fields!
  const publishedEdu = (options.education || []).filter(
    (e) => e.is_published && e.institution && e.institution.trim().length > 0
  );
  if (publishedEdu.length > 0) {
    person.alumniOf = publishedEdu.map((edu) => ({
      "@type": "EducationalOrganization",
      name: edu.institution,
    }));
  }

  return person;
}

export interface BlogPostingJsonLdOptions {
  title: string;
  description?: string | null;
  datePublished?: string | null;
  slug: string;
  siteUrl: string;
  authorName: string;
}

export function buildBlogPostingJsonLd(options: BlogPostingJsonLdOptions): Record<string, unknown> {
  const postUrl = `${options.siteUrl.replace(/\/$/, "")}/blog/${options.slug}`;
  const blogPosting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: options.title,
    url: postUrl,
    author: {
      "@type": "Person",
      name: options.authorName,
    },
  };

  if (options.description && options.description.trim().length > 0) {
    blogPosting.description = options.description.trim();
  }

  if (options.datePublished && options.datePublished.trim().length > 0) {
    blogPosting.datePublished = options.datePublished;
  }

  return blogPosting;
}

import type { MetadataRoute } from "next";
import { getProjects, getPosts, getSiteSettings } from "@/lib/data";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const normalizedUrl = getSiteUrl();

  const [settings, projects, posts] = await Promise.all([
    getSiteSettings(),
    getProjects({ onlyPublished: true }),
    getPosts({ onlyPublished: true }),
  ]);

  const sitemapEntries: MetadataRoute.Sitemap = [
    {
      url: normalizedUrl,
      lastModified: settings?.updated_at ? new Date(settings.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];

  // Blog index: hide-if-empty applies. Only included if published posts exist.
  if (posts.length > 0) {
    sitemapEntries.push({
      url: `${normalizedUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Published projects that have non-empty content (case study)
  for (const project of projects) {
    if (project.content && project.content.trim().length > 0) {
      sitemapEntries.push({
        url: `${normalizedUrl}/projects/${project.slug}`,
        lastModified: project.updated_at ? new Date(project.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  }

  // Published blog posts
  for (const post of posts) {
    sitemapEntries.push({
      url: `${normalizedUrl}/blog/${post.slug}`,
      lastModified: post.updated_at
        ? new Date(post.updated_at)
        : new Date(post.published_at || Date.now()),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return sitemapEntries;
}

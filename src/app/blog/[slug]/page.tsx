import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPosts, getSiteSettings } from "@/lib/data";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ArrowLeft, Calendar, Timer } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import type { Metadata } from "next";
import { buildBlogPostingJsonLd, safeJsonLdReplacer } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post || !post.is_published) {
    return {
      title: "Article Not Found",
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt || post.title,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      url: canonicalUrl,
      type: "article",
      publishedTime: post.published_at || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || post.title,
    },
  };
}

export async function generateStaticParams() {
  const posts = await getPosts({ onlyPublished: true });
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const [post, settings] = await Promise.all([
    getPostBySlug(params.slug),
    getSiteSettings(),
  ]);

  if (!post || !post.is_published) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const blogPostingJsonLd = buildBlogPostingJsonLd({
    title: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    slug: post.slug,
    siteUrl,
    authorName: settings?.name || "T V Ajay",
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#111118] text-on-surface antialiased selection:bg-surface-tint selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(blogPostingJsonLd) }}
      />
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-1 w-full pt-16 focus:outline-none">
        <article className="max-w-[800px] mx-auto px-4 md:px-8 py-10 md:py-16">
          <div className="flex items-center gap-2 font-mono text-xs text-outline mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-surface-tint hover:underline transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Articles</span>
            </Link>
          </div>

          <header className="flex flex-col gap-4 pb-8 border-b border-outline-variant">
            <div className="flex items-center gap-4 text-outline font-mono text-xs">
              {post.published_at && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date(post.published_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {post.read_time && (
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  <span>{post.read_time}</span>
                </div>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface tracking-tight leading-tight">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="font-body text-base text-on-surface-variant leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded bg-surface-container font-mono text-xs text-surface-tint border border-outline-variant"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="mt-10 font-body text-on-surface-variant leading-relaxed text-base prose prose-invert max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}

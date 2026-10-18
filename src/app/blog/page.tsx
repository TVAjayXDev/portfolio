import React from "react";
import Link from "next/link";
import { getPosts } from "@/lib/data";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ArrowLeft, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog`;

  return {
    title: "Blog & Technical Notes",
    description: "Technical writings, notes, and learnings by T V Ajay.",
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: "Blog & Technical Notes",
      description: "Technical writings, notes, and learnings by T V Ajay.",
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Blog & Technical Notes",
      description: "Technical writings, notes, and learnings by T V Ajay.",
    },
  };
}

export default async function BlogIndexPage() {
  const posts = await getPosts({ onlyPublished: true });

  return (
    <div className="flex flex-col min-h-screen bg-[#111118] text-on-surface antialiased selection:bg-surface-tint selection:text-black">
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-1 w-full pt-16 focus:outline-none">
        <div className="max-w-[1040px] mx-auto px-4 md:px-8 py-10 md:py-16">
          <div className="flex items-center gap-2 font-mono text-xs text-outline mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-surface-tint hover:underline transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="flex flex-col gap-2 pb-8 border-b border-outline-variant">
            <span className="font-mono text-xs text-surface-tint uppercase tracking-widest font-semibold">
              {"// Blog"}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-on-surface">
              Articles & Learnings
            </h1>
            <p className="font-body text-sm text-on-surface-variant max-w-xl">
              Technical writings, notes, and learnings.
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
              <BookOpen className="w-8 h-8 text-outline" />
              <p className="font-mono text-sm text-outline">
                No articles published yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/40 transition-colors flex flex-col justify-between group"
                >
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-xs text-outline">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : "Draft"}
                    </span>
                    <h2 className="font-display text-lg font-semibold text-on-surface group-hover:text-surface-tint transition-colors">
                      {post.title}
                    </h2>
                    <p className="font-body text-xs sm:text-sm text-on-surface-variant line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

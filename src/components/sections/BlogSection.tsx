import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Post, SectionConfig } from "@/lib/types";

interface BlogSectionProps {
  posts: Post[];
  section?: SectionConfig;
}

export const BlogSection: React.FC<BlogSectionProps> = ({ posts, section }) => {
  const published = posts.filter((p) => p.is_published);

  // Hide-if-empty: Nothing renders while there are zero published posts
  if (published.length === 0) return null;

  const title = section?.title || "Blog";

  return (
    <section
      id="blog"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24 border-b border-outline-variant/60"
    >
      <div className="flex flex-col gap-8">
        <div>
          <span className="text-surface-tint font-mono text-xs uppercase tracking-widest block font-semibold">
            {"//"} {title}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight mt-1">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {published.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/40 transition-colors flex flex-col justify-between group shadow-sm"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-outline font-mono text-xs">
                  <span>
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "Draft"}
                  </span>
                  {post.read_time && <span>{post.read_time}</span>}
                </div>

                <h3 className="font-display text-lg font-semibold text-on-surface group-hover:text-surface-tint transition-colors">
                  {post.title}
                </h3>

                <p className="font-body text-xs sm:text-sm text-on-surface-variant line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-outline-variant/60 flex items-center justify-between">
                {post.tags && post.tags.length > 0 ? (
                  <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[10px] text-surface-tint">
                    {post.tags[0]}
                  </span>
                ) : (
                  <span />
                )}
                <ArrowRight className="w-4 h-4 text-outline group-hover:text-surface-tint group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

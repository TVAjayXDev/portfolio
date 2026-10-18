import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { BookOpen } from "lucide-react";
import { BlogManager, type PostRecord } from "@/components/admin/BlogManager";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const { supabase } = await requireAdmin();

  const { data: dbPosts } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  const initialPosts: PostRecord[] = ((dbPosts || []) as (PostRecord & { reading_time_minutes?: number })[]).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt || "",
    content: p.content || "",
    cover_image_url: p.cover_image_url || "",
    read_time: p.read_time || (p.reading_time_minutes ? `${p.reading_time_minutes} min read` : "1 min read"),
    tags: Array.isArray(p.tags) ? p.tags : [],
    is_published: Boolean(p.is_published),
    published_at: p.published_at || null,
    sort_order: p.sort_order ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">Blog & Article Management</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Publish and edit technical writings, case studies, and engineering learning logs.
        </p>
      </div>

      <BlogManager initialPosts={initialPosts} />
    </div>
  );
}

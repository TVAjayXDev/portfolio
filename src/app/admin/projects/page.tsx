import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { FolderGit2 } from "lucide-react";
import { ProjectsManager } from "@/components/admin/ProjectsManager";

export const dynamic = "force-dynamic";

interface DbProjectRow {
  id: string;
  title: string;
  slug: string;
  tagline?: string | null;
  description: string;
  long_description?: string | null;
  content?: string | null;
  team?: string | null;
  demo_url?: string | null;
  github_url?: string | null;
  image_url?: string | null;
  technologies?: string[] | null;
  status: "completed" | "in_progress" | "planned" | "coming_soon" | "live";
  is_featured: boolean;
  is_published: boolean;
  sort_order?: number | null;
}

export default async function AdminProjectsPage() {
  const { supabase } = await requireAdmin();

  const { data: dbProjects } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  const initialProjects = ((dbProjects || []) as DbProjectRow[]).map((p: DbProjectRow) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    tagline: p.tagline || "",
    description: p.description,
    long_description: p.long_description || "",
    content: p.content || "",
    team: p.team || "",
    demo_url: p.demo_url || "",
    github_url: p.github_url || "",
    image_url: p.image_url || "",
    technologies: Array.isArray(p.technologies) ? p.technologies : [],
    status: p.status,
    is_featured: Boolean(p.is_featured),
    is_published: Boolean(p.is_published),
    sort_order: p.sort_order ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">Projects Management</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Create, edit, feature, and manage projects, screenshot previews, and case study documentation.
        </p>
      </div>

      <ProjectsManager initialProjects={initialProjects} />
    </div>
  );
}

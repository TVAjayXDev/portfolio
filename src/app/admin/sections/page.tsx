import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { ListOrdered } from "lucide-react";
import { SectionOrderManager } from "@/components/admin/SectionOrderManager";
import type { SectionItemInput } from "@/lib/validations/admin";

export const dynamic = "force-dynamic";

const defaultSections: SectionItemInput[] = [
  { id: "hero", title: "Hero", subtitle: "Student & Developer", is_visible: true, sort_order: 1 },
  { id: "about", title: "About", subtitle: "Academic background and technical foundations", is_visible: true, sort_order: 2 },
  { id: "skills", title: "Skills", subtitle: "Technical capabilities and tools", is_visible: true, sort_order: 3 },
  { id: "featured_project", title: "Featured Project", subtitle: "Clinical governance AI assistant", is_visible: true, sort_order: 4 },
  { id: "projects", title: "Projects", subtitle: "Independent builds and applications", is_visible: true, sort_order: 5 },
  { id: "coming_soon", title: "In Progress", subtitle: "Active projects in development", is_visible: true, sort_order: 6 },
  { id: "github", title: "Live GitHub Repositories", subtitle: "Open source repositories and code", is_visible: true, sort_order: 7 },
  { id: "education", title: "Education", subtitle: "Academic qualifications", is_visible: true, sort_order: 8 },
  { id: "experience", title: "Experience", subtitle: "Hackathons and activities", is_visible: true, sort_order: 9 },
  { id: "certifications", title: "Certifications", subtitle: "Verified certifications", is_visible: true, sort_order: 10 },
  { id: "blog", title: "Blog", subtitle: "Technical writeups and learnings", is_visible: true, sort_order: 11 },
  { id: "contact", title: "Contact", subtitle: "Get in touch for internships and collaborations", is_visible: true, sort_order: 12 },
];

interface DbSectionRow {
  id: string;
  title: string;
  subtitle?: string | null;
  is_visible: boolean;
  sort_order: number;
}

export default async function AdminSectionsPage() {
  const { supabase } = await requireAdmin();

  const { data: dbSections } = await supabase
    .from("sections")
    .select("id, title, subtitle, is_visible, sort_order")
    .order("sort_order", { ascending: true });

  const initialSections: SectionItemInput[] =
    dbSections && dbSections.length > 0
      ? (dbSections as DbSectionRow[]).map((s: DbSectionRow) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          is_visible: s.is_visible,
          sort_order: s.sort_order,
        }))
      : defaultSections;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Section Order & Visibility
          </h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Toggle public visibility, customize section titles and subtitles, and drag rows to rearrange the layout order.
        </p>
      </div>

      <SectionOrderManager initialSections={initialSections} />
    </div>
  );
}

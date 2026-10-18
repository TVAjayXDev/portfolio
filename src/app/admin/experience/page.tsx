import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { Terminal } from "lucide-react";
import { ExperienceManager, type ExperienceRecord } from "@/components/admin/ExperienceManager";

export const dynamic = "force-dynamic";

export default async function AdminExperiencePage() {
  const { supabase } = await requireAdmin();

  const { data: dbExperience } = await supabase
    .from("experience")
    .select("*")
    .order("sort_order", { ascending: true });

  const initialExperience: ExperienceRecord[] = ((dbExperience || []) as ExperienceRecord[]).map((e) => ({
    id: e.id,
    role: e.role,
    organization: e.organization,
    location: e.location || "",
    start_date: e.start_date || "",
    end_date: e.end_date || "",
    description: e.description || "",
    is_published: Boolean(e.is_published),
    sort_order: e.sort_order ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">Experience Management</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Manage roles, hackathon participations, internships, and project engagements.
        </p>
      </div>

      <ExperienceManager initialExperience={initialExperience} />
    </div>
  );
}

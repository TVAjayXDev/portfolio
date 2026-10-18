import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { Cpu } from "lucide-react";
import { SkillsManager } from "@/components/admin/SkillsManager";

export const dynamic = "force-dynamic";

interface DbSkillRow {
  id: string;
  name: string;
  category: string;
  proficiency?: number | null;
  is_published: boolean;
  sort_order?: number | null;
}

export default async function AdminSkillsPage() {
  const { supabase } = await requireAdmin();

  const { data: dbSkills } = await supabase
    .from("skills")
    .select("*")
    .order("sort_order", { ascending: true });

  const initialSkills = ((dbSkills || []) as DbSkillRow[]).map((s: DbSkillRow) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    proficiency: s.proficiency ?? null,
    is_published: Boolean(s.is_published),
    sort_order: s.sort_order ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">Skills Management</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Add, edit, reorder, or publish technical skills and category groupings.
        </p>
      </div>

      <SkillsManager initialSkills={initialSkills} />
    </div>
  );
}

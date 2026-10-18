import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { GraduationCap } from "lucide-react";
import { EducationManager, type EducationRecord } from "@/components/admin/EducationManager";

export const dynamic = "force-dynamic";

export default async function AdminEducationPage() {
  const { supabase } = await requireAdmin();

  const { data: dbEducation } = await supabase
    .from("education")
    .select("*")
    .order("sort_order", { ascending: true });

  const initialEducation: EducationRecord[] = ((dbEducation || []) as EducationRecord[]).map((e) => ({
    id: e.id,
    institution: e.institution,
    degree: e.degree,
    field_of_study: e.field_of_study || "",
    start_year: e.start_year || "",
    end_year: e.end_year || "",
    grade: e.grade || "",
    current_semester: e.current_semester || "",
    description: e.description || "",
    is_published: Boolean(e.is_published),
    sort_order: e.sort_order ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">Education Management</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Manage degrees, coursework, universities, and academic metrics.
        </p>
      </div>

      <EducationManager initialEducation={initialEducation} />
    </div>
  );
}

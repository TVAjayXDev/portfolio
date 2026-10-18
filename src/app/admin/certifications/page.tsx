import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { Award } from "lucide-react";
import {
  CertificationsManager,
  type CertificationRecord,
} from "@/components/admin/CertificationsManager";

export const dynamic = "force-dynamic";

export default async function AdminCertificationsPage() {
  const { supabase } = await requireAdmin();

  const { data: dbCertifications } = await supabase
    .from("certifications")
    .select("*")
    .order("sort_order", { ascending: true });

  const initialCertifications: CertificationRecord[] = (
    (dbCertifications || []) as (CertificationRecord & {
      certificate_file_url?: string | null;
      thumbnail_url?: string | null;
    })[]
  ).map((c) => ({
    id: c.id,
    title: c.title,
    issuer: c.issuer,
    issue_date: c.issue_date,
    credential_id: c.credential_id || "",
    credential_url: c.credential_url || "",
    certificate_file_url: c.certificate_file_url || "",
    thumbnail_url: c.thumbnail_url || "",
    category: c.category || "General",
    skills: Array.isArray(c.skills) ? c.skills : [],
    is_published: Boolean(c.is_published),
    sort_order: c.sort_order ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">Certifications Management</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Manage professional certifications, licenses, verification links, and skill tags.
        </p>
      </div>

      <CertificationsManager initialCertifications={initialCertifications} />
    </div>
  );
}

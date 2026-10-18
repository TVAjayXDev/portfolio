import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { FileText } from "lucide-react";
import { ResumeManager } from "@/components/admin/ResumeManager";

export const dynamic = "force-dynamic";

export default async function AdminResumePage() {
  const { supabase } = await requireAdmin();

  const { data: settings } = await supabase
    .from("site_settings")
    .select("resume_url, resume_updated_at")
    .eq("id", 1)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">Resume Management</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Upload and manage your official PDF resume. Download links appear across the portfolio when set.
        </p>
      </div>

      <ResumeManager
        initialResumeUrl={settings?.resume_url || null}
        initialResumeUpdatedAt={settings?.resume_updated_at || null}
      />
    </div>
  );
}

import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { User } from "lucide-react";
import { AboutManager } from "@/components/admin/AboutManager";

export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  const { supabase } = await requireAdmin();

  const { data: settings } = await supabase
    .from("site_settings")
    .select("about_text")
    .eq("id", 1)
    .single();

  const initialAboutText = settings?.about_text || "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">About Configuration</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Edit your personal narrative, philosophy, and professional background.
        </p>
      </div>

      <AboutManager initialAboutText={initialAboutText} />
    </div>
  );
}

import React from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { Settings } from "lucide-react";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import type { SiteSettingsInput } from "@/lib/validations/admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();

  const { data: dbSettings } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const initialSettings: SiteSettingsInput = {
    name: dbSettings?.name || "T V Ajay",
    title: dbSettings?.title || "Computer Science Engineer",
    headline:
      dbSettings?.headline ||
      "Building reliable systems, clean software architectures, and scalable web solutions.",
    subtitle:
      dbSettings?.subtitle ||
      "Undergraduate Computer Science Engineer at Bangalore Institute of Technology.",
    email: dbSettings?.email || "tvajay0@gmail.com",
    github_url: dbSettings?.github_url || "https://github.com/T-V-Ajay",
    linkedin_url: dbSettings?.linkedin_url || "https://www.linkedin.com/in/t-v-ajay",
    availability_badge_text:
      dbSettings?.availability_badge_text || "Open to summer internships & full-time roles",
    availability_badge_active: dbSettings?.availability_badge_active ?? true,
    seo_description:
      dbSettings?.seo_description || "Personal portfolio and engineering log of T V Ajay",
    og_image_url: dbSettings?.og_image_url || "",
    about_text: dbSettings?.about_text || "",
    footer_text:
      dbSettings?.footer_text || "Crafted with Next.js 14, Tailwind CSS & Supabase",
    github_pinned_repos: Array.isArray(dbSettings?.github_pinned_repos)
      ? dbSettings.github_pinned_repos
      : [],
    github_hidden_repos: Array.isArray(dbSettings?.github_hidden_repos)
      ? dbSettings.github_hidden_repos
      : [],
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-surface-tint" />
          <h1 className="font-display text-2xl font-bold text-on-surface">Site Settings</h1>
        </div>
        <p className="font-body text-xs text-on-surface-variant">
          Manage hero headline, pitch, availability status, social profiles, and repository visibility.
        </p>
      </div>

      <SiteSettingsForm initialSettings={initialSettings} />
    </div>
  );
}

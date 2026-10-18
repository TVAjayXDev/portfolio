"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validations/admin";
import { revalidateSettings } from "@/lib/revalidate";

export type ActionResult<T = unknown> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Updates global site settings.
 * Strictly uses the authenticated admin session (RLS applies). Never uses the service role key.
 */
export async function updateSiteSettings(input: SiteSettingsInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const parseResult = siteSettingsSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstErrorMessage =
        parseResult.error.issues[0]?.message || "Validation failed";
      return { success: false, error: firstErrorMessage, fieldErrors };
    }

    const validData = parseResult.data;

    const { error: dbError } = await supabase
      .from("site_settings")
      .update({
        name: validData.name,
        title: validData.title,
        headline: validData.headline,
        subtitle: validData.subtitle,
        email: validData.email,
        github_url: validData.github_url || null,
        linkedin_url: validData.linkedin_url || null,
        availability_badge_text: validData.availability_badge_text,
        availability_badge_active: validData.availability_badge_active,
        seo_description: validData.seo_description,
        og_image_url: validData.og_image_url || null,
        about_text: validData.about_text || null,
        footer_text: validData.footer_text || null,
        github_pinned_repos: validData.github_pinned_repos,
        github_hidden_repos: validData.github_hidden_repos,
      })
      .eq("id", 1);

    if (dbError) {
      console.error("[SETTINGS ACTION ERROR] Database update failed:", dbError.message);
      return { success: false, error: dbError.message };
    }

    // On-demand revalidation of home page and github tag
    await revalidateSettings();

    return { success: true, message: "Site settings updated successfully." };
  } catch (err) {
    console.error("[SETTINGS ACTION EXCEPTION]:", err);
    return { success: false, error: (err as Error).message || "An unexpected error occurred" };
  }
}

/**
 * Updates just the about_text in site_settings.
 */
export async function updateAboutText(aboutText: string | null): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const trimmed = aboutText ? aboutText.trim() : null;
    if (trimmed && trimmed.length > 2500) {
      return { success: false, error: "About text must be 2500 characters or less." };
    }

    const { error: dbError } = await supabase
      .from("site_settings")
      .update({ about_text: trimmed })
      .eq("id", 1);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    await revalidateSettings();
    return { success: true, message: "About narrative updated successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message || "An unexpected error occurred" };
  }
}


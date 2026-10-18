"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { experienceSchema, type ExperienceInput } from "@/lib/validations/admin";
import { revalidateExperience } from "@/lib/revalidate";
import type { ActionResult } from "./settings";

/**
 * Creates or updates an experience entry.
 * location, start_date, and end_date are optional; empty ones hidden on the public site.
 * Strictly uses the authenticated admin session (RLS enforced). Never uses service-role key.
 */
export async function saveExperience(
  input: ExperienceInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const parseResult = experienceSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstErrorMessage =
        parseResult.error.issues[0]?.message || "Validation failed";
      return { success: false, error: firstErrorMessage, fieldErrors };
    }

    const data = parseResult.data;

    const payload = {
      role: data.role,
      organization: data.organization,
      location: data.location || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      description: data.description || null,
      is_published: data.is_published,
      sort_order: data.sort_order,
    };

    let resultId = data.id;

    if (data.id) {
      const { error: updateError } = await supabase
        .from("experience")
        .update(payload)
        .eq("id", data.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("experience")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }
      resultId = inserted.id;
    }

    await revalidateExperience();

    return {
      success: true,
      data: { id: resultId! },
      message: `Experience "${data.role} at ${data.organization}" saved successfully.`,
    };
  } catch (err) {
    console.error("[EXPERIENCE SAVE EXCEPTION]:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred",
    };
  }
}

/**
 * Toggles the published status of an experience entry.
 */
export async function toggleExperiencePublish(
  id: string,
  isPublished: boolean
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("experience")
      .update({ is_published: isPublished })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidateExperience();
    return {
      success: true,
      message: `Experience entry ${isPublished ? "published" : "moved to draft"}.`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Deletes an experience entry.
 */
export async function deleteExperience(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("experience").delete().eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidateExperience();
    return { success: true, message: "Experience entry deleted successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Updates sort order for experience entries.
 */
export async function updateExperienceOrder(
  items: { id: string; sort_order: number }[]
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    for (const item of items) {
      const { error } = await supabase
        .from("experience")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    await revalidateExperience();
    return { success: true, message: "Experience order updated successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

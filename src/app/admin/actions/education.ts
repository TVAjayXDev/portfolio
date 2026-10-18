"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { educationSchema, type EducationInput } from "@/lib/validations/admin";
import { revalidateEducation } from "@/lib/revalidate";
import type { ActionResult } from "./settings";

/**
 * Creates or updates an education entry.
 * Validates via educationSchema: prevents publishing if required fields are missing.
 * Strictly uses the authenticated admin session (RLS enforced). Never uses service-role key.
 */
export async function saveEducation(
  input: EducationInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const parseResult = educationSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstErrorMessage =
        parseResult.error.issues[0]?.message || "Validation failed";
      return { success: false, error: firstErrorMessage, fieldErrors };
    }

    const data = parseResult.data;

    const payload = {
      institution: data.institution,
      degree: data.degree,
      field_of_study: data.field_of_study || null,
      start_year: data.start_year || null,
      end_year: data.end_year || null,
      grade: data.grade || null,
      current_semester: data.current_semester || null,
      description: data.description || null,
      is_published: data.is_published,
      sort_order: data.sort_order,
    };

    let resultId = data.id;

    if (data.id) {
      const { error: updateError } = await supabase
        .from("education")
        .update(payload)
        .eq("id", data.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("education")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }
      resultId = inserted.id;
    }

    await revalidateEducation();

    return {
      success: true,
      data: { id: resultId! },
      message: `Education entry "${data.degree}" saved successfully.`,
    };
  } catch (err) {
    console.error("[EDUCATION SAVE EXCEPTION]:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred",
    };
  }
}

/**
 * Toggles the published status of an education row.
 * Pre-validates that required fields are non-empty before allowing is_published = true.
 */
export async function toggleEducationPublish(
  id: string,
  isPublished: boolean
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    if (isPublished) {
      // Validate that row has all required fields before publishing
      const { data: row, error: fetchError } = await supabase
        .from("education")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !row) {
        return { success: false, error: "Education record not found" };
      }

      if (
        !row.institution?.trim() ||
        !row.degree?.trim() ||
        !row.field_of_study?.trim() ||
        !row.start_year?.trim() ||
        !row.end_year?.trim() ||
        !row.grade?.trim()
      ) {
        return {
          success: false,
          error:
            "Cannot publish: All details (institution, degree, field of study, start year, end year, grade) must be filled before publishing.",
        };
      }
    }

    const { error } = await supabase
      .from("education")
      .update({ is_published: isPublished })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidateEducation();
    return {
      success: true,
      message: `Education entry ${isPublished ? "published" : "moved to draft"}.`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Deletes an education row.
 */
export async function deleteEducation(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("education").delete().eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidateEducation();
    return { success: true, message: "Education entry deleted successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Updates sort order for education entries.
 */
export async function updateEducationOrder(
  items: { id: string; sort_order: number }[]
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    for (const item of items) {
      const { error } = await supabase
        .from("education")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    await revalidateEducation();
    return { success: true, message: "Education order updated successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

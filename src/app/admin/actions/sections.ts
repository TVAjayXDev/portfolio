"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { sectionsBatchSchema, type SectionItemInput } from "@/lib/validations/admin";
import { revalidateSections } from "@/lib/revalidate";
import type { ActionResult } from "./settings";

/**
 * Updates section order, titles, subtitles, and public visibility.
 * Strictly uses the authenticated admin session (RLS applies). Never uses the service role key.
 */
export async function updateSectionsOrder(
  sections: SectionItemInput[]
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const parseResult = sectionsBatchSchema.safeParse(sections);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Invalid sections data",
      };
    }

    const validSections = parseResult.data;

    // Perform atomic updates for each section
    for (const sec of validSections) {
      const { error: dbError } = await supabase
        .from("sections")
        .update({
          title: sec.title,
          subtitle: sec.subtitle || null,
          is_visible: sec.is_visible,
          sort_order: sec.sort_order,
        })
        .eq("id", sec.id);

      if (dbError) {
        console.error(`[SECTIONS ACTION ERROR] Failed to update section ${sec.id}:`, dbError.message);
        return { success: false, error: dbError.message };
      }
    }

    // Revalidate home page and sections order
    await revalidateSections();

    return { success: true, message: "Section display and order saved successfully." };
  } catch (err) {
    console.error("[SECTIONS ACTION EXCEPTION]:", err);
    return { success: false, error: (err as Error).message || "An unexpected error occurred" };
  }
}

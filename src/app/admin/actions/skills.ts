"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { skillSchema, type SkillInput } from "@/lib/validations/admin";
import { revalidateSkills } from "@/lib/revalidate";
import type { ActionResult } from "./settings";

/**
 * Creates or updates a technical skill.
 * Strictly uses the authenticated admin session (RLS applies). Never uses the service role key.
 */
export async function saveSkill(input: SkillInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const parseResult = skillSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Validation failed";
      return { success: false, error: firstError };
    }

    const data = parseResult.data;
    const payload = {
      name: data.name,
      category: data.category,
      proficiency: data.proficiency || null,
      is_published: data.is_published,
      sort_order: data.sort_order,
    };

    let skillId = data.id;

    if (data.id) {
      const { error } = await supabase
        .from("skills")
        .update(payload)
        .eq("id", data.id);

      if (error) {
        if (error.code === "23505") {
          return { success: false, error: "A skill with this name already exists." };
        }
        return { success: false, error: error.message };
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("skills")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          return { success: false, error: "A skill with this name already exists." };
        }
        return { success: false, error: error.message };
      }
      skillId = inserted.id;
    }

    await revalidateSkills();
    return {
      success: true,
      data: { id: skillId! },
      message: `Skill "${data.name}" saved successfully.`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Deletes a skill.
 */
export async function deleteSkill(skillId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("skills")
      .delete()
      .eq("id", skillId);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidateSkills();
    return { success: true, message: "Skill removed successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Toggles a skill's published status.
 */
export async function toggleSkillPublish(
  skillId: string,
  isPublished: boolean
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("skills")
      .update({ is_published: isPublished })
      .eq("id", skillId);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidateSkills();
    return { success: true, message: `Skill ${isPublished ? "published" : "hidden"}.` };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Updates batch sort order for skills.
 */
export async function updateSkillsOrder(
  orderedItems: Array<{ id: string; sort_order: number }>
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    for (const item of orderedItems) {
      await supabase
        .from("skills")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id);
    }

    await revalidateSkills();
    return { success: true, message: "Skills reordered successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

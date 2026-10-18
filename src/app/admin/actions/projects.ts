"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { projectSchema, type ProjectInput } from "@/lib/validations/admin";
import { revalidateProject } from "@/lib/revalidate";
import { validateImageBuffer } from "@/lib/file-validation";
import type { ActionResult } from "./settings";

/**
 * Creates or updates a project.
 * Handles the partial unique index on is_featured (at most one project featured).
 * Strictly uses the authenticated admin session (RLS applies). Never uses the service role key.
 */
export async function saveProject(input: ProjectInput): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const parseResult = projectSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstErrorMessage = parseResult.error.issues[0]?.message || "Validation failed";
      return { success: false, error: firstErrorMessage, fieldErrors };
    }

    const data = parseResult.data;

    // If this project is marked as featured, unset featured on all other projects
    if (data.is_featured) {
      const query = supabase.from("projects").update({ is_featured: false }).eq("is_featured", true);
      if (data.id) {
        query.neq("id", data.id);
      }
      const { error: unfeatureError } = await query;
      if (unfeatureError) {
        console.error("[PROJECTS ACTION] Error resetting featured flags:", unfeatureError.message);
      }
    }

    const payload = {
      title: data.title,
      slug: data.slug,
      tagline: data.tagline || null,
      description: data.description,
      long_description: data.long_description || null,
      content: data.content || null,
      team: data.team || null,
      demo_url: data.demo_url || null,
      github_url: data.github_url || null,
      image_url: data.image_url || null,
      technologies: data.technologies,
      status: data.status,
      is_featured: data.is_featured,
      is_published: data.is_published,
      sort_order: data.sort_order,
    };

    let resultId = data.id;

    if (data.id) {
      // Update existing project
      const { error: updateError } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", data.id);

      if (updateError) {
        if (updateError.code === "23505") {
          return { success: false, error: "A project with this slug already exists. Please choose a unique slug." };
        }
        return { success: false, error: updateError.message };
      }
    } else {
      // Insert new project
      const { data: inserted, error: insertError } = await supabase
        .from("projects")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return { success: false, error: "A project with this slug already exists. Please choose a unique slug." };
        }
        return { success: false, error: insertError.message };
      }
      resultId = inserted.id;
    }

    // Revalidate public pages
    await revalidateProject(data.slug);

    return {
      success: true,
      data: { id: resultId!, slug: data.slug },
      message: `Project "${data.title}" saved successfully.`,
    };
  } catch (err) {
    console.error("[PROJECTS SAVE EXCEPTION]:", err);
    return { success: false, error: (err as Error).message || "An unexpected error occurred" };
  }
}

/**
 * Toggles the published status of a project.
 */
export async function toggleProjectPublish(
  projectId: string,
  isPublished: boolean,
  slug?: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("projects")
      .update({ is_published: isPublished })
      .eq("id", projectId);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidateProject(slug);
    return { success: true, message: `Project ${isPublished ? "published" : "moved to draft"}.` };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Deletes a project with slug confirmation.
 */
export async function deleteProject(
  projectId: string,
  slug: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidateProject(slug);
    return { success: true, message: "Project deleted successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Uploads a project screenshot to the 'project-images' bucket.
 * Validates file signature (PNG, JPG, WEBP, GIF), max size (4 MB), and generates an unguessable UUID filename.
 */
export async function uploadProjectImage(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No image file provided." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate size (max 4 MB) and authentic image signature
    const validation = validateImageBuffer(buffer, file.size);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "Invalid image file provided.",
      };
    }

    const filename = validation.storageFileName!;

    // Upload to storage bucket using user's RLS session
    const { error: uploadError } = await supabase.storage
      .from("project-images")
      .upload(filename, buffer, {
        contentType: validation.mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[STORAGE UPLOAD ERROR]:", uploadError.message);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("project-images")
      .getPublicUrl(filename);

    return {
      success: true,
      data: { url: publicUrlData.publicUrl },
      message: "Image uploaded successfully.",
    };
  } catch (err) {
    console.error("[STORAGE EXCEPTION]:", err);
    return { success: false, error: (err as Error).message || "Upload failed." };
  }
}

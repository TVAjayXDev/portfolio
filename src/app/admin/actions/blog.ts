"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { postSchema, calculateReadTimeMinutes, type PostInput } from "@/lib/validations/admin";
import { revalidatePost } from "@/lib/revalidate";
import { validateImageBuffer } from "@/lib/file-validation";
import type { ActionResult } from "./settings";

/**
 * Creates or updates a blog post.
 * Calculates reading_time_minutes dynamically from word count (ceil(words / 200)).
 * Sets published_at timestamp on initial publish.
 * Strictly uses the authenticated admin session (RLS enforced). Never uses service-role key.
 */
export async function savePost(
  input: PostInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const parseResult = postSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstErrorMessage =
        parseResult.error.issues[0]?.message || "Validation failed";
      return { success: false, error: firstErrorMessage, fieldErrors };
    }

    const data = parseResult.data;

    // Dynamically calculate reading time in minutes based on word count
    const readingTimeMinutes = calculateReadTimeMinutes(data.content || "");

    let publishedAt: string | null = null;

    if (data.id) {
      // Existing post: preserve or set published_at
      const { data: existing } = await supabase
        .from("posts")
        .select("published_at, is_published")
        .eq("id", data.id)
        .single();

      if (data.is_published) {
        publishedAt = existing?.published_at || new Date().toISOString();
      } else {
        publishedAt = existing?.published_at || null;
      }
    } else {
      // New post: set published_at if published immediately
      if (data.is_published) {
        publishedAt = new Date().toISOString();
      }
    }

    const payload = {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || "",
      content: data.content || "",
      cover_image_url: data.cover_image_url || null,
      reading_time_minutes: readingTimeMinutes,
      tags: data.tags,
      is_published: data.is_published,
      published_at: publishedAt,
      sort_order: data.sort_order,
    };

    let resultId = data.id;

    if (data.id) {
      const { error: updateError } = await supabase
        .from("posts")
        .update(payload)
        .eq("id", data.id);

      if (updateError) {
        if (updateError.code === "23505") {
          return {
            success: false,
            error: "A post with this slug already exists. Please choose a unique slug.",
          };
        }
        return { success: false, error: updateError.message };
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("posts")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return {
            success: false,
            error: "A post with this slug already exists. Please choose a unique slug.",
          };
        }
        return { success: false, error: insertError.message };
      }
      resultId = inserted.id;
    }

    await revalidatePost(data.slug);

    return {
      success: true,
      data: { id: resultId!, slug: data.slug },
      message: `Post "${data.title}" saved successfully.`,
    };
  } catch (err) {
    console.error("[BLOG SAVE EXCEPTION]:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred",
    };
  }
}

/**
 * Toggles the published status of a blog post.
 * Sets published_at timestamp when publishing for the first time.
 */
export async function togglePostPublish(
  id: string,
  isPublished: boolean,
  slug?: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const updatePayload: { is_published: boolean; published_at?: string } = {
      is_published: isPublished,
    };

    if (isPublished) {
      const { data: existing } = await supabase
        .from("posts")
        .select("published_at")
        .eq("id", id)
        .single();

      if (!existing?.published_at) {
        updatePayload.published_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from("posts")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidatePost(slug);
    return {
      success: true,
      message: `Post ${isPublished ? "published" : "moved to draft"}.`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Deletes a post.
 */
export async function deletePost(
  id: string,
  slug?: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidatePost(slug);
    return { success: true, message: "Post deleted successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Uploads a blog post cover to the 'post-covers' storage bucket.
 * Validates file signature (PNG, JPG, WEBP, GIF), max size (4 MB), and generates an unguessable UUID filename.
 * Uses the user's RLS session. Never uses service-role key.
 */
export async function uploadPostCover(
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

    // Upload to post-covers bucket using user's RLS session
    const { error: uploadError } = await supabase.storage
      .from("post-covers")
      .upload(filename, buffer, {
        contentType: validation.mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[POST COVER STORAGE ERROR]:", uploadError.message);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("post-covers")
      .getPublicUrl(filename);

    return {
      success: true,
      data: { url: publicUrlData.publicUrl },
      message: "Cover image uploaded successfully.",
    };
  } catch (err) {
    console.error("[STORAGE EXCEPTION]:", err);
    return {
      success: false,
      error: (err as Error).message || "Upload failed.",
    };
  }
}

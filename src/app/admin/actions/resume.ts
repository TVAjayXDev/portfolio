"use server";

import { requireAdmin } from "@/lib/auth/admin";
import {
  detectFileSignature,
  extractStoragePath,
  sanitizeStoragePath,
  MAX_RESUME_SIZE,
} from "@/lib/file-validation";
import { randomUUID } from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import type { ActionResult } from "./settings";

/**
 * Step 1: Generates a signed upload URL for direct-to-storage upload.
 * Bypasses Vercel's ~4.5 MB serverless body cap and Next.js 1 MB Server Action limit.
 * Enforces requireAdmin (AAL2).
 */
export async function getResumeUploadUrl(): Promise<
  ActionResult<{ path: string; signedUrl: string; token: string }>
> {
  try {
    const { supabase } = await requireAdmin();

    const path = `${randomUUID()}.pdf`;
    const { data, error } = await supabase.storage
      .from("resume")
      .createSignedUploadUrl(path);

    if (error || !data) {
      return {
        success: false,
        error: `Failed to create signed upload URL: ${error?.message || "Unknown error"}`,
      };
    }

    return {
      success: true,
      data: {
        path,
        signedUrl: data.signedUrl,
        token: data.token,
      },
    };
  } catch (err) {
    console.error("[GET RESUME UPLOAD URL ERROR]:", err);
    return {
      success: false,
      error: (err as Error).message || "Unauthorized or failed to create upload URL.",
    };
  }
}

/**
 * Step 2: Finalizes the resume upload after direct browser upload to storage.
 * 1. Validates path against directory traversal.
 * 2. Checks object size in storage (caps at 5 MB).
 * 3. Reads object bytes to inspect authentic %PDF- signature (rejects spoofed payloads).
 * 4. Deletes object immediately and returns an error if invalid.
 * 5. Sets object contentType strictly from detected signature ('application/pdf'), never from client.
 * 6. Atomically updates site_settings in database. If DB update fails, deletes newly uploaded object.
 * 7. On success, cleans up old resume storage object and revalidates cache.
 */
export async function finalizeResumeUpload(
  rawPath: string
): Promise<ActionResult<{ url: string; updatedAt: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const path = sanitizeStoragePath(rawPath);
    if (!path) {
      return { success: false, error: "Invalid storage path provided." };
    }

    // 1. Inspect object metadata and size in Supabase Storage
    const { data: infoData, error: infoError } = await supabase.storage
      .from("resume")
      .info(path);

    if (infoError || !infoData) {
      return {
        success: false,
        error: `Uploaded object not found in storage: ${infoError?.message || "Not found"}`,
      };
    }

    if (infoData.size > MAX_RESUME_SIZE) {
      // Cleanup oversize file immediately
      await supabase.storage.from("resume").remove([path]);
      return {
        success: false,
        error: `Resume file exceeds maximum allowed size of 5 MB (actual: ${(
          infoData.size /
          (1024 * 1024)
        ).toFixed(2)} MB). Object removed from storage.`,
      };
    }

    // 2. Read object bytes from storage to verify real file signature
    const { data: blob, error: downloadError } = await supabase.storage
      .from("resume")
      .download(path);

    if (downloadError || !blob) {
      await supabase.storage.from("resume").remove([path]);
      return {
        success: false,
        error: `Failed to read uploaded object: ${downloadError?.message || "Empty download"}`,
      };
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const detectedType = detectFileSignature(buffer);
    if (detectedType !== "pdf") {
      // Delete spoofed object immediately
      await supabase.storage.from("resume").remove([path]);
      return {
        success: false,
        error: "Invalid file signature. Resume must be an authentic PDF document with %PDF- header. Spoofed object removed from storage.",
      };
    }

    // 3. Set contentType strictly from detected signature, never from client
    await supabase.storage.from("resume").update(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    // 4. Retrieve old resume path to clean up later on DB success
    const { data: currentSettings } = await supabase
      .from("site_settings")
      .select("resume_url")
      .eq("id", 1)
      .single();

    const oldUrl = currentSettings?.resume_url;
    const oldPath = extractStoragePath(oldUrl, "resume");

    // 5. Get public URL for newly uploaded object
    const { data: urlData } = supabase.storage
      .from("resume")
      .getPublicUrl(path);

    const newPublicUrl = urlData.publicUrl;
    const nowIso = new Date().toISOString();

    // 6. Update database record
    const { error: updateError } = await supabase
      .from("site_settings")
      .update({
        resume_url: newPublicUrl,
        resume_updated_at: nowIso,
      })
      .eq("id", 1);

    if (updateError) {
      // Database failure: cleanup newly uploaded object to leave state untouched
      await supabase.storage.from("resume").remove([path]);
      return {
        success: false,
        error: `Database update failed: ${updateError.message}. Uploaded file was removed to preserve previous state.`,
      };
    }

    // 7. Success: remove previous resume file if different
    if (oldPath && oldPath !== path) {
      try {
        await supabase.storage.from("resume").remove([oldPath]);
      } catch (err) {
        console.warn("[RESUME CLEANUP WARNING]: Failed to remove old object", err);
      }
    }

    // 8. Revalidate cache
    try {
      revalidatePath("/");
      revalidatePath("/admin/resume");
      revalidateTag("site-settings");
    } catch (err) {
      console.warn("[REVALIDATION WARNING]:", err);
    }

    return {
      success: true,
      message: "Resume updated, verified, and published successfully.",
      data: { url: newPublicUrl, updatedAt: nowIso },
    };
  } catch (err) {
    console.error("[FINALIZE RESUME UPLOAD EXCEPTION]:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred during resume finalization.",
    };
  }
}

/**
 * Removes the current resume.
 * 1. Sets site_settings.resume_url and resume_updated_at to null.
 * 2. Deletes the resume object from the 'resume' storage bucket.
 * 3. Revalidates public pages so download buttons disappear immediately.
 */
export async function removeResume(): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { data: currentSettings } = await supabase
      .from("site_settings")
      .select("resume_url")
      .eq("id", 1)
      .single();

    const oldUrl = currentSettings?.resume_url;
    const oldPath = extractStoragePath(oldUrl, "resume");

    // Update database first
    const { error: updateError } = await supabase
      .from("site_settings")
      .update({
        resume_url: null,
        resume_updated_at: null,
      })
      .eq("id", 1);

    if (updateError) {
      return {
        success: false,
        error: `Failed to remove resume from settings: ${updateError.message}`,
      };
    }

    // Delete object from storage
    if (oldPath) {
      try {
        await supabase.storage.from("resume").remove([oldPath]);
      } catch (err) {
        console.warn("[RESUME DELETE WARNING]: Failed to remove storage object", err);
      }
    }

    // Revalidate public and admin pages
    try {
      revalidatePath("/");
      revalidatePath("/admin/resume");
      revalidateTag("site-settings");
    } catch (err) {
      console.warn("[REVALIDATION WARNING]:", err);
    }

    return {
      success: true,
      message: "Resume removed successfully. Public download links have been disabled.",
    };
  } catch (err) {
    console.error("[RESUME REMOVAL EXCEPTION]:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred during resume removal.",
    };
  }
}

export interface UnusedStorageFile {
  name: string;
  size?: number;
  createdAt?: string;
}

/**
 * Lists bucket objects in 'resume' that are not referenced by site_settings.resume_url.
 */
export async function getUnusedResumeFiles(): Promise<
  ActionResult<{ unusedCount: number; files: UnusedStorageFile[] }>
> {
  try {
    const { supabase } = await requireAdmin();

    const { data: currentSettings } = await supabase
      .from("site_settings")
      .select("resume_url")
      .eq("id", 1)
      .single();

    const activePath = extractStoragePath(currentSettings?.resume_url, "resume");

    const { data: objects, error: listError } = await supabase.storage
      .from("resume")
      .list();

    if (listError) {
      return { success: false, error: `Failed to list storage objects: ${listError.message}` };
    }

    const unused = (
      objects as Array<{ name: string; metadata?: { size?: number }; created_at?: string }> | null || []
    ).filter(
      (obj) => obj.name && obj.name !== activePath && obj.name !== ".emptyFolderPlaceholder"
    );

    return {
      success: true,
      data: {
        unusedCount: unused.length,
        files: unused.map((u) => ({
          name: u.name,
          size: u.metadata?.size,
          createdAt: u.created_at,
        })),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || "Failed to scan for unused files.",
    };
  }
}

/**
 * Deletes all unreferenced files in 'resume' bucket after admin confirmation.
 */
export async function deleteUnusedResumeFiles(): Promise<
  ActionResult<{ deletedCount: number; deletedFiles: string[] }>
> {
  try {
    const { supabase } = await requireAdmin();

    const { data: currentSettings } = await supabase
      .from("site_settings")
      .select("resume_url")
      .eq("id", 1)
      .single();

    const activePath = extractStoragePath(currentSettings?.resume_url, "resume");

    const { data: objects, error: listError } = await supabase.storage
      .from("resume")
      .list();

    if (listError) {
      return { success: false, error: `Failed to list storage objects: ${listError.message}` };
    }

    const unusedNames = (
      objects as Array<{ name: string; metadata?: { size?: number }; created_at?: string }> | null || []
    )
      .filter((obj) => obj.name && obj.name !== activePath && obj.name !== ".emptyFolderPlaceholder")
      .map((obj) => obj.name);

    if (unusedNames.length === 0) {
      return {
        success: true,
        message: "No unused files found to remove. Storage is clean.",
        data: { deletedCount: 0, deletedFiles: [] },
      };
    }

    const { error: removeError } = await supabase.storage
      .from("resume")
      .remove(unusedNames);

    if (removeError) {
      return { success: false, error: `Failed to remove unused files: ${removeError.message}` };
    }

    try {
      revalidatePath("/admin/resume");
    } catch {
      // safe ignore
    }

    return {
      success: true,
      message: `Successfully removed ${unusedNames.length} unused file(s) from resume storage.`,
      data: { deletedCount: unusedNames.length, deletedFiles: unusedNames },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || "Failed to delete unused resume files.",
    };
  }
}


"use server";

import { requireAdmin } from "@/lib/auth/admin";
import {
  certificationSchema,
  type CertificationInput,
} from "@/lib/validations/admin";
import {
  detectFileSignature,
  validateCertificateBuffer,
  validateThumbnailBuffer,
  extractStoragePath,
  sanitizeStoragePath,
  MAX_CERTIFICATE_SIZE,
  MAX_THUMBNAIL_SIZE,
} from "@/lib/file-validation";
import { randomUUID } from "crypto";
import { revalidateCertifications } from "@/lib/revalidate";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./settings";

/**
 * Step 1: Generates a signed upload URL for direct-to-storage upload.
 * Bypasses Vercel request body limits (~4.5 MB) and Next.js 1 MB Server Action limits.
 * Enforces requireAdmin (AAL2).
 */
export async function getCertificateUploadUrl(
  category: "document" | "thumbnail"
): Promise<
  ActionResult<{ path: string; signedUrl: string; token: string; category: string }>
> {
  try {
    const { supabase } = await requireAdmin();

    const ext = category === "thumbnail" ? "png" : "pdf";
    const path =
      category === "thumbnail"
        ? `thumbs/${randomUUID()}.${ext}`
        : `${randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("certificates")
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
        category,
      },
    };
  } catch (err) {
    console.error("[GET CERTIFICATE UPLOAD URL ERROR]:", err);
    return {
      success: false,
      error: (err as Error).message || "Unauthorized or failed to create upload URL.",
    };
  }
}

/**
 * Step 2: Finalizes the certificate upload after direct browser upload to storage.
 * 1. Validates storage path against traversal.
 * 2. Checks object size in storage (caps at 10 MB for documents, 2 MB for thumbnails).
 * 3. Reads object bytes to inspect authentic signature (rejects SVG, HTML, scripts, spoofing).
 * 4. Deletes object immediately and returns an error if invalid.
 * 5. Sets object contentType strictly from detected signature, never from client.
 * 6. If certId and field are provided, atomically updates DB (with cleanup-on-failure).
 * 7. On success, removes replaced storage object and revalidates cache.
 */
export async function finalizeCertificateUpload(params: {
  path: string;
  category: "document" | "thumbnail";
  certId?: string;
  field?: "certificate_file_url" | "thumbnail_url";
  oldUrl?: string | null;
}): Promise<ActionResult<{ url: string; fileType: string; path: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const path = sanitizeStoragePath(params.path);
    if (!path) {
      return { success: false, error: "Invalid storage path provided." };
    }

    const { category, certId, field, oldUrl } = params;

    // 1. Inspect object metadata and size in Supabase Storage
    const { data: infoData, error: infoError } = await supabase.storage
      .from("certificates")
      .info(path);

    if (infoError || !infoData) {
      return {
        success: false,
        error: `Uploaded object not found in storage: ${infoError?.message || "Not found"}`,
      };
    }

    const maxSize = category === "thumbnail" ? MAX_THUMBNAIL_SIZE : MAX_CERTIFICATE_SIZE;
    const maxMb = category === "thumbnail" ? 2 : 10;

    if (infoData.size > maxSize) {
      await supabase.storage.from("certificates").remove([path]);
      return {
        success: false,
        error: `File exceeds maximum allowed size of ${maxMb} MB (actual: ${(
          infoData.size /
          (1024 * 1024)
        ).toFixed(2)} MB). Object removed from storage.`,
      };
    }

    // 2. Read object bytes from storage to verify real file signature
    const { data: blob, error: downloadError } = await supabase.storage
      .from("certificates")
      .download(path);

    if (downloadError || !blob) {
      await supabase.storage.from("certificates").remove([path]);
      return {
        success: false,
        error: `Failed to read uploaded object: ${downloadError?.message || "Empty download"}`,
      };
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedType = detectFileSignature(buffer);

    if (category === "thumbnail") {
      if (!detectedType || !["png", "jpeg", "webp"].includes(detectedType)) {
        await supabase.storage.from("certificates").remove([path]);
        return {
          success: false,
          error:
            "Invalid thumbnail format. Thumbnails must be authentic PNG, JPG, or WEBP images. Invalid object removed.",
        };
      }
    } else {
      if (!detectedType || !["pdf", "png", "jpeg", "webp"].includes(detectedType)) {
        await supabase.storage.from("certificates").remove([path]);
        return {
          success: false,
          error:
            "Invalid certificate format. Allowed types are authentic PDF, PNG, JPG, or WEBP. Invalid object removed.",
        };
      }
    }

    // 3. Set contentType strictly from detected signature, never from client
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      png: "image/png",
      jpeg: "image/jpeg",
      webp: "image/webp",
    };
    const detectedMime = mimeMap[detectedType] || "application/octet-stream";

    await supabase.storage.from("certificates").update(path, buffer, {
      contentType: detectedMime,
      upsert: true,
    });

    // 4. Get public URL for new object
    const { data: urlData } = supabase.storage
      .from("certificates")
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    // 5. Atomically update database if certId & field provided
    if (certId && field) {
      const { data: existingCert } = await supabase
        .from("certifications")
        .select(field)
        .eq("id", certId)
        .single();

      const existingUrl = existingCert?.[field];
      const previousPath = extractStoragePath(existingUrl, "certificates");

      const { error: updateError } = await supabase
        .from("certifications")
        .update({ [field]: publicUrl })
        .eq("id", certId);

      if (updateError) {
        await supabase.storage.from("certificates").remove([path]);
        return {
          success: false,
          error: `Database update failed: ${updateError.message}. Uploaded file removed to preserve state.`,
        };
      }

      if (previousPath && previousPath !== path) {
        try {
          await supabase.storage.from("certificates").remove([previousPath]);
        } catch (cleanErr) {
          console.warn("[CERT CLEANUP WARNING]: Failed to remove old object", cleanErr);
        }
      }

      await revalidateCertifications();
    } else if (oldUrl) {
      const previousPath = extractStoragePath(oldUrl, "certificates");
      if (previousPath && previousPath !== path) {
        try {
          await supabase.storage.from("certificates").remove([previousPath]);
        } catch (cleanErr) {
          console.warn("[CERT DRAFT CLEANUP WARNING]: Failed to remove replaced file", cleanErr);
        }
      }
    }

    return {
      success: true,
      message: `${
        category === "thumbnail" ? "Thumbnail" : "Certificate file"
      } uploaded, verified, and saved successfully.`,
      data: {
        url: publicUrl,
        fileType: detectedType,
        path,
      },
    };
  } catch (err) {
    console.error("[FINALIZE CERTIFICATE UPLOAD EXCEPTION]:", err);
    return {
      success: false,
      error:
        (err as Error).message ||
        "An unexpected error occurred during certificate finalization.",
    };
  }
}

/**
 * Direct file upload fallback (kept for compatibility with small payload forms).
 */
export async function uploadCertificateFile(
  formData: FormData
): Promise<ActionResult<{ url: string; fileType: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { success: false, error: "Please select a valid certificate file." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = validateCertificateBuffer(buffer, file.size);
    if (!validation.valid || !validation.storageFileName) {
      return {
        success: false,
        error: validation.error || "Certificate validation failed.",
      };
    }

    const storagePath = validation.storageFileName;

    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(storagePath, buffer, {
        contentType: validation.mimeType || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Failed to upload certificate file: ${uploadError.message}`,
      };
    }

    const { data: urlData } = supabase.storage
      .from("certificates")
      .getPublicUrl(storagePath);

    return {
      success: true,
      data: {
        url: urlData.publicUrl,
        fileType: validation.detectedType || "pdf",
      },
      message: "Certificate file uploaded successfully.",
    };
  } catch (err) {
    console.error("[CERTIFICATE FILE UPLOAD EXCEPTION]:", err);
    return {
      success: false,
      error:
        (err as Error).message ||
        "An unexpected error occurred during certificate upload.",
    };
  }
}

/**
 * Direct thumbnail upload fallback (kept for compatibility with small payload forms).
 */
export async function uploadCertificateThumbnail(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { success: false, error: "Please select a valid thumbnail image." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = validateThumbnailBuffer(buffer, file.size);
    if (!validation.valid || !validation.storageFileName) {
      return {
        success: false,
        error: validation.error || "Thumbnail validation failed.",
      };
    }

    const storagePath = `thumbs/${validation.storageFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(storagePath, buffer, {
        contentType: validation.mimeType || "image/png",
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Failed to upload thumbnail: ${uploadError.message}`,
      };
    }

    const { data: urlData } = supabase.storage
      .from("certificates")
      .getPublicUrl(storagePath);

    return {
      success: true,
      data: { url: urlData.publicUrl },
      message: "Certificate thumbnail uploaded successfully.",
    };
  } catch (err) {
    console.error("[CERTIFICATE THUMBNAIL UPLOAD EXCEPTION]:", err);
    return {
      success: false,
      error:
        (err as Error).message ||
        "An unexpected error occurred during thumbnail upload.",
    };
  }
}

/**
 * Creates or updates a certification entry.
 * When replacing files on an existing certificate, removes old objects from
 * storage after the database update succeeds.
 */
export async function saveCertification(
  input: CertificationInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const parseResult = certificationSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstErrorMessage =
        parseResult.error.issues[0]?.message || "Validation failed";
      return { success: false, error: firstErrorMessage, fieldErrors };
    }

    const data = parseResult.data;

    const payload = {
      title: data.title,
      issuer: data.issuer,
      issue_date: data.issue_date,
      credential_id: data.credential_id || null,
      credential_url: data.credential_url || null,
      certificate_file_url: data.certificate_file_url || null,
      thumbnail_url: data.thumbnail_url || null,
      category: data.category,
      skills: data.skills,
      is_published: data.is_published,
      sort_order: data.sort_order,
    };

    let resultId = data.id;
    let oldFileUrl: string | null = null;
    let oldThumbUrl: string | null = null;

    if (data.id) {
      // Fetch existing record to check if file URLs changed
      const { data: existing } = await supabase
        .from("certifications")
        .select("certificate_file_url")
        .eq("id", data.id)
        .single();

      oldFileUrl = existing?.certificate_file_url || null;

      const { error: updateError } = await supabase
        .from("certifications")
        .update(payload)
        .eq("id", data.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Cleanup replaced files from storage after DB update succeeded
      const oldFilePath = extractStoragePath(oldFileUrl, "certificates");
      const newFilePath = extractStoragePath(payload.certificate_file_url, "certificates");
      if (oldFilePath && oldFilePath !== newFilePath) {
        try {
          await supabase.storage.from("certificates").remove([oldFilePath]);
        } catch (cleanErr) {
          console.warn("[CERT CLEANUP WARNING]: Failed to remove replaced file", cleanErr);
        }
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("certifications")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }
      resultId = inserted.id;
    }

    await revalidateCertifications();

    return {
      success: true,
      data: { id: resultId! },
      message: `Certification "${data.title}" saved successfully.`,
    };
  } catch (err) {
    console.error("[CERTIFICATIONS SAVE EXCEPTION]:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred",
    };
  }
}

/**
 * Toggles the published status of a certification.
 */
export async function toggleCertificationPublish(
  id: string,
  isPublished: boolean
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("certifications")
      .update({ is_published: isPublished })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    await revalidateCertifications();
    return {
      success: true,
      message: `Certification ${isPublished ? "published" : "moved to draft"}.`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Deletes a certification and removes any associated storage files
 * after the database deletion succeeds.
 */
export async function deleteCertification(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { data: cert } = await supabase
      .from("certifications")
      .select("certificate_file_url, thumbnail_url")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("certifications")
      .delete()
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    const filePath = extractStoragePath(cert?.certificate_file_url, "certificates");
    const thumbPath = extractStoragePath(cert?.thumbnail_url, "certificates");
    const pathsToRemove: string[] = [];
    if (filePath) pathsToRemove.push(filePath);
    if (thumbPath) pathsToRemove.push(thumbPath);

    if (pathsToRemove.length > 0) {
      try {
        await supabase.storage.from("certificates").remove(pathsToRemove);
      } catch (cleanErr) {
        console.warn("[CERT DELETE CLEANUP WARNING]:", cleanErr);
      }
    }

    await revalidateCertifications();
    return { success: true, message: "Certification deleted successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Updates sort order for certifications.
 */
export async function updateCertificationsOrder(
  items: { id: string; sort_order: number }[]
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    for (const item of items) {
      const { error } = await supabase
        .from("certifications")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    await revalidateCertifications();
    return { success: true, message: "Certifications order updated successfully." };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export interface UnusedCertificateFile {
  name: string;
  size?: number;
  createdAt?: string;
}

/**
 * Lists bucket objects in 'certificates' (both root files and 'thumbs/' subfolder)
 * that are not referenced in the database.
 */
export async function getUnusedCertificateFiles(): Promise<
  ActionResult<{ unusedCount: number; files: UnusedCertificateFile[] }>
> {
  try {
    const { supabase } = await requireAdmin();

    const { data: certs } = await supabase
      .from("certifications")
      .select("certificate_file_url, thumbnail_url");

    const activePaths = new Set<string>();
    (certs as Array<{ certificate_file_url?: string | null; thumbnail_url?: string | null }> | null)?.forEach((c) => {
      const p1 = extractStoragePath(c.certificate_file_url, "certificates");
      if (p1) activePaths.add(p1);
      const p2 = extractStoragePath(c.thumbnail_url, "certificates");
      if (p2) activePaths.add(p2);
    });

    // List root objects
    const { data: rootObjs, error: rootErr } = await supabase.storage
      .from("certificates")
      .list();

    if (rootErr) {
      return { success: false, error: `Failed to list certificates: ${rootErr.message}` };
    }

    // List thumbs folder
    const { data: thumbObjs, error: thumbErr } = await supabase.storage
      .from("certificates")
      .list("thumbs");

    const unusedFiles: UnusedCertificateFile[] = [];

    // Root objects (excluding folder entries)
    (rootObjs as Array<{ name: string; metadata?: { size?: number }; created_at?: string }> | null || []).forEach(
      (obj) => {
        if (obj.name && obj.name !== "thumbs" && obj.name !== ".emptyFolderPlaceholder") {
          if (!activePaths.has(obj.name)) {
            unusedFiles.push({
              name: obj.name,
              size: obj.metadata?.size,
              createdAt: obj.created_at,
            });
          }
        }
      }
    );

    // Thumbnail objects
    (thumbObjs as Array<{ name: string; metadata?: { size?: number }; created_at?: string }> | null || []).forEach(
      (obj) => {
        if (obj.name && obj.name !== ".emptyFolderPlaceholder") {
          const fullPath = `thumbs/${obj.name}`;
          if (!activePaths.has(fullPath)) {
            unusedFiles.push({
              name: fullPath,
              size: obj.metadata?.size,
              createdAt: obj.created_at,
            });
          }
        }
      }
    );

    return {
      success: true,
      data: {
        unusedCount: unusedFiles.length,
        files: unusedFiles,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || "Failed to scan for unused certificate files.",
    };
  }
}

/**
 * Deletes all unreferenced files in 'certificates' bucket after admin confirmation.
 */
export async function deleteUnusedCertificateFiles(): Promise<
  ActionResult<{ deletedCount: number; deletedFiles: string[] }>
> {
  try {
    const { supabase } = await requireAdmin();

    const scanRes = await getUnusedCertificateFiles();
    if (!scanRes.success) {
      return { success: false, error: scanRes.error };
    }
    if (!scanRes.data) {
      return { success: false, error: "Failed to scan unused files: no data returned" };
    }

    const pathsToDelete = scanRes.data.files.map((f) => f.name);

    if (pathsToDelete.length === 0) {
      return {
        success: true,
        message: "No unused certificate files found. Storage is clean.",
        data: { deletedCount: 0, deletedFiles: [] },
      };
    }

    const { error: removeError } = await supabase.storage
      .from("certificates")
      .remove(pathsToDelete);

    if (removeError) {
      return { success: false, error: `Failed to remove unused files: ${removeError.message}` };
    }

    try {
      revalidatePath("/admin/certifications");
    } catch {
      // safe ignore
    }

    return {
      success: true,
      message: `Successfully removed ${pathsToDelete.length} unused file(s) from certificates storage.`,
      data: { deletedCount: pathsToDelete.length, deletedFiles: pathsToDelete },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || "Failed to delete unused certificate files.",
    };
  }
}


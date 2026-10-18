import { randomUUID } from "crypto";

export type DetectedFileType = "pdf" | "png" | "jpeg" | "webp";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: DetectedFileType;
  mimeType?: string;
  extension?: string;
  storageFileName?: string;
}

export const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2 MB
export const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB (Strict Server Action limit)

const MIME_MAP: Record<DetectedFileType, { mime: string; ext: string }> = {
  pdf: { mime: "application/pdf", ext: "pdf" },
  png: { mime: "image/png", ext: "png" },
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  webp: { mime: "image/webp", ext: "webp" },
};

/**
 * Inspects raw bytes to detect authentic file signature (magic numbers).
 * Strictly rejects SVG, HTML, scripts, and unknown binary payloads.
 */
export function detectFileSignature(buffer: Uint8Array | Buffer): DetectedFileType | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // Reject SVG / XML / HTML payloads disguised as other extensions
  try {
    const headerSlice = Buffer.from(buffer.slice(0, Math.min(buffer.length, 256)))
      .toString("utf8")
      .toLowerCase();

    if (
      headerSlice.includes("<svg") ||
      headerSlice.includes("<?xml") ||
      headerSlice.includes("<!doctype svg") ||
      headerSlice.includes("<html") ||
      headerSlice.includes("<script")
    ) {
      return null;
    }
  } catch {
    // Binary string decode safe ignore
  }

  // 1. PDF: begins with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return "pdf";
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // 3. JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // 4. WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

/**
 * Validates a resume file (strictly PDF, max 5 MB).
 * Generates an opaque UUID filename, never using the original filename in the path.
 */
export function validateResumeBuffer(
  buffer: Uint8Array | Buffer,
  sizeBytes: number
): FileValidationResult {
  if (sizeBytes > MAX_RESUME_SIZE) {
    return {
      valid: false,
      error: `Resume file exceeds maximum allowed size of 5 MB (actual: ${(
        sizeBytes /
        (1024 * 1024)
      ).toFixed(2)} MB)`,
    };
  }

  const detected = detectFileSignature(buffer);
  if (detected !== "pdf") {
    return {
      valid: false,
      error: "Invalid file format. Resume must be a valid PDF document with authentic %PDF- signature.",
    };
  }

  const { mime, ext } = MIME_MAP[detected];
  const storageFileName = `${randomUUID()}.${ext}`;

  return {
    valid: true,
    detectedType: detected,
    mimeType: mime,
    extension: ext,
    storageFileName,
  };
}

/**
 * Validates a certificate file (PDF, PNG, JPG, WEBP, max 10 MB).
 * Strictly rejects SVG and unknown types.
 */
export function validateCertificateBuffer(
  buffer: Uint8Array | Buffer,
  sizeBytes: number
): FileValidationResult {
  if (sizeBytes > MAX_CERTIFICATE_SIZE) {
    return {
      valid: false,
      error: `Certificate file exceeds maximum allowed size of 10 MB (actual: ${(
        sizeBytes /
        (1024 * 1024)
      ).toFixed(2)} MB)`,
    };
  }

  const detected = detectFileSignature(buffer);
  const allowed: DetectedFileType[] = ["pdf", "png", "jpeg", "webp"];

  if (!detected || !allowed.includes(detected)) {
    return {
      valid: false,
      error: "Invalid certificate format. Allowed types are authentic PDF, PNG, JPG, or WEBP.",
    };
  }

  const { mime, ext } = MIME_MAP[detected];
  const storageFileName = `${randomUUID()}.${ext}`;

  return {
    valid: true,
    detectedType: detected,
    mimeType: mime,
    extension: ext,
    storageFileName,
  };
}

/**
 * Validates an optional thumbnail file (PNG, JPG, WEBP, max 2 MB).
 * PDF is not allowed as a thumbnail.
 */
export function validateThumbnailBuffer(
  buffer: Uint8Array | Buffer,
  sizeBytes: number
): FileValidationResult {
  if (sizeBytes > MAX_THUMBNAIL_SIZE) {
    return {
      valid: false,
      error: `Thumbnail file exceeds maximum allowed size of 2 MB (actual: ${(
        sizeBytes /
        (1024 * 1024)
      ).toFixed(2)} MB)`,
    };
  }

  const detected = detectFileSignature(buffer);
  const allowed: DetectedFileType[] = ["png", "jpeg", "webp"];

  if (!detected || !allowed.includes(detected)) {
    return {
      valid: false,
      error: "Invalid thumbnail format. Thumbnails must be authentic PNG, JPG, or WEBP images.",
    };
  }

  const { mime, ext } = MIME_MAP[detected];
  const storageFileName = `${randomUUID()}.${ext}`;

  return {
    valid: true,
    detectedType: detected,
    mimeType: mime,
    extension: ext,
    storageFileName,
  };
}

/**
 * Validates an image file for project images or blog post covers:
 * Max 4 MB (Vercel serverless / Server Action safe limit).
 * Validates authentic file signature (PNG, JPEG, WebP, GIF).
 * Strictly rejects SVG, HTML, and script payloads.
 */
export function validateImageBuffer(
  buffer: Uint8Array | Buffer,
  sizeBytes: number
): FileValidationResult {
  if (sizeBytes > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image exceeds maximum allowed size of 4 MB (actual: ${(
        sizeBytes /
        (1024 * 1024)
      ).toFixed(2)} MB)`,
    };
  }

  let detected = detectFileSignature(buffer);
  let mime = detected ? MIME_MAP[detected]?.mime : null;
  let ext = detected ? MIME_MAP[detected]?.ext : null;

  // Support GIF87a and GIF89a authentic signatures
  if (!detected && buffer && buffer.length >= 6) {
    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      detected = "png" as any; // allowed type
      mime = "image/gif";
      ext = "gif";
    }
  }

  if (!detected || detected === "pdf") {
    return {
      valid: false,
      error: "Invalid file format. Image must be an authentic PNG, JPG, WEBP, or GIF file.",
    };
  }

  const storageFileName = `${randomUUID()}.${ext}`;

  return {
    valid: true,
    detectedType: detected,
    mimeType: mime!,
    extension: ext!,
    storageFileName,
  };
}

/**
 * Extracts the storage object path from a Supabase storage URL or path.
 * Handles /public/, /sign/, /authenticated/, and arbitrary subdirectories (like thumbs/...).
 */
export function extractStoragePath(
  urlOrPath: string | null | undefined,
  bucket: string
): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  try {
    // If it's a full URL
    const parsed = new URL(trimmed);
    const pathname = decodeURIComponent(parsed.pathname);

    // Look for bucket segment patterns
    const patterns = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
      `/storage/v1/object/${bucket}/`,
      `/${bucket}/`,
    ];

    for (const pattern of patterns) {
      const idx = pathname.indexOf(pattern);
      if (idx !== -1) {
        const extracted = pathname.slice(idx + pattern.length);
        return extracted.length > 0 ? extracted : null;
      }
    }

    // Fallback: last segment
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    // If not a full URL, strip query string if any
    const clean = trimmed.split("?")[0];
    const prefix = `${bucket}/`;
    if (clean.startsWith(prefix)) {
      return clean.slice(prefix.length);
    }
    return clean;
  }
}

/**
 * Validates and sanitizes a storage path provided to finalize server actions.
 * Prevents directory traversal attacks (..) and ensures path follows UUID pattern.
 */
export function sanitizeStoragePath(path: string | null | undefined): string | null {
  if (!path) return null;
  const normalized = path.replace(/\\/g, "/").trim();
  if (normalized.includes("..") || normalized.startsWith("/")) {
    return null;
  }
  // Allow optional 'thumbs/' folder followed by UUID and optional extension
  const isValid = /^(thumbs\/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]+)?$/i.test(
    normalized
  );
  return isValid ? normalized : null;
}


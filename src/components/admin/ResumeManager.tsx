"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  getResumeUploadUrl,
  finalizeResumeUpload,
  removeResume,
  deleteUnusedResumeFiles,
} from "@/app/admin/actions/resume";

interface ResumeManagerProps {
  initialResumeUrl: string | null;
  initialResumeUpdatedAt: string | null;
}

export const ResumeManager: React.FC<ResumeManagerProps> = ({
  initialResumeUrl,
  initialResumeUpdatedAt,
}) => {
  const [resumeUrl, setResumeUrl] = useState<string | null>(initialResumeUrl);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialResumeUpdatedAt);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const friendlyDownloadUrl = resumeUrl
    ? resumeUrl.includes("download=")
      ? resumeUrl
      : `${resumeUrl}${resumeUrl.includes("?") ? "&" : "?"}download=T_V_Ajay_Resume.pdf`
    : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fast client-side pre-check
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: "File exceeds 5 MB limit. Please select a smaller PDF.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.type && file.type !== "application/pdf") {
      setFeedback({
        type: "error",
        message: "Only PDF files are supported. Please select an authentic .pdf document.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setFeedback(null);

    try {
      // 1. Get signed upload URL from server (requireAdmin checks AAL2)
      const urlRes = await getResumeUploadUrl();
      if (!urlRes.success) {
        throw new Error(urlRes.error || "Failed to initialize upload.");
      }
      if (!urlRes.data) {
        throw new Error("Missing upload configuration data from server.");
      }

      // 2. Upload file directly from browser to Supabase Storage (bypasses Vercel body limits)
      const uploadRes = await fetch(urlRes.data.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Direct storage upload failed with HTTP status ${uploadRes.status}`);
      }

      // 3. Finalize on server (validates magic bytes, enforces size, sets verified contentType, updates DB)
      const finalRes = await finalizeResumeUpload(urlRes.data.path);
      if (!finalRes.success) {
        throw new Error(finalRes.error || "Failed to verify or publish resume.");
      }
      if (!finalRes.data) {
        throw new Error("Missing response data after resume finalization.");
      }

      setResumeUrl(finalRes.data.url);
      setUpdatedAt(finalRes.data.updatedAt);
      setFeedback({
        type: "success",
        message: finalRes.message || "Resume updated and published successfully.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: (err as Error).message || "Failed to upload resume.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove the resume? Public download links will be disabled immediately.")) {
      return;
    }

    setIsRemoving(true);
    setFeedback(null);

    const res = await removeResume();
    setIsRemoving(false);

    if (res.success) {
      setResumeUrl(null);
      setUpdatedAt(null);
      setFeedback({
        type: "success",
        message: "Resume removed successfully. Public download links have been disabled.",
      });
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Failed to remove resume.",
      });
    }
  };

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-mono flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-error/10 border-error/30 text-error"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            type="button"
            className="hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf,.pdf"
        className="hidden"
      />

      {/* Current Resume Status Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-tint/10 border border-surface-tint/30 flex items-center justify-center text-surface-tint">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-on-surface">
                Official PDF Resume
              </h2>
              <p className="font-body text-xs text-on-surface-variant">
                Uploaded PDF document offered on the public site and command palette.
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full font-mono text-xs uppercase font-semibold border ${
              resumeUrl
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-surface-container text-outline border-outline-variant"
            }`}
          >
            {resumeUrl ? "Active & Published" : "Not Set"}
          </span>
        </div>

        {resumeUrl ? (
          <div className="flex flex-col gap-6">
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-surface-tint font-semibold">
                  T_V_Ajay_Resume.pdf
                </span>
                {formattedDate && (
                  <span className="font-mono text-[11px] text-outline flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Last updated: {formattedDate}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {friendlyDownloadUrl && (
                  <a
                    href={friendlyDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
                {resumeUrl && (
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isRemoving}
                className="px-5 py-2.5 rounded-xl bg-surface-tint text-black font-display font-semibold text-xs shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Replace Resume PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading || isRemoving}
                className="px-4 py-2 rounded-xl bg-error/10 border border-error/30 text-error hover:bg-error/20 font-display text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Resume</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-outline">
              <FileText className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h3 className="font-display text-base font-semibold text-on-surface">
                No Resume Published
              </h3>
              <p className="font-body text-xs text-on-surface-variant mt-1">
                Upload your official PDF resume (max 5 MB). Once published, the &quot;Download Resume&quot; button will automatically appear in your hero header, navigation, and command palette.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-2 px-6 py-2.5 rounded-xl bg-surface-tint text-black font-display font-semibold text-xs shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading PDF...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload PDF Resume</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Security & Validation Information */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex items-start gap-3">
        <CheckCircle2 className="w-4 h-4 text-surface-tint shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1 text-xs font-mono text-outline">
          <span className="text-on-surface font-medium">Server File Signature Verification</span>
          <p>
            The upload pipeline strictly validates authentic PDF magic numbers (<code className="text-surface-tint">%PDF-</code>) on the server, rejects SVG and HTML payloads, enforces a 5 MB ceiling, and stores files with opaque UUID identifiers.
          </p>
        </div>
      </div>

      {/* Storage Maintenance & Cleanup Card */}
      <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-display text-sm font-semibold text-on-surface flex items-center gap-2">
            Storage Hygiene & Maintenance
          </span>
          <p className="font-body text-xs text-on-surface-variant max-w-xl">
            Scan the resume storage bucket for orphaned or unreferenced PDF objects from aborted uploads and permanently purge them.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Scan and permanently remove unreferenced files from the resume storage bucket?")) return;
            setIsRemoving(true);
            const res = await deleteUnusedResumeFiles();
            setIsRemoving(false);
            if (res.success) {
              setFeedback({ type: "success", message: res.message || "Storage cleanup completed." });
            } else {
              setFeedback({ type: "error", message: res.error || "Failed to clean storage." });
            }
          }}
          disabled={isRemoving || isUploading}
          className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-mono text-xs flex items-center gap-2 shrink-0 transition-colors disabled:opacity-50"
        >
          {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          <span>Remove Unused Files</span>
        </button>
      </div>
    </div>
  );
};

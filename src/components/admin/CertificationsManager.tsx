"use client";

import React, { useState, useRef } from "react";
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  X,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Tag,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  saveCertification,
  deleteCertification,
  toggleCertificationPublish,
  updateCertificationsOrder,
  getCertificateUploadUrl,
  finalizeCertificateUpload,
  uploadCertificateFile,
  uploadCertificateThumbnail,
  deleteUnusedCertificateFiles,
} from "@/app/admin/actions/certifications";
import type { CertificationInput } from "@/lib/validations/admin";

export interface CertificationRecord extends CertificationInput {
  id: string;
}

interface CertificationsManagerProps {
  initialCertifications: CertificationRecord[];
}

const emptyCertification: CertificationInput = {
  title: "",
  issuer: "",
  issue_date: "",
  credential_id: "",
  credential_url: "",
  certificate_file_url: "",
  thumbnail_url: "",
  category: "General",
  skills: [],
  is_published: false,
  sort_order: 10,
};

export const CertificationsManager: React.FC<CertificationsManagerProps> = ({
  initialCertifications,
}) => {
  const [certifications, setCertifications] =
    useState<CertificationRecord[]>(initialCertifications);
  const [editingItem, setEditingItem] = useState<CertificationInput | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  // Upload states
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<CertificationRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast / Form message state
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const openNewItem = () => {
    const nextOrder = (certifications.length + 1) * 10;
    setEditingItem({ ...emptyCertification, sort_order: nextOrder });
    setIsNew(true);
    setNewSkill("");
    setFieldErrors({});
    setErrorMessage(null);
  };

  const openEditItem = (item: CertificationRecord) => {
    setEditingItem({ ...item });
    setIsNew(false);
    setNewSkill("");
    setFieldErrors({});
    setErrorMessage(null);
  };

  const handleAddSkill = () => {
    if (!newSkill.trim() || !editingItem) return;
    const tag = newSkill.trim();
    if (!editingItem.skills.includes(tag)) {
      setEditingItem({
        ...editingItem,
        skills: [...editingItem.skills, tag],
      });
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (tag: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      skills: editingItem.skills.filter((s) => s !== tag),
    });
  };

  const handleCertificateFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("Certificate file exceeds 10 MB limit.", true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingFile(true);

    try {
      // 1. Get signed upload URL from server
      const urlRes = await getCertificateUploadUrl("document");
      if (!urlRes.success) {
        throw new Error(urlRes.error || "Failed to initialize certificate upload.");
      }
      if (!urlRes.data) {
        throw new Error("Missing upload configuration data from server.");
      }

      // 2. Upload file directly from browser to Supabase Storage
      const uploadRes = await fetch(urlRes.data.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/pdf",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Direct upload failed with status ${uploadRes.status}`);
      }

      // 3. Finalize on server (verifies signature, enforces size, sets verified contentType)
      const finalRes = await finalizeCertificateUpload({
        path: urlRes.data.path,
        category: "document",
        certId: editingItem.id,
        field: "certificate_file_url",
        oldUrl: editingItem.certificate_file_url,
      });

      if (!finalRes.success) {
        throw new Error(finalRes.error || "Failed to verify certificate file.");
      }
      if (!finalRes.data) {
        throw new Error("Missing response data after certificate finalization.");
      }

      const isImage = ["png", "jpeg", "webp"].includes(finalRes.data.fileType);
      setEditingItem({
        ...editingItem,
        certificate_file_url: finalRes.data.url,
        // Auto-use image as thumbnail if none uploaded yet
        thumbnail_url:
          !editingItem.thumbnail_url && isImage
            ? finalRes.data.url
            : editingItem.thumbnail_url,
      });
      showToast("Certificate file uploaded and verified successfully.");
    } catch (err) {
      showToast((err as Error).message || "Failed to upload certificate file.", true);
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleThumbnailChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Thumbnail image exceeds 2 MB limit.", true);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
      return;
    }

    setIsUploadingThumb(true);

    try {
      // 1. Get signed upload URL from server
      const urlRes = await getCertificateUploadUrl("thumbnail");
      if (!urlRes.success) {
        throw new Error(urlRes.error || "Failed to initialize thumbnail upload.");
      }
      if (!urlRes.data) {
        throw new Error("Missing upload configuration data from server.");
      }

      // 2. Upload file directly from browser to Supabase Storage
      const uploadRes = await fetch(urlRes.data.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "image/png",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Direct upload failed with status ${uploadRes.status}`);
      }

      // 3. Finalize on server
      const finalRes = await finalizeCertificateUpload({
        path: urlRes.data.path,
        category: "thumbnail",
        certId: editingItem.id,
        field: "thumbnail_url",
        oldUrl: editingItem.thumbnail_url,
      });

      if (!finalRes.success) {
        throw new Error(finalRes.error || "Failed to verify thumbnail image.");
      }
      if (!finalRes.data) {
        throw new Error("Missing response data after thumbnail finalization.");
      }

      setEditingItem({
        ...editingItem,
        thumbnail_url: finalRes.data.url,
      });
      showToast("Thumbnail uploaded and verified successfully.");
    } catch (err) {
      showToast((err as Error).message || "Failed to upload thumbnail.", true);
    } finally {
      setIsUploadingThumb(false);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSaving(true);
    setFieldErrors({});
    setErrorMessage(null);

    const res = await saveCertification(editingItem);
    setSaving(false);

    if (res.success) {
      showToast(res.message || "Certification saved successfully.");
      const updatedList = isNew
        ? [
            ...certifications,
            { ...editingItem, id: res.data!.id } as CertificationRecord,
          ]
        : certifications.map((c) =>
            c.id === (editingItem as CertificationRecord).id
              ? ({ ...editingItem } as CertificationRecord)
              : c
          );

      setCertifications(
        updatedList.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      );
      setEditingItem(null);
    } else {
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
      }
      showToast(res.error || "Failed to save certification.", true);
    }
  };

  const handleTogglePublish = async (item: CertificationRecord) => {
    const newStatus = !item.is_published;
    const res = await toggleCertificationPublish(item.id, newStatus);
    if (res.success) {
      showToast(res.message || `Status updated to ${newStatus ? "published" : "draft"}.`);
      setCertifications((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_published: newStatus } : c))
      );
    } else {
      showToast(res.error || "Failed to toggle status.", true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    const res = await deleteCertification(deleteTarget.id);
    setDeleting(false);

    if (res.success) {
      showToast(res.message || "Certification deleted.");
      setCertifications((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      showToast(res.error || "Failed to delete certification.", true);
    }
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === certifications.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newItems = [...certifications];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    const reordered = newItems.map((item, idx) => ({
      ...item,
      sort_order: (idx + 1) * 10,
    }));

    setCertifications(reordered);

    const res = await updateCertificationsOrder(
      reordered.map((c) => ({ id: c.id, sort_order: c.sort_order }))
    );

    if (!res.success) {
      showToast(res.error || "Failed to persist new order.", true);
    } else {
      showToast("Order updated.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toast notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            type="button"
            className="text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-error text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            type="button"
            className="text-error hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-container-low border border-outline-variant">
        <div>
          <h2 className="font-display font-semibold text-lg text-on-surface">
            Certifications & Accreditations
          </h2>
          <p className="font-body text-xs text-on-surface-variant">
            Manage industry certifications, course diplomas, verification links, and PDF/image uploads.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={async () => {
              if (
                !confirm(
                  "Scan and permanently remove unreferenced files from the certificates storage bucket?"
                )
              )
                return;
              const res = await deleteUnusedCertificateFiles();
              if (res.success) {
                showToast(res.message || "Storage cleanup completed.");
              } else {
                showToast(res.error || "Failed to remove unused files.", true);
              }
            }}
            type="button"
            className="px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-mono text-xs flex items-center gap-1.5 transition-colors"
            title="Clean up orphaned files in certificates storage"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Unused Files</span>
          </button>

          <button
            onClick={openNewItem}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-surface-tint text-black font-display font-semibold text-xs shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Certification</span>
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="flex flex-col gap-3">
        {certifications.length === 0 ? (
          <div className="p-12 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-outline">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-display font-semibold text-sm text-on-surface">
              No certifications added yet
            </h3>
            <p className="font-body text-xs text-on-surface-variant max-w-sm">
              Add your verified professional certifications, cloud accreditations, or hackathon honors.
            </p>
          </div>
        ) : (
          certifications.map((item, index) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.is_published
                  ? "bg-surface-container-low border-outline-variant hover:border-outline"
                  : "bg-surface-container-low/70 border-dashed border-outline-variant"
              }`}
            >
              {/* Left Column: Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {item.thumbnail_url ? (
                  <div className="w-14 h-14 rounded-xl bg-surface-container border border-outline-variant overflow-hidden shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center text-surface-tint shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                )}

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-base text-on-surface truncate">
                      {item.title}
                    </h3>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                        item.is_published
                          ? "bg-surface-tint/20 text-surface-tint border-surface-tint/40 font-semibold"
                          : "bg-surface-container text-outline border-outline-variant"
                      }`}
                    >
                      {item.is_published ? "Published" : "Draft"}
                    </span>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-secondary-container/30 text-on-secondary-container border border-secondary/30">
                      {item.category}
                    </span>

                    {item.certificate_file_url && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        File Attached
                      </span>
                    )}
                  </div>

                  <p className="font-body text-xs font-semibold text-on-surface-variant">
                    {item.issuer}
                  </p>

                  <div className="flex items-center gap-3 text-xs font-mono text-outline mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-surface-tint" />
                      <span>{item.issue_date}</span>
                    </span>

                    {item.credential_id && (
                      <span>ID: {item.credential_id}</span>
                    )}

                    {item.credential_url && (
                      <a
                        href={item.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-surface-tint hover:underline"
                      >
                        <span>Verify Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {item.certificate_file_url && (
                      <a
                        href={item.certificate_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {item.skills && item.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-mono border border-outline-variant/60"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-outline-variant/60">
                {/* Reorder Buttons */}
                <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant">
                  <button
                    type="button"
                    onClick={() => moveOrder(index, "up")}
                    disabled={index === 0}
                    className="p-1 rounded-lg text-outline hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOrder(index, "down")}
                    disabled={index === certifications.length - 1}
                    className="p-1 rounded-lg text-outline hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Publish Toggle */}
                <button
                  type="button"
                  onClick={() => handleTogglePublish(item)}
                  className={`p-2 rounded-xl border transition-colors ${
                    item.is_published
                      ? "bg-surface-tint/10 border-surface-tint/40 text-surface-tint hover:bg-surface-tint/20"
                      : "bg-surface-container border-outline-variant text-outline hover:text-on-surface"
                  }`}
                  title={item.is_published ? "Unpublish" : "Publish"}
                >
                  {item.is_published ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => openEditItem(item)}
                  className="p-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/40 transition-colors"
                  title="Edit Certification"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  className="p-2 rounded-xl bg-error/10 border border-error/30 text-error hover:bg-error/20 transition-colors"
                  title="Delete Certification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / Create Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6 md:p-8 flex flex-col gap-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-tint/10 border border-surface-tint/30 flex items-center justify-center text-surface-tint">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-lg text-on-surface">
                  {isNew ? "Add New Certification" : "Edit Certification"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hidden Inputs for File Uploads */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCertificateFileChange}
              accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />
            <input
              type="file"
              ref={thumbInputRef}
              onChange={handleThumbnailChange}
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            {/* Form */}
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              {/* Form Error Banner */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-error/10 border border-error/30 text-error text-xs font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-error hover:underline text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block font-mono text-xs text-on-surface-variant mb-1">
                  Certification Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, title: e.target.value })
                  }
                  placeholder="e.g. AWS Certified Solutions Architect - Associate"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                />
                {fieldErrors.title && (
                  <p className="text-[11px] text-error mt-1">{fieldErrors.title[0]}</p>
                )}
              </div>

              {/* Issuer & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Issuer Organization *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.issuer}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, issuer: e.target.value })
                    }
                    placeholder="e.g. Amazon Web Services, Google, Coursera"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.issuer && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.issuer[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.category}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, category: e.target.value })
                    }
                    placeholder="e.g. Cloud, AI / ML, Security, Full-Stack"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.category && (
                    <p className="text-[11px] text-error mt-1">
                      {fieldErrors.category[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* Issue Date & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.issue_date}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, issue_date: e.target.value })
                    }
                    placeholder="e.g. Oct 2026 or 2026"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.issue_date && (
                    <p className="text-[11px] text-error mt-1">
                      {fieldErrors.issue_date[0]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Credential ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.credential_id || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        credential_id: e.target.value,
                      })
                    }
                    placeholder="e.g. ABC-123456"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>
              </div>

              {/* Verification URL */}
              <div>
                <label className="block font-mono text-xs text-on-surface-variant mb-1">
                  Verification URL (HTTP/HTTPS only)
                </label>
                <input
                  type="url"
                  value={editingItem.credential_url || ""}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      credential_url: e.target.value,
                    })
                  }
                  placeholder="https://credly.com/..."
                  className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
                />
                {fieldErrors.credential_url && (
                  <p className="text-[11px] text-error mt-1">
                    {fieldErrors.credential_url[0]}
                  </p>
                )}
              </div>

              {/* File Upload: Certificate Document / Image */}
              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-surface-tint" />
                      Certificate File (PDF, PNG, JPG, WEBP - Max 10 MB)
                    </span>
                    <p className="font-body text-[11px] text-on-surface-variant mt-0.5">
                      For image certificates, this is automatically used as the card thumbnail unless a custom thumbnail is provided.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFile}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isUploadingFile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>{editingItem.certificate_file_url ? "Replace File" : "Upload File"}</span>
                      </>
                    )}
                  </button>
                </div>

                {editingItem.certificate_file_url && (
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant flex items-center justify-between gap-2 text-xs font-mono">
                    <a
                      href={editingItem.certificate_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-surface-tint hover:underline truncate max-w-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{editingItem.certificate_file_url}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingItem({
                          ...editingItem,
                          certificate_file_url: "",
                        })
                      }
                      className="text-error hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* File Upload: Custom Thumbnail */}
              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-surface-tint" />
                      Custom Card Thumbnail (PNG, JPG, WEBP - Max 2 MB)
                    </span>
                    <p className="font-body text-[11px] text-on-surface-variant mt-0.5">
                      Optional image preview. For PDFs, a clean generic card renders if omitted.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    disabled={isUploadingThumb}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isUploadingThumb ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>{editingItem.thumbnail_url ? "Replace Thumb" : "Upload Thumb"}</span>
                      </>
                    )}
                  </button>
                </div>

                {editingItem.thumbnail_url && (
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded bg-surface-container overflow-hidden border border-outline-variant shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editingItem.thumbnail_url}
                          alt="Thumbnail Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-mono text-xs text-outline truncate max-w-xs">
                        Custom Thumbnail Set
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingItem({
                          ...editingItem,
                          thumbnail_url: "",
                        })
                      }
                      className="text-error text-xs font-mono hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Skills Tags */}
              <div className="space-y-2">
                <label className="block font-mono text-xs text-on-surface-variant">
                  Associated Skills / Badges
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="e.g. Docker, Python, Cloud Architecture"
                    className="flex-1 h-9 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 h-9 rounded-xl bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface hover:text-surface-tint transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editingItem.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface border border-outline-variant text-xs font-mono"
                    >
                      <Tag className="w-3 h-3 text-surface-tint" />
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-error text-outline"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Publishing Status & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container border border-outline-variant">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Public Visibility
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingItem({
                        ...editingItem,
                        is_published: !editingItem.is_published,
                      })
                    }
                    className={`w-full h-9 px-3 rounded-lg border text-xs font-mono transition-colors flex items-center justify-center gap-1.5 ${
                      editingItem.is_published
                        ? "bg-surface-tint/20 text-surface-tint border-surface-tint"
                        : "bg-surface-container-high text-outline border-outline-variant"
                    }`}
                  >
                    {editingItem.is_published ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Published (Live)</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Draft (Hidden)</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editingItem.sort_order}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        sort_order: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || isUploadingFile || isUploadingThumb}
                  className="px-5 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isNew ? "Add Certification" : "Save Changes"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="font-display text-base font-bold text-on-surface">
              Delete Certification?
            </h3>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-on-surface font-mono">{deleteTarget.title}</strong> by{" "}
              {deleteTarget.issuer}? Associated uploaded certificate files and thumbnails will also be removed from storage. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-outline hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-error text-on-error font-display text-xs font-semibold hover:bg-error/90 transition-all flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Permanently Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

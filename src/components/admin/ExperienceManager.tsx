"use client";

import React, { useState } from "react";
import {
  Terminal,
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
  MapPin,
  Calendar,
} from "lucide-react";
import {
  saveExperience,
  deleteExperience,
  toggleExperiencePublish,
  updateExperienceOrder,
} from "@/app/admin/actions/experience";
import type { ExperienceInput } from "@/lib/validations/admin";

export interface ExperienceRecord extends ExperienceInput {
  id: string;
}

interface ExperienceManagerProps {
  initialExperience: ExperienceRecord[];
}

const emptyExperience: ExperienceInput = {
  role: "",
  organization: "",
  location: "",
  start_date: "",
  end_date: "",
  description: "",
  is_published: false,
  sort_order: 10,
};

export const ExperienceManager: React.FC<ExperienceManagerProps> = ({
  initialExperience,
}) => {
  const [experience, setExperience] = useState<ExperienceRecord[]>(initialExperience);
  const [editingItem, setEditingItem] = useState<ExperienceInput | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ExperienceRecord | null>(null);
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
    const nextOrder = (experience.length + 1) * 10;
    setEditingItem({ ...emptyExperience, sort_order: nextOrder });
    setIsNew(true);
    setFieldErrors({});
    setErrorMessage(null);
  };

  const openEditItem = (item: ExperienceRecord) => {
    setEditingItem({ ...item });
    setIsNew(false);
    setFieldErrors({});
    setErrorMessage(null);
  };

  const handleTogglePublish = async (item: ExperienceRecord) => {
    const nextState = !item.is_published;
    const result = await toggleExperiencePublish(item.id, nextState);
    if (result.success) {
      setExperience((prev) =>
        prev.map((e) => (e.id === item.id ? { ...e, is_published: nextState } : e))
      );
      showToast(result.message || `Experience entry is now ${nextState ? "published" : "draft"}.`);
    } else {
      showToast(result.error, true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    const result = await saveExperience(editingItem);
    setSaving(false);

    if (result.success) {
      const savedId = result.data?.id || ("temp-" + Date.now());
      const savedRecord: ExperienceRecord = {
        ...editingItem,
        id: savedId,
      };

      if (isNew) {
        setExperience((prev) => [...prev, savedRecord]);
      } else {
        setExperience((prev) =>
          prev.map((item) => (item.id === savedId ? savedRecord : item))
        );
      }

      showToast(result.message || "Experience saved successfully.");
      setEditingItem(null);
    } else {
      setErrorMessage(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    const result = await deleteExperience(deleteTarget.id);
    setDeleting(false);

    if (result.success) {
      setExperience((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      showToast(`"${deleteTarget.role}" deleted successfully.`);
      setDeleteTarget(null);
    } else {
      showToast(result.error, true);
    }
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= experience.length) return;

    const updated = [...experience];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((item, idx) => ({
      ...item,
      sort_order: (idx + 1) * 10,
    }));

    setExperience(reordered);

    const result = await updateExperienceOrder(
      reordered.map((item) => ({ id: item.id, sort_order: item.sort_order }))
    );
    if (!result.success) {
      showToast("Failed to save reordered list", true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant sticky top-20 z-20 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm text-on-surface">
            Experience Entries ({experience.length})
          </span>
          <span className="font-mono text-xs text-on-surface-variant">
            {experience.filter((e) => e.is_published).length} Published ·{" "}
            {experience.filter((e) => !e.is_published).length} Draft
          </span>
        </div>

        <button
          type="button"
          onClick={openNewItem}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Experience</span>
        </button>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-surface-tint/10 border border-surface-tint/40 flex items-center gap-3 text-xs text-surface-tint font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && !editingItem && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-3 text-xs text-error font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Experience Items List */}
      <div className="grid grid-cols-1 gap-4">
        {experience.length === 0 ? (
          <div className="p-12 rounded-2xl bg-surface-container-low border border-outline-variant text-center flex flex-col items-center justify-center gap-3">
            <span className="font-mono text-xs text-outline uppercase tracking-wider">
              No Experience Records
            </span>
            <p className="font-body text-sm text-on-surface-variant max-w-sm">
              No experience records found. Click &quot;Add Experience&quot; to add your roles, hackathons, or internships.
            </p>
          </div>
        ) : (
          experience.map((item, index) => (
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
                <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center text-surface-tint shrink-0">
                  <Terminal className="w-6 h-6" />
                </div>

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-base text-on-surface truncate">
                      {item.role}
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
                  </div>

                  <p className="font-body text-xs font-semibold text-on-surface-variant">
                    {item.organization}
                  </p>

                  <div className="flex items-center gap-3 text-xs font-mono text-outline mt-1 flex-wrap">
                    {(item.start_date || item.end_date) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-surface-tint" />
                        <span>
                          {item.start_date || "Start"} — {item.end_date || "Present"}
                        </span>
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-surface-tint" />
                        <span>{item.location}</span>
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="font-body text-xs text-on-surface-variant/80 line-clamp-2 mt-1">
                      {item.description}
                    </p>
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
                    disabled={index === experience.length - 1}
                    className="p-1 rounded-lg text-outline hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePublish(item)}
                  title={item.is_published ? "Move to draft" : "Publish to live"}
                  className={`p-2 rounded-xl border text-xs font-mono transition-colors ${
                    item.is_published
                      ? "bg-surface-tint/10 text-surface-tint border-surface-tint/30 hover:bg-surface-tint/20"
                      : "bg-surface-container text-outline border-outline-variant hover:text-on-surface"
                  }`}
                >
                  {item.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => openEditItem(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface hover:text-surface-tint transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  className="p-2 rounded-xl bg-surface-container border border-outline-variant hover:border-error/60 text-outline hover:text-error transition-colors"
                  title="Delete Entry"
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
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6 md:p-8 flex flex-col gap-6 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
              <div>
                <h2 className="font-display text-lg font-bold text-on-surface">
                  {isNew ? "Add Experience Entry" : `Edit Experience: ${editingItem.role}`}
                </h2>
                <p className="font-mono text-xs text-on-surface-variant mt-0.5">
                  Location and date fields are optional. Empty fields are hidden automatically on the public site.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-2.5 text-xs text-error font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-5">
              {/* Role & Organization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Role / Position *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.role}
                    onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                    placeholder="e.g. Participant / Open Source Contributor"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.role && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.role[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Organization / Event *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.organization}
                    onChange={(e) => setEditingItem({ ...editingItem, organization: e.target.value })}
                    placeholder="e.g. HackSpirit 1.0, VVCE Mysore"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.organization && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.organization[0]}</p>
                  )}
                </div>
              </div>

              {/* Location & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.location || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                    placeholder="e.g. Mysore, India / Remote"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.start_date || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, start_date: e.target.value })}
                    placeholder="e.g. Oct 2024"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.end_date || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, end_date: e.target.value })}
                    placeholder="e.g. Present / Nov 2024"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-xs text-on-surface-variant mb-1">
                  Description / Responsibilities (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Key contributions, projects delivered, tools leveraged..."
                  className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                />
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
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg disabled:opacity-50 transition-all"
                >
                  {saving ? "Saving..." : isNew ? "Add Entry" : "Save Changes"}
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
              Delete Experience Entry?
            </h3>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-on-surface font-mono">{deleteTarget.role}</strong> at{" "}
              {deleteTarget.organization}? This cannot be undone.
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
                className="px-4 py-2 rounded-xl bg-error text-on-error font-display text-xs font-semibold hover:bg-error/90 transition-all"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

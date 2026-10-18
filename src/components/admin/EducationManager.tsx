"use client";

import React, { useState } from "react";
import {
  GraduationCap,
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
  Calendar,
  Award,
} from "lucide-react";
import {
  saveEducation,
  deleteEducation,
  toggleEducationPublish,
  updateEducationOrder,
} from "@/app/admin/actions/education";
import type { EducationInput } from "@/lib/validations/admin";

export interface EducationRecord extends EducationInput {
  id: string;
}

interface EducationManagerProps {
  initialEducation: EducationRecord[];
}

const emptyEducation: EducationInput = {
  institution: "",
  degree: "",
  field_of_study: "",
  start_year: "",
  end_year: "",
  grade: "",
  current_semester: "",
  description: "",
  is_published: false,
  sort_order: 10,
};

export const EducationManager: React.FC<EducationManagerProps> = ({
  initialEducation,
}) => {
  const [education, setEducation] = useState<EducationRecord[]>(initialEducation);
  const [editingItem, setEditingItem] = useState<EducationInput | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<EducationRecord | null>(null);
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
    const nextOrder = (education.length + 1) * 10;
    setEditingItem({ ...emptyEducation, sort_order: nextOrder });
    setIsNew(true);
    setFieldErrors({});
    setErrorMessage(null);
  };

  const openEditItem = (item: EducationRecord) => {
    setEditingItem({ ...item });
    setIsNew(false);
    setFieldErrors({});
    setErrorMessage(null);
  };

  const handleTogglePublish = async (item: EducationRecord) => {
    const nextState = !item.is_published;

    // Check if required fields are filled before enabling publish
    if (nextState) {
      if (
        !item.institution?.trim() ||
        !item.degree?.trim() ||
        !item.field_of_study?.trim() ||
        !item.start_year?.trim() ||
        !item.end_year?.trim() ||
        !item.grade?.trim()
      ) {
        showToast(
          "Cannot publish: All details (institution, degree, field of study, start year, end year, grade) must be filled before publishing.",
          true
        );
        return;
      }
    }

    const result = await toggleEducationPublish(item.id, nextState);
    if (result.success) {
      setEducation((prev) =>
        prev.map((e) => (e.id === item.id ? { ...e, is_published: nextState } : e))
      );
      showToast(result.message || `Education entry is now ${nextState ? "published" : "draft"}.`);
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

    const result = await saveEducation(editingItem);
    setSaving(false);

    if (result.success) {
      const savedId = result.data?.id || ("temp-" + Date.now());
      const savedRecord: EducationRecord = {
        ...editingItem,
        id: savedId,
      };

      if (isNew) {
        setEducation((prev) => [...prev, savedRecord]);
      } else {
        setEducation((prev) =>
          prev.map((item) => (item.id === savedId ? savedRecord : item))
        );
      }

      showToast(result.message || "Education saved successfully.");
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
    const result = await deleteEducation(deleteTarget.id);
    setDeleting(false);

    if (result.success) {
      setEducation((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      showToast(`"${deleteTarget.degree}" deleted successfully.`);
      setDeleteTarget(null);
    } else {
      showToast(result.error, true);
    }
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= education.length) return;

    const updated = [...education];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((item, idx) => ({
      ...item,
      sort_order: (idx + 1) * 10,
    }));

    setEducation(reordered);

    const result = await updateEducationOrder(
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
            Education Entries ({education.length})
          </span>
          <span className="font-mono text-xs text-on-surface-variant">
            {education.filter((e) => e.is_published).length} Published ·{" "}
            {education.filter((e) => !e.is_published).length} Draft
          </span>
        </div>

        <button
          type="button"
          onClick={openNewItem}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Education</span>
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

      {/* Education Items List */}
      <div className="grid grid-cols-1 gap-4">
        {education.length === 0 ? (
          <div className="p-12 rounded-2xl bg-surface-container-low border border-outline-variant text-center flex flex-col items-center justify-center gap-3">
            <span className="font-mono text-xs text-outline uppercase tracking-wider">
              No Education Records
            </span>
            <p className="font-body text-sm text-on-surface-variant max-w-sm">
              No education entries found. Click &quot;Add Education&quot; to add your college, school, or degree details.
            </p>
          </div>
        ) : (
          education.map((item, index) => (
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
                  <GraduationCap className="w-6 h-6" />
                </div>

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-base text-on-surface truncate">
                      {item.degree}
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

                    {item.current_semester && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-tertiary-container/30 text-tertiary border border-tertiary/30">
                        {item.current_semester}
                      </span>
                    )}
                  </div>

                  <p className="font-body text-xs font-semibold text-on-surface-variant">
                    {item.institution}
                    {item.field_of_study ? ` · ${item.field_of_study}` : ""}
                  </p>

                  <div className="flex items-center gap-3 text-xs font-mono text-outline mt-1 flex-wrap">
                    {(item.start_year || item.end_year) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-surface-tint" />
                        <span>
                          {item.start_year || "?"} — {item.end_year || "?"}
                        </span>
                      </span>
                    )}
                    {item.grade && (
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-surface-tint" />
                        <span className="text-surface-tint font-bold">CGPA / Grade: {item.grade}</span>
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
                    disabled={index === education.length - 1}
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
                  {isNew ? "Add Education Entry" : `Edit Education: ${editingItem.degree}`}
                </h2>
                <p className="font-mono text-xs text-on-surface-variant mt-0.5">
                  Entries marked Published must have all fields filled. Draft entries can have blank fields.
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
              {/* Institution */}
              <div>
                <label className="block font-mono text-xs text-on-surface-variant mb-1">
                  Institution Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.institution}
                  onChange={(e) => setEditingItem({ ...editingItem, institution: e.target.value })}
                  placeholder="e.g. Vidyavardhaka College of Engineering"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                />
                {fieldErrors.institution && (
                  <p className="text-[11px] text-error mt-1">{fieldErrors.institution[0]}</p>
                )}
              </div>

              {/* Degree & Field of Study */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Degree Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.degree}
                    onChange={(e) => setEditingItem({ ...editingItem, degree: e.target.value })}
                    placeholder="e.g. B.E. Computer Science & Engineering"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.degree && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.degree[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Field of Study {editingItem.is_published && "*"}
                  </label>
                  <input
                    type="text"
                    value={editingItem.field_of_study || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, field_of_study: e.target.value })}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.field_of_study && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.field_of_study[0]}</p>
                  )}
                </div>
              </div>

              {/* Start Year & End Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Start Year {editingItem.is_published && "*"}
                  </label>
                  <input
                    type="text"
                    value={editingItem.start_year || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, start_year: e.target.value })}
                    placeholder="e.g. 2022"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.start_year && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.start_year[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    End Year / Expected {editingItem.is_published && "*"}
                  </label>
                  <input
                    type="text"
                    value={editingItem.end_year || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, end_year: e.target.value })}
                    placeholder="e.g. 2026"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.end_year && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.end_year[0]}</p>
                  )}
                </div>
              </div>

              {/* Grade / CGPA & Current Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    CGPA / Grade {editingItem.is_published && "*"}
                  </label>
                  <input
                    type="text"
                    value={editingItem.grade || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, grade: e.target.value })}
                    placeholder="e.g. 9.12"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-surface-tint focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.grade && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.grade[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Current Semester (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.current_semester || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, current_semester: e.target.value })}
                    placeholder="e.g. 5th Semester"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-xs text-on-surface-variant mb-1">
                  Key Coursework & Highlights (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Data Structures, Algorithms, DBMS, Operating Systems, Machine Learning..."
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
                  <p className="text-[10px] font-mono text-outline mt-1">
                    {editingItem.is_published
                      ? "Requires all fields to be populated."
                      : "Can save with incomplete details as draft."}
                  </p>
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
              Delete Education Entry?
            </h3>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-on-surface font-mono">{deleteTarget.degree}</strong> at{" "}
              {deleteTarget.institution}? This cannot be undone.
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

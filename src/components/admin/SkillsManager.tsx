"use client";

import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  saveSkill,
  deleteSkill,
  toggleSkillPublish,
  updateSkillsOrder,
} from "@/app/admin/actions/skills";
import type { SkillInput } from "@/lib/validations/admin";

interface SkillRecord extends SkillInput {
  id: string;
}

interface SkillsManagerProps {
  initialSkills: SkillRecord[];
}

const emptySkill: SkillInput = {
  name: "",
  category: "Languages",
  proficiency: null,
  is_published: true,
  sort_order: 10,
};

export const SkillsManager: React.FC<SkillsManagerProps> = ({ initialSkills }) => {
  const [skills, setSkills] = useState<SkillRecord[]>(initialSkills);
  const [editingSkill, setEditingSkill] = useState<SkillInput | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SkillRecord | null>(null);

  // Status and toasts
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Extract distinct categories
  const existingCategories = Array.from(
    new Set(skills.map((s) => s.category).filter(Boolean))
  );
  if (!existingCategories.includes("Languages")) existingCategories.push("Languages");
  if (!existingCategories.includes("Frameworks & Tools"))
    existingCategories.push("Frameworks & Tools");
  if (!existingCategories.includes("Databases & Cloud"))
    existingCategories.push("Databases & Cloud");

  const openNewSkill = (preferredCategory?: string) => {
    const cat = preferredCategory || existingCategories[0] || "Languages";
    setEditingSkill({
      ...emptySkill,
      category: cat,
      sort_order: (skills.filter((s) => s.category === cat).length + 1) * 10,
    });
    setIsNew(true);
    setCustomCategory(false);
    setErrorMessage(null);
  };

  const openEditSkill = (skill: SkillRecord) => {
    setEditingSkill({ ...skill });
    setIsNew(false);
    setCustomCategory(!existingCategories.includes(skill.category));
    setErrorMessage(null);
  };

  const handleTogglePublish = async (skill: SkillRecord) => {
    const nextState = !skill.is_published;
    const result = await toggleSkillPublish(skill.id, nextState);
    if (result.success) {
      setSkills((prev) =>
        prev.map((s) => (s.id === skill.id ? { ...s, is_published: nextState } : s))
      );
      showToast(`Skill "${skill.name}" is now ${nextState ? "published" : "hidden"}.`);
    } else {
      showToast(result.error, true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;

    setSaving(true);
    setErrorMessage(null);

    const result = await saveSkill(editingSkill);
    setSaving(false);

    if (result.success) {
      const savedId = result.data?.id || editingSkill.name;
      const savedRecord: SkillRecord = {
        ...editingSkill,
        id: savedId,
      };

      if (isNew) {
        setSkills((prev) => [...prev, savedRecord]);
      } else {
        setSkills((prev) => prev.map((s) => (s.id === savedId ? savedRecord : s)));
      }

      showToast(result.message || "Skill saved successfully.");
      setEditingSkill(null);
    } else {
      setErrorMessage(result.error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    const result = await deleteSkill(deleteTarget.id);
    setDeleting(false);

    if (result.success) {
      setSkills((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast(result.message || "Skill deleted.");
      setDeleteTarget(null);
    } else {
      showToast(result.error, true);
    }
  };

  const moveSkill = async (category: string, index: number, direction: "up" | "down") => {
    const categorySkills = skills.filter((s) => s.category === category);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categorySkills.length) return;

    const itemA = categorySkills[index];
    const itemB = categorySkills[targetIndex];

    const newSkills = skills.map((s) => {
      if (s.id === itemA.id) return { ...s, sort_order: itemB.sort_order };
      if (s.id === itemB.id) return { ...s, sort_order: itemA.sort_order };
      return s;
    });

    setSkills(newSkills);

    await updateSkillsOrder([
      { id: itemA.id, sort_order: itemB.sort_order },
      { id: itemB.id, sort_order: itemA.sort_order },
    ]);
  };

  // Group skills by category
  const groupedSkills: Record<string, SkillRecord[]> = {};
  for (const s of skills) {
    if (!groupedSkills[s.category]) {
      groupedSkills[s.category] = [];
    }
    groupedSkills[s.category].push(s);
  }

  // Sort within each category by sort_order
  for (const cat in groupedSkills) {
    groupedSkills[cat].sort((a, b) => a.sort_order - b.sort_order);
  }

  const categoryKeys = Object.keys(groupedSkills);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant sticky top-20 z-20 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm text-on-surface">
            Skills Inventory ({skills.length})
          </span>
          <span className="font-mono text-xs text-on-surface-variant">
            {skills.filter((s) => s.is_published).length} Published across{" "}
            {categoryKeys.length} Categories
          </span>
        </div>

        <button
          type="button"
          onClick={() => openNewSkill()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Skill</span>
        </button>
      </div>

      {/* Toast Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-surface-tint/10 border border-surface-tint/40 flex items-center gap-3 text-xs text-surface-tint font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && !editingSkill && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-3 text-xs text-error font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Category Groups */}
      <div className="flex flex-col gap-6">
        {categoryKeys.length === 0 ? (
          <div className="p-12 rounded-2xl bg-surface-container-low border border-outline-variant text-center flex flex-col items-center justify-center gap-3">
            <span className="font-mono text-xs text-outline uppercase tracking-wider">
              No Skills Defined
            </span>
            <p className="font-body text-sm text-on-surface-variant max-w-sm">
              No technical skills found in the database. Click &quot;New Skill&quot; above to create one.
            </p>
          </div>
        ) : (
          categoryKeys.map((category) => {
            const catSkills = groupedSkills[category];
            return (
              <div
                key={category}
                className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-4"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-surface-tint" />
                    <h3 className="font-display font-bold text-base text-on-surface">
                      {category}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-mono text-[10px]">
                      {catSkills.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openNewSkill(category)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface hover:text-surface-tint transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to {category}</span>
                  </button>
                </div>

                {/* Skills Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catSkills.map((skill, idx) => (
                    <div
                      key={skill.id}
                      className="p-3.5 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-between gap-3 hover:border-outline transition-colors"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold text-sm text-on-surface truncate">
                            {skill.name}
                          </span>
                          {!skill.is_published && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface-container-highest text-outline">
                              Draft
                            </span>
                          )}
                        </div>

                        {skill.proficiency && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-16 h-1 rounded-full bg-surface-container-highest overflow-hidden">
                              <div
                                className="h-full bg-surface-tint"
                                style={{ width: `${skill.proficiency}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-outline">
                              {skill.proficiency}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Sort Arrows */}
                        <button
                          type="button"
                          onClick={() => moveSkill(category, idx, "up")}
                          disabled={idx === 0}
                          title="Move up"
                          className="p-1 text-outline hover:text-on-surface disabled:opacity-20"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSkill(category, idx, "down")}
                          disabled={idx === catSkills.length - 1}
                          title="Move down"
                          className="p-1 text-outline hover:text-on-surface disabled:opacity-20"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Publish Toggle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(skill)}
                          title={skill.is_published ? "Hide skill" : "Publish skill"}
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            skill.is_published
                              ? "text-surface-tint hover:bg-surface-tint/10"
                              : "text-outline hover:text-on-surface"
                          }`}
                        >
                          {skill.is_published ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => openEditSkill(skill)}
                          title="Edit skill"
                          className="p-1.5 rounded-lg text-outline hover:text-surface-tint hover:bg-surface-container-high transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(skill)}
                          title="Delete skill"
                          className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-surface-container-high transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Create Skill Modal */}
      {editingSkill && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h2 className="font-display text-base font-bold text-on-surface">
                {isNew ? "Add Technical Skill" : `Edit Skill: ${editingSkill.name}`}
              </h2>
              <button
                type="button"
                onClick={() => setEditingSkill(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-2 text-xs text-error font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-xs text-on-surface-variant mb-1">
                  Skill Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingSkill.name}
                  onChange={(e) =>
                    setEditingSkill({ ...editingSkill, name: e.target.value })
                  }
                  placeholder="e.g. Next.js, Python, PostgreSQL"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-mono text-xs text-on-surface-variant">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomCategory(!customCategory)}
                    className="text-[11px] font-mono text-surface-tint hover:underline"
                  >
                    {customCategory ? "Choose existing" : "+ New category"}
                  </button>
                </div>

                {customCategory ? (
                  <input
                    type="text"
                    required
                    value={editingSkill.category}
                    onChange={(e) =>
                      setEditingSkill({ ...editingSkill, category: e.target.value })
                    }
                    placeholder="e.g. Cloud & DevOps"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                ) : (
                  <select
                    value={editingSkill.category}
                    onChange={(e) =>
                      setEditingSkill({ ...editingSkill, category: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  >
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Proficiency % (1-100)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editingSkill.proficiency ?? ""}
                    onChange={(e) =>
                      setEditingSkill({
                        ...editingSkill,
                        proficiency: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    placeholder="e.g. 90"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editingSkill.sort_order}
                    onChange={(e) =>
                      setEditingSkill({
                        ...editingSkill,
                        sort_order: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant">
                <span className="font-mono text-xs text-on-surface">Publish to Home</span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingSkill({
                      ...editingSkill,
                      is_published: !editingSkill.is_published,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    editingSkill.is_published
                      ? "bg-surface-tint/20 text-surface-tint border border-surface-tint/40"
                      : "bg-surface-container-high text-outline border border-outline-variant"
                  }`}
                >
                  {editingSkill.is_published ? "Published" : "Draft"}
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono text-outline hover:text-on-surface"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-bold shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Skill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest border border-error/40 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-error">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-display font-bold text-base text-on-surface">
                Delete Skill
              </h3>
            </div>

            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-on-surface font-semibold">&quot;{deleteTarget.name}&quot;</strong>?
              It will immediately disappear from your public skills matrix.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono text-outline hover:text-on-surface"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-error text-on-error text-xs font-mono font-bold hover:bg-error/90 disabled:opacity-50"
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

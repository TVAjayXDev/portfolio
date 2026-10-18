"use client";

import React, { useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Star,
  Eye,
  EyeOff,
  Upload,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Code,
  Image as ImageIcon,
} from "lucide-react";
import {
  saveProject,
  toggleProjectPublish,
  deleteProject,
  uploadProjectImage,
} from "@/app/admin/actions/projects";
import { slugify, type ProjectInput } from "@/lib/validations/admin";

interface ProjectRecord extends ProjectInput {
  id: string;
}

interface ProjectsManagerProps {
  initialProjects: ProjectRecord[];
}

const emptyProject: ProjectInput = {
  title: "",
  slug: "",
  tagline: "",
  description: "",
  long_description: "",
  content: "",
  team: "",
  demo_url: "",
  github_url: "",
  image_url: "",
  technologies: [],
  status: "completed",
  is_featured: false,
  is_published: true,
  sort_order: 10,
};

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  initialProjects,
}) => {
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [editingProject, setEditingProject] = useState<ProjectInput | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Markdown Tab: 'edit' or 'preview'
  const [markdownTab, setMarkdownTab] = useState<"edit" | "preview">("edit");

  // Technology input tag
  const [newTech, setNewTech] = useState("");

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null);
  const [deleteConfirmationSlug, setDeleteConfirmationSlug] = useState("");
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

  const openNewProject = () => {
    const nextOrder = (projects.length + 1) * 10;
    setEditingProject({ ...emptyProject, sort_order: nextOrder });
    setIsNew(true);
    setSlugManuallyEdited(false);
    setMarkdownTab("edit");
    setFieldErrors({});
    setErrorMessage(null);
  };

  const openEditProject = (proj: ProjectRecord) => {
    setEditingProject({ ...proj });
    setIsNew(false);
    setSlugManuallyEdited(true);
    setMarkdownTab("edit");
    setFieldErrors({});
    setErrorMessage(null);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!editingProject) return;
    const updated: ProjectInput = { ...editingProject, title: newTitle };
    if (!slugManuallyEdited) {
      updated.slug = slugify(newTitle);
    }
    setEditingProject(updated);
  };

  const handleAddTech = () => {
    if (!newTech.trim() || !editingProject) return;
    const tag = newTech.trim();
    if (!editingProject.technologies.includes(tag)) {
      setEditingProject({
        ...editingProject,
        technologies: [...editingProject.technologies, tag],
      });
    }
    setNewTech("");
  };

  const handleRemoveTech = (tag: string) => {
    if (!editingProject) return;
    setEditingProject({
      ...editingProject,
      technologies: editingProject.technologies.filter((t) => t !== tag),
    });
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProject) return;

    setImageUploadError(null);
    setUploadingImage(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadProjectImage(formData);
    setUploadingImage(false);

    if (result.success) {
      if (result.data) {
        setEditingProject({
          ...editingProject,
          image_url: result.data.url,
        });
      }
      showToast("Image uploaded successfully.");
    } else {
      setImageUploadError(result.error || "Failed to upload image.");
    }
  };

  const handleTogglePublish = async (proj: ProjectRecord) => {
    const nextState = !proj.is_published;
    const result = await toggleProjectPublish(proj.id, nextState, proj.slug);
    if (result.success) {
      setProjects((prev) =>
        prev.map((p) => (p.id === proj.id ? { ...p, is_published: nextState } : p))
      );
      showToast(`Project "${proj.title}" is now ${nextState ? "published" : "draft"}.`);
    } else {
      showToast(result.error, true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    const result = await saveProject(editingProject);
    setSaving(false);

    if (result.success) {
      const savedId = result.data?.id || editingProject.slug;
      const savedRecord: ProjectRecord = {
        ...editingProject,
        id: savedId,
      };

      if (isNew) {
        setProjects((prev) => [
          ...prev.map((p) => (savedRecord.is_featured ? { ...p, is_featured: false } : p)),
          savedRecord,
        ]);
      } else {
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id === savedId) return savedRecord;
            if (savedRecord.is_featured) return { ...p, is_featured: false };
            return p;
          })
        );
      }

      showToast(result.message || "Project saved successfully.");
      setEditingProject(null);
    } else {
      setErrorMessage(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmationSlug !== deleteTarget.slug) return;

    setDeleting(true);
    const result = await deleteProject(deleteTarget.id, deleteTarget.slug);
    setDeleting(false);

    if (result.success) {
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`Project "${deleteTarget.title}" permanently deleted.`);
      setDeleteTarget(null);
      setDeleteConfirmationSlug("");
    } else {
      showToast(result.error, true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant sticky top-20 z-20 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm text-on-surface">
            Projects Portfolio ({projects.length})
          </span>
          <span className="font-mono text-xs text-on-surface-variant">
            {projects.filter((p) => p.is_published).length} Published ·{" "}
            {projects.filter((p) => p.is_featured).length} Featured
          </span>
        </div>

        <button
          type="button"
          onClick={openNewProject}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-surface-tint/10 border border-surface-tint/40 flex items-center gap-3 text-xs text-surface-tint font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && !editingProject && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-3 text-xs text-error font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Projects List View */}
      <div className="grid grid-cols-1 gap-4">
        {projects.length === 0 ? (
          <div className="p-12 rounded-2xl bg-surface-container-low border border-outline-variant text-center flex flex-col items-center justify-center gap-3">
            <span className="font-mono text-xs text-outline uppercase tracking-wider">
              No Projects Found
            </span>
            <p className="font-body text-sm text-on-surface-variant max-w-sm">
              No projects have been created yet. Click &quot;New Project&quot; above to add your first work.
            </p>
          </div>
        ) : (
          projects.map((proj) => (
            <div
              key={proj.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                proj.is_featured
                  ? "bg-surface-container-low border-surface-tint/40 shadow-sm"
                  : "bg-surface-container-low border-outline-variant hover:border-outline"
              }`}
            >
              {/* Left Column: Thumb + Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {proj.image_url ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container relative shrink-0 border border-outline-variant">
                    <Image
                      src={proj.image_url}
                      alt={proj.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center text-outline shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-base text-on-surface truncate">
                      {proj.title}
                    </h3>

                    {proj.is_featured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-tint/20 text-surface-tint border border-surface-tint/40 text-[10px] font-mono font-bold">
                        <Star className="w-3 h-3 fill-surface-tint" />
                        <span>Featured</span>
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                        proj.status === "completed" || proj.status === "live"
                          ? "bg-secondary-container/40 text-on-secondary-container border-secondary/30"
                          : "bg-tertiary-container/30 text-tertiary border-tertiary/30"
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>

                  <p className="font-mono text-xs text-surface-tint truncate">
                    /{proj.slug}
                  </p>

                  <p className="font-body text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                    {proj.tagline || proj.description}
                  </p>

                  {/* Tech stack badges */}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proj.technologies.slice(0, 5).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-mono border border-outline-variant/60"
                        >
                          {t}
                        </span>
                      ))}
                      {proj.technologies.length > 5 && (
                        <span className="text-[10px] font-mono text-outline self-center">
                          +{proj.technologies.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => handleTogglePublish(proj)}
                  title={proj.is_published ? "Unpublish (draft)" : "Publish to live"}
                  className={`p-2 rounded-xl border text-xs font-mono transition-colors ${
                    proj.is_published
                      ? "bg-surface-tint/10 text-surface-tint border-surface-tint/30 hover:bg-surface-tint/20"
                      : "bg-surface-container text-outline border-outline-variant hover:text-on-surface"
                  }`}
                >
                  {proj.is_published ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>

                <a
                  href={`/projects/${proj.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on site"
                  className="p-2 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint text-on-surface-variant hover:text-surface-tint transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => openEditProject(proj)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface hover:text-surface-tint transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(proj);
                    setDeleteConfirmationSlug("");
                  }}
                  className="p-2 rounded-xl bg-surface-container border border-outline-variant hover:border-error/60 text-outline hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Project Edit / Create Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6 md:p-8 flex flex-col gap-6 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
              <div>
                <h2 className="font-display text-lg font-bold text-on-surface">
                  {isNew ? "Create Project" : `Edit Project: ${editingProject.title}`}
                </h2>
                <p className="font-mono text-xs text-on-surface-variant mt-0.5">
                  All inputs are validated server-side. Markdown case studies are sanitized.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
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

            <form onSubmit={handleSave} className="flex flex-col gap-6">
              {/* Row 1: Title & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProject.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. TrustLens"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.title && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.title[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    URL Slug * (kebab-case, e.g. trustlens)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProject.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setEditingProject({ ...editingProject, slug: e.target.value });
                    }}
                    placeholder="e.g. trustlens"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-surface-tint focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.slug && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.slug[0]}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Tagline & Team */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Tagline (short pitch)
                  </label>
                  <input
                    type="text"
                    value={editingProject.tagline || ""}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, tagline: e.target.value })
                    }
                    placeholder="e.g. Clinical governance and medical claim verification"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Team / Role
                  </label>
                  <input
                    type="text"
                    value={editingProject.team || ""}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, team: e.target.value })
                    }
                    placeholder="e.g. Solo Developer / Lead Architect"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block font-mono text-xs text-on-surface-variant mb-1">
                  Summary Description * (Card excerpt, max 600 chars)
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingProject.description}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, description: e.target.value })
                  }
                  placeholder="Primary executive description of the project architecture and outcomes..."
                  className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                />
                {fieldErrors.description && (
                  <p className="text-[11px] text-error mt-1">{fieldErrors.description[0]}</p>
                )}
              </div>

              {/* Row 4: URLs (Demo, GitHub) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Live Demo URL (HTTP or HTTPS only)
                  </label>
                  <input
                    type="url"
                    value={editingProject.demo_url || ""}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, demo_url: e.target.value })
                    }
                    placeholder="https://trustlens.health"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.demo_url && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.demo_url[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    GitHub Repository URL (HTTP or HTTPS only)
                  </label>
                  <input
                    type="url"
                    value={editingProject.github_url || ""}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, github_url: e.target.value })
                    }
                    placeholder="https://github.com/T-V-Ajay/TrustLens"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.github_url && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.github_url[0]}</p>
                  )}
                </div>
              </div>

              {/* Row 5: Technologies Tag Manager */}
              <div className="space-y-2">
                <label className="block font-mono text-xs text-on-surface-variant">
                  Technologies / Stack Tags
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTech();
                      }
                    }}
                    placeholder="e.g. Next.js, FastAPI, PostgreSQL"
                    className="flex-1 h-9 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTech}
                    className="px-4 h-9 rounded-xl bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface hover:text-surface-tint transition-colors"
                  >
                    Add Tag
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editingProject.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface border border-outline-variant text-xs font-mono"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech)}
                        className="hover:text-error text-outline"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Row 6: Screenshot Image Upload */}
              <div className="space-y-2 p-4 rounded-xl bg-surface-container border border-outline-variant">
                <label className="block font-mono text-xs text-on-surface-variant">
                  Project Screenshot / Cover Image (Max 4 MB, PNG/JPG/WEBP/GIF)
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {editingProject.image_url ? (
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container-high border border-outline-variant relative shrink-0">
                      <Image
                        src={editingProject.image_url}
                        alt="Project screenshot"
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-surface-container-high border border-dashed border-outline-variant flex flex-col items-center justify-center text-outline shrink-0">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-[10px] font-mono mt-1">No Image</span>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? "Uploading..." : "Select File"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleImageFileSelect}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>

                      {editingProject.image_url && (
                        <button
                          type="button"
                          onClick={() => setEditingProject({ ...editingProject, image_url: "" })}
                          className="text-xs font-mono text-outline hover:text-error"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      value={editingProject.image_url || ""}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, image_url: e.target.value })
                      }
                      placeholder="Or enter direct image URL (https://...)"
                      className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
                    />

                    {imageUploadError && (
                      <p className="text-[11px] text-error font-mono">{imageUploadError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 7: Markdown Case Study (Tabbed Editor & Rehype-Sanitized Preview) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs text-on-surface-variant flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-surface-tint" />
                    <span>Case Study Markdown (Sanitized Preview)</span>
                  </label>

                  <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container border border-outline-variant text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setMarkdownTab("edit")}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        markdownTab === "edit"
                          ? "bg-surface-tint text-black font-semibold"
                          : "text-outline hover:text-on-surface"
                      }`}
                    >
                      <Code className="w-3 h-3 inline mr-1" />
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarkdownTab("preview")}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        markdownTab === "preview"
                          ? "bg-surface-tint text-black font-semibold"
                          : "text-outline hover:text-on-surface"
                      }`}
                    >
                      <Eye className="w-3 h-3 inline mr-1" />
                      Live Preview
                    </button>
                  </div>
                </div>

                {markdownTab === "edit" ? (
                  <textarea
                    rows={8}
                    value={editingProject.content || ""}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        content: e.target.value,
                      })
                    }
                    placeholder="Write detailed architecture, challenges, design decisions, and benchmarks in Markdown..."
                    className="w-full p-4 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono leading-relaxed text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-surface-container border border-outline-variant min-h-[200px] max-h-[350px] overflow-y-auto prose prose-invert prose-sm max-w-none">
                    {editingProject.content ? (
                      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                        {editingProject.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-outline italic text-xs font-mono">
                        No markdown content yet. Switch to Editor to write your case study.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Row 8: Toggles (Status, Featured, Published, Sort Order) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-container border border-outline-variant">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Status
                  </label>
                  <select
                    value={editingProject.status}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        status: e.target.value as ProjectInput["status"],
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  >
                    <option value="completed">Completed</option>
                    <option value="live">Live</option>
                    <option value="in_progress">In Progress</option>
                    <option value="planned">Planned</option>
                    <option value="coming_soon">Coming Soon</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Featured Project
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProject({
                        ...editingProject,
                        is_featured: !editingProject.is_featured,
                      })
                    }
                    className={`w-full h-9 px-3 rounded-lg border text-xs font-mono transition-colors flex items-center justify-center gap-1.5 ${
                      editingProject.is_featured
                        ? "bg-surface-tint/20 text-surface-tint border-surface-tint"
                        : "bg-surface-container-high text-outline border-outline-variant"
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        editingProject.is_featured ? "fill-surface-tint" : ""
                      }`}
                    />
                    <span>{editingProject.is_featured ? "Featured (Active)" : "Standard"}</span>
                  </button>
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Public Visibility
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProject({
                        ...editingProject,
                        is_published: !editingProject.is_published,
                      })
                    }
                    className={`w-full h-9 px-3 rounded-lg border text-xs font-mono transition-colors flex items-center justify-center gap-1.5 ${
                      editingProject.is_published
                        ? "bg-surface-tint/20 text-surface-tint border-surface-tint"
                        : "bg-surface-container-high text-outline border-outline-variant"
                    }`}
                  >
                    {editingProject.is_published ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Published</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Draft</span>
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
                    value={editingProject.sort_order}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        sort_order: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono text-outline hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-surface-tint text-black font-display text-xs font-bold shadow-cyan-glow hover:shadow-cyan-glow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Slug typing confirmation) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-error/40 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-error">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-display font-bold text-base text-on-surface">
                Delete Project
              </h3>
            </div>

            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              This action cannot be undone. To permanently delete{" "}
              <strong className="text-on-surface font-semibold">&quot;{deleteTarget.title}&quot;</strong>,
              please type its slug{" "}
              <code className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant text-surface-tint font-mono">
                {deleteTarget.slug}
              </code>{" "}
              below:
            </p>

            <input
              type="text"
              value={deleteConfirmationSlug}
              onChange={(e) => setDeleteConfirmationSlug(e.target.value)}
              placeholder={deleteTarget.slug}
              className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono text-on-surface focus:border-error focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono text-outline hover:text-on-surface transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmationSlug !== deleteTarget.slug || deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-error text-on-error text-xs font-mono font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-error/90"
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Forever</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

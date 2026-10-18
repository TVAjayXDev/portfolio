"use client";

import React, { useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Code,
  Image as ImageIcon,
  Clock,
  Tag,
} from "lucide-react";
import {
  savePost,
  deletePost,
  togglePostPublish,
  uploadPostCover,
} from "@/app/admin/actions/blog";
import { slugify, calculateReadTime, type PostInput } from "@/lib/validations/admin";

export interface PostRecord extends PostInput {
  id: string;
  read_time?: string | null;
  published_at?: string | null;
}

interface BlogManagerProps {
  initialPosts: PostRecord[];
}

const emptyPost: PostInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  tags: [],
  is_published: false,
  sort_order: 10,
};

export const BlogManager: React.FC<BlogManagerProps> = ({ initialPosts }) => {
  const [posts, setPosts] = useState<PostRecord[]>(initialPosts);
  const [editingPost, setEditingPost] = useState<PostInput | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Markdown Tab: 'edit' or 'preview'
  const [markdownTab, setMarkdownTab] = useState<"edit" | "preview">("edit");

  // Tag input
  const [newTag, setNewTag] = useState("");

  // Cover image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<PostRecord | null>(null);
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

  const openNewPost = () => {
    const nextOrder = (posts.length + 1) * 10;
    setEditingPost({ ...emptyPost, sort_order: nextOrder });
    setIsNew(true);
    setSlugManuallyEdited(false);
    setMarkdownTab("edit");
    setNewTag("");
    setFieldErrors({});
    setErrorMessage(null);
  };

  const openEditPost = (p: PostRecord) => {
    setEditingPost({ ...p });
    setIsNew(false);
    setSlugManuallyEdited(true);
    setMarkdownTab("edit");
    setNewTag("");
    setFieldErrors({});
    setErrorMessage(null);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!editingPost) return;
    const updated: PostInput = { ...editingPost, title: newTitle };
    if (!slugManuallyEdited) {
      updated.slug = slugify(newTitle);
    }
    setEditingPost(updated);
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !editingPost) return;
    const tag = newTag.trim();
    if (!editingPost.tags.includes(tag)) {
      setEditingPost({
        ...editingPost,
        tags: [...editingPost.tags, tag],
      });
    }
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    if (!editingPost) return;
    setEditingPost({
      ...editingPost,
      tags: editingPost.tags.filter((t) => t !== tag),
    });
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPost) return;

    setImageUploadError(null);
    setUploadingImage(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadPostCover(formData);
    setUploadingImage(false);

    if (result.success) {
      if (result.data) {
        setEditingPost({
          ...editingPost,
          cover_image_url: result.data.url,
        });
      }
      showToast("Cover image uploaded to post-covers bucket.");
    } else {
      setImageUploadError(result.error || "Failed to upload image.");
    }
  };

  const handleTogglePublish = async (post: PostRecord) => {
    const nextState = !post.is_published;
    const result = await togglePostPublish(post.id, nextState, post.slug);
    if (result.success) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                is_published: nextState,
                published_at:
                  nextState && !p.published_at
                    ? new Date().toISOString()
                    : p.published_at,
              }
            : p
        )
      );
      showToast(result.message || `Post is now ${nextState ? "published" : "draft"}.`);
    } else {
      showToast(result.error, true);
    }
  };

  const handleSave = async (e?: React.FormEvent, forcePublish?: boolean) => {
    if (e) e.preventDefault();
    if (!editingPost) return;

    setSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    const isPublishedState =
      forcePublish !== undefined ? forcePublish : Boolean(editingPost.is_published);

    const postPayload: PostInput = {
      ...editingPost,
      is_published: isPublishedState,
    };

    const result = await savePost(postPayload);
    setSaving(false);

    if (result.success) {
      const savedId = result.data?.id || editingPost.slug;
      const readTime = calculateReadTime(editingPost.content || "");
      const savedRecord: PostRecord = {
        ...postPayload,
        id: savedId,
        read_time: readTime,
        published_at: isPublishedState
          ? (editingPost as Partial<PostRecord>).published_at || new Date().toISOString()
          : null,
      };

      if (isNew) {
        setPosts((prev) => [savedRecord, ...prev]);
      } else {
        setPosts((prev) =>
          prev.map((p) => (p.id === savedId ? savedRecord : p))
        );
      }

      showToast(
        result.message ||
          (isPublishedState
            ? "Article published live to visitor portal!"
            : "Article saved as draft.")
      );
      setEditingPost(null);
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
    const result = await deletePost(deleteTarget.id, deleteTarget.slug);
    setDeleting(false);

    if (result.success) {
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`"${deleteTarget.title}" deleted successfully.`);
      setDeleteTarget(null);
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
            Blog Posts ({posts.length})
          </span>
          <span className="font-mono text-xs text-on-surface-variant">
            {posts.filter((p) => p.is_published).length} Published ·{" "}
            {posts.filter((p) => !p.is_published).length} Draft
          </span>
        </div>

        <button
          type="button"
          onClick={openNewPost}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Article</span>
        </button>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-surface-tint/10 border border-surface-tint/40 flex items-center gap-3 text-xs text-surface-tint font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && !editingPost && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-3 text-xs text-error font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Posts List */}
      <div className="grid grid-cols-1 gap-4">
        {posts.length === 0 ? (
          <div className="p-12 rounded-2xl bg-surface-container-low border border-outline-variant text-center flex flex-col items-center justify-center gap-3">
            <span className="font-mono text-xs text-outline uppercase tracking-wider">
              No Blog Posts
            </span>
            <p className="font-body text-sm text-on-surface-variant max-w-sm">
              No articles or learning log posts found. Click &quot;New Article&quot; to write your first entry.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                post.is_published
                  ? "bg-surface-container-low border-outline-variant hover:border-outline"
                  : "bg-surface-container-low/70 border-dashed border-outline-variant"
              }`}
            >
              {/* Left Column: Cover & Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {post.cover_image_url ? (
                  <div className="w-20 h-16 rounded-xl overflow-hidden bg-surface-container relative shrink-0 border border-outline-variant">
                    <Image
                      src={post.cover_image_url}
                      alt={post.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-16 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center text-outline shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                )}

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-base text-on-surface truncate">
                      {post.title}
                    </h3>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                        post.is_published
                          ? "bg-surface-tint/20 text-surface-tint border-surface-tint/40 font-semibold"
                          : "bg-surface-container text-outline border-outline-variant"
                      }`}
                    >
                      {post.is_published ? "Published" : "Draft"}
                    </span>

                    <span className="flex items-center gap-1 text-[11px] font-mono text-outline">
                      <Clock className="w-3 h-3 text-surface-tint" />
                      <span>{post.read_time || calculateReadTime(post.content || "")}</span>
                    </span>
                  </div>

                  <p className="font-mono text-xs text-surface-tint truncate">
                    /blog/{post.slug}
                  </p>

                  {post.excerpt && (
                    <p className="font-body text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                      {post.excerpt}
                    </p>
                  )}

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-mono border border-outline-variant/60"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => handleTogglePublish(post)}
                  title={post.is_published ? "Unpublish to draft" : "Publish live to visitor portal"}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                    post.is_published
                      ? "bg-surface-tint/10 text-surface-tint border border-surface-tint/30 hover:bg-surface-tint/20"
                      : "bg-surface-tint text-black font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg border border-surface-tint"
                  }`}
                >
                  {post.is_published ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-surface-tint" />
                      <span>Live</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-black" />
                      <span>Publish to Live</span>
                    </>
                  )}
                </button>

                <a
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on site"
                  className="p-2 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint text-on-surface-variant hover:text-surface-tint transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => openEditPost(post)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface hover:text-surface-tint transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(post)}
                  className="p-2 rounded-xl bg-surface-container border border-outline-variant hover:border-error/60 text-outline hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Edit / Create Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6 md:p-8 flex flex-col gap-6 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
              <div>
                <h2 className="font-display text-lg font-bold text-on-surface">
                  {isNew ? "Create Article" : `Edit Article: ${editingPost.title}`}
                </h2>
                <p className="font-mono text-xs text-on-surface-variant mt-0.5">
                  Reading time is auto-calculated ({calculateReadTime(editingPost.content || "")}). Covers are uploaded to the post-covers bucket.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
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
              {/* Title & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Post Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPost.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Building High-Trust AI in Clinical Environments"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.title && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.title[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    URL Slug * (kebab-case)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPost.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setEditingPost({ ...editingPost, slug: e.target.value });
                    }}
                    placeholder="e.g. building-high-trust-ai"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono text-surface-tint focus:border-surface-tint focus:outline-none"
                  />
                  {fieldErrors.slug && (
                    <p className="text-[11px] text-error mt-1">{fieldErrors.slug[0]}</p>
                  )}
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block font-mono text-xs text-on-surface-variant mb-1">
                  Card Excerpt (max 500 chars)
                </label>
                <textarea
                  rows={2}
                  value={editingPost.excerpt}
                  onChange={(e) =>
                    setEditingPost({ ...editingPost, excerpt: e.target.value })
                  }
                  placeholder="A concise summary of the article takeaways..."
                  className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body text-on-surface focus:border-surface-tint focus:outline-none"
                />
              </div>

              {/* Cover Image Upload (post-covers bucket) */}
              <div className="space-y-2 p-4 rounded-xl bg-surface-container border border-outline-variant">
                <label className="block font-mono text-xs text-on-surface-variant">
                  Cover Image (Storage bucket: post-covers, max 4 MB, PNG/JPG/WEBP/GIF)
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {editingPost.cover_image_url ? (
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container-high border border-outline-variant relative shrink-0">
                      <Image
                        src={editingPost.cover_image_url}
                        alt="Post cover preview"
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-surface-container-high border border-dashed border-outline-variant flex flex-col items-center justify-center text-outline shrink-0">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-[10px] font-mono mt-1">No Cover</span>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? "Uploading..." : "Upload Cover"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleCoverSelect}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>

                      {editingPost.cover_image_url && (
                        <button
                          type="button"
                          onClick={() => setEditingPost({ ...editingPost, cover_image_url: "" })}
                          className="text-xs font-mono text-outline hover:text-error"
                        >
                          Remove Cover
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      value={editingPost.cover_image_url || ""}
                      onChange={(e) =>
                        setEditingPost({ ...editingPost, cover_image_url: e.target.value })
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

              {/* Tags Manager */}
              <div className="space-y-2">
                <label className="block font-mono text-xs text-on-surface-variant">
                  Tags & Topics
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="e.g. Next.js, AI, System Design"
                    className="flex-1 h-9 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 h-9 rounded-xl bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface hover:text-surface-tint transition-colors"
                  >
                    Add Tag
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editingPost.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface border border-outline-variant text-xs font-mono"
                    >
                      <Tag className="w-3 h-3 text-surface-tint" />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-error text-outline"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Markdown Content (Editor & Sanitized Preview Tabs) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs text-on-surface-variant flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-surface-tint" />
                    <span>Markdown Content (Live Sanitized Preview)</span>
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
                    rows={12}
                    value={editingPost.content || ""}
                    onChange={(e) =>
                      setEditingPost({
                        ...editingPost,
                        content: e.target.value,
                      })
                    }
                    placeholder="Write article in Markdown with headers, code blocks, lists, and links..."
                    className="w-full p-4 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono leading-relaxed text-on-surface focus:border-surface-tint focus:outline-none"
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-surface-container border border-outline-variant min-h-[250px] max-h-[400px] overflow-y-auto prose prose-invert prose-sm max-w-none">
                    {editingPost.content ? (
                      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                        {editingPost.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-outline italic text-xs font-mono">
                        No content written yet. Switch to Editor to compose.
                      </span>
                    )}
                  </div>
                )}
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
                      setEditingPost({
                        ...editingPost,
                        is_published: !editingPost.is_published,
                      })
                    }
                    className={`w-full h-9 px-3 rounded-lg border text-xs font-mono transition-colors flex items-center justify-center gap-1.5 ${
                      editingPost.is_published
                        ? "bg-surface-tint/20 text-surface-tint border-surface-tint"
                        : "bg-surface-container-high text-outline border-outline-variant"
                    }`}
                  >
                    {editingPost.is_published ? (
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
                    {editingPost.is_published
                      ? "Visible on /blog and home page."
                      : "Hidden from public routes."}
                  </p>
                </div>

                <div>
                  <label className="block font-mono text-xs text-on-surface-variant mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editingPost.sort_order}
                    onChange={(e) =>
                      setEditingPost({
                        ...editingPost,
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
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(undefined, false)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface hover:text-surface-tint disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(undefined, true)}
                  className="px-5 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg disabled:opacity-50 transition-all"
                >
                  {saving ? "Publishing..." : "Publish to Live Site"}
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
              Delete Article?
            </h3>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-on-surface font-mono">{deleteTarget.title}</strong>? This cannot be undone.
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

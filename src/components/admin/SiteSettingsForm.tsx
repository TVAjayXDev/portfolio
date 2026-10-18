"use client";

import React, { useState } from "react";
import { updateSiteSettings } from "@/app/admin/actions/settings";
import type { SiteSettingsInput } from "@/lib/validations/admin";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  X,
  Sparkles,
} from "lucide-react";

interface SiteSettingsFormProps {
  initialSettings: SiteSettingsInput;
}

export const SiteSettingsForm: React.FC<SiteSettingsFormProps> = ({ initialSettings }) => {
  const [formData, setFormData] = useState<SiteSettingsInput>(initialSettings);
  const [initialState] = useState<SiteSettingsInput>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Tag inputs for GitHub pinned / hidden repos
  const [newPinnedRepo, setNewPinnedRepo] = useState("");
  const [newHiddenRepo, setNewHiddenRepo] = useState("");

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFieldErrors({});

    const result = await updateSiteSettings(formData);

    setLoading(false);
    if (result.success) {
      setSuccessMessage(result.message || "Settings saved successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    }
  };

  const addPinnedRepo = () => {
    if (!newPinnedRepo.trim()) return;
    if (formData.github_pinned_repos.includes(newPinnedRepo.trim())) return;
    setFormData({
      ...formData,
      github_pinned_repos: [...formData.github_pinned_repos, newPinnedRepo.trim()],
    });
    setNewPinnedRepo("");
  };

  const removePinnedRepo = (repo: string) => {
    setFormData({
      ...formData,
      github_pinned_repos: formData.github_pinned_repos.filter((r) => r !== repo),
    });
  };

  const addHiddenRepo = () => {
    if (!newHiddenRepo.trim()) return;
    if (formData.github_hidden_repos.includes(newHiddenRepo.trim())) return;
    setFormData({
      ...formData,
      github_hidden_repos: [...formData.github_hidden_repos, newHiddenRepo.trim()],
    });
    setNewHiddenRepo("");
  };

  const removeHiddenRepo = (repo: string) => {
    setFormData({
      ...formData,
      github_hidden_repos: formData.github_hidden_repos.filter((r) => r !== repo),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-16">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant sticky top-20 z-20 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm text-on-surface">
            Global Site Configuration
          </span>
          {isDirty && (
            <span className="px-2.5 py-0.5 rounded-full bg-tertiary/20 text-tertiary text-[10px] font-mono font-semibold animate-pulse">
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface transition-all"
          >
            <span>Preview site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-surface-tint/10 border border-surface-tint/40 flex items-center gap-3 text-xs text-surface-tint font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-3 text-xs text-error font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Identity & Hero Section */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-4">
          <h2 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-surface-tint" />
            <span>Hero & Primary Identity</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body focus:border-surface-tint focus:outline-none"
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-error mt-1">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                Title / Designation
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body focus:border-surface-tint focus:outline-none"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                Hero Headline
              </label>
              <input
                type="text"
                required
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body focus:border-surface-tint focus:outline-none"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                Pitch / Subtitle
              </label>
              <textarea
                rows={3}
                required
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body focus:border-surface-tint focus:outline-none"
              />
            </div>

            {/* Availability Badge */}
            <div className="pt-2 border-t border-outline-variant/60 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-on-surface">Availability Badge</span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      availability_badge_active: !formData.availability_badge_active,
                    })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    formData.availability_badge_active ? "bg-surface-tint" : "bg-surface-container-high"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                      formData.availability_badge_active ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <input
                type="text"
                value={formData.availability_badge_text}
                onChange={(e) =>
                  setFormData({ ...formData, availability_badge_text: e.target.value })
                }
                placeholder="e.g. Open to internships"
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Contact, Links & Socials */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-4">
          <h2 className="font-display text-base font-bold text-on-surface">
            Contact & Social Profiles
          </h2>

          <div className="space-y-4">
            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                Public Inquiries Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body focus:border-surface-tint focus:outline-none"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                GitHub Profile URL
              </label>
              <input
                type="url"
                value={formData.github_url || ""}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                placeholder="https://github.com/..."
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono focus:border-surface-tint focus:outline-none"
              />
              {fieldErrors.github_url && (
                <p className="text-[11px] text-error mt-1">{fieldErrors.github_url[0]}</p>
              )}
            </div>

            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={formData.linkedin_url || ""}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://www.linkedin.com/in/..."
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono focus:border-surface-tint focus:outline-none"
              />
              {fieldErrors.linkedin_url && (
                <p className="text-[11px] text-error mt-1">{fieldErrors.linkedin_url[0]}</p>
              )}
            </div>

            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                OpenGraph / Social Share Image URL
              </label>
              <input
                type="url"
                value={formData.og_image_url || ""}
                onChange={(e) => setFormData({ ...formData, og_image_url: e.target.value })}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-mono focus:border-surface-tint focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 3: About Text & Footer Description */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-4">
          <h2 className="font-display text-base font-bold text-on-surface">
            Biographical & Footer Content
          </h2>

          <div className="space-y-4">
            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                About Statement (Nullable: section renders paragraph only when set)
              </label>
              <textarea
                rows={4}
                value={formData.about_text || ""}
                onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
                placeholder="Personal background and technical foundations statement..."
                className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body focus:border-surface-tint focus:outline-none"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                Footer Tagline / Custom Text
              </label>
              <input
                type="text"
                value={formData.footer_text || ""}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                placeholder="e.g. Crafted with precision in Next.js & Supabase"
                className="w-full h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm font-body focus:border-surface-tint focus:outline-none"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-on-surface-variant block mb-1">
                SEO Meta Description
              </label>
              <textarea
                rows={2}
                value={formData.seo_description}
                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-body focus:border-surface-tint focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 4: GitHub Integration Lists */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-4">
          <h2 className="font-display text-base font-bold text-on-surface">
            GitHub Live Feed Filtering
          </h2>

          {/* Pinned Repos */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-on-surface-variant block">
              Pinned Repositories (Forced to Top)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPinnedRepo}
                onChange={(e) => setNewPinnedRepo(e.target.value)}
                placeholder="e.g. TrustLens"
                className="flex-1 h-9 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
              />
              <button
                type="button"
                onClick={addPinnedRepo}
                className="px-3 h-9 rounded-xl bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface hover:text-surface-tint transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pin</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.github_pinned_repos.map((repo) => (
                <span
                  key={repo}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-tint/10 text-surface-tint border border-surface-tint/30 text-[11px] font-mono"
                >
                  <span>{repo}</span>
                  <button
                    type="button"
                    onClick={() => removePinnedRepo(repo)}
                    className="hover:text-error"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Hidden Repos */}
          <div className="space-y-2 pt-3 border-t border-outline-variant/60">
            <label className="font-mono text-xs text-on-surface-variant block">
              Hidden Repositories (Filtered Out of Public Feed)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHiddenRepo}
                onChange={(e) => setNewHiddenRepo(e.target.value)}
                placeholder="e.g. experimental-repo"
                className="flex-1 h-9 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono focus:border-surface-tint focus:outline-none"
              />
              <button
                type="button"
                onClick={addHiddenRepo}
                className="px-3 h-9 rounded-xl bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface hover:text-surface-tint transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Hide</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.github_hidden_repos.map((repo) => (
                <span
                  key={repo}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant border border-outline-variant text-[11px] font-mono"
                >
                  <span>{repo}</span>
                  <button
                    type="button"
                    onClick={() => removeHiddenRepo(repo)}
                    className="hover:text-error"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

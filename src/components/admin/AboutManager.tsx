"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { User, Save, CheckCircle2, AlertCircle, Code, Eye } from "lucide-react";
import { updateAboutText } from "@/app/admin/actions/settings";

interface AboutManagerProps {
  initialAboutText: string;
}

export const AboutManager: React.FC<AboutManagerProps> = ({ initialAboutText }) => {
  const [aboutText, setAboutText] = useState(initialAboutText);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const result = await updateAboutText(aboutText);
    setSaving(false);

    if (result.success) {
      setSuccessMessage(result.message || "About narrative updated successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(result.error || "Failed to update about narrative.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
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

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs text-on-surface-variant flex items-center gap-2">
              <User className="w-4 h-4 text-surface-tint" />
              <span>About Narrative (Markdown, max 2500 characters)</span>
            </label>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container border border-outline-variant text-xs font-mono">
              <button
                type="button"
                onClick={() => setTab("edit")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  tab === "edit"
                    ? "bg-surface-tint text-black font-semibold"
                    : "text-outline hover:text-on-surface"
                }`}
              >
                <Code className="w-3 h-3 inline mr-1" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setTab("preview")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  tab === "preview"
                    ? "bg-surface-tint text-black font-semibold"
                    : "text-outline hover:text-on-surface"
                }`}
              >
                <Eye className="w-3 h-3 inline mr-1" />
                Live Preview
              </button>
            </div>
          </div>

          <p className="font-body text-xs text-on-surface-variant">
            If left blank or null, the About narrative section is omitted from the public home page.
          </p>

          {tab === "edit" ? (
            <textarea
              rows={12}
              maxLength={2500}
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder="I am an undergraduate student in Computer Science & Engineering with interests in..."
              className="w-full p-4 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono leading-relaxed text-on-surface focus:border-surface-tint focus:outline-none"
            />
          ) : (
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant min-h-[250px] max-h-[400px] overflow-y-auto prose prose-invert prose-sm max-w-none">
              {aboutText ? (
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {aboutText}
                </ReactMarkdown>
              ) : (
                <span className="text-outline italic text-xs font-mono">
                  No about narrative provided. The section will be omitted on the home page.
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-mono text-outline pt-2">
            <span>{aboutText.length} / 2500 characters</span>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-tint text-black font-display text-xs font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save About Narrative"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

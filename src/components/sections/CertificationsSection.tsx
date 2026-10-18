"use client";

import React, { useState } from "react";
import { ExternalLink, Award, FileText, CheckCircle2 } from "lucide-react";
import type { Certification, SectionConfig } from "@/lib/types";

interface CertificationsSectionProps {
  certifications: Certification[];
  section?: SectionConfig;
}

function isImageFile(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|webp)(\?.*)?$/i.test(url);
}

export const CertificationsSection: React.FC<CertificationsSectionProps> = ({
  certifications,
  section,
}) => {
  const published = certifications.filter((c) => c.is_published);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Hide-if-empty: Nothing renders while there are zero published rows
  if (published.length === 0) return null;

  const title = section?.title || "Certifications";
  const subtitle =
    section?.subtitle ||
    "Verified professional credentials, cloud architectures, and specialized coursework.";

  // Filter chips built ONLY from categories that exist among published certificates
  const uniqueCategories = Array.from(
    new Set(published.map((c) => c.category).filter(Boolean))
  );

  const filtered =
    selectedCategory === "All"
      ? published
      : published.filter((c) => c.category === selectedCategory);

  return (
    <section
      id="certifications"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24 border-b border-outline-variant/60"
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-surface-tint font-mono text-xs uppercase tracking-widest block font-semibold">
              {"//"} {title}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight mt-1">
              {title}
            </h2>
          </div>

          {subtitle && (
            <p className="font-mono text-xs text-outline max-w-sm md:text-right hidden sm:block">
              {subtitle}
            </p>
          )}

          {/* Filter Chips: Rendered only when there are 2 or more distinct categories */}
          {uniqueCategories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all ${
                  selectedCategory === "All"
                    ? "bg-surface-tint text-black shadow-cyan-glow"
                    : "bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-surface-tint/40"
                }`}
              >
                All ({published.length})
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  type="button"
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? "bg-surface-tint text-black shadow-cyan-glow"
                      : "bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-surface-tint/40"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Certifications Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cert) => {
            // Determine effective thumbnail:
            // 1. Explicit thumbnail_url
            // 2. If certificate_file_url is an image, use it directly as the thumbnail
            // 3. Otherwise (PDF without thumbnail), render a clean generic PDF credential card
            const imageThumbnail =
              cert.thumbnail_url ||
              (isImageFile(cert.certificate_file_url)
                ? cert.certificate_file_url
                : null);

            return (
              <div
                key={cert.id}
                className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/40 transition-all flex flex-col justify-between shadow-sm group hover:shadow-cyan-glow/5"
              >
                <div className="flex flex-col gap-4">
                  {imageThumbnail ? (
                    <div className="w-full h-40 rounded-xl bg-surface-container border border-outline-variant relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageThumbnail}
                        alt={cert.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                      />
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-surface-container-lowest/80 text-surface-tint font-mono text-[10px] border border-surface-tint/30 flex items-center gap-1 backdrop-blur-sm">
                        <CheckCircle2 className="w-3 h-3 text-surface-tint" />
                        <span>VERIFIED</span>
                      </span>
                    </div>
                  ) : (
                    /* Clean generic PDF card for PDF certificates without custom thumbnail */
                    <div className="w-full h-32 rounded-xl bg-surface-container/60 border border-dashed border-outline-variant flex flex-col items-center justify-center gap-2 text-outline group-hover:border-surface-tint/40 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-surface-tint/10 border border-surface-tint/20 flex items-center justify-center text-surface-tint">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[11px] text-surface-tint uppercase tracking-wider">
                        Official PDF Credential
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="font-mono text-xs text-surface-tint uppercase font-semibold">
                      {cert.issuer}
                    </span>
                    <h3 className="font-display text-lg font-semibold text-on-surface mt-1 group-hover:text-surface-tint transition-colors">
                      {cert.title}
                    </h3>
                    <p className="font-body text-xs text-on-surface-variant mt-1">
                      Issued: {cert.issue_date}
                      {cert.credential_id ? ` • ID: ${cert.credential_id}` : ""}
                    </p>
                  </div>

                  {cert.skills && cert.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {cert.skills.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded bg-surface-container font-mono text-[10px] text-outline border border-outline-variant/60"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action CTAs */}
                <div className="pt-4 mt-4 border-t border-outline-variant flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {/* View Certificate (opens in new tab) */}
                    {cert.certificate_file_url && (
                      <a
                        href={cert.certificate_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint/40 text-xs font-mono transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-surface-tint" />
                        <span>View certificate</span>
                        <ExternalLink className="w-3 h-3 text-outline" />
                      </a>
                    )}

                    {/* Verify Credential (only if credential_url exists) */}
                    {cert.credential_url && (
                      <a
                        href={cert.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-tint/10 border border-surface-tint/30 text-surface-tint hover:bg-surface-tint/20 text-xs font-mono transition-colors"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Verify credential</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

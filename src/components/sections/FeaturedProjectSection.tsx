import React from "react";
import Link from "next/link";
import { ExternalLink, Github, ArrowRight, ShieldCheck, FileCheck, CheckCircle2 } from "lucide-react";
import type { Project, SectionConfig } from "@/lib/types";

interface FeaturedProjectSectionProps {
  project: Project;
  section?: SectionConfig;
}

export const FeaturedProjectSection: React.FC<FeaturedProjectSectionProps> = ({ project, section }) => {
  const title = section?.title || "Featured Project";

  return (
    <section
      id="featured-project"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24 border-b border-outline-variant/60"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-surface-tint font-mono text-xs uppercase tracking-widest font-semibold">
            {"//"} {title}
          </h2>
          <span className="px-3 py-1 rounded-full bg-surface-tint/10 border border-surface-tint/40 text-surface-tint font-mono text-xs">
            Featured
          </span>
        </div>

        {/* Card Container */}
        <div
          className={`p-6 md:p-10 rounded-2xl bg-surface-container-low border border-surface-tint/40 shadow-cyan-card flex flex-col ${
            project.image_url ? "lg:flex-row gap-8 items-center" : "gap-6"
          }`}
        >
          {/* Left: Project Narrative */}
          <div className={`${project.image_url ? "lg:w-1/2" : "w-full max-w-3xl"} flex flex-col items-start gap-4`}>
            <div className="flex items-center gap-3">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                {project.title}
              </h3>
              <span className="px-2.5 py-0.5 rounded bg-surface-tint/20 text-surface-tint font-mono text-[11px] border border-surface-tint/30 uppercase font-semibold">
                {project.status.toUpperCase()}
              </span>
            </div>

            {project.team && (
              <span className="font-mono text-xs text-outline">
                Team: <span className="text-on-surface font-medium">{project.team}</span>
              </span>
            )}

            <p className="font-body text-base text-on-surface-variant leading-relaxed">
              {project.description}
            </p>

            {/* Technologies tags (only rendered if non-empty) */}
            {project.technologies && project.technologies.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-md bg-surface-container font-mono text-xs text-on-surface border border-outline-variant"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {/* Core Capabilities Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full py-2">
              <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
                <CheckCircle2 className="w-4 h-4 text-surface-tint shrink-0" />
                <span>Document Grounded</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
                <FileCheck className="w-4 h-4 text-surface-tint shrink-0" />
                <span>Paragraph-Level Citations</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
                <ShieldCheck className="w-4 h-4 text-surface-tint shrink-0" />
                <span>Conflict Detection</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
                <CheckCircle2 className="w-4 h-4 text-surface-tint shrink-0" />
                <span>Provenance Audit Trail</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {project.demo_url && (
                <a
                  href={project.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-surface-tint text-black font-display text-sm font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg hover:scale-[1.02] transition-all flex items-center gap-2"
                >
                  <span>Live Demo</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {project.github_url && (
                <a
                  href={project.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint/50 transition-colors flex items-center gap-2 font-display text-sm"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </a>
              )}

              {project.content && project.content.trim().length > 0 && (
                <Link
                  href={`/projects/${project.slug}`}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-surface-tint hover:underline py-2.5 px-3"
                >
                  <span>Read Full Case Study</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Screenshot slot: renders ONLY when image_url exists */}
          {project.image_url && (
            <div className="lg:w-1/2 w-full rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden shadow-2xl flex flex-col">
              <div className="px-4 py-2 bg-surface-container flex items-center justify-between border-b border-outline-variant">
                <span className="font-mono text-xs text-outline">{project.title}</span>
                <span className="font-mono text-[10px] text-surface-tint bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant">
                  Illustrative example, synthetic demo data
                </span>
              </div>
              <div className="relative aspect-video w-full overflow-hidden bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.image_url}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

import React from "react";
import Link from "next/link";
import { ExternalLink, Github, ArrowRight, FolderGit2 } from "lucide-react";
import type { Project, SectionConfig } from "@/lib/types";

interface ProjectsSectionProps {
  projects: Project[];
  section?: SectionConfig;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({ projects, section }) => {
  // Hide-if-empty: renders nothing if there are no non-featured live/completed projects
  if (!projects || projects.length === 0) return null;

  const title = section?.title || "Other Projects";
  const subtitle =
    section?.subtitle ||
    "Completed engineering projects, live tools, and open-source applications.";

  return (
    <section
      id="projects"
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
            <p className="font-mono text-xs text-outline max-w-md md:text-right">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-6 md:p-8 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-cyan-glow/10"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full font-mono text-xs uppercase font-semibold border ${
                      project.status === "live"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-surface-tint/10 text-surface-tint border-surface-tint/30"
                    }`}
                  >
                    {project.status === "live" ? "Live Production" : "Completed"}
                  </span>
                  <FolderGit2 className="w-4 h-4 text-outline group-hover:text-surface-tint transition-colors" />
                </div>

                {project.image_url && (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-surface-container border border-outline-variant">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div>
                  <h3 className="font-display text-xl font-bold text-on-surface group-hover:text-surface-tint transition-colors">
                    {project.content && project.content.trim().length > 0 ? (
                      <Link href={`/projects/${project.slug}`}>
                        {project.title}
                      </Link>
                    ) : (
                      <span>{project.title}</span>
                    )}
                  </h3>

                  {project.tagline && (
                    <p className="font-mono text-xs text-surface-tint mt-1">
                      {"//"} {project.tagline}
                    </p>
                  )}

                  {project.description && (
                    <p className="font-body text-sm text-on-surface-variant mt-2 leading-relaxed line-clamp-3">
                      {project.description}
                    </p>
                  )}
                </div>

                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded bg-surface-container font-mono text-[11px] text-outline border border-outline-variant/60"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {project.demo_url && (
                    <a
                      href={project.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-surface-tint hover:bg-surface-container transition-colors"
                      title="Live Demo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-surface-tint hover:bg-surface-container transition-colors"
                      title="Source Code"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {project.content && project.content.trim().length > 0 && (
                  <Link
                    href={`/projects/${project.slug}`}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-surface-tint hover:underline"
                  >
                    <span>Case Study</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

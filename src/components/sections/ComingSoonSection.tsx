import React from "react";
import { Clock, Compass, Sparkles } from "lucide-react";
import type { Project, SectionConfig } from "@/lib/types";

interface ComingSoonSectionProps {
  projects: Project[];
  section?: SectionConfig;
}

export const ComingSoonSection: React.FC<ComingSoonSectionProps> = ({ projects, section }) => {
  if (projects.length === 0) return null;

  const title = section?.title || "In Progress & Upcoming";
  const subtitle = section?.subtitle || "Active projects in development and planned roadmaps.";

  const renderBadge = (status: Project["status"]) => {
    switch (status) {
      case "planned":
        return (
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono text-xs flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            Planned
          </span>
        );
      case "coming_soon":
        return (
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Coming Soon
          </span>
        );
      case "in_progress":
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-tertiary-container/10 border border-tertiary-container/30 text-tertiary font-mono text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
            In Progress
          </span>
        );
    }
  };

  return (
    <section
      id="coming-soon"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24 border-b border-outline-variant/60"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-surface-tint font-mono text-xs uppercase tracking-widest block font-semibold">
              {"//"} {title}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight mt-1">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="hidden sm:block font-mono text-xs text-outline max-w-xs text-right">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-6 md:p-8 rounded-2xl bg-surface-container-low/60 border border-dashed border-outline-variant hover:border-surface-tint/50 transition-colors flex flex-col justify-between group shadow-sm"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  {renderBadge(project.status)}
                  <Clock className="w-4 h-4 text-outline group-hover:text-surface-tint transition-colors" />
                </div>

                <h3 className="font-display text-xl sm:text-2xl text-on-surface font-semibold mt-1">
                  {project.title}
                </h3>

                {/* Tagline rendered ONLY if present */}
                {project.tagline && (
                  <p className="font-mono text-xs text-surface-tint">
                    {project.tagline}
                  </p>
                )}

                {/* Description rendered ONLY if present */}
                {project.description && (
                  <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                    {project.description}
                  </p>
                )}

                {/* Technologies tags if present */}
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded bg-surface-container font-mono text-[10px] text-outline border border-outline-variant/60"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

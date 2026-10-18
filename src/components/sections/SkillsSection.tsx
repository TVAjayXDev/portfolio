import React from "react";
import { Code2, Layers, Database, Cpu } from "lucide-react";
import type { Skill, SectionConfig } from "@/lib/types";

interface SkillsSectionProps {
  skills: Skill[];
  section?: SectionConfig;
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({ skills, section }) => {
  if (skills.length === 0) return null;

  const title = section?.title || "Skills";
  const subtitle = section?.subtitle || "Technical capabilities and tools.";

  // Group published skills by category
  const categories = Array.from(new Set(skills.map((s) => s.category)));

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "languages":
        return <Code2 className="w-5 h-5 text-surface-tint" />;
      case "frameworks":
        return <Layers className="w-5 h-5 text-surface-tint" />;
      case "cloud & db":
      case "databases":
        return <Database className="w-5 h-5 text-surface-tint" />;
      default:
        return <Cpu className="w-5 h-5 text-surface-tint" />;
    }
  };

  return (
    <section
      id="skills"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24 border-b border-outline-variant/60"
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-surface-tint font-mono text-xs uppercase tracking-widest block font-semibold">
              {"//"} {title}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight mt-1">
              {title}
            </h2>
          </div>
          <p className="font-mono text-xs text-outline max-w-md">
            {subtitle}
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const categorySkills = skills.filter((s) => s.category === category);
            return (
              <div
                key={category}
                className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/40 transition-colors flex flex-col gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-outline-variant">
                  {getCategoryIcon(category)}
                  <h3 className="font-display text-lg font-semibold text-on-surface">
                    {category}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skill) => (
                    <span
                      key={skill.id}
                      className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-mono text-xs border border-outline-variant hover:border-surface-tint/40 transition-colors"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

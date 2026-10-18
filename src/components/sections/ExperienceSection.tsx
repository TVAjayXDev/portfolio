import React from "react";
import { Terminal } from "lucide-react";
import type { Experience, SectionConfig } from "@/lib/types";

interface ExperienceSectionProps {
  experience: Experience[];
  section?: SectionConfig;
}

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({ experience, section }) => {
  const published = experience.filter((e) => e.is_published);
  if (published.length === 0) return null;

  const title = section?.title || "Experience";

  return (
    <section
      id="experience"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24 border-b border-outline-variant/60"
    >
      <div className="flex flex-col gap-6">
        <div>
          <span className="text-surface-tint font-mono text-xs uppercase tracking-widest block font-semibold">
            {"//"} {title}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight mt-1">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {published.map((item) => (
            <div
              key={item.id}
              className="p-6 md:p-8 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/40 transition-colors flex flex-col justify-between shadow-sm"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded bg-surface-container text-on-surface-variant font-mono text-xs border border-outline-variant uppercase">
                    {item.role}
                  </span>
                  <Terminal className="w-5 h-5 text-surface-tint" />
                </div>

                <h3 className="font-display text-xl text-on-surface font-semibold mt-1">
                  {item.organization}
                </h3>

                {/* Location rendered only if non-null */}
                {item.location && (
                  <span className="font-mono text-xs text-outline">
                    {item.location}
                  </span>
                )}

                {/* Dates rendered only if present */}
                {(item.start_date || item.end_date) && (
                  <span className="font-mono text-xs text-surface-tint">
                    {item.start_date && item.end_date
                      ? `${item.start_date} – ${item.end_date}`
                      : item.start_date || item.end_date}
                  </span>
                )}

                {/* Description rendered only if non-null */}
                {item.description && (
                  <p className="font-body text-sm text-on-surface-variant mt-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

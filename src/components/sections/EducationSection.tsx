import React from "react";
import type { Education, SectionConfig } from "@/lib/types";

interface EducationSectionProps {
  education: Education[];
  section?: SectionConfig;
}

export const EducationSection: React.FC<EducationSectionProps> = ({ education, section }) => {
  const published = education.filter((e) => e.is_published);
  if (published.length === 0) return null;

  const title = section?.title || "Education";
  const subtitle = section?.subtitle || "Academic qualifications and technical foundations.";

  return (
    <section
      id="education"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24 border-b border-outline-variant/60"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <span className="text-surface-tint font-mono text-xs uppercase tracking-widest block font-semibold">
            {"//"} {title}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight mt-1">
            {title}
          </h2>
          <p className="font-body text-sm text-on-surface-variant mt-2 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Right Column: Timeline */}
        <div className="lg:col-span-8 relative pl-6 md:pl-10">
          {/* Vertical Dotted Connecting Line */}
          <div className="absolute left-2.5 md:left-4 top-3 bottom-6 w-px border-l border-dashed border-surface-tint/40" />

          <div className="flex flex-col gap-8">
            {published.map((item) => (
              <div key={item.id} className="relative flex items-start gap-4 group">
                {/* Glowing Node */}
                <div className="absolute -left-[29px] md:-left-[37px] top-1.5 w-4 h-4 rounded-full bg-surface-container-lowest border-2 border-surface-tint flex items-center justify-center shadow-[0_0_12px_rgba(0,217,255,0.7)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-tint" />
                </div>

                {/* Card Container */}
                <div className="w-full p-6 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/40 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {item.start_year && item.end_year && (
                      <span className="font-mono text-xs text-surface-tint uppercase font-semibold">
                        {item.start_year} – {item.end_year}
                      </span>
                    )}
                    {item.grade && (
                      <span className="px-2.5 py-0.5 rounded bg-surface-tint/10 text-surface-tint font-mono text-xs border border-surface-tint/30">
                        {item.grade.toUpperCase().includes("CGPA") || item.grade.includes("%")
                          ? item.grade
                          : !isNaN(Number(item.grade)) && Number(item.grade) <= 10
                          ? `CGPA ${item.grade}`
                          : item.grade.length > 0 && !isNaN(Number(item.grade))
                          ? `${item.grade}%`
                          : item.grade}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-xl text-on-surface font-semibold mt-2">
                    {item.degree}
                    {item.field_of_study ? ` (${item.field_of_study})` : ""}
                  </h3>
                  <p className="font-mono text-sm text-outline mt-0.5">
                    {item.institution}
                  </p>

                  {/* Description rendered only if non-null and non-empty */}
                  {item.description && (
                    <p className="font-body text-sm text-on-surface-variant mt-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

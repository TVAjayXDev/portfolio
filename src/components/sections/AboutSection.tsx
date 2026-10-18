import React from "react";
import { GraduationCap, Calendar, Award, User } from "lucide-react";
import type { SiteSettings, Education, SectionConfig } from "@/lib/types";

interface AboutSectionProps {
  settings: SiteSettings;
  primaryEducation: Education | null;
  section?: SectionConfig;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  settings,
  primaryEducation,
  section,
}) => {
  const title = section?.title || "About";

  return (
    <section
      id="about"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24 border-b border-outline-variant/60"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Narrative */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 text-surface-tint font-mono text-xs uppercase tracking-widest font-semibold">
            <User className="w-4 h-4" />
            {"//"} {title}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight">
            Engineering Grounded in Practicality
          </h2>
          {settings.about_text && (
            <p className="font-body text-sm sm:text-base text-on-surface-variant leading-relaxed mt-2 whitespace-pre-line">
              {settings.about_text}
            </p>
          )}
        </div>

        {/* Right Column: Real Metric Cards (Derived strictly from verified published education) */}
        {primaryEducation && (
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Degree Card */}
            <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between text-outline">
                <span className="font-mono text-xs uppercase tracking-wider">Degree</span>
                <GraduationCap className="w-5 h-5 text-surface-tint" />
              </div>
              <div className="mt-4">
                <span className="font-display text-2xl font-bold text-on-surface">
                  {primaryEducation.degree.includes("B.E.") ? "B.E. CSE" : primaryEducation.degree}
                </span>
                <p className="font-body text-xs text-on-surface-variant mt-1 line-clamp-1">
                  {primaryEducation.institution}
                </p>
              </div>
              {primaryEducation.current_semester && (
                <span className="font-mono text-xs text-surface-tint mt-3">
                  {primaryEducation.current_semester}
                </span>
              )}
            </div>

            {/* Graduation Year Card */}
            {primaryEducation.end_year && (
              <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/40 transition-colors flex flex-col justify-between">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-mono text-xs uppercase tracking-wider">Cohort</span>
                  <Calendar className="w-5 h-5 text-surface-tint" />
                </div>
                <div className="mt-4">
                  <span className="font-display text-2xl font-bold text-on-surface">
                    {primaryEducation.end_year}
                  </span>
                  <p className="font-body text-xs text-on-surface-variant mt-1">
                    Graduation Year
                  </p>
                </div>
                {primaryEducation.start_year && (
                  <span className="font-mono text-xs text-outline mt-3">
                    {primaryEducation.start_year} – {primaryEducation.end_year}
                  </span>
                )}
              </div>
            )}

            {/* CGPA Card */}
            {primaryEducation.grade && (
              <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/40 transition-colors flex flex-col justify-between">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-mono text-xs uppercase tracking-wider">CGPA</span>
                  <Award className="w-5 h-5 text-surface-tint" />
                </div>
                <div className="mt-4">
                  <span className="font-display text-2xl font-bold text-surface-tint">
                    {primaryEducation.grade.replace("CGPA", "").trim()}
                  </span>
                  <p className="font-body text-xs text-on-surface-variant mt-1">
                    CGPA
                  </p>
                </div>
                <span className="font-mono text-xs text-surface-tint mt-3">
                  VTU
                </span>
              </div>
            )}
            <div className="flex items-center justify-end sm:col-span-3 pt-1">
              <a
                href="#education"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-surface-tint hover:underline transition-colors"
              >
                <span>Academic Path &amp; Qualifications</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

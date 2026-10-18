import React from "react";
import { HeroWireframe } from "@/components/ui/HeroWireframe";
import { ArrowDown, Download, Github, Linkedin } from "lucide-react";
import type { SiteSettings } from "@/lib/types";

interface HeroSectionProps {
  settings: SiteSettings;
  hasProjects: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ settings, hasProjects }) => {
  return (
    <section
      id="hero"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-16 md:pb-24 border-b border-outline-variant/60"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Bio & CTAs */}
        <div className="lg:col-span-7 flex flex-col items-start gap-4">
          {/* Availability Badge (Only if active) */}
          {settings.availability_badge_active && (
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-tint/10 border border-surface-tint/30 shadow-[0_0_15px_rgba(0,217,255,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-surface-tint opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-surface-tint" />
              </span>
              <span className="font-mono text-xs text-surface-tint tracking-wider uppercase font-semibold">
                {settings.availability_badge_text}
              </span>
            </div>
          )}

          {/* Hero Headline */}
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-on-surface tracking-tight leading-tight">
              {settings.headline || settings.name}
            </h1>
            <p className="font-mono text-xs sm:text-sm text-surface-tint tracking-widest uppercase font-semibold">
              {"//"} {settings.title}
            </p>
          </div>

          {/* Subtitle / Pitch */}
          <p className="font-body text-base md:text-lg text-on-surface-variant max-w-xl leading-relaxed">
            {settings.subtitle}
          </p>

          {/* CTA Action Cluster */}
          <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
            {hasProjects && (
              <a
                href="#featured-project"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface-tint text-black font-display font-semibold text-sm shadow-cyan-glow hover:shadow-cyan-glow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <span>View Projects</span>
                <ArrowDown className="w-4 h-4" />
              </a>
            )}

            {/* Resume button: strictly rendered ONLY if resume_url is not null/empty */}
            {settings.resume_url && (
              <a
                href={
                  settings.resume_url.includes("download=")
                    ? settings.resume_url
                    : `${settings.resume_url}${
                        settings.resume_url.includes("?") ? "&" : "?"
                      }download=T_V_Ajay_Resume.pdf`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint/60 hover:bg-surface-container transition-all duration-200 group"
              >
                <Download className="w-4 h-4 text-surface-tint group-hover:translate-y-0.5 transition-transform" />
                <span className="font-display text-sm font-medium">Download Resume</span>
              </a>
            )}

            {/* Social Links */}
            <div className="flex items-center gap-2 border-l border-outline-variant pl-4">
              {settings.github_url && (
                <a
                  href={settings.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/40 transition-colors"
                  title="GitHub Profile"
                >
                  <Github className="w-5 h-5" />
                </a>
              )}
              {settings.linkedin_url && (
                <a
                  href={settings.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/40 transition-colors"
                  title="LinkedIn Profile"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Hero Cyber Wireframe */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <HeroWireframe />
        </div>
      </div>
    </section>
  );
};

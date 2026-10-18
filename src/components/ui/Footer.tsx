import React from "react";
import { MonogramLogo } from "./MonogramLogo";
import { Github, Linkedin, Mail } from "lucide-react";

interface FooterProps {
  hasAbout?: boolean;
  hasCertificates?: boolean;
  hasBlog?: boolean;
  hasProjects?: boolean;
  hasExperience?: boolean;
  hasEducation?: boolean;
  hasSkills?: boolean;
  hasGithub?: boolean;
  resumeUrl?: string | null;
}

export const Footer: React.FC<FooterProps> = ({
  hasAbout = true,
  hasCertificates = false,
  hasBlog = false,
  hasProjects = true,
  hasExperience = true,
  hasEducation = true,
  hasSkills = true,
  hasGithub = false,
  resumeUrl = null,
}) => {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: "About", href: "/#about", show: hasAbout, external: false },
    { label: "Skills", href: "/#skills", show: hasSkills, external: false },
    { label: "Projects", href: "/#projects", show: hasProjects, external: false },
    { label: "Code", href: "/#github", show: hasGithub, external: false },
    { label: "Education", href: "/#education", show: hasEducation, external: false },
    { label: "Experience", href: "/#experience", show: hasExperience, external: false },
    { label: "Certifications", href: "/#certifications", show: hasCertificates, external: false },
    { label: "Blog", href: "/#blog", show: hasBlog, external: false },
    { label: "Contact", href: "/#contact", show: true, external: false },
    { label: "Resume", href: resumeUrl || "", show: !!resumeUrl, external: true },
  ].filter((item) => item.show);

  return (
    <footer className="w-full bg-surface-container-lowest border-t border-outline-variant mt-16 md:mt-24">
      <div className="max-w-[1360px] mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Brand identity */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <MonogramLogo size="sm" />
          <p className="font-mono text-xs text-outline text-center md:text-left">
            Computer Science Engineering Student • VTU
          </p>
        </div>

        {/* Quick navigation (hide-if-empty) */}
        <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-6 text-sm text-on-surface-variant">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="hover:text-surface-tint transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Social connections & copyright */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/TVAjayXDev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Profile: TVAjayXDev"
              className="p-2 rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/40 transition-colors"
              title="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/t-v-ajay-b047013a5/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn Profile: T V Ajay"
              className="p-2 rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/40 transition-colors"
              title="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="mailto:tvajay0@gmail.com"
              aria-label="Direct Email: tvajay0@gmail.com"
              className="p-2 rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/40 transition-colors"
              title="Email"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
          <span className="font-mono text-xs text-outline">
            © {currentYear} T V Ajay. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
};

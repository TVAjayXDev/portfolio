"use client";

import React, { useState } from "react";
import { MonogramLogo } from "./MonogramLogo";
import { Search, Github, Linkedin, Menu, X, FileDown } from "lucide-react";

interface HeaderProps {
  hasAbout?: boolean;
  hasCertificates?: boolean;
  hasBlog?: boolean;
  hasProjects?: boolean;
  hasExperience?: boolean;
  hasEducation?: boolean;
  hasSkills?: boolean;
  hasGithub?: boolean;
  resumeUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasAbout = true,
  hasCertificates = false,
  hasBlog = false,
  hasProjects = true,
  hasExperience = true,
  hasEducation = true,
  hasSkills = true,
  hasGithub = false,
  resumeUrl = null,
  githubUrl = "https://github.com/TVAjayXDev",
  linkedinUrl = "https://www.linkedin.com/in/t-v-ajay-b047013a5/",
  onOpenCommandPalette,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleOpenPalette = () => {
    if (onOpenCommandPalette) {
      onOpenCommandPalette();
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    }
  };

  const navLinks = [
    { label: "About", href: "/#about", show: hasAbout },
    { label: "Skills", href: "/#skills", show: hasSkills },
    { label: "Projects", href: "/#projects", show: hasProjects },
    { label: "Code", href: "/#github", show: hasGithub },
    { label: "Education", href: "/#education", show: hasEducation },
    { label: "Experience", href: "/#experience", show: hasExperience },
    { label: "Certifications", href: "/#certifications", show: hasCertificates },
    { label: "Blog", href: "/#blog", show: hasBlog },
    { label: "Contact", href: "/#contact", show: true },
  ].filter((item) => item.show);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#111118]/85 backdrop-blur-md border-b border-outline-variant">
      {/* Skip to Content for Screen Readers & Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-surface-tint focus:text-[#111118] focus:font-display focus:font-semibold focus:text-sm focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to content
      </a>

      <div className="h-16 max-w-[1360px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Monogram Brand */}
        <MonogramLogo size="md" />

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden xl:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-on-surface-variant hover:text-surface-tint hover:border-b-2 hover:border-surface-tint pb-0.5 transition-all"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action cluster */}
        <div className="flex items-center gap-3">
          {/* Download Resume Button (only when resumeUrl exists) */}
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint text-xs font-mono font-medium transition-colors"
              title="Download Resume (PDF)"
            >
              <FileDown className="w-3.5 h-3.5 text-surface-tint" />
              <span className="hidden sm:inline">Resume</span>
            </a>
          )}

          {/* Quick Search Ctrl+K Button */}
          <button
            onClick={handleOpenPalette}
            type="button"
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface-variant hover:border-surface-tint hover:text-surface-tint transition-all group"
            title="Search commands and sections (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-outline group-hover:text-surface-tint transition-colors" />
            <span className="font-mono text-xs uppercase tracking-wider">Search</span>
            <kbd className="font-mono text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-outline border border-outline-variant group-hover:border-surface-tint/50">
              Ctrl K
            </kbd>
          </button>

          {/* Social Links */}
          {(githubUrl || linkedinUrl) && (
            <div className="hidden sm:flex items-center gap-1 border-l border-outline-variant pl-3">
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Profile"
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-surface-tint hover:bg-surface-container transition-colors"
                  title="GitHub Profile"
                >
                  <Github className="w-4 h-4" />
                </a>
              )}
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn Profile"
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-surface-tint hover:bg-surface-container transition-colors"
                  title="LinkedIn Profile"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-surface-tint hover:bg-surface-container"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav-drawer"
          aria-label="Mobile Navigation"
          className="xl:hidden border-b border-outline-variant bg-surface-container-low px-4 py-4 space-y-2"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-on-surface hover:text-surface-tint hover:bg-surface-container text-sm transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-outline-variant flex flex-col gap-2">
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-tint hover:bg-surface-container text-xs font-mono transition-colors"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Resume (PDF)</span>
              </a>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenPalette();
                }}
                className="flex items-center gap-2 text-xs font-mono text-surface-tint"
              >
                <Search className="w-4 h-4" /> Open Command Palette (Ctrl+K)
              </button>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/TVAjayXDev"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-on-surface-variant hover:text-surface-tint"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/t-v-ajay-b047013a5/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-on-surface-variant hover:text-surface-tint"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </nav>
    )}
  </header>
  );
};

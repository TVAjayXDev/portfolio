"use client";

import React, { useEffect } from "react";
import { Command } from "cmdk";
import {
  Search,
  User,
  Sparkles,
  Code2,
  BookOpen,
  Mail,
  GraduationCap,
  Award,
  Briefcase,
  Github,
  Linkedin,
  FileDown,
  Terminal,
  ExternalLink,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  hasResume?: boolean;
  resumeUrl?: string | null;
  hasAbout?: boolean;
  hasCertificates?: boolean;
  hasBlog?: boolean;
  hasProjects?: boolean;
  hasExperience?: boolean;
  hasEducation?: boolean;
  hasSkills?: boolean;
  hasGithub?: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  hasResume = false,
  resumeUrl = null,
  hasAbout = true,
  hasCertificates = false,
  hasBlog = false,
  hasProjects = false,
  hasExperience = false,
  hasEducation = false,
  hasSkills = false,
  hasGithub = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigateTo = (hash: string) => {
    onClose();
    if (hash.startsWith("http")) {
      window.open(hash, "_blank", "noopener,noreferrer");
    } else {
      window.location.hash = hash;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 bg-[#0e0e14]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-surface-container-low border border-outline shadow-deep-modal overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Global Command Palette" className="w-full flex flex-col">
          {/* Search Input Bar */}
          <div className="p-4 border-b border-outline flex items-center gap-3">
            <Search className="w-5 h-5 text-surface-tint shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Type a command, project, or section..."
              className="w-full bg-transparent text-on-surface font-body text-sm placeholder:text-outline focus:outline-none"
            />
            <kbd className="px-2 py-0.5 rounded bg-surface-container font-mono text-xs text-outline border border-outline">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <Command.List className="p-3 flex flex-col gap-1 max-h-80 overflow-y-auto">
            <Command.Empty className="p-4 text-center text-sm text-outline font-mono">
              No matching commands found.
            </Command.Empty>

            {/* Navigation Group */}
            <Command.Group
              heading="NAVIGATION"
              className="font-mono text-[11px] text-outline px-2 py-1 uppercase tracking-wider"
            >
              {hasAbout && (
                <Command.Item
                  onSelect={() => navigateTo("#about")}
                  className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-outline" />
                    <span>01 About & Profile</span>
                  </div>
                  <span className="font-mono text-xs text-outline">Jump</span>
                </Command.Item>
              )}

              {hasProjects && (
                <Command.Item
                  onSelect={() => navigateTo("#featured-project")}
                  className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-surface-tint" />
                    <span>03 Featured Project</span>
                  </div>
                  <span className="font-mono text-xs text-outline">Jump</span>
                </Command.Item>
              )}

              {hasGithub && (
                <Command.Item
                  onSelect={() => navigateTo("#github")}
                  className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Github className="w-4 h-4 text-outline" />
                    <span>04 Live GitHub Repositories</span>
                  </div>
                  <span className="font-mono text-xs text-outline">Code</span>
                </Command.Item>
              )}

              {hasSkills && (
                <Command.Item
                  onSelect={() => navigateTo("#skills")}
                  className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Code2 className="w-4 h-4 text-outline" />
                    <span>02 Technical Stack & Tools</span>
                  </div>
                  <span className="font-mono text-xs text-outline">Jump</span>
                </Command.Item>
              )}

              {hasEducation && (
                <Command.Item
                  onSelect={() => navigateTo("#education")}
                  className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-outline" />
                    <span>06 Academic Path & Education</span>
                  </div>
                  <span className="font-mono text-xs text-outline">Jump</span>
                </Command.Item>
              )}

              {hasExperience && (
                <Command.Item
                  onSelect={() => navigateTo("#experience")}
                  className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-outline" />
                    <span>07 Milestones & Hackathons</span>
                  </div>
                  <span className="font-mono text-xs text-outline">Jump</span>
                </Command.Item>
              )}

              {hasCertificates && (
                <Command.Item
                  onSelect={() => navigateTo("#certifications")}
                  className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-outline" />
                    <span>08 Verified Certifications</span>
                  </div>
                  <span className="font-mono text-xs text-outline">Jump</span>
                </Command.Item>
              )}

              {hasBlog && (
                <Command.Item
                  onSelect={() => navigateTo("#blog")}
                  className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-outline" />
                    <span>09 Engineering Logs & Articles</span>
                  </div>
                  <span className="font-mono text-xs text-outline">Read</span>
                </Command.Item>
              )}

              <Command.Item
                onSelect={() => navigateTo("#contact")}
                className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-outline" />
                  <span>10 Transmission / Contact</span>
                </div>
                <span className="font-mono text-xs text-outline">Direct</span>
              </Command.Item>
            </Command.Group>

            {/* Actions & External Links */}
            <Command.Group
              heading="LINKS & ACTIONS"
              className="font-mono text-[11px] text-outline px-2 py-1 uppercase tracking-wider mt-2"
            >
              {hasResume && resumeUrl && (
                <Command.Item
                  onSelect={() => navigateTo(resumeUrl)}
                  className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <FileDown className="w-4 h-4 text-surface-tint" />
                    <span>Download Official Resume (PDF)</span>
                  </div>
                  <span className="font-mono text-xs text-surface-tint">File</span>
                </Command.Item>
              )}

              <Command.Item
                onSelect={() => navigateTo("https://github.com/TVAjayXDev")}
                className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Github className="w-4 h-4 text-outline" />
                  <span>GitHub Profile (TVAjayXDev)</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-outline" />
              </Command.Item>

              <Command.Item
                onSelect={() =>
                  navigateTo("https://www.linkedin.com/in/t-v-ajay-b047013a5/")
                }
                className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Linkedin className="w-4 h-4 text-outline" />
                  <span>LinkedIn Profile</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-outline" />
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  navigator.clipboard.writeText("tvajay0@gmail.com");
                  alert("Copied tvajay0@gmail.com to clipboard!");
                  onClose();
                }}
                className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container hover:text-surface-tint flex items-center justify-between text-sm cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-4 h-4 text-surface-tint" />
                  <span>Copy Direct Email (tvajay0@gmail.com)</span>
                </div>
                <span className="font-mono text-xs text-outline">Clipboard</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Palette Footer */}
          <div className="px-4 py-2.5 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between font-mono text-xs text-outline">
            <span>Use ↑↓ to navigate • ↵ to select</span>
            <span>T V Ajay • Portfolio</span>
          </div>
        </Command>
      </div>
    </div>
  );
};

import React from "react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { CommandPaletteManager } from "@/components/ui/CommandPaletteManager";

import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { FeaturedProjectSection } from "@/components/sections/FeaturedProjectSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ComingSoonSection } from "@/components/sections/ComingSoonSection";
import { GitHubSection } from "@/components/sections/GitHubSection";
import { EducationSection } from "@/components/sections/EducationSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { CertificationsSection } from "@/components/sections/CertificationsSection";
import { BlogSection } from "@/components/sections/BlogSection";
import dynamic from "next/dynamic";

const ContactSection = dynamic(
  () => import("@/components/sections/ContactSection").then((m) => m.ContactSection),
  { ssr: true }
);

import type {
  SiteSettings,
  SectionConfig,
  Project,
  Skill,
  Education,
  Experience,
  Certification,
  Post,
  GitHubRepo,
} from "@/lib/types";

interface HomeClientViewProps {
  settings: SiteSettings;
  sections: SectionConfig[];
  projects: Project[];
  skills: Skill[];
  education: Education[];
  experience: Experience[];
  certifications: Certification[];
  posts: Post[];
  githubRepos?: GitHubRepo[];
}

export const HomeClientView: React.FC<HomeClientViewProps> = ({
  settings,
  sections,
  projects,
  skills,
  education,
  experience,
  certifications,
  posts,
  githubRepos = [],
}) => {
  // Split projects by status and featured status
  const featuredProject = projects.find((p) => p.is_featured);
  const otherProjects = projects.filter(
    (p) => !p.is_featured && (p.status === "live" || p.status === "completed")
  );
  const comingSoonProjects = projects.filter(
    (p) =>
      !p.is_featured &&
      (p.status === "in_progress" ||
        p.status === "coming_soon" ||
        p.status === "planned")
  );

  const hasFeatured = !!featuredProject;
  const hasOtherProjects = otherProjects.length > 0;
  const hasFinishedProjects = hasFeatured || hasOtherProjects;
  const hasComingSoon = comingSoonProjects.length > 0;
  const hasSkills = skills.length > 0;
  const hasEducation = education.length > 0;
  const hasExperience = experience.length > 0;
  const hasCertifications = certifications.length > 0;
  const hasBlog = posts.length > 0;
  const hasGithub = githubRepos && githubRepos.length > 0;
  const hasResume = !!settings.resume_url;

  // Friendly download URL for resume
  const resumeDownloadUrl = settings.resume_url
    ? settings.resume_url.includes("download=")
      ? settings.resume_url
      : `${settings.resume_url}${
          settings.resume_url.includes("?") ? "&" : "?"
        }download=T_V_Ajay_Resume.pdf`
    : null;

  // Primary education for About metrics
  const primaryEducation = education.length > 0 ? education[0] : null;

  // Determine section visibility based on:
  // 1. sections.is_visible
  // 2. has published content (hide-if-empty)
  const isSectionActive = (id: string): boolean => {
    const sec = sections.find((s) => s.id === id);
    if (sec && !sec.is_visible) return false;

    switch (id) {
      case "hero":
        return true;
      case "about":
        return hasEducation;
      case "skills":
        return hasSkills;
      case "featured_project":
        return hasFeatured;
      case "projects":
        return hasOtherProjects;
      case "coming_soon":
        return hasComingSoon;
      case "github":
        return Boolean(hasGithub);
      case "education":
        return hasEducation;
      case "experience":
        return hasExperience;
      case "certifications":
        return hasCertifications;
      case "blog":
        return hasBlog;
      case "contact":
        return true;
      default:
        return false;
    }
  };

  // Sort sections by database sort_order
  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);

  // Render a specific section by ID
  const renderSection = (id: string) => {
    if (!isSectionActive(id)) return null;

    const secConfig = sections.find((s) => s.id === id);

    switch (id) {
      case "hero":
        return (
          <HeroSection
            key="hero"
            settings={settings}
            hasProjects={hasFinishedProjects || hasComingSoon}
          />
        );
      case "about":
        return (
          <AboutSection
            key="about"
            settings={settings}
            primaryEducation={primaryEducation}
            section={secConfig}
          />
        );
      case "skills":
        return (
          <SkillsSection
            key="skills"
            skills={skills}
            section={secConfig}
          />
        );
      case "featured_project":
        return featuredProject ? (
          <FeaturedProjectSection
            key="featured_project"
            project={featuredProject}
            section={secConfig}
          />
        ) : null;
      case "projects":
        return hasOtherProjects ? (
          <ProjectsSection
            key="projects"
            projects={otherProjects}
            section={secConfig}
          />
        ) : null;
      case "coming_soon":
        return hasComingSoon ? (
          <ComingSoonSection
            key="coming_soon"
            projects={comingSoonProjects}
            section={secConfig}
          />
        ) : null;
      case "github":
        return hasGithub ? (
          <GitHubSection
            key="github"
            repos={githubRepos}
            section={secConfig}
            githubUrl={settings.github_url}
          />
        ) : null;
      case "education":
        return (
          <EducationSection
            key="education"
            education={education}
            section={secConfig}
          />
        );
      case "experience":
        return (
          <ExperienceSection
            key="experience"
            experience={experience}
            section={secConfig}
          />
        );
      case "certifications":
        return (
          <CertificationsSection
            key="certifications"
            certifications={certifications}
            section={secConfig}
          />
        );
      case "blog":
        return (
          <BlogSection
            key="blog"
            posts={posts}
            section={secConfig}
          />
        );
      case "contact":
        return (
          <ContactSection
            key="contact"
            settings={settings}
            section={secConfig}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#111118] text-on-surface antialiased selection:bg-surface-tint selection:text-black">
      {/* Header: dynamically reflects only published and active sections */}
      <Header
        hasAbout={isSectionActive("about")}
        hasCertificates={isSectionActive("certifications")}
        hasBlog={isSectionActive("blog")}
        hasProjects={isSectionActive("featured_project") || isSectionActive("projects")}
        hasExperience={isSectionActive("experience")}
        hasEducation={isSectionActive("education")}
        hasSkills={isSectionActive("skills")}
        hasGithub={isSectionActive("github")}
        resumeUrl={resumeDownloadUrl}
        githubUrl={settings.github_url}
        linkedinUrl={settings.linkedin_url}
      />

      {/* Main Content: renders sections according to database sort order and hide-if-empty */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full pt-16 focus:outline-none">
        {sortedSections.map((sec) => renderSection(sec.id))}
      </main>

      {/* Command Palette Manager: handles Ctrl+K and floating trigger in isolated client boundary */}
      <CommandPaletteManager
        hasResume={hasResume}
        resumeUrl={resumeDownloadUrl}
        hasAbout={hasEducation}
        hasCertificates={hasCertifications}
        hasBlog={hasBlog}
        hasProjects={hasFinishedProjects}
        hasExperience={hasExperience}
        hasEducation={hasEducation}
        hasSkills={hasSkills}
        hasGithub={Boolean(hasGithub)}
      />

      {/* Footer: navigation links obey hide-if-empty */}
      <Footer
        hasAbout={hasEducation}
        hasCertificates={hasCertifications}
        hasBlog={hasBlog}
        hasProjects={hasFinishedProjects}
        hasExperience={hasExperience}
        hasEducation={hasEducation}
        hasSkills={hasSkills}
        hasGithub={Boolean(hasGithub)}
        resumeUrl={resumeDownloadUrl}
      />
    </div>
  );
};

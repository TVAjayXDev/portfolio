"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { FloatingCommandTrigger } from "./FloatingCommandTrigger";

const CommandPalette = dynamic(
  () => import("./CommandPalette").then((mod) => mod.CommandPalette),
  { ssr: false }
);

interface CommandPaletteManagerProps {
  hasResume: boolean;
  resumeUrl: string | null;
  hasAbout: boolean;
  hasCertificates: boolean;
  hasBlog: boolean;
  hasProjects: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasGithub: boolean;
}

export const CommandPaletteManager: React.FC<CommandPaletteManagerProps> = (props) => {
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    const handleCustomOpen = () => setCmdOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, []);

  return (
    <>
      <FloatingCommandTrigger onOpen={() => setCmdOpen(true)} />
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        {...props}
      />
    </>
  );
};

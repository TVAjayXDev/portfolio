"use client";

import React from "react";
import { Search } from "lucide-react";

interface FloatingCommandTriggerProps {
  onOpen: () => void;
}

export const FloatingCommandTrigger: React.FC<FloatingCommandTriggerProps> = ({
  onOpen,
}) => {
  return (
    <button
      onClick={onOpen}
      type="button"
      aria-label="Search and quick navigation"
      className="fixed bottom-6 right-6 z-40 md:hidden w-12 h-12 rounded-full bg-surface-container-high/90 backdrop-blur-md border border-outline text-surface-tint hover:border-surface-tint shadow-[0_4px_24px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all duration-200 active:scale-95"
      title="Search and quick navigation"
    >
      <Search className="w-5 h-5" aria-hidden="true" />
    </button>
  );
};

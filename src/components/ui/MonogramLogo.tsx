import React from "react";
import Link from "next/link";

interface MonogramLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export const MonogramLogo: React.FC<MonogramLogoProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const sizeMap = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 group transition-transform active:scale-95 ${className}`}
    >
      <div
        className={`relative ${sizeMap[size]} rounded-lg bg-surface-container-high border border-outline-variant group-hover:border-surface-tint flex items-center justify-center font-bold tracking-wider font-display text-surface-tint transition-all duration-300 shadow-[0_0_12px_rgba(0,217,255,0.15)] group-hover:shadow-[0_0_18px_rgba(0,217,255,0.35)]`}
      >
        <div className="absolute inset-0 rounded-lg bg-surface-tint/5 group-hover:bg-surface-tint/10 transition-colors" />
        <span className="relative z-10 font-bold">TV</span>
        {/* Subtle cybernetic corner accents */}
        <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-surface-tint opacity-75" />
        <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-surface-tint opacity-75" />
      </div>

      {showText && (
        <span className="font-display font-semibold text-on-surface text-base tracking-tight group-hover:text-white transition-colors">
          T V Ajay
        </span>
      )}
    </Link>
  );
};

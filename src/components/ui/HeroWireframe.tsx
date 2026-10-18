import React from "react";

export const HeroWireframe: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="relative w-full aspect-square max-w-[460px] rounded-2xl bg-surface-container-low/50 border border-outline-variant hover:border-surface-tint/40 p-6 flex flex-col items-center justify-center overflow-hidden group transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
    >
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-dot-pattern" />

      {/* Ambient center cyan aura */}
      <div className="absolute w-48 h-48 rounded-full [background:radial-gradient(circle,rgba(0,217,255,0.18)_0%,transparent_70%)] pointer-events-none group-hover:opacity-100 opacity-75 transition-opacity duration-700" />

      {/* Geometric Cyan Wireframe SVG Model (purely decorative) */}
      <div className="w-full h-full max-w-[340px] max-h-[340px] flex items-center justify-center relative transition-all duration-700">
        <svg
          className="w-full h-full transition-transform duration-700 group-hover:scale-105"
          fill="none"
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Glowing Orbit Tracks */}
          <ellipse
            cx="200"
            cy="200"
            rx="170"
            ry="60"
            stroke="#00D9FF"
            strokeDasharray="4 6"
            strokeOpacity="0.25"
            transform="rotate(-25 200 200)"
          />
          <ellipse
            cx="200"
            cy="200"
            rx="160"
            ry="70"
            stroke="#00D9FF"
            strokeDasharray="2 4"
            strokeOpacity="0.15"
            transform="rotate(35 200 200)"
          />

          {/* Central Cube Wireframe with drop shadow */}
          <g
            className="filter drop-shadow-[0_0_12px_rgba(0,217,255,0.4)]"
            stroke="#00D9FF"
            strokeLinejoin="round"
            strokeWidth="1.75"
          >
            {/* Top Face */}
            <polygon
              fill="rgba(0,217,255,0.06)"
              points="200,90 280,135 200,180 120,135"
            />
            {/* Left Face */}
            <polygon
              fill="rgba(0,217,255,0.02)"
              points="120,135 200,180 200,280 120,230"
            />
            {/* Right Face */}
            <polygon
              fill="rgba(0,217,255,0.09)"
              points="200,180 280,135 280,230 200,280"
            />

            {/* Vertices */}
            <circle cx="200" cy="90" fill="#AFECFF" r="4.5" />
            <circle cx="280" cy="135" fill="#00D9FF" r="4.5" />
            <circle cx="120" cy="135" fill="#00D9FF" r="4.5" />
            <circle cx="200" cy="180" fill="#FFFFFF" r="5.5" />
            <circle cx="120" cy="230" fill="#00D9FF" r="4.5" />
            <circle cx="280" cy="230" fill="#00D9FF" r="4.5" />
            <circle cx="200" cy="280" fill="#00D9FF" r="5" />
          </g>
        </svg>
      </div>
    </div>
  );
};

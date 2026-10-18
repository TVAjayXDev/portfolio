import React from "react";
import Link from "next/link";
import { MonogramLogo } from "@/components/ui/MonogramLogo";
import { ArrowLeft, Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col min-h-screen bg-[#111118] text-on-surface antialiased selection:bg-surface-tint selection:text-black items-center justify-center p-4 relative overflow-hidden focus:outline-none">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-surface-tint/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col items-center text-center gap-6 relative shadow-2xl z-10">
        <MonogramLogo size="lg" showText={false} />

        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-error-container/20 border border-error/40 text-error font-mono text-xs mx-auto">
            <Terminal className="w-3.5 h-3.5" />
            <span>{"404 // Page Not Found"}</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight mt-2">
            Page Not Found
          </h1>

          <p className="font-body text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-tint text-black font-display font-semibold text-sm shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>
    </main>
  );
}

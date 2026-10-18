"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { MonogramLogo } from "@/components/ui/MonogramLogo";
import { ArrowLeft, RotateCcw, AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log non-sensitive error details for monitoring
    console.error("[APPLICATION RUNTIME ERROR]:", error.name || "RuntimeError", error.digest);
  }, [error]);

  return (
    <div className="flex flex-col min-h-screen bg-[#111118] text-on-surface antialiased selection:bg-surface-tint selection:text-black items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-error/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col items-center text-center gap-6 relative shadow-2xl z-10">
        <MonogramLogo size="lg" showText={false} />

        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-error-container/20 border border-error/40 text-error font-mono text-xs mx-auto">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{"500 // Runtime Exception"}</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight mt-2">
            Something Went Wrong
          </h1>

          <p className="font-body text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            An unexpected error occurred while rendering this interface. You can attempt to reload the component or return to the main portfolio.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            onClick={() => reset()}
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-tint text-black font-display font-semibold text-sm shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint/50 transition-colors font-display text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

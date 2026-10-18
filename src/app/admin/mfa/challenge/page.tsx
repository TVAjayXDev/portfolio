"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, ArrowRight, AlertCircle, KeyRound } from "lucide-react";
import { MonogramLogo } from "@/components/ui/MonogramLogo";

export default function MfaChallengePage() {
  const router = useRouter();
  const supabase = createClient();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFactors() {
      try {
        const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) {
          setError(factorsError.message);
          return;
        }

        const totpFactor = data.totp.find((f) => f.status === "verified");
        if (totpFactor) {
          setFactorId(totpFactor.id);
        } else {
          // If no verified factor exists, redirect to enroll
          router.push("/admin/mfa/enroll");
        }
      } catch (err) {
        setError(String(err));
      }
    }

    loadFactors();
  }, [supabase, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const challengeRes = await supabase.auth.mfa.challenge({ factorId });
      if (challengeRes.error) {
        setError(challengeRes.error.message);
        setLoading(false);
        return;
      }

      const verifyRes = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeRes.data.id,
        code,
      });

      if (verifyRes.error) {
        setError("Invalid authenticator code. Please check your authenticator app.");
        setLoading(false);
        return;
      }

      // Upgraded to AAL2: proceed to admin dashboard
      router.push("/admin");
    } catch {
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111118] text-on-surface antialiased selection:bg-surface-tint selection:text-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-surface-container-low rounded-2xl border border-outline-variant shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <MonogramLogo size="md" showText={false} />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-tint/10 text-surface-tint font-mono text-xs mt-4 border border-surface-tint/30">
            <KeyRound className="w-3.5 h-3.5" />
            <span>AAL2 Challenge Required</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight mt-2">
            Two-Factor Verification
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-1.5 leading-relaxed">
            Enter the 6-digit code from your authenticator application to verify your session.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-2.5 text-xs text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider block font-semibold">
              Security Code
            </label>
            <input
              type="text"
              required
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full h-11 px-4 bg-surface-container text-on-surface text-center font-mono text-xl tracking-widest rounded-xl border border-outline focus:border-surface-tint focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full h-11 bg-surface-tint text-black font-display text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Verify Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

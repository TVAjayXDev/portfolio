"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Copy, Check, ArrowRight, AlertCircle, KeyRound } from "lucide-react";
import { MonogramLogo } from "@/components/ui/MonogramLogo";

export default function MfaEnrollPage() {
  const router = useRouter();
  const supabase = createClient();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startEnrollment() {
      try {
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "T V Ajay Portfolio Admin TOTP",
        });

        if (enrollError) {
          setError(enrollError.message);
          return;
        }

        if (data) {
          setFactorId(data.id);
          setQrCode(data.totp.qr_code);
          setSecret(data.totp.secret);
        }
      } catch (err) {
        setError(String(err));
      }
    }

    startEnrollment();
  }, [supabase]);

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        setError("Invalid verification code. Please try again.");
        setLoading(false);
        return;
      }

      // Successfully verified and upgraded to AAL2
      router.push("/admin");
    } catch {
      setError("Verification failed. Please check your code.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111118] text-on-surface antialiased selection:bg-surface-tint selection:text-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-surface-container-low rounded-2xl border border-outline-variant shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <MonogramLogo size="md" showText={false} />
          <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight mt-4">
            Setup Two-Factor Authentication
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-1.5 leading-relaxed">
            Scan this QR code with Google Authenticator or 1Password to activate AAL2 protection.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-2.5 text-xs text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* QR Code Frame */}
        {qrCode ? (
          <div className="p-4 rounded-xl bg-white flex items-center justify-center mx-auto mb-4 w-48 h-48 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="TOTP QR Code" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface-container flex items-center justify-center mx-auto mb-4 w-48 h-48 animate-pulse text-outline">
            <KeyRound className="w-8 h-8" />
          </div>
        )}

        {/* Secret Key Text */}
        {secret && (
          <div className="mb-6 p-3 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[10px] text-outline uppercase">Secret Key</span>
              <span className="font-mono text-xs text-on-surface font-semibold truncate select-all">
                {secret}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopySecret}
              className="p-2 rounded-lg bg-surface-container-high text-on-surface hover:text-surface-tint transition-colors shrink-0"
              title="Copy secret key"
            >
              {copied ? <Check className="w-4 h-4 text-surface-tint" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider block font-semibold">
              6-Digit Authenticator Code
            </label>
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full h-11 px-4 bg-surface-container text-on-surface text-center font-mono text-lg tracking-widest rounded-xl border border-outline focus:border-surface-tint focus:outline-none transition-colors"
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
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Activate MFA</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

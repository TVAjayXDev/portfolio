"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Key, Eye, EyeOff, Lock, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { MonogramLogo } from "@/components/ui/MonogramLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);

  // Check URL query parameters (e.g. ?reason=timeout, ?error=unauthorized)
  const reason = searchParams.get("reason");
  const urlError = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || lockoutTimer) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.retryAfter) {
          setError(data.error || "Too many failed attempts. Access temporarily locked.");
          setLockoutTimer(data.retryAfter);
          startCountdown(data.retryAfter);
        } else {
          setError(data.error || "Invalid email or password");
        }
        setLoading(false);
        return;
      }

      if (data.requiresMfa) {
        router.push(data.redirect || "/admin/mfa/challenge");
      } else {
        router.push(data.redirect || "/admin");
      }
    } catch {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  const startCountdown = (seconds: number) => {
    let current = seconds;
    const interval = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(interval);
        setLockoutTimer(null);
        setError(null);
      } else {
        setLockoutTimer(current);
      }
    }, 1000);
  };

  return (
    <div className="w-full max-w-[440px] bg-surface-container-low rounded-2xl border border-outline-variant shadow-2xl p-8 relative z-10 transition-all duration-300">
      {/* Top Decorative Micro-Accent */}
      <div className="absolute -top-px left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-surface-tint/60 to-transparent" />

      {/* Brand & Identity Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-4">
          <MonogramLogo size="lg" showText={false} />
        </div>
        <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight">
          Admin Console
        </h1>
        <p className="font-body text-xs text-on-surface-variant mt-1.5 max-w-[300px]">
          Restricted management console for T V Ajay Portfolio
        </p>
      </div>

      {/* Notifications & Error Banners */}
      {reason === "timeout" && (
        <div className="mb-5 p-3 rounded-xl bg-surface-container border border-tertiary/40 flex items-center gap-2.5 text-xs text-tertiary">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Session expired due to 30 minutes of inactivity. Please sign in again.</span>
        </div>
      )}

      {urlError === "unauthorized" && (
        <div className="mb-5 p-3 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-2.5 text-xs text-error">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Administrator access privilege is required.</span>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-2.5 text-xs text-error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Input */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="email"
            className="font-mono text-xs text-on-surface-variant uppercase tracking-wider block font-semibold"
          >
            Administrative Email
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 w-4 h-4 text-outline pointer-events-none" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tvajay0@gmail.com"
              disabled={loading || !!lockoutTimer}
              className="w-full h-11 pl-11 pr-4 bg-surface-container text-on-surface placeholder:text-outline font-body text-sm rounded-xl border border-outline focus:border-surface-tint focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="font-mono text-xs text-on-surface-variant uppercase tracking-wider block font-semibold"
            >
              Password
            </label>
          </div>
          <div className="relative flex items-center">
            <Key className="absolute left-3.5 w-4 h-4 text-outline pointer-events-none" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading || !!lockoutTimer}
              className="w-full h-11 pl-11 pr-11 bg-surface-container text-on-surface placeholder:text-outline font-mono text-sm rounded-xl border border-outline focus:border-surface-tint focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
              className="absolute right-3.5 text-outline hover:text-on-surface transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !!lockoutTimer}
            className="w-full h-11 bg-surface-tint text-black font-display text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-cyan-glow hover:shadow-cyan-glow-lg active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>
                  {lockoutTimer ? `Locked (${lockoutTimer}s)` : "Sign In to Console"}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Footer Security Notice */}
      <div className="mt-8 pt-5 bg-surface-container/50 -mx-8 -mb-8 px-8 py-5 rounded-b-2xl border-t border-outline-variant flex items-start gap-3">
        <CheckCircle2 className="w-4 h-4 text-surface-tint mt-0.5 shrink-0" />
        <p className="font-body text-xs text-outline leading-relaxed">
          Authorized personnel only. Access sessions enforce 30-minute inactivity timeouts and cryptographic token binding.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#111118] text-on-surface antialiased selection:bg-surface-tint selection:text-black flex flex-col items-center justify-center p-4 relative overflow-hidden select-none focus:outline-none">
      {/* Subtle ambient cyan glow behind module */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[340px] bg-surface-tint/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Telemetry Header Banner */}
      <div className="mb-6 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant shadow-sm z-10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-surface-tint opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-surface-tint" />
        </span>
        <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">
          System: <span className="text-on-surface font-semibold">Online</span> • TLS 1.3
        </span>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-[440px] h-[480px] bg-surface-container-low rounded-2xl border border-outline-variant animate-pulse" />
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}

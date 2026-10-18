"use client";

import React, { useState, useEffect } from "react";
import { Mail, Copy, Check, Github, Linkedin, Send, Loader2, AlertCircle } from "lucide-react";
import type { SiteSettings, SectionConfig } from "@/lib/types";

interface ContactSectionProps {
  settings: SiteSettings;
  section?: SectionConfig;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ settings, section }) => {
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Form input state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [mountTime, setMountTime] = useState<number>(0);

  useEffect(() => {
    setMountTime(Date.now());
  }, []);

  const title = section?.title || "Contact";
  const subtitle =
    section?.subtitle ||
    "Open to internship opportunities, innovative AI projects, and collaborative engineering initiatives.";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(settings.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || undefined,
          message: message.trim(),
          honeypot: honeypot.trim() || undefined,
          _timestamp: mountTime || Date.now(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          setIsRateLimited(true);
        }
        throw new Error(data.error || "Failed to send message. Please try again.");
      }

      setSubmitted(true);
    } catch (err) {
      setErrorMessage((err as Error).message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setHoneypot("");
    setMountTime(Date.now());
    setErrorMessage(null);
    setIsRateLimited(false);
  };

  return (
    <section id="contact" className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Direct Contact & Info */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div>
            <span className="text-surface-tint font-mono text-xs uppercase tracking-widest block font-semibold">
              {"//"} {title}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight mt-1">
              Let&apos;s Connect
            </h2>
            <p className="font-body text-sm sm:text-base text-on-surface-variant mt-2 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Copy Email Card */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-surface-tint" />
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-outline uppercase">
                  Direct Inquiries
                </span>
                <a
                  href={`mailto:${settings.email}`}
                  className="font-mono text-xs sm:text-sm text-on-surface hover:text-surface-tint font-medium select-all transition-colors"
                >
                  {settings.email}
                </a>
              </div>
            </div>

            <button
              onClick={handleCopyEmail}
              type="button"
              className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint/50 transition-colors flex items-center gap-1.5 font-mono text-xs"
              title="Copy email to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-surface-tint" />
                  <span className="text-surface-tint">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Location & Status Card */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col gap-2 font-mono text-xs">
            <div className="flex items-center justify-between text-on-surface">
              <span className="text-outline">Location:</span>
              <span>Mysore / Karnataka, India</span>
            </div>
            {settings.availability_badge_active && (
              <div className="flex items-center justify-between text-surface-tint">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-surface-tint animate-pulse" />
                  Status:
                </span>
                <span className="font-semibold">{settings.availability_badge_text}</span>
              </div>
            )}
          </div>

          {/* Social Buttons */}
          <div className="flex items-center gap-3">
            {settings.github_url && (
              <a
                href={settings.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint/50 transition-colors flex items-center gap-2 font-display text-sm"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
            )}
            {settings.linkedin_url && (
              <a
                href={settings.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint/50 transition-colors flex items-center gap-2 font-display text-sm"
              >
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn</span>
              </a>
            )}
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="lg:col-span-7 p-6 md:p-8 rounded-2xl bg-surface-container-low border border-outline-variant shadow-lg">
          {submitted ? (
            <div
              className="p-8 rounded-xl bg-surface-container border border-surface-tint/30 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200"
              aria-live="polite"
            >
              <div className="w-12 h-12 rounded-full bg-surface-tint/10 border border-surface-tint/30 flex items-center justify-center text-surface-tint">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-on-surface">
                  Message Delivered
                </h3>
                <p className="font-body text-sm text-on-surface-variant max-w-md mt-2 leading-relaxed">
                  Thank you! Your message has been received. I will review it and reply back to you at{" "}
                  <strong className="text-on-surface">{email}</strong> shortly.
                </p>
              </div>
              <button
                onClick={handleReset}
                type="button"
                className="mt-2 px-5 py-2 rounded-xl bg-surface-container-high border border-outline-variant font-display text-xs font-semibold text-on-surface hover:text-surface-tint hover:border-surface-tint/40 transition-colors"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Error Alert */}
              {errorMessage && (
                <div
                  className="p-4 rounded-xl bg-error/10 border border-error/30 text-error text-xs font-mono flex flex-col gap-2"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  {isRateLimited && (
                    <div className="pl-6 text-[12px] text-on-surface font-body">
                      Please reach out directly via email at{" "}
                      <a
                        href={`mailto:${settings.email}`}
                        className="text-surface-tint underline font-mono hover:opacity-80"
                      >
                        {settings.email}
                      </a>
                      .
                    </div>
                  )}
                </div>
              )}

              {/* Hidden honeypot field (hidden from accessibility tree & visual screen) */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact_extra_field">Do not fill this</label>
                <input
                  id="contact_extra_field"
                  type="text"
                  name="honeypot"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact_name"
                    className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider"
                  >
                    Your Name <span className="text-surface-tint">*</span>
                  </label>
                  <input
                    id="contact_name"
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline text-on-surface placeholder-outline font-body text-sm focus:border-surface-tint focus:outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact_email"
                    className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider"
                  >
                    Your Email <span className="text-surface-tint">*</span>
                  </label>
                  <input
                    id="contact_email"
                    type="email"
                    required
                    maxLength={255}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline text-on-surface placeholder-outline font-body text-sm focus:border-surface-tint focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="contact_subject"
                  className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider"
                >
                  Subject / Context <span className="text-outline text-[10px]">(Optional, max 150)</span>
                </label>
                <input
                  id="contact_subject"
                  type="text"
                  maxLength={150}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Internship / Collaboration Inquiry"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline text-on-surface placeholder-outline font-body text-sm focus:border-surface-tint focus:outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="contact_message"
                    className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider"
                  >
                    Message Payload <span className="text-surface-tint">*</span>
                  </label>
                  <span className="font-mono text-[10px] text-outline">
                    {message.length} / 3000
                  </span>
                </div>
                <textarea
                  id="contact_message"
                  rows={5}
                  required
                  minLength={10}
                  maxLength={3000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Outline your requirements, inquiry, or collaborative opportunity..."
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline text-on-surface placeholder-outline font-body text-sm focus:border-surface-tint focus:outline-none transition-all resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full py-3 px-6 rounded-xl bg-surface-tint text-black font-display font-semibold text-sm shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching Transmission...</span>
                  </>
                ) : (
                  <>
                    <span>Send Message</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="font-mono text-[11px] text-on-surface-variant text-center mt-2">
                Your message is stored securely and emailed directly to T V Ajay.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

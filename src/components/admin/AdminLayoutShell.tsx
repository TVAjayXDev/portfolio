"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  User,
  Cpu,
  FolderGit2,
  GraduationCap,
  Terminal,
  Award,
  BookOpen,
  FileText,
  Mail,
  ListOrdered,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { MonogramLogo } from "@/components/ui/MonogramLogo";

interface AdminLayoutShellProps {
  children: React.ReactNode;
  unreadMessagesCount?: number;
}

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Site Settings", href: "/admin/settings", icon: Settings },
  { label: "About", href: "/admin/about", icon: User },
  { label: "Skills", href: "/admin/skills", icon: Cpu },
  { label: "Projects", href: "/admin/projects", icon: FolderGit2 },
  { label: "Education", href: "/admin/education", icon: GraduationCap },
  { label: "Experience", href: "/admin/experience", icon: Terminal },
  { label: "Certifications", href: "/admin/certifications", icon: Award },
  { label: "Blog", href: "/admin/blog", icon: BookOpen },
  { label: "Resume", href: "/admin/resume", icon: FileText },
  { label: "Messages", href: "/admin/messages", icon: Mail },
  { label: "Section Order", href: "/admin/sections", icon: ListOrdered },
];

export const AdminLayoutShell: React.FC<AdminLayoutShellProps> = ({
  children,
  unreadMessagesCount = 0,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Exclude login and MFA authentication screens from the admin shell layout
  const isAuthScreen =
    pathname === "/admin/login" || pathname?.startsWith("/admin/mfa");

  if (isAuthScreen) {
    return <>{children}</>;
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#111118] text-on-surface antialiased flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-surface-container-low border-r border-outline-variant z-40 flex-col justify-between p-4 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Brand header */}
          <div className="flex items-center gap-3 px-2 pt-2">
            <MonogramLogo size="md" showText={false} />
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-on-surface">T V Ajay</span>
              <span className="font-mono text-[10px] text-surface-tint uppercase font-semibold">
                ADMIN CONSOLE
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href || pathname?.startsWith(item.href + "/");

              const isMessages = item.href === "/admin/messages";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all ${
                    isActive
                      ? "bg-surface-tint/10 text-surface-tint border border-surface-tint/30 font-semibold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-surface-tint" : "text-outline"}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isMessages && unreadMessagesCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-surface-tint text-black font-mono text-[10px] font-bold shrink-0">
                      {unreadMessagesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant">
          <Link
            href="/admin/mfa/enroll"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-mono text-outline hover:text-surface-tint hover:bg-surface-container transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-surface-tint" />
            <span>MFA Security Settings</span>
          </Link>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-[11px] font-mono text-outline hover:text-surface-tint hover:bg-surface-container transition-colors"
          >
            <span>Preview site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface-container-low border-b border-outline-variant z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MonogramLogo size="sm" showText={false} />
          <span className="font-display text-sm font-semibold text-on-surface">Admin Console</span>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          type="button"
          aria-label="Toggle menu"
          className="p-2 rounded-lg bg-surface-container text-on-surface"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm pt-16"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-4/5 max-w-xs h-full bg-surface-container-low border-r border-outline-variant p-4 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href || pathname?.startsWith(item.href + "/");

                const isMessages = item.href === "/admin/messages";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all ${
                      isActive
                        ? "bg-surface-tint/10 text-surface-tint border border-surface-tint/30 font-semibold"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isMessages && unreadMessagesCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-surface-tint text-black font-mono text-[10px] font-bold shrink-0">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3.5 py-2 text-xs font-mono text-outline hover:text-surface-tint"
              >
                <span>Preview site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono text-error hover:bg-error-container/20 rounded-xl transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar Desktop */}
        <header className="hidden lg:flex h-16 bg-[#111118]/85 backdrop-blur-md border-b border-outline-variant sticky top-0 z-30 px-8 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-outline">STATUS:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container border border-surface-tint/30 text-surface-tint font-mono text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-surface-tint animate-pulse" />
              Active Console
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/50 transition-all font-mono text-xs"
            >
              <span>Preview site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-error hover:border-error/40 transition-all font-mono text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{signingOut ? "Signing out..." : "Sign out"}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 pt-20 lg:pt-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

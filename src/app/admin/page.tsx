import React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import {
  FolderGit2,
  Cpu,
  GraduationCap,
  Terminal,
  Award,
  BookOpen,
  Mail,
  ShieldCheck,
  Settings,
  Plus,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const { user, supabase } = await requireAdmin();

  let projectsCount = 0;
  let skillsCount = 0;
  let educationCount = 0;
  let experienceCount = 0;
  let certificationsCount = 0;
  let postsCount = 0;
  let messagesCount = 0;
  let unreadMessagesCount = 0;

  try {
    const [
      projectsRes,
      skillsRes,
      educationRes,
      experienceRes,
      certificationsRes,
      postsRes,
      messagesRes,
      unreadMessagesRes,
    ] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("skills").select("id", { count: "exact", head: true }),
      supabase.from("education").select("id", { count: "exact", head: true }),
      supabase.from("experience").select("id", { count: "exact", head: true }),
      supabase.from("certifications").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("is_read", false),
    ]);

    projectsCount = projectsRes.count ?? 0;
    skillsCount = skillsRes.count ?? 0;
    educationCount = educationRes.count ?? 0;
    experienceCount = experienceRes.count ?? 0;
    certificationsCount = certificationsRes.count ?? 0;
    postsCount = postsRes.count ?? 0;
    messagesCount = messagesRes.count ?? 0;
    unreadMessagesCount = unreadMessagesRes.count ?? 0;
  } catch (err) {
    console.error("[ADMIN ERROR] Error loading overview counts:", err);
  }

  const stats = [
    {
      title: "Projects",
      count: projectsCount,
      href: "/admin/projects",
      icon: FolderGit2,
      desc: "Featured & coming soon entries",
    },
    {
      title: "Skills",
      count: skillsCount,
      href: "/admin/skills",
      icon: Cpu,
      desc: "Tech stack & categories",
    },
    {
      title: "Education",
      count: educationCount,
      href: "/admin/education",
      icon: GraduationCap,
      desc: "Degrees & coursework",
    },
    {
      title: "Experience",
      count: experienceCount,
      href: "/admin/experience",
      icon: Terminal,
      desc: "Hackathons & engagements",
    },
    {
      title: "Certifications",
      count: certificationsCount,
      href: "/admin/certifications",
      icon: Award,
      desc: "Credentials & awards",
    },
    {
      title: "Blog Posts",
      count: postsCount,
      href: "/admin/blog",
      icon: BookOpen,
      desc: "Articles & technical notes",
    },
    {
      title: "Messages",
      count: messagesCount,
      unread: unreadMessagesCount,
      href: "/admin/messages",
      icon: Mail,
      desc: "Contact form submissions",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-container-low border border-outline-variant">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-surface-tint uppercase font-semibold">
              Admin Console
            </span>
            <span className="text-outline text-xs">•</span>
            <span className="font-mono text-xs text-on-surface-variant">Active Session</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Overview Dashboard
          </h1>
          <p className="font-body text-xs text-on-surface-variant">
            Authenticated as <span className="font-mono text-on-surface">{user.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint text-xs font-mono text-on-surface transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-surface-tint" />
            <span>Site Settings</span>
          </Link>
          <Link
            href="/admin/mfa/enroll"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-tint/10 border border-surface-tint/30 text-surface-tint text-xs font-mono hover:bg-surface-tint/20 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>MFA Security</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              href={stat.href}
              className="group p-5 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant group-hover:border-surface-tint/30 group-hover:bg-surface-tint/10 transition-colors">
                  <Icon className="w-5 h-5 text-surface-tint" />
                </div>
                <ArrowRight className="w-4 h-4 text-outline group-hover:text-surface-tint group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-on-surface">
                    {stat.count}
                  </span>
                  {stat.unread !== undefined && stat.unread > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-surface-tint/20 text-surface-tint text-[10px] font-mono font-bold">
                      {stat.unread} new
                    </span>
                  )}
                </div>
                <span className="font-display text-sm font-semibold text-on-surface">
                  {stat.title}
                </span>
                <span className="font-mono text-[11px] text-on-surface-variant">
                  {stat.desc}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions & Security Posture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Management */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-4">
          <h2 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
            <Plus className="w-4 h-4 text-surface-tint" />
            <span>Content Management Actions</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admin/projects"
              className="p-3.5 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint/50 text-xs font-mono text-on-surface flex items-center justify-between group transition-all"
            >
              <span>Manage Projects</span>
              <ArrowRight className="w-3.5 h-3.5 text-outline group-hover:text-surface-tint" />
            </Link>
            <Link
              href="/admin/skills"
              className="p-3.5 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint/50 text-xs font-mono text-on-surface flex items-center justify-between group transition-all"
            >
              <span>Manage Skills</span>
              <ArrowRight className="w-3.5 h-3.5 text-outline group-hover:text-surface-tint" />
            </Link>
            <Link
              href="/admin/blog"
              className="p-3.5 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint/50 text-xs font-mono text-on-surface flex items-center justify-between group transition-all"
            >
              <span>Manage Blog</span>
              <ArrowRight className="w-3.5 h-3.5 text-outline group-hover:text-surface-tint" />
            </Link>
            <Link
              href="/admin/sections"
              className="p-3.5 rounded-xl bg-surface-container border border-outline-variant hover:border-surface-tint/50 text-xs font-mono text-on-surface flex items-center justify-between group transition-all"
            >
              <span>Order Sections</span>
              <ArrowRight className="w-3.5 h-3.5 text-outline group-hover:text-surface-tint" />
            </Link>
          </div>
        </div>

        {/* Security & Access Posture */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-4">
          <h2 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
            <Lock className="w-4 h-4 text-surface-tint" />
            <span>Security & Access Controls</span>
          </h2>

          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-surface-tint" />
                <span className="text-on-surface">PostgreSQL RLS</span>
              </div>
              <span className="text-[11px] text-surface-tint font-semibold">Active & Enforced</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-surface-tint" />
                <span className="text-on-surface">MFA TOTP Support</span>
              </div>
              <Link
                href="/admin/mfa/enroll"
                className="text-[11px] text-surface-tint hover:underline font-semibold"
              >
                Configure / Enroll &rarr;
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-surface-tint" />
                <span className="text-on-surface">Session Inactivity Timeout</span>
              </div>
              <span className="text-[11px] text-outline font-semibold">30 minutes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

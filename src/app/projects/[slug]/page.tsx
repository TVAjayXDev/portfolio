import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, getProjects, getSiteSettings } from "@/lib/data";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ArrowLeft, ExternalLink, Github, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

interface ProjectPageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = await getProjectBySlug(params.slug);
  if (!project || !project.is_published) {
    return {
      title: "Project Not Found",
      robots: { index: false, follow: false },
    };
  }

  const hasContent = Boolean(project.content && project.content.trim().length > 0);
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/projects/${project.slug}`;

  return {
    title: `${project.title} | Case Study`,
    description: project.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: hasContent
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title: `${project.title} | Case Study`,
      description: project.description,
      url: canonicalUrl,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} | Case Study`,
      description: project.description,
    },
  };
}

export async function generateStaticParams() {
  const projects = await getProjects({ onlyPublished: true });
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = await getProjectBySlug(params.slug);
  const settings = await getSiteSettings();

  if (!project || !project.is_published) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#111118] text-on-surface antialiased selection:bg-surface-tint selection:text-black">
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-1 w-full pt-16 focus:outline-none">
        <div className="max-w-[1040px] mx-auto px-4 md:px-8 py-10 md:py-16">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 font-mono text-xs text-outline mb-8">
            <Link
              href="/#projects"
              className="inline-flex items-center gap-1 text-surface-tint hover:underline transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to all projects</span>
            </Link>
            <span>/</span>
            <span className="text-on-surface-variant">Projects</span>
            <span>/</span>
            <span className="text-on-surface">{project.title}</span>
          </div>

          {/* Project Header */}
          <div className="flex flex-col gap-4 pb-8 border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-surface-tint/10 border border-surface-tint/30 text-surface-tint font-mono text-xs uppercase font-semibold">
                {project.status === "live"
                  ? "Live Production"
                  : project.status === "completed"
                  ? "Completed"
                  : project.status === "in_progress"
                  ? "In Development"
                  : project.status === "coming_soon"
                  ? "Coming Soon"
                  : project.status === "planned"
                  ? "Planned"
                  : project.status}
              </span>
              {project.team && (
                <span className="px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-outline font-mono text-xs">
                  Team: {project.team}
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface tracking-tight">
              {project.title}
            </h1>

            {project.tagline && (
              <p className="font-mono text-sm text-surface-tint">
                {"//"} {project.tagline}
              </p>
            )}

            <p className="font-body text-base md:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
              {project.description}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {project.demo_url && (
                <a
                  href={project.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-surface-tint text-black font-display text-sm font-semibold shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all flex items-center gap-2"
                >
                  <span>Live Deployment</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {project.github_url && (
                <a
                  href={project.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface hover:text-surface-tint transition-colors flex items-center gap-2 font-display text-sm"
                >
                  <Github className="w-4 h-4" />
                  <span>Source Code</span>
                </a>
              )}
            </div>
          </div>


          {/* Case Study Body */}
          <article className="mt-10 prose prose-invert max-w-none font-body text-on-surface-variant leading-relaxed">
            {project.content ? (
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {project.content}
              </ReactMarkdown>
            ) : (
              <p className="text-outline italic">Detailed case study in preparation.</p>
            )}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}

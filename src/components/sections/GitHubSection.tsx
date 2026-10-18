import React from "react";
import { Github, Star, GitFork, ExternalLink, Pin, Calendar } from "lucide-react";
import type { GitHubRepo, SectionConfig } from "@/lib/types";

interface GitHubSectionProps {
  repos: GitHubRepo[];
  section?: SectionConfig;
  githubUrl?: string;
}

export const GitHubSection: React.FC<GitHubSectionProps> = ({
  repos,
  section,
  githubUrl = "https://github.com/TVAjayXDev",
}) => {
  // Hide-if-empty: Nothing renders if zero eligible repos
  if (!repos || repos.length === 0) return null;

  const displayRepos = repos.slice(0, 6);
  const title = section?.title || "Live GitHub Repositories";
  const subtitle = section?.subtitle || "Open source repositories and code.";

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <section
      id="github"
      className="w-full max-w-[1360px] mx-auto px-4 md:px-8 py-16 md:py-24 border-b border-outline-variant/60"
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-surface-tint font-mono text-xs uppercase tracking-widest block font-semibold">
              {"//"} {title}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight mt-1">
              {title}
            </h2>
          </div>

          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface hover:text-surface-tint hover:border-surface-tint/50 transition-all font-mono text-xs font-semibold w-fit group"
          >
            <Github className="w-4 h-4 text-surface-tint" />
            <span>View all on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 text-outline group-hover:text-surface-tint transition-colors" />
          </a>
        </div>

        {/* 6-repo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayRepos.map((repo) => (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-surface-tint/50 hover:shadow-cyan-glow/10 transition-all flex flex-col justify-between group shadow-sm relative overflow-hidden"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Github className="w-4 h-4 text-surface-tint shrink-0" />
                    <h3 className="font-mono text-sm font-bold text-on-surface group-hover:text-surface-tint transition-colors truncate">
                      {repo.name}
                    </h3>
                  </div>

                  {repo.is_pinned && (
                    <span className="px-2 py-0.5 rounded bg-surface-tint/10 border border-surface-tint/30 text-surface-tint font-mono text-[10px] flex items-center gap-1 shrink-0">
                      <Pin className="w-3 h-3" />
                      Pinned
                    </span>
                  )}
                </div>

                {/* Description rendered ONLY if non-empty */}
                {repo.description && (
                  <p className="font-body text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {repo.description}
                  </p>
                )}
              </div>

              {/* Footer Meta */}
              <div className="pt-4 mt-4 border-t border-outline-variant/60 flex items-center justify-between font-mono text-[11px] text-outline">
                <div className="flex items-center gap-3">
                  {repo.language && (
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="w-2 h-2 rounded-full bg-surface-tint/80" />
                      {repo.language}
                    </span>
                  )}

                  {repo.stargazers_count > 0 && (
                    <span className="flex items-center gap-1 text-on-surface-variant">
                      <Star className="w-3.5 h-3.5 text-tertiary" />
                      {repo.stargazers_count}
                    </span>
                  )}

                  {repo.forks_count > 0 && (
                    <span className="flex items-center gap-1 text-on-surface-variant">
                      <GitFork className="w-3.5 h-3.5" />
                      {repo.forks_count}
                    </span>
                  )}
                </div>

                {repo.updated_at && (
                  <span className="text-[10px]">
                    {formatDate(repo.updated_at)}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

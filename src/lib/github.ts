import type { GitHubRepo } from "@/lib/types";

interface FetchGitHubReposOptions {
  pinnedRepos?: string[];
  hiddenRepos?: string[];
  username?: string;
  fetchFn?: typeof fetch;
}

const DEFAULT_USERNAME = "TVAjayXDev";

// Module-level in-memory cache for fallback when GitHub API rate-limits or fails
let lastGoodCachedRepos: GitHubRepo[] | null = null;

/**
 * Resets in-memory cache (primarily for automated test isolation).
 */
export function _resetGitHubCacheForTesting() {
  lastGoodCachedRepos = null;
}

/**
 * Sets in-memory cache (for testing or hydration).
 */
export function _setGitHubCacheForTesting(repos: GitHubRepo[] | null) {
  lastGoodCachedRepos = repos;
}

/**
 * Server-side fetch of public repositories for TVAjayXDev via GitHub REST API.
 * Uses Next.js ISR (revalidate: 3600) with optional GITHUB_TOKEN support.
 *
 * Resilience:
 * - Non-OK responses (403, 429, 5xx) or network errors do NOT cache an error.
 * - On failure, serves the last good cached result if available; otherwise returns empty array to hide the section.
 *
 * Excludes:
 * - Forks
 * - Archived repositories
 * - Profile README repo (TVAjayXDev/TVAjayXDev)
 * - Admin-configured hidden repositories (github_hidden_repos)
 *
 * Sorts:
 * - Admin-configured pinned repositories first (github_pinned_repos)
 * - Then descending by last updated timestamp
 */
export async function getGitHubRepos(
  options: FetchGitHubReposOptions = {}
): Promise<GitHubRepo[]> {
  const username = options.username || DEFAULT_USERNAME;
  const pinned = options.pinnedRepos || [];
  const hidden = options.hiddenRepos || [];
  const customFetch = options.fetchFn || fetch;

  const url = `https://api.github.com/users/${username}/repos?per_page=100&type=owner&sort=updated`;

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "tvajay-portfolio",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await customFetch(url, {
      headers,
      next: { revalidate: 3600, tags: ["github-repos"] },
    });

    if (res.status === 403 || res.status === 429) {
      console.error(
        `[GITHUB ERROR] Rate limit or throttling encountered (HTTP ${res.status}).`
      );
      // Serve last good cached result if one exists, otherwise empty
      return lastGoodCachedRepos ? [...lastGoodCachedRepos] : [];
    }

    if (!res.ok) {
      console.error(
        `[GITHUB ERROR] Failed to fetch repositories for ${username}: HTTP ${res.status} ${res.statusText}`
      );
      // Serve last good cached result if one exists, otherwise empty
      return lastGoodCachedRepos ? [...lastGoodCachedRepos] : [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("[GITHUB ERROR] Unexpected API response format: expected array.");
      return lastGoodCachedRepos ? [...lastGoodCachedRepos] : [];
    }

    // Filter eligible repositories
    const eligible = data.filter((repo: any) => {
      if (!repo || typeof repo !== "object") return false;
      if (repo.fork) return false;
      if (repo.archived) return false;
      if (repo.name && repo.name.toLowerCase() === username.toLowerCase()) return false;
      if (repo.name && hidden.includes(repo.name)) return false;
      return true;
    });

    // Map to clean types
    const mapped: GitHubRepo[] = eligible.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name || `${username}/${repo.name}`,
      description: repo.description || null,
      html_url: repo.html_url,
      language: repo.language || null,
      stargazers_count: typeof repo.stargazers_count === "number" ? repo.stargazers_count : 0,
      forks_count: typeof repo.forks_count === "number" ? repo.forks_count : 0,
      updated_at: repo.updated_at || new Date().toISOString(),
      is_pinned: pinned.includes(repo.name),
    }));

    // Sort: pinned first, then last updated descending
    mapped.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    // Update memory cache on successful fetch
    lastGoodCachedRepos = mapped;
    return mapped;
  } catch (error) {
    console.error("[GITHUB ERROR] Network exception fetching GitHub repositories:", error);
    // Serve last good cached result if one exists, otherwise empty
    return lastGoodCachedRepos ? [...lastGoodCachedRepos] : [];
  }
}

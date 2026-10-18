import test from "node:test";
import assert from "node:assert/strict";
import {
  getGitHubRepos,
  _resetGitHubCacheForTesting,
  _setGitHubCacheForTesting,
} from "../src/lib/github.ts";

test("GitHub Integration: Success response with filtering and sorting", async () => {
  const mockRepos = [
    {
      id: 1,
      name: "TVAjayXDev",
      description: "Special profile README repository",
      fork: false,
      archived: false,
      html_url: "https://github.com/TVAjayXDev/TVAjayXDev",
      language: null,
      stargazers_count: 5,
      forks_count: 0,
      updated_at: "2024-10-15T10:00:00Z",
    },
    {
      id: 2,
      name: "forked-repo",
      description: "Forked library",
      fork: true,
      archived: false,
      html_url: "https://github.com/TVAjayXDev/forked-repo",
      language: "TypeScript",
      stargazers_count: 10,
      forks_count: 2,
      updated_at: "2024-10-16T10:00:00Z",
    },
    {
      id: 3,
      name: "archived-project",
      description: "Old archived codebase",
      fork: false,
      archived: true,
      html_url: "https://github.com/TVAjayXDev/archived-project",
      language: "Python",
      stargazers_count: 2,
      forks_count: 0,
      updated_at: "2024-10-14T10:00:00Z",
    },
    {
      id: 4,
      name: "hidden-by-admin",
      description: "Experimental project hidden by admin",
      fork: false,
      archived: false,
      html_url: "https://github.com/TVAjayXDev/hidden-by-admin",
      language: "JavaScript",
      stargazers_count: 0,
      forks_count: 0,
      updated_at: "2024-10-17T12:00:00Z",
    },
    {
      id: 5,
      name: "active-ai-project",
      description: "Core AI project updated recently",
      fork: false,
      archived: false,
      html_url: "https://github.com/TVAjayXDev/active-ai-project",
      language: "TypeScript",
      stargazers_count: 12,
      forks_count: 3,
      updated_at: "2024-10-16T08:00:00Z",
    },
    {
      id: 6,
      name: "pinned-flagship-tool",
      description: "Pinned developer tool",
      fork: false,
      archived: false,
      html_url: "https://github.com/TVAjayXDev/pinned-flagship-tool",
      language: "Rust",
      stargazers_count: 35,
      forks_count: 4,
      updated_at: "2024-10-10T08:00:00Z",
    },
  ];

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => mockRepos,
  });

  const result = await getGitHubRepos({
    pinnedRepos: ["pinned-flagship-tool"],
    hiddenRepos: ["hidden-by-admin"],
    fetchFn: mockFetch,
  });

  // Verify exclusions
  assert.equal(result.length, 2, "Only 2 repos should pass all filters");
  assert.ok(!result.some((r) => r.name === "TVAjayXDev"), "Profile README must be excluded");
  assert.ok(!result.some((r) => r.name === "forked-repo"), "Forks must be excluded");
  assert.ok(!result.some((r) => r.name === "archived-project"), "Archived repos must be excluded");
  assert.ok(!result.some((r) => r.name === "hidden-by-admin"), "Hidden repos must be excluded");

  // Verify pinned priority sorting
  assert.equal(result[0].name, "pinned-flagship-tool", "Pinned repo must appear first despite older timestamp");
  assert.equal(result[0].is_pinned, true);
  assert.equal(result[1].name, "active-ai-project");
  assert.equal(result[1].is_pinned, false);
});

test("GitHub Integration: Empty response", async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => [],
  });

  const result = await getGitHubRepos({ fetchFn: mockFetch });
  assert.deepEqual(result, [], "Empty API response must return empty array");
});

test("GitHub Integration: HTTP 403 Rate Limit", async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 403,
    statusText: "Rate Limit Exceeded",
    json: async () => ({ message: "API rate limit exceeded" }),
  });

  const result = await getGitHubRepos({ fetchFn: mockFetch });
  assert.deepEqual(result, [], "HTTP 403 rate limit must return empty array gracefully");
});

test("GitHub Integration: HTTP 403 after previous success serves last good cached result", async () => {
  _resetGitHubCacheForTesting();

  // 1. Initial successful response
  const goodRepos = [
    {
      id: 101,
      name: "trustlens-clinical-ai",
      description: "Clinical AI assistant",
      fork: false,
      archived: false,
      html_url: "https://github.com/TVAjayXDev/trustlens-clinical-ai",
      language: "TypeScript",
      stargazers_count: 5,
      forks_count: 1,
      updated_at: "2024-10-17T09:00:00Z",
    },
  ];

  const initialSuccessFetch = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => goodRepos,
  });

  const firstResult = await getGitHubRepos({ fetchFn: initialSuccessFetch });
  assert.equal(firstResult.length, 1);
  assert.equal(firstResult[0].name, "trustlens-clinical-ai");

  // 2. Subsequent 403 Rate Limit failure
  const rateLimitFetch = async () => ({
    ok: false,
    status: 403,
    statusText: "Forbidden",
    json: async () => ({ message: "rate limit exceeded" }),
  });

  const fallbackResult = await getGitHubRepos({ fetchFn: rateLimitFetch });
  assert.equal(fallbackResult.length, 1, "Must serve previous good cached result on 403");
  assert.equal(fallbackResult[0].name, "trustlens-clinical-ai");

  _resetGitHubCacheForTesting();
});

test("GitHub Integration: Network Exception", async () => {
  _resetGitHubCacheForTesting();
  const mockFetch = async () => {
    throw new Error("ENOTFOUND api.github.com");
  };

  const result = await getGitHubRepos({ fetchFn: mockFetch });
  assert.deepEqual(result, [], "Network error with no cache must return empty array gracefully");
});

test("Hide-if-Empty Rule: Complete Empty-State Simulation", async () => {
  // Empty tables state
  const state = {
    projects: [],
    skills: [],
    education: [],
    experience: [],
    certifications: [],
    posts: [],
    githubRepos: [],
    resumeUrl: null,
  };

  const hasFeatured = state.projects.some((p) => p.is_featured);
  const hasComingSoon = state.projects.some((p) => p.status === "in_progress" || p.status === "coming_soon");
  const hasSkills = state.skills.length > 0;
  const hasEducation = state.education.length > 0;
  const hasExperience = state.experience.length > 0;
  const hasCertifications = state.certifications.length > 0;
  const hasBlog = state.posts.length > 0;
  const hasGithub = state.githubRepos.length > 0;
  const hasResume = !!state.resumeUrl;

  // Active sections determination logic
  const isSectionActive = (id) => {
    switch (id) {
      case "hero":
        return true;
      case "about":
        return hasEducation;
      case "skills":
        return hasSkills;
      case "featured_project":
        return hasFeatured;
      case "coming_soon":
        return hasComingSoon;
      case "github":
        return Boolean(hasGithub);
      case "education":
        return hasEducation;
      case "experience":
        return hasExperience;
      case "certifications":
        return hasCertifications;
      case "blog":
        return hasBlog;
      case "contact":
        return true;
      default:
        return false;
    }
  };

  // 1. Verify active sections on home page
  assert.equal(isSectionActive("hero"), true, "Hero must render");
  assert.equal(isSectionActive("contact"), true, "Contact must render");
  assert.equal(isSectionActive("about"), false, "About must NOT render when education table is empty");
  assert.equal(isSectionActive("skills"), false, "Skills must NOT render");
  assert.equal(isSectionActive("featured_project"), false, "Featured project must NOT render");
  assert.equal(isSectionActive("coming_soon"), false, "Coming soon must NOT render");
  assert.equal(isSectionActive("github"), false, "GitHub must NOT render");
  assert.equal(isSectionActive("education"), false, "Education must NOT render");
  assert.equal(isSectionActive("experience"), false, "Experience must NOT render");
  assert.equal(isSectionActive("certifications"), false, "Certifications must NOT render");
  assert.equal(isSectionActive("blog"), false, "Blog must NOT render");

  // 2. Verify Header navigation links
  const headerLinks = [
    { label: "About", href: "/#about", show: hasEducation },
    { label: "Skills", href: "/#skills", show: hasSkills },
    { label: "Projects", href: "/#projects", show: hasFeatured || hasComingSoon },
    { label: "Code", href: "/#github", show: hasGithub },
    { label: "Education", href: "/#education", show: hasEducation },
    { label: "Experience", href: "/#experience", show: hasExperience },
    { label: "Certifications", href: "/#certifications", show: hasCertifications },
    { label: "Blog", href: "/#blog", show: hasBlog },
    { label: "Contact", href: "/#contact", show: true },
  ].filter((item) => item.show);

  assert.equal(headerLinks.length, 1, "Only Contact link should be present in header");
  assert.equal(headerLinks[0].label, "Contact");

  // 3. Verify Footer navigation links
  const footerLinks = [...headerLinks];
  assert.equal(footerLinks.length, 1, "Only Contact link should be present in footer");
  assert.equal(footerLinks[0].label, "Contact");

  // 4. Verify Resume button
  assert.equal(hasResume, false, "Resume download must be completely hidden when resume_url is null");
});

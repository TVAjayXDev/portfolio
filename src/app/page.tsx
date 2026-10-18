import {
  getSiteSettings,
  getSections,
  getProjects,
  getSkills,
  getEducation,
  getExperience,
  getCertifications,
  getPosts,
  DEV_SITE_SETTINGS,
} from "@/lib/data";
import { getGitHubRepos } from "@/lib/github";
import { HomeClientView } from "@/components/home/HomeClientView";
import { buildPersonJsonLd, safeJsonLdReplacer } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  const settings = (await getSiteSettings()) || DEV_SITE_SETTINGS;
  const sections = await getSections();
  const siteUrl = getSiteUrl();

  const [
    projects,
    skills,
    education,
    experience,
    certifications,
    posts,
    githubRepos,
  ] = await Promise.all([
    getProjects({ onlyPublished: true }),
    getSkills({ onlyPublished: true }),
    getEducation({ onlyPublished: true }),
    getExperience({ onlyPublished: true }),
    getCertifications({ onlyPublished: true }),
    getPosts({ onlyPublished: true }),
    getGitHubRepos({
      pinnedRepos: settings.github_pinned_repos,
      hiddenRepos: settings.github_hidden_repos,
    }),
  ]);

  const personJsonLd = buildPersonJsonLd({
    name: settings.name,
    jobTitle: settings.title,
    siteUrl,
    sameAs: [settings.github_url, settings.linkedin_url],
    education,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(personJsonLd) }}
      />
      <HomeClientView
        settings={settings}
        sections={sections}
        projects={projects}
        skills={skills}
        education={education}
        experience={experience}
        certifications={certifications}
        posts={posts}
        githubRepos={githubRepos}
      />
    </>
  );
}

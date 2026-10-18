import { createPublicClient } from "./supabase/server";
import type {
  SiteSettings,
  SectionConfig,
  Project,
  Skill,
  Education,
  Experience,
  Certification,
  Post,
} from "./types";

const isDev = process.env.NODE_ENV === "development";

// =============================================================================
// LOCAL DEVELOPMENT SEED CONSTANTS (Allowed ONLY when NODE_ENV === "development")
// =============================================================================

export const DEV_SITE_SETTINGS: SiteSettings = {
  id: 1,
  site_title: "T V Ajay | Portfolio",
  name: "T V Ajay",
  title: "Computer Science Engineering Student",
  headline: "T V Ajay",
  subtitle:
    "Computer Science Engineering student who enjoys building practical projects with AI, learning new technologies, and turning ideas into working solutions.",
  email: "tvajay0@gmail.com",
  github_url: "https://github.com/TVAjayXDev",
  linkedin_url: "https://www.linkedin.com/in/t-v-ajay-b047013a5/",
  availability_badge_text: "Open to internships",
  availability_badge_active: true,
  seo_description:
    "Computer Science Engineering student who enjoys building practical projects with AI, learning new technologies, and turning ideas into working solutions.",
  og_image_url: null,
  resume_url: null,
  resume_updated_at: null,
  github_pinned_repos: [],
  github_hidden_repos: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEV_SECTIONS: SectionConfig[] = [
  { id: "hero", title: "Hero", subtitle: "Student & Developer", is_visible: true, sort_order: 1, created_at: "", updated_at: "" },
  { id: "about", title: "About", subtitle: "Academic background and technical foundations", is_visible: true, sort_order: 2, created_at: "", updated_at: "" },
  { id: "skills", title: "Skills", subtitle: "Technical capabilities and tools", is_visible: true, sort_order: 3, created_at: "", updated_at: "" },
  { id: "featured_project", title: "Featured Project", subtitle: "Clinical governance AI assistant", is_visible: true, sort_order: 4, created_at: "", updated_at: "" },
  { id: "projects", title: "Projects", subtitle: "Independent builds and applications", is_visible: true, sort_order: 5, created_at: "", updated_at: "" },
  { id: "coming_soon", title: "In Progress", subtitle: "Active projects in development", is_visible: true, sort_order: 6, created_at: "", updated_at: "" },
  { id: "github", title: "Live GitHub Repositories", subtitle: "Open source repositories and code", is_visible: true, sort_order: 7, created_at: "", updated_at: "" },
  { id: "education", title: "Education", subtitle: "Academic qualifications", is_visible: true, sort_order: 8, created_at: "", updated_at: "" },
  { id: "experience", title: "Experience", subtitle: "Hackathons and activities", is_visible: true, sort_order: 9, created_at: "", updated_at: "" },
  { id: "certifications", title: "Certifications", subtitle: "Verified certifications", is_visible: true, sort_order: 10, created_at: "", updated_at: "" },
  { id: "blog", title: "Blog", subtitle: "Technical writeups and learnings", is_visible: true, sort_order: 11, created_at: "", updated_at: "" },
  { id: "contact", title: "Contact", subtitle: "Get in touch for internships and collaborations", is_visible: true, sort_order: 12, created_at: "", updated_at: "" },
];

export const DEV_SKILLS: Skill[] = [
  { id: "1", name: "HTML", category: "Languages", is_published: true, sort_order: 1, created_at: "", updated_at: "" },
  { id: "2", name: "TypeScript", category: "Languages", is_published: true, sort_order: 2, created_at: "", updated_at: "" },
  { id: "3", name: "Supabase", category: "Cloud & DB", is_published: true, sort_order: 3, created_at: "", updated_at: "" },
];

export const DEV_EDUCATION: Education[] = [
  {
    id: "1",
    institution: "Vidyavardhaka College of Engineering (VTU)",
    degree: "B.E. Computer Science & Engineering",
    field_of_study: "Computer Science & Engineering",
    start_year: "2025",
    end_year: "2029",
    grade: "CGPA 7.98",
    current_semester: "3rd Semester",
    description: null,
    is_published: true,
    sort_order: 1,
    created_at: "",
    updated_at: "",
  },
  {
    id: "2",
    institution: "[12th/PUC: College Name Placeholder]",
    degree: "Pre-University College (12th)",
    field_of_study: "PCMC / Science",
    start_year: null,
    end_year: null,
    grade: null,
    current_semester: null,
    description: null,
    is_published: false,
    sort_order: 2,
    created_at: "",
    updated_at: "",
  },
  {
    id: "3",
    institution: "[10th: School Name Placeholder]",
    degree: "Secondary School Leaving Certificate (10th)",
    field_of_study: "General",
    start_year: null,
    end_year: null,
    grade: null,
    current_semester: null,
    description: null,
    is_published: false,
    sort_order: 3,
    created_at: "",
    updated_at: "",
  },
];

export const DEV_EXPERIENCE: Experience[] = [
  {
    id: "1",
    role: "Participant",
    organization: "HackSpirit 1.0, VVCE Mysore",
    location: null,
    start_date: null,
    end_date: null,
    description: "Participant at HackSpirit 1.0 hackathon, VVCE Mysore.",
    is_published: true,
    sort_order: 1,
    created_at: "",
    updated_at: "",
  },
];

export const DEV_PROJECTS: Project[] = [
  {
    id: "1",
    title: "TrustLens",
    slug: "trustlens",
    tagline: "Clinical Governance AI Assistant",
    description:
      "A clinical governance AI assistant that answers hospital staff questions only from uploaded institutional documents, with paragraph-level citations, conflict detection, document hierarchy weighting and a provenance audit trail.",
    content: `# TrustLens: Clinical Governance AI Assistant

> **Note:** The live deployment uses synthetic demonstration data and does not constitute clinical guidance.

## Overview
TrustLens is a clinical governance AI assistant designed to answer hospital staff questions strictly and only from uploaded institutional documents. It eliminates ungrounded assertions by enforcing paragraph-level citations, conflict detection across document versions, hierarchical document weighting, and an immutable provenance audit trail.

## The Problem
Hospital clinicians and medical staff navigate institutional standard operating procedures (SOPs), infection control guidelines, and clinical protocols across intranet portals. Generic LLM solutions are unsafe in clinical contexts because they risk generating ungrounded advice, conflating outdated protocols with active guidance, or synthesizing assertions without traceability.

## Key Features

### 1. Strict Grounded Answering
TrustLens answers queries solely from uploaded institutional documents. If an answer cannot be grounded directly in the provided text, the system explicitly refuses to speculate.

### 2. Paragraph-Level Citations
Every recommendation and factual assertion is linked to an exact paragraph citation within the source document, providing clinicians with verifiable references.

### 3. Conflict Detection
When multiple institutional documents or revision drafts contain contradictory guidance, TrustLens flags the discrepancy rather than guessing.

### 4. Document Hierarchy Weighting
Policies are prioritized according to institutional authority—institutional directives override departmental guidelines, and newer revisions supersede older ones.

### 5. Provenance Audit Trail
Every query, retrieved context snippet, and generated answer is recorded with a provenance audit trail for governance compliance.

## Team
- **Cache Me Outside**

## Deployment
- **Live URL**: [https://trustlens-jet-omega.vercel.app/](https://trustlens-jet-omega.vercel.app/)
`,
    team: "Cache Me Outside",
    demo_url: "https://trustlens-jet-omega.vercel.app/",
    github_url: null,
    image_url: null,
    status: "live",
    is_featured: true,
    is_published: true,
    technologies: [],
    sort_order: 1,
    created_at: "",
    updated_at: "",
  },
  {
    id: "2",
    title: "CampusLink",
    slug: "campuslink",
    tagline: null,
    description: "",
    content: "",
    team: null,
    demo_url: null,
    github_url: null,
    image_url: null,
    status: "in_progress",
    is_featured: false,
    is_published: true,
    technologies: [],
    sort_order: 2,
    created_at: "",
    updated_at: "",
  },
  {
    id: "3",
    title: "CampusFinance",
    slug: "campusfinance",
    tagline: null,
    description: "",
    content: "",
    team: null,
    demo_url: null,
    github_url: null,
    image_url: null,
    status: "in_progress",
    is_featured: false,
    is_published: true,
    technologies: [],
    sort_order: 3,
    created_at: "",
    updated_at: "",
  },
];

// =============================================================================
// DATABASE QUERY FUNCTIONS (Strict Production Rules)
// In production: no fallback to hardcoded seed data. Errors log and return empty.
// In development: clearly marked debug fallback.
// =============================================================================

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const supabase = createPublicClient();
  if (!supabase) {
    if (isDev) {
      console.warn("[DEV MODE] Supabase not configured. Using development seed for site_settings.");
      return DEV_SITE_SETTINGS;
    }
    console.error("[PROD ERROR] Supabase is not configured. Missing SUPABASE_URL or ANON_KEY.");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error || !data) {
      console.error("[DB ERROR] Failed to fetch site_settings:", error);
      if (isDev) {
        console.warn("[DEV MODE] Query failed. Falling back to development seed for site_settings.");
        return DEV_SITE_SETTINGS;
      }
      return null;
    }
    return data as SiteSettings;
  } catch (err) {
    console.error("[DB UNEXPECTED ERROR] getSiteSettings failed:", err);
    return isDev ? DEV_SITE_SETTINGS : null;
  }
}

export async function getSections(): Promise<SectionConfig[]> {
  const supabase = createPublicClient();
  if (!supabase) {
    if (isDev) {
      console.warn("[DEV MODE] Supabase not configured. Using development seed for sections.");
      return DEV_SECTIONS;
    }
    console.error("[PROD ERROR] Supabase is not configured. Returning empty sections.");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error || !data) {
      console.error("[DB ERROR] Failed to fetch sections:", error);
      return isDev ? DEV_SECTIONS : [];
    }
    return data as SectionConfig[];
  } catch (err) {
    console.error("[DB UNEXPECTED ERROR] getSections failed:", err);
    return isDev ? DEV_SECTIONS : [];
  }
}

export async function getProjects(options?: { onlyPublished?: boolean }): Promise<Project[]> {
  const supabase = createPublicClient();
  if (!supabase) {
    if (isDev) {
      console.warn("[DEV MODE] Supabase not configured. Using development seed for projects.");
      return (options?.onlyPublished ?? true)
        ? DEV_PROJECTS.filter((p) => p.is_published)
        : DEV_PROJECTS;
    }
    console.error("[PROD ERROR] Supabase is not configured. Returning empty projects.");
    return [];
  }

  try {
    let query = supabase.from("projects").select("*").order("sort_order", { ascending: true });
    if (options?.onlyPublished ?? true) {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query;
    if (error || !data) {
      console.error("[DB ERROR] Failed to fetch projects:", error);
      return isDev
        ? (options?.onlyPublished ?? true ? DEV_PROJECTS.filter((p) => p.is_published) : DEV_PROJECTS)
        : [];
    }
    return data as Project[];
  } catch (err) {
    console.error("[DB UNEXPECTED ERROR] getProjects failed:", err);
    return [];
  }
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = createPublicClient();
  if (!supabase) {
    if (isDev) {
      return DEV_PROJECTS.find((p) => p.slug === slug) || null;
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      console.error(`[DB ERROR] Failed to fetch project slug=${slug}:`, error);
      return isDev ? DEV_PROJECTS.find((p) => p.slug === slug) || null : null;
    }
    return data as Project;
  } catch (err) {
    console.error(`[DB UNEXPECTED ERROR] getProjectBySlug (${slug}) failed:`, err);
    return null;
  }
}

export async function getSkills(options?: { onlyPublished?: boolean }): Promise<Skill[]> {
  const supabase = createPublicClient();
  if (!supabase) {
    if (isDev) {
      return (options?.onlyPublished ?? true)
        ? DEV_SKILLS.filter((s) => s.is_published)
        : DEV_SKILLS;
    }
    return [];
  }

  try {
    let query = supabase.from("skills").select("*").order("sort_order", { ascending: true });
    if (options?.onlyPublished ?? true) {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query;
    if (error || !data) {
      console.error("[DB ERROR] Failed to fetch skills:", error);
      return isDev ? DEV_SKILLS : [];
    }
    return data as Skill[];
  } catch (err) {
    console.error("[DB UNEXPECTED ERROR] getSkills failed:", err);
    return [];
  }
}

export async function getEducation(options?: { onlyPublished?: boolean }): Promise<Education[]> {
  const supabase = createPublicClient();
  if (!supabase) {
    if (isDev) {
      return (options?.onlyPublished ?? true)
        ? DEV_EDUCATION.filter((e) => e.is_published)
        : DEV_EDUCATION;
    }
    return [];
  }

  try {
    let query = supabase.from("education").select("*").order("sort_order", { ascending: true });
    if (options?.onlyPublished ?? true) {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query;
    if (error || !data) {
      console.error("[DB ERROR] Failed to fetch education:", error);
      return isDev
        ? (options?.onlyPublished ?? true ? DEV_EDUCATION.filter((e) => e.is_published) : DEV_EDUCATION)
        : [];
    }
    return data as Education[];
  } catch (err) {
    console.error("[DB UNEXPECTED ERROR] getEducation failed:", err);
    return [];
  }
}

export async function getExperience(options?: { onlyPublished?: boolean }): Promise<Experience[]> {
  const supabase = createPublicClient();
  if (!supabase) {
    if (isDev) {
      return (options?.onlyPublished ?? true)
        ? DEV_EXPERIENCE.filter((e) => e.is_published)
        : DEV_EXPERIENCE;
    }
    return [];
  }

  try {
    let query = supabase.from("experience").select("*").order("sort_order", { ascending: true });
    if (options?.onlyPublished ?? true) {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query;
    if (error || !data) {
      console.error("[DB ERROR] Failed to fetch experience:", error);
      return isDev ? DEV_EXPERIENCE : [];
    }
    return data as Experience[];
  } catch (err) {
    console.error("[DB UNEXPECTED ERROR] getExperience failed:", err);
    return [];
  }
}

export async function getCertifications(options?: { onlyPublished?: boolean }): Promise<Certification[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  try {
    let query = supabase.from("certifications").select("*").order("sort_order", { ascending: true });
    if (options?.onlyPublished ?? true) {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query;
    if (error || !data) {
      if (error) console.error("[DB ERROR] Failed to fetch certifications:", error);
      return [];
    }
    return data as Certification[];
  } catch (err) {
    console.error("[DB UNEXPECTED ERROR] getCertifications failed:", err);
    return [];
  }
}

export async function getPosts(options?: { onlyPublished?: boolean }): Promise<Post[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  try {
    let query = supabase.from("posts").select("*").order("sort_order", { ascending: true });
    if (options?.onlyPublished ?? true) {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query;
    if (error || !data) {
      if (error) console.error("[DB ERROR] Failed to fetch posts:", error);
      return [];
    }
    return (data as any[]).map((p) => ({
      ...p,
      read_time: p.read_time || (p.reading_time_minutes ? `${p.reading_time_minutes} min read` : "1 min read"),
    })) as Post[];
  } catch (err) {
    console.error("[DB UNEXPECTED ERROR] getPosts failed:", err);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      console.error(`[DB ERROR] Failed to fetch post slug=${slug}:`, error);
      return null;
    }
    const post = data as any;
    return {
      ...post,
      read_time: post.read_time || (post.reading_time_minutes ? `${post.reading_time_minutes} min read` : "1 min read"),
    } as Post;
  } catch (err) {
    console.error(`[DB UNEXPECTED ERROR] getPostBySlug (${slug}) failed:`, err);
    return null;
  }
}

export type ProjectStatus = "completed" | "in_progress" | "planned" | "coming_soon" | "live";

export interface SiteSettings {
  id: number;
  site_title: string;
  name: string;
  title: string;
  headline: string;
  subtitle: string;
  email: string;
  github_url: string;
  linkedin_url: string;
  availability_badge_text: string;
  availability_badge_active: boolean;
  seo_description: string;
  og_image_url?: string | null;
  about_text?: string | null;
  footer_text?: string | null;
  resume_url?: string | null;
  resume_updated_at?: string | null;
  github_pinned_repos?: string[];
  github_hidden_repos?: string[];
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  is_pinned?: boolean;
}

export interface SectionConfig {
  id: string;
  title: string;
  subtitle?: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  tagline?: string | null;
  description: string;
  content: string;
  team?: string | null;
  demo_url?: string | null;
  github_url?: string | null;
  image_url?: string | null;
  status: ProjectStatus;
  is_featured: boolean;
  is_published: boolean;
  technologies: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  icon?: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study?: string | null;
  start_year?: string | null;
  end_year?: string | null;
  grade?: string | null;
  current_semester?: string | null;
  description?: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Experience {
  id: string;
  role: string;
  organization: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  issue_date: string;
  credential_id?: string | null;
  credential_url?: string | null;
  certificate_file_url?: string | null;
  thumbnail_url?: string | null;
  category: string;
  skills: string[];
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url?: string | null;
  reading_time_minutes?: number | null;
  read_time?: string | null;
  tags: string[];
  is_published: boolean;
  published_at?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  is_pinned?: boolean;
  is_hidden?: boolean;
}

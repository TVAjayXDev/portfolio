import { z } from "zod";

/**
 * Strict URL validator:
 * Enforces http: or https: protocols ONLY.
 * Explicitly rejects dangerous schemes such as javascript:, data:, vbscript:, etc.
 */
export const safeUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val || val === "") return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid HTTP or HTTPS URL (javascript: and data: schemes are strictly prohibited)" }
  )
  .nullable()
  .optional();

/**
 * Converts a text title into an URL-safe kebab-case slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Site Settings validation schema
 */
export const siteSettingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be 100 chars or less"),
  title: z.string().trim().min(1, "Title is required").max(150, "Title must be 150 chars or less"),
  headline: z.string().trim().min(1, "Headline is required").max(120, "Headline must be 120 chars or less"),
  subtitle: z.string().trim().min(1, "Subtitle is required").max(350, "Subtitle must be 350 chars or less"),
  email: z.string().trim().email("Invalid email address"),
  github_url: safeUrlSchema,
  linkedin_url: safeUrlSchema,
  availability_badge_text: z.string().trim().min(1, "Badge text is required").max(60, "Badge text must be 60 chars or less"),
  availability_badge_active: z.boolean().default(true),
  seo_description: z.string().trim().max(350, "SEO description must be 350 chars or less"),
  og_image_url: safeUrlSchema,
  about_text: z.string().trim().max(2500, "About text must be 2500 chars or less").nullable().optional(),
  footer_text: z.string().trim().max(250, "Footer text must be 250 chars or less").nullable().optional(),
  github_pinned_repos: z.array(z.string().trim().max(100)).default([]),
  github_hidden_repos: z.array(z.string().trim().max(100)).default([]),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

/**
 * Single section validation schema
 */
export const sectionItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(80, "Title must be 80 chars or less"),
  subtitle: z.string().trim().max(150, "Subtitle must be 150 chars or less").nullable().optional(),
  is_visible: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const sectionsBatchSchema = z.array(sectionItemSchema);
export type SectionItemInput = z.infer<typeof sectionItemSchema>;

/**
 * Project validation schema
 */
export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 chars or less"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120, "Slug must be 120 chars or less")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens (e.g. 'my-project')"),
  tagline: z.string().trim().max(180, "Tagline must be 180 chars or less").nullable().optional(),
  description: z.string().trim().min(1, "Description is required").max(600, "Description must be 600 chars or less"),
  long_description: z.string().trim().max(2000, "Long description must be 2000 chars or less").nullable().optional(),
  content: z.string().trim().max(25000, "Content must be 25,000 chars or less").nullable().optional(),
  team: z.string().trim().max(100, "Team name must be 100 chars or less").nullable().optional(),
  demo_url: safeUrlSchema,
  github_url: safeUrlSchema,
  image_url: safeUrlSchema,
  technologies: z.array(z.string().trim().max(40)).default([]),
  status: z.enum(["completed", "in_progress", "planned", "coming_soon", "live"]),
  is_featured: z.boolean().default(false),
  is_published: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export type ProjectInput = z.infer<typeof projectSchema>;

/**
 * Skill validation schema
 */
export const skillSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Skill name is required").max(60, "Skill name must be 60 chars or less"),
  category: z.string().trim().min(1, "Category is required").max(60, "Category must be 60 chars or less"),
  proficiency: z.number().int().min(1).max(100).nullable().optional(),
  is_published: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export type SkillInput = z.infer<typeof skillSchema>;

/**
 * Education validation schema
 * Note: Row cannot be published while required fields are empty
 * (prevents draft 10th/12th rows from showing blank year/grades).
 */
export const educationSchema = z
  .object({
    id: z.string().uuid().optional(),
    institution: z.string().trim().max(150, "Institution must be 150 chars or less"),
    degree: z.string().trim().max(150, "Degree must be 150 chars or less"),
    field_of_study: z.string().trim().max(150, "Field of study must be 150 chars or less").nullable().optional(),
    start_year: z.string().trim().max(20, "Start year must be 20 chars or less").nullable().optional(),
    end_year: z.string().trim().max(20, "End year must be 20 chars or less").nullable().optional(),
    grade: z.string().trim().max(50, "Grade must be 50 chars or less").nullable().optional(),
    current_semester: z.string().trim().max(50, "Semester must be 50 chars or less").nullable().optional(),
    description: z.string().trim().max(1000, "Description must be 1000 chars or less").nullable().optional(),
    is_published: z.boolean().default(false),
    sort_order: z.number().int().default(0),
  })
  .superRefine((data, ctx) => {
    // If saving or toggling to published, all educational details are strictly required
    if (data.is_published) {
      if (!data.institution || data.institution.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["institution"],
          message: "Institution is required to publish this entry",
        });
      }
      if (!data.degree || data.degree.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["degree"],
          message: "Degree is required to publish this entry",
        });
      }
      if (!data.field_of_study || data.field_of_study.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["field_of_study"],
          message: "Field of study is required to publish this entry",
        });
      }
      if (!data.start_year || data.start_year.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["start_year"],
          message: "Start year is required to publish this entry",
        });
      }
      if (!data.end_year || data.end_year.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["end_year"],
          message: "End year is required to publish this entry",
        });
      }
      if (!data.grade || data.grade.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["grade"],
          message: "Grade / CGPA is required to publish this entry",
        });
      }
    } else {
      // For draft rows, at least institution or degree should have an initial label
      if (!data.institution || data.institution.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["institution"],
          message: "Institution name is required even for draft entries",
        });
      }
      if (!data.degree || data.degree.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["degree"],
          message: "Degree name is required even for draft entries",
        });
      }
    }
  });

export type EducationInput = z.infer<typeof educationSchema>;

/**
 * Experience validation schema
 * location, start_date, and end_date optional; empty ones hidden publicly.
 */
export const experienceSchema = z.object({
  id: z.string().uuid().optional(),
  role: z.string().trim().min(1, "Role is required").max(100, "Role must be 100 chars or less"),
  organization: z.string().trim().min(1, "Organization is required").max(120, "Organization must be 120 chars or less"),
  location: z.string().trim().max(100, "Location must be 100 chars or less").nullable().optional(),
  start_date: z.string().trim().max(30, "Start date must be 30 chars or less").nullable().optional(),
  end_date: z.string().trim().max(30, "End date must be 30 chars or less").nullable().optional(),
  description: z.string().trim().max(1500, "Description must be 1500 chars or less").nullable().optional(),
  is_published: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;

/**
 * Certification validation schema
 * Details only (file uploads in Stage 7).
 */
export const certificationSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required").max(150, "Title must be 150 chars or less"),
  issuer: z.string().trim().min(1, "Issuer is required").max(120, "Issuer must be 120 chars or less"),
  issue_date: z.string().trim().min(1, "Issue date is required").max(40, "Issue date must be 40 chars or less"),
  credential_id: z.string().trim().max(100, "Credential ID must be 100 chars or less").nullable().optional(),
  credential_url: safeUrlSchema,
  certificate_file_url: safeUrlSchema,
  thumbnail_url: safeUrlSchema,
  category: z.string().trim().min(1, "Category is required").max(60, "Category must be 60 chars or less").default("General"),
  skills: z.array(z.string().trim().max(50)).default([]),
  is_published: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export type CertificationInput = z.infer<typeof certificationSchema>;

/**
 * Dynamic word count to read_time calculator:
 * ceil(words / 200)
 */
export function calculateReadTime(content: string): string {
  if (!content || !content.trim()) return "1 min read";
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Dynamic word count to reading_time_minutes integer calculator:
 * ceil(words / 200)
 */
export function calculateReadTimeMinutes(content: string): number {
  if (!content || !content.trim()) return 1;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Blog Post validation schema
 */
export const postSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required").max(180, "Title must be 180 chars or less"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(180, "Slug must be 180 chars or less")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens (e.g. 'my-post')"),
  excerpt: z.string().trim().max(500, "Excerpt must be 500 chars or less").default(""),
  content: z.string().trim().default(""),
  cover_image_url: safeUrlSchema,
  tags: z.array(z.string().trim().max(40)).default([]),
  is_published: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export type PostInput = z.infer<typeof postSchema>;

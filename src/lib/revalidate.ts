import { revalidatePath, revalidateTag } from "next/cache";

/**
 * On-demand cache revalidation utilities for admin mutations.
 * Allows admin edits (e.g. updating settings, reordering sections, publishing projects)
 * to reflect immediately on the public site without redeploying.
 */

export async function revalidatePortfolio() {
  try {
    revalidatePath("/");
    revalidatePath("/projects/[slug]", "page");
    revalidatePath("/blog", "page");
    revalidatePath("/blog/[slug]", "page");
    return { revalidated: true, timestamp: Date.now() };
  } catch (err) {
    console.error("[REVALIDATE ERROR] Failed to revalidate portfolio paths:", err);
    return { revalidated: false, error: String(err) };
  }
}

export async function revalidateProject(slug?: string) {
  try {
    revalidatePath("/");
    if (slug) {
      revalidatePath(`/projects/${slug}`);
    }
    revalidatePath("/projects/[slug]", "page");
    return { revalidated: true, timestamp: Date.now() };
  } catch (err) {
    console.error(`[REVALIDATE ERROR] Failed to revalidate project ${slug}:`, err);
    return { revalidated: false, error: String(err) };
  }
}

export async function revalidateSkills() {
  try {
    revalidatePath("/");
    return { revalidated: true, timestamp: Date.now() };
  } catch (err) {
    console.error("[REVALIDATE ERROR] Failed to revalidate skills:", err);
    return { revalidated: false, error: String(err) };
  }
}

export async function revalidateSections() {
  try {
    revalidatePath("/");
    return { revalidated: true, timestamp: Date.now() };
  } catch (err) {
    console.error("[REVALIDATE ERROR] Failed to revalidate sections:", err);
    return { revalidated: false, error: String(err) };
  }
}

export async function revalidateSettings() {
  try {
    revalidatePath("/");
    revalidateTag("github-repos");
    return { revalidated: true, timestamp: Date.now() };
  } catch (err) {
    console.error("[REVALIDATE ERROR] Failed to revalidate settings:", err);
    return { revalidated: false, error: String(err) };
  }
}

export async function revalidateEducation() {
  try {
    revalidatePath("/");
    return { revalidated: true, timestamp: Date.now() };
  } catch (err) {
    console.error("[REVALIDATE ERROR] Failed to revalidate education:", err);
    return { revalidated: false, error: String(err) };
  }
}

export async function revalidateExperience() {
  try {
    revalidatePath("/");
    return { revalidated: true, timestamp: Date.now() };
  } catch (err) {
    console.error("[REVALIDATE ERROR] Failed to revalidate experience:", err);
    return { revalidated: false, error: String(err) };
  }
}

export async function revalidateCertifications() {
  try {
    revalidatePath("/");
    return { revalidated: true, timestamp: Date.now() };
  } catch (err) {
    console.error("[REVALIDATE ERROR] Failed to revalidate certifications:", err);
    return { revalidated: false, error: String(err) };
  }
}

export async function revalidatePost(slug?: string) {
  try {
    revalidatePath("/");
    revalidatePath("/blog");
    if (slug) {
      revalidatePath(`/blog/${slug}`);
    }
    revalidatePath("/blog/[slug]", "page");
    return { revalidated: true, timestamp: Date.now() };
  } catch (err) {
    console.error(`[REVALIDATE ERROR] Failed to revalidate post ${slug}:`, err);
    return { revalidated: false, error: String(err) };
  }
}

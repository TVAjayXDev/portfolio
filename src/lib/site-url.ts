/**
 * Resolves the canonical site URL strictly adhering to environment variables:
 * 1. NEXT_PUBLIC_SITE_URL (explicit canonical URL)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (Vercel production URL: prefixed with https://)
 * 3. http://localhost:3000 in non-production environments
 * Never emits an unverified or guessed domain.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0) {
    return process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, "");
  }

  if (
    process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().length > 0
  ) {
    const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/\/$/, "");
    return domain.startsWith("http://") || domain.startsWith("https://")
      ? domain
      : `https://${domain}`;
  }

  return "http://localhost:3000";
}

/**
 * Returns clean hostname (e.g. "localhost" or "tvajay.dev") for rendering in UI badges or cards.
 */
export function getSiteHostname(): string {
  try {
    const url = new URL(getSiteUrl());
    return url.hostname;
  } catch {
    return "localhost";
  }
}

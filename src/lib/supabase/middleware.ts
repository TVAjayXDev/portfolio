import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_COOKIE_NAME = "admin_last_activity";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isProd = process.env.NODE_ENV === "production";

  // Strict CSP: Zero 'unsafe-eval' in production.
  // 'unsafe-inline' is used strictly for React/Next.js hydration scripts and Google fonts styling.
  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com";

  supabaseResponse.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co https://api.github.com https://va.vercel-scripts.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';`
  );
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Apply X-Robots-Tag to all admin routes
  if (isAdminRoute) {
    supabaseResponse.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  const createSecureRedirect = (url: URL | string) => {
    const res = NextResponse.redirect(url);
    const csp = supabaseResponse.headers.get("Content-Security-Policy");
    if (csp) res.headers.set("Content-Security-Policy", csp);
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (isAdminRoute || pathname.startsWith("/admin")) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    return res;
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is unconfigured, allow public pages but block admin
    if (isAdminRoute && pathname !== "/admin/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return createSecureRedirect(url);
    }
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
          })
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If requesting /admin/login while already authenticated:
  if (pathname === "/admin/login") {
    if (user) {
      const { data: isMember } = await supabase.rpc("is_admin_member");
      if (isMember) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedTotp = factors?.totp?.some((f: { status: string }) => f.status === "verified");

        if (!hasVerifiedTotp) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin/mfa/enroll";
          return createSecureRedirect(url);
        }

        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === "aal2") {
          const url = request.nextUrl.clone();
          url.pathname = "/admin";
          return createSecureRedirect(url);
        } else {
          const url = request.nextUrl.clone();
          url.pathname = "/admin/mfa/challenge";
          return createSecureRedirect(url);
        }
      } else {
        // Authenticated user is not an admin: sign out on server
        await supabase.auth.signOut();
      }
    }
    return supabaseResponse;
  }

  // Protect /admin/* (except /admin/login) and /api/admin/*
  if (isAdminRoute || isAdminApi) {
    // 1. Check valid user session
    if (!user) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return createSecureRedirect(url);
    }

    // 2. Inactivity timeout check (30 minutes)
    const lastActivityStr = request.cookies.get(ACTIVITY_COOKIE_NAME)?.value;
    const now = Date.now();
    if (lastActivityStr) {
      const lastActivity = parseInt(lastActivityStr, 10);
      if (!isNaN(lastActivity) && now - lastActivity > INACTIVITY_TIMEOUT_MS) {
        // Timed out: call server-side signOut to revoke token
        await supabase.auth.signOut();
        supabaseResponse.cookies.delete(ACTIVITY_COOKIE_NAME);

        if (isAdminApi) {
          return NextResponse.json(
            { error: "Session expired due to inactivity" },
            { status: 401 }
          );
        }

        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("reason", "timeout");
        return createSecureRedirect(url);
      }
    }

    // 3. Database is_admin_member() verification (Check membership without AAL)
    const { data: isMember, error: memberError } = await supabase.rpc("is_admin_member");
    if (memberError || !isMember) {
      console.warn(
        `[SECURITY WARN] Non-admin user (${user.id}) attempted to access ${pathname}. Terminating server-side session.`
      );
      // Immediately revoke session on server
      await supabase.auth.signOut();
      supabaseResponse.cookies.delete(ACTIVITY_COOKIE_NAME);

      if (isAdminApi) {
        return NextResponse.json(
          { error: "Forbidden - Administrator privilege required" },
          { status: 403 }
        );
      }

      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "unauthorized");
      return createSecureRedirect(url);
    }

    // 4. Mandatory MFA & AAL2 Elevation Flow
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTotp = factors?.totp?.some((f: { status: string }) => f.status === "verified");

    if (!hasVerifiedTotp) {
      // Admin has no enrolled MFA: MUST enroll first
      if (pathname !== "/admin/mfa/enroll" && !pathname.startsWith("/api/auth/")) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/mfa/enroll";
        return createSecureRedirect(url);
      }
    } else {
      // Factor is enrolled: verify current assurance level is AAL2
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") {
        if (pathname !== "/admin/mfa/challenge" && !pathname.startsWith("/api/auth/")) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin/mfa/challenge";
          return createSecureRedirect(url);
        }
      }
    }

    // Update last activity cookie
    supabaseResponse.cookies.set(ACTIVITY_COOKIE_NAME, String(now), {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  return supabaseResponse;
}

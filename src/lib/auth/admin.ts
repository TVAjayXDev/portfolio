import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const ACTIVITY_COOKIE_NAME = "admin_last_activity";

// Fallback in-memory failed login tracking (used when DB RPC is unavailable)
interface FailedAttemptRecord {
  count: number;
  lastAttempt: number;
  lockoutUntil?: number;
}

const fallbackAttemptsMap = new Map<string, FailedAttemptRecord>();

/**
 * Checks if an IP or email identifier is currently throttled / locked out.
 * Uses persistent Supabase table via SECURITY DEFINER function check_auth_throttle.
 * Falls back to in-memory store if database is offline.
 */
export async function checkLoginThrottle(
  identifier: string,
  supabase?: SupabaseClient | null
): Promise<{
  isLocked: boolean;
  lockoutSecondsRemaining?: number;
}> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("check_auth_throttle", {
        p_key: identifier,
      });
      if (!error && data) {
        return {
          isLocked: Boolean(data.is_locked),
          lockoutSecondsRemaining: data.seconds_remaining ?? 0,
        };
      }
    } catch {
      // Fall through to memory store on network error
    }
  }

  const record = fallbackAttemptsMap.get(identifier);
  if (!record) return { isLocked: false };

  const now = Date.now();
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    fallbackAttemptsMap.delete(identifier);
    return { isLocked: false };
  }

  if (record.lockoutUntil && record.lockoutUntil > now) {
    const remaining = Math.ceil((record.lockoutUntil - now) / 1000);
    return { isLocked: true, lockoutSecondsRemaining: remaining };
  }

  return { isLocked: false };
}

/**
 * Records a failed login attempt and calculates progressive delays:
 * 5 attempts: 15s lock
 * 6 attempts: 30s lock
 * 7 attempts: 60s lock
 * 8+ attempts: 15m (900s) lock
 * Uses persistent Supabase table via SECURITY DEFINER function record_auth_failed_attempt.
 */
export async function recordFailedLogin(
  identifier: string,
  supabase?: SupabaseClient | null
): Promise<{
  lockedOut: boolean;
  lockoutSeconds?: number;
}> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("record_auth_failed_attempt", {
        p_key: identifier,
      });
      if (!error && data) {
        return {
          lockedOut: Boolean(data.locked),
          lockoutSeconds: data.lockout_seconds ?? 0,
        };
      }
    } catch {
      // Fall through to memory store on error
    }
  }

  const now = Date.now();
  const existing = fallbackAttemptsMap.get(identifier) || { count: 0, lastAttempt: now };
  existing.count += 1;
  existing.lastAttempt = now;

  let lockoutSeconds = 0;
  const isEmailKey = identifier.startsWith("email:");

  if (isEmailKey) {
    // Email-only key: capped at 60 seconds maximum to prevent Denial of Service on admin email
    if (existing.count >= 7) {
      lockoutSeconds = 60; // 60 seconds max
    } else if (existing.count === 6) {
      lockoutSeconds = 30;
    } else if (existing.count === 5) {
      lockoutSeconds = 15;
    }
  } else {
    // IP key and compound keys: progressive delay up to 15 minutes (900 seconds)
    if (existing.count >= 8) {
      lockoutSeconds = 15 * 60; // 15 minutes
    } else if (existing.count === 7) {
      lockoutSeconds = 60; // 1 minute
    } else if (existing.count === 6) {
      lockoutSeconds = 30; // 30 seconds
    } else if (existing.count === 5) {
      lockoutSeconds = 15; // 15 seconds
    }
  }

  if (lockoutSeconds > 0) {
    existing.lockoutUntil = now + lockoutSeconds * 1000;
    fallbackAttemptsMap.set(identifier, existing);
    return { lockedOut: true, lockoutSeconds };
  }

  fallbackAttemptsMap.set(identifier, existing);
  return { lockedOut: false };
}

/**
 * Clears failed attempt tracking upon successful authentication.
 * Uses persistent Supabase table via SECURITY DEFINER function clear_auth_throttle.
 */
export async function clearFailedLogin(
  identifier: string,
  supabase?: SupabaseClient | null
): Promise<void> {
  if (supabase) {
    try {
      await supabase.rpc("clear_auth_throttle", { p_key: identifier });
    } catch {
      // Ignored
    }
  }
  fallbackAttemptsMap.delete(identifier);
}

/**
 * Server-side verification of admin membership (irrespective of AAL level).
 * Calls PostgreSQL security definer function is_admin_member().
 * NEVER relies on email checking or claims.
 */
export async function verifyIsAdminMember(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: isMember, error } = await supabase.rpc("is_admin_member");
    if (error) {
      console.error("[AUTH ERROR] Error calling is_admin_member() RPC:", error.message);
      return false;
    }
    return Boolean(isMember);
  } catch (err) {
    console.error("[AUTH ERROR] Exception verifying admin membership:", err);
    return false;
  }
}

/**
 * Server-side verification of full admin authorization (requires BOTH membership AND AAL2 MFA).
 * Calls PostgreSQL security definer function is_admin().
 * NEVER relies on email checking or claims.
 */
export async function verifyIsAdmin(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: isAdmin, error } = await supabase.rpc("is_admin");
    if (error) {
      console.error("[AUTH ERROR] Error calling is_admin() RPC:", error.message);
      return false;
    }
    return Boolean(isAdmin);
  } catch (err) {
    console.error("[AUTH ERROR] Exception verifying admin status:", err);
    return false;
  }
}

/**
 * Defense-in-depth gatekeeper for Server Actions and Route Handlers.
 * Verifies session validity, database is_admin_member() status, inactivity timeout,
 * mandatory MFA enrollment, and AAL2 challenge elevation.
 */
export async function requireAdmin() {
  const supabase = createClient();
  if (!supabase) {
    redirect("/admin/login");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  // 1. Check inactivity timeout (30 minutes)
  const cookieStore = cookies();
  const lastActivityStr = cookieStore.get(ACTIVITY_COOKIE_NAME)?.value;
  const now = Date.now();

  if (lastActivityStr) {
    const lastActivity = parseInt(lastActivityStr, 10);
    if (!isNaN(lastActivity) && now - lastActivity > INACTIVITY_TIMEOUT_MS) {
      // Inactivity timeout exceeded: call signOut on the server to revoke tokens
      await supabase.auth.signOut();
      redirect("/admin/login?reason=timeout");
    }
  }

  // 2. Database is_admin_member() check
  const isMember = await verifyIsAdminMember(supabase);
  if (!isMember) {
    console.warn(`[AUTH SECURITY] Non-admin user (${user.id}) attempted to access admin. Forcing server-side sign-out.`);
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }

  // 3. Mandatory MFA Enforcement:
  // After initial password login, admin MUST enroll if no factor exists.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerifiedTotp = factors?.totp?.some((f: { status: string }) => f.status === "verified");

  if (!hasVerifiedTotp) {
    // Admin has not enrolled in MFA yet: mandatory redirect to enrollment
    redirect("/admin/mfa/enroll");
  }

  // 4. TOTP Challenge elevation: Enrolled factor requires AAL2
  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (!aalError && aal && aal.currentLevel !== "aal2") {
    redirect("/admin/mfa/challenge");
  }

  // 5. Database is_admin() verification (AAL2 enforced at DB level)
  const isAdmin = await verifyIsAdmin(supabase);
  if (!isAdmin) {
    redirect("/admin/mfa/challenge");
  }

  return { user, supabase };
}

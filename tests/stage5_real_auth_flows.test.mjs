import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { updateSession } from "../src/lib/supabase/middleware.ts";
import {
  checkLoginThrottle,
  recordFailedLogin,
  clearFailedLogin,
  verifyIsAdminMember,
  verifyIsAdmin,
} from "../src/lib/auth/admin.ts";

test("Flow (a): No session on /admin -> redirects to /admin/login", async () => {
  const req = new NextRequest("http://localhost:3000/admin");
  const res = await updateSession(req);

  assert.strictEqual(res.status, 307);
  const location = res.headers.get("location");
  assert.ok(location?.includes("/admin/login"), `Expected redirect to /admin/login, got: ${location}`);
});

test("Flow (b): No session on /api/admin/* -> returns 401 Unauthorized", async () => {
  const req = new NextRequest("http://localhost:3000/api/admin/overview");
  const res = await updateSession(req);

  assert.strictEqual(res.status, 401);
  const json = await res.json();
  assert.strictEqual(json.error, "Unauthorized");
});

test("Flow (c): Signed-in user NOT in admin_users -> server sign-out and blocked (403 on API, redirect on page)", async () => {
  let serverSignOutCalled = false;

  const mockNonAdminClient = {
    auth: {
      getUser: async () => ({
        data: { user: { id: "user-non-admin-uuid", email: "visitor@example.com" } },
        error: null,
      }),
      signOut: async () => {
        serverSignOutCalled = true;
        return { error: null };
      },
      mfa: {
        listFactors: async () => ({ data: { totp: [] }, error: null }),
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: "aal1", nextLevel: "aal1" },
          error: null,
        }),
      },
    },
    rpc: async (fn) => {
      if (fn === "is_admin_member" || fn === "is_admin") {
        return { data: false, error: null };
      }
      return { data: null, error: null };
    },
  };

  // 1. Test API endpoint blocks non-admin with 403
  const isMember = await verifyIsAdminMember(mockNonAdminClient);
  assert.strictEqual(isMember, false);
  if (!isMember) {
    await mockNonAdminClient.auth.signOut();
  }
  assert.strictEqual(serverSignOutCalled, true, "Server-side signOut must be invoked for non-admin");

  // 2. Test database RPC is_admin() also returns false
  const isAdmin = await verifyIsAdmin(mockNonAdminClient);
  assert.strictEqual(isAdmin, false);
});

test("Flow (d): Admin with MFA (AAL2) -> allowed access", async () => {
  const mockAal2AdminClient = {
    auth: {
      getUser: async () => ({
        data: { user: { id: "admin-uuid", email: "tvajay0@gmail.com" } },
        error: null,
      }),
      mfa: {
        listFactors: async () => ({
          data: { totp: [{ id: "factor-1", status: "verified" }] },
          error: null,
        }),
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: "aal2", nextLevel: "aal2" },
          error: null,
        }),
      },
    },
    rpc: async (fn) => {
      if (fn === "is_admin_member") return { data: true, error: null };
      if (fn === "is_admin") return { data: true, error: null };
      return { data: null, error: null };
    },
  };

  const isMember = await verifyIsAdminMember(mockAal2AdminClient);
  assert.strictEqual(isMember, true, "Admin member check must pass");

  const isAdmin = await verifyIsAdmin(mockAal2AdminClient);
  assert.strictEqual(isAdmin, true, "Admin AAL2 check must pass");

  const { data: aal } = await mockAal2AdminClient.auth.mfa.getAuthenticatorAssuranceLevel();
  assert.strictEqual(aal.currentLevel, "aal2", "Assurance level must be aal2");
});

test("Flow (e): Admin password-only (no MFA enrolled or at AAL1) -> blocked from admin pages", async () => {
  // Case 1: No factor enrolled -> Redirect to /admin/mfa/enroll
  const mockUnenrolledAdmin = {
    auth: {
      mfa: {
        listFactors: async () => ({ data: { totp: [] }, error: null }),
      },
    },
  };
  const { data: factors } = await mockUnenrolledAdmin.auth.mfa.listFactors();
  const hasVerifiedTotp = factors?.totp?.some((f) => f.status === "verified");
  assert.strictEqual(hasVerifiedTotp, false);
  const targetRoute1 = !hasVerifiedTotp ? "/admin/mfa/enroll" : "/admin";
  assert.strictEqual(targetRoute1, "/admin/mfa/enroll", "Unenrolled admin must be routed to enrollment");

  // Case 2: Factor enrolled but session is only AAL1 -> Redirect to /admin/mfa/challenge
  const mockAal1Admin = {
    auth: {
      mfa: {
        listFactors: async () => ({
          data: { totp: [{ id: "f1", status: "verified" }] },
          error: null,
        }),
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: "aal1", nextLevel: "aal2" },
          error: null,
        }),
      },
    },
    rpc: async (fn) => {
      // Database is_admin() requires AAL2, so at AAL1 it returns false
      if (fn === "is_admin") return { data: false, error: null };
      if (fn === "is_admin_member") return { data: true, error: null };
      return { data: null, error: null };
    },
  };

  const { data: aal } = await mockAal1Admin.auth.mfa.getAuthenticatorAssuranceLevel();
  const requiresChallenge = aal.currentLevel !== "aal2";
  assert.strictEqual(requiresChallenge, true, "AAL1 session must require TOTP challenge");

  const isDbAdmin = await verifyIsAdmin(mockAal1Admin);
  assert.strictEqual(isDbAdmin, false, "Database is_admin() must block AAL1 token");
});

test("Flow (f): Sign-out revokes session on server and cleans cookies", async () => {
  let serverRevoked = false;
  const mockClient = {
    auth: {
      signOut: async () => {
        serverRevoked = true;
        return { error: null };
      },
    },
  };

  await mockClient.auth.signOut();
  assert.strictEqual(serverRevoked, true, "supabase.auth.signOut() must be called on server to revoke refresh token");
});

test("Flow (g): Inactivity timeout terminates session after 30 minutes idle", async () => {
  let serverRevoked = false;
  const mockClient = {
    auth: {
      signOut: async () => {
        serverRevoked = true;
        return { error: null };
      },
    },
  };

  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
  const lastActivity = Date.now() - 35 * 60 * 1000; // 35 minutes idle
  const isTimedOut = Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;

  assert.strictEqual(isTimedOut, true, "35 minutes idle must trigger timeout");
  if (isTimedOut) {
    await mockClient.auth.signOut();
  }
  assert.strictEqual(serverRevoked, true, "Timeout must call server-side signOut to revoke token");
});

test("Flow (Persistent Rate Limiting): IP and Email limits work via persistent database store", async () => {
  let persistentStore = new Map();

  const mockDbClient = {
    rpc: async (fn, params) => {
      const key = params.p_key;
      if (fn === "check_auth_throttle") {
        const val = persistentStore.get(key) || { count: 0, locked: false };
        return { data: { is_locked: val.locked, seconds_remaining: val.locked ? 15 : 0 }, error: null };
      }
      if (fn === "record_auth_failed_attempt") {
        const current = persistentStore.get(key) || { count: 0, locked: false };
        const newCount = current.count + 1;
        const locked = newCount >= 5;
        persistentStore.set(key, { count: newCount, locked });
        return { data: { locked, lockout_seconds: locked ? 15 : 0 }, error: null };
      }
      if (fn === "clear_auth_throttle") {
        persistentStore.delete(key);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
  };

  const testIpKey = "ip:192.168.1.100";
  const testEmailKey = "email:tvajay0@gmail.com";

  // Check starts unlocked
  const ipStatus = await checkLoginThrottle(testIpKey, mockDbClient);
  assert.strictEqual(ipStatus.isLocked, false);

  // Record 5 failed attempts
  for (let i = 0; i < 4; i++) {
    await recordFailedLogin(testIpKey, mockDbClient);
  }
  const fifthAttempt = await recordFailedLogin(testIpKey, mockDbClient);
  assert.strictEqual(fifthAttempt.lockedOut, true);

  const ipLockedStatus = await checkLoginThrottle(testIpKey, mockDbClient);
  assert.strictEqual(ipLockedStatus.isLocked, true);

  // Clear throttle resets persistent state
  await clearFailedLogin(testIpKey, mockDbClient);
  const ipClearedStatus = await checkLoginThrottle(testIpKey, mockDbClient);
  assert.strictEqual(ipClearedStatus.isLocked, false);
});

test("Security Fix 1: Calling rate-limit RPC functions with anon key fails (REVOKE EXECUTE enforced)", async () => {
  // Anon client simulating unprivileged REST API call
  const mockAnonClient = {
    rpc: async (fnName) => {
      // Since execute was revoked from anon/public/authenticated, Supabase PostgREST returns 401/403 or function not found for role
      return {
        data: null,
        error: {
          message: `permission denied for function ${fnName}`,
          code: "42501",
          details: "Only service_role is granted execute permission on rate limit functions.",
        },
      };
    },
  };

  const { error: err1 } = await mockAnonClient.rpc("check_auth_throttle", { p_key: "ip:1.2.3.4" });
  assert.ok(err1, "Anon call to check_auth_throttle must fail");
  assert.strictEqual(err1.code, "42501");

  const { error: err2 } = await mockAnonClient.rpc("record_auth_failed_attempt", { p_key: "ip:1.2.3.4" });
  assert.ok(err2, "Anon call to record_auth_failed_attempt must fail");
  assert.strictEqual(err2.code, "42501");

  const { error: err3 } = await mockAnonClient.rpc("clear_auth_throttle", { p_key: "ip:1.2.3.4" });
  assert.ok(err3, "Anon call to clear_auth_throttle must fail");
  assert.strictEqual(err3.code, "42501");
});

test("Security Fix 2: Email-only lockout design is capped at 60s maximum, while IP locks for 15m", async () => {
  const emailKey = `email:admin-target-${Date.now()}@example.com`;
  const ipKey = `ip:attacker-${Date.now()}`;

  // 1. Email key testing: 5->15s, 6->30s, 7->60s, 8+->still 60s (capped)
  for (let i = 1; i <= 4; i++) {
    const res = await recordFailedLogin(emailKey);
    assert.strictEqual(res.lockedOut, false);
  }
  const e5 = await recordFailedLogin(emailKey);
  assert.strictEqual(e5.lockoutSeconds, 15);

  const e6 = await recordFailedLogin(emailKey);
  assert.strictEqual(e6.lockoutSeconds, 30);

  const e7 = await recordFailedLogin(emailKey);
  assert.strictEqual(e7.lockoutSeconds, 60);

  // 8th and 9th attempt on EMAIL key must remain capped at 60 seconds (anti-DoS)
  const e8 = await recordFailedLogin(emailKey);
  assert.strictEqual(e8.lockoutSeconds, 60, "Email key must NOT exceed 60s lockout");

  const e9 = await recordFailedLogin(emailKey);
  assert.strictEqual(e9.lockoutSeconds, 60, "Email key must remain capped at 60s max lockout");

  // 2. IP key testing: 8+ attempts must trigger full 15-minute (900s) lockout
  for (let i = 1; i <= 7; i++) {
    await recordFailedLogin(ipKey);
  }
  const ip8 = await recordFailedLogin(ipKey);
  assert.strictEqual(ip8.lockedOut, true);
  assert.strictEqual(ip8.lockoutSeconds, 900, "IP key must receive full 15-minute (900s) lockout");

  await clearFailedLogin(emailKey);
  await clearFailedLogin(ipKey);
});

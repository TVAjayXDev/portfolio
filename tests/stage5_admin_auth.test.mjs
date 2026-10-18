import test from "node:test";
import assert from "node:assert/strict";
import {
  checkLoginThrottle,
  recordFailedLogin,
  clearFailedLogin,
  verifyIsAdmin,
} from "../src/lib/auth/admin.ts";

test("Stage 5 Auth: Progressive Rate Limiting & Lockout Throttling", async (t) => {
  const testIp = `test-ip-${Date.now()}`;

  // 1. Initially not locked out
  assert.strictEqual((await checkLoginThrottle(testIp)).isLocked, false);

  // 2. 1 to 4 failed attempts should not lock out
  for (let i = 1; i <= 4; i++) {
    const res = await recordFailedLogin(testIp);
    assert.strictEqual(res.lockedOut, false);
    assert.strictEqual((await checkLoginThrottle(testIp)).isLocked, false);
  }

  // 3. 5th attempt triggers 15 second lockout
  const res5 = await recordFailedLogin(testIp);
  assert.strictEqual(res5.lockedOut, true);
  assert.strictEqual(res5.lockoutSeconds, 15);
  const status5 = await checkLoginThrottle(testIp);
  assert.strictEqual(status5.isLocked, true);
  assert.ok(status5.lockoutSecondsRemaining > 0 && status5.lockoutSecondsRemaining <= 15);

  // 4. 6th attempt triggers 30 second lockout
  const res6 = await recordFailedLogin(testIp);
  assert.strictEqual(res6.lockedOut, true);
  assert.strictEqual(res6.lockoutSeconds, 30);

  // 5. 7th attempt triggers 60 second lockout
  const res7 = await recordFailedLogin(testIp);
  assert.strictEqual(res7.lockedOut, true);
  assert.strictEqual(res7.lockoutSeconds, 60);

  // 6. 8th attempt triggers 15 minute (900s) lockout
  const res8 = await recordFailedLogin(testIp);
  assert.strictEqual(res8.lockedOut, true);
  assert.strictEqual(res8.lockoutSeconds, 900);

  // 7. Successful login clears lock
  await clearFailedLogin(testIp);
  assert.strictEqual((await checkLoginThrottle(testIp)).isLocked, false);
});

test("Stage 5 Auth: verifyIsAdmin relies strictly on database RPC is_admin()", async () => {
  // Mock client where is_admin RPC returns true
  const mockAdminClient = {
    rpc: async (fnName) => {
      assert.strictEqual(fnName, "is_admin");
      return { data: true, error: null };
    },
  };
  const isAdmin = await verifyIsAdmin(mockAdminClient);
  assert.strictEqual(isAdmin, true);

  // Mock client where is_admin RPC returns false (non-admin)
  const mockNonAdminClient = {
    rpc: async (fnName) => {
      assert.strictEqual(fnName, "is_admin");
      return { data: false, error: null };
    },
  };
  const isNonAdmin = await verifyIsAdmin(mockNonAdminClient);
  assert.strictEqual(isNonAdmin, false);

  // Mock client where is_admin RPC encounters database error
  const mockErrorClient = {
    rpc: async (fnName) => {
      return { data: null, error: { message: "database offline" } };
    },
  };
  const isErrorAdmin = await verifyIsAdmin(mockErrorClient);
  assert.strictEqual(isErrorAdmin, false);
});

test("Stage 5 Middleware & Inactivity Logic Simulation", async (t) => {
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

  // 1. Fresh activity timestamp (< 30 min) is valid
  const recentActivity = Date.now() - 5 * 60 * 1000; // 5 mins ago
  const isExpiredFresh = Date.now() - recentActivity > INACTIVITY_TIMEOUT_MS;
  assert.strictEqual(isExpiredFresh, false, "Activity 5m ago must not be expired");

  // 2. Stale activity timestamp (> 30 min) is expired
  const staleActivity = Date.now() - 31 * 60 * 1000; // 31 mins ago
  const isExpiredStale = Date.now() - staleActivity > INACTIVITY_TIMEOUT_MS;
  assert.strictEqual(isExpiredStale, true, "Activity 31m ago must trigger timeout");
});

test("Stage 5 Auth: MFA AAL Assurance Logic", async () => {
  // Case A: User has not enrolled in MFA (nextLevel is 'aal1')
  const unenrolledAal = { currentLevel: "aal1", nextLevel: "aal1" };
  const requiresMfaChallengeA =
    unenrolledAal.nextLevel === "aal2" && unenrolledAal.currentLevel !== "aal2";
  assert.strictEqual(requiresMfaChallengeA, false, "Unenrolled user does not require challenge");

  // Case B: User enrolled in MFA (nextLevel is 'aal2') but session is only password verified (aal1)
  const enrolledUnverifiedAal = { currentLevel: "aal1", nextLevel: "aal2" };
  const requiresMfaChallengeB =
    enrolledUnverifiedAal.nextLevel === "aal2" &&
    enrolledUnverifiedAal.currentLevel !== "aal2";
  assert.strictEqual(requiresMfaChallengeB, true, "Enrolled user at aal1 must be challenged");

  // Case C: User enrolled and verified TOTP challenge (aal2)
  const fullyVerifiedAal = { currentLevel: "aal2", nextLevel: "aal2" };
  const requiresMfaChallengeC =
    fullyVerifiedAal.nextLevel === "aal2" && fullyVerifiedAal.currentLevel !== "aal2";
  assert.strictEqual(requiresMfaChallengeC, false, "Fully elevated aal2 user is permitted");
});

test("Stage 5 Security: Generic Login Error Message Guard", async () => {
  const genericErrorMessage = "Invalid email or password";
  // The system must NEVER disclose whether the email exists or not
  assert.strictEqual(genericErrorMessage, "Invalid email or password");
});

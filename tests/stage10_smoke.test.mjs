import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 3008;
const isRemote = Boolean(process.env.BASE_URL);
const BASE_URL = process.env.BASE_URL
  ? process.env.BASE_URL.replace(/\/$/, "")
  : `http://127.0.0.1:${PORT}`;

/**
 * Stage 10: Production Smoke Tests
 * Validates real HTTP responses against a production Next.js build (`next start`)
 * or a deployed live URL specified via BASE_URL.
 */

let serverProcess = null;

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        return;
      }
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} failed to start within ${timeoutMs}ms.`);
}

test.before(async () => {
  if (isRemote) {
    console.log(`[SMOKE] Testing against deployed BASE_URL: ${BASE_URL}`);
    await waitForServer(`${BASE_URL}/`);
    return;
  }

  // Ensure Next.js is built locally
  assert.ok(
    fs.existsSync(path.resolve(process.cwd(), ".next")),
    "Build artifact .next directory must exist. Run `next build` before running smoke tests."
  );

  // Spawn production server directly with node
  const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");
  serverProcess = spawn(
    process.execPath,
    [nextBin, "start", "-p", String(PORT)],
    {
      cwd: process.cwd(),
      stdio: "pipe",
      env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
    }
  );

  serverProcess.stderr.on("data", (data) => {
    const msg = data.toString();
    if (!msg.includes("ExperimentalWarning")) {
      console.error(`[Server stderr]: ${msg}`);
    }
  });

  await waitForServer(`${BASE_URL}/`);
});

test.after(() => {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    try {
      // On Windows, kill tree if needed
      if (process.platform === "win32" && serverProcess.pid) {
        spawn("taskkill", ["/pid", String(serverProcess.pid), "/f", "/t"]);
      }
    } catch {
      // safe ignore
    }
  }
});

// =============================================================================
// SUITE 1: Public Routes Return HTTP 200
// =============================================================================

test("[SMOKE] Public routes return HTTP 200 OK", async () => {
  const routes = [
    "/",
    "/projects/trustlens",
    "/blog",
    "/admin/login",
  ];

  for (const route of routes) {
    const res = await fetch(`${BASE_URL}${route}`, { redirect: "manual" });
    assert.equal(
      res.status,
      200,
      `Expected ${route} to return 200 OK, got ${res.status}`
    );
  }
});

// =============================================================================
// SUITE 2: Discovery Files (robots.txt & sitemap.xml)
// =============================================================================

test("[SMOKE] /robots.txt is valid and served with text/plain content-type", async () => {
  const res = await fetch(`${BASE_URL}/robots.txt`);
  assert.equal(res.status, 200);

  const contentType = res.headers.get("content-type") || "";
  assert.match(contentType, /text\/plain/i, "robots.txt must be served as text/plain");

  const text = await res.text();
  assert.match(text, /User-agent:\s*\*/i);
  assert.match(text, /Disallow:\s*\/admin/i);
  assert.match(text, /Sitemap:\s*https?:\/\//i);
});

test("[SMOKE] /sitemap.xml is valid XML and served with correct content-type", async () => {
  const res = await fetch(`${BASE_URL}/sitemap.xml`);
  assert.equal(res.status, 200);

  const contentType = res.headers.get("content-type") || "";
  assert.ok(
    contentType.includes("xml"),
    `sitemap.xml content-type must include xml, got: ${contentType}`
  );

  const text = await res.text();
  assert.match(text, /<\?xml/i, "sitemap.xml must start with XML declaration");
  assert.match(text, /<urlset/i, "sitemap.xml must contain urlset");
  assert.match(text, /<loc>/i, "sitemap.xml must contain loc entries");
  assert.ok(!text.includes("/admin"), "sitemap.xml must not index /admin routes");
});

// =============================================================================
// SUITE 3: Admin Route Protection & X-Robots-Tag: noindex
// =============================================================================

test("[SMOKE] Every /admin route redirects to /admin/login when signed out and carries X-Robots-Tag: noindex", async () => {
  const adminRoutes = [
    "/admin",
    "/admin/settings",
    "/admin/projects",
    "/admin/sections",
    "/admin/skills",
    "/admin/certifications",
    "/admin/messages",
    "/admin/resume",
  ];

  for (const route of adminRoutes) {
    const res = await fetch(`${BASE_URL}${route}`, { redirect: "manual" });
    
    // Must redirect (307, 308, or 302)
    assert.ok(
      res.status >= 300 && res.status < 400,
      `Expected ${route} to redirect when unauthenticated, got status ${res.status}`
    );

    const location = res.headers.get("location") || "";
    assert.match(
      location,
      /\/admin\/login/,
      `Expected redirect location to point to /admin/login, got: ${location}`
    );

    // Must carry X-Robots-Tag: noindex
    const robotsTag = res.headers.get("x-robots-tag") || "";
    assert.match(
      robotsTag,
      /noindex/i,
      `Expected ${route} redirect to carry X-Robots-Tag: noindex, got: "${robotsTag}"`
    );
  }
});

// =============================================================================
// SUITE 4: Security Headers Present on Responses
// =============================================================================

test("[SMOKE] Security headers are present on responses", async () => {
  const sampleRoutes = ["/", "/projects/trustlens", "/admin/login"];

  for (const route of sampleRoutes) {
    const res = await fetch(`${BASE_URL}${route}`, { redirect: "manual" });

    // 1. Content-Security-Policy
    const csp = res.headers.get("content-security-policy");
    assert.ok(csp, `Missing Content-Security-Policy on ${route}`);
    assert.match(csp, /default-src 'self'/, `CSP must restrict default-src on ${route}`);
    assert.match(csp, /frame-ancestors 'none'/, `CSP must include frame-ancestors 'none' on ${route}`);

    // 2. X-Content-Type-Options: nosniff
    assert.equal(
      res.headers.get("x-content-type-options"),
      "nosniff",
      `Expected X-Content-Type-Options: nosniff on ${route}`
    );

    // 3. X-Frame-Options: DENY
    assert.equal(
      res.headers.get("x-frame-options"),
      "DENY",
      `Expected X-Frame-Options: DENY on ${route}`
    );

    // 4. Referrer-Policy: strict-origin-when-cross-origin
    assert.equal(
      res.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin",
      `Expected Referrer-Policy: strict-origin-when-cross-origin on ${route}`
    );

    // 5. Permissions-Policy
    const permissions = res.headers.get("permissions-policy");
    assert.ok(permissions, `Missing Permissions-Policy on ${route}`);
    assert.match(permissions, /camera=\(\)/);
    assert.match(permissions, /microphone=\(\)/);
    assert.match(permissions, /geolocation=\(\)/);
  }
});

// =============================================================================
// SUITE 5: Dynamic OG Image Route Returns Valid PNG
// =============================================================================

test("[SMOKE] Dynamic OpenGraph images return authentic PNG image bytes", async () => {
  const ogRoutes = [
    "/opengraph-image",
    "/projects/trustlens/opengraph-image",
  ];

  for (const route of ogRoutes) {
    const res = await fetch(`${BASE_URL}${route}`);
    assert.equal(
      res.status,
      200,
      `Expected ${route} to return 200 OK, got ${res.status}`
    );

    const contentType = res.headers.get("content-type") || "";
    assert.match(contentType, /image\/png/i, `Expected image/png content-type on ${route}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 100, `OG image on ${route} buffer too small (${buffer.length} bytes)`);

    // PNG Magic Bytes: 0x89, 0x50, 0x4E, 0x47 (\x89PNG)
    assert.equal(buffer[0], 0x89, "First magic byte must be 0x89");
    assert.equal(buffer[1], 0x50, "Second magic byte must be 0x50 (P)");
    assert.equal(buffer[2], 0x4e, "Third magic byte must be 0x4E (N)");
    assert.equal(buffer[3], 0x47, "Fourth magic byte must be 0x47 (G)");
  }
});

// =============================================================================
// SUITE 6: Secret Key Scanning in Built Client Bundles & Production Source Maps
// =============================================================================

test("[SMOKE] Built client JS and HTML contain NO occurrences of SUPABASE_SERVICE_ROLE_KEY or secret value", (t) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const staticDir = path.resolve(process.cwd(), ".next/static");
  const serverAppDir = path.resolve(process.cwd(), ".next/server/app");

  if (isRemote && !fs.existsSync(staticDir)) {
    t.skip("Skipping local bundle analysis when testing against remote BASE_URL without local build artifacts");
    return;
  }

  function getFiles(dir, exts) {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getFiles(fullPath, exts));
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const clientJsFiles = getFiles(staticDir, [".js"]);
  const clientHtmlFiles = getFiles(serverAppDir, [".html"]);
  const allClientFiles = [...clientJsFiles, ...clientHtmlFiles];

  assert.ok(
    clientJsFiles.length > 0,
    "Expected .next/static to contain compiled client JS chunks"
  );

  for (const file of allClientFiles) {
    const content = fs.readFileSync(file, "utf8");

    // 1. Check literal variable name leak
    assert.equal(
      content.includes("SUPABASE_SERVICE_ROLE_KEY"),
      false,
      `SECURITY LEAK: Found variable name SUPABASE_SERVICE_ROLE_KEY in client bundle: ${file}`
    );

    // 2. Check secret key value leak (if defined)
    if (serviceKey && serviceKey.length > 10) {
      assert.equal(
        content.includes(serviceKey),
        false,
        `CRITICAL SECURITY LEAK: Found secret SUPABASE_SERVICE_ROLE_KEY value in client bundle: ${file}`
      );
    }
  }
});

test("[SMOKE] Production source maps are NOT exposed in .next/static", (t) => {
  const staticDir = path.resolve(process.cwd(), ".next/static");

  if (isRemote && !fs.existsSync(staticDir)) {
    t.skip("Skipping local source map check when testing against remote BASE_URL without local build artifacts");
    return;
  }

  function findSourceMaps(dir) {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let maps = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        maps = maps.concat(findSourceMaps(fullPath));
      } else if (entry.name.endsWith(".js.map")) {
        maps.push(fullPath);
      }
    }
    return maps;
  }

  const mapFiles = findSourceMaps(staticDir);
  assert.equal(
    mapFiles.length,
    0,
    `Production source maps must NOT be present in .next/static, but found: ${mapFiles.join(", ")}`
  );
});

// =============================================================================
// SUITE 7: Keep-Alive Endpoint Protection & Response
// =============================================================================

test("[SMOKE] /api/keepalive rejects unauthenticated calls and accepts valid CRON_SECRET", async () => {
  // 1. Unauthenticated request must return 401 Unauthorized
  const unauthRes = await fetch(`${BASE_URL}/api/keepalive`);
  assert.equal(unauthRes.status, 401, "Expected 401 without authorization header");
  const unauthBody = await unauthRes.json();
  assert.deepEqual(unauthBody, { error: "Unauthorized" });

  // 2. Invalid bearer token must return 401 Unauthorized
  const invalidRes = await fetch(`${BASE_URL}/api/keepalive`, {
    headers: { Authorization: "Bearer wrong-token-value" },
  });
  assert.equal(invalidRes.status, 401, "Expected 401 with invalid token");

  // 3. If CRON_SECRET is configured in the environment, test authorized path
  if (process.env.CRON_SECRET) {
    const authRes = await fetch(`${BASE_URL}/api/keepalive`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    assert.equal(authRes.status, 200, "Expected 200 with valid CRON_SECRET");
    const authBody = await authRes.json();
    assert.deepEqual(authBody, { ok: true });
  }
});

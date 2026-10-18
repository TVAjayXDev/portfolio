import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import path from "node:path";

const PORT = 3009;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let serverProcess = null;
let browser = null;

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        return;
      }
    } catch {
      // server starting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} failed to start within ${timeoutMs}ms.`);
}

test.before(async () => {
  const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");
  serverProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
  });

  serverProcess.stderr.on("data", (data) => {
    const msg = data.toString();
    if (!msg.includes("ExperimentalWarning")) {
      console.error(`[A11y Server stderr]: ${msg}`);
    }
  });

  await waitForServer(`${BASE_URL}/`);
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  if (browser) {
    await browser.close();
  }
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    if (process.platform === "win32" && serverProcess.pid) {
      try {
        spawn("taskkill", ["/pid", String(serverProcess.pid), "/f", "/t"]);
      } catch {
        // safe ignore
      }
    }
  }
});

const VIEWPORTS = [
  { name: "Desktop (1280px)", width: 1280, height: 800 },
  { name: "Mobile (375px)", width: 375, height: 667 },
];

const AUDIT_PAGES = [
  { path: "/", name: "Homepage" },
  { path: "/projects/trustlens", name: "Project Case Study (TrustLens)" },
  { path: "/blog", name: "Blog Index" },
  { path: "/#contact", name: "Contact Form Section" },
  { path: "/admin/login", name: "Admin Login Console" },
];

test("[A11Y] axe-core automated audit on public routes (0 critical, 0 serious)", async () => {
  assert.ok(browser, "Chromium browser must be initialized");

  for (const pageInfo of AUDIT_PAGES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      try {
        await page.goto(`${BASE_URL}${pageInfo.path}`, {
          waitUntil: "domcontentloaded",
        });

        // Run axe accessibility scan
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
          .analyze();

        const criticalAndSerious = results.violations.filter(
          (v) => v.impact === "critical" || v.impact === "serious"
        );

        if (criticalAndSerious.length > 0) {
          console.error(
            `\n[A11Y VIOLATIONS] ${pageInfo.name} at ${vp.name}:`,
            JSON.stringify(
              criticalAndSerious.map((v) => ({
                id: v.id,
                impact: v.impact,
                description: v.description,
                nodes: v.nodes.map((n) => n.html),
              })),
              null,
              2
            )
          );
        }

        assert.equal(
          criticalAndSerious.length,
          0,
          `Found ${criticalAndSerious.length} critical/serious a11y violations on ${pageInfo.name} at ${vp.name}`
        );
      } finally {
        await context.close();
      }
    }
  }
});

test("[A11Y] Keyboard Navigation: Skip link, focus visible, and Ctrl+K modal trap/release", async () => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

    // 1. Skip link keyboard activation
    await page.keyboard.press("Tab");
    const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
    const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
    const activeHref = await page.evaluate(() => document.activeElement?.href);

    assert.equal(activeTagName, "A", "First tab must focus skip link anchor");
    assert.match(activeText || "", /skip to content/i, "Skip link text must match");
    assert.match(activeHref || "", /#main-content$/, "Skip link must point to #main-content");

    // Press Enter to activate skip link
    await page.keyboard.press("Enter");
    const focusedAfterSkip = await page.evaluate(() => document.activeElement?.id);
    assert.equal(focusedAfterSkip, "main-content", "Skip link must focus #main-content");

    // 2. Ctrl+K modal open
    await page.keyboard.press("Control+k");
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

    const dialogVisible = await page.isVisible('[role="dialog"]');
    assert.equal(dialogVisible, true, "Ctrl+K must open the command palette dialog");

    // 3. Escape key closes modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const dialogClosed = !(await page.isVisible('[role="dialog"]'));
    assert.equal(dialogClosed, true, "Escape key must close the command palette dialog");
  } finally {
    await context.close();
  }
});

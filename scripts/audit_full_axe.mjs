import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { spawn } from "node:child_process";
import path from "node:path";

const PORT = 3014;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        return;
      }
    } catch {
      // starting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} failed to start.`);
}

const ROUTES = ["/", "/projects/trustlens", "/blog", "/admin/login"];
const VIEWPORTS = [
  { name: "375px", width: 375, height: 812 },
  { name: "1280px", width: 1280, height: 800 },
];

async function main() {
  const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");
  const serverProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
  });

  try {
    await waitForServer(`${BASE_URL}/`);
    const browser = await chromium.launch({ headless: true });

    const allFindings = [];

    for (const route of ROUTES) {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });

        const results = await new AxeBuilder({ page }).analyze();

        for (const v of results.violations) {
          allFindings.push({
            route,
            viewport: vp.name,
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
            helpUrl: v.helpUrl,
          });
        }

        await context.close();
      }
    }

    await browser.close();

    console.log("=== FULL AXE-CORE AUDIT FINDINGS (Critical, Serious, Moderate, Minor) ===");
    if (allFindings.length === 0) {
      console.log("Zero violations found across all severity tiers (0 critical, 0 serious, 0 moderate, 0 minor).");
    } else {
      console.log(`Found ${allFindings.length} total findings:`);
      allFindings.forEach((f) => {
        console.log(`[${f.impact?.toUpperCase()}] ${f.id} on ${f.route} (${f.viewport}): ${f.description} (${f.nodes} node(s))`);
      });
    }
  } finally {
    serverProcess.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

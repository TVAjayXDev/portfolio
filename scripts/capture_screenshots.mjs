import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 3012;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        return true;
      }
    } catch {
      // server starting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

const VIEWPORTS = [
  { name: "375px", width: 375, height: 812 },
  { name: "768px", width: 768, height: 1024 },
  { name: "1280px", width: 1280, height: 800 },
  { name: "1920px", width: 1920, height: 1080 },
];

const PAGES = [
  { name: "home_populated", path: "/" },
  { name: "home_empty", path: "/?empty=1" },
  { name: "project_trustlens", path: "/projects/trustlens" },
  { name: "blog_index", path: "/blog" },
  { name: "admin_login", path: "/admin/login" },
];

async function main() {
  console.log(`Starting Next.js production server on port ${PORT}...`);
  const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");
  const serverProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
  });

  try {
    await waitForServer(`${BASE_URL}/`);
    console.log(`Server is ready at ${BASE_URL}. Launching Chromium...`);

    const browser = await chromium.launch({ headless: true });

    for (const pageInfo of PAGES) {
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
        });

        const targetUrl = `${BASE_URL}${pageInfo.path}`;
        console.log(`Capturing ${pageInfo.name} at ${vp.name} (${targetUrl})...`);
        await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });

        // Let layout settle
        await page.waitForTimeout(500);

        const filename = `${pageInfo.name}_${vp.name}.png`;
        const filepath = path.join(SCREENSHOT_DIR, filename);

        await page.screenshot({
          path: filepath,
          fullPage: true,
        });

        console.log(`  Saved: docs/screenshots/${filename}`);
        await page.close();
      }
    }

    await browser.close();
    console.log(`\nAll screenshots successfully captured in docs/screenshots/`);
  } finally {
    serverProcess.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});

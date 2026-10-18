import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 3045;
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots");

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) {
        return true;
      }
    } catch {
      // Wait
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function run() {
  console.log("Starting Next.js dev server for Seed-Data screenshots on port", PORT);
  const nextDev = spawn("npx.cmd", ["next", "dev", "-p", String(PORT)], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "development" },
    stdio: "inherit",
    shell: true,
  });

  try {
    await waitForServer(`http://localhost:${PORT}`);
    console.log("Dev server ready. Launching Edge via Playwright...");

    const browser = await chromium.launch({
      channel: "msedge",
      headless: true,
    });

    const mobilePage = await browser.newPage({
      viewport: { width: 375, height: 812 },
    });
    await mobilePage.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, "seed_full_375px.png"),
      fullPage: true,
    });

    const desktopPage = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await desktopPage.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, "seed_full_1440px.png"),
      fullPage: true,
    });

    const devEvaluation = await desktopPage.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll("header nav a")).map(
        (a) => a.textContent?.trim()
      );
      const sections = Array.from(document.querySelectorAll("section")).map((s) => s.id);
      return { navLinks, sections };
    });

    console.log("Development Seed-Data Sections:", devEvaluation.sections);
    console.log("Development Seed-Data Nav Links:", devEvaluation.navLinks);

    await browser.close();
  } finally {
    console.log("Stopping Next.js dev server...");
    nextDev.kill();
  }
}

run().catch((err) => {
  console.error("Seed screenshot execution failed:", err);
  process.exit(1);
});

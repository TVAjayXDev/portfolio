import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 3044;
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) {
        return true;
      }
    } catch {
      // Wait a bit
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function run() {
  console.log("Starting Next.js production server for Playwright verification on port", PORT);
  const nextServer = spawn("npx.cmd", ["next", "start", "-p", String(PORT)], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
    stdio: "inherit",
    shell: true,
  });

  try {
    await waitForServer(`http://localhost:${PORT}`);
    console.log("Server is ready. Launching Microsoft Edge via Playwright...");

    const browser = await chromium.launch({
      channel: "msedge",
      headless: true,
    });

    // 1. Verify Empty-State at 375px and 1440px
    console.log("Checking Empty-State (?empty=1)...");
    const emptyPageMobile = await browser.newPage({
      viewport: { width: 375, height: 812 },
    });
    await emptyPageMobile.goto(`http://localhost:${PORT}/?empty=1`, { waitUntil: "networkidle" });
    await emptyPageMobile.screenshot({
      path: path.join(SCREENSHOT_DIR, "empty_375px.png"),
      fullPage: true,
    });

    const emptyPageDesktop = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await emptyPageDesktop.goto(`http://localhost:${PORT}/?empty=1`, { waitUntil: "networkidle" });
    await emptyPageDesktop.screenshot({
      path: path.join(SCREENSHOT_DIR, "empty_1440px.png"),
      fullPage: true,
    });

    // Evaluate empty DOM checks
    const emptyEvaluation = await emptyPageDesktop.evaluate(() => {
      const hasAbout = !!document.getElementById("about");
      const hasSkills = !!document.getElementById("skills");
      const hasFeatured = !!document.getElementById("featured-project");
      const hasComingSoon = !!document.getElementById("coming-soon");
      const hasGithub = !!document.getElementById("github");
      const hasEducation = !!document.getElementById("education");
      const hasExperience = !!document.getElementById("experience");
      const hasCertifications = !!document.getElementById("certifications");
      const hasBlog = !!document.getElementById("blog");
      const hasContact = !!document.getElementById("contact");
      const navLinks = Array.from(document.querySelectorAll("header nav a")).map(
        (a) => a.textContent?.trim()
      );

      return {
        hasAbout,
        hasSkills,
        hasFeatured,
        hasComingSoon,
        hasGithub,
        hasEducation,
        hasExperience,
        hasCertifications,
        hasBlog,
        hasContact,
        navLinks,
      };
    });

    console.log("Empty-State DOM Evaluation:", emptyEvaluation);

    // 2. Verify Seed-Data state at 375px and 1440px
    console.log("Checking Seed-Data state (/)...");
    const seedPageMobile = await browser.newPage({
      viewport: { width: 375, height: 812 },
    });
    await seedPageMobile.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
    await seedPageMobile.screenshot({
      path: path.join(SCREENSHOT_DIR, "seed_375px.png"),
      fullPage: true,
    });

    const seedPageDesktop = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await seedPageDesktop.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
    await seedPageDesktop.screenshot({
      path: path.join(SCREENSHOT_DIR, "seed_1440px.png"),
      fullPage: true,
    });

    const seedEvaluation = await seedPageDesktop.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll("header nav a")).map(
        (a) => a.textContent?.trim()
      );
      return { navLinks };
    });

    console.log("Seed-Data Navigation Links:", seedEvaluation.navLinks);

    await browser.close();
    console.log("Playwright screenshot suite completed successfully.");
  } finally {
    console.log("Stopping Next.js server...");
    nextServer.kill();
  }
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log("Launching Microsoft Edge via Playwright for interactions & screenshots...");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const consoleErrors = [];

  // Create context with clipboard permissions
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore favicon or non-critical 404s if any
      if (!text.includes("favicon") && !text.includes("404")) {
        console.error(`[Browser Console Error]: ${text}`);
        consoleErrors.push(text);
      }
    }
  });

  page.on("pageerror", (err) => {
    console.error(`[Browser Page Error]: ${err.message}`);
    consoleErrors.push(err.message);
  });

  // ---------------------------------------------------------------------------
  // INTERACTION 1: Load Home Page & Verify No Initial Console Errors
  // ---------------------------------------------------------------------------
  console.log("Navigating to home page:", BASE_URL);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });

  assert.equal(consoleErrors.length, 0, `Initial page load produced console errors: ${consoleErrors.join(", ")}`);
  console.log("✔ Home page loaded with 0 console errors.");

  // ---------------------------------------------------------------------------
  // INTERACTION 2: Ctrl+K Opens and Closes Command Palette
  // ---------------------------------------------------------------------------
  console.log("Testing Ctrl+K command palette interaction...");
  // Press Control+K
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(300);

  const palette = page.locator('div[aria-label="Command Palette"]');
  const isPaletteVisible = await palette.isVisible();
  assert.equal(isPaletteVisible, true, "Command Palette should be visible after Ctrl+K press");
  console.log("✔ Command Palette opened via Ctrl+K.");

  // Press Escape to close
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  const isPaletteClosed = !(await palette.isVisible());
  assert.equal(isPaletteClosed, true, "Command Palette should close after Escape press");
  console.log("✔ Command Palette closed via Escape.");

  // ---------------------------------------------------------------------------
  // INTERACTION 3: Copy-Email Button Works
  // ---------------------------------------------------------------------------
  console.log("Testing Copy-Email button interaction...");
  const copyBtn = page.locator('button[title="Copy email to clipboard"]');
  await copyBtn.scrollIntoViewIfNeeded();
  await copyBtn.click();
  await page.waitForTimeout(300);

  // Verify UI feedback
  const copiedTextVisible = await page.locator("text=Copied").first().isVisible();
  assert.equal(copiedTextVisible, true, "Button should display 'Copied' after clicking");

  // Verify clipboard content
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(clipboardText, "tvajay0@gmail.com", "Clipboard should contain tvajay0@gmail.com");
  console.log("✔ Copy-email button successfully copied tvajay0@gmail.com with UI feedback.");

  // ---------------------------------------------------------------------------
  // INTERACTION 4: GitHub Section Interactions Work
  // ---------------------------------------------------------------------------
  console.log("Testing GitHub section interactions...");
  const githubSection = page.locator("#github");
  const isGithubVisible = await githubSection.isVisible();
  assert.equal(isGithubVisible, true, "GitHub section must be present on page");

  const viewAllBtn = page.locator('a:has-text("View all on GitHub")');
  assert.equal(await viewAllBtn.isVisible(), true, "View all on GitHub button should be visible");
  const githubHref = await viewAllBtn.getAttribute("href");
  assert.ok(githubHref && githubHref.includes("github.com"), `Invalid GitHub link: ${githubHref}`);

  const repoCards = page.locator("#github a[href*='github.com/']");
  const cardCount = await repoCards.count();
  assert.ok(cardCount > 0, "GitHub section should render at least 1 repository card");
  console.log(`✔ GitHub section renders ${cardCount} interactive repository links.`);

  // ---------------------------------------------------------------------------
  // INTERACTION 5: Mobile Menu Opens and Closes at 375px
  // ---------------------------------------------------------------------------
  console.log("Testing Mobile Menu interaction at 375px...");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });

  const hamburger = page.locator('button[aria-label="Toggle navigation menu"]');
  assert.equal(await hamburger.isVisible(), true, "Hamburger button should be visible on mobile");

  await hamburger.click();
  await page.waitForTimeout(300);

  const mobileNav = page.locator("nav[aria-label='Mobile Navigation']");
  assert.equal(await mobileNav.isVisible(), true, "Mobile navigation panel should be open");
  console.log("✔ Mobile menu opened via hamburger button.");

  // Close mobile menu by clicking close button
  await hamburger.click();
  await page.waitForTimeout(300);
  assert.equal(await mobileNav.isVisible(), false, "Mobile navigation panel should be closed");
  console.log("✔ Mobile menu closed successfully.");

  // ---------------------------------------------------------------------------
  // INTERACTION 6: Final Console Errors Check
  // ---------------------------------------------------------------------------
  assert.equal(
    consoleErrors.length,
    0,
    `Interactions generated console errors: ${consoleErrors.join("; ")}`
  );
  console.log("✔ All interactions passed with 0 browser console errors.");

  // ---------------------------------------------------------------------------
  // SCREENSHOT CAPTURE: 375px, 768px, 1280px, 1920px
  // ---------------------------------------------------------------------------
  const viewports = [
    { name: "mobile_375px", width: 375, height: 812 },
    { name: "tablet_768px", width: 768, height: 1024 },
    { name: "desktop_1280px", width: 1280, height: 800 },
    { name: "wide_1920px", width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    console.log(`Capturing full-page screenshot at ${vp.width}x${vp.height} (${vp.name})...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    // Wait for animations and layout
    await page.waitForTimeout(500);

    const shotPath = path.join(SCREENSHOT_DIR, `after_${vp.name}.png`);
    await page.screenshot({
      path: shotPath,
      fullPage: true,
    });
    console.log(`Saved screenshot: ${shotPath}`);
  }

  await browser.close();
  console.log("\nAll Playwright interaction tests and screenshot captures completed successfully!");
}

run().catch((err) => {
  console.error("Playwright test failed:", err);
  process.exit(1);
});

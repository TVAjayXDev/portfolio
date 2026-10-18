import { spawn, exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { chromium } from "playwright";

const execAsync = util.promisify(exec);
const PORT = 3008;
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
      // server starting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} failed to start within ${timeoutMs}ms.`);
}

async function runLighthouseForUrl(targetUrl, reportPath) {
  console.log(`\nStarting Lighthouse Mobile Audit for: ${targetUrl}...`);
  const cmd = `npx lighthouse ${targetUrl} --port=9222 --output=json --output-path="${reportPath}" --only-categories=performance,accessibility,best-practices,seo --throttling-method=devtools`;

  try {
    await execAsync(cmd, {
      cwd: process.cwd(),
      timeout: 120000,
    });
  } catch (err) {
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Lighthouse failed: ${err.message}`);
    }
  }

  const rawJson = fs.readFileSync(reportPath, "utf8");
  const report = JSON.parse(rawJson);

  const categories = report.categories || {};
  const audits = report.audits || {};

  const scores = {
    performance: Math.round((categories.performance?.score || 0) * 100),
    accessibility: categories.accessibility ? Math.round((categories.accessibility.score || 0) * 100) : null,
    bestPractices: categories["best-practices"] ? Math.round((categories["best-practices"].score || 0) * 100) : null,
    seo: categories.seo ? Math.round((categories.seo.score || 0) * 100) : null,
    lcp: audits["largest-contentful-paint"]?.displayValue || audits["largest-contentful-paint"]?.numericValue,
    cls: audits["cumulative-layout-shift"]?.displayValue || audits["cumulative-layout-shift"]?.numericValue,
    tbt: audits["total-blocking-time"]?.displayValue || audits["total-blocking-time"]?.numericValue,
    fcp: audits["first-contentful-paint"]?.displayValue || audits["first-contentful-paint"]?.numericValue,
    speedIndex: audits["speed-index"]?.displayValue || audits["speed-index"]?.numericValue,
  };

  return scores;
}

async function main() {
  const docsDir = path.resolve(process.cwd(), "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Spawn Next.js production server
  const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");
  const serverProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
  });

  // Spawn Headless Chromium with Remote Debugging Port 9222
  console.log("Launching headless browser on remote debugging port 9222...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--remote-debugging-port=9222"],
  });

  try {
    await waitForServer(`${BASE_URL}/`);
    console.log(`Server listening on ${BASE_URL}`);

    // Run Lighthouse for Home
    const homeReportPath = path.resolve(docsDir, "lighthouse-home.json");
    const homeScores = await runLighthouseForUrl(`${BASE_URL}/`, homeReportPath);

    // Run Lighthouse for TrustLens
    const trustlensReportPath = path.resolve(docsDir, "lighthouse-trustlens.json");
    const trustlensScores = await runLighthouseForUrl(`${BASE_URL}/projects/trustlens`, trustlensReportPath);

    console.log("\n=======================================================");
    console.log("LIGHTHOUSE MOBILE AUDIT RESULTS");
    console.log("=======================================================");
    console.log("Homepage (/):");
    console.log(`  Performance:    ${homeScores.performance}/100`);
    if (homeScores.accessibility) console.log(`  Accessibility:  ${homeScores.accessibility}/100`);
    if (homeScores.bestPractices) console.log(`  Best Practices: ${homeScores.bestPractices}/100`);
    if (homeScores.seo) console.log(`  SEO:            ${homeScores.seo}/100`);
    console.log(`  LCP:            ${homeScores.lcp}`);
    console.log(`  CLS:            ${homeScores.cls}`);
    console.log(`  TBT:            ${homeScores.tbt}`);
    console.log(`  FCP:            ${homeScores.fcp}`);

    console.log("\nProject Page (/projects/trustlens):");
    console.log(`  Performance:    ${trustlensScores.performance}/100`);
    if (trustlensScores.accessibility) console.log(`  Accessibility:  ${trustlensScores.accessibility}/100`);
    if (trustlensScores.bestPractices) console.log(`  Best Practices: ${trustlensScores.bestPractices}/100`);
    if (trustlensScores.seo) console.log(`  SEO:            ${trustlensScores.seo}/100`);
    console.log(`  LCP:            ${trustlensScores.lcp}`);
    console.log(`  CLS:            ${trustlensScores.cls}`);
    console.log(`  TBT:            ${trustlensScores.tbt}`);
    console.log(`  FCP:            ${trustlensScores.fcp}`);
    console.log("=======================================================\n");

  } finally {
    try {
      await browser.close();
    } catch {}
    serverProcess.kill("SIGTERM");
    if (process.platform === "win32" && serverProcess.pid) {
      try {
        spawn("taskkill", ["/pid", String(serverProcess.pid), "/f", "/t"]);
      } catch {}
    }
  }
}

main().catch((err) => {
  console.error("Lighthouse runner failed:", err);
  process.exit(1);
});

#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

function usage() {
  console.log(`Usage:
  node scripts/verify-page.mjs <url> [--output-dir <dir>]

Example:
  node scripts/verify-page.mjs http://localhost:4311/project/page.html --output-dir /tmp/template-review

Requires playwright or playwright-core in the current Node.js environment.`);
}

const args = process.argv.slice(2);
if (!args.length || args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(args.length ? 0 : 1);
}

const targetUrl = args[0];
const outputIndex = args.indexOf("--output-dir");
const outputDir = resolve(outputIndex >= 0 && args[outputIndex + 1] ? args[outputIndex + 1] : "template-review");
mkdirSync(outputDir, { recursive: true });

async function loadPlaywright() {
  for (const packageName of ["playwright", "playwright-core"]) {
    try {
      return await import(packageName);
    } catch {
      // Try the next supported package.
    }
  }

  console.error("Playwright is not installed in the current Node.js environment.");
  console.error("Install it in the project with: npm install --save-dev playwright");
  process.exit(2);
}

const { chromium } = await loadPlaywright();

const executableCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
];

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (defaultError) {
    const executablePath = executableCandidates.find(existsSync);
    if (!executablePath) {
      console.error("Playwright could not launch its browser and no system Chrome/Chromium was found.");
      console.error(String(defaultError));
      process.exit(2);
    }
    return chromium.launch({ headless: true, executablePath });
  }
}

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 }
];

const browser = await launchBrowser();
const report = {
  url: targetUrl,
  generatedAt: new Date().toISOString(),
  outputDir,
  results: []
};

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedResources = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResources.push({ status: response.status(), url: response.url() });
    }
  });

  try {
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  await page.waitForTimeout(500);

  const inspect = async () => page.evaluate(({ isMobile }) => {
    const root = document.documentElement;
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };

    const overflowElements = [...document.querySelectorAll("body *")]
      .filter(isVisible)
      .filter((element) => {
        if (element.hasAttribute("data-allow-overflow")) return false;
        const style = getComputedStyle(element);
        if (["auto", "scroll"].includes(style.overflowX)) return false;
        return element.scrollWidth > element.clientWidth + 2;
      })
      .slice(0, 25)
      .map((element) => ({
        element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.classList.length ? `.${[...element.classList].join(".")}` : ""}`,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth
      }));

    const brokenImages = [...document.images]
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);

    const smallTargets = isMobile
      ? [...document.querySelectorAll("button, a, input, select, textarea, summary, [role='button']")]
          .filter(isVisible)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.classList.length ? `.${[...element.classList].join(".")}` : ""}`,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              label: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 60)
            };
          })
          .filter((target) => target.width < 44 || target.height < 44)
          .slice(0, 40)
      : [];

    return {
      title: document.title,
      documentWidth: root.scrollWidth,
      viewportWidth: root.clientWidth,
      documentOverflow: root.scrollWidth > root.clientWidth + 1,
      overflowElements,
      brokenImages,
      smallTargets,
      heading: document.querySelector("h1")?.textContent?.trim() || null,
      theme: root.getAttribute("data-theme") || (root.classList.contains("dark") ? "dark" : "unspecified")
    };
  }, { isMobile: viewport.name === "mobile" });

  const defaultState = await inspect();
  await page.screenshot({ path: resolve(outputDir, `${viewport.name}-default.png`), fullPage: true });

  const darkThemeSupported = await page.evaluate(() => {
    const root = document.documentElement;
    if (root.hasAttribute("data-theme")) {
      root.setAttribute("data-theme", "dark");
      return true;
    }
    if (root.classList.contains("dark") || document.querySelector(".theme-toggle, [data-theme-toggle]")) {
      root.classList.add("dark");
      return true;
    }
    return false;
  });

  let darkState = null;
  if (darkThemeSupported) {
    await page.waitForTimeout(200);
    darkState = await inspect();
    await page.screenshot({ path: resolve(outputDir, `${viewport.name}-dark.png`), fullPage: true });
  }

  report.results.push({
    viewport,
    defaultState,
    darkState,
    consoleErrors,
    pageErrors,
    failedResources
  });

  await context.close();
}

await browser.close();

const reportPath = resolve(outputDir, "verification-report.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const failures = report.results.flatMap((result) => {
  const items = [];
  if (result.defaultState.documentOverflow) items.push(`${result.viewport.name}: document overflow`);
  if (result.defaultState.brokenImages.length) items.push(`${result.viewport.name}: broken images`);
  if (result.consoleErrors.length) items.push(`${result.viewport.name}: console errors`);
  if (result.pageErrors.length) items.push(`${result.viewport.name}: page errors`);
  if (result.failedResources.length) items.push(`${result.viewport.name}: failed resources`);
  return items;
});

console.log(`Verified ${targetUrl}`);
for (const result of report.results) {
  const targetWarning = result.defaultState.smallTargets.length
    ? `, ${result.defaultState.smallTargets.length} small mobile targets`
    : "";
  console.log(`- ${result.viewport.name}: ${result.defaultState.documentWidth}px document / ${result.defaultState.viewportWidth}px viewport${targetWarning}`);
}
console.log(`Report: ${reportPath}`);
console.log(`Screenshots: ${outputDir}`);

if (failures.length) {
  console.error("Verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Verification passed with no blocking browser errors or document overflow.");

// V1.2 daily-use plan's cross-package gate: before/after screenshots into
// docs/qc/screens/<package>/ so the owner can compare visually, not just read gate output.
// Usage: node tools/capture-screens.mjs <package> <before|after> [surfaceId ...]
import { chromium } from "playwright";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}

const [, , pkg, phase, ...screenArgs] = process.argv;
if (!pkg || (phase !== "before" && phase !== "after")) {
  console.error("Usage: node tools/capture-screens.mjs <package> <before|after> [surfaceId ...]");
  process.exit(1);
}

const DEFAULT_SCREENS = [
  { id: "inbox", label: "home" },
  { id: "today", label: "today" },
  { id: "chat", label: "chat" },
  { id: "finance", label: "money" },
  { id: "graph", label: "graph" }
];
const screens = screenArgs.length ? screenArgs.map((id) => ({ id, label: id })) : DEFAULT_SCREENS;

const outDir = join("docs", "qc", "screens", pkg);
mkdirSync(outDir, { recursive: true });

const executablePath = findLocalChromium();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`http://127.0.0.1:4173?capture-screens=${Date.now()}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle" }),
  page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
]);
await page.waitForSelector(".lifeos-shell-v2");

// Same robust pattern as final-journeys.spec.mjs's openSurface: desktop-only testids
// ("surface-x", "app-ribbon") are CSS-hidden at mobile viewport width, and vice versa for
// "mobile-surface-x"/"mobile-more-nav" - try both, and reset scroll position first since a
// prior fullPage screenshot can leave the page scrolled past the nav's viewport bounds.
async function firstVisible(testId) {
  const locator = page.getByTestId(testId);
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return locator.first();
}

async function openSurface(id) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const testId = `surface-${id}`;
  let target = await firstVisible(testId);
  if (!(await target.isVisible().catch(() => false))) {
    const mobile = await firstVisible(`mobile-surface-${id}`);
    if (await mobile.isVisible().catch(() => false)) target = mobile;
  }
  if (!(await target.isVisible().catch(() => false))) {
    const more = page.locator('[data-testid="app-ribbon"] summary').first();
    if (await more.isVisible().catch(() => false)) await more.click();
    const mobileMore = page.locator('[data-testid="mobile-more-nav"] summary').first();
    if (await mobileMore.isVisible().catch(() => false)) await mobileMore.click();
    target = await firstVisible(testId);
    if (!(await target.isVisible().catch(() => false))) {
      const mobileMoreTarget = await firstVisible(`mobile-more-${id}`);
      if (await mobileMoreTarget.isVisible().catch(() => false)) target = mobileMoreTarget;
    }
  }
  await target.click();
  await page.waitForTimeout(300);
}

for (const screen of screens) {
  await openSurface(screen.id);
  await page.screenshot({ path: join(outDir, `${screen.label}-${phase}.png`), fullPage: true });
  console.log(`captured ${screen.label}-${phase}.png`);
}

// Mobile nav shot, always included - it's one of U0's 5 named targets and is cheap to redo.
await page.setViewportSize({ width: 390, height: 844 });
await openSurface("inbox");
await page.screenshot({ path: join(outDir, `mobile-nav-${phase}.png`), fullPage: true });
console.log(`captured mobile-nav-${phase}.png`);

await browser.close();
console.log(`Done: ${screens.length + 1} screenshots for "${pkg}" (${phase}) in ${outDir}`);

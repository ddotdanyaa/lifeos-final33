import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
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

const localChromium = findLocalChromium();
if (localChromium) {
  test.use({ launchOptions: { executablePath: localChromium } });
}

test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";
const REPORT_PATH = "docs/qc/PERF_BUDGET_REPORT.json";

// P10.3 PERF_BUDGETS: boot and interaction budgets are real measured numbers, checked
// against a real threshold and written to a report that tools/audit-performance-final.mjs
// enforces - not just a screenshot existing.
const BOOT_BUDGET_MS = 8000;
const INTERACTION_BUDGET_MS = 1500;

test("perf budgets: boot and interaction times are measured and stay under budget", async ({ page }) => {
  // 1. Boot budget: navigation start to the shell being interactive on a fresh vault.
  const bootStart = Date.now();
  await page.goto(`${appUrl}?perf-budgets=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("mega-dropzone")).toBeVisible();
  const bootMs = Date.now() - bootStart;

  // 2. Interaction budget: a real nav click to the target workspace rendering, measured
  // from inside the page so it isn't inflated by Playwright/IPC round-trip overhead.
  const interactionMs = await page.evaluate(async () => {
    const start = performance.now();
    document.querySelector('[data-testid="surface-today"]').click();
    await new Promise((resolve) => {
      const check = () => {
        if (document.querySelector('[data-testid="workspace-today"]')) resolve();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
    return performance.now() - start;
  });

  const report = {
    measuredAt: new Date().toISOString(),
    bootMs,
    bootBudgetMs: BOOT_BUDGET_MS,
    interactionMs,
    interactionBudgetMs: INTERACTION_BUDGET_MS,
    bootWithinBudget: bootMs < BOOT_BUDGET_MS,
    interactionWithinBudget: interactionMs < INTERACTION_BUDGET_MS
  };
  await mkdir("docs/qc", { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

  expect(bootMs, "boot time should stay under budget").toBeLessThan(BOOT_BUDGET_MS);
  expect(interactionMs, "nav-click interaction should stay under budget").toBeLessThan(INTERACTION_BUDGET_MS);
});

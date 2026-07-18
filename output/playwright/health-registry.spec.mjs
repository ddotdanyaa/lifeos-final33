import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
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

async function reset(page) {
  await page.goto(`${appUrl}?health-registry=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function openSurface(page, id) {
  const direct = page.getByTestId(`surface-${id}`).first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

// P9.1 HEALTH_REGISTRY_PANEL: every subsystem's real signal is normalized into one of ten
// canonical states, shown in full in Control; Feed stays quiet for expected "not yet
// configured" baseline states and only surfaces a genuine degraded/failed subsystem - a
// visible signal, never a hidden action.
test("health registry: full panel in Control, quiet baseline Feed, real degradation surfaced", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await reset(page);

  // 1. Baseline: Control shows the full registry with real (not fake-alive) states for
  // subsystems that genuinely aren't configured yet.
  await openSurface(page, "control");
  const healthRows = page.getByTestId("health-row");
  await expect(healthRows.first()).toBeVisible();
  const pdfRow = healthRows.filter({ hasText: "PDF" });
  await expect(pdfRow).toHaveAttribute("data-health", "requires_config");

  // 2. Baseline Feed stays quiet - unconfigured providers are expected, not alarms.
  await openSurface(page, "feed");
  await expect(page.getByTestId("feed-health-alerts")).toHaveCount(0);

  // 3. Trigger a real degradation: Ollama probe succeeds, but generation genuinely fails.
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: [{ name: "llama3.2:1b" }] })
  }));
  await page.route("**/api/generate", (route) => route.fulfill({ status: 500, body: "down" }));
  await openSurface(page, "chat");
  await page.getByTestId("probe-ollama").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "models_found");
  await page.getByTestId("test-ollama-generation").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "degraded");

  // 4. Feed now genuinely surfaces the degradation - a visible signal, no hidden action.
  await openSurface(page, "feed");
  await expect(page.getByTestId("feed-health-alerts")).toBeVisible();
  const ollamaAlert = page.getByTestId("feed-health-alert-row").filter({ hasText: "Ollama" });
  await expect(ollamaAlert).toHaveAttribute("data-health", "degraded");

  // 5. Control reflects the same real state, not a separate/duplicated truth.
  await openSurface(page, "control");
  const ollamaHealthRow = page.getByTestId("health-row").filter({ hasText: "Ollama" }).first();
  await expect(ollamaHealthRow).toHaveAttribute("data-health", "degraded");
});

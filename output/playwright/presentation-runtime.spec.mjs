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

async function openSurface(page, id) {
  const direct = page.getByTestId(`surface-${id}`).first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

// P2.2 ARTIFACT_INSPECTOR_UNIVERSAL: proves the P2.1 renderer registry M0 matrix
// (3 types x 4 modes) and that the universal inspector (contract fields, receipt
// trail, relations, renderer switch, export/rollback) is reachable from graph,
// feed and control - i.e. any artifact selected anywhere shows the same inspector.
// "health" integration from the plan's wording is out of scope here: the Health
// Registry panel (P9.1 HEALTH_REGISTRY_PANEL) does not exist yet, so there is
// nothing to connect to without faking it.
test("presentation runtime: M0 renderer matrix and universal inspector", async ({ page }) => {
  const token = String(Date.now());
  await page.goto("http://127.0.0.1:4173");
  await expect(page.getByTestId("home-workspace-rail").getByRole("button")).toHaveCount(9);

  const captureNeedle = "Presentation runtime proof note " + token;
  await page.getByTestId("capture-input").fill(captureNeedle);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("human-primary-action")).toBeVisible();

  // --- M0: 3 types x 4 render modes, proven live in Design Studio ---
  await openSurface(page, "design");
  await expect(page.getByTestId("design-workspace")).toBeVisible();
  await expect(page.getByTestId("m0-proof-section")).toBeVisible();
  await expect(page.getByTestId("m0-proof-group")).toHaveCount(3);
  await expect(page.getByTestId("renderer-feed-bubble")).toHaveCount(3);
  await expect(page.getByTestId("renderer-card")).toHaveCount(3);
  await expect(page.getByTestId("renderer-table-row")).toHaveCount(3);
  await expect(page.getByTestId("renderer-timeline-entry")).toHaveCount(3);

  // --- ViewPreset: save and it survives a reload (proves it is real state, not DOM-only) ---
  await page.selectOption("#view-preset-renderer", "timeline");
  await page.selectOption("#view-preset-density", "compact");
  await page.getByTestId("save-view-preset").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await page.reload();
  await openSurface(page, "design");
  await expect(page.locator("#view-preset-renderer")).toHaveValue("timeline");
  await expect(page.locator("#view-preset-density")).toHaveValue("compact");

  // --- Graph: search finds the captured note, focusing it populates the universal inspector ---
  await openSurface(page, "graph");
  await expect(page.getByTestId("inspector-drawer")).toBeVisible();
  await page.getByTestId("graph-search").fill(captureNeedle.slice(0, 20));
  const result = page.getByTestId("graph-result-row").first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.getByTestId("inspector-contract-fields")).toBeVisible();
  await expect(page.getByTestId("inspector-field-row")).toHaveCount(16);
  await expect(page.getByTestId("inspector-renderer-switch")).toBeVisible();
  await expect(page.getByTestId("inspector-receipts-section")).toBeVisible();
  await expect(page.getByTestId("inspector-relations-section")).toBeVisible();

  // --- Renderer switch actually swaps the live preview, not just the button state ---
  await expect(page.getByTestId("inspector-preview").getByTestId("renderer-card")).toBeVisible();
  await page.getByTestId("inspector-renderer-table-row").click();
  await expect(page.getByTestId("inspector-preview").locator("table")).toBeVisible();
  await expect(page.getByTestId("inspector-preview").getByTestId("renderer-table-row")).toBeVisible();

  // --- Feed -> graph -> inspector: an object opened from Feed reaches the same inspector ---
  await openSurface(page, "feed");
  const channelFocus = page.getByTestId("focus-v34-node").first();
  await expect(channelFocus).toBeVisible();
  await channelFocus.click();
  await openSurface(page, "graph");
  await expect(page.getByTestId("inspector-drawer")).toBeVisible();
  await expect(page.getByTestId("inspector-contract-fields")).toBeVisible();

  // --- Control also embeds the same universal inspector, not a separate one ---
  await openSurface(page, "control");
  await expect(page.getByTestId("inspector-drawer")).toBeVisible();

  // --- Export/rollback actions are present on the inspector, wired to existing handlers ---
  await openSurface(page, "graph");
  await expect(page.getByTestId("inspector-export")).toBeVisible();
  await expect(page.getByTestId("inspector-rollback")).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

const appUrl = "http://127.0.0.1:4173";

test.beforeAll(() => {
  // Regenerate docs/product_brain/PRODUCT_MAP.json from the real, current architecture/ledger
  // before the app tries to import it - proves the script itself works, not just a stale file.
  execFileSync(process.execPath, ["tools/product-map-to-graph.mjs"], { cwd: process.cwd() });
});

async function reset(page) {
  await page.goto(`${appUrl}?product-map-graph=${Date.now()}`, { waitUntil: "networkidle" });
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

test("product map: import with preview+confirm, graph cluster, inspector edges, receipt", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await reset(page);
  await openSurface(page, "control");
  await page.locator('[data-testid="dev-state"] summary').click();
  await expect(page.getByTestId("product-map-panel")).toBeVisible();
  await expect(page.getByTestId("product-map-status")).toContainText("не импортирована");

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const receiptsBefore = before.control.receipts.length;

  // The confirm dialog (accepted above) IS the preview step - window.confirm's message states
  // the real node/link counts fetched from the JSON, matching the plan's fetch->preview->confirm.
  await page.getByTestId("import-product-map").click();
  await expect(page.getByTestId("product-map-status")).toContainText("модулей");

  const after = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const importReceipt = after.control.receipts.find((receipt) => receipt.kind === "import");
  expect(importReceipt, "an import-kind receipt must exist for the product map import").toBeTruthy();
  expect(after.control.receipts.length).toBeGreaterThan(receiptsBefore);

  const productMap = after.control.productMap;
  expect(productMap.importedAt).toBeTruthy();
  const nodeCount = Object.keys(productMap.nodeIdToNoteId).length;
  // Real counts as of this run: 8 modules + 27 capabilities + 47 collections + the v1.0 ledger's
  // regex-parsed packages (33 as of this session) - assert against the real minimum, not a
  // guessed round number.
  expect(nodeCount).toBeGreaterThanOrEqual(8 + 27 + 47 + 30);
  expect(productMap.links.length).toBeGreaterThan(0);

  // Re-importing must update in place, not duplicate (ensureProductMapNote's idempotency).
  // Every commit re-renders the whole surface from scratch, so <details data-testid="dev-state">
  // collapses again just like it did before the first open - same pattern as openSurface's
  // "Ещё" re-click below, not a bug specific to this feature.
  await page.locator('[data-testid="dev-state"] summary').click();
  await page.getByTestId("import-product-map").click();
  const afterSecond = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.keys(afterSecond.control.productMap.nodeIdToNoteId).length).toBe(nodeCount);

  await openSurface(page, "graph");
  await page.locator('input[data-graph-filter="productBrain"]').check();
  await page.getByTestId("graph-search").fill("storage-kernel");
  await expect(page.getByTestId("graph-results")).toContainText("storage-kernel");
  await page.getByTestId("graph-result-row").first().click();
  await expect(page.getByTestId("graph-edge-list")).toBeVisible();
  await expect(page.getByTestId("graph-connection-summary")).toBeVisible();
  // At least one edge shows one of the real derived reasons, not a placeholder label.
  await expect(page.getByTestId("graph-edge-row").first()).toContainText(/состоит из|зависит от|сделано в/);
});

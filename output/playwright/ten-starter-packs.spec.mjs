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

test.setTimeout(240000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?ten-starter-packs=${Date.now()}`, { waitUntil: "networkidle" });
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

// P8.2 TEN_STARTER_PACKS: 10 local starter packs (Capture, Daily-Time, Work, Money,
// Food-Health, Household, Travel, Learning-Media, Social, Builder-AI) proving the System
// Factory's expressiveness across distinct life domains, each installable and uninstallable
// as a real local system definition - no fake sample data, no vendor code execution.
test("ten starter packs: all ten install as real systems and uninstall cleanly", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await reset(page);
  await openSurface(page, "marketplace");

  const state0 = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const packIds = Object.keys(state0.marketplacePacks);
  expect(packIds.length).toBe(10);

  const installedSystemIds = [];
  for (const packId of packIds) {
    const pack = state0.marketplacePacks[packId];
    const packRow = page.getByTestId("marketplace-pack-row").filter({ hasText: pack.title }).first();
    await expect(packRow).toBeVisible();
    await packRow.getByTestId("install-pack").click();
    await expect(page.getByTestId("pack-manifest-ok")).toBeVisible();
    await page.getByTestId("confirm-pack-install").click();
    await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

    const afterInstall = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    const installedEntry = Object.values(afterInstall.installedPacks).find((item) => item.packId === packId && !item.deleted);
    expect(installedEntry, "pack " + packId + " should be installed").toBeTruthy();
    const system = afterInstall.systemDefinitions[installedEntry.systemId];
    expect(system, "pack " + packId + " should create a system definition").toBeTruthy();
    expect(system.entities.length).toBeGreaterThan(0);
    installedSystemIds.push({ packId, installId: installedEntry.id, systemId: installedEntry.systemId });

    await openSurface(page, "marketplace");
  }

  const afterAllInstalled = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(afterAllInstalled.installedPacks).filter((item) => !item.deleted).length).toBe(10);

  // Uninstall all ten and verify each one genuinely reverts (system soft-deleted, pack
  // available again) - proving the install/uninstall drill across all ten, not just one.
  for (const { packId, installId, systemId } of installedSystemIds) {
    const pack = afterAllInstalled.marketplacePacks[packId];
    const packRow = page.getByTestId("marketplace-pack-row").filter({ hasText: pack.title }).first();
    await packRow.getByTestId("uninstall-pack").click();
    await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
    const afterUninstall = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    expect(afterUninstall.installedPacks[installId].deleted, "pack " + packId + " install record should be deleted").toBe(true);
    expect(afterUninstall.systemDefinitions[systemId].deleted, "pack " + packId + " system should be deleted").toBe(true);
    expect(afterUninstall.marketplacePacks[packId].status).toBe("available");
  }

  const afterAllUninstalled = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(afterAllUninstalled.installedPacks).filter((item) => !item.deleted).length).toBe(0);
});

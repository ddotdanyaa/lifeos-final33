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
  await page.goto(`${appUrl}?pack-manifest-enforce=${Date.now()}`, { waitUntil: "networkidle" });
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
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    const toggles = page.locator('[data-testid="app-ribbon"] .nav-cluster-drafts-toggle');
    const count = await toggles.count();
    for (let index = 0; index < count; index += 1) {
      await toggles.nth(index).click().catch(() => {});
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

// P8.1 PACK_MANIFEST_ENFORCE: a pack manifest is validated by the Package Contract before
// install, the install preview shows a real migration preview (not a label), and uninstall
// takes a real rollback snapshot that can genuinely bring the pack's system back.
test("pack manifest enforcement: install preview, real install, uninstall with rollback proof", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await reset(page);
  await openSurface(page, "marketplace");

  const packRow = page.getByTestId("marketplace-pack-row").filter({ hasText: "CRM" }).first();
  await expect(packRow).toBeVisible();

  // 1. Installing shows a real preview: manifest validity + migration counts, not a fake label.
  await packRow.getByTestId("install-pack").click();
  await expect(page.getByTestId("pack-install-preview")).toBeVisible();
  await expect(page.getByTestId("pack-manifest-ok")).toBeVisible();
  const migrationText = await page.getByTestId("pack-migration-preview").innerText();
  expect(migrationText).toMatch(/\d+ entities/);
  expect(migrationText).toMatch(/\d+ полей/);

  // 2. Confirm install: a real system definition gets created matching the manifest.
  await page.getByTestId("confirm-pack-install").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterInstall = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const installedEntry = Object.values(afterInstall.installedPacks).find((item) => item.packId === "pack-crm-lite" && !item.deleted);
  expect(installedEntry).toBeTruthy();
  const installedSystem = afterInstall.systemDefinitions[installedEntry.systemId];
  expect(installedSystem).toBeTruthy();
  expect(installedSystem.entities.some((entity) => entity.name === "Контакт")).toBe(true);
  expect(afterInstall.marketplacePacks["pack-crm-lite"].status).toBe("installed");

  await openSurface(page, "marketplace");
  const installedPackRow = page.getByTestId("marketplace-pack-row").filter({ hasText: "CRM" }).first();
  await expect(installedPackRow.getByTestId("uninstall-pack")).toBeVisible();

  // 3. Uninstall: a real rollback snapshot is taken, the system and install record are
  // soft-deleted, and the pack becomes available again.
  await installedPackRow.getByTestId("uninstall-pack").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterUninstall = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterUninstall.installedPacks[installedEntry.id].deleted).toBe(true);
  expect(afterUninstall.systemDefinitions[installedEntry.systemId].deleted).toBe(true);
  expect(afterUninstall.marketplacePacks["pack-crm-lite"].status).toBe("available");
  const rollbackSnapshot = afterUninstall.control.rollbackSnapshots.find((snap) => String(snap.title || "").includes("CRM"));
  expect(rollbackSnapshot).toBeTruthy();

  // 4. Rollback proof: restoring that snapshot genuinely brings the installed system back.
  await openSurface(page, "control");
  const rollbackRow = page.getByTestId("rollback-row").filter({ hasText: rollbackSnapshot.title });
  await expect(rollbackRow).toBeVisible();
  await rollbackRow.getByTestId("restore-rollback-snapshot").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterRollback = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterRollback.systemDefinitions[installedEntry.systemId].deleted).toBe(false);
  expect(afterRollback.installedPacks[installedEntry.id].deleted).toBe(false);
});

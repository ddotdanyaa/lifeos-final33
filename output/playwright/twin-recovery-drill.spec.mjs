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
  await page.goto(`${appUrl}?twin-recovery-drill=${Date.now()}`, { waitUntil: "networkidle" });
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

// P7.3 TWIN_RECOVERY_DRILL: a Personal Twin snapshot is a real recovery point (not just a
// text summary) - taking one captures the whole vault at that moment, and "Восстановить
// контекст" genuinely reverts to it, proving a real context-recovery drill rather than a
// label-only "recovery memory" claim.
test("twin recovery drill: snapshot captures real state, restore genuinely reverts later changes", async ({ page }) => {
  let nextNoteTitle = "";
  page.on("dialog", (dialog) => dialog.accept(dialog.type() === "prompt" ? nextNoteTitle : undefined));
  await reset(page);
  await openSurface(page, "library");

  const token = String(Date.now());
  const beforeTitle = "Before snapshot " + token;
  nextNoteTitle = beforeTitle;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(beforeTitle);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  // Take the twin snapshot: it must capture a real, restorable payload, not just a label.
  await openSurface(page, "twin");
  await page.getByTestId("create-twin-snapshot").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterSnapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const snapshotId = Object.keys(afterSnapshot.personalTwinSnapshots)[0];
  expect(snapshotId).toBeTruthy();
  expect(afterSnapshot.personalTwinSnapshots[snapshotId].payload).toBeTruthy();
  expect(afterSnapshot.personalTwinSnapshots[snapshotId].payload.notes).toBeTruthy();

  await expect(page.getByTestId("restore-twin-snapshot")).toBeEnabled();

  // Simulate context loss / drift after the snapshot: a second note is created that must
  // NOT survive the recovery drill.
  await openSurface(page, "library");
  const afterTitle = "After snapshot (lost context) " + token;
  nextNoteTitle = afterTitle;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(afterTitle);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  const beforeRestore = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(beforeRestore.notes).some((note) => note.title === beforeTitle)).toBe(true);
  expect(Object.values(beforeRestore.notes).some((note) => note.title === afterTitle)).toBe(true);

  // Run the recovery drill: restore from the twin snapshot.
  await openSurface(page, "twin");
  await page.getByTestId("restore-twin-snapshot").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  const afterRestore = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(afterRestore.notes).some((note) => note.title === beforeTitle)).toBe(true);
  expect(Object.values(afterRestore.notes).some((note) => note.title === afterTitle)).toBe(false);
  const restoreAudit = Object.values(afterRestore.auditLog).find((entry) => entry.type === "twin.restore");
  expect(restoreAudit).toBeTruthy();
});

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
  await page.goto(`${appUrl}?trash-undo-grace=${Date.now()}`, { waitUntil: "networkidle" });
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

// P7.1 TRASH_UNDO_GRACE: soft-delete across collections lands in one unified Trash view
// with a real grace countdown; restore, undo-last-delete, and permanent purge are all real
// state mutations (not label theater), and items past the grace window get hard-purged for
// real by normalizeState on the next load - proven here by backdating a real timestamp
// rather than waiting 30 days.
test("trash: unified list, restore, undo last delete, permanent purge, and grace expiry", async ({ page }) => {
  let nextNoteTitle = "";
  page.on("dialog", (dialog) => dialog.accept(dialog.type() === "prompt" ? nextNoteTitle : undefined));
  await reset(page);
  await openSurface(page, "library");

  const token = String(Date.now());

  // 1. Delete a note; it must appear in the unified Trash list with a real grace countdown.
  nextNoteTitle = "Trash target A " + token;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(nextNoteTitle);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const stateBeforeDelete = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const noteAId = stateBeforeDelete.activeNoteId;
  await page.getByTestId("delete-note").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  await openSurface(page, "control");
  const trashRowA = page.getByTestId("trash-row").filter({ hasText: nextNoteTitle });
  await expect(trashRowA).toBeVisible();
  await expect(trashRowA.getByTestId("trash-days-left")).toContainText("30");

  // 2. Undo the last delete: the most recently trashed item comes back for real.
  await page.getByTestId("undo-last-trash").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterUndo = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterUndo.notes[noteAId].deleted).toBe(false);
  await expect(page.getByTestId("trash-row").filter({ hasText: nextNoteTitle })).toHaveCount(0);

  // 3. Delete a second note and restore it via its own row (not just "undo last").
  await openSurface(page, "library");
  nextNoteTitle = "Trash target B " + token;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(nextNoteTitle);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const stateBeforeDeleteB = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const noteBId = stateBeforeDeleteB.activeNoteId;
  await page.getByTestId("delete-note").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  await openSurface(page, "control");
  const trashRowB = page.getByTestId("trash-row").filter({ hasText: nextNoteTitle });
  await expect(trashRowB).toBeVisible();
  await trashRowB.getByTestId("restore-trash-item").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterRestoreB = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterRestoreB.notes[noteBId].deleted).toBe(false);
  await expect(page.getByTestId("trash-row").filter({ hasText: nextNoteTitle })).toHaveCount(0);

  // 4. Delete a third note and purge it forever: it must never come back.
  await openSurface(page, "library");
  nextNoteTitle = "Trash target C " + token;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(nextNoteTitle);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const stateBeforeDeleteC = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const noteCId = stateBeforeDeleteC.activeNoteId;
  await page.getByTestId("delete-note").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  await openSurface(page, "control");
  const trashRowC = page.getByTestId("trash-row").filter({ hasText: nextNoteTitle });
  await expect(trashRowC).toBeVisible();
  await trashRowC.getByTestId("purge-trash-item-forever").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterPurgeC = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterPurgeC.notes[noteCId]).toBeUndefined();
  await expect(page.getByTestId("trash-row").filter({ hasText: nextNoteTitle })).toHaveCount(0);

  // 5. Grace expiry: a note deleted 31 days ago must be auto-purged for real on next load,
  // proven by backdating a real timestamp rather than waiting out the grace window.
  await openSurface(page, "library");
  nextNoteTitle = "Trash target D " + token;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(nextNoteTitle);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const stateBeforeDeleteD = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const noteDId = stateBeforeDeleteD.activeNoteId;
  await page.getByTestId("delete-note").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  const oldTimestamp = new Date(Date.now() - 31 * 86400000).toISOString();
  await page.evaluate(({ id, iso }) => window.__lifeosKnowledgeBase.backdateTrashItemForTest("note", id, iso), { id: noteDId, iso: oldTimestamp });
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  const afterReload = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterReload.notes[noteDId]).toBeUndefined();
  const purgeAudit = Object.values(afterReload.auditLog).find((entry) => entry.type === "control.trash.purge" && entry.summary.includes("Автоматически"));
  expect(purgeAudit).toBeTruthy();
});

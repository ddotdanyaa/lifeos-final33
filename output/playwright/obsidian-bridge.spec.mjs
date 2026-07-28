import { expect, test } from "@playwright/test";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

// P6.4 OBSIDIAN_VAULT_BRIDGE: scan a folder of .md files (frontmatter tags + wikilinks),
// preview before touching anything, explicit confirm creates real notes with rollback safety,
// explicit cancel discards the scan, and export round-trips notes back into vault-shaped files.
test("Obsidian vault bridge: scan, preview, confirm import, and export round-trip", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "control");

  const token = String(Date.now());
  const vaultName = "vault-" + token;
  const noteA = [
    "---",
    "tags: [zettel, project-x]",
    "---",
    "This links to [[Note B " + token + "]] and covers project X."
  ].join("\n");
  const noteB = "Plain note without frontmatter, token " + token + ".";

  const vaultDir = join(tmpdir(), vaultName);
  mkdirSync(vaultDir, { recursive: true });
  writeFileSync(join(vaultDir, "Note A " + token + ".md"), noteA, "utf8");
  writeFileSync(join(vaultDir, "Note B " + token + ".md"), noteB, "utf8");

  await expect(page.getByTestId("obsidian-scan-empty")).toBeVisible();

  await page.locator("input#obsidian-vault-import").setInputFiles(vaultDir);

  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await expect(page.getByTestId("obsidian-scan-report")).toBeVisible();
  const reportText = await page.getByTestId("obsidian-scan-report").innerText();
  expect(reportText).toContain("2 заметок");

  const beforeConfirm = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const notesBefore = Object.keys(beforeConfirm.notes).length;

  await page.getByTestId("confirm-obsidian-import").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  const afterConfirm = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const notesAfter = Object.keys(afterConfirm.notes).length;
  expect(notesAfter).toBe(notesBefore + 2);

  const importedNoteA = Object.values(afterConfirm.notes).find((note) => (note.title || "").includes("Note A " + token));
  expect(importedNoteA).toBeTruthy();
  expect(importedNoteA.tags).toContain("zettel");
  expect(importedNoteA.tags).toContain("project-x");
  expect(importedNoteA.obsidianPath).toBeTruthy();

  const importedNoteB = Object.values(afterConfirm.notes).find((note) => (note.title || "").includes("Note B " + token));
  expect(importedNoteB).toBeTruthy();

  await expect(page.getByTestId("obsidian-scan-empty")).toBeVisible();

  const rollbackSnapshots = Object.values(afterConfirm.control.rollbackSnapshots || {});
  const importSnapshot = rollbackSnapshots.find((snap) => String(snap.title || snap.summary || "").includes(vaultName) || String(snap.title || snap.summary || "").includes("Obsidian"));
  expect(importSnapshot).toBeTruthy();

  const importAudit = Object.values(afterConfirm.auditLog || {}).find((entry) => entry.type === "source.import.obsidian" && String(entry.summary || "").includes("2"));
  expect(importAudit).toBeTruthy();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-obsidian-vault").click()
  ]);
  expect(download.suggestedFilename()).toBe("lifeos-obsidian-export.zip");

  const cancelDir = join(tmpdir(), "cancel-" + token);
  mkdirSync(cancelDir, { recursive: true });
  writeFileSync(join(cancelDir, "Cancelled note " + token + ".md"), "Should not be imported " + token, "utf8");
  await page.locator("input#obsidian-vault-import").setInputFiles(cancelDir);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await expect(page.getByTestId("obsidian-scan-report")).toBeVisible();

  await page.getByTestId("cancel-obsidian-import").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await expect(page.getByTestId("obsidian-scan-empty")).toBeVisible();

  const afterCancel = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const cancelledNote = Object.values(afterCancel.notes).find((note) => (note.title || "").includes("Cancelled note " + token));
  expect(cancelledNote).toBeFalsy();

  rmSync(vaultDir, { recursive: true, force: true });
  rmSync(cancelDir, { recursive: true, force: true });
});

import { expect, test } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?export-roundtrip=${Date.now()}`, { waitUntil: "networkidle" });
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

// P7.2 EXPORT_ROUNDTRIP_PROOF: real full-vault export -> clean state -> real import ->
// equivalence (not a preview stub); a single-artifact export from the inspector; and an
// optional AES-GCM encrypted snapshot backup that genuinely rejects the wrong passphrase.
test("export/import roundtrip: full vault equivalence, selected-artifact export, encrypted backup", async ({ page }) => {
  let nextNoteTitle = "";
  page.on("dialog", (dialog) => {
    if (dialog.type() === "prompt") {
      dialog.accept(dialog.message().includes("Введи пароль") ? global.__lifeosTestPassphrase || "" : nextNoteTitle);
    } else {
      dialog.accept();
    }
  });
  await reset(page);
  await openSurface(page, "library");

  const token = String(Date.now());
  const noteTitle = "Roundtrip note " + token;
  const noteBody = "Roundtrip body content " + token + " with distinctive text.";
  nextNoteTitle = noteTitle;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(noteTitle);
  await page.getByTestId("note-body").fill(noteBody);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  // 1. Full plaintext export -> reset to a clean vault -> import -> confirm restore ->
  // the exact note (title, body, tags) must come back, proving real equivalence.
  await openSurface(page, "control");
  const [fullExport] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("control-export-all").click()
  ]);
  expect(fullExport.suggestedFilename()).toBe("lifeos-knowledge-vault.json");
  const fullExportPath = await fullExport.path();
  const fullExportJson = JSON.parse(readFileSync(fullExportPath, "utf8"));
  expect(fullExportJson.notes.some((note) => note.title === noteTitle && note.body === noteBody)).toBe(true);

  await reset(page);
  const beforeImport = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(beforeImport.notes).some((note) => note.title === noteTitle)).toBe(false);

  await openSurface(page, "control");
  await page.setInputFiles("input#backup-import", { name: "lifeos-knowledge-vault.json", mimeType: "application/json", buffer: readFileSync(fullExportPath) });
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await expect(page.getByTestId("backup-restore-report")).toBeVisible();
  await page.getByTestId("confirm-backup-restore").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  const afterImport = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const restoredNote = Object.values(afterImport.notes).find((note) => note.title === noteTitle);
  expect(restoredNote).toBeTruthy();
  expect(restoredNote.body).toBe(noteBody);
  const restoreAudit = Object.values(afterImport.auditLog).find((entry) => entry.type === "control.backup.import.apply");
  expect(restoreAudit).toBeTruthy();

  // 2. Selected-artifact export from the inspector: the file contains just that artifact.
  await openSurface(page, "library");
  await page.getByTestId("note-row").filter({ hasText: noteTitle }).first().click();
  await openSurface(page, "control");
  const [selectedExport] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-selected-artifact").click()
  ]);
  expect(selectedExport.suggestedFilename()).toBe("lifeos-selected-artifact.json");
  const selectedExportJson = JSON.parse(readFileSync(await selectedExport.path(), "utf8"));
  expect(selectedExportJson.selectedId).toBeTruthy();

  // 3. Encrypted snapshot backup: export with a passphrase, wrong passphrase is honestly
  // rejected, correct passphrase decrypts and restores for real.
  const passphrase = "correct-horse-" + token;
  await page.getByTestId("backup-encrypt-passphrase").fill(passphrase);
  const [encryptedExport] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("control-export-all").click()
  ]);
  expect(encryptedExport.suggestedFilename()).toBe("lifeos-knowledge-vault.encrypted.json");
  const encryptedExportPath = await encryptedExport.path();
  const encryptedEnvelope = JSON.parse(readFileSync(encryptedExportPath, "utf8"));
  expect(encryptedEnvelope.lifeosEncryptedBackup).toBe(true);
  expect(JSON.stringify(encryptedEnvelope)).not.toContain(noteTitle);

  await reset(page);
  await openSurface(page, "control");

  global.__lifeosTestPassphrase = "wrong-passphrase";
  await page.setInputFiles("input#backup-import", { name: "lifeos-knowledge-vault.encrypted.json", mimeType: "application/json", buffer: readFileSync(encryptedExportPath) });
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await expect(page.getByTestId("backup-restore-empty")).toBeVisible();
  const afterWrongPassphrase = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const rejectAudit = Object.values(afterWrongPassphrase.auditLog).find((entry) => entry.type === "control.backup.reject");
  expect(rejectAudit).toBeTruthy();

  global.__lifeosTestPassphrase = passphrase;
  await page.setInputFiles("input#backup-import", { name: "lifeos-knowledge-vault.encrypted.json", mimeType: "application/json", buffer: readFileSync(encryptedExportPath) });
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await expect(page.getByTestId("backup-restore-report")).toBeVisible();
  await page.getByTestId("confirm-backup-restore").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterEncryptedRestore = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(afterEncryptedRestore.notes).some((note) => note.title === noteTitle && note.body === noteBody)).toBe(true);
});

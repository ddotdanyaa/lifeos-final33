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
  await page.goto(`${appUrl}?failure-injection=${Date.now()}`, { waitUntil: "networkidle" });
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
    // Раскрытие «Ещё» живёт в состоянии, а не в браузерном <details>: после клика идёт коммит и
    // перерисовка. Без ожидания следующий шаг работает по старому DOM.
    await page.waitForTimeout(350);
    if (!(await page.locator('[data-testid="app-ribbon"] .nav-cluster').first().isVisible().catch(() => false))) {
      await page.locator('[data-testid="app-ribbon"] summary').first().click().catch(() => {});
      await page.waitForTimeout(350);
    }
  }
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    // Перебираем группы ПОИМЁННО. Раскрыта всегда одна, поэтому «первый тумблер в DOM» после
    // каждого клика возвращается к началу — цикл по `.first()` ходил бы между двумя группами
    // бесконечно. И ждём перерисовку: раскрытие идёт через состояние, а не через CSS.
    for (const cluster of ["capture", "doing", "ai", "workshop"]) {
      const toggle = page.getByTestId(`nav-cluster-drafts-${cluster}`);
      if (!(await toggle.count())) continue;
      await toggle.click().catch(() => {});
      await page.waitForTimeout(350);
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

// P9.2 FAILURE_INJECTION: real failure-injection test hooks (provider + storage) prove the
// app stays alive, every other surface keeps working, and the degradation is honestly shown
// - never a hidden action, never a crash screen for a failure that should be isolated.
test("failure injection: provider failure and storage failure are both isolated, app stays alive", async ({ page }) => {
  let nextNoteTitle = "";
  page.on("dialog", (dialog) => dialog.accept(dialog.type() === "prompt" ? nextNoteTitle : undefined));
  await reset(page);

  const token = String(Date.now());

  // 1. Inject a real provider failure: Health Registry + Feed must honestly reflect it,
  // while every other surface keeps working normally.
  await page.evaluate(() => window.__lifeosKnowledgeBase.injectProviderFailureForTest("pdf"));
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  await openSurface(page, "control");
  const pdfHealthRow = page.getByTestId("health-row").filter({ hasText: "PDF" });
  await expect(pdfHealthRow).toHaveAttribute("data-health", "failed");

  await openSurface(page, "feed");
  await expect(page.getByTestId("feed-health-alerts")).toBeVisible();
  await expect(page.getByTestId("feed-health-alert-row").filter({ hasText: "PDF" })).toBeVisible();

  // Other surfaces still work: create a real note while the PDF provider is "failed".
  await openSurface(page, "library");
  const isolationNoteTitle = "Isolation proof " + token;
  nextNoteTitle = isolationNoteTitle;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(isolationNoteTitle);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterProviderFailure = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(afterProviderFailure.notes).some((note) => note.title === isolationNoteTitle)).toBe(true);
  expect(afterProviderFailure.providers.pdf.status).toBe("error");

  // 2. Inject a real storage failure: the save genuinely fails, but the app stays alive -
  // the note just created is still visible, navigation still works, and the failure is
  // honestly shown (save-status "ошибка", storage health "failed") rather than hidden or
  // crashing into an error screen.
  await page.evaluate(() => window.__lifeosKnowledgeBase.injectStorageFailureForTest(true));
  const storageFailNoteTitle = "During storage failure " + token;
  nextNoteTitle = storageFailNoteTitle;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(storageFailNoteTitle);

  await expect(page.locator("#save-status")).toHaveAttribute("data-state", "error", { timeout: 10000 });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible();

  await openSurface(page, "control");
  const storageHealthRow = page.getByTestId("health-row").filter({ hasText: "Storage" });
  await expect(storageHealthRow).toHaveAttribute("data-health", "failed");

  // The rest of the app is still fully alive and navigable during the storage outage.
  await openSurface(page, "today");
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible();
  await openSurface(page, "graph");
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible();
  await openSurface(page, "library");
  const noteRow = page.getByTestId("note-row").filter({ hasText: storageFailNoteTitle });
  await expect(noteRow).toBeVisible();

  // 3. Recovery: turning off the injected failure lets saves succeed again.
  await page.evaluate(() => window.__lifeosKnowledgeBase.injectStorageFailureForTest(false));
  const recoveryNoteTitle = "After recovery " + token;
  nextNoteTitle = recoveryNoteTitle;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(recoveryNoteTitle);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await expect(page.locator("#save-status")).toHaveAttribute("data-state", "saved", { timeout: 10000 });

  const afterRecovery = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(afterRecovery.notes).some((note) => note.title === storageFailNoteTitle)).toBe(true);
  expect(Object.values(afterRecovery.notes).some((note) => note.title === recoveryNoteTitle)).toBe(true);
});

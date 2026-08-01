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

// P6.2 IMPORT_PIPELINE_RECEIPTS: every import gets a checksum-based import_receipt
// (via recordProviderRun); real duplicates are flagged for owner merge-review, never
// silently dropped or silently merged; large imports run as a cancellable chunked
// background job with progress visible in the Feed.
test("import pipeline: dedup merge-review and chunked background import with cancel", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "inbox");

  const token = String(Date.now());
  const identicalText = "Duplicate import content check " + token;
  await page.locator("input#file-import").setInputFiles({
    name: "first-" + token + ".txt",
    mimeType: "text/plain",
    buffer: Buffer.from(identicalText, "utf8")
  });
  await page.locator("input#file-import").setInputFiles({
    name: "second-" + token + ".txt",
    mimeType: "text/plain",
    buffer: Buffer.from(identicalText, "utf8")
  });

  await openSurface(page, "control");
  await expect(page.getByTestId("merge-review-row").first()).toBeVisible();
  const beforeMerge = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const importReceipt = Object.values(beforeMerge.providerRuns).find((run) => run.providerId === "import" && run.kind === "dedup");
  expect(importReceipt).toBeTruthy();
  expect(importReceipt.details.checksum).toBeTruthy();

  await page.getByTestId("merge-duplicate").first().click();
  await expect(page.getByTestId("merge-review-empty")).toBeVisible();
  const afterMerge = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const mergedDuplicate = Object.values(afterMerge.sources).find((source) => source.status === "merged-duplicate");
  expect(mergedDuplicate).toBeTruthy();
  expect(mergedDuplicate.deleted).toBe(true);

  // chunked background import: many lines become many notes progressively, with a
  // real cancel that stops it partway through (proving it isn't a single instant commit)
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await openSurface(page, "inbox");
  const totalLines = 300;
  const lines = Array.from({ length: totalLines }, (_, index) => "Bulk import line " + token + " #" + index).join("\n");
  await page.getByTestId("capture-input").fill(lines);
  const notesBefore = Object.keys(afterMerge.notes).length;
  // Срез Г: кнопка переехала в «Ещё» вместе с требованием Т1 — раскрываем блок.
  await page.locator('[data-testid="capture-more"]').evaluate((el) => { el.open = true; });
  await page.getByTestId("bulk-import-lines").click();
  await openSurface(page, "feed");
  await expect(page.getByTestId("import-job-row").first()).toBeVisible();
  // wait for at least one real chunk to complete before cancelling, so the assertions
  // below prove chunking actually happened rather than racing the very first commit
  await expect(page.getByTestId("import-job-progress").first()).not.toHaveAttribute("value", "0", { timeout: 10000 });
  await page.getByTestId("cancel-import-job").first().click();
  await expect(page.getByTestId("import-job-row").first()).toHaveAttribute("data-status", "cancelled", { timeout: 15000 });

  const afterCancel = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const notesAfterCancel = Object.keys(afterCancel.notes).length;
  expect(notesAfterCancel).toBeGreaterThan(notesBefore);
  expect(notesAfterCancel).toBeLessThan(notesBefore + totalLines);
  const job = Object.values(afterCancel.control.importJobs)[0];
  expect(job.status).toBe("cancelled");
  expect(job.processedItems).toBeGreaterThan(0);
  expect(job.processedItems).toBeLessThan(totalLines);
});

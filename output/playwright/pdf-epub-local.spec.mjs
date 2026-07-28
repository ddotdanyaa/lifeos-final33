import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
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

// P6.1 PDF_EPUB_LOCAL: real local parsing via pdfjs-dist (PDF) and fflate (EPUB unzip +
// OPF spine parse), never faked; a parse failure falls back to the honest gate.
test("PDF and EPUB parse for real locally, no fake success on failure", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "reader");
  await expect(page.getByTestId("reader-surface")).toBeVisible();

  await page.getByTestId("file-import").setInputFiles(join("output", "playwright", "fixtures", "test-fixture.pdf"));
  await expect(page.getByTestId("book-source-card").filter({ hasText: "test-fixture.pdf" })).toBeVisible();
  const pdfCard = page.getByTestId("book-source-card").filter({ hasText: "test-fixture.pdf" });
  await expect(pdfCard).toContainText("ждёт парсер");
  await pdfCard.getByTestId("extract-book-text").click();
  await expect(pdfCard).toContainText("текст готов", { timeout: 15000 });

  const afterPdf = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const pdfSource = Object.values(afterPdf.sources).find((source) => source.name === "test-fixture.pdf");
  expect(pdfSource.text).toContain("Hello from a real local PDF parse test");
  expect(pdfSource.parserStatus).toBe("text-ready");

  await page.getByTestId("file-import").setInputFiles(join("output", "playwright", "fixtures", "test-fixture.epub"));
  const epubCard = page.getByTestId("book-source-card").filter({ hasText: "test-fixture.epub" });
  await expect(epubCard).toBeVisible();
  await epubCard.getByTestId("extract-book-text").click();
  await expect(epubCard).toContainText("текст готов", { timeout: 15000 });

  const afterEpub = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const epubSource = Object.values(afterEpub.sources).find((source) => source.name === "test-fixture.epub");
  expect(epubSource.text).toContain("Hello from a real local EPUB parse test");
  expect(epubSource.parserStatus).toBe("text-ready");

  // a genuinely broken PDF must fail honestly, never claim success
  const brokenPath = join("output", "playwright", "fixtures", "broken.pdf");
  await writeFile(brokenPath, "%PDF-1.4\nnot a real pdf body\n%%EOF");
  await page.getByTestId("file-import").setInputFiles(brokenPath);
  const brokenCard = page.getByTestId("book-source-card").filter({ hasText: "broken.pdf" });
  await brokenCard.getByTestId("extract-book-text").click();
  await expect(brokenCard).toContainText("ошибка парсера", { timeout: 15000 });
  const afterBroken = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const brokenSource = Object.values(afterBroken.sources).find((source) => source.name === "broken.pdf");
  expect(brokenSource.parserStatus).not.toBe("text-ready");
  expect(brokenSource.text || "").toBe("");
});

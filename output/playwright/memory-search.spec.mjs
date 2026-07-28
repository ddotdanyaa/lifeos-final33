import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort().reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";
async function reset(page) {
  await page.goto(`${appUrl}?memsearch=${Date.now()}`, { waitUntil: "networkidle" });
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

// Срез 8.2: полнотекстовый поиск по памяти на minisearch. Проверяем СЦЕНАРИЙ целиком:
// пишем заметки -> ищем по префиксу И с опечаткой -> движок ранжирует -> клик открывает заметку.
test("memory full-text search (minisearch): prefix, typo tolerance, click opens note", async ({ page }) => {
  const token = String(Date.now()).slice(-6);
  let nextTitle = "";
  page.on("dialog", (dialog) => dialog.accept(dialog.type() === "prompt" ? nextTitle : undefined));
  await reset(page);
  await openSurface(page, "library");

  async function makeNote(title, body) {
    nextTitle = title;
    await page.getByTestId("new-note").click();
    await expect(page.getByTestId("note-title")).toHaveValue(title);
    await page.getByTestId("note-body").fill(body);
    await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  }

  const finTitle = "Финансовый отчёт " + token;
  await makeNote(finTitle, "Квартальные расходы и доходы, бюджет на технику.");
  await makeNote("Рецепт кофе " + token, "Утренний латте с корицей и молоком.");
  await makeNote("План поездки " + token, "Маршрут по горам летом, снаряжение.");

  // 1. Префиксный поиск: «финанс» -> находит «Финансовый …» (substring-поиск такого не гарантирует
  //    по префиксу основы, minisearch prefix:true — да).
  await page.getByTestId("memory-search-input").fill("финанс");
  await page.getByTestId("run-memory-search").click();
  await expect(page.getByTestId("memory-search-results")).toBeVisible();
  const finRow = page.getByTestId("memory-search-row").filter({ hasText: finTitle });
  await expect(finRow).toBeVisible();

  // 2. Опечатка: «кофн» (1 замена от «кофе») с fuzzy:0.2 всё равно находит рецепт кофе.
  await page.getByTestId("memory-search-input").fill("кофн");
  await page.getByTestId("run-memory-search").click();
  await expect(page.getByTestId("memory-search-results")).toBeVisible();
  await expect(page.getByTestId("memory-search-row").filter({ hasText: "Рецепт кофе " + token })).toBeVisible();
  // Нерелевантное не лезет в выдачу по «кофн».
  await expect(page.getByTestId("memory-search-row").filter({ hasText: "План поездки" })).toHaveCount(0);

  // 3. Клик по результату открывает заметку в редакторе (полный сценарий: поиск -> переход).
  await page.getByTestId("memory-search-input").fill("финанс");
  await page.getByTestId("run-memory-search").click();
  await page.getByTestId("memory-search-row").filter({ hasText: finTitle }).click();
  await expect(page.getByTestId("note-title")).toHaveValue(finTitle);
});

// П2 · ЧЕСТНАЯ ПУСТОТА.
//
// Боль владельца: он открыл Базу и увидел «Выводы — инсайты появятся из чтения, аудио и
// заметок», «Вопросы — вопросы станут задачами без потери источника», «Повторение — карточка
// повторения появится после извлечения смысла». Три заголовка, три обещания, ноль данных.
// Панель выглядит наполненной, а сообщить ей нечего: интерфейс занимает экран разговором о
// себе. Это бутафория ФОРМОЙ, а не словом, и статический аудит терминов её не видел.
//
// Правило: нет данных — нет раздела. Пусто всё — одна честная строка на панель, а не по
// обещанию на каждый несуществующий раздел. Появились данные — появилась подпись.
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
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

test("панель знания не рисует подписи над пустотой", async ({ page }) => {
  await reset(page, "honest-empty");
  await page.getByTestId("surface-library").click();
  await expect(page.getByTestId("knowledge-workbench")).toBeVisible();

  const cards = page.getByTestId("knowledge-cards");
  await expect(cards).toBeVisible();

  // Ни одной подписи: выводов, вопросов и повторения ещё не существует.
  await expect(cards.locator("h3")).toHaveCount(0);
  await expect(cards, "обещания «инсайты появятся» на экране больше нет").not.toContainText("Инсайты появятся");
  await expect(cards, "обещания «вопросы станут задачами» больше нет").not.toContainText("станут задачами");

  // И ровно одно объяснение на всю панель, а не три.
  await expect(cards.getByTestId("empty-state")).toHaveCount(1);
});

test("появился вывод — появилась подпись «Выводы»", async ({ page }) => {
  await reset(page, "honest-empty-fills");
  await page.getByTestId("surface-library").click();
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-body")).toBeVisible();

  await page.locator("#claim-title").fill("Утро продуктивнее вечера");
  await page.getByTestId("add-claim-entry").click();

  const cards = page.getByTestId("knowledge-cards");
  await expect(cards.locator("h3")).toHaveCount(1);
  await expect(cards.locator("h3")).toHaveText("Выводы");
  await expect(cards).toContainText("Утро продуктивнее вечера");
  // Разделов, которых по-прежнему нет, по-прежнему нет.
  await expect(cards).not.toContainText("Повторение");
  await expect(cards.getByTestId("empty-state")).toHaveCount(0);
});

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

test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?morning=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Срез 4 плана v1.4: утренняя сводка на Доме - только реальные данные, никаких заглушек.
// Дата+день недели, прогресс к недельной цели (из среза 3), задачи на сегодня, итоги вчера.
test("Срез 4: утренняя сводка показывает реальные дату, цель, задачи и вчера", async ({ page }) => {
  await reset(page);

  // Сводка видна сразу на Доме.
  const summary = page.getByTestId("morning-summary");
  await expect(summary).toBeVisible();

  // Дата - реальная (день недели по-русски + месяц), не заглушка.
  await expect(page.getByTestId("morning-date")).toContainText(/понедельник|вторник|среда|четверг|пятница|суббота|воскресенье/);
  await expect(page.getByTestId("morning-date")).toContainText(/января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря/);

  // Свежее состояние: цель не задана, задач нет, вчера пусто - и сводка говорит это честно.
  await expect(page.getByTestId("morning-goal")).toContainText("не задана");
  await expect(page.getByTestId("morning-tasks")).toContainText("Задач на сегодня нет");
  await expect(page.getByTestId("morning-yesterday")).toContainText("записей не было");

  // Записываем смену сегодня + ставим недельную цель -> сводка обновляется реальными цифрами.
  await page.getByTestId("capture-input").fill("Отработал 10 часов, заработал 5000");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
  await expect.poll(async () => page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().financeTransactions || {}).filter((tx) => !tx.deleted).length)).toBeGreaterThanOrEqual(1);

  // Задать цель через Деньги.
  await page.locator('[data-testid="app-ribbon"] summary').first().click().catch(() => {});
  await page.getByTestId("surface-finance").first().click();
  await page.getByTestId("weekly-goal-input").fill("20000");
  await page.getByTestId("set-weekly-goal").click();

  // Вернуться на Дом - сводка теперь с реальными цифрами.
  await page.getByTestId("surface-inbox").first().click();
  await expect(page.getByTestId("morning-goal")).toContainText("15");
  await expect(page.getByTestId("morning-goal")).toContainText("20");
});

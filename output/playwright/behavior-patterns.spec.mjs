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
test.setTimeout(150000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?patterns=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// B1 (канон, блок «Инсайты»): паттерн — это сравнение двух выборок собственных дней владельца,
// и размер выборки показывается рядом с выводом. Без него это гадание, а не закономерность.
test("паттерны: привычка против продуктивности посчитана с размером выборки", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.seedHabitPatternForTest());
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));

  const pattern = page.locator('[data-testid="behavior-pattern"]', { hasText: "Тренировка" }).first();
  await expect(pattern).toBeVisible();
  await expect(pattern).toContainText("больше задач");
  // Сравнение названо числами обеих сторон, а не одной.
  await expect(pattern.getByTestId("behavior-pattern-detail")).toContainText("против");
  await expect(pattern.getByTestId("behavior-pattern-evidence")).toContainText("Сравнение");
  await expect(pattern.getByTestId("behavior-pattern-evidence")).toContainText("дней");
});

// B2: «говорю чаще, чем делаю» — та же честная арифметика по теме, без упрёков.
test("паттерны: разговоры против действий по теме", async ({ page }) => {
  await reset(page);
  for (const line of ["Опять думаю про переезд", "Переезд снова в голове", "Посчитать переезд", "Переезд обсудили"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));

  const pattern = page.locator('[data-testid="behavior-pattern"]', { hasText: "говоришь чаще" }).first();
  await expect(pattern).toBeVisible();
  await expect(pattern.getByTestId("behavior-pattern-detail")).toContainText("упоминани");
  await expect(pattern.getByTestId("behavior-pattern-detail")).toContainText("действи");
});

// B3: на чистом хранилище паттернов нет — закономерность из двух дней не выдумывается.
test("паттерны: без данных их нет", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  await expect(page.getByTestId("behavior-pattern")).toHaveCount(0);
});

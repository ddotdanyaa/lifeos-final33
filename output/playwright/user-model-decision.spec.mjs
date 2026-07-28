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
  await page.goto(`${appUrl}?usermodel=${Date.now()}`, { waitUntil: "networkidle" });
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
async function capture(page, text) {
  await openSurface(page, "inbox");
  await page.locator("#capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  const primary = page.getByTestId("human-primary-action");
  if (await primary.isVisible().catch(() => false)) await primary.click();
  await page.waitForTimeout(180);
}

// Срез 12: модель пользователя + поддержка решения на реальных цифрах. Сценарий целиком: задаю
// цель недели + пишу смены → Дом показывает характеристики с уверенностью и «почему», и решение
// «стоит ли завтра работать?» с обоснованием и альтернативами.
test("user model traits carry confidence and why; work decision is explained on real numbers", async ({ page }) => {
  await reset(page);

  // Цель недели 20000.
  await openSurface(page, "finance");
  await page.getByTestId("weekly-goal-input").fill("20000");
  await page.getByTestId("set-weekly-goal").click();

  // Две смены по 5000 (доход 10000 < цели → «стоит выйти»).
  await capture(page, "отработал 8 часов заработал 5000");
  await capture(page, "отработал 8 часов заработал 5000");

  await openSurface(page, "inbox");
  await expect(page.getByTestId("user-model-panel")).toBeVisible();

  // 1. Три характеристики, каждая с раскрытием «почему» и уверенностью.
  await expect(page.locator('[data-testid="trait-card"][data-trait="discipline"]')).toBeVisible();
  await expect(page.locator('[data-testid="trait-card"][data-trait="rhythm"]')).toBeVisible();
  const energy = page.locator('[data-testid="trait-card"][data-trait="energy"]');
  await expect(energy).toBeVisible();
  await expect(energy).toContainText("уверенность");
  await energy.locator("summary").click();
  await expect(energy.getByTestId("trait-why")).toContainText("ч смен");

  // 2. Решение «стоит ли завтра работать?» на реальных цифрах — с ответом, обоснованием, альтернативами.
  await expect(page.getByTestId("decision-card")).toBeVisible();
  await expect(page.getByTestId("decision-answer")).toContainText("Стоит выйти");
  await expect(page.getByTestId("decision-answer")).toContainText("уверенность");
  await expect(page.getByTestId("decision-why")).toContainText("осталось");
  await expect(page.getByTestId("decision-card")).toContainText("Альтернативы");
});

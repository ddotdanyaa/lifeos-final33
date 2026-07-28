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
  await page.goto(`${appUrl}?shift-week=${Date.now()}`, { waitUntil: "networkidle" });
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

// Срезы 2+3 плана v1.4: ежедневный цикл владельца "смена и деньги" - одна фраза →
// предпросмотр разбора (часы/доход/расходы) → явное подтверждение → доход с часами +
// расходы + рабочий день в календаре + недельный виджет с целью и доход/час. Плюс срез 2:
// происхождение артефакта и люди-сущности видимы.
test("Срез 3: смена одной фразой - предпросмотр, подтверждение, деньги, календарь, недельный виджет с целью", async ({ page }) => {
  await reset(page);

  // 1. Одна фраза на Дом.
  await page.getByTestId("capture-input").fill("Отработал 12 часов, заработал 8700, бензин 1900");
  await page.getByTestId("capture-text").click();

  // 2. Предпросмотр разбора виден ДО любых записей: часы, доход, расходы.
  const understanding = page.getByTestId("lifeos-understanding");
  await expect(understanding).toContainText("Это смена");
  await expect(understanding).toContainText("12 ч");
  await expect(understanding).toContainText("8700");
  await expect(understanding).toContainText("Бензин 1900");
  const beforeApply = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(beforeApply.financeTransactions || {}).length).toBe(0);

  // 3. Явное подтверждение одним нажатием.
  await page.getByTestId("human-primary-action").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.financeTransactions || {}).filter((tx) => !tx.deleted).length;
  }).toBeGreaterThanOrEqual(2);

  const afterApply = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const txs = Object.values(afterApply.financeTransactions).filter((tx) => !tx.deleted);
  const income = txs.find((tx) => tx.kind === "income");
  const expense = txs.find((tx) => tx.kind === "expense");
  expect(income.amount).toBe(8700);
  expect(income.shiftHours).toBe(12);
  expect(income.category).toBe("Смена");
  expect(expense.amount).toBe(1900);
  expect(/бензин/i.test(expense.title)).toBe(true);
  // Рабочий день в календаре.
  const shiftBlock = Object.values(afterApply.planBlocks || {}).find((block) => !block.deleted && /Смена 12/.test(block.title));
  expect(shiftBlock).toBeTruthy();
  expect(shiftBlock.day).toBe(income.day);

  // 4. Недельный виджет: часы, доход/час; редактируемая цель недели и остаток.
  await openSurface(page, "finance");
  await expect(page.getByTestId("shift-week-hours")).toContainText("12 ч");
  await expect(page.getByTestId("shift-week-rate")).toContainText("725");
  await page.getByTestId("weekly-goal-input").fill("30000");
  await page.getByTestId("set-weekly-goal").click();
  await expect(page.getByTestId("weekly-goal-left")).toContainText("21");
  const finalState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(finalState.financeWeeklyGoal).toBe(30000);
});

test("Срез 2: происхождение артефакта и люди-сущности реальны и видимы", async ({ page }) => {
  await reset(page);
  await page.getByTestId("capture-input").fill("Обсудить с Женей ремонт машины");
  await page.getByTestId("capture-text").click();

  // Люди видны в карточке разбора ДО применения.
  await expect(page.getByTestId("lifeos-understanding")).toContainText("Люди: Женей");

  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const source = Object.values(state.sources).find((item) => /Женей/.test(item.originalText || ""));
  expect(source).toBeTruthy();
  // Происхождение зафиксировано, исходный текст неизменен.
  expect(source.origin).toBe("text");
  expect(source.originalText).toBe("Обсудить с Женей ремонт машины");
  expect(source.analysis.entities.people).toContain("Женей");
});

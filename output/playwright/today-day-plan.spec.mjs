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
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?today=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));
  await expect(page.getByTestId("task-input")).toBeVisible({ timeout: 15000 });
}

// TD1: у каждого блока дня написано, почему он здесь, а пересечение по времени — настоящий
// конфликт с посчитанными вариантами. Выбор реально двигает время и пишет чек (§7).
test("сегодня: пересечение блоков решается переносом на посчитанное свободное окно", async ({ page }) => {
  await reset(page);

  await page.fill('[data-testid="task-input"]', "Ответить Дмитрию");
  await page.fill('[data-testid="task-time-input"]', "14:00");
  await page.click('[data-testid="add-task"]');
  await page.fill('[data-testid="plan-input"]', "Звонок с подрядчиком");
  await page.fill('[data-testid="plan-time-input"]', "14:15");
  await page.click('[data-testid="add-plan-block"]');

  // У блока видно объяснение «почему он здесь», а не только название и время.
  const block = page.getByTestId("today-block").first();
  await expect(block).toBeVisible();
  await expect(block.getByTestId("today-block-why")).not.toBeEmpty();

  // Пересечение названо конфликтом и объяснено, с каким именно блоком.
  await expect(page.getByTestId("today-conflict").first()).toContainText("Пересекается");
  await expect(page.getByTestId("today-brief-line")).toContainText("пересечение");

  const fixes = page.getByTestId("today-conflict-fix");
  expect(await fixes.count()).toBeGreaterThanOrEqual(3);
  await expect(fixes.first()).toContainText("Перенести на");

  await fixes.first().click();
  const applied = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const task = Object.values(state.tasks).find((item) => item.title.includes("Дмитрию"));
    const receipt = (state.control.receipts || []).slice(-1)[0];
    return { startTime: task.startTime, receipt: receipt ? receipt.summary : "" };
  });
  expect(applied.startTime).not.toBe("14:00");
  expect(applied.receipt).toContain("Пересечение");
  await expect(page.getByTestId("today-conflict")).toHaveCount(0);
});

// TD2: у задачи виден эффект на цель — что именно изменится, когда её закроешь. Если задача
// ни к чему не привязана, система честно говорит, что эффект посчитать не из чего (закон №5).
test("сегодня: задача показывает эффект на цель, а без цели — честное «не из чего считать»", async ({ page }) => {
  await reset(page);

  await page.fill('[data-testid="goal-input"]', "Ремонт кухни");
  await page.click('[data-testid="add-goal"]');
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("goals"));
  await page.getByTestId("goal-next-task").first().click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));

  const effect = page.getByTestId("today-effect").first();
  await expect(effect).toBeVisible();
  await expect(effect.getByTestId("today-effect-goal")).toContainText("Ремонт кухни");
  await expect(effect.getByTestId("today-effect-text")).toContainText("шаг");

  // Задача, созданная вне контекста цели, не присваивает себе чужую цель.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("library"));
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));
  await page.fill('[data-testid="task-input"]', "Купить лампочки");
  await page.click('[data-testid="add-task"]');

  const orphan = page.locator('[data-testid="today-effect"]', { hasText: "Купить лампочки" });
  await expect(orphan.getByTestId("today-effect-goal")).toHaveText("Без цели");
  await expect(orphan.getByTestId("today-effect-text")).toContainText("не может сказать");
});

// TD3: «не сегодня» — это решение с причиной, а не пропажа задачи.
test("сегодня: отложенное показано вместе с причиной", async ({ page }) => {
  await reset(page);

  await page.fill('[data-testid="task-input"]', "Позвонить в банк");
  await page.click('[data-testid="add-task"]');
  await page.getByTestId("snooze-tomorrow").first().click();

  await expect(page.getByTestId("today-deferred-row").first()).toBeVisible();
  await expect(page.getByTestId("today-deferred-reason").first()).toContainText("Запланирована на");
});

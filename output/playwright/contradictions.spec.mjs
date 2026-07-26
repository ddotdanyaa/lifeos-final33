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
  await page.goto(`${appUrl}?contra=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function capture(page, lines) {
  for (const line of lines) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(220);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
}

async function addGoal(page, title, amount, date) {
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("goals"));
  await page.waitForSelector('[data-testid="goal-title-entry"]');
  await page.fill('[data-testid="goal-title-entry"]', title);
  await page.fill('[data-testid="goal-target-amount"]', String(amount));
  await page.fill('[data-testid="goal-target-date"]', date);
  await page.click('[data-testid="add-goal-entry"]');
  await page.waitForTimeout(300);
}

// C1: две денежные цели, заданные в разное время, никогда не сверялись между собой —
// система сводит их и показывает НЕДОСТАЮЩУЮ сумму, а не абстрактное «конфликт».
test("противоречия: две цели тянут один поток, разница посчитана", async ({ page }) => {
  await reset(page);
  await capture(page, ["Заработал 200000 зарплата", "Потратил 40000 продукты"]);
  const due = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  await addGoal(page, "Купить машину", 1150000, due);
  await addGoal(page, "Откладывать на резерв", 600000, due);

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  const row = page.locator('[data-testid="contradiction"]', { hasText: "против" }).first();
  await expect(row).toBeVisible();
  await expect(row.getByTestId("contradiction-summary")).toContainText("в месяц");
  await expect(row.getByTestId("contradiction-summary")).toContainText("Не хватает");
  // Основание видно: противоречие держится на конкретных транзакциях, а не на ощущении.
  await expect(row.getByTestId("contradiction-evidence")).toContainText("транзакц");
});

// C2 (канон): сомнение владельца не удаляется и показывается рядом с активной целью.
test("противоречия: сомнение сохранено и стоит рядом с целью", async ({ page }) => {
  await reset(page);
  await capture(page, ["Может вообще без машины обойтись"]);
  await addGoal(page, "Купить машину", 1150000, new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10));

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  const doubt = page.locator('[data-testid="contradiction"]', { hasText: "Сомнение" }).first();
  await expect(doubt).toBeVisible();
  // Цитируются собственные слова владельца, а не пересказ.
  await expect(doubt.getByTestId("contradiction-summary")).toContainText("без машины обойтись");
  await expect(doubt.getByTestId("contradiction-summary")).toContainText("не удалено");

  // Из противоречия можно провалиться в объект-источник.
  await doubt.getByTestId("contradiction-open").click();
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 15000 });
});

// C3: без данных противоречий нет — система не придумывает тревогу на пустом месте.
test("противоречия: на чистом хранилище их нет", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  await expect(page.getByTestId("contradiction")).toHaveCount(0);
});

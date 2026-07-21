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
const todayKey = () => new Date().toISOString().slice(0, 10);
const yesterdayKey = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

async function reset(page) {
  await page.goto(`${appUrl}?timeline=${Date.now()}`, { waitUntil: "networkidle" });
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
  await page.getByTestId(`surface-${id}`).first().click();
}

// Срез 9: единая ось жизни + реконструкция дня. Сценарий целиком: смена+расход → расход
// «переносим» на вчера → Лента группирует по дням → фильтр дня восстанавливает один день →
// клик по событию открывает артефакт.
test("timeline groups life events by day and reconstructs a single day", async ({ page }) => {
  await reset(page);

  // 1. Одна фраза создаёт смену (доход 5000, 8ч) + расход (бензин 1200) на сегодня.
  await page.getByTestId("capture-input").fill("Отработал 8 часов, заработал 5000, бензин 1200");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
  await expect.poll(async () => page.evaluate(() =>
    Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().financeTransactions || {}).filter((tx) => !tx.deleted).length
  )).toBeGreaterThanOrEqual(2);

  const snap = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const txs = Object.values(snap.financeTransactions).filter((tx) => !tx.deleted);
  const income = txs.find((tx) => tx.kind === "income");
  const expense = txs.find((tx) => tx.kind === "expense");

  // 2. Переносим расход на вчера — теперь ось должна показать ДВА дня.
  await page.evaluate((id) => window.__lifeosKnowledgeBase.setArtifactDayForTest("financeTransactions", id, new Date(Date.now() - 86400000).toISOString().slice(0, 10)), expense.id);

  // 3. Лента: хроника по дням.
  await openSurface(page, "feed");
  await expect(page.getByTestId("timeline-panel")).toBeVisible();
  const today = todayKey();
  const yesterday = yesterdayKey();
  const todayBlock = page.locator(`[data-testid="timeline-day"][data-day="${today}"]`);
  const yesterdayBlock = page.locator(`[data-testid="timeline-day"][data-day="${yesterday}"]`);
  await expect(todayBlock).toBeVisible();
  await expect(yesterdayBlock).toBeVisible();
  // Смена (доход) сегодня с положительной суммой; расход — вчера с отрицательной.
  await expect(todayBlock.locator('[data-ev-type="shift"] .timeline-ev-amount.in')).toBeVisible();
  await expect(todayBlock.locator('[data-ev-type="shift"]').first()).toContainText(/5\s*000/);
  await expect(yesterdayBlock.locator('[data-ev-type="expense"] .timeline-ev-amount.out')).toBeVisible();
  await expect(yesterdayBlock.locator('[data-ev-type="expense"]').first()).toContainText(/1\s*200/);

  // 4. Реконструкция одного дня: фильтр по сегодня — вчерашний день исчезает.
  await page.getByTestId("timeline-day-input").fill(today);
  await expect(page.locator(`[data-testid="timeline-day"][data-day="${today}"]`)).toBeVisible();
  await expect(page.locator(`[data-testid="timeline-day"][data-day="${yesterday}"]`)).toHaveCount(0);

  // 5. Сброс фильтра — оба дня снова видны.
  await page.getByTestId("timeline-clear-day").click();
  await expect(page.locator(`[data-testid="timeline-day"][data-day="${yesterday}"]`)).toBeVisible();

  // 6. Клик по событию открывает артефакт (activeNoteId переключается на заметку смены).
  await page.locator(`[data-testid="timeline-day"][data-day="${today}"]`).getByTestId("timeline-event").first().click();
  await expect.poll(async () => page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().activeNoteId)).toBe(income.noteId);
});

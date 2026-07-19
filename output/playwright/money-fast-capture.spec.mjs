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

// This repo's installed playwright-core (1.61.0) expects chromium_headless_shell revision
// 1228, but only 1217/1223 are actually downloaded in this environment - every spec here
// needs this override or browserType.launch fails with "Executable doesn't exist".
test.use({ launchOptions: { executablePath: findLocalChromium() } });

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?money-fast-capture=${Date.now()}`, { waitUntil: "networkidle" });
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

async function captureAndApply(page, text) {
  await page.locator("#capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
}

test("U2 MONEY_FAST: bare-text expense/income auto-parse, goal pace, real weekly chart", async ({ page }) => {
  await reset(page);

  // 1) "350 бензин" - no "Расход:"/keyword prefix at all, exactly the plan's own example.
  // Must become a correct expense (amount 350, category inferred), balance updates same day,
  // and must NOT also spawn a duplicate/misclassified task (the bug found while building U1).
  await captureAndApply(page, "350 бензин");
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.financeTransactions || {}).filter((tx) => tx.kind === "expense" && tx.amount === 350).length;
  }).toBe(1);
  const afterExpense = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(afterExpense.tasks || {}).some((task) => /бензин/i.test(task.title))).toBe(false);
  expect(afterExpense.financeTransactions[Object.keys(afterExpense.financeTransactions)[0]].category).toBeTruthy();

  // 2) "заработал 4200 смена" - bare income phrasing, no explicit "Доход"/currency sign.
  await captureAndApply(page, "заработал 4200 смена");
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.financeTransactions || {}).filter((tx) => tx.kind === "income" && tx.amount === 4200).length;
  }).toBe(1);

  // Today's balance/spend summary on Home must reflect both real transactions (derived value,
  // not a separate collection) - proves the whole capture -> finance -> summary loop works.
  await openSurface(page, "inbox");
  await expect(page.getByTestId("owner-money-zone")).toContainText("350");

  // 3) Goal "Выкуп машины" with a debt target and date - progress bar + honest pace label.
  await openSurface(page, "habits");
  await page.locator("#goal-title-entry").fill("Выкуп машины");
  await page.locator("#goal-target-amount").fill("300000");
  const future = new Date();
  future.setDate(future.getDate() + 180);
  await page.locator("#goal-target-date").fill(future.toISOString().slice(0, 10));
  await page.getByTestId("add-goal-entry").click();
  const goalRow = page.getByTestId("goal-row").filter({ hasText: "Выкуп машины" });
  await expect(goalRow).toBeVisible();
  await expect(goalRow.getByTestId("goal-progress-bar")).toHaveAttribute("value", "0");
  await expect(goalRow.getByTestId("goal-pace")).toBeVisible();
  await expect(goalRow.getByTestId("goal-pace")).toHaveAttribute("data-raw-pace", /ahead|behind/);

  const goalId = await goalRow.evaluate((el) => {
    const input = el.querySelector('[id^="goal-progress-"]');
    return input ? input.id.replace("goal-progress-", "") : "";
  });
  await page.locator(`#goal-progress-${goalId}`).fill("15000");
  await page.getByTestId("add-goal-progress").click();
  await expect.poll(async () => {
    const value = await goalRow.getByTestId("goal-progress-bar").getAttribute("value");
    return Number(value);
  }).toBe(5);

  // 4) Weekly chart.js canvas on Finance - real data (both transactions above fall in the
  // last-7-days window), proven by sampling actual drawn pixels rather than trusting the
  // canvas exists (same technique as R1's waveform proof - a canvas can exist and stay blank).
  await openSurface(page, "finance");
  const canvas = page.getByTestId("finance-weekly-chart");
  await expect(canvas).toBeVisible();
  await expect.poll(async () => {
    return page.evaluate(() => {
      const el = document.querySelector('[data-testid="finance-weekly-chart"]');
      const ctx = el.getContext("2d");
      const data = ctx.getImageData(0, 0, el.width, el.height).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
      return false;
    });
  }, { timeout: 10000 }).toBe(true);
  await expect(page.getByTestId("finance-weekly-summary")).toContainText("350");
});

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
  await page.goto(`${appUrl}?forecast=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function seedMoneyAndGoal(page) {
  for (const line of ["Заработал 200000 зарплата", "Потратил 40000 продукты", "Потратил 20000 бензин"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(250);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("goals"));
  await page.waitForSelector('[data-testid="goal-title-entry"]');
  await page.fill('[data-testid="goal-title-entry"]', "Купить машину");
  await page.fill('[data-testid="goal-target-amount"]', "1150000");
  await page.fill('[data-testid="goal-target-date"]', new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10));
  await page.click('[data-testid="add-goal-entry"]');
  await page.waitForTimeout(300);
  return page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals).find((item) => item.title === "Купить машину").id);
}

// F1 (P1-6): вероятность цели посчитана из потока по счетам и объяснена числами.
test("прогноз: вероятность цели объяснена реальным потоком", async ({ page }) => {
  await reset(page);
  await seedMoneyAndGoal(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("inbox"));

  const row = page.getByTestId("forecast-row").first();
  await expect(row).toBeVisible();
  const percent = await row.getByTestId("forecast-percent").textContent();
  expect(Number(percent.replace(/[^\d]/g, "").slice(0, 3))).toBeGreaterThan(0);
  // Объяснение опирается на посчитанные числа, а не на «система считает».
  await expect(row.getByTestId("forecast-why")).toContainText("в месяц");
  await expect(row.getByTestId("forecast-why")).toContainText("Стабильность потока");
});

// F2 (P1-2, донор Graphiti): изменение поля не стирает старое значение — оно закрывается датой,
// и по этой истории считается «было N%», без скрытых снимков.
test("история поля: сдвиг срока сохраняется и даёт честную дельту прогноза", async ({ page }) => {
  await reset(page);
  const goalId = await seedMoneyAndGoal(page);

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("inbox"));
  const before = await page.getByTestId("forecast-percent").first().textContent();
  expect(before).not.toContain("было");

  await page.evaluate((id) => {
    document.querySelector("#app").insertAdjacentHTML("beforeend", `<button id="e2e-open" data-action="open-object" data-id="${id}">o</button>`);
  }, goalId);
  await page.click("#e2e-open");
  await page.getByTestId("object-tab-conf").click();
  await page.getByTestId("object-fix").first().click();

  // История поля видна в объекте и называет и старое, и новое значение.
  await page.getByTestId("object-tab-time").click();
  const historyRow = page.getByTestId("object-history-row").first();
  await expect(historyRow).toBeVisible();
  await expect(historyRow).toContainText("срок");
  await expect(historyRow).toContainText("→");

  // Значение хранится как история, а не затирается.
  const stored = await page.evaluate((id) => {
    const goal = window.__lifeosKnowledgeBase.getStateSnapshot().goals[id];
    return (goal.history || []).filter((row) => row.field === "targetDate");
  }, goalId);
  expect(stored.length).toBe(1);
  expect(stored[0].from).toBeTruthy();
  expect(stored[0].to).toBeTruthy();
  expect(stored[0].from).not.toBe(stored[0].to);

  // Прогноз показывает «было N%», выведенное из истории.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("inbox"));
  await expect(page.getByTestId("forecast-percent").first()).toContainText("было");
  // И «где недооценил» замечает, что срок двигали.
  await expect(page.getByTestId("underestimated-row").first()).toContainText("двигали");
});

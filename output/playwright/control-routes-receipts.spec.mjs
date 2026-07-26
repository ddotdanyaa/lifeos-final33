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
  await page.goto(`${appUrl}?control=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// C1: у каждого маршрута наружу написано, что именно уйдёт — не «интеграция», а состав данных.
test("контроль: маршруты наружу описаны составом данных", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("control"));
  await expect(page.getByTestId("outbound-routes")).toBeVisible();

  const routes = page.getByTestId("outbound-route");
  expect(await routes.count()).toBeGreaterThanOrEqual(5);
  const payloads = await page.getByTestId("outbound-payload").allTextContents();
  expect(payloads.every((text) => text.trim().length > 20)).toBe(true);

  // Отключённый маршрут прямо говорит, что не уходит ничего (§7: провайдеры честны).
  const bank = page.locator('[data-testid="outbound-route"][data-route="bank"]');
  await expect(bank.getByTestId("outbound-status")).toHaveText("не подключено");
  await expect(bank.getByTestId("outbound-payload")).toContainText("Ничего не уходит");

  // Зоны приватности — по-русски, без техжаргона.
  const zones = await page.getByTestId("privacy-zone").allTextContents();
  expect(zones.join(" ")).not.toMatch(/\b(active|gated|manual)\b/);
});

// C2: журнал чеков показывает, что система сделала, и откатывает то, что действительно
// откатывается — кнопка не появляется «на будущее».
test("контроль: журнал чеков откатывает решение по объекту", async ({ page }) => {
  await reset(page);
  // Без движения по счетам противоречие цели — это вопрос без вариантов (закон №6),
  // поэтому сначала настоящие деньги, иначе выбирать будет нечего.
  for (const line of ["Заработал 200000 зарплата", "Потратил 40000 продукты"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(300);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const open = Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open");
    for (const proposal of open) await kb.applyProposalForTest(proposal.id);
  });
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("goals"));
  await page.fill('[data-testid="goal-title-entry"]', "Купить машину");
  await page.fill('[data-testid="goal-target-amount"]', "1150000");
  const due = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  await page.fill('[data-testid="goal-target-date"]', due);
  await page.click('[data-testid="add-goal-entry"]');
  await page.waitForTimeout(300);

  // До решения кнопок отката нет — откатывать нечего.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("control"));
  await expect(page.getByTestId("receipt-journal")).toBeVisible();
  await expect(page.getByTestId("receipt-revert")).toHaveCount(0);

  // Принимаем решение в объекте цели.
  const goalId = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals).find((item) => item.title === "Купить машину").id);
  await page.evaluate((id) => {
    document.querySelector("#app").insertAdjacentHTML("beforeend", `<button id="e2e-open" data-action="open-object" data-id="${id}">o</button>`);
  }, goalId);
  await page.click("#e2e-open");
  await page.getByTestId("object-tab-conf").click();
  await page.getByTestId("object-fix").first().click();
  await expect(page.getByTestId("object-decision")).toBeVisible();

  // Теперь в журнале есть чек решения и рабочая кнопка отката.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("control"));
  const revert = page.getByTestId("receipt-revert").first();
  await expect(revert).toBeVisible();
  await revert.click();

  const reverted = await page.evaluate((id) => {
    const goal = window.__lifeosKnowledgeBase.getStateSnapshot().goals[id];
    return { targetDate: goal.targetDate, targetAmount: goal.targetAmount, decision: goal.decision || null };
  }, goalId);
  expect(reverted.decision).toBeNull();
  expect(reverted.targetDate).toBe(due);
  expect(reverted.targetAmount).toBe(1150000);
});

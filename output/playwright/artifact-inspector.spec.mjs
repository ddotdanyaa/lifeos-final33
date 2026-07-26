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
  await page.goto(`${appUrl}?object=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Захват создаёт предложения, а не записи (§7). Подтверждаем их, как это делает владелец кнопкой.
async function captureAndApply(page, lines) {
  for (const line of lines) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(300);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const open = Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open");
    for (const proposal of open) await kb.applyProposalForTest(proposal.id);
  });
}

async function addGoalWithMoney(page, title, amount, targetDate) {
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("goals"));
  await page.waitForSelector('[data-testid="goal-title-entry"]');
  await page.fill('[data-testid="goal-title-entry"]', title);
  await page.fill('[data-testid="goal-target-amount"]', String(amount));
  await page.fill('[data-testid="goal-target-date"]', targetDate);
  await page.click('[data-testid="add-goal-entry"]');
  await page.waitForTimeout(300);
  return page.evaluate((name) => {
    const goal = Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals).find((item) => item.title === name);
    return goal ? goal.id : "";
  }, title);
}

async function openObject(page, id) {
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));
  await page.waitForSelector('[data-testid="workspace-today"]');
  await page.locator(`[data-testid="goal-row"] [data-action="open-object"][data-id="${id}"]`).first().click();
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 15000 });
}

// O1: «проваливание в карточку» — цель раскрывается в объект с вердиктом из реальных чисел,
// источниками, связями, хронологией и противоречиями. Ни одной выдуманной цифры.
test("объект: цель раскрывается вердиктом, источниками, связями, хронологией", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Заработал 200000 зарплата", "Потратил 40000 продукты", "Потратил 20000 бензин"]);
  const due = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const goalId = await addGoalWithMoney(page, "Купить машину", 1150000, due);
  expect(goalId).toBeTruthy();

  await openObject(page, goalId);
  await expect(page.getByTestId("object-title")).toHaveText("Купить машину");

  // Вердикт — одно предложение из посчитанных чисел (нужно / есть / поток), не пересказ полей.
  // toLocaleString("ru-RU") разделяет разряды неразрывным пробелом — нормализуем перед сверкой.
  const verdict = (await page.getByTestId("object-verdict").textContent()).replace(/ /g, " ");
  expect(verdict).toContain("1 150 000 ₽");
  expect(verdict).toContain("в месяц");

  // Закон №5: у каждого числа виден источник.
  await expect(page.getByTestId("object-fact").first()).toBeVisible();
  const sources = await page.getByTestId("object-fact-source").allTextContents();
  expect(sources.length).toBeGreaterThan(0);
  expect(sources.every((line) => line.trim().length > 0)).toBe(true);

  // Вкладки канона: Суть · Источники · Связи · Хронология · Противоречия.
  for (const tab of ["sut", "src", "rel", "time", "conf"]) {
    await expect(page.getByTestId(`object-tab-${tab}`)).toBeVisible();
  }

  await page.getByTestId("object-tab-src").click();
  await expect(page.getByTestId("object-panel-src")).toBeVisible();

  // Закон №8: у связи виден тип и объяснение, а не только факт связанности.
  await page.getByTestId("object-tab-rel").click();
  await expect(page.getByTestId("object-relation").first()).toBeVisible();
  await expect(page.getByTestId("object-relation-type").first()).not.toBeEmpty();
  await expect(page.getByTestId("object-relation-why").first()).not.toBeEmpty();

  await page.getByTestId("object-tab-time").click();
  await expect(page.getByTestId("object-month").first()).toBeVisible();
  await expect(page.getByTestId("object-month-counts").first()).toContainText("/");
});

// O2: противоречие даёт варианты с ценой, выбранный вариант РЕАЛЬНО применяется, пишет чек
// и откатывается. Кнопка, которая ничего не меняет, — это театр (§7).
test("объект: вариант решения меняет цель, пишет чек и откатывается", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Заработал 200000 зарплата", "Потратил 40000 продукты", "Потратил 20000 бензин"]);
  const due = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const goalId = await addGoalWithMoney(page, "Купить машину", 1150000, due);
  await openObject(page, goalId);

  await page.getByTestId("object-tab-conf").click();
  await expect(page.getByTestId("object-conflict").first()).toBeVisible();
  const fixes = page.getByTestId("object-fix");
  expect(await fixes.count()).toBeGreaterThanOrEqual(2);
  // У каждого варианта посчитана цена — иначе это не выбор, а угадывание.
  await expect(page.getByTestId("object-fix-cost").first()).toContainText("цена:");

  await fixes.first().click();
  await expect(page.getByTestId("object-decision")).toBeVisible();

  const applied = await page.evaluate((id) => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const goal = state.goals[id];
    const receipt = (state.control.receipts || []).filter((row) => row.objectId === id).pop();
    return { targetDate: goal.targetDate, decision: goal.decision || null, receipt: receipt ? receipt.summary : "" };
  }, goalId);
  expect(applied.decision).toBeTruthy();
  expect(applied.targetDate).not.toBe(due);
  expect(applied.receipt).toContain("Противоречие");

  await page.getByTestId("object-decision-revert").click();
  const reverted = await page.evaluate((id) => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return { targetDate: state.goals[id].targetDate, decision: state.goals[id].decision || null };
  }, goalId);
  expect(reverted.targetDate).toBe(due);
  expect(reverted.decision).toBeNull();
});

// O3: закон №6 — когда считать не из чего, объект задаёт вопрос, а не предлагает варианты
// с выдуманными числами.
test("объект: без данных о потоке противоречие превращается в вопрос", async ({ page }) => {
  await reset(page);
  const due = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const goalId = await addGoalWithMoney(page, "Накопить на ремонт", 500000, due);
  await openObject(page, goalId);

  await page.getByTestId("object-tab-conf").click();
  await expect(page.getByTestId("object-conflict").first()).toContainText("нехватка данных");
  // Никаких вариантов «сдвинуть срок»/«снизить цель» — их не из чего посчитать.
  expect(await page.getByTestId("object-fix").count()).toBe(0);
  await expect(page.getByTestId("object-conflict-ask-action")).toBeVisible();
});

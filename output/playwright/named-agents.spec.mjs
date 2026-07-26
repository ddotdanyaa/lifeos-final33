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
  await page.goto(`${appUrl}?agents=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// A1: полный канонный цикл агента: план → подтверждение → исполнение → отчёт → квитанция.
test("агент: план, подтверждение, отчёт и квитанция", async ({ page }) => {
  await reset(page);
  for (const line of ["Марина против кредита на машину", "Потратил 4380 продукты Лента"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("agents"));
  const card = page.locator('[data-testid="agent-card"][data-agent="evening-digest"]');
  await expect(card).toBeVisible();

  // Триггер и права видны ДО запуска, и права показаны обеими сторонами (§7).
  await expect(card.getByTestId("agent-when")).not.toBeEmpty();
  const rights = await card.getByTestId("agent-right").allTextContents();
  expect(rights.length).toBeGreaterThanOrEqual(3);
  const rightClasses = await card.getByTestId("agent-right").evaluateAll((nodes) => nodes.map((node) => node.className));
  expect(rightClasses).toContain("can");
  expect(rightClasses).toContain("cannot");

  // Пока план не показан — запускать нечего: кнопки подтверждения нет.
  await expect(card.getByTestId("confirm-agent-plan")).toHaveCount(0);

  await card.getByTestId("plan-agent").click();
  await expect(card.getByTestId("agent-plan-summary")).toContainText("захват");

  // Донор LangGraph: подтверждение запускает прогон ПО ШАГАМ, а не разом. Прокликиваем до конца.
  await card.getByTestId("confirm-agent-plan").click();
  await expect(card.getByTestId("agent-run-step").first()).toBeVisible();
  for (let step = 0; step < 4; step += 1) {
    const next = card.getByTestId("advance-agent-run");
    if (!(await next.count())) break;
    await next.click();
  }
  await expect(card.getByTestId("agent-report-summary")).toContainText("Шагов выполнено");
  expect(await card.getByTestId("agent-report-finding").count()).toBeGreaterThan(0);
  await expect(card.getByTestId("agent-journal-row").first()).toBeVisible();

  // Квитанция настоящая — она лежит в Контроле, а не только на экране агента.
  const receipt = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return (state.control.receipts || []).filter((row) => row.kind === "agent").pop();
  });
  expect(receipt).toBeTruthy();
  expect(receipt.objectId).toBe("evening-digest");

  // Агент ничего не записал сам: объекты появляются только после согласия владельца.
  const written = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.tasks).filter((item) => !item.deleted).length;
  });
  expect(written).toBe(0);
});

// A2: если делать нечего, агент честно говорит это в плане и не даёт кнопку подтверждения.
test("агент: пустой план не даёт кнопку запуска", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("agents"));
  const card = page.locator('[data-testid="agent-card"][data-agent="goal-watcher"]');
  await card.getByTestId("plan-agent").click();
  await expect(card.getByTestId("agent-plan-summary")).toContainText("нечего");
  await expect(card.getByTestId("agent-plan-blocked")).toBeVisible();
  await expect(card.getByTestId("confirm-agent-plan")).toHaveCount(0);
});

// A3: наблюдатель целей находит настоящее расхождение и НЕ меняет цель.
test("наблюдатель целей: находит расхождение, цель не трогает", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("goals"));
  await page.fill('[data-testid="goal-title-entry"]', "Купить машину");
  await page.fill('[data-testid="goal-target-amount"]', "1150000");
  const due = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  await page.fill('[data-testid="goal-target-date"]', due);
  await page.click('[data-testid="add-goal-entry"]');
  await page.waitForTimeout(300);

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("agents"));
  const card = page.locator('[data-testid="agent-card"][data-agent="goal-watcher"]');
  await card.getByTestId("plan-agent").click();
  await card.getByTestId("confirm-agent-plan").click();
  for (let step = 0; step < 4; step += 1) {
    const next = card.getByTestId("advance-agent-run");
    if (!(await next.count())) break;
    await next.click();
  }
  await expect(card.getByTestId("agent-report-summary")).toContainText("Шагов выполнено");
  expect(await card.getByTestId("agent-report-finding").count()).toBeGreaterThan(0);

  const goal = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals).find((item) => item.title === "Купить машину"));
  expect(goal.targetAmount).toBe(1150000);
  expect(goal.targetDate).toBeTruthy();
  expect(goal.decision).toBeUndefined();
});

// A4 (донор LangGraph interrupt): необратимый шаг помечен и агент ОСТАНАВЛИВАЕТСЯ перед ним.
// Пока владелец не подтвердил — расписание не тронуто (закон №9).
test("агент: останавливается перед необратимым шагом и не трогает данные до подтверждения", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));
  await page.waitForSelector('[data-testid="task-input"]');
  await page.fill('[data-testid="task-input"]', "Ответить Дмитрию");
  await page.fill('[data-testid="task-time-input"]', "14:00");
  await page.click('[data-testid="add-task"]');
  await page.fill('[data-testid="plan-input"]', "Созвон с подрядчиком");
  await page.fill('[data-testid="plan-time-input"]', "14:15");
  await page.click('[data-testid="add-plan-block"]');

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("agents"));
  const card = page.locator('[data-testid="agent-card"][data-agent="quiet-secretary"]');
  await card.getByTestId("plan-agent").click();
  await card.getByTestId("confirm-agent-plan").click();
  for (let step = 0; step < 3; step += 1) {
    const next = card.getByTestId("advance-agent-run");
    if (!(await next.count())) break;
    await next.click();
  }

  // Агент стоит на паузе, шаг помечен необратимым, задан конкретный вопрос.
  await expect(card.getByTestId("agent-step-irreversible")).toBeVisible();
  await expect(card.getByTestId("agent-run-question")).toContainText("Перенести");
  await expect(card.locator('[data-testid="agent-run-step"][data-state="waiting"]')).toBeVisible();

  // Данные ещё не тронуты.
  const before = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks)
    .find((task) => task.title.includes("Дмитрию")).startTime);
  expect(before).toBe("14:00");

  await card.getByTestId("resume-agent-run").click();
  const after = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks)
    .find((task) => task.title.includes("Дмитрию")).startTime);
  expect(after).not.toBe("14:00");
  await expect(card.getByTestId("agent-report-summary")).toContainText("Шагов выполнено");
});

// A5: остановка владельцем на паузе оставляет данные нетронутыми и пишет честный чек.
test("агент: остановка до необратимого шага ничего не меняет", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));
  await page.waitForSelector('[data-testid="task-input"]');
  await page.fill('[data-testid="task-input"]', "Ответить Дмитрию");
  await page.fill('[data-testid="task-time-input"]', "14:00");
  await page.click('[data-testid="add-task"]');
  await page.fill('[data-testid="plan-input"]', "Созвон с подрядчиком");
  await page.fill('[data-testid="plan-time-input"]', "14:15");
  await page.click('[data-testid="add-plan-block"]');

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("agents"));
  const card = page.locator('[data-testid="agent-card"][data-agent="quiet-secretary"]');
  await card.getByTestId("plan-agent").click();
  await card.getByTestId("confirm-agent-plan").click();
  for (let step = 0; step < 3; step += 1) {
    const next = card.getByTestId("advance-agent-run");
    if (!(await next.count())) break;
    await next.click();
  }
  await card.getByTestId("cancel-agent-run").click();

  const state = await page.evaluate(() => {
    const snapshot = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      time: Object.values(snapshot.tasks).find((task) => task.title.includes("Дмитрию")).startTime,
      receipt: (snapshot.control.receipts || []).filter((row) => row.kind === "agent").pop()
    };
  });
  expect(state.time).toBe("14:00");
  expect(state.receipt.summary).toContain("Расписание не тронуто");
});

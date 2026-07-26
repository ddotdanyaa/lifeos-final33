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
  await page.goto(`${appUrl}?dedup=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function captureAndApplyAll(page, lines) {
  for (const line of lines) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(220);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const open = Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open");
    for (const proposal of open) await kb.applyProposalForTest(proposal.id);
  });
  await page.waitForTimeout(400);
}

// D1 (закон №4): повторное упоминание УСИЛИВАЕТ существующий объект, а не заводит второй —
// и это видно чеком, иначе «не создал дубль» неотличимо от «ничего не сделал».
test("закон №4: повторное упоминание не создаёт второй объект и оставляет чек", async ({ page }) => {
  await reset(page);
  await captureAndApplyAll(page, [
    "Тренировка каждый день",
    "Надо ответить Дмитрию до среды",
    "Тренировка каждый день",
    "Ответить Дмитрию до среды"
  ]);

  const state = await page.evaluate(() => {
    const snapshot = window.__lifeosKnowledgeBase.getStateSnapshot();
    const live = (collection) => Object.values(collection || {}).filter((item) => !item.deleted);
    return {
      habits: live(snapshot.habits).map((item) => item.title),
      tasks: live(snapshot.tasks).map((item) => item.title),
      reinforce: (snapshot.control.receipts || []).filter((row) => row.kind === "reinforce").map((row) => row.summary)
    };
  });

  // Одна привычка и одна задача, несмотря на четыре захвата про то же самое.
  expect(state.habits.filter((title) => /тренировк/i.test(title)).length).toBe(1);
  expect(state.tasks.filter((title) => /Дмитрию/i.test(title)).length).toBe(1);

  // Усиление оставило след в Контроле и прямо называет, что дубликат не создавался.
  expect(state.reinforce.length).toBeGreaterThan(0);
  expect(state.reinforce.some((line) => /Дубликат не создавался/.test(line))).toBe(true);
});

// D2: тот же блок дня в тот же день — то же событие. Раньше календарь набивался копиями.
test("закон №4: календарь не заводит второй блок на тот же день", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));
  await page.waitForSelector('[data-testid="plan-input"]');
  for (let index = 0; index < 2; index += 1) {
    await page.fill('[data-testid="plan-input"]', "Созвон с подрядчиком");
    await page.fill('[data-testid="plan-time-input"]', "15:00");
    await page.click('[data-testid="add-plan-block"]');
    await page.waitForTimeout(300);
  }
  const blocks = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().planBlocks)
    .filter((item) => !item.deleted && /Созвон с подрядчиком/i.test(item.title || "")).length);
  expect(blocks).toBe(1);
});

// D3: форма целей тоже подчиняется закону №4 — и не просто молчит, а ДОПОЛНЯЕТ существующую
// цель, если в первый раз суммы или срока не было. Нашлось сквозным прогоном вечернего дампа.
test("закон №4: повторный ввод цели не создаёт вторую, а дополняет первую", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("goals"));
  await page.waitForSelector('[data-testid="goal-title-entry"]');

  // Первый раз — только название, без чисел.
  await page.fill('[data-testid="goal-title-entry"]', "Купить машину до августа");
  await page.click('[data-testid="add-goal-entry"]');
  await page.waitForTimeout(300);

  // Второй раз — то же самое, но уже с суммой и сроком.
  const due = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  await page.fill('[data-testid="goal-title-entry"]', "Купить машину до августа");
  await page.fill('[data-testid="goal-target-amount"]', "1150000");
  await page.fill('[data-testid="goal-target-date"]', due);
  await page.click('[data-testid="add-goal-entry"]');
  await page.waitForTimeout(300);

  const goals = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals)
    .filter((item) => !item.deleted && /машин/i.test(item.title || "")));
  expect(goals.length).toBe(1);
  // Повтор не потерялся: цель стала полнее.
  expect(goals[0].targetAmount).toBe(1150000);
  expect(goals[0].targetDate).toBe(due);
});

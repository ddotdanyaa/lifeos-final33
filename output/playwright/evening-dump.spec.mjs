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
test.setTimeout(300000);

const appUrl = "http://127.0.0.1:4173";

// Целевой сценарий владельца целиком: днём накопились записи, вечером — дамп, разбор, и система
// должна свести всё в одну картину. Это не юнит-проверка отдельной функции, а тот самый прогон,
// ради которого продукт существует. Данные — как в реальном дне: с повторами и сомнением.
const EVENING_DUMP = [
  "Марина согласна на август если без кредита",
  "Хочу купить машину до августа",
  "Посчитать свободные деньги за 3 месяца на машину",
  "Оценить продажу старой машины",
  "Надо ответить Дмитрию до среды",
  "Ответить Дмитрию до среды",
  "Ремонт кухни аванс подрядчику",
  "Смета на кухню пришла",
  "Заработал 200000 зарплата",
  "Потратил 40000 продукты",
  "Потратил 20000 бензин",
  "Потратил 4380 продукты Лента",
  "Тренировка силовая 55 минут",
  "Тренировка бег 6 км",
  "Тренировка силовая 55 минут",
  "После тренировки закрываю больше задач",
  "Может вообще без машины обойтись",
  "Английский снова откладываю",
  "Английский опять не начал",
  "Позвонить маме в выходные",
  "Отменить подписку за 1490",
  "Счёт за воду пришёл"
];

async function reset(page) {
  await page.goto(`${appUrl}?evening=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 40000 });
}

async function dump(page) {
  for (const line of EVENING_DUMP) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(160);
  }
}

// E2E целевого сценария. Каждый шаг — обещание из видения продукта, проверенное на данных.
test("вечерний дамп: 22 записи проходят весь путь и сводятся в одну картину", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await reset(page);
  await dump(page);

  // 1. Ничего не потеряно: каждая запись сохранена как захват.
  const captured = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources)
    .filter((item) => !item.deleted).length);
  expect(captured).toBeGreaterThanOrEqual(EVENING_DUMP.length);

  // 2. Разбор дня проходит по стадиям и НИЧЕГО не записывает сам (закон №3).
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  await expect(page.getByTestId("day-digest")).toBeVisible({ timeout: 30000 });
  await page.getByTestId("run-day-digest").click();
  await expect(page.locator('[data-testid="digest-stage"][data-stage="graph"]')).toContainText("дубликаты не создаю");
  const afterDigest = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      tasks: Object.values(state.tasks).filter((item) => !item.deleted).length,
      money: Object.values(state.financeTransactions).filter((item) => !item.deleted).length
    };
  });
  expect(afterDigest.tasks).toBe(0);
  expect(afterDigest.money).toBe(0);

  // 3. Владелец соглашается — теперь объекты появляются, и БЕЗ дублей (закон №4).
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  const applied = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const live = (collection) => Object.values(collection || {}).filter((item) => !item.deleted);
    return {
      tasks: live(state.tasks).map((item) => item.title),
      habits: live(state.habits).map((item) => item.title),
      goals: live(state.goals).map((item) => item.title),
      money: live(state.financeTransactions).length,
      reinforce: (state.control.receipts || []).filter((row) => row.kind === "reinforce").length
    };
  });
  // «Ответить Дмитрию» пришло дважды разными словами — задача должна остаться одна.
  expect(applied.tasks.filter((title) => /Дмитрию/i.test(title)).length).toBe(1);
  // «Тренировка силовая» пришла дважды — привычка одна.
  expect(applied.habits.filter((title) => /Тренировка силовая/i.test(title)).length).toBeLessThanOrEqual(1);
  // Повторы оставили честный след, а не тихо исчезли.
  expect(applied.reinforce).toBeGreaterThan(0);
  expect(applied.money).toBeGreaterThan(0);

  // Служебные шаги разбора НЕ становятся делами владельца. На первом прогоне этого сценария
  // из 11 задач пять были вида «Вытащить задачи из Счёт за воду пришёл» — машинерия в списке дел.
  expect(applied.tasks.filter((title) => /Вытащить задачи|Разобрать |организатора/i.test(title))).toEqual([]);
  // Трата — это трата, а не дело: задачи-двойника у денежной записи быть не должно.
  expect(applied.tasks.filter((title) => /^(Потратил|Заработал)/i.test(title))).toEqual([]);
  // Задач должно быть заметно меньше, чем захватов: система сводит, а не плодит.
  expect(applied.tasks.length).toBeLessThan(EVENING_DUMP.length / 2);
  // «Хочу купить машину до августа» — это ЦЕЛЬ со сроком, а не дело в списке задач.
  expect(applied.goals.some((title) => /машин/i.test(title))).toBe(true);
  expect(applied.tasks.filter((title) => /купить машину/i.test(title))).toEqual([]);

  // 4. Цель с суммой и сроком — и прогноз считается из реального потока по счетам.
  // Цель уже создана разбором из «Хочу купить машину до августа» — задаём ей сумму и срок,
  // как сделал бы владелец, а не заводим вторую (закон №4 проверяется тут же).
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("goals"));
  await page.waitForSelector('[data-testid="goal-title-entry"]');
  await page.fill('[data-testid="goal-title-entry"]', "Хочу купить машину до августа");
  await page.fill('[data-testid="goal-target-amount"]', "1150000");
  await page.fill('[data-testid="goal-target-date"]', new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10));
  await page.click('[data-testid="add-goal-entry"]');
  await page.waitForTimeout(400);
  const goalCount = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals)
    .filter((item) => !item.deleted && /машин/i.test(item.title || "")).length);
  expect(goalCount).toBe(1);

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("inbox"));
  await expect(page.getByTestId("forecast-row").first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("forecast-why").first()).toContainText("в месяц");

  // 5. Одно лучшее действие с «почему» и уверенностью (законы №5 и №6).
  await expect(page.getByTestId("life-focus-best")).toBeVisible();
  await expect(page.getByTestId("life-focus-why")).not.toBeEmpty();
  await expect(page.getByTestId("life-focus-confidence")).toContainText("%");

  // 6. Второй мозг свёл записи в темы — а не оставил 22 отдельных объекта.
  await expect(page.getByTestId("second-brain")).toBeVisible();
  const themes = await page.getByTestId("second-brain-theme").count();
  expect(themes).toBeGreaterThan(0);

  // 7. Противоречия найдены: сомнение «может вообще без машины» стоит рядом с активной целью.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  const contradictions = await page.getByTestId("contradiction").allTextContents();
  expect(contradictions.length).toBeGreaterThan(0);
  expect(contradictions.some((text) => /Сомнение|без машины/i.test(text))).toBe(true);

  // 8. Паттерн найден: к «английскому» владелец возвращается, но объекта такого нет.
  const patterns = await page.getByTestId("behavior-pattern").allTextContents();
  expect(patterns.length).toBeGreaterThan(0);

  // 9. Граф собрал темы и отдаёт текстовый отчёт.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await expect(page.getByTestId("graph-report-headline")).toBeVisible({ timeout: 20000 });
  expect(await page.getByTestId("topic-cluster").count()).toBeGreaterThanOrEqual(2);

  // 10. Вопрос остаётся вопросом даже после дампа: ответ с цитатами, ничего не создано.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("inbox"));
  const beforeAsk = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks)
    .filter((item) => !item.deleted).length);
  await page.fill('[data-testid="capture-input"]', "Почему я до сих пор не купил машину?");
  await page.click('[data-testid="capture-text"]');
  await expect(page.getByTestId("grounded-answer")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("grounded-nothing-created")).toContainText("Ничего не создано");
  const afterAsk = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks)
    .filter((item) => !item.deleted).length);
  expect(afterAsk).toBe(beforeAsk);

  // 11. Ни одной ошибки в консоли за весь путь.
  expect(errors).toEqual([]);
});

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
  await page.goto(`${appUrl}?kinds=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function capture(page, line) {
  await page.fill('[data-testid="capture-input"]', line);
  await page.click('[data-testid="capture-text"]');
  await page.waitForTimeout(300);
}

async function applyAll(page) {
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(400);
}

async function live(page, collection) {
  return page.evaluate((name) => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot()[name] || {})
    .filter((item) => !item.deleted).map((item) => item.title), collection);
}

// T1: правило языка вместо словаря глаголов. «Оценить продажу старой машины» и «Собрать
// документы» словарём не покрывались и уходили в «не разобрано» — а это ровно та форма, которой
// владелец диктует себе задачу.
test("запись, начатая инфинитивом, становится делом", async ({ page }) => {
  await reset(page);
  await capture(page, "Оценить продажу старой машины");
  await capture(page, "Собрать документы для банка");
  await applyAll(page);

  const tasks = await live(page, "tasks");
  expect(tasks.some((title) => /Оценить продажу/i.test(title))).toBe(true);
  expect(tasks.some((title) => /Собрать документы/i.test(title))).toBe(true);
});

// T2: «поСЧИТАТЬ» содержит «читать». Подстрочное сравнение делало из «Посчитать свободные деньги
// за 3 месяца на машину» ПРИВЫЧКУ — тот же класс ошибки, что «на основании» вместо «снова».
test("«посчитать» не читается как «читать» и не становится привычкой", async ({ page }) => {
  await reset(page);
  await capture(page, "Посчитать свободные деньги за 3 месяца на машину");
  await applyAll(page);

  const habits = await live(page, "habits");
  const tasks = await live(page, "tasks");
  expect(habits.filter((title) => /Посчитать/i.test(title))).toEqual([]);
  expect(tasks.some((title) => /Посчитать свободные деньги/i.test(title))).toBe(true);
});

// T3: число перед единицей измерения — величина, а не сумма. Чистка заголовка вырезала любое
// число из 2–9 цифр, и привычка называлась «Тренировка силовая минут».
test("заголовок привычки не теряет величину", async ({ page }) => {
  await reset(page);
  await capture(page, "Тренировка силовая 55 минут");
  await applyAll(page);

  const habits = await live(page, "habits");
  expect(habits.some((title) => /55\s*минут/i.test(title))).toBe(true);
});

// T4: «вода» и «сон» сами по себе привычку не означают. «Счёт за воду пришёл» — это платёж.
test("счёт за воду не становится привычкой", async ({ page }) => {
  await reset(page);
  await capture(page, "Счёт за воду пришёл");
  await applyAll(page);

  const habits = await live(page, "habits");
  expect(habits.filter((title) => /воду|вода/i.test(title))).toEqual([]);
});

// T5: наблюдение о себе не заводит привычку. «После тренировки закрываю больше задач» говорит
// о связи между тренировкой и продуктивностью, а не о намерении тренироваться.
test("наблюдение про тренировку не заводит привычку", async ({ page }) => {
  await reset(page);
  await capture(page, "После тренировки закрываю больше задач");
  await applyAll(page);

  const habits = await live(page, "habits");
  expect(habits.filter((title) => /закрываю больше/i.test(title))).toEqual([]);
});

// T6: слова, по форме неотличимые от инфинитива, делом не становятся — «опять», «двадцать»,
// «часть» оканчиваются на «-ть» так же, как «оценить».
test("«опять» и числительные не читаются как инфинитив", async ({ page }) => {
  await reset(page);
  await capture(page, "Опять ничего не успел за вечер");
  await applyAll(page);

  const tasks = await live(page, "tasks");
  expect(tasks.filter((title) => /Опять ничего/i.test(title))).toEqual([]);
});

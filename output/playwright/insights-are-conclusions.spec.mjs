// ИНСАЙТ — ЭТО ВЫВОД, А НЕ ЧИСЛО.
//
// Боль владельца дословно: «Блок называется Инсайты, но инсайтов нет. Инсайт — это не связь,
// инсайт — это вывод». Он назвал и примеры: «уже три дня подряд ты говоришь о долговременной
// памяти», «все сегодняшние мысли относятся к одной теме».
//
// Разница принципиальная: «11 связей» — число из базы данных, «третий день подряд» — наблюдение
// о его мышлении. Спека проверяет, что появилось именно второе, и что оно объясняет себя.
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
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

test("тема, к которой владелец возвращается три дня, становится выводом о времени", async ({ page }) => {
  await reset(page, "insight-theme");

  const insights = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    // Три РАЗНЫХ дня про одно. Разные словоформы: «память», «памяти» — это одна тема, а не три.
    await kb.seedOwnerNoteForTest("Думаю про долговременную память агента, как её хранить", -2);
    await kb.seedOwnerNoteForTest("Опять вернулся к памяти: нужна ли ей своя коллекция", -1);
    await kb.seedOwnerNoteForTest("Память всё ещё не даёт покоя, надо решить с вытеснением", 0);
    return kb.computeInsightsForTest().filter((item) => item.type === "theme");
  });

  const overDays = insights.find((item) => /возвращаешься/i.test(item.title));
  expect(overDays, "три дня подряд об одном — это вывод, и он обязан появиться").toBeTruthy();
  expect(overDays.title).toContain("3-й день");
  // Вывод обязан объяснять СЕБЯ: без этого он неотличим от догадки, а догадке верить не нужно.
  expect(overDays.detail).toContain("3 разных дней");
  // И опираться на записи владельца, а не висеть в воздухе.
  expect(overDays.refs.length, "вывод без ссылок на записи — просто фраза").toBeGreaterThan(0);
});

test("одна тема за день — это вывод про фокус, а не счётчик записей", async ({ page }) => {
  await reset(page, "insight-today");

  const insight = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.seedOwnerNoteForTest("Сегодня опять про вытеснение памяти и провенанс", 0);
    await kb.seedOwnerNoteForTest("Вытеснение должно помечать, а не удалять", 0);
    await kb.seedOwnerNoteForTest("Ещё раз про вытеснение: откат обязан быть в один клик", 0);
    return kb.computeInsightsForTest().find((item) => item.id === "today-one-theme") || null;
  });

  expect(insight, "однотемный день обязан быть замечен").toBeTruthy();
  expect(insight.title).toContain("Сегодня ты думаешь об одном");
  // Число здесь не главное, но оно объясняет вывод: сколько из скольких.
  expect(insight.detail).toMatch(/\d+ из \d+/);
});

test("разные темы выводом об одном не объявляются", async ({ page }) => {
  await reset(page, "insight-no-false");

  const insight = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.seedOwnerNoteForTest("Записать смену за вторник и посчитать ставку", 0);
    await kb.seedOwnerNoteForTest("Купить протеин и записаться к стоматологу", 0);
    await kb.seedOwnerNoteForTest("Позвонить Володе насчёт машины в субботу", 0);
    return kb.computeInsightsForTest().find((item) => item.id === "today-one-theme") || null;
  });

  // Ложный вывод хуже отсутствующего: он учит владельца не верить выводам вообще.
  expect(insight).toBeNull();
});

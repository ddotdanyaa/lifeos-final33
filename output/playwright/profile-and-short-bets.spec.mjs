// О5 · ПРОФИЛЬ ВЛАДЕЛЬЦА (П19) и О6 · КОРОТКИЙ ГОРИЗОНТ (П21).
//
// Журнал решений копил факты, но разбор о них не знал — и повторял ту же ошибку в сотый раз.
// Профиль читает журнал и говорит разбору, чего владелец не берёт. Строго в одну сторону: он не
// отбрасывает предложение (решать не ему), а понижает уверенность и объясняет словами.
//
// Короткий горизонт нужен, чтобы выборка росла быстрее: ставка «эту задачу он закроет сегодня»
// проверяется к вечеру, а не через неделю. Главное правило — молчание НЕ считается ошибкой:
// ставка без ответа помечается непроверяемой и в вес не входит.
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
  await page.evaluate(() => window.__lifeosKnowledgeBase.forgetDecisionsForTest());
}

test("профиль молчит, пока наблюдений мало", async ({ page }) => {
  await reset(page, "profile-thin");

  const profile = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.seedDecisionsForTest([
      { type: "habit", decision: "dismissed" },
      { type: "habit", decision: "dismissed" },
      { type: "habit", decision: "dismissed" }
    ]);
    return kb.buildOwnerProfileForTest();
  });

  // На трёх наблюдениях профиль был бы не знанием о владельце, а суеверием о нём.
  expect(profile.known).toBe(false);
  expect(profile.rejects.length).toBe(0);
});

test("что владелец не берёт — предлагается осторожно и с причиной", async ({ page }) => {
  await reset(page, "profile-injects");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    // Десять отказов подряд по одному типу: это уже не шум.
    await kb.seedDecisionsForTest(Array.from({ length: 10 }, () => ({ type: "habit", decision: "dismissed" })));
    const profile = kb.buildOwnerProfileForTest();
    // Новое предложение того же типа проходит через ту же точку, что и все остальные.
    await kb.captureTextForTest("Каждый день пить воду 2 литра");
    const habit = Object.values(kb.getStateSnapshot().proposals)
      .filter((item) => item.status === "open" && item.type === "habit")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return { profile, habit: habit ? { confidence: habit.confidence, reason: habit.reason } : null };
  });

  expect(result.profile.known).toBe(true);
  expect(result.profile.rejects.map((row) => row.type)).toContain("habit");
  expect(result.profile.summary).toContain("почти не берёшь");

  expect(result.habit, "предложение должно появиться — профиль его НЕ отбрасывает").toBeTruthy();
  // Уверенность падает до наблюдаемой частоты, а не до нуля и не остаётся назначенной.
  expect(result.habit.confidence).toBeLessThanOrEqual(0.25);
  // И причина названа словами: владелец видит, почему система осторожничает.
  expect(result.habit.reason).toContain("Ты берёшь такое редко");
});

test("короткая ставка: закрыл задачу — попадание, не закрыл — промах", async ({ page }) => {
  await reset(page, "bets-resolve");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const doneTask = await kb.addTaskForTest("Ответить Дмитрию");
    const openTask = await kb.addTaskForTest("Съездить в сервис");
    const betHit = await kb.openShortBetForTest("task-today", doneTask, "закроет сегодня");
    const betMiss = await kb.openShortBetForTest("task-today", openTask, "закроет сегодня");
    await kb.completeTaskForTest(doneTask);
    await kb.dueShortBetForTest(betHit);
    await kb.dueShortBetForTest(betMiss);
    const report = await kb.resolveShortBetsForTest();
    return { report, accuracy: kb.shortBetAccuracyForTest() };
  });

  expect(result.report.hit).toBe(1);
  expect(result.report.miss).toBe(1);
  expect(result.accuracy.scored).toBe(2);
  expect(result.accuracy.accuracy).toBeCloseTo(0.5, 2);
});

test("молчание не считается ошибкой: ставка без ответа выходит из веса", async ({ page }) => {
  await reset(page, "bets-unverifiable");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const task = await kb.addTaskForTest("Задача, которую я потом удалю");
    const bet = await kb.openShortBetForTest("task-today", task, "закроет сегодня");
    // Объекта не стало — проверить нечего.
    await kb.archiveTaskForTest(task);
    await kb.dueShortBetForTest(bet);
    const report = await kb.resolveShortBetsForTest();
    return { report, accuracy: kb.shortBetAccuracyForTest() };
  });

  expect(result.report.unverifiable).toBe(1);
  expect(result.report.miss, "исчезнувший объект — это не промах системы").toBe(0);
  // И главное: непроверяемая ставка не входит в знаменатель. Считать молчание отказом значит
  // учить систему на том, чего не было.
  expect(result.accuracy.scored).toBe(0);
  expect(result.accuracy.unverifiable).toBe(1);
});

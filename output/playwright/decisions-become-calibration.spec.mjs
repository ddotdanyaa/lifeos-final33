// О1–О3 · ЖУРНАЛ РЕШЕНИЙ, РЕТРО-ЗАПОЛНЕНИЕ И КАЛИБРОВКА (волна 3, скрытый слой).
//
// До этих пакетов решения владельца не сохранялись никуда, кроме строки в аудите: слово
// "dismissed" встречалось в репозитории дважды и не читалось никем. Значит система не могла
// знать, что она предлагает хорошо, а что плохо, — и «улучшаться» ей было не на чем.
//
// Уверенности при этом уже показывались владельцу: 0.7, 0.72, 0.84. Это не знание, а привычка
// автора. Спека проверяет, что число стало ИЗМЕРЕННЫМ — или честно отсутствует.
//
// Проверяется всё без недели ожидания: журнал заполняется напрямую, а вся арифметика —
// чистая логика поверх него.
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

function daysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

test("решение владельца сохраняется с признаками, а не исчезает в строку журнала", async ({ page }) => {
  await reset(page, "decisions-record");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const sourceId = await kb.addImportedSourceForTest({
      name: "смена.m4a", kind: "audio", mime: "audio/mp4", size: 90000, checksum: "decisions-" + Date.now()
    });
    await kb.saveSourceTranscriptForTest(sourceId, "Так, сегодня поработал с 8 до 11, 3 часа получается.\nПотом ещё 1700, получается 4700 всего.");
    const state = kb.getStateSnapshot();
    const shift = Object.values(state.proposals).find((item) => item.status === "open" && item.type === "shift");
    const income = Object.values(state.proposals).find((item) => item.status === "open" && item.type === "finance_income");
    await kb.applyProposalForTest(shift.id);
    await kb.dismissProposalForTest(income.id);
    return Object.values(kb.getStateSnapshot().decisions || {}).map((row) => ({
      type: row.type, decision: row.decision, origin: row.origin, dayPart: row.dayPart,
      confidence: row.confidence, weight: row.weight, retro: row.retro, hasProposal: Boolean(row.proposalId)
    }));
  });

  expect(result.length, "оба решения обязаны попасть в журнал").toBe(2);
  const applied = result.find((row) => row.decision === "applied");
  const dismissed = result.find((row) => row.decision === "dismissed");
  expect(applied.type).toBe("shift");
  expect(dismissed.type).toBe("finance_income");
  // Признаки, по которым потом считается калибровка, а не голый факт «было решение».
  for (const row of result) {
    expect(row.hasProposal, "решение без предложения не сохраняется (провенанс, И-6)").toBe(true);
    expect(row.origin.length).toBeGreaterThan(0);
    expect(["ночь", "утро", "день", "вечер"]).toContain(row.dayPart);
    expect(row.retro, "живое решение не помечается ретро").toBe(false);
    expect(row.weight).toBe(1);
  }
  // Служебные шаги разбора решением владельца не являются и в журнал не попадают.
  expect(result.some((row) => row.type === "knowledge" || row.type === "control")).toBe(false);
});

test("мало решений — числа нет: честный статус вместо убедительного процента", async ({ page }) => {
  await reset(page, "decisions-thin");

  const calibration = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.seedDecisionsForTest([
      { type: "task", decision: "applied" },
      { type: "task", decision: "applied" },
      { type: "task", decision: "dismissed" }
    ]);
    return kb.computeCalibrationForTest();
  });

  const task = calibration.byType.task;
  expect(task.decisions).toBe(3);
  expect(task.trusted, "три решения — это шум, а не знание о владельце").toBe(false);
  expect(task.status).toContain("мало данных");
});

test("данных хватило — уверенность становится измеренной, а не назначенной", async ({ page }) => {
  await reset(page, "decisions-trusted");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const rows = [];
    // Восемь решений по типу: семь приняты, одно отклонено.
    for (let index = 0; index < 7; index += 1) rows.push({ type: "finance_expense", decision: "applied" });
    rows.push({ type: "finance_expense", decision: "dismissed" });
    await kb.seedDecisionsForTest(rows);
    const calibration = kb.computeCalibrationForTest();
    const declared = kb.calibratedConfidence
      ? null
      : null;
    return { calibration, declared };
  });

  const row = result.calibration.byType.finance_expense;
  expect(row.decisions).toBe(8);
  expect(row.trusted).toBe(true);
  // Ровно семь восьмых. Сравниваем с долей, а не с округлённым процентом: 0.875 стоит на
  // границе округления, и проверка «равно 88» ловила бы не смысл, а сторону границы.
  expect(row.acceptance, "семь из восьми — это 7/8, а не назначенные 0.86").toBeCloseTo(7 / 8, 2);
  expect(row.status).toContain("по твоим решениям");
});

test("старое решение весит меньше нового, но не исчезает", async ({ page }) => {
  await reset(page, "decisions-decay");

  const calibration = await page.evaluate(async ([oldStamp, freshStamp]) => {
    const kb = window.__lifeosKnowledgeBase;
    const rows = [];
    // Год назад владелец эти предложения принимал…
    for (let index = 0; index < 8; index += 1) rows.push({ type: "habit", decision: "applied", createdAt: oldStamp });
    // …а последние восемь — отклонял.
    for (let index = 0; index < 8; index += 1) rows.push({ type: "habit", decision: "dismissed", createdAt: freshStamp });
    await kb.seedDecisionsForTest(rows);
    return kb.computeCalibrationForTest();
  }, [daysAgo(365), daysAgo(1)]);

  const row = calibration.byType.habit;
  expect(row.decisions, "старые решения остаются в журнале, а не удаляются").toBe(16);
  // Полупериод 60 дней: годовалые решения почти ничего не весят, и доля принятых близка к нулю.
  expect(row.acceptance, "свежие отказы обязаны перевесить прошлогодние согласия").toBeLessThan(0.2);
});

test("владелец изменился — история обнуляется, а не выдаётся за правду", async ({ page }) => {
  await reset(page, "decisions-drift");

  const calibration = await page.evaluate(async ([oldStamp, freshStamp]) => {
    const kb = window.__lifeosKnowledgeBase;
    const rows = [];
    for (let index = 0; index < 30; index += 1) rows.push({ type: "task", decision: "applied", createdAt: oldStamp });
    for (let index = 0; index < 20; index += 1) rows.push({ type: "task", decision: "dismissed", createdAt: freshStamp });
    await kb.seedDecisionsForTest(rows);
    return kb.computeCalibrationForTest();
  }, [daysAgo(30), daysAgo(1)]);

  expect(calibration.drifted, "падение точности на последних двадцати обязано быть замечено").toBe(true);
  expect(calibration.byType.task.trusted, "при дрейфе старым числам верить нельзя").toBe(false);
  expect(calibration.byType.task.status).toContain("учусь заново");
});

test("журнал решений умеет забываться (И-5)", async ({ page }) => {
  await reset(page, "decisions-forget");

  const after = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.seedDecisionsForTest([{ type: "task", decision: "applied" }, { type: "task", decision: "dismissed" }]);
    const before = Object.keys(kb.getStateSnapshot().decisions || {}).length;
    const removed = await kb.forgetDecisionsForTest();
    return { before, removed, left: Object.keys(kb.getStateSnapshot().decisions || {}).length };
  });

  expect(after.before).toBe(2);
  expect(after.removed).toBe(2);
  // Удаление — именно удаление, а не флаг: журнал решений это наблюдения о владельце.
  expect(after.left).toBe(0);
});

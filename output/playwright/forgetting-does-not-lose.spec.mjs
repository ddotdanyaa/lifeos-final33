// П22 · ЗАБЫВАНИЕ. Всё, что петля пишет, растёт бесконечно, а место в браузере конечно: журнал
// провайдеров на тысяче расшифровок весит больше самих записей владельца. Забывание — не
// оптимизация, а условие того, чтобы система прожила годы.
//
// Правило, отличающее забывание от ПОТЕРИ: удаляется только то, что уже никого не информирует —
// журналы работы самой системы. Данные владельца не трогаются никогда. Эта спека проверяет
// именно границу: что уходит и что обязано остаться.
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

test("журнал провайдеров перестаёт расти бесконечно", async ({ page }) => {
  await reset(page, "forget-journal");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.seedJournalForTest("providerRuns", 500);
    const before = Object.keys(kb.getStateSnapshot().providerRuns || {}).length;
    const report = await kb.runForgettingForTest();
    const state = kb.getStateSnapshot();
    // Считаем ТОЛЬКО засеянные строки: приложение продолжает жить и может записать свой прогон
    // между замером и уборкой — тогда тест ловил бы не предел журнала, а гонку.
    const left = Object.values(state.providerRuns || {}).filter((row) => String(row.message || "").startsWith("row "));
    return {
      before,
      removed: report.providerRuns,
      left: left.length,
      // Остаться должны САМЫЕ СВЕЖИЕ: именно по ним владелец что-то понимает.
      newestKept: left.map((row) => row.message).includes("row 0"),
      oldestDropped: !left.map((row) => row.message).includes("row 499")
    };
  });

  expect(result.before).toBe(500);
  expect(result.left, "остаётся последняя неделя работы, а не всё подряд").toBe(200);
  expect(result.removed).toBe(300);
  expect(result.newestKept, "свежий прогон обязан остаться").toBe(true);
  expect(result.oldestDropped, "полугодовой прогон уже никому ничего не говорит").toBe(true);
});

test("уплотнение не трогает данные владельца", async ({ page }) => {
  await reset(page, "forget-safe");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    // Настоящие записи владельца: заметка, задача, цель, расход из его же слов.
    await kb.captureTextForTest("Потратил 800 рублей на такси");
    await kb.captureTextForTest("Надо ответить Дмитрию до среды");
    await kb.addGoalForTest("Накопить на отпуск");
    await kb.seedJournalForTest("providerRuns", 400);
    const before = kb.getStateSnapshot();
    const count = (state) => ({
      notes: Object.values(state.notes || {}).filter((row) => !row.deleted).length,
      tasks: Object.values(state.tasks || {}).filter((row) => !row.deleted).length,
      goals: Object.values(state.goals || {}).filter((row) => !row.deleted).length,
      sources: Object.values(state.sources || {}).filter((row) => !row.deleted).length
    });
    const was = count(before);
    await kb.runForgettingForTest();
    return { was, now: count(kb.getStateSnapshot()) };
  });

  // Ни одной записи владельца. Уборка касается только следов работы системы.
  expect(result.now.notes).toBe(result.was.notes);
  expect(result.now.tasks).toBe(result.was.tasks);
  expect(result.now.goals).toBe(result.was.goals);
  expect(result.now.sources).toBe(result.was.sources);
  expect(result.was.notes, "проверять сохранность пустоты бессмысленно").toBeGreaterThan(0);
});

// Корзину уплотняет НЕ этот пакет: hard-purge после 30 дней уже живёт в normalizeState и
// проверен спекой `trash-undo-grace`. Вторая реализация того же правила означала бы два места,
// где решается, когда данные владельца исчезают навсегда, — и рано или поздно они разошлись бы.
// Здесь проверяется только то, что уборка журналов существующий механизм НЕ ломает.
test("уборка журналов не мешает корзине работать как прежде", async ({ page }) => {
  await reset(page, "forget-trash");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.captureTextForTest("Свежая мысль, которую я удалил");
    const note = Object.values(kb.getStateSnapshot().notes)
      .filter((row) => !row.deleted && (row.title + " " + row.body).includes("Свежая мысль"))[0];
    if (!note) return { missing: true };
    await kb.deleteNoteForTest(note.id);
    await kb.seedJournalForTest("providerRuns", 400);
    await kb.runForgettingForTest();
    const after = kb.getStateSnapshot();
    return { stillThere: Boolean(after.notes[note.id]), deleted: Boolean(after.notes[note.id] && after.notes[note.id].deleted) };
  });

  // Вчера удалённое лежит в корзине целиком: корзина — это отсрочка, и уборка журналов на неё
  // не влияет никак.
  expect(result.stillThere, "уборка журналов не имеет права трогать корзину владельца").toBe(true);
  expect(result.deleted).toBe(true);
});

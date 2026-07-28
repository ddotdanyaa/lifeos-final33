import { expect, test } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

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
test.setTimeout(240000);

const appUrl = "http://127.0.0.1:4173";
const VOICE_M4A = resolve("output", "playwright", "fixtures", "owner-voice-ru.m4a");

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

async function counts(page) {
  return page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const alive = (collection) => Object.values(state[collection] || {}).filter((item) => item && !item.deleted);
    return {
      notes: alive("notes").length,
      claims: alive("claims").map((item) => item.title),
      questions: alive("questions").map((item) => item.title),
      reviewItems: alive("reviewItems").map((item) => item.title),
      highlights: alive("highlights").length,
      insights: alive("insights").map((item) => item.title)
    };
  });
}

async function importAndTranscribe(page, text, name) {
  const before = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {}).filter((item) => item.kind === "audio").length);
  // Всегда буфером с явным именем: так у каждой записи своё имя, и проверка не зависит от того,
  // как именно браузер прочитал файл с диска.
  await page.locator("input#file-import").setInputFiles({
    name: name || "запись-" + (before + 1) + ".m4a",
    mimeType: "audio/mp4",
    buffer: readFileSync(VOICE_M4A)
  });
  await expect.poll(async () => page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {}).filter((item) => item.kind === "audio").length), { timeout: 30000 }).toBeGreaterThan(before);
  const sourceId = await page.evaluate((position) => {
    const audios = Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources).filter((item) => item.kind === "audio");
    return audios[position] ? audios[position].id : "";
  }, before);
  await page.evaluate(([id, value]) => window.__lifeosKnowledgeBase.saveSourceTranscriptForTest(id, value), [sourceId, text]);
  await page.waitForTimeout(1500);
  return sourceId;
}

// Владелец расшифровал одну голосовую и получил ДВЕНАДЦАТЬ объектов, из которых одиннадцать —
// служебные: две заметки на один файл, четыре «вывода» (три из них — строки шапки «Источник:» и
// «Режим: локальный whisper.cpp»), выдуманный вопрос про имя файла, четыре пункта повторения про
// файл, цитата во весь текст и два инсайта про работу самой системы. А ещё система находила,
// что две РАЗНЫЕ записи «об одном» — потому что у их расшифровок совпадала служебная шапка.
test("одна запись даёт один смысл, а не двенадцать служебных объектов", async ({ page }) => {
  await reset(page, "one-meaning");
  const before = await counts(page);

  await importAndTranscribe(page, "Работаю сегодня с 16. Потратил 800 рублей на такси. Надо ответить Дмитрию до среды.");
  const after = await counts(page);

  // Одна запись — одна заметка. Пары «Новая запись 30» и «Новая запись 30 Расшифровка» быть
  // не должно: это она давала ложные связи «об одном» по одинаковой шапке.
  expect(after.notes - before.notes).toBe(1);

  // Служебные строки не становятся знанием ни в каком виде.
  const service = after.claims.concat(after.questions, after.reviewItems, after.insights).join(" | ");
  expect(service).not.toMatch(/Источник:/);
  expect(service).not.toMatch(/Режим:/);
  expect(service).not.toMatch(/Расшифровка/);
  expect(service).not.toMatch(/whisper/i);
  expect(service).not.toMatch(/Что проверить в теме/);
  expect(service).not.toMatch(/Смысловая карта выросла|Аудио стало знанием/);

  // Смысл записи живёт в типизированных предложениях, а не в эхе из «выводов».
  const proposalTypes = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().proposals)
    .filter((item) => item.status === "open").map((item) => item.type));
  expect(proposalTypes).toContain("finance_expense");
  expect(proposalTypes).toContain("task");
  // И той же фразы нет второй раз в знании.
  expect(after.claims.join(" | ").toLowerCase()).not.toContain("такси");

  // Надиктовка не книга: цитат из самой себя она не порождает.
  expect(after.highlights).toBe(before.highlights);
});

// Владелец увидел на Доме: «Похоже, „Новая запись 30 Расшифровка“ и „Новая запись 31
// Расшифровка“ — об одном». Записи были про совершенно разное. Связь держалась на служебной
// шапке, которую система пишет сама («Источник: …», «Режим: локальный whisper.cpp …»), и на
// слове «Расшифровка» в названии — они одинаковы у ВСЕХ расшифровок. Тот же класс ошибки уже
// ловили на «suggested/actions»: связь по служебному слову — не связь.
test("две разные записи не объявляются «об одном» из-за служебной шапки", async ({ page }) => {
  await reset(page, "two-records");

  await importAndTranscribe(page, "Работаю сегодня с 16. Потратил 800 рублей на такси.", "запись-1.m4a");
  await importAndTranscribe(page, "Купил протеин за 2500. Завтра в 14 зал.", "запись-2.m4a");

  const connections = await page.evaluate(() => (window.__lifeosKnowledgeBase.detectConceptConnectionsForTest() || [])
    .map((item) => String(item.title || item.summary || "")));
  const joined = connections.join(" | ");
  expect(joined).not.toMatch(/запись-1/);
  expect(joined).not.toMatch(/запись-2/);
  expect(joined.toLowerCase()).not.toContain("расшифровка");
});

// И обратная проверка того же правила: связь по НАСТОЯЩЕЙ общей теме обязана остаться, иначе
// вместе с шумом мы выключили бы саму способность системы видеть повторяющееся.
test("две записи об одном предмете по-прежнему связываются", async ({ page }) => {
  await reset(page, "two-records-same");

  await importAndTranscribe(page, "Смотрел объявления, машина за 900 тысяч выглядит нормально.", "машина-1.m4a");
  await importAndTranscribe(page, "Съездил посмотреть машину, продавец скинул 40 тысяч.", "машина-2.m4a");

  const connections = await page.evaluate(() => (window.__lifeosKnowledgeBase.detectConceptConnectionsForTest() || [])
    .map((item) => String(item.title || item.summary || "") + " " + JSON.stringify(item.terms || item.sharedTerms || [])));
  expect(connections.join(" | ").toLowerCase(), "общая тема «машина» обязана связать записи").toContain("машин");
});

// Обратная сторона того же правила. Вычищая эхо, легко вычистить и саму мысль — а наблюдение о
// себе это ровно то, ради чего база знаний и существует. Смысл обязан дожить до владельца, но
// РОВНО ОДИН РАЗ: у наблюдения есть свой типизированный объект (insight), и дублировать его
// «выводом» с тем же текстом не нужно — иначе мы вернёмся к тому же эху, только в профиль.
test("мысль без своего объекта не теряется — она становится предложением-инсайтом", async ({ page }) => {
  await reset(page, "one-meaning-observation");

  await importAndTranscribe(page, "После тренировки я закрываю заметно больше задач, чем обычно.");

  const insights = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().proposals)
    .filter((item) => item.status === "open" && item.type === "insight")
    .map((item) => item.title));
  expect(insights.join(" ").toLowerCase(), "наблюдение о себе обязано дойти до владельца").toContain("тренировк");

  // И ровно один раз: тем же текстом во «выводах» оно не повторяется.
  const after = await counts(page);
  expect(after.claims.join(" ").toLowerCase()).not.toContain("тренировк");
});

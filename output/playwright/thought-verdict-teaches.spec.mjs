// СРЕЗ В · ВЕРДИКТ ПО ПОХОЖЕЙ МЫСЛИ УЧИТ СИСТЕМУ (Г-3, Т7).
//
// Похожие записи показывались с 30 июля, но сказать по ним было нечего: подсказка висела и
// ничему не училась. Владелец 2026-07-30: «система должна видеть похожие старые идеи → помечать
// как дубль или как уточнение».
//
// Спека проверяет ровно то, что отличает вердикт от украшения:
//   1) три кнопки стоят ПОД полем, пока мысль ещё пишется, — повтор не должен родиться;
//   2) «дубль» не заводит вторую запись и очищает поле (иначе нажатие выглядит как ничего);
//   3) «уточнение» заводит новую И помечает прежнюю `supersededBy` — одна живая запись, не две;
//   4) «новое» гасит подсказку для ЭТОГО черновика;
//   5) КАЖДЫЙ вердикт пишет решение в журнал одним типом «похожая мысль» — это и есть то, на чём
//      калибровка потом считает точность самой подсказки. Разведи вердикты по трём типам — и ни
//      по одному не наберётся порога в 8 решений (`MIN_DECISIONS_FOR_TRUST`, app.js).
//
// Журнал читается снимком состояния, а не косвенно через экран: решение, которого нет в
// `state.decisions`, системой не наблюдалось, чем бы ни ответил интерфейс.
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
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";

// Тип, которым журнал записывает вердикт. Строка зеркалит `SIMILAR_VERDICT_TYPE` в app.js:
// поверхности и спеки в ядро не ссылаются (audit-module-closure), поэтому она здесь буквой.
const VERDICT_TYPE = "похожая мысль";

// Та же пара, на которой подсказка проверена в `thought-meets-its-past.spec.mjs`: мысль и она же
// другими словами. Придумывать свою пару значит проверять свой порог, а не продуктовый.
const PAST_THOUGHT = "Месячный прогноз финансов: хочу видеть траты на месяц вперёд";
const SAME_THOUGHT_AGAIN = "прогноз финансов на месяц вперёд";

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  // Журнал решений чистится отдельно: сброс хранилища его не касается, а мы считаем ровно те
  // решения, которые родились от вердиктов.
  await page.evaluate(() => window.__lifeosKnowledgeBase.forgetDecisionsForTest());
}

async function captureThought(page, text) {
  await page.getByTestId("capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("capture-input")).toHaveValue("", { timeout: 20000 });
}

// Черновик набран, подсказка поднялась, вердикты на месте. Ждём именно блок, а не таймаут:
// подсказка появляется после отложенного сохранения черновика, и её приход — это событие.
async function draftWithHint(page, text) {
  await page.getByTestId("capture-input").fill(text);
  await expect(page.getByTestId("similar-thoughts")).toBeVisible({ timeout: 20000 });
}

function ownerNotes(page) {
  return page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().notes || {})
    .filter((note) => note && !note.deleted)
    .map((note) => ({ id: note.id, title: note.title || "", supersededBy: note.supersededBy || "" })));
}

function verdictDecisions(page, type) {
  return page.evaluate((verdictType) => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().decisions || {})
    .filter((row) => row && !row.deleted && row.type === verdictType)
    .map((row) => ({
      decision: row.decision,
      edited: Boolean(row.edited),
      origin: row.origin || "",
      noteId: row.noteId || "",
      retro: Boolean(row.retro),
      weight: row.weight
    })), type);
}

// V0: сама подсказка — это ТРИ ВЫХОДА, а не строка «похоже, ты уже писал». Без кнопок владелец
// видит наблюдение, с которым нечего сделать, и система остаётся без обучающего сигнала.
test("под похожей записью стоят три вердикта, а не одно наблюдение", async ({ page }) => {
  await reset(page, "verdict-shown");
  await captureThought(page, PAST_THOUGHT);
  await draftWithHint(page, SAME_THOUGHT_AGAIN);

  const row = page.getByTestId("similar-thought-verdict").first();
  await expect(row).toBeVisible();
  await expect(row.getByTestId("verdict-duplicate")).toBeVisible();
  await expect(row.getByTestId("verdict-supersede")).toBeVisible();
  await expect(row.getByTestId("verdict-distinct")).toBeVisible();
  // Кнопок ровно столько же, сколько находок: вердикт выносится по КОНКРЕТНОЙ записи, а не
  // «по подсказке вообще».
  const found = await page.getByTestId("similar-thought").count();
  expect(await page.getByTestId("verdict-duplicate").count()).toBe(found);
  expect(await page.getByTestId("verdict-supersede").count()).toBe(found);
  expect(await page.getByTestId("verdict-distinct").count()).toBe(found);
});

// V1: «дубль» — смысл в том, чтобы повтор НЕ РОДИЛСЯ. Вторая запись не заводится, поле уходит.
test("«дубль» не заводит вторую запись и очищает поле", async ({ page }) => {
  await reset(page, "verdict-duplicate");
  await captureThought(page, PAST_THOUGHT);
  const before = await ownerNotes(page);
  await draftWithHint(page, SAME_THOUGHT_AGAIN);

  await page.getByTestId("verdict-duplicate").first().click();

  // Поле пустое: иначе владелец нажал «дубль» и видит свой текст на месте — то есть ничего
  // не произошло.
  await expect(page.getByTestId("capture-input")).toHaveValue("", { timeout: 20000 });
  const after = await ownerNotes(page);
  expect(after.length, "повтор не должен родиться — записей столько же").toBe(before.length);
  // И прежняя запись не помечена заменённой: «дубль» ничего не вытесняет, он просто не создаёт.
  expect(after.every((note) => !note.supersededBy)).toBe(true);
  await expect(page.getByTestId("similar-thoughts")).toHaveCount(0);

  const decisions = await verdictDecisions(page, VERDICT_TYPE);
  expect(decisions.length, "вердикт обязан попасть в журнал — иначе учиться не на чем").toBe(1);
  // «Дубль» = подсказка угадала полностью. В семантике журнала это `applied` без правки.
  expect(decisions[0].decision).toBe("applied");
  expect(decisions[0].edited).toBe(false);
  expect(decisions[0].origin).toBe("similar-verdict");
  // Провенанс (И-6): решение помнит, о КАКОЙ записи оно было.
  expect(decisions[0].noteId).toBe(before.find((note) => /прогноз/i.test(note.title)).id);
  expect(decisions[0].retro, "живое решение не помечается ретро").toBe(false);
  expect(decisions[0].weight).toBe(1);
});

// V2: «уточнение» обязано оставить ОДНУ живую запись (Т7). Новая создаётся, прежняя получает
// ссылку на неё — не удаляется и не дублируется.
test("«уточнение» создаёт новую запись и помечает прежнюю заменённой", async ({ page }) => {
  await reset(page, "verdict-supersede");
  await captureThought(page, PAST_THOUGHT);
  const before = await ownerNotes(page);
  const older = before.find((note) => /прогноз/i.test(note.title));
  expect(older, "прежняя запись обязана существовать до вердикта").toBeTruthy();

  await draftWithHint(page, SAME_THOUGHT_AGAIN);
  await page.getByTestId("verdict-supersede").first().click();
  await expect(page.getByTestId("capture-input")).toHaveValue("", { timeout: 20000 });

  const after = await ownerNotes(page);
  expect(after.length, "уточнение — это новая запись, а не правка на месте").toBe(before.length + 1);
  const marked = after.find((note) => note.id === older.id);
  expect(marked.supersededBy, "прежняя запись обязана указывать на уточнение").toBeTruthy();
  const fresh = after.find((note) => !before.some((old) => old.id === note.id));
  expect(marked.supersededBy).toBe(fresh.id);
  // Метка проставляется в момент события, а не миграцией: пустой `supersededAt` означал бы, что
  // экран уже нарисован, а запись ещё считается живой (см. normalizeState gotcha).
  const stamped = await page.evaluate((id) => {
    const note = window.__lifeosKnowledgeBase.getStateSnapshot().notes[id];
    return { at: note.supersededAt || "", deleted: Boolean(note.deleted) };
  }, older.id);
  expect(stamped.at).not.toBe("");
  expect(stamped.deleted, "заменённое не удаляется — оно остаётся историей").toBe(false);

  const decisions = await verdictDecisions(page, VERDICT_TYPE);
  expect(decisions.length).toBe(1);
  // «Уточнение» = угадала наполовину. Ровно это и значит `edited` в журнале.
  expect(decisions[0].decision).toBe("applied");
  expect(decisions[0].edited).toBe(true);
  expect(decisions[0].noteId).toBe(older.id);
});

// V3: «новое» — с данными не делается ничего, но подсказка обязана замолчать. Иначе вердикт
// выглядит непринятым, и владелец жмёт его второй раз.
test("«новое» гасит подсказку для этого черновика и не трогает записи", async ({ page }) => {
  await reset(page, "verdict-distinct");
  await captureThought(page, PAST_THOUGHT);
  const before = await ownerNotes(page);

  await draftWithHint(page, SAME_THOUGHT_AGAIN);
  await page.getByTestId("verdict-distinct").first().click();

  await expect(page.getByTestId("similar-verdict-done")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("similar-thoughts")).toHaveCount(0);
  // Текст остаётся в поле: владелец сказал «это другая мысль», а не «сотри написанное».
  await expect(page.getByTestId("capture-input")).toHaveValue(SAME_THOUGHT_AGAIN);
  const after = await ownerNotes(page);
  expect(after.length).toBe(before.length);
  expect(after.every((note) => !note.supersededBy)).toBe(true);

  const decisions = await verdictDecisions(page, VERDICT_TYPE);
  expect(decisions.length).toBe(1);
  // «Новое» = подсказка ошиблась. `dismissed` — единственное честное для неё значение.
  expect(decisions[0].decision).toBe("dismissed");
  expect(decisions[0].edited).toBe(false);
});

// V4: три вердикта — ОДИН тип в журнале. Это не косметика: калибровка считает долю принятых по
// типу, и раздельные типы означали бы, что порог доверия не наберётся никогда.
test("три разных вердикта копятся одним типом и дают точность самой подсказки", async ({ page }) => {
  await reset(page, "verdict-one-type");
  await captureThought(page, PAST_THOUGHT);

  await draftWithHint(page, SAME_THOUGHT_AGAIN);
  await page.getByTestId("verdict-distinct").first().click();
  await expect(page.getByTestId("similar-verdict-done")).toBeVisible({ timeout: 20000 });

  // Второй вердикт по той же паре: допишем фразу — это уже другой черновик, и подсказка
  // обязана вернуться.
  await draftWithHint(page, SAME_THOUGHT_AGAIN + " и по неделям тоже");
  await page.getByTestId("verdict-duplicate").first().click();
  await expect(page.getByTestId("capture-input")).toHaveValue("", { timeout: 20000 });

  const decisions = await verdictDecisions(page, VERDICT_TYPE);
  expect(decisions.length).toBe(2);
  expect(decisions.filter((row) => row.decision === "applied").length).toBe(1);
  expect(decisions.filter((row) => row.decision === "dismissed").length).toBe(1);

  const calibration = await page.evaluate(() => window.__lifeosKnowledgeBase.computeCalibrationForTest());
  const row = calibration.byType[VERDICT_TYPE];
  expect(row, "вердикты обязаны быть видны калибровке одним типом").toBeTruthy();
  expect(row.decisions).toBe(2);
  // Двух решений мало, и система обязана это сказать, а не показать «50%» как знание.
  expect(row.trusted).toBe(false);
  expect(row.status).toContain("мало данных");
});

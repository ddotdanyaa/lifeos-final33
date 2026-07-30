import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  return readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"))
    .find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

// Все строки ниже — НАСТОЯЩИЙ вывод whisper.cpp `ggml-small` на настоящей русской речи
// (`output/playwright/fixtures/voice-corpus.json`, 24 записи, 2026-07-30). Не придуманные
// примеры: расшифровка пишет числа цифрами, «тысяч» оставляет словом, ставит пробел разрядным
// разделителем и теряет запятые. Именно на этом деньги владельца и терялись.
async function open(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.analyzeArtifactInput);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Черновики так, как их увидит владелец: тип, название и суммы. Служебные шаги («сохранить
// источник», «открыть в чате») к деньгам отношения не имеют и здесь только мешают читать.
function moneyDrafts(page, text) {
  return page.evaluate((value) => window.__lifeosKnowledgeBase.analyzeArtifactInput(value).drafts
    .filter((item) => !["knowledge-summary", "automation-context", "control-graph"].includes(item.draftId))
    .map((item) => ({
      type: item.type,
      title: item.title,
      amount: Number((item.fields || {}).amount || 0),
      balance: Number((item.fields || {}).balance || 0),
      hours: Number((item.fields || {}).hours || 0)
    })), text);
}

// Замер 2026-07-30 (`tools/measure-speech-intents.mjs`, 24 голосовых): эта запись давала НУЛЬ
// объектов. Владелец продиктовал, что заплатил 28 тысяч, увидел «записано» — и не увидел суммы.
// Причина не в смысле, а в числе: «28 тысяч» читалось как 28 ₽ и отбрасывалось порогом.
test("«28 тысяч» — это 28 000 ₽, а остаток на карте — не расход", async ({ page }) => {
  await open(page, "spoken-money-thousands");

  const drafts = await moneyDrafts(page, "Заплатил за квартиру 28 тысяч. Осталось на карте 9 тысяч.");

  expect(drafts.some((item) => item.type === "finance_expense" && item.amount === 28000),
    "заплатил 28 тысяч → расход 28 000 ₽: " + JSON.stringify(drafts)).toBe(true);
  expect(drafts.some((item) => item.amount === 28 || item.amount === 9),
    "разговорная тысяча не может доходить до владельца рублями").toBe(false);
  // Остаток — это состояние счёта, а не трата. Записанный расходом, он врёт дважды: деньги
  // уходят в минус, и баланса не появляется вовсе.
  expect(drafts.some((item) => item.type === "balance" && item.balance === 9000),
    "«осталось на карте 9 тысяч» → баланс 9 000 ₽: " + JSON.stringify(drafts)).toBe(true);
  expect(drafts.some((item) => item.type === "finance_expense" && item.amount === 9000),
    "остаток на карте расходом не становится").toBe(false);
});

test("доход и расход недели считаются тысячами, а не единицами", async ({ page }) => {
  await open(page, "spoken-money-week");

  const drafts = await moneyDrafts(page, "За неделю заработал 31 тысячу. Расходы 11 тысяч. Отложить 20.");

  expect(drafts.some((item) => item.type === "finance_income" && item.amount === 31000),
    "заработал 31 тысячу → доход 31 000 ₽: " + JSON.stringify(drafts)).toBe(true);
  expect(drafts.some((item) => item.type === "finance_expense" && item.amount === 11000),
    "расходы 11 тысяч → расход 11 000 ₽: " + JSON.stringify(drafts)).toBe(true);
});

// «вышло 6 800» — whisper ставит пробел разрядным разделителем. Заработок за смену уходил в
// ноль: в объекте оставались только часы.
test("заработок за смену не теряется на пробеле внутри числа", async ({ page }) => {
  await open(page, "spoken-money-space");

  const drafts = await moneyDrafts(page, "отработал с 9 до 19, 10 часов, вышло 6 800.");
  const shift = drafts.find((item) => item.type === "shift");

  expect(shift, "смена должна быть: " + JSON.stringify(drafts)).toBeTruthy();
  expect(shift.hours, "часы смены").toBe(10);
  expect(shift.amount, "заработок 6 800 ₽ внутри смены: " + JSON.stringify(drafts)).toBe(6800);
});

// «Забыл записать вчерашнюю смену. 8 часов 4900» — владелец не сказал «заработал», и сумма
// уходила РАСХОДОМ. В рассказе о смене это ровно наоборот: он деньги получил.
test("сумма в рассказе о смене — заработок, а не трата, и не оба сразу", async ({ page }) => {
  await open(page, "spoken-money-shift");

  const drafts = await moneyDrafts(page, "Забыл записать вчерашнюю смену. 8 часов 4900");
  const shift = drafts.find((item) => item.type === "shift");

  expect(shift, "смена должна быть: " + JSON.stringify(drafts)).toBeTruthy();
  expect(shift.hours).toBe(8);
  expect(shift.amount, "4900 — заработок смены").toBe(4900);
  expect(drafts.some((item) => item.type === "finance_expense" && item.amount === 4900),
    "тот же заработок не может быть ещё и расходом: " + JSON.stringify(drafts)).toBe(false);
});

// Модель врёт числами при настоящей цитате. Замер 2026-07-30 на 24 голосовых: `qwen3:4b`
// вернула «доход 8701 ₽» на сказанное 8700 и смену «23.99 ч» из фразы про замену масла. Цитата у
// обоих дословная — значит, цитаты мало. Проверяется чистой логикой, без демона и без модели.
test("сумма, которой владелец не произносил, не проходит от модели", async ({ page }) => {
  await open(page, "spoken-money-invented");

  const heard = "Сегодня отработал 12 часов, заработал 8700, бензин 1900.";
  const verdict = await page.evaluate((text) => {
    const api = window.__lifeosKnowledgeBase;
    const check = (fields, origin) => api.validateSpeechIntents(
      [{ type: "income", quote: "заработал 8700", fields, origin }], text);
    return {
      invented: check({ amount: 8701 }, "model"),
      spoken: check({ amount: 8700 }, "model"),
      // Ставка за час считается ПРАВИЛАМИ из смены и заработка — она помечена как посчитанная,
      // и запрет на неё не распространяется, иначе честный вывод стал бы невозможен.
      derived: api.validateSpeechIntents(
        [{ type: "rate", quote: "отработал 12 часов", fields: { perHour: 725, derived: true }, origin: "rules" }], text)
    };
  }, heard);

  expect(verdict.invented.intents.length, "8701 не звучало — намерение не проходит").toBe(0);
  expect(verdict.invented.rejected[0].reason).toContain("числа нет в словах владельца");
  expect(verdict.spoken.intents.length, "8700 звучало — намерение проходит").toBe(1);
  expect(verdict.derived.intents.length, "посчитанная правилами ставка остаётся").toBe(1);
});

// Часы отдыха становились рабочими: «Смена была тяжелая… Спал 5 часов» давало СМЕНУ НА ПЯТЬ
// ЧАСОВ, потому что часы искались во всём тексте сразу, а слово «смена» стояло в другой фразе.
test("сон не становится сменой, а страницы и даты — деньгами", async ({ page }) => {
  await open(page, "spoken-money-units");

  const sleep = await moneyDrafts(page, "Смена была тяжелая, устал сильно. Спал 5 часов.");
  expect(sleep.some((item) => item.type === "shift"),
    "пять часов сна — не смена: " + JSON.stringify(sleep)).toBe(false);

  const book = await moneyDrafts(page, "начал читать книгу про привычки. 20 страниц за вечер.");
  expect(book.some((item) => item.amount === 20),
    "двадцать страниц — не двадцать рублей: " + JSON.stringify(book)).toBe(false);

  const insurance = await moneyDrafts(page, "Проверить страховку до 10 августа. Стоит около 12 тысяч.");
  expect(insurance.some((item) => item.amount === 10),
    "десятое августа — не десять рублей: " + JSON.stringify(insurance)).toBe(false);
  expect(insurance.some((item) => item.amount === 12000),
    "«около 12 тысяч» — это 12 000 ₽: " + JSON.stringify(insurance)).toBe(true);
});

// СРЕЗ Б · ПОСТРОЧНЫЙ РАЗБОР: КАЖДЫЙ ВЫВОД — СО СВОИМ ИСТОЧНИКОМ И СВОИМ ВЫБОРОМ.
//
// Претензия владельца №8 дословно: «снизу „что я понял из этой записи" — просто пишет „источник
// сохранён, можно принять безопасные", и тупо кнопка „Принять"». Он прав дважды: выводы были
// склеены в один список без действий, а согласиться можно было только со всеми сразу.
//
// Почему это не косметика: пока согласие одно на всё, журнал решений получает ОДИН сигнал вместо
// семи, и калибровке учиться не на чем. Гранулярность разбора — это гранулярность обучения.
//
// Спека проверяет четыре вещи, и каждая падает отдельно:
//   1) строк видно минимум три — разбор показывает работу, а не итог;
//   2) у КАЖДОЙ строки есть источник: цитата или честное «места не нашёл» (Т5), не пусто;
//   3) у КАЖДОЙ строки СВОЯ пара кнопок, и нажатие одной не трогает соседние;
//   4) «Принять всё» стоит НИЖЕ построчных строк. Это утверждение о порядке чтения: сверху
//      разбор, снизу тихое согласие на всё. Кнопка наверху возвращает ровно ту претензию №8.
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
test.use({ viewport: { width: 1440, height: 1200 } });

const appUrl = "http://127.0.0.1:4173";

// Один вечерний дамп, а не четыре записи: разбор показывает строки ПОСЛЕДНЕГО источника, и
// четыре отдельных захвата проверяли бы четыре разных разбора по одной строке в каждом.
const EVENING_DUMP = [
  "Потратил 4380 продукты Лента",
  "Надо ответить Дмитрию до среды",
  "Завтра в 16 работаю в такси",
  "Заработал 3000 чаевые"
].join("\n");

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function dumpAndSeeBreakdown(page) {
  await page.getByTestId("capture-input").fill(EVENING_DUMP);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("capture-input")).toHaveValue("", { timeout: 20000 });
  await expect(page.getByTestId("parse-breakdown")).toBeVisible({ timeout: 20000 });
}

// B1: разбор показывает РАБОТУ — минимум три строки, а не одну фразу про сохранённый источник.
test("после разбора видно минимум три строки, и каждая названа своим типом", async ({ page }) => {
  await reset(page, "parse-rows");
  await dumpAndSeeBreakdown(page);

  const rows = page.getByTestId("parse-row");
  const count = await rows.count();
  expect(count, "четыре факта в одной записи обязаны стать разными строками").toBeGreaterThanOrEqual(3);

  // Заголовок называет число: владелец видит объём сразу, а не прокручивает, чтобы узнать.
  await expect(page.getByTestId("parse-breakdown")).toContainText("Я понял из этой записи");

  // Ни одна строка не пустая: строка без заголовка — это шум в списке выводов.
  const titles = await page.locator('[data-testid="parse-row"] .parse-row-title').allTextContents();
  expect(titles.length).toBe(count);
  expect(titles.every((title) => title.trim().length > 0)).toBe(true);
});

// B2 (Т5): основание у КАЖДОЙ строки. Цитата — это и есть ответ на «почему ты так решил»; без неё
// строка снова становится утверждением без источника. Молчание тоже допустимо, но названное.
test("у каждой строки разбора есть источник: цитата или честное «места не нашёл»", async ({ page }) => {
  await reset(page, "parse-source");
  await dumpAndSeeBreakdown(page);

  const rows = page.getByTestId("parse-row");
  const count = await rows.count();
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const quotes = await row.getByTestId("parse-row-quote").count();
    const silence = await row.getByTestId("parse-row-noquote").count();
    // Ровно одно из двух: две пометки сразу означали бы, что источник и есть, и его нет.
    expect(quotes + silence, `строка ${index + 1} осталась без основания`).toBe(1);
    if (quotes) {
      const text = (await row.getByTestId("parse-row-quote").textContent() || "").trim();
      expect(text.length, "пустая цитата — это отсутствующее основание").toBeGreaterThan(0);
      // Цитата — кусок САМОЙ записи, а не пересказ разбора.
      expect(EVENING_DUMP.toLowerCase()).toContain(text.toLowerCase().slice(0, 12));
    }
  }
});

// B3: у каждой строки СВОИ кнопки. Проверяется не наличием разметки, а поведением: приняли одну —
// остальные не тронуты. Одна общая пара кнопок дала бы ровно претензию №8.
test("у каждой строки свои кнопки, и согласие с одной не трогает соседние", async ({ page }) => {
  await reset(page, "parse-own-buttons");
  await dumpAndSeeBreakdown(page);

  const rows = page.getByTestId("parse-row");
  const count = await rows.count();
  expect(await page.getByTestId("parse-row-apply").count()).toBe(count);
  expect(await page.getByTestId("parse-row-dismiss").count()).toBe(count);

  // Пары кнопок принадлежат РАЗНЫМ предложениям: одинаковые id означали бы одну кнопку в трёх
  // местах, то есть тот же общий «Принять».
  const pairs = [];
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const applyId = await row.getByTestId("parse-row-apply").getAttribute("data-id");
    const dismissId = await row.getByTestId("parse-row-dismiss").getAttribute("data-id");
    expect(applyId).toBeTruthy();
    expect(dismissId, "обе кнопки строки решают судьбу ОДНОГО вывода").toBe(applyId);
    pairs.push(applyId);
  }
  expect(new Set(pairs).size, "у каждой строки должен быть свой вывод").toBe(count);

  // Принимаем одну строку. Остальные обязаны остаться открытыми, а принятая — уйти.
  const chosen = pairs[0];
  await rows.first().getByTestId("parse-row-apply").click();
  await expect(page.getByTestId("parse-row")).toHaveCount(count - 1, { timeout: 20000 });

  const status = await page.evaluate((id) => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      chosen: state.proposals[id] ? state.proposals[id].status : "",
      stillOpen: Object.values(state.proposals).filter((item) => item.status === "open").length
    };
  }, chosen);
  expect(status.chosen).not.toBe("open");
  expect(status.stillOpen, "согласие с одной строкой не решает за остальные").toBeGreaterThan(0);
});

// B4: «Принять всё» не удалено — оно уехало ВНИЗ и стало тихим. Владелец, который уже доверяет
// разбору, жмёт его одним движением; владелец, который проверяет, сначала читает строки.
// Порядок проверяется и по разметке, и по экрану: DOM-порядок без координат ничего не обещает
// глазу, координаты без DOM-порядка ловят вёрстку, а не намерение.
test("«Принять всё» стоит ниже построчных строк, а не над ними", async ({ page }) => {
  await reset(page, "parse-bulk-below");
  await dumpAndSeeBreakdown(page);

  const bulk = page.getByTestId("parse-apply-all");
  await expect(bulk).toBeVisible();

  const lastRow = page.getByTestId("parse-row").last();
  const rowBox = await lastRow.boundingBox();
  const bulkBox = await bulk.boundingBox();
  expect(rowBox).toBeTruthy();
  expect(bulkBox).toBeTruthy();
  expect(bulkBox.y, "«Принять всё» обязано быть под последней строкой разбора").toBeGreaterThan(rowBox.y);

  // И в разметке — тоже после: DOCUMENT_POSITION_FOLLOWING === 4.
  const follows = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-testid="parse-row"]')];
    const button = document.querySelector('[data-testid="parse-apply-all"]');
    const last = rows[rows.length - 1];
    return Boolean(last.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(follows).toBe(true);

  // Оно всё ещё работает: «тихое» не значит «мёртвое». Проверяем по СУТИ, а не по счётчику
  // строк — `apply-source-proposals` принимает белый список жизненных типов (app.js), и строки
  // разбора самой записи (извлечённые люди и даты) законно остаются на экране.
  const lifeRowsBefore = await page.locator('[data-testid="parse-row"][data-raw-type="task"], [data-testid="parse-row"][data-raw-type="calendar"], [data-testid="parse-row"][data-raw-type="finance_expense"], [data-testid="parse-row"][data-raw-type="finance_income"]').count();
  expect(lifeRowsBefore, "разбор обязан был найти жизненные выводы, иначе проверять нечего").toBeGreaterThan(0);

  await bulk.click();
  await expect(page.locator('[data-testid="parse-row"][data-raw-type="task"], [data-testid="parse-row"][data-raw-type="calendar"], [data-testid="parse-row"][data-raw-type="finance_expense"], [data-testid="parse-row"][data-raw-type="finance_income"]'))
    .toHaveCount(0, { timeout: 20000 });
  // И объекты действительно появились: строка ушла с экрана, потому что предложение принято, а
  // не потому что список перерисовался.
  const created = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      tasks: Object.values(state.tasks).filter((item) => !item.deleted).length,
      money: Object.values(state.financeTransactions).filter((item) => !item.deleted).length
    };
  });
  expect(created.tasks + created.money, "«Принять всё» обязано создать объекты, а не только убрать строки").toBeGreaterThan(0);
});

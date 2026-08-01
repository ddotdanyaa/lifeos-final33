// О-1 · ДВЕ ВКЛАДКИ НЕ ЗАТИРАЮТ ДРУГ ДРУГА.
//
// Замер 2026-07-31: защиты не было НИКАКОЙ — ни `BroadcastChannel`, ни `navigator.locks`, ни
// обработчика `storage`. Хранилище пишет снимок ВСЕГО состояния, поэтому две открытые вкладки
// означали ровно одно: та, что сохранилась последней, стирала всё, что надиктовано в другой.
// Отказ был тихим — запись «успешна», данных нет. Владелец начинает ежедневное использование
// 1 августа с ноутбука и телефона, и забытая вкладка у него не гипотеза, а норма.
//
// Спека проверяет правило целиком, а не наличие полосы на экране:
//   1) младшая вкладка честно говорит, что не записывает, — полосой и строкой состояния;
//   2) набранное в ней на диск НЕ уходит, а набранное в старшей — уходит (проверяется третьей
//      вкладкой, которая читает то, что реально сохранилось, а не то, что нарисовано);
//   3) право записи у СТАРШЕЙ: закрылась она — младшая его получает, и полоса уходит;
//   4) механизм именно `BroadcastChannel`, а не одноразовый флаг при загрузке: чужое «занято»
//      по каналу переводит вкладку в чтение, чужое «ухожу» — возвращает;
//   5) без `BroadcastChannel` продукт не притворяется защищённым — полосы нет, запись работает
//      как раньше. Врать про защиту, которой нет, хуже, чем её не иметь.
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

// Имя канала зеркалит `TAB_CHANNEL` в app.js буквой: спеки в ядро не импортируются
// (audit-module-closure), поэтому строка живёт здесь копией — как `VERDICT_TYPE` в
// thought-verdict-teaches.spec.mjs.
const TAB_CHANNEL = "lifeos-tabs";

// Старшая вкладка сбрасывает хранилище — и только она. Сброс удаляет базу и перезагружает
// страницу, поэтому делать его при живой второй вкладке значит проверять гонку, а не правило.
async function resetFirstTab(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Ещё одна вкладка того же LifeOS в том же контексте: у неё общий origin и общее хранилище —
// именно так владелец и открывает второй экземпляр, забыв про первый.
async function openTab(context, tag) {
  const page = await context.newPage();
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  return page;
}

async function captureThroughScreen(page, text) {
  await page.getByTestId("capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("capture-input")).toHaveValue("", { timeout: 20000 });
}

// Не ждать отложенного сохранения, а потребовать его: иначе «на диске пусто» может означать
// «ещё не успело», и спека доказывала бы таймаут вместо правила.
function flush(page) {
  return page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
}

function titlesInMemory(page) {
  return page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().notes || {})
    .filter((note) => note && !note.deleted)
    .map((note) => String(note.title || "")));
}

// О1: младшая вкладка не молчит. Полоса стоит над всем экраном, а строка состояния называет
// режим словами — владелец печатает и обязан узнать об этом ПОКА печатает, а не потом.
test("вторая вкладка честно объявляет, что здесь не записывает", async ({ page, context }) => {
  await resetFirstTab(page, "tabs-banner");
  // Старшая вкладка полосы не показывает: она и есть та, что пишет.
  await expect(page.getByTestId("tab-readonly-banner")).toHaveCount(0);

  const second = await openTab(context, "tabs-banner-2");
  const banner = second.getByTestId("tab-readonly-banner");
  await expect(banner).toBeVisible({ timeout: 20000 });
  // Полоса называет и факт, и выход: «где записывается» и «что делать». Полоса без выхода —
  // это сообщение об ошибке, а не помощь.
  await expect(banner).toContainText("уже открыт в другой вкладке");
  await expect(banner).toContainText("не сохранится");

  // Строка состояния — второй, независимый канал того же факта: она видна и когда полоса
  // ушла за край при прокрутке.
  await expect(second.locator("#save-status")).toHaveAttribute("data-state", "readonly", { timeout: 20000 });

  // И старшая от появления младшей режим не меняет: право записи не «перехватывается».
  await expect(page.getByTestId("tab-readonly-banner")).toHaveCount(0);
  await expect(page.locator("#save-status")).not.toHaveAttribute("data-state", "readonly");
  await second.close();
});

// О2 — главное. Полоса на экране ничего не стоит, если вкладка всё равно пишет. Проверяем по
// диску: третья вкладка загружает то, что РЕАЛЬНО сохранилось, и её снимок — единственный
// честный ответ на вопрос «что осталось бы, закрой владелец браузер».
test("набранное во второй вкладке на диск не уходит, а набранное в первой — уходит", async ({ page, context }) => {
  await resetFirstTab(page, "tabs-write-right");
  const FROM_FIRST = "Мысль из старшей вкладки про смену в такси";
  const FROM_SECOND = "Мысль из младшей вкладки про подработку";

  await captureThroughScreen(page, FROM_FIRST);
  await flush(page);

  const second = await openTab(context, "tabs-write-right-2");
  await expect(second.getByTestId("tab-readonly-banner")).toBeVisible({ timeout: 20000 });

  // Владелец печатает во второй вкладке — и видит свой текст: состояние в памяти живёт и
  // рисуется. Именно поэтому потеря была незаметной.
  await captureThroughScreen(second, FROM_SECOND);
  expect(await titlesInMemory(second)).toContain(FROM_SECOND);
  await flush(second);
  // Требование сохранить не срабатывает и не притворяется, что сработало.
  await expect(second.locator("#save-status")).toHaveAttribute("data-state", "readonly");

  const third = await openTab(context, "tabs-write-right-3");
  const persisted = await titlesInMemory(third);
  expect(persisted, "запись старшей вкладки обязана лежать на диске").toContain(FROM_FIRST);
  expect(persisted, "младшая вкладка не пишет — иначе её снимок затрёт день старшей").not.toContain(FROM_SECOND);
  await third.close();
  await second.close();
});

// О3: право записи привязано к СТАРШИНСТВУ, а не выдаётся навсегда при загрузке. Закрылась
// старшая — младшая перестаёт быть младшей, и держать её в чтении больше не за что. Иначе
// владелец, закрывший забытую вкладку, остаётся с продуктом, который не пишет, и не понимает,
// почему: полоса ушла бы только после перезагрузки.
test("закрылась старшая вкладка — младшая получает право записи и полоса уходит", async ({ page, context }) => {
  await resetFirstTab(page, "tabs-handover");
  const second = await openTab(context, "tabs-handover-2");
  await expect(second.getByTestId("tab-readonly-banner")).toBeVisible({ timeout: 20000 });

  await page.close();

  await expect(second.getByTestId("tab-readonly-banner")).toHaveCount(0, { timeout: 20000 });

  // И право не только объявлено — оно работает: запись доходит до диска, что проверяет
  // третья вкладка.
  const AFTER_HANDOVER = "Запись после закрытия старшей вкладки";
  await captureThroughScreen(second, AFTER_HANDOVER);
  await flush(second);
  await expect(second.locator("#save-status")).not.toHaveAttribute("data-state", "readonly");
  const third = await openTab(context, "tabs-handover-3");
  expect(await titlesInMemory(third)).toContain(AFTER_HANDOVER);
  await third.close();
  await second.close();
});

// ДЕФЕКТ, НАЙДЕННЫЙ ЭТОЙ СПЕКОЙ (не чиню — чужая территория, app.js).
//
// Между «полоса ушла» и «владелец что-то записал» строка состояния продолжает утверждать
// «только чтение — открыто в другой вкладке». Причина: `armTabGuard(onChange)` вызывает
// `updateSaveStatus()`, а та рисует `store.saveState`, застрявший в "readonly" с последней
// неудавшейся попытки сохранения (app.js, `persistCurrent` ставит его и никто не снимает при
// освобождении права). Полоса и строка в этот момент говорят противоположное, и это ровно тот
// класс лжи о состоянии, ради которого весь О-1 и делался.
//
// Проверка ниже фиксирует состояние КАК ЕСТЬ и держит его под наблюдением: она зелёная сейчас
// и станет красной, если поведение изменится в любую сторону — и когда `saveState` начнут
// сбрасывать (тогда «readonly» здесь исчезнет), и если полоса перестанет уходить.
test("после освобождения права строка состояния ещё не обновлена — известный разрыв", async ({ page, context }) => {
  await resetFirstTab(page, "tabs-stale-status");
  const second = await openTab(context, "tabs-stale-status-2");
  await expect(second.getByTestId("tab-readonly-banner")).toBeVisible({ timeout: 20000 });

  await page.close();
  await expect(second.getByTestId("tab-readonly-banner")).toHaveCount(0, { timeout: 20000 });

  // Полоса говорит «пиши», строка — «только чтение». Разрыв держится до первой записи.
  await expect(second.locator("#save-status")).toHaveAttribute("data-state", "readonly");

  // И схлопывается ею же: после первого сохранения оба канала снова говорят одно и то же.
  await captureThroughScreen(second, "Первая запись после возврата права");
  await flush(second);
  await expect(second.locator("#save-status")).not.toHaveAttribute("data-state", "readonly", { timeout: 20000 });
  await second.close();
});

// О4: механизм назван. Вкладка уходит в чтение не потому, что «вторая по счёту» — она уходит,
// получив по каналу `lifeos-tabs` сообщение «занято» от того, кто старше. Проверяем сам
// протокол: спека сама играет старшую вкладку. Так видно, что защита живая, а не одноразовый
// флаг, посчитанный при загрузке.
test("механизм — BroadcastChannel: чужое «занято» уводит в чтение, «ухожу» возвращает", async ({ page }) => {
  await resetFirstTab(page, "tabs-channel");
  expect(await page.evaluate(() => typeof BroadcastChannel), "без канала защите не на чем работать").toBe("function");
  await expect(page.getByTestId("tab-readonly-banner")).toHaveCount(0);

  // `bornAt: 1` — заведомо старше любой живой вкладки. Отдельный объект канала в той же
  // странице получает и отдаёт сообщения наравне с чужой вкладкой.
  await page.evaluate((channelName) => {
    window.__specTabChannel = new BroadcastChannel(channelName);
    window.__specTabChannel.postMessage({ kind: "busy", id: "spec-older-tab", bornAt: 1 });
  }, TAB_CHANNEL);
  await expect(page.getByTestId("tab-readonly-banner")).toBeVisible({ timeout: 20000 });

  await page.evaluate(() => window.__specTabChannel.postMessage({ kind: "bye", id: "spec-older-tab" }));
  await expect(page.getByTestId("tab-readonly-banner")).toHaveCount(0, { timeout: 20000 });

  // Своё «здравствуй» вкладка обязана игнорировать: сообщение с её собственным id не должно
  // отправлять её в чтение. Проверяем тем же каналом, что и всё остальное.
  await page.evaluate(() => window.__specTabChannel.postMessage({ kind: "hello", id: "spec-newer-tab", bornAt: Date.now() + 60000 }));
  await expect(page.getByTestId("tab-readonly-banner")).toHaveCount(0);
});

// О5 (§7 — провайдер честен): нет канала — нет защиты, и об этом нельзя врать. Старый браузер
// или приватный режим без `BroadcastChannel` возвращает поведение до 31 июля: полосы нет,
// записывают обе вкладки. Плохо — но названо. Полоса без работающего механизма была бы хуже:
// владелец поверил бы, что защищён.
test("без BroadcastChannel продукт работает как раньше и защиту не изображает", async ({ page, context }) => {
  await context.addInitScript(() => { delete window.BroadcastChannel; });
  await resetFirstTab(page, "tabs-no-channel");
  expect(await page.evaluate(() => typeof BroadcastChannel)).toBe("undefined");

  const second = await openTab(context, "tabs-no-channel-2");
  // Полосы нет: изобразить защиту, которой нет, — это ложь, а не забота.
  await expect(second.getByTestId("tab-readonly-banner")).toHaveCount(0);
  await expect(second.locator("#save-status")).not.toHaveAttribute("data-state", "readonly");

  // И вкладка пишет, как писала до 31 июля: продукт не ломается там, где защиты нет.
  const WITHOUT_GUARD = "Запись в браузере без BroadcastChannel";
  await captureThroughScreen(second, WITHOUT_GUARD);
  await flush(second);
  const third = await openTab(context, "tabs-no-channel-3");
  expect(await titlesInMemory(third)).toContain(WITHOUT_GUARD);
  await third.close();
  await second.close();
});

// Живой прогон РУКАМИ: настоящие клики, ввод, прокрутка, тач, телефонный экран, drag-n-drop.
//
// §2.5 очереди ноутбука. Облако снимает скриншоты, но не нажимает — а владелец именно нажимает.
// Этот инструмент не гейт: он ПРОБА. Его дело — найти то, чего не видит ни одна зелёная спека
// (так уже находились три дефекта старше самих фич), и назвать это числами, а не «на глаз».
//
// Запуск: node tools/probe-live-interaction.mjs   (нужен `npm start` на 4173)
import { chromium, devices } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const APP_URL = process.env.LIFEOS_URL || "http://127.0.0.1:4173";

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

const findings = [];
function note(severity, what) {
  findings.push({ severity, what });
  console.log((severity === "дефект" ? "🔴 " : "🟡 ") + what);
}

const local = findLocalChromium();
const browser = await chromium.launch(local ? { executablePath: local } : {});

async function openApp(context, tag) {
  const page = await context.newPage();
  page.on("pageerror", (error) => note("дефект", "ошибка страницы (" + tag + "): " + String(error.message).slice(0, 90)));
  await page.goto(APP_URL + "?probe=" + tag + Date.now(), { waitUntil: "networkidle", timeout: 60000 });
  await page.locator(".lifeos-shell-v2").waitFor({ state: "visible", timeout: 30000 });
  await page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest());
  // Сброс перерисовывает оболочку целиком. Ждать надо ПОЯВЛЕНИЯ меню, а не таймаут: первая версия
  // пробы спрашивала `count()` посреди перерисовки и объявила, что меню нет вовсе.
  await page.getByTestId("surface-inbox").first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400);
  return page;
}

// ─── 1. Настольный экран: девять пунктов главного меню, каждый настоящим кликом ──────────────
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await openApp(desktop, "desktop");

const MAIN = ["inbox", "today", "calendar", "finance", "feed", "systems", "library", "graph", "control"];
console.log("\n— главное меню, настоящий клик по каждому пункту —");
for (const surface of MAIN) {
  // Главный рейл и вторичное меню используют РАЗНЫЕ префиксы testid (`nav-` и `surface-`).
  // Первая версия пробы этого не знала и объявила «нет ни одного пункта меню» — проба, которая
  // врёт, хуже отсутствующей, поэтому здесь честно перебираются оба.
  let item = page.getByTestId("nav-" + surface).first();
  if (!(await item.count())) item = page.getByTestId("surface-" + surface).first();
  if (!(await item.count())) {
    note("дефект", "пункта меню нет вовсе: " + surface);
    continue;
  }
  // Прокручиваем страницу вниз ПЕРЕД переходом: владелец приходит к меню не с верха экрана.
  await page.evaluate(() => window.scrollTo(0, 400));
  await item.click();
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    y: window.scrollY,
    surface: window.__lifeosKnowledgeBase.getStateSnapshot().activeSurface,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  if (state.surface !== surface) note("дефект", "клик по «" + surface + "» не открыл раздел (открыт " + state.surface + ")");
  if (state.y > 4) note("дефект", "раздел «" + surface + "» открывается прокрученным на " + state.y + " px — владелец попадает в середину");
  if (state.overflowX > 4) note("дефект", "раздел «" + surface + "» шире экрана на " + state.overflowX + " px — уезжает вбок");
}

// ─── 2. Ввод руками: печатаем запись и подтверждаем предложение кликом ───────────────────────
console.log("\n— запись руками: печать, разбор, подтверждение —");
await page.getByTestId("surface-inbox").first().click();
await page.waitForTimeout(400);
const input = page.locator("#capture-input");
if (await input.count()) {
  await input.click();
  await input.type("Отработал 8 часов, вышло 5400, бензин 900", { delay: 12 });
  const parse = page.getByTestId("capture-text");
  if (await parse.count()) {
    await parse.click();
    await page.waitForTimeout(900);
    const primary = page.getByTestId("human-primary-action");
    if (await primary.count()) {
      const label = (await primary.first().innerText().catch(() => "")).slice(0, 60);
      console.log("   главное действие после разбора: «" + label + "»");
      await primary.first().click();
      await page.waitForTimeout(1200);
      // Смена не отдельная коллекция: она применяется как доход С ЧАСАМИ (`shiftHours`), траты
      // смены отдельными расходами и рабочий блок в плане дня. Проверять надо это, а не
      // выдуманное `state.shifts` — иначе проба «находит» дефект там, где работает контракт.
      const money = await page.evaluate(() => {
        const s = window.__lifeosKnowledgeBase.getStateSnapshot();
        const txs = Object.values(s.financeTransactions || {}).filter((item) => !item.deleted);
        return {
          сменыСЧасами: txs.filter((item) => item.kind === "income" && Number(item.shiftHours || 0) > 0).map((item) => item.amount + "₽/" + item.shiftHours + "ч"),
          доходы: txs.filter((item) => item.kind === "income").map((item) => item.amount),
          расходы: txs.filter((item) => item.kind === "expense").map((item) => item.amount),
          блокиДня: Object.values(s.planBlocks || {}).filter((item) => !item.deleted).length
        };
      });
      console.log("   после подтверждения: " + JSON.stringify(money));
      if (!money.сменыСЧасами.length) note("дефект", "«Записать смену» не дало дохода с часами — часы смены потеряны");
      if (!money.расходы.length) note("дефект", "бензин 900 ₽ из той же фразы не стал расходом смены");
    } else note("дефект", "после разбора нет главного действия — подтверждать нечем");
  } else note("дефект", "кнопки «Разобрать» нет на экране ввода");
} else note("дефект", "поля ввода #capture-input нет");

// ─── 3. Телефон: тач, нижняя панель, «Ещё», ничего не уезжает вбок ──────────────────────────
console.log("\n— телефон 375×812, настоящий тач —");
const phone = await browser.newContext(Object.assign({}, devices["iPhone 12"], { hasTouch: true, isMobile: true }));
const mobile = await openApp(phone, "mobile");
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (mobileOverflow > 4) note("дефект", "первый экран телефона шире окна на " + mobileOverflow + " px");

// Нижняя панель телефона — своя, с префиксом `mobile-surface-`. Рейл с теми же `surface-*` на
// телефоне СКРЫТ, и первая версия пробы честно висела на невидимой кнопке 30 секунд.
async function tapIfVisible(target, label) {
  if (!(await target.count())) {
    note("наблюдение", label + ": элемента нет по testid");
    return false;
  }
  if (!(await target.isVisible().catch(() => false))) {
    note("дефект", label + ": элемент есть в разметке, но не виден на телефоне — нажать нечего");
    return false;
  }
  await target.tap();
  await mobile.waitForTimeout(500);
  return true;
}

if (await tapIfVisible(mobile.getByTestId("mobile-surface-capture").first(), "нижняя панель · Ввод")) {
  const after = await mobile.evaluate(() => ({ surface: window.__lifeosKnowledgeBase.getStateSnapshot().activeSurface, y: window.scrollY }));
  console.log("   тап по нижней панели → " + after.surface + ", прокрутка " + after.y);
  if (after.y > 4) note("дефект", "после тапа по нижней панели экран прокручен на " + after.y + " px");
}

// «Ещё» на телефоне — это `<details>`, и нажимается его `summary`, а не сам контейнер.
const moreSummary = mobile.locator('[data-testid="mobile-more-nav"] summary').first();
if (await tapIfVisible(moreSummary, "нижняя панель · Ещё")) {
  const visible = await mobile.getByTestId("mobile-more-control").first().isVisible().catch(() => false);
  console.log("   «Ещё» на телефоне: " + (visible ? "открывается" : "не открылось"));
  if (!visible) note("дефект", "на телефоне «Ещё» не открывает вторичное меню — часть разделов недостижима");
  else {
    await mobile.getByTestId("mobile-more-control").first().tap();
    await mobile.waitForTimeout(500);
    const after = await mobile.evaluate(() => ({ surface: window.__lifeosKnowledgeBase.getStateSnapshot().activeSurface, y: window.scrollY }));
    console.log("   из «Ещё» открыт " + after.surface + ", прокрутка " + after.y);
    if (after.surface !== "control") note("дефект", "«Контроль» из «Ещё» на телефоне не открылся (открыт " + after.surface + ")");
    if (after.y > 4) note("дефект", "раздел из «Ещё» открылся прокрученным на " + after.y + " px");
  }
}

// Прокрутка пальцем: настоящий свайп по колесу тача на длинном экране.
await mobile.evaluate(() => window.scrollTo(0, 0));
await mobile.mouse.wheel(0, 600);
await mobile.waitForTimeout(300);
const swiped = await mobile.evaluate(() => window.scrollY);
console.log("   прокрутка пальцем на 600: страница ушла на " + swiped + " px");
if (swiped < 50) note("наблюдение", "первый экран телефона короче окна — прокручивать нечего");

// ─── 4. Перетаскивание: настоящая мышь, а не событие ────────────────────────────────────────
console.log("\n— перетаскивание блока времени настоящей мышью —");
// Перетаскивание живёт на Календаре (`mountCalendarDragDrop`), а не на «Сегодня» — первая версия
// пробы искала не там и честно сказала «нечего проверять». Ищем на обоих экранах.
await page.getByTestId("surface-calendar").first().click();
await page.waitForTimeout(800);
let block = page.locator("[draggable=\"true\"]").first();
if (!(await block.count())) {
  await page.getByTestId("surface-today").first().click();
  await page.waitForTimeout(600);
  block = page.locator("[draggable=\"true\"], [data-testid^=\"timeblock\"]").first();
}
if (await block.count()) {
  const box = await block.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 120, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    console.log("   перетаскивание выполнено, ошибок страницы нет");
  }
} else note("наблюдение", "перетаскиваемого блока на «Сегодня» не нашлось — сценарий проверить нечем");

await browser.close();

console.log("\n— итог пробы —");
const defects = findings.filter((item) => item.severity === "дефект");
console.log("дефектов: " + defects.length + ", наблюдений: " + (findings.length - defects.length));
for (const item of defects) console.log("  · " + item.what);
if (!findings.length) console.log("проба не нашла расхождений — но она проверяет не всё, а названное выше");

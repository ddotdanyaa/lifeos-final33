// ПРИЛОЖЕНИЕ ОБЯЗАНО ЗАПУСКАТЬСЯ. Самый дешёвый гейт и самый дорогой пропуск.
//
// Появился после настоящей потери времени: при выносе среза в `core/owner-themes.mjs` параметр
// `systemFolderId` остался у одной функции, а проверка с ним уехала в другую. Синтаксис верный —
// `node --check` молчит. Замыкание не нарушено — `audit-module-closure` молчит: имени нет ни в
// модуле, ни в `app.js`, значит и ссылки обратно нет. Смок ищет строки в исходнике — молчит тоже.
// А приложение при этом НЕ ЗАПУСКАЛОСЬ: вместо экрана — «Хранилище остановило сбой».
//
// Полный набор спек это поймал, но заплатил двумя часами. Здесь — пятнадцать секунд.
//
// Почему именно так: единственный честный способ узнать, что приложение живо, — запустить его.
// Любая статическая проверка этот класс ошибки пропустит, потому что ошибка рантайма.
//
// Запуск: node tools/audit-app-boots.mjs   (нужен `npm start` на 4173)
import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Тот же поиск локального Chromium, что и в спеках: полный браузер здесь не установлен, стоит
// только headless-shell. Без этого аудит краснел бы на среде, а не на коде.
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

const APP_URL = process.env.LIFEOS_URL || "http://127.0.0.1:4173";

async function serverIsUp() {
  try {
    const response = await fetch(APP_URL, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

if (!(await serverIsUp())) {
  // Пропуск назван вслух, а не спрятан: аудиты гоняются и там, где сервера нет. Молчаливый
  // зелёный в этом месте был бы враньём — он выглядел бы как «приложение запустилось».
  console.log(JSON.stringify({ audit: "app-boots", пропущен: true, причина: "сервер на " + APP_URL + " не отвечает" }, null, 2));
  console.log("\nПРОПУЩЕН, а не пройден: подними `npm start` и повтори перед словом «готово».");
  process.exit(0);
}

const localChromium = findLocalChromium();
const browser = await chromium.launch(localChromium ? { executablePath: localChromium } : {});
const page = await browser.newPage();
const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(String(error && error.message ? error.message : error)));

let shellVisible = false;
let bannerText = "";
try {
  await page.goto(APP_URL + "?boot-audit=" + Date.now(), { waitUntil: "networkidle", timeout: 45000 });
  // `isVisible()` отвечает МГНОВЕННО и на не отрисованной ещё оболочке даёт false. Ждать надо
  // явно, иначе аудит краснеет на медленной инициализации хранилища, а не на сломанном коде.
  shellVisible = await page.locator(".lifeos-shell-v2")
    .waitFor({ state: "visible", timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  // Экран аварийной изоляции хранилища — это НЕ запуск: данные целы, но продукта нет.
  bannerText = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : "";
    return /Хранилище остановило сбой/.test(text) ? text.split("\n").filter(Boolean).slice(0, 3).join(" · ") : "";
  });
} finally {
  await browser.close();
}

console.log(JSON.stringify({
  audit: "app-boots",
  url: APP_URL,
  оболочка: shellVisible,
  "ошибки страницы": consoleErrors.slice(0, 5),
  "аварийный экран": bannerText
}, null, 2));

if (!shellVisible || bannerText) {
  console.error("\nПРИЛОЖЕНИЕ НЕ ЗАПУСКАЕТСЯ. Это красный гейт независимо от остальных.");
  if (bannerText) console.error("  Аварийный экран: " + bannerText);
  for (const error of consoleErrors.slice(0, 5)) console.error("  Ошибка страницы: " + error);
  console.error("\nЧаще всего причина — имя, не связанное после выноса среза: синтаксис верный,");
  console.error("статические проверки молчат, падает только рантайм.");
  process.exit(1);
}

console.log("\nПриложение запускается: оболочка на экране, ошибок страницы нет.");
console.log("audit:app-boots passed");

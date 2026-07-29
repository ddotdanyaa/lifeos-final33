// П7 · ЗАМКНУТОСТЬ МОДУЛЕЙ. Вынесенный модуль обязан быть ЗАМКНУТ: каждое имя внутри него либо
// объявлено там же, либо глобальное. Ссылка обратно в `app.js` — это не «почти получилось», это
// сломанное приложение, потому что модуль исполняется в своей области видимости.
//
// Аудит появился не из аккуратности, а из ошибки: первый разбор зависимостей искал только
// `имя(` и пропустил функцию, переданную ССЫЛКОЙ — `.replace(re, decodeMojibakeRun)`. Приложение
// упало на первом же прогоне спек. Здесь проверяются ВСЕ идентификаторы, а не только вызовы.
//
// Запускать перед каждым следующим срезом раскола: он дешевле, чем полный набор, и ловит ровно
// тот класс ошибки, который раскол и порождает.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const modules = existsSync("core") ? readdirSync("core").filter((name) => name.endsWith(".mjs")) : [];
if (!modules.length) {
  console.log("Вынесенных модулей ещё нет: core/ пуст. Проверять нечего — это не ошибка.");
  process.exit(0);
}
const app = readFileSync("app.js", "utf8");
const appTop = new Set([...app.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
const appConst = new Set([...app.matchAll(/^const ([A-Za-z_$][\w$]*)\s*=/gm)].map((m) => m[1]));

const GLOBALS = new Set(["String","Number","Math","Date","JSON","Object","Array","RegExp","Boolean","Set","Map","WeakMap","Promise","Error","parseInt","parseFloat","isNaN","isFinite","crypto","console","undefined","Buffer","Intl","encodeURIComponent","decodeURIComponent","btoa","atob","window","document","navigator","fetch","URL","Blob","FormData","TextDecoder","TextEncoder","AbortController","performance","requestAnimationFrame","setTimeout","clearTimeout","setInterval","clearInterval","indexedDB","caches","localStorage","self"]);

const broken = [];
for (const name of modules) {
  const path = join("core", name);
  const raw = readFileSync(path, "utf8");
  // Комментарии и строки — не ссылки. Без этого аудит находил слово «app» внутри «app.js» в
  // комментарии и объявлял модуль разорванным: инструмент обязан смотреть на код, а не на текст.
  const text = raw
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ")
    .replace(/`(?:[^`\\]|\\.)*`/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, " ")
    .replace(/'(?:[^'\\]|\\.)*'/g, " ");
  // Всё, что модуль объявляет сам: функции, константы, переменные, импорты.
  const own = new Set([
    ...[...raw.matchAll(/(?:export )?(?:async )?function ([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
    ...[...text.matchAll(/(?:export )?(?:const|let|var) ([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
    ...[...text.matchAll(/import\s*\{([^}]*)\}/g)].flatMap((m) => m[1].split(",").map((part) => part.trim().split(/\s+as\s+/).pop()))
  ].filter(Boolean));

  const missing = new Map();
  for (const match of text.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)/g)) {
    const id = match[1];
    if (own.has(id) || GLOBALS.has(id)) continue;
    if (!appTop.has(id) && !appConst.has(id)) continue;
    if (!missing.has(id)) missing.set(id, appTop.has(id) ? "функция" : "константа");
  }
  if (missing.size) broken.push({ path, missing: [...missing.entries()] });
}

console.log(JSON.stringify({ audit: "module-closure", модулей: modules.length, "с разрывом": broken.length }, null, 2));

if (broken.length) {
  console.error("");
  console.error("Модули ссылаются обратно в app.js — они не заработают:");
  for (const row of broken) {
    console.error("  " + row.path);
    for (const [name, kind] of row.missing) console.error("      " + name + " — " + kind + " осталась в app.js");
  }
  console.error("");
  console.error("Вынеси недостающее в тот же модуль или в общий чистый слой. Ссылка обратно");
  console.error("означает, что раскол сделан наполовину, а приложение при этом уже сломано.");
  process.exit(1);
}

console.log("");
console.log("Все модули замкнуты: ни одной ссылки обратно в app.js.");
console.log("audit:module-closure passed");

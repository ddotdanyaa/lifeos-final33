// П7 · ОБРАТНАЯ ЗАМКНУТОСТЬ. `audit-module-closure` проверяет, что вынесенный модуль не смотрит
// обратно в `app.js`. Эта проверка — зеркальная и ловит противоположную ошибку: функцию вынесли
// в `core/`, а импорт в `app.js` не дописали. Файл после этого проходит `node --check`, проходит
// `smoke.mjs`, приложение даже ОТКРЫВАЕТСЯ — и падает только когда владелец нажмёт кнопку,
// потому что имя нужно в момент вызова, а не при загрузке.
//
// Появилась не из аккуратности: 2026-07-30 при выносе четырёх блоков в `core/` я забыл импорт
// ДВА раза за один пакет. Первый раз это уронило загрузку целиком (`parseTaskSchedule`), второй
// раз — только отправку сообщения в чате (`isModelIdentityQuestion`), и `audit-app-boots`
// остался зелёным, потому что оболочка на экране была.
//
// Проверка узкая нарочно: сравниваются ТОЛЬКО имена, которые экспортирует `core/`. Локальные
// переменные и параметры функций не рассматриваются вовсе, поэтому ложных срабатываний нет,
// а цена — чтение файлов и один проход регуляркой, без браузера и без сети.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Комментарии убираем. Обычные строки в кавычках — тоже: слово из списка стоп-слов внутри кавычек
// иначе даёт ложное срабатывание (проверено на живом примере). А ШАБЛОННЫЕ строки не трогаем: в
// файле на 1,4 МБ их сотни, с HTML, кавычками и `${}` внутри, и наивная регулярка «съесть всё между
// обратными кавычками» проглатывала целые куски настоящего кода — проверка зеленела, потому что
// переставала видеть вызовы. Это ровно тот случай, когда инструмент врёт спокойным голосом.
function stripComments(raw) {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, " ")
    .replace(/'(?:[^'\\\n]|\\.)*'/g, " ");
}

const modules = existsSync("core") ? readdirSync("core").filter((name) => name.endsWith(".mjs")) : [];
if (!modules.length) {
  console.log("Вынесенных модулей ещё нет: core/ пуст. Проверять нечего — это не ошибка.");
  process.exit(0);
}

// Что вообще экспортирует core/: имя -> модуль, где оно живёт.
const exportedBy = new Map();
for (const name of modules) {
  const raw = readFileSync(join("core", name), "utf8");
  for (const match of raw.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) exportedBy.set(match[1], name);
  for (const match of raw.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) exportedBy.set(match[1], name);
}

const raw = readFileSync("app.js", "utf8");
const text = stripComments(raw);

// Всё, что app.js объявляет сам или импортирует. Объявления берём ВЕЗДЕ, а не только на верхнем
// уровне: одноимённая локальная переменная — это законный способ не нуждаться в импорте.
const declared = new Set([
  ...[...raw.matchAll(/(?:async )?function ([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
  ...[...text.matchAll(/(?:const|let|var) ([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
  ...[...text.matchAll(/class ([A-Za-z_$][\w$]*)/g)].map((m) => m[1])
].filter(Boolean));

const imported = new Set([...text.matchAll(/import\s*\{([^}]*)\}\s*from/g)]
  .flatMap((m) => m[1].split(",").map((part) => part.trim().split(/\s+as\s+/).pop()))
  .filter(Boolean));

const missing = new Map();
for (const match of text.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
  const id = match[1];
  if (declared.has(id) || imported.has(id)) continue;
  if (!exportedBy.has(id)) continue;
  missing.set(id, exportedBy.get(id));
}
// Константы вызовом не выглядят, поэтому их проверяем отдельным проходом по всем ссылкам.
for (const match of text.matchAll(/(?<![\w$.])([A-Z][A-Z0-9_]{2,})(?![\w$])/g)) {
  const id = match[1];
  if (declared.has(id) || imported.has(id)) continue;
  if (!exportedBy.has(id)) continue;
  missing.set(id, exportedBy.get(id));
}

console.log(JSON.stringify({
  audit: "app-imports",
  "экспортов в core": exportedBy.size,
  "импортов в app.js": imported.size,
  "потерянных импортов": missing.size
}, null, 2));

if (missing.size) {
  console.error("");
  console.error("app.js вызывает имена, которые живут в core/, но не импортированы:");
  for (const [name, module] of missing) console.error("      " + name + " — экспортируется из core/" + module);
  console.error("");
  console.error("Это не стилистика: приложение упадёт в момент вызова. Допиши импорт.");
  process.exit(1);
}

console.log("");
console.log("Все вынесенные имена импортированы: ни одной потерянной ссылки.");
console.log("audit:app-imports passed");

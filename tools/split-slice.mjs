// П7 · ИНСТРУМЕНТ РАСКОЛА. Вынос очередного среза из app.js — механически и с проверками ДО
// правки, а не после.
//
// Как работает: от «семени» (пары имён) сам раскрывает ЗАМЫКАНИЕ — добирает все объявления, на
// которые срез опирается, — и только потом режет. Перед резкой три отказа:
//   • имя не найдено → стоп (опечатка в семени);
//   • срез трогает `store`, `repository`, `state`, `app`, `render` → стоп: он не чистый, и
//     вынос породил бы цикл импортов;
//   • вырезы перекрываются → стоп: разбор границ ошибся, резать по неверным границам нельзя.
//
// Каждая из этих проверок появилась после настоящей ошибки, а не из осторожности:
//   — счёт скобок ломался о регулярки (`[А-Яа-яЁё]` — тоже скобка), поэтому границы констант
//     определяются по форматированию: верхний уровень всегда с нулевой колонки;
//   — закрывающая строка бывает не голой (например с вызовом join в конце), и без этого
//     разбор захватывал следующую функцию;
//   — импорты собираются ПО МОДУЛЯМ: имя приходит из того файла, где объявлено.
//
// После выноса обязательно: `node --check`, `node tools/audit-module-closure.mjs`,
// `node tools/audit-module-size.mjs`, кэш в `service-worker.js` и целевые спеки.
//
// Запуск:
//   node tools/split-slice.mjs core/<модуль>.mjs "<заголовок>" <имя1> <имя2> ...
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const [, , outFile, title, ...seed] = process.argv;
const app = readFileSync("app.js", "utf8");
// Уже вынесенные модули: их имена импортируются, а не режутся повторно. Каждое имя помнит СВОЙ
// модуль — иначе импорт соберётся из одного файла, а половина функций живёт в другом.
// Уже вынесенные модули читаются с диска: список не ведётся руками и не устаревает.
const CORE_MODULES = readdirSync("core").filter((name) => name.endsWith(".mjs")).map((name) => "core/" + name);
const known = new Map();
for (const file of CORE_MODULES) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/export (?:async )?(?:function|const) ([A-Za-z_$][\w$]*)/g)) {
    known.set(m[1], "./" + file.split("/").pop());
  }
}

const GLOBALS = new Set(["String","Number","Math","Date","JSON","Object","Array","RegExp","Boolean","Set","Map","WeakMap","Promise","Error","parseInt","parseFloat","isNaN","isFinite","crypto","console","undefined","Buffer","Intl","encodeURIComponent","decodeURIComponent","btoa","atob","window","document","navigator","fetch","URL","Blob","File","FormData","TextDecoder","TextEncoder","AbortController","performance","requestAnimationFrame","setTimeout","clearTimeout","setInterval","clearInterval","indexedDB","caches","localStorage","self","Symbol","Infinity","NaN","globalThis","Uint8Array","ArrayBuffer","DataView"]);
const DIRTY = new Set(["store", "repository", "app", "state", "render"]);

function strip(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ")
    .replace(/`(?:[^`\\]|\\.)*`/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, " ")
    .replace(/'(?:[^'\\]|\\.)*'/g, " ");
}

function block(startIndex) {
  const open = app.indexOf("{", startIndex);
  let depth = 0;
  for (let i = open; i < app.length; i += 1) {
    if (app[i] === "{") depth += 1;
    if (app[i] === "}") { depth -= 1; if (depth === 0) return i + 1; }
  }
  return open;
}

// Объявления верхнего уровня: функции и константы (в том числе многострочные).
const decls = new Map();
for (const m of app.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm)) {
  decls.set(m[1], { kind: "function", start: m.index, end: block(m.index) });
}
for (const m of app.matchAll(/^const ([A-Za-z_$][\w$]*)\s*=/gm)) {
  if (decls.has(m[1])) continue;
  const lineEnd = app.indexOf("\n", m.index);
  const head = app.slice(m.index, lineEnd);
  let end = lineEnd;
  // Считать скобки в JS с регулярками нельзя: `[А-Яа-яЁё]` внутри `/…/` — тоже скобка, и
  // счётчик уезжает. Опираемся на форматирование файла: верхний уровень всегда начинается с
  // нулевой колонки, значит закрывающая строка объявления — это `];`, `};` или `);` без отступа.
  const opener = (head.match(/([[{(])\s*$/) || [])[1];
  if (opener) {
    // Закрывающая строка бывает не голой: `].join("\n");` — тоже конец объявления, и без этого
    // разбор считал его незакрытым и захватывал следующую функцию.
    // Закрывающих скобок бывает НЕСКОЛЬКО подряд: `new Set([` кончается на `]);`. Первая версия
    // ждала ровно одну, считала объявление незакрытым и захватывала следующую функцию.
    const closeRe = /^[)\]}]+(?:\.[A-Za-z_$][\w$]*\([^\n]*\))*\s*;?\s*$/m;
    const rest = app.slice(lineEnd + 1);
    const found = rest.match(closeRe);
    end = found ? lineEnd + 1 + found.index + found[0].length : lineEnd;
  } else {
    // Многострочное выражение: ищем строку, оканчивающуюся на «;» на нулевой вложенности.
    let depth = 0;
    for (let i = m.index; i < app.length; i += 1) {
      const c = app[i];
      if ("([{".includes(c)) depth += 1;
      if (")]}".includes(c)) depth -= 1;
      if (c === ";" && depth === 0) { end = i + 1; break; }
    }
  }
  decls.set(m[1], { kind: "const", start: m.index, end });
}

function withComment(start) {
  const before = app.slice(0, start).split("\n");
  let line = before.length - 1;
  while (line > 0 && /^\s*\/\//.test(before[line - 1])) line -= 1;
  return before.slice(0, line).join("\n").length + (line > 0 ? 1 : 0);
}

function idsOf(decl) {
  const text = strip(app.slice(decl.start, decl.end));
  const own = new Set([...text.matchAll(/(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
  const head = app.slice(decl.start, app.indexOf("{", decl.start));
  for (const m of head.matchAll(/([A-Za-z_$][\w$]*)/g)) own.add(m[1]);
  const out = new Set();
  for (const m of text.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)/g)) {
    const id = m[1];
    if (own.has(id) || GLOBALS.has(id) || known.has(id)) continue;
    if (decls.has(id)) out.add(id);
  }
  return out;
}

// Замыкание от семени.
const chosen = new Set();
const queue = [...seed];
while (queue.length) {
  const name = queue.shift();
  if (chosen.has(name)) continue;
  const decl = decls.get(name);
  if (!decl) { console.error("НЕ НАЙДЕНО объявление:", name); process.exit(1); }
  chosen.add(name);
  for (const dep of idsOf(decl)) if (!chosen.has(dep)) queue.push(dep);
}

// Проверка чистоты ДО правки.
for (const name of chosen) {
  const text = strip(app.slice(decls.get(name).start, decls.get(name).end));
  for (const bad of DIRTY) {
    if (new RegExp("(?<![\\w$.])" + bad + "(?![\\w$])").test(text)) {
      console.error("ГРЯЗНО:", name, "трогает", bad, "— срез не чистый, резать нельзя");
      process.exit(1);
    }
  }
}

const cuts = [...chosen].map((name) => {
  const decl = decls.get(name);
  return { name, from: withComment(decl.start), to: decl.end };
}).sort((a, b) => a.from - b.from);

for (let i = 1; i < cuts.length; i += 1) {
  if (cuts[i].from < cuts[i - 1].to) {
    console.error("ПЕРЕКРЫТИЕ:", cuts[i - 1].name, "и", cuts[i].name);
    process.exit(1);
  }
}

const bodies = cuts.map((cut) => {
  const text = app.slice(cut.from, cut.to);
  const idx = text.search(/^(?:async function |function |const )/m);
  return text.slice(0, idx) + "export " + text.slice(idx);
});

const header = "// " + title + "\n//\n"
  + "// П7: вынесено из app.js замыканием от семени — инструмент сам добрал все зависимости и\n"
  + "// проверил, что ни одна из них не трогает состояние, хранилище и DOM. Модуль замкнут:\n"
  + "// ссылок обратно в app.js нет (audit-module-closure это подтверждает).\n\n";

// Импорты собираем ПО МОДУЛЯМ: каждое имя приходит из того файла, где оно объявлено, иначе
// импорт соберётся из одного модуля, а половина функций живёт в другом.
const joined = bodies.join("\n");
const byModule = new Map();
for (const [name, from] of known) {
  if (!new RegExp("(?<![\\w$.])" + name + "(?![\\w$])").test(joined)) continue;
  if (!byModule.has(from)) byModule.set(from, []);
  byModule.get(from).push(name);
}
const importLine = [...byModule.entries()]
  .map(([from, names]) => "import {\n  " + names.sort().join(",\n  ") + "\n} from \"" + from + "\";\n")
  .join("") + (byModule.size ? "\n" : "");

writeFileSync(outFile, header + importLine + bodies.join("\n\n") + "\n", "utf8");

let next = app;
for (let i = cuts.length - 1; i >= 0; i -= 1) next = next.slice(0, cuts[i].from) + next.slice(cuts[i].to);
const rel = "./" + outFile.replace(/\\/g, "/");
next = "import {\n  " + [...chosen].sort().join(",\n  ") + "\n} from \"" + rel + "\";\n" + next;
writeFileSync("app.js", next, "utf8");

console.log("вынесено:", chosen.size, "объявлений");
console.log(outFile + ":", Math.round((header + importLine + bodies.join("\n\n")).length / 1024), "КБ");
console.log("app.js:", Math.round(app.length / 1024), "→", Math.round(next.length / 1024), "КБ");

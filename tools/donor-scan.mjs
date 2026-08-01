// tools/donor-scan.mjs — ПЕРЕПИСЬ ДОНОРОВ, КОТОРЫЕ ЛЕЖАТ НА ДИСКЕ.
//
// Зачем это существует. С 22 июля одиннадцать донорских проектов лежали в `docs/` архивами и ни
// разу не были распакованы, а `research/README.md` при этом писал «скачаны и разобраны». Каждая
// следующая сессия отвечала «уже изучено, не переанализировать» — и не переносила ни строки.
// Сканер убирает саму возможность этой ошибки: он смотрит на файлы, а не на утверждения о файлах.
//
// Что он делает: по каждой папке в `research/repos` читает ЛИЦЕНЗИЮ ФАЙЛОМ (не по памяти и не по
// метаданным хостинга), определяет стек по манифестам, считает вес языков по реальным файлам и
// назначает РАМПУ — способ, которым код этого донора может попасть к нам:
//
//   ЛИФТ    — MIT/Apache/BSD + JS/TS без шага сборки: код переносится почти как есть.
//   ПОРТ    — то же по лицензии, но Python/Go/JVM/Clojure: алгоритм переписывается на ванильный JS.
//   WASM    — то же по лицензии, но Rust/C/C++: собирается в WASM (прецедент — whisper.cpp).
//   ПАТТЕРН — лицензия разрешает, но стек требует сборки (React/Next): берём приёмы и CSS.
//   ЗАПУСК  — копилефт или лицензия не прочитана: строки не копируем; запускать и сверять поведение можно.
//
// Лицензионный разбор берётся из `core/donor-intake.mjs`, чтобы правило жило в одном месте:
// один и тот же код решает и про донора, пришедшего ссылкой в захвате, и про папку на диске.
//
// Сканер ничего не меняет в продукте и ничего не скачивает. Только чтение и отчёт.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { classifyLicense } from "../core/donor-intake.mjs";

const REPOS_DIR = join(process.cwd(), "research", "repos");
const REPORT_PATH = join(process.cwd(), "docs", "DONOR_SCAN.md");

// Папки, которые не несут смысла для разбора и раздувают обход в десятки раз.
const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "target", "__pycache__", ".venv", "venv",
  ".next", ".cache", "coverage", "vendor", ".idea", ".vscode", "fixtures", "__snapshots__"
]);

const LICENSE_NAMES = ["license", "license.md", "license.txt", "licence", "licence.md", "copying", "copying.txt", "notice"];

// ─── БОЛИ ВЛАДЕЛЬЦА → СЛОВА В ИМЕНАХ ФАЙЛОВ ───────────────────────────────────────────────
//
// Сканер не понимает код. Но имя файла у зрелого проекта почти всегда честное: файл про дедуп
// называется словом про дедуп. Этого достаточно, чтобы из тридцати тысяч файлов показать те
// сорок, с которых начинается разбор. Слова сгруппированы по НАШИМ болям, а не по чужим модулям,
// поэтому отчёт отвечает на вопрос «что отсюда взять», а не «что здесь лежит».
const PAIN_WORDS = [
  ["дедуп и похожесть", ["dedup", "duplicat", "similar", "distance", "levenshtein", "jaro", "simhash", "minhash", "fuzzy", "cosine", "overlap"]],
  ["память и факты", ["memory", "memories", "fact", "extract", "consolidat", "summar", "forget", "decay", "recall", "supersed", "invalidat"]],
  ["граф и связи", ["graph", "centrality", "louvain", "community", "cluster", "pagerank", "linkpred", "traversal", "neighbor"]],
  ["инсайты и паттерны", ["insight", "pattern", "trend", "anomal", "correlat", "signal", "digest"]],
  ["время и дата", ["chrono", "datetime", "dateparse", "recur", "rrule", "schedul", "timeline", "temporal"]],
  ["деньги", ["budget", "categor", "transaction", "ledger", "currency", "money", "amount", "payee", "reconcil", "envelope"]],
  ["голос и звук", ["transcri", "whisper", "vad", "speech", "audio", "diariz"]],
  ["поиск и разбор текста", ["tokeniz", "stem", "bm25", "rank", "index", "chunk", "splitter", "parser", "entity"]],
  ["экран", ["palette", "command", "dialog", "tooltip", "popover", "tree", "table", "drawer"]]
];

function isDir(path) {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function readTop(path, limit) {
  try { return readFileSync(path, "utf8").slice(0, limit || 8000); } catch { return ""; }
}

// ─── ЛИЦЕНЗИЯ ─────────────────────────────────────────────────────────────────────────────
//
// Читаем файлом. Это то самое правило, которое дважды спасло проект: tldraw оказался не MIT,
// originui — AGPL, и оба раза память утверждала обратное.
// Найденный дефект (2026-07-30): `classifyLicense` опознаёт MIT по ЗАГОЛОВКУ «MIT License», а
// канонический текст MIT его не содержит — он начинается с «Copyright (c) … Permission is hereby
// granted, free of charge». Из-за этого Actual Budget, Shoelace, SilverBullet и absurd-sql — все
// четыре MIT — получали вердикт «лицензия неизвестна → код брать нельзя». Это и есть механизм,
// которым разрешённые доноры годами уезжали в «только идеи».
//
// Ниже — распознавание по ТЕЛУ лицензии, применяемое только когда основной разбор сдался.
// Дубль правила временный: настоящее место починки — `core/donor-intake.mjs`, отдельным пакетом
// со спекой «MIT без заголовка не считается неизвестной лицензией».
const BODY_RULES = [
  { spdx: "MIT", test: /Permission is hereby granted, free of charge[\s\S]{0,400}without restriction/i },
  { spdx: "ISC", test: /Permission to use, copy, modify, and\/or distribute this software/i },
  { spdx: "BSD-3-Clause", test: /Neither the name of[\s\S]{0,200}may be used to endorse or promote/i }
];

function classifyByBody(text) {
  for (const row of BODY_RULES) {
    if (row.test.test(text)) return { spdx: row.spdx, codeAllowed: true, why: row.spdx + ": опознана по тексту лицензии, заголовка в файле нет" };
  }
  return null;
}

function readLicense(dir) {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return { spdx: "файла нет", codeAllowed: false, why: "LICENSE в корне не найден" }; }
  // Имена бывают любые: LICENSE, LICENSE.md, LICENSE.txt, LICENSE-MIT, COPYING. Точный список
  // всегда оказывается короче реальности, поэтому берём по началу имени.
  const file = entries.find((name) => LICENSE_NAMES.includes(name.toLowerCase()))
    || entries.find((name) => /^(licen[sc]e|copying)/i.test(name));
  if (!file) return { spdx: "файла нет", codeAllowed: false, why: "LICENSE в корне не найден — код не берём" };
  const text = readTop(join(dir, file), 12000);
  const verdict = classifyLicense(text);
  if (!verdict.codeAllowed && (verdict.spdx === "неизвестна" || !verdict.spdx)) {
    const fallback = classifyByBody(text);
    if (fallback) return { ...fallback, file };
  }
  return { spdx: verdict.spdx, codeAllowed: verdict.codeAllowed, why: verdict.why, file };
}

// ─── СТЕК ─────────────────────────────────────────────────────────────────────────────────
//
// По манифестам, а не по README: манифест не врёт и не устаревает так, как проза.
// Первая версия решала стек по манифесту — и ошибалась дважды подряд. `sherpa-onnx` (C++ с
// питоновской обвязкой) стал «Python», `hermes-agent` (Python) стал «JS/TS» из-за package.json в
// корне. Манифест говорит, чем проект СОБИРАЕТСЯ, а нам нужно, на чём он НАПИСАН. Поэтому решают
// файлы, а манифест остаётся только подсказкой.
const LANG_BY_EXT = [
  ["JS/TS", [".js", ".ts", ".mjs", ".tsx", ".jsx"]],
  ["Python", [".py"]],
  ["C/C++", [".cc", ".cpp", ".c", ".h", ".hpp"]],
  ["Rust", [".rs"]],
  ["Go", [".go"]],
  ["ClojureScript", [".cljs", ".clj", ".cljc"]],
  ["JVM", [".java", ".kt", ".scala"]]
];

function dominantLanguage(byExt) {
  let best = { lang: "не определён", count: 0 };
  for (const [lang, exts] of LANG_BY_EXT) {
    const count = exts.reduce((sum, ext) => sum + (byExt.get(ext) || 0), 0);
    if (count > best.count) best = { lang, count };
  }
  return best.lang;
}

// Второе разделение, которое первая версия смазала: наличие webpack/vite в devDependencies
// означает, что проект собирает СЕБЯ, а не что мы обязаны собирать его. jsQR, dinero.js,
// localForage отдают готовый файл в `dist` — их можно подключить тегом. Приложением (а значит
// донором приёмов, а не кода) считаем только то, где react-dom стоит в РАБОЧИХ зависимостях.
// Третья поправка. У монорепозитория корневой package.json пустой — ни `main`, ни `exports`, —
// и первая версия объявила библиотеки graphology, lit и mermaid «приложениями», то есть запретила
// брать их код. Признак приложения не в этом: приложение тянет фреймворк в РАБОЧИЕ зависимости.
// Поэтому смотрим все манифесты — корневой и подпакеты — и решаем по ним вместе.
function collectManifests(dir, entries) {
  const found = [];
  if (entries.includes("package.json")) found.push(join(dir, "package.json"));
  for (const holder of ["packages", "libs", "src"]) {
    if (!entries.includes(holder)) continue;
    let children = [];
    try { children = readdirSync(join(dir, holder)); } catch { continue; }
    for (const child of children.slice(0, 40)) {
      const candidate = join(dir, holder, child, "package.json");
      try { if (statSync(candidate).isFile()) found.push(candidate); } catch { /* нет манифеста — не подпакет */ }
    }
  }
  return found;
}

function isBrowserReady(dir, entries) {
  const manifests = collectManifests(dir, entries);
  if (!manifests.length) return false;
  let shippedSomewhere = false;
  for (const path of manifests) {
    let pkg = {};
    try { pkg = JSON.parse(readTop(path, 40000)); } catch { continue; }
    const runtime = pkg.dependencies || {};
    // Фреймворк в рабочих зависимостях — это приложение. Один такой подпакет решает за весь репо:
    // ошибка в эту сторону стоит вечера, ошибка в другую — чужого кода в нашем продукте.
    if (runtime["react-dom"] || runtime.next || runtime.svelte || runtime["@angular/core"]) return false;
    const shipped = [pkg.browser, pkg.unpkg, pkg.jsdelivr, pkg.module, pkg.main].filter(Boolean).join(" ");
    if (/dist|umd|esm|lib|\.js/i.test(shipped) || pkg.exports) shippedSomewhere = true;
  }
  return shippedSomewhere;
}

function detectStack(dir, entries, byExt) {
  const lang = dominantLanguage(byExt);
  if (lang !== "JS/TS") return lang;
  return isBrowserReady(dir, entries) ? "JS/TS" : "JS-приложение";
}

// ─── РАМПА ────────────────────────────────────────────────────────────────────────────────
//
// Единственная строка отчёта, ради которой он делается: КАК этот код может стать нашим.
function pickRamp(license, stack) {
  if (!license.codeAllowed) return { ramp: "ЗАПУСК", why: "код не копируем: " + license.why };
  if (stack === "JS/TS") return { ramp: "ЛИФТ", why: "лицензия разрешает, стек наш — переносим код" };
  if (stack === "JS-приложение") return { ramp: "ПАТТЕРН", why: "это приложение на фреймворке — берём приёмы и CSS, не файлы" };
  if (stack === "Rust" || stack === "C/C++") return { ramp: "WASM", why: "собирается в WASM, прецедент — whisper.cpp" };
  if (stack === "не определён") return { ramp: "ПОРТ", why: "стек не опознан — считаем переносом, пока не проверено" };
  return { ramp: "ПОРТ", why: stack + ": алгоритм переписываем на ванильный JS по тестам донора" };
}

// ─── ОБХОД ────────────────────────────────────────────────────────────────────────────────
//
// Один проход собирает и вес языков, и файлы-кандидаты: доноры весят до гигабайта, второй
// проход по ним стоил бы минуту на каждом.
function walk(dir, budget) {
  const byExt = new Map();
  const hits = new Map();
  let files = 0;
  const stack = [dir];
  while (stack.length && files < budget) {
    const current = stack.pop();
    let entries = [];
    try { entries = readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) stack.push(join(current, entry.name));
        continue;
      }
      files += 1;
      if (files >= budget) break;
      const ext = extname(entry.name).toLowerCase();
      if (ext) byExt.set(ext, (byExt.get(ext) || 0) + 1);
      const lower = entry.name.toLowerCase();
      // Кандидатами считаем только исходники: README со словом "memory" ничего не даёт.
      if (![".js", ".ts", ".mjs", ".py", ".rs", ".go", ".cc", ".cpp", ".h", ".cljs", ".java"].includes(ext)) continue;
      for (const [pain, words] of PAIN_WORDS) {
        if (!words.some((word) => lower.includes(word))) continue;
        const list = hits.get(pain) || [];
        if (list.length < 6) list.push(join(current, entry.name).slice(dir.length + 1).replace(/\\/g, "/"));
        hits.set(pain, list);
      }
    }
  }
  return { byExt, hits, files };
}

function topExtensions(byExt) {
  return [...byExt.entries()]
    .filter(([ext]) => [".js", ".ts", ".mjs", ".tsx", ".py", ".rs", ".go", ".cc", ".cpp", ".cljs", ".java", ".css"].includes(ext))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ext, count]) => ext.slice(1) + " " + count)
    .join(" · ");
}

function scanOne(name) {
  const dir = join(REPOS_DIR, name);
  let entries = [];
  try { entries = readdirSync(dir); } catch { return null; }
  // Архивы GitHub кладут содержимое в единственную вложенную папку — разворачиваем на уровень.
  const inner = entries.length === 1 && isDir(join(dir, entries[0])) ? join(dir, entries[0]) : dir;
  const innerEntries = inner === dir ? entries : readdirSync(inner);
  const license = readLicense(inner);
  // Обход идёт ПЕРВЫМ: стек решается по весу исходников, а не по манифесту (см. detectStack).
  const walked = walk(inner, 60000);
  const stack = detectStack(inner, innerEntries, walked.byExt);
  const ramp = pickRamp(license, stack);
  return { name, license, stack, ramp, files: walked.files, languages: topExtensions(walked.byExt), hits: walked.hits };
}

function renderReport(rows) {
  const lines = [];
  lines.push("# Перепись доноров на диске");
  lines.push("");
  lines.push("Сгенерировано `tools/donor-scan.mjs` по папкам в `research/repos`. Лицензия прочитана");
  lines.push("файлом, стек определён по манифесту, рампа выведена из них двоих. Это отчёт о файлах,");
  lines.push("а не о том, что кто-то помнит про эти проекты.");
  lines.push("");
  lines.push("| Донор | Лицензия | Стек | Рампа | Файлов | Языки |");
  lines.push("|---|---|---|---|---|---|");
  for (const row of rows) {
    lines.push("| " + [row.name, row.license.spdx, row.stack, "**" + row.ramp.ramp + "**", row.files, row.languages || "—"].join(" | ") + " |");
  }
  lines.push("");
  lines.push("## Что откуда брать");
  lines.push("");
  for (const row of rows) {
    if (!row.hits.size) continue;
    lines.push("### " + row.name + " — " + row.ramp.ramp);
    lines.push("");
    lines.push("_" + row.ramp.why + "_");
    lines.push("");
    for (const [pain, files] of row.hits) {
      lines.push("- **" + pain + "**: `" + files.join("` · `") + "`");
    }
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  if (!isDir(REPOS_DIR)) {
    console.log("Папки research/repos нет — распаковывать нечего.");
    process.exit(1);
  }
  const names = readdirSync(REPOS_DIR).filter((name) => isDir(join(REPOS_DIR, name))).sort();
  const rows = [];
  for (const name of names) {
    const row = scanOne(name);
    if (!row) continue;
    rows.push(row);
    console.log(
      basename(name).padEnd(22),
      String(row.license.spdx).padEnd(14),
      String(row.stack).padEnd(14),
      row.ramp.ramp.padEnd(8),
      String(row.files).padStart(6) + " файлов"
    );
  }
  writeFileSync(REPORT_PATH, renderReport(rows) + "\n", "utf8");
  const byRamp = new Map();
  for (const row of rows) byRamp.set(row.ramp.ramp, (byRamp.get(row.ramp.ramp) || 0) + 1);
  console.log("");
  console.log("Доноров:", rows.length, "·", [...byRamp.entries()].map(([ramp, count]) => ramp + " " + count).join(" · "));
  console.log("Отчёт:", REPORT_PATH);
}

main();

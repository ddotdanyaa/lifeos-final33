// П7 · РАЗМЕР МОДУЛЕЙ. Цель плана — ни одного файла больше 80 КБ. Сегодня `app.js` в двадцать
// раз больше, и это не стилистика: файл такого размера нельзя ни прочитать целиком, ни держать
// в контексте, ни править двумя сессиями одновременно (блокировка Б-V).
//
// Аудит не требует достичь цели сразу — он требует ДВИГАТЬСЯ К НЕЙ. Планка лежит в
// `docs/qc/module-size-baseline.json` и опускается только явным `--write-baseline` после
// настоящего выноса. Файл вырос — красный, и неважно, насколько удобно было дописать «ещё сюда».
//
// Почему именно так, а не «запретить больше 80 КБ прямо сейчас»: запрет, который невозможно
// соблюсти, обходят. Планка, которая только опускается, — нет.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const TARGET_KB = 80;
const BASELINE = "docs/qc/module-size-baseline.json";
const ROOTS = ["app.js", "server.mjs", "smoke.mjs", "service-worker.js", "artifact-os-architecture.mjs", "core", "ui"];
const SKIP_DIRS = new Set(["vendor", "workers"]);

function walk(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return /\.(js|mjs)$/.test(path) ? [path] : [];
  const files = [];
  for (const name of readdirSync(path)) {
    if (SKIP_DIRS.has(name)) continue;
    files.push(...walk(join(path, name)));
  }
  return files;
}

const files = ROOTS.flatMap(walk).map((path) => {
  const bytes = Buffer.byteLength(readFileSync(path, "utf8"), "utf8");
  return { file: path.replace(/\\/g, "/"), kb: Math.round(bytes / 1024) };
}).sort((a, b) => b.kb - a.kb);

const over = files.filter((row) => row.kb > TARGET_KB);
const total = files.reduce((sum, row) => sum + row.kb, 0);
const biggest = files[0] || { file: "—", kb: 0 };

const summary = {
  audit: "module-size",
  "цель, КБ": TARGET_KB,
  файлов: files.length,
  "суммарно, КБ": total,
  "больше цели": over.length,
  "самый большой": biggest.file,
  "его размер, КБ": biggest.kb
};

console.log(JSON.stringify(summary, null, 2));

if (over.length) {
  console.log("\nБольше " + TARGET_KB + " КБ (" + over.length + "):");
  for (const row of over) console.log("  " + String(row.kb).padStart(5) + " КБ  " + row.file);
  console.log("\nЭто и есть работа П7. Она не про красоту: файл, который не влезает в контекст,");
  console.log("нельзя ни прочитать целиком, ни править двумя сессиями сразу.");
}

if (process.argv.includes("--write-baseline")) {
  writeFileSync(BASELINE, JSON.stringify({ measuredAt: new Date().toISOString().slice(0, 10), targetKb: TARGET_KB, files }, null, 2) + "\n", "utf8");
  console.log("\nПланка записана в " + BASELINE + ".");
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null;
if (baseline) {
  const was = new Map(baseline.files.map((row) => [row.file, row.kb]));
  // Правило раскола, а не просто «не расти»: при выносе модули ОБЯЗАНЫ расти — код переезжает
  // в них. Красный только там, где рост идёт против цели: вырос файл, который уже больше 80 КБ,
  // или вырос модуль, перевалив за неё. Мелкие колебания в пару килобайт — не событие.
  const grew = files.filter((row) => {
    if (!was.has(row.file)) return false;
    const delta = row.kb - was.get(row.file);
    if (delta <= 2) return false;
    return row.kb > TARGET_KB;
  });
  if (grew.length) {
    console.error("\nФайлы выросли относительно замера от " + baseline.measuredAt + ":");
    for (const row of grew) console.error("  " + row.file + ": " + was.get(row.file) + " → " + row.kb + " КБ");
    console.error("Файл и так больше цели — расти ему некуда. Либо выноси из него, либо, если");
    console.error("рост осознан, опусти планку явно:");
    console.error("  node tools/audit-module-size.mjs --write-baseline");
    process.exit(1);
  }
}

console.log("\naudit:module-size passed");

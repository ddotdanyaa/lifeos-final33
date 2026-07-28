// П10–П11 · СВЯЗЬ КОДА С ДОНОРСКОЙ БАЗОЙ, СВЕРЯЕМАЯ В ОБЕ СТОРОНЫ.
//
// Каталог доноров бесполезен, если про него забыли через неделю. Он становится живым только
// когда у решения в коде есть обратная ссылка на источник, и обе стороны проверяются машиной:
//
//   → сторона кода: маркер `@donor Mem0:importance-scoring` обязан существовать в каталоге.
//     Иначе маркер врёт: ссылается на разбор, которого нет.
//   → сторона каталога: строка со статусом «✔ уже есть» утверждает, что функция У НАС
//     РЕАЛИЗОВАНА. Если в коде нет ни одного маркера на неё, это утверждение ничем не держится
//     и однажды окажется неправдой, которую никто не заметил.
//
// П11 (свежесть): маркер, чья строка в каталоге перестала быть «✔ уже есть» или «🔸», помечается
// устаревшим — донорское решение ушло, а ссылка на него в коде осталась.
//
// Планка — файл `docs/qc/donor-links-baseline.json`. Аудит краснеет, когда стало ХУЖЕ: маркеров
// меньше, ложных ссылок больше. Снижается планка только явным `--write-baseline`.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const CATALOG = "docs/DONOR_FUNCTION_CATALOG.md";
const DONOR_DIR = "docs/context/donors";
const BASELINE = "docs/qc/donor-links-baseline.json";
const CODE_ROOTS = ["app.js", "ui", "tools"];
// Сам аудит и поисковик по проблемам говорят о маркерах, а не носят их: иначе инструмент
// находит собственный текст и объявляет его ложной ссылкой.
const SELF = new Set(["audit-donor-links.mjs", "donor-lookup.mjs"]);

function slug(text) {
  return String(text || "")
    .toLocaleLowerCase("ru-RU")
    .replace(/[`*]/g, "")
    .replace(/[^0-9a-zа-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function walk(path) {
  const files = [];
  if (!existsSync(path)) return files;
  if (statSync(path).isFile()) return [path];
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.(js|mjs)$/.test(full)) files.push(full);
  }
  return files;
}

// ─── Каталог: донор → функции со статусом применимости ────────────────────────────────────
const catalogText = existsSync(CATALOG) ? readFileSync(CATALOG, "utf8") : "";
if (!catalogText) {
  console.error("Нет каталога доноров " + CATALOG + ".");
  process.exit(1);
}
const catalog = new Map();
let currentDonor = "";
for (const rawLine of catalogText.split(/\r?\n/)) {
  const head = rawLine.match(/^###\s+([^(—]+)/);
  if (head) { currentDonor = slug(head[1]); continue; }
  if (!currentDonor || !rawLine.startsWith("|")) continue;
  const cells = rawLine.split("|").map((cell) => cell.trim());
  if (cells.length < 4) continue;
  const name = cells[1];
  if (!name || /^-+$/.test(name) || name === "Функция") continue;
  const applicability = cells[3] || "";
  catalog.set(currentDonor + ":" + slug(name), {
    donor: currentDonor,
    fn: name,
    applicability,
    done: applicability.includes("✔"),
    partial: applicability.includes("🔸"),
    outOfStack: applicability.includes("⛔")
  });
}

// ─── Код: маркеры @donor ──────────────────────────────────────────────────────────────────
const markers = [];
for (const root of CODE_ROOTS) {
  for (const file of walk(root)) {
    if (SELF.has(file.split(/[\\/]/).pop())) continue;
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/@donor\s+([A-Za-zА-Яа-яЁё0-9 .+-]+?):([A-Za-zА-Яа-яЁё0-9 _.+-]+)/g)) {
      const line = text.slice(0, match.index).split("\n").length;
      markers.push({ file, line, donor: slug(match[1]), fn: slug(match[2]), raw: match[0].trim() });
    }
  }
}

// ─── Сверка в обе стороны ─────────────────────────────────────────────────────────────────
const unknownMarkers = [];
const staleMarkers = [];
const covered = new Set();
for (const marker of markers) {
  const key = marker.donor + ":" + marker.fn;
  const row = catalog.get(key);
  if (!row) { unknownMarkers.push(marker.file + ":" + marker.line + " → " + marker.raw + " (в каталоге такой строки нет)"); continue; }
  covered.add(key);
  if (row.outOfStack) staleMarkers.push(marker.file + ":" + marker.line + " → " + marker.raw + " (каталог: ⛔ вне стека — решение ушло, ссылка осталась)");
}

const claimedDone = [...catalog.entries()].filter(([, row]) => row.done);
const claimedWithoutMarker = claimedDone.filter(([key]) => !covered.has(key));

// ─── Донорские брифы: их доноры обязаны существовать в каталоге ───────────────────────────
const briefProblems = [];
const briefUnknown = [];
if (existsSync(DONOR_DIR)) {
  for (const name of readdirSync(DONOR_DIR).filter((file) => file.endsWith(".donor.md"))) {
    const text = readFileSync(join(DONOR_DIR, name), "utf8");
    const problem = (text.match(/^problem:\s*(.+)$/m) || [])[1] || name;
    briefProblems.push(problem.trim());
    const block = text.match(/donors:\r?\n([\s\S]*?)\r?\n[a-z_]+:/);
    for (const entry of (block ? block[1] : "").split(/\r?\n/)) {
      const value = entry.replace(/^\s*-\s+/, "").trim();
      if (!value) continue;
      const [donor, fn] = value.split(":");
      if (!fn) continue;
      if (!catalog.has(slug(donor) + ":" + slug(fn))) briefUnknown.push(name + " → " + value);
    }
  }
}

const summary = {
  audit: "donor-links",
  catalogRows: catalog.size,
  catalogClaimedDone: claimedDone.length,
  markersInCode: markers.length,
  markersUnknown: unknownMarkers.length,
  markersStale: staleMarkers.length,
  claimedDoneWithoutMarker: claimedWithoutMarker.length,
  donorBriefs: briefProblems.length,
  briefDonorsUnknown: briefUnknown.length
};
console.log(JSON.stringify(summary, null, 2));

if (process.argv.includes("--write-baseline")) {
  writeFileSync(BASELINE, JSON.stringify({ measuredAt: new Date().toISOString().slice(0, 10), summary }, null, 2) + "\n", "utf8");
  console.log("Baseline written to " + BASELINE);
  process.exit(0);
}

// Ложная ссылка — всегда красный, независимо от планки: она врёт прямо сейчас.
if (unknownMarkers.length) {
  console.error("Маркеры @donor, которых нет в каталоге:\n" + unknownMarkers.join("\n"));
  process.exit(1);
}
if (staleMarkers.length) {
  console.error("Устаревшие маркеры @donor (донорское решение ушло из стека):\n" + staleMarkers.join("\n"));
  process.exit(1);
}
if (briefUnknown.length) {
  console.error("Донорские брифы ссылаются на функции, которых нет в каталоге:\n" + briefUnknown.join("\n"));
  process.exit(1);
}

// Непокрытые «✔ уже есть» — долг, а не ложь: планка не даёт ему расти.
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null;
if (baseline) {
  if (summary.markersInCode < baseline.summary.markersInCode) {
    console.error("Маркеров @donor стало меньше: " + summary.markersInCode + " против " + baseline.summary.markersInCode + " (замер " + baseline.measuredAt + ")");
    process.exit(1);
  }
  if (summary.claimedDoneWithoutMarker > baseline.summary.claimedDoneWithoutMarker) {
    console.error("Каталог заявляет «✔ уже есть» без маркера в коде чаще прежнего: "
      + summary.claimedDoneWithoutMarker + " против " + baseline.summary.claimedDoneWithoutMarker);
    process.exit(1);
  }
}
console.log("audit:donor-links passed");

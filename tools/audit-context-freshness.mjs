// П8 · СВЕЖЕСТЬ БРИФОВ.
//
// Бриф подсистемы дешевле репозитория в двести раз — и ровно поэтому опасен. Устаревший бриф
// не молчит: он уверенно рассказывает то, чего в коде уже нет, и планировщик строит на этом
// пакет. Дешёвый контекст имеет смысл только вместе с механизмом, который ловит его протухание.
//
// Правило одно: бриф обязан быть НЕ СТАРШЕ последнего изменения кода, который он описывает.
// Возраст берём из git (дата последнего коммита файла), а не из mtime: mtime врёт после любого
// клона, checkout и сборки. Для незакоммиченных правок берём mtime — он там единственная правда.
//
// Формат брифа — фронтматтер:
//   ---
//   subsystem: capture-analyzer
//   covers:
//     - app.js:5500-6100
//     - ui/library.js
//   ---
// Диапазон строк после двоеточия — подсказка человеку; свежесть считается по файлу целиком.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const BRIEF_DIR = "docs/context";

function gitTimestamp(path) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", path], { encoding: "utf8" }).trim();
    return out ? Number(out) * 1000 : 0;
  } catch {
    return 0;
  }
}

// Незакоммиченная правка новее любого коммита — иначе бриф считался бы свежим ровно в тот
// момент, когда код при нём меняют.
function effectiveTimestamp(path) {
  if (!existsSync(path)) return 0;
  const committed = gitTimestamp(path);
  let dirty = 0;
  try {
    const status = execFileSync("git", ["status", "--porcelain", "--", path], { encoding: "utf8" }).trim();
    if (status) dirty = statSync(path).mtimeMs;
  } catch {
    dirty = 0;
  }
  return Math.max(committed, dirty);
}

function parseFrontmatter(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const meta = { subsystem: "", covers: [] };
  let inCovers = false;
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (/^covers:\s*$/.test(line)) { inCovers = true; continue; }
    if (inCovers && /^\s*-\s+/.test(line)) {
      meta.covers.push(line.replace(/^\s*-\s+/, "").trim());
      continue;
    }
    inCovers = false;
    const pair = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (pair) meta[pair[1]] = pair[2].trim();
  }
  return meta;
}

if (!existsSync(BRIEF_DIR)) {
  console.error("Нет каталога брифов " + BRIEF_DIR + ": планировщик остаётся без дешёвого контекста (П8).");
  process.exit(1);
}

const briefs = readdirSync(BRIEF_DIR).filter((name) => name.endsWith(".brief.md"));
if (!briefs.length) {
  console.error("В " + BRIEF_DIR + " нет ни одного *.brief.md.");
  process.exit(1);
}

const rows = [];
const stale = [];
const broken = [];
for (const name of briefs) {
  const path = join(BRIEF_DIR, name);
  const text = readFileSync(path, "utf8");
  const meta = parseFrontmatter(text);
  if (!meta || !meta.subsystem || !meta.covers.length) {
    broken.push(name + ": нет фронтматтера с subsystem и covers");
    continue;
  }
  const briefAt = effectiveTimestamp(path);
  const words = text.split(/\s+/).filter(Boolean).length;
  let newestCode = 0;
  let newestFile = "";
  const missing = [];
  for (const entry of meta.covers) {
    const file = entry.split(":")[0].trim();
    if (!existsSync(file)) { missing.push(file); continue; }
    const at = effectiveTimestamp(file);
    if (at > newestCode) { newestCode = at; newestFile = file; }
  }
  if (missing.length) broken.push(name + ": описывает несуществующие файлы — " + missing.join(", "));
  rows.push({ brief: name, subsystem: meta.subsystem, words, covers: meta.covers.length });
  if (newestCode > briefAt) {
    stale.push(name + ": код новее брифа (" + newestFile + " изменён "
      + new Date(newestCode).toISOString().slice(0, 10) + ", бриф — "
      + new Date(briefAt).toISOString().slice(0, 10) + ")");
  }
}

console.log(JSON.stringify({ audit: "context-freshness", briefs: rows }, null, 2));

if (broken.length) {
  console.error("Брифы без контракта:\n" + broken.join("\n"));
  process.exit(1);
}
if (stale.length) {
  console.error("Устаревшие брифы (код ушёл вперёд — перечитай подсистему и обнови бриф):\n" + stale.join("\n"));
  process.exit(1);
}
console.log("audit:context-freshness passed");

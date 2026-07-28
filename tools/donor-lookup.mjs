// П12 · ЗАПРОС ПО ПРОБЛЕМЕ.
//
// Смысл донорской базы не в том, что она есть, а в том, что к ней можно обратиться СЛОВАМИ
// ЗАДАЧИ. «Вытеснение памяти» должно возвращать три абзаца готового решения, а не отправлять
// читать 1150 строк каталога и решать заново то, что уже решено.
//
// Запуск:
//   node tools/donor-lookup.mjs вытеснение памяти
//   node tools/donor-lookup.mjs --list
//
// Поиск идёт по проблеме и её синонимам из фронтматтера, затем по тексту брифа. Ничего не
// нашлось — так и говорим, и подсказываем, что каталог придётся читать: выдумывать ответ
// нельзя (то же правило, что и для продукта).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DONOR_DIR = "docs/context/donors";
const CATALOG = "docs/DONOR_FUNCTION_CATALOG.md";

function parseFrontmatter(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const meta = { problem: "", aliases: [], donors: [], updated: "" };
  let list = "";
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const listHead = line.match(/^(aliases|donors):\s*$/);
    if (listHead) { list = listHead[1]; continue; }
    if (list && /^\s*-\s+/.test(line)) { meta[list].push(line.replace(/^\s*-\s+/, "").trim()); continue; }
    list = "";
    const pair = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (pair) meta[pair[1]] = pair[2].trim();
  }
  return { meta, body: match[2] };
}

function normalize(text) {
  return String(text || "").toLocaleLowerCase("ru-RU").replace(/[^0-9a-zа-яё]+/gi, " ").trim();
}

if (!existsSync(DONOR_DIR)) {
  console.error("Нет каталога донорских брифов " + DONOR_DIR + ".");
  process.exit(1);
}

const briefs = readdirSync(DONOR_DIR)
  .filter((name) => name.endsWith(".donor.md"))
  .map((name) => {
    const parsed = parseFrontmatter(readFileSync(join(DONOR_DIR, name), "utf8"));
    return parsed ? { name, ...parsed } : null;
  })
  .filter(Boolean);

const args = process.argv.slice(2);
if (!args.length || args.includes("--list")) {
  console.log("Донорские брифы по проблемам (" + briefs.length + "):\n");
  for (const brief of briefs) {
    console.log("  " + brief.meta.problem);
    console.log("    синонимы: " + (brief.meta.aliases.join(", ") || "—"));
    console.log("    доноры:   " + brief.meta.donors.join(", "));
    console.log("    файл:     " + join(DONOR_DIR, brief.name) + "\n");
  }
  console.log("Запрос: node tools/donor-lookup.mjs <слова задачи>");
  process.exit(0);
}

const query = normalize(args.join(" "));
const words = query.split(/\s+/).filter((word) => word.length >= 4);

function score(brief) {
  const problem = normalize(brief.meta.problem);
  const aliases = brief.meta.aliases.map(normalize);
  const donors = brief.meta.donors.map(normalize).join(" ");
  const body = normalize(brief.body);
  let points = 0;
  if (problem === query) points += 100;
  if (problem.includes(query) || query.includes(problem)) points += 50;
  for (const alias of aliases) {
    if (alias === query) points += 60;
    else if (query.includes(alias) || alias.includes(query)) points += 30;
  }
  for (const word of words) {
    if (problem.includes(word)) points += 12;
    if (aliases.some((alias) => alias.includes(word))) points += 10;
    if (donors.includes(word)) points += 6;
    if (body.includes(word)) points += 2;
  }
  return points;
}

const ranked = briefs
  .map((brief) => ({ brief, points: score(brief) }))
  .filter((row) => row.points > 0)
  .sort((a, b) => b.points - a.points);

if (!ranked.length) {
  console.log("По запросу «" + args.join(" ") + "» готового разбора нет.");
  console.log("Это честный ответ, а не пустой: значит проблему ещё не разбирали.");
  console.log("Дальше — каталог " + CATALOG + " и цикл RDD из research/README.md,");
  console.log("а результат разбора кладётся сюда новым файлом " + DONOR_DIR + "/<проблема>.donor.md.");
  process.exit(0);
}

const best = ranked[0].brief;
console.log("═".repeat(78));
console.log("ПРОБЛЕМА: " + best.meta.problem + "   (обновлено " + (best.meta.updated || "—") + ")");
console.log("ДОНОРЫ:   " + best.meta.donors.join(", "));
console.log("ИСТОЧНИК: " + join(DONOR_DIR, best.name) + "  ←  " + CATALOG);
console.log("═".repeat(78));
console.log(best.body.trim());
if (ranked.length > 1) {
  console.log("\n" + "─".repeat(78));
  console.log("Рядом: " + ranked.slice(1, 4).map((row) => "«" + row.brief.meta.problem + "»").join(", "));
}

// П31 · ЗДОРОВЬЕ ДОНОРОВ. Донорский разбор — снимок чужого проекта на конкретный день. Проекты
// живут дальше: Mem0 меняет скоринг, Graphiti переписывает инвалидацию фактов, LlamaIndex
// выкидывает целые слои. Через полгода наш «разбор лучших практик» описывает то, чего у донора
// уже нет, — и мы уверенно строим на позапрошлогоднем решении.
//
// Аудит не ходит в сеть сам (CLAUDE.md §7: никаких скрытых сетевых вызовов). Он считает ВОЗРАСТ
// проверки, записанный в самом каталоге («Проверено 2026-07-22: github.com/...»), и говорит,
// какие записи пора перепроверить и как именно.
//
// Порог — не вкус: полгода это срок, за который у активного проекта меняется мажорная версия.
// Красным аудит становится только когда протухла ПОЛОВИНА базы: одна старая запись это норма
// жизни, половина — значит база перестала быть знанием и стала архивом.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const CATALOG = "docs/DONOR_FUNCTION_CATALOG.md";
const DONOR_DIR = "docs/context/donors";
const STALE_DAYS = 180;
const RED_SHARE = 0.5;

if (!existsSync(CATALOG)) {
  console.error("Нет каталога доноров " + CATALOG + ".");
  process.exit(1);
}

const text = readFileSync(CATALOG, "utf8");
const lines = text.split(/\r?\n/);

// «Проверено 2026-07-22: github.com/logseq/logseq. Лицензия MIT…» — строка происхождения, которую
// авторы каталога ставили под каждым донором. Она и есть дата снимка.
const checks = [];
let currentDonor = "";
lines.forEach((line, index) => {
  const head = line.match(/^###\s+([^(—]+)/);
  if (head) currentDonor = head[1].trim();
  const match = line.match(/Проверено\s+(\d{4}-\d{2}-\d{2})\s*:?\s*(.*)$/i);
  if (!match) return;
  const at = Date.parse(match[1] + "T00:00:00");
  if (!Number.isFinite(at)) return;
  const source = (match[2] || "").replace(/\.\s*$/, "").trim();
  checks.push({
    donor: currentDonor || "?",
    checkedAt: match[1],
    ageDays: Math.round((Date.now() - at) / 86400000),
    source,
    line: index + 1
  });
});

if (!checks.length) {
  console.error("В каталоге нет ни одной строки «Проверено ГГГГ-ММ-ДД: …» — значит неизвестно,");
  console.error("когда его писали, и доверять ему нельзя вовсе.");
  process.exit(1);
}

// Донорские брифы ссылаются на конкретные функции каталога. Если донор протух, протухли и они —
// это и есть «предложение пересмотра»: не абстрактное «обновите базу», а список того, что читать.
const briefsByDonor = new Map();
if (existsSync(DONOR_DIR)) {
  for (const name of readdirSync(DONOR_DIR).filter((file) => file.endsWith(".donor.md"))) {
    const brief = readFileSync(join(DONOR_DIR, name), "utf8");
    const block = brief.match(/donors:\r?\n([\s\S]*?)\r?\n[a-z_]+:/);
    for (const row of (block ? block[1] : "").split(/\r?\n/)) {
      const value = row.replace(/^\s*-\s+/, "").trim();
      const donor = value.split(":")[0];
      if (!donor) continue;
      if (!briefsByDonor.has(donor)) briefsByDonor.set(donor, new Set());
      briefsByDonor.get(donor).add(name);
    }
  }
}

const stale = checks.filter((row) => row.ageDays > STALE_DAYS).sort((a, b) => b.ageDays - a.ageDays);

console.log(JSON.stringify({
  audit: "donor-health",
  доноров: checks.length,
  "порог свежести, дней": STALE_DAYS,
  устарело: stale.length,
  "самая старая запись, дней": checks.reduce((max, row) => Math.max(max, row.ageDays), 0)
}, null, 2));

if (stale.length) {
  console.log("\nПора перепроверить (апстрим мог уйти вперёд):");
  for (const row of stale) {
    const affected = [...(briefsByDonor.get(row.donor) || [])];
    console.log("  " + row.donor + " — проверено " + row.checkedAt + " (" + row.ageDays + " дней назад)");
    if (row.source) console.log("      источник: " + row.source);
    if (affected.length) console.log("      на нём стоят разборы: " + affected.join(", "));
  }
  console.log("\nЧто делать: открыть источник, сверить изменившееся, обновить строку «Проверено»");
  console.log("и — если решение донора изменилось — переписать соответствующий *.donor.md.");
  console.log("Аудит в сеть не ходит и за вас этого не сделает: он только не даёт забыть.");
}

if (stale.length / checks.length >= RED_SHARE) {
  console.error("\nУстарела половина донорской базы (" + stale.length + " из " + checks.length + "):");
  console.error("она перестала быть знанием и стала архивом. Строить на ней новые пакеты нельзя.");
  process.exit(1);
}

console.log("\naudit:donor-health passed");

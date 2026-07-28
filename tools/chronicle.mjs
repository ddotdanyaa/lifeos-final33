// П28 · ЛЕТОПИСЬ и П30 · ЦЕНА ЗА ПРИНЯТЫЙ ПАКЕТ.
//
// PROGRESS.md — рассказ для человека, и он для этого и нужен. Но по нему нельзя посчитать, что
// на самом деле происходит с работой: какой гейт ловит чаще всего, сколько попыток уходит на
// пакет, растёт ли цена. Летопись — те же события, но числами: одна строка JSON на событие.
//
// Что она отвечает (и чего не отвечает PROGRESS.md):
//   • какой гейт поймал больше всего — значит именно там продукт ломается чаще;
//   • сколько попыток стоит средний пакет — растёт ли сопротивление материала;
//   • сколько пакетов дошло до merge, а сколько ушло в BLOCKED;
//   • цена за принятый пакет — минуты и попытки, видимые числом.
//
// Цена НЕ становится метрикой, которую система оптимизирует (П30 прямо это запрещает): она
// пишется в леджер, чтобы владелец видел число, а не чтобы петля училась его уменьшать. Дешёвый
// пакет, который не закрыл боль, — не достижение.
//
// Запуск:
//   node tools/chronicle.mjs              # сводка
//   node tools/chronicle.mjs --ledger     # строка для PROGRESS.md
import { existsSync, readFileSync } from "node:fs";

const FILE = "docs/qc/DISPATCHER_CHRONICLE.jsonl";

if (!existsSync(FILE)) {
  console.log("Летописи ещё нет: " + FILE);
  console.log("Она заполняется диспетчером (tools/dispatcher.mjs) — пока пакеты запускает владелец");
  console.log("руками, писать в неё нечего, и выдумывать записи нельзя.");
  process.exit(0);
}

const rows = readFileSync(FILE, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

if (!rows.length) {
  console.log("Летопись пуста.");
  process.exit(0);
}

const merged = rows.filter((row) => row.event === "merged");
const blocked = rows.filter((row) => row.event === "blocked");
const gateRed = rows.filter((row) => row.event === "gate-red");
const gateGreen = rows.filter((row) => row.event === "gate-green");
const sessions = rows.filter((row) => row.event === "session-end");

// Какой гейт ловит чаще — там и ломается продукт. Это самая полезная строка отчёта: она
// показывает не «где мы ошибаемся», а «где у продукта тонко».
const byGate = new Map();
for (const row of gateRed) {
  const key = row.gate || "?";
  byGate.set(key, (byGate.get(key) || 0) + 1);
}

const attempts = merged.map((row) => Number(row.attempts || 1));
const avgAttempts = attempts.length ? attempts.reduce((sum, value) => sum + value, 0) / attempts.length : 0;
const totalMs = sessions.reduce((sum, row) => sum + Number(row.spentMs || 0), 0);
const minutesPerMerged = merged.length ? Math.round(totalMs / 60000 / merged.length) : 0;

const summary = {
  события: rows.length,
  сессий: sessions.length,
  влито: merged.length,
  заблокировано: blocked.length,
  "гейт зелёный": gateGreen.length,
  "гейт красный": gateRed.length,
  "попыток на принятый пакет": Number(avgAttempts.toFixed(2)),
  "минут на принятый пакет": minutesPerMerged
};

if (process.argv.includes("--ledger")) {
  // Одна строка для PROGRESS.md — ровно та, которую владелец должен увидеть числом.
  console.log("**Цена работы (летопись, " + sessions.length + " ноч" + (sessions.length === 1 ? "ь" : "ей") + "):** "
    + merged.length + " пакетов принято, " + blocked.length + " заблокировано, "
    + avgAttempts.toFixed(1) + " попытк(и) и ~" + minutesPerMerged + " минут на принятый пакет. "
    + "Число видно, но система его не оптимизирует: дешёвый пакет, не закрывший боль, — не достижение.");
  process.exit(0);
}

console.log(JSON.stringify(summary, null, 2));

if (byGate.size) {
  console.log("\nЧаще всего ловит:");
  for (const [gate, count] of [...byGate.entries()].sort((a, b) => b[1] - a[1])) {
    console.log("  " + gate + ": " + count + " раз");
  }
  console.log("\nЭто не список наших ошибок, а карта тонких мест продукта: там, где гейт срабатывает");
  console.log("чаще, продукт ломается легче — и туда стоит смотреть раньше остального.");
}

if (blocked.length) {
  console.log("\nЗаблокированные пакеты (три провала, ждут владельца):");
  for (const row of blocked) console.log("  " + row.task + "  → ветка " + row.branch);
}

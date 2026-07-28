// П27 · ДИСПЕТЧЕР. Запуск пакета — ручное действие владельца, поэтому работа идёт только когда
// он за ноутбуком. Диспетчер снимает эту блокировку: берёт первый неотмеченный пакет очереди,
// запускает исполнителя, гоняет гейт и мержит только по зелёному.
//
// Он намеренно скучный и трусливый. Автономность без тормозов — это не скорость, а способ
// быстро наделать того, что потом никто не разберёт. Отсюда шесть ограничителей:
//
//   1. ОКНО. Работает только в заданные часы (по умолчанию 01:00–07:00). Вне окна — молча выходит.
//   2. СТОП-ФАЙЛ. Перед КАЖДЫМ пакетом проверяется `.dispatcher-stop`. Появился — работа
//      прекращается немедленно, без вопросов и без «доделаю этот».
//   3. БЮДЖЕТ. Не больше заданной доли окна (по умолчанию 50%). Кончился — стоп до завтра.
//   4. ВЕТКА. Каждый пакет — своя ветка от текущей. Merge только после зелёного гейта.
//   5. ТРИ ПРОВАЛА. Пакет, упавший трижды, помечается BLOCKED, и диспетчер идёт дальше, а не
//      бьётся в него до утра.
//   6. ПОЛИТИКА ПРИЁМКИ (П29). Зелёный гейт доказывает, что ничего не сломано, но НЕ доказывает,
//      что сделано нужное. Сливается сам только тот вид работы, который владелец включил
//      политикой; необратимое — никогда.
//
// Владелец в петле остаётся всегда (И-1): диспетчер не решает, что делать, — он исполняет
// очередь, которую составил владелец, и отчитывается о том, что вышло.
//
// Запуск:
//   node tools/dispatcher.mjs --dry-run     # показать план и выйти, ничего не запуская
//   node tools/dispatcher.mjs               # рабочий прогон
//   node tools/dispatcher.mjs --now         # игнорировать окно (для ручного запуска днём)
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";

const CONFIG = {
  queueFile: "docs/LIFEOS_V1_5_SELF_BUILDING_PLAN.md",
  ledgerFile: "PROGRESS.md",
  chronicleFile: "docs/qc/DISPATCHER_CHRONICLE.jsonl",
  policyFile: "docs/qc/acceptance-policy.json",
  stopFile: ".dispatcher-stop",
  windowStartHour: 1,
  windowEndHour: 7,
  budgetShare: 0.5,
  maxFailures: 3,
  packageTimeoutMs: 45 * 60 * 1000
};

const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");
const ignoreWindow = flags.has("--now");

function log(line) {
  console.log(new Date().toISOString().slice(11, 19) + "  " + line);
}

function sh(command, options) {
  return execSync(command, Object.assign({ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }, options || {}));
}

// ─── Ограничитель 1: окно ─────────────────────────────────────────────────────────────────
function insideWindow(date) {
  const hour = date.getHours();
  const { windowStartHour: from, windowEndHour: to } = CONFIG;
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
}

// ─── Ограничитель 2: стоп-файл ────────────────────────────────────────────────────────────
// Проверяется ПЕРЕД каждым пакетом, а не один раз на старте: владелец должен уметь остановить
// ночную работу, не дожидаясь утра и не убивая процесс.
function stopRequested() {
  if (!existsSync(CONFIG.stopFile)) return "";
  return (readFileSync(CONFIG.stopFile, "utf8") || "").trim() || "владелец остановил работу";
}

// ─── Ограничитель 3: бюджет ───────────────────────────────────────────────────────────────
function budgetMs() {
  const { windowStartHour: from, windowEndHour: to, budgetShare } = CONFIG;
  const hours = from <= to ? to - from : 24 - from + to;
  return Math.round(hours * 3600 * 1000 * budgetShare);
}

// ─── Очередь ──────────────────────────────────────────────────────────────────────────────
// Пакет — строка плана с невыполненным чекбоксом. Никакой своей очереди диспетчер не заводит:
// источник истины один, и он у владельца.
function readQueue() {
  if (!existsSync(CONFIG.queueFile)) return [];
  const text = readFileSync(CONFIG.queueFile, "utf8");
  const rows = [];
  text.split(/\r?\n/).forEach((line, index) => {
    // План владельца написан ДВУМЯ способами, и оба живые: строки таблицы «| **2.2** | что |» и
    // заголовки «### Пакет 2.2 — …». Диспетчер читает оба, а не требует переписать план под
    // себя: источник истины у владельца, подстраивается инструмент.
    const tableRow = line.match(/^\|\s*\*\*([0-9]+\.[0-9a-z]*)\*\*\s*(✅)?\s*\|\s*([^|]+)/);
    const heading = line.match(/^###\s+Пакет\s+([0-9]+\.[0-9a-z]*)\s*[—-]\s*(.+)$/);
    const checkbox = line.match(/^\s*[-*]\s*\[( |x|X)\]\s*(.+)$/);
    let id = "";
    let title = "";
    let done = false;
    if (tableRow) {
      id = tableRow[1];
      done = Boolean(tableRow[2]);
      title = tableRow[3].trim();
    } else if (heading) {
      id = heading[1];
      title = heading[2].trim();
      done = /✅/.test(title);
    } else if (checkbox) {
      done = checkbox[1].toLowerCase() === "x";
      title = checkbox[2].trim();
    } else {
      return;
    }
    if (done || !title || /BLOCKED/.test(title)) return;
    // Заголовок и строка таблицы могут описывать ОДИН пакет — берём первое вхождение.
    if (id && rows.some((row) => row.id === id)) return;
    rows.push({ line: index + 1, id, title: (id ? id + " — " : "") + title });
  });
  return rows;
}

// ─── Летопись (П28) ───────────────────────────────────────────────────────────────────────
// Что сработало, что упало, какой гейт поймал, какое решение принято. Одна строка JSON на
// событие: она читается и глазами, и инструментом, и не требует парсить прозу леджера.
function chronicle(entry) {
  const row = Object.assign({ at: new Date().toISOString() }, entry);
  appendFileSync(CONFIG.chronicleFile, JSON.stringify(row) + "\n", "utf8");
  return row;
}

// ─── Ограничитель 6: политика приёмки (П29) ───────────────────────────────────────────────
// Зелёный гейт доказывает, что ничего не сломано. Он НЕ доказывает, что сделано то, что нужно.
// Поэтому авто-слияние разрешено только для видов работы, которые владелец явно включил, и
// никогда — для необратимого.
function autoMergeAllowed(title) {
  if (!existsSync(CONFIG.policyFile)) {
    return { ok: false, why: "политики приёмки нет — по умолчанию решает владелец" };
  }
  let policy = null;
  try {
    policy = JSON.parse(readFileSync(CONFIG.policyFile, "utf8"));
  } catch {
    return { ok: false, why: "политика приёмки не читается — считаем, что её нет" };
  }
  if (!policy.approvedByOwner) {
    return { ok: false, why: "политика записана, но владелец её не утвердил" };
  }
  const text = String(title || "").toLocaleLowerCase("ru-RU");
  const risky = (policy.neverAutomatic || []).find((kind) => text.includes(String(kind).toLocaleLowerCase("ru-RU").split(" ")[0]));
  if (risky) return { ok: false, why: "необратимое («" + risky + "») — всегда через владельца, при любой истории" };
  const kinds = policy.autoMergeKinds || [];
  if (!kinds.length) return { ok: false, why: "в политике нет ни одного разрешённого вида работы" };
  return { ok: true, why: "вид работы разрешён политикой владельца" };
}

// ─── Гейт ─────────────────────────────────────────────────────────────────────────────────
function runGate(level) {
  const started = Date.now();
  try {
    execSync("node tools/gate.mjs " + level, { stdio: "inherit", timeout: CONFIG.packageTimeoutMs });
    return { ok: true, ms: Date.now() - started };
  } catch (error) {
    return { ok: false, ms: Date.now() - started, error: String((error && error.message) || error).slice(0, 200) };
  }
}

// ─── Исполнитель ──────────────────────────────────────────────────────────────────────────
// Диспетчер НЕ пишет код сам. Он вызывает `claude -p` с текстом пакета и правилами репозитория,
// а дальше судит по гейтам — ровно так же, как судил бы владелец.
function runExecutor(task) {
  const prompt = [
    "Ты работаешь в репозитории LifeOS. Прочитай CLAUDE.md и docs/context/*.brief.md.",
    "",
    "ПАКЕТ: " + task.title,
    "",
    "Правила, нарушение любого = пакет отклонён:",
    "• спеки и аудиты не ослабляются (tools/audit-no-gate-tampering.mjs это проверит);",
    "• каждый пакет приносит свою спеку, названную болью владельца;",
    "• ничего не делается молча: preview → подтверждение → чек;",
    "• RU-first в видимых строках; токены вместо хардкод-цветов; data-testid на интерактивном.",
    "",
    "Сделай пакет целиком, прогони `node tools/gate.mjs quick` и остановись."
  ].join("\n");
  const started = Date.now();
  try {
    execFileSync("claude", ["-p", prompt], { stdio: "inherit", timeout: CONFIG.packageTimeoutMs });
    return { ok: true, ms: Date.now() - started };
  } catch (error) {
    return { ok: false, ms: Date.now() - started, error: String((error && error.message) || error).slice(0, 200) };
  }
}

// ─── Прогон ───────────────────────────────────────────────────────────────────────────────
const startedAt = Date.now();
const budget = budgetMs();
const queue = readQueue();
const baseBranch = sh("git rev-parse --abbrev-ref HEAD").trim();

log("ветка: " + baseBranch);
log("очередь: " + queue.length + " неотмеченных пакетов в " + CONFIG.queueFile);
log("окно: " + CONFIG.windowStartHour + ":00–" + CONFIG.windowEndHour + ":00, бюджет " + Math.round(budget / 60000) + " минут");

if (!queue.length) {
  log("очередь пуста — работать не над чем, это нормальный исход");
  process.exit(0);
}

if (!ignoreWindow && !insideWindow(new Date())) {
  log("вне окна — выхожу молча. Это не ошибка: ночная работа не должна начинаться днём");
  process.exit(0);
}

const stop = stopRequested();
if (stop) {
  log("СТОП-ФАЙЛ: " + stop);
  process.exit(0);
}

if (dryRun) {
  console.log("\nПЛАН (ничего не запускается):");
  queue.slice(0, 10).forEach((task, index) => console.log("  " + (index + 1) + ". строка " + task.line + ": " + task.title.slice(0, 100)));
  console.log("\nНа каждый пакет: своя ветка → claude -p → gate quick → merge только по зелёному.");
  console.log("Три провала подряд на пакете → BLOCKED, диспетчер идёт дальше.");
  process.exit(0);
}

// Рабочее дерево обязано быть чистым: иначе непонятно, что сделал пакет, а что лежало до него.
if (sh("git status --porcelain").trim()) {
  log("рабочее дерево грязное — диспетчер не запускается: иначе чужие правки уедут в его коммит");
  chronicle({ event: "refused", reason: "dirty-worktree" });
  process.exit(1);
}

let done = 0;
let blocked = 0;
for (const task of queue) {
  const spent = Date.now() - startedAt;
  if (spent > budget) {
    log("бюджет окна исчерпан (" + Math.round(spent / 60000) + " минут) — останавливаюсь до следующей ночи");
    chronicle({ event: "budget-exhausted", spentMs: spent, done, blocked });
    break;
  }
  const stopNow = stopRequested();
  if (stopNow) {
    log("СТОП-ФАЙЛ между пакетами: " + stopNow);
    chronicle({ event: "stopped", reason: stopNow, done, blocked });
    break;
  }

  const branch = "auto/" + new Date().toISOString().slice(0, 10) + "-" + String(task.line);
  log("пакет: " + task.title.slice(0, 90));
  sh("git checkout -q -b " + branch);

  let attempt = 0;
  let green = false;
  let lastGate = null;
  while (attempt < CONFIG.maxFailures && !green) {
    attempt += 1;
    const run = runExecutor(task);
    if (!run.ok) {
      chronicle({ event: "executor-failed", task: task.title, attempt, error: run.error });
      continue;
    }
    lastGate = runGate("quick");
    green = lastGate.ok;
    chronicle({
      event: green ? "gate-green" : "gate-red",
      task: task.title,
      attempt,
      gate: "quick",
      ms: lastGate.ms,
      error: green ? "" : lastGate.error
    });
  }

  if (green) {
    // Зелёный гейт — необходимое условие, но не достаточное (П29). Автоматически сливается
    // только тот ВИД работы, который владелец разрешил политикой; всё остальное ждёт его,
    // сколько бы зелёного ни было. Политику включает он, а не история.
    const allowed = autoMergeAllowed(task.title);
    if (!allowed.ok) {
      sh("git checkout -q " + baseBranch);
      log("зелёный, но слияние ждёт владельца: " + allowed.why);
      chronicle({ event: "awaiting-owner", task: task.title, branch, attempts: attempt, why: allowed.why });
      continue;
    }
    // Merge только по зелёному. Никаких «почти прошло».
    sh("git checkout -q " + baseBranch);
    sh("git merge -q --no-ff " + branch + " -m \"Пакет диспетчера: " + task.title.slice(0, 60).replace(/"/g, "'") + "\"");
    done += 1;
    log("зелёный → влит в " + baseBranch);
    chronicle({ event: "merged", task: task.title, branch, attempts: attempt });
  } else {
    // Три провала — не повод биться до утра. Помечаем и идём дальше.
    sh("git checkout -q " + baseBranch);
    blocked += 1;
    log("три провала → BLOCKED, ветка " + branch + " оставлена для разбора владельцем");
    chronicle({ event: "blocked", task: task.title, branch, attempts: attempt, gate: lastGate ? lastGate.error : "" });
    appendFileSync(CONFIG.ledgerFile, "\n### 🔴 BLOCKED (диспетчер " + new Date().toISOString().slice(0, 10) + ")\n"
      + "Пакет «" + task.title + "» не прошёл гейт трижды. Ветка `" + branch + "` оставлена как есть — "
      + "разбирать её владельцу, диспетчер к ней больше не возвращается.\n", "utf8");
  }
}

log("итог: влито " + done + ", заблокировано " + blocked);
chronicle({ event: "session-end", done, blocked, spentMs: Date.now() - startedAt });
process.exit(blocked && !done ? 1 : 0);

// П25 · АНТИ-ПОДДЕЛКА: пакет не имеет права чинить свой гейт вместо своего кода.
//
// Самый дешёвый способ получить зелёный прогон — ослабить проверку. Он же самый разрушительный:
// после него оракул врёт, и врёт молча, а следующие пакеты строятся на неправде. Инвариант И-8
// («не ослаблять спеки и аудиты ради зелёного») нельзя оставлять на добрую волю — его надо
// уметь ПРОВЕРИТЬ по диффу.
//
// Что считается гейтом: `tools/audit-*.mjs`, `output/playwright/**`, `smoke.mjs`, тестовые
// скрипты в `package.json`.
//
// Что считается подделкой (красный):
//   • удаление или изменение строки-утверждения в существующем гейте (`expect`, `assert`,
//     `toBe*`, `toContain*`, `process.exit(1)`, элемент списка `required`);
//   • удаление файла-гейта целиком;
//   • правка тестовых скриптов в package.json.
//
// Что подделкой НЕ является (зелёный, но названо в отчёте):
//   • НОВЫЙ файл спеки — пакет обязан приносить свою спеку, это и есть работа;
//   • только добавленные строки в существующий гейт — проверок стало больше, а не меньше.
//
// Изменение утверждения бывает законным ровно в одном случае: продукт изменился НАМЕРЕННО, и
// спека идёт за ним. Такое изменение аудит всё равно показывает — оно требует обоснования в
// отчёте, а не молчания.
//
// Запуск:
//   node tools/audit-no-gate-tampering.mjs            # рабочее дерево против HEAD
//   node tools/audit-no-gate-tampering.mjs HEAD~3     # против произвольной точки
import { execFileSync } from "node:child_process";

const base = process.argv.find((arg) => !arg.startsWith("-") && arg !== process.argv[0] && arg !== process.argv[1]) || "HEAD";

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    return String((error && error.stdout) || "");
  }
}

const GATE_PATTERNS = [
  /^tools\/audit-.*\.mjs$/,
  /^output\/playwright\//,
  /^smoke\.mjs$/
];
const ASSERTION_RE = /\b(expect|assert|toBe|toContain|toHaveCount|toHaveText|toHaveAttribute|toBeVisible|toBeTruthy|toBeGreaterThan|toBeLessThan|process\.exit\(1\)|throw new Error)\b/;

function isGate(path) {
  return GATE_PATTERNS.some((pattern) => pattern.test(path));
}

const diff = git(["diff", "--no-color", "--unified=0", base, "--"]);
const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n").map((line) => line.trim()).filter(Boolean);

const files = new Map();
let current = "";
for (const line of diff.split("\n")) {
  const header = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
  if (header) {
    current = header[2];
    if (!files.has(current)) files.set(current, { added: [], removed: [] });
    continue;
  }
  if (!current) continue;
  if (line.startsWith("+++") || line.startsWith("---")) continue;
  if (line.startsWith("+")) files.get(current).added.push(line.slice(1));
  else if (line.startsWith("-")) files.get(current).removed.push(line.slice(1));
}

const tampering = [];
const additive = [];
const newGates = [];

for (const [path, change] of files) {
  if (!isGate(path)) continue;
  // `smoke.mjs` — это СПИСОК маркеров, а не набор вызовов expect: там утверждение выглядит как
  // обычная строка в массиве, и по ключевым словам его не поймать. Поэтому у него правило
  // строже: удалена любая содержательная строка — значит проверок стало меньше.
  const weakened = path === "smoke.mjs"
    ? change.removed.filter((line) => line.trim() && !line.trim().startsWith("//"))
    : change.removed.filter((line) => ASSERTION_RE.test(line));
  if (weakened.length) {
    tampering.push({
      file: path,
      removedAssertions: weakened.length,
      sample: weakened.slice(0, 3).map((line) => line.trim().slice(0, 110))
    });
  } else if (change.removed.length || change.added.length) {
    additive.push({ file: path, added: change.added.length, removed: change.removed.length });
  }
}

for (const path of untracked) {
  if (isGate(path)) newGates.push(path);
}

// package.json: подделкой считается правка тестовых/аудиторских скриптов, а не любых.
const packageChange = files.get("package.json");
const scriptTampering = [];
if (packageChange) {
  for (const line of packageChange.removed) {
    if (/"(e2e|smoke|verify|audit)[^"]*"\s*:/.test(line)) scriptTampering.push(line.trim().slice(0, 120));
  }
}

console.log(JSON.stringify({
  audit: "no-gate-tampering",
  base,
  gatesTouched: files.size ? [...files.keys()].filter(isGate) : [],
  newGateFiles: newGates,
  additiveGateChanges: additive,
  tampering,
  packageScriptTampering: scriptTampering
}, null, 2));

if (tampering.length || scriptTampering.length) {
  console.error("\nПОДДЕЛКА ГЕЙТА: из существующих проверок удалены утверждения.");
  console.error("Пакет отклонён независимо от цвета гейтов (И-8, П25).");
  console.error("Законный путь один: продукт изменился намеренно — тогда изменение спеки");
  console.error("объясняется в отчёте владельцу, а не проходит молча.");
  for (const row of tampering) {
    console.error("\n  " + row.file + ": удалено утверждений " + row.removedAssertions);
    for (const sample of row.sample) console.error("    - " + sample);
  }
  for (const line of scriptTampering) console.error("\n  package.json: " + line);
  process.exit(1);
}

if (newGates.length) console.log("\nНовые гейты (это работа пакета, а не подделка):\n  " + newGates.join("\n  "));
if (additive.length) console.log("\nГейты дополнены без потери проверок:\n  " + additive.map((row) => row.file + " (+" + row.added + "/-" + row.removed + ")").join("\n  "));
console.log("\naudit:no-gate-tampering passed");

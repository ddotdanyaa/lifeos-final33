import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, normalize } from "node:path";

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    if (stat.isFile() && full.endsWith(".js")) files.push(full);
  }
  return files;
}

const app = readFileSync("app.js", "utf8");
if (!app.includes("renderNewShell(buildNewShellContext")) {
  console.error("Primary UI is not rendered by the new public shell.");
  process.exit(1);
}

const allowedDevFiles = new Set([
  normalize("ui/control.js")
]);

const primaryFiles = walk("ui").filter((file) => {
  const normalized = normalize(file);
  if (allowedDevFiles.has(normalized)) return false;
  if (normalized.endsWith(normalize("ui/components/shared.js"))) return false;
  return true;
});

const banned = [
  "Product Brain",
  "UX Debt",
  "Bug Ledger",
  "Release Map",
  "Provider Gates Map",
  "Maturity Scorecard",
  "LITE_SNAPSHOT",
  "needs-owner-credentials",
  "blocked_external",
  "blocked_external_credential",
  "provider gate",
  "audit passed",
  "schema version",
  "architecture event bus",
  "control architecture contract",
  "raw status"
];

const hits = [];
for (const file of primaryFiles) {
  const text = readFileSync(file, "utf8");
  for (const term of banned) {
    if (text.includes(term)) hits.push(`${file}: ${term}`);
  }
}

if (hits.length) {
  console.error("Primary UI still contains label-theater terms:");
  console.error(hits.join("\n"));
  process.exit(1);
}

// П2 · ЧЕСТНАЯ ПУСТОТА. Второй вид бутафории — не слово, а ФОРМА: подпись, под которой ничего
// нет. Владелец открыл Базу и увидел «Выводы — инсайты появятся из чтения», «Вопросы — вопросы
// станут задачами», «Повторение — карточка появится после извлечения смысла»: три заголовка,
// три обещания, ноль данных. Панель выглядит наполненной, а сообщить ей нечего.
//
// Ловим сам приём: заголовок вплотную перед списком, у которого есть запасной текст на случай
// пустоты. Разделу с данными запасной текст не нужен — он рисуется только когда данные есть
// (helper `dataSection` в ui/components/shared.js). Пустое состояние остаётся, но живёт САМО,
// без подписи над ним, и одно на панель, а не по штуке на каждый несуществующий раздел.
const labelOverNothing = [];
for (const file of primaryFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/<(h[2-4])>[^<]{1,60}<\/\1>\$\{safeList\(/g)) {
    const line = text.slice(0, match.index).split("\n").length;
    labelOverNothing.push(`${file}:${line}: ${match[0].slice(0, 48)}… — подпись стоит над списком, который может быть пустым; используй dataSection()`);
  }
}

if (labelOverNothing.length) {
  console.error("Подпись без данных (label theater by shape):");
  console.error(labelOverNothing.join("\n"));
  process.exit(1);
}

console.log("audit:no-label-theater passed");

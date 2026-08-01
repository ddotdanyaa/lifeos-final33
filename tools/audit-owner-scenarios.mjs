// Гейт сценариев владельца (пакет 1.3 плана v1.5, снятие блокировки Б-I).
//
// Зачем он нужен, измеренная причина: 148 спек были зелёными одновременно с тем, что владелец
// не мог пользоваться продуктом. Так вышло не потому, что спеки врали, а потому что НИКТО не
// отвечал на вопрос «какая спека доказывает какую боль». Реестр docs/owner-scenarios.json
// отвечает, а этот аудит следит, чтобы ответ оставался правдой.
//
// Чем он отличается от «посчитать спеки»: спека засчитывается доказательством, только если она
// поднимает живое приложение и проверяет то, что ВИДИТ владелец. Спека, читающая внутреннее
// состояние и ни разу не смотрящая на экран, проходит при сломанном интерфейсе — она обманывается
// тривиально, и в реестре за доказательство не идёт. Это прямое требование владельца от
// 2026-08-01: «не просто тупые тесты, которые обмануть можно».
//
// Красный, если: сценарий без спек; спека из реестра не существует; ни одна спека сценария не
// дотягивает до порога силы; сценарий объявлен закрытым, но у него перечислены дыры.
//
// Запуск: node tools/audit-owner-scenarios.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const specDir = join(repo, "output", "playwright");
const registryArg = process.argv.find((a) => a.startsWith("--registry="));
const registryPath = registryArg ? registryArg.slice("--registry=".length) : join(repo, "docs", "owner-scenarios.json");

// Пороги силы. Подобраны по существующим спекам, а не назначены: спека, доказывающая боль,
// на практике делает не меньше трёх утверждений и хотя бы раз смотрит на экран.
const MIN_ASSERTIONS = 3;
const MIN_VISIBLE_CHECKS = 1;

if (!existsSync(registryPath)) {
  console.error("Нет реестра сценариев: docs/owner-scenarios.json");
  process.exit(1);
}
const registry = JSON.parse(readFileSync(registryPath, "utf8"));

// Сила одной спеки. Считаем по тексту: тут важен не идеальный парсер, а грубое различие между
// «проверяет то, что видит человек» и «щупает внутренности».
function measureSpec(name) {
  const path = join(specDir, `${name}.spec.mjs`);
  if (!existsSync(path)) return { name, exists: false };
  const text = readFileSync(path, "utf8");
  const count = (re) => (text.match(re) || []).length;
  const assertions = count(/\bexpect\s*\(/g);
  const visible = count(/getByTestId|getByText|getByRole|toBeVisible|toContainText|toHaveText/g);
  const live = /4173|appUrl/.test(text);
  const isolated = /resetForTest|page\.goto/.test(text);
  return {
    name,
    exists: true,
    assertions,
    visible,
    live,
    isolated,
    // Доказательство = живое приложение + видимый владельцу результат + не одно утверждение.
    strong: live && assertions >= MIN_ASSERTIONS && visible >= MIN_VISIBLE_CHECKS,
  };
}

const problems = [];
const notes = [];
const claimed = new Set();
const rows = [];

for (const scenario of registry.scenarios || []) {
  const specs = Array.isArray(scenario.specs) ? scenario.specs : [];
  specs.forEach((name) => claimed.add(name));

  if (specs.length === 0) {
    problems.push(`${scenario.id}: ни одной спеки — боль «${scenario.pain}» ничем не доказана`);
    rows.push({ id: scenario.id, strong: 0, total: 0, gaps: (scenario.gaps || []).length });
    continue;
  }

  const measured = specs.map(measureSpec);
  const missing = measured.filter((m) => !m.exists);
  for (const gone of missing) {
    problems.push(`${scenario.id}: спека ${gone.name}.spec.mjs указана в реестре, но её нет на диске`);
  }

  const strong = measured.filter((m) => m.exists && m.strong);
  const weak = measured.filter((m) => m.exists && !m.strong);

  if (strong.length === 0) {
    problems.push(
      `${scenario.id}: ни одна спека не дотягивает до доказательства `
      + `(нужно: живое приложение + ≥${MIN_ASSERTIONS} проверок + ≥${MIN_VISIBLE_CHECKS} обращение к экрану). `
      + `Слабые: ${weak.map((m) => m.name).join(", ") || "нет"}`
    );
  }
  for (const item of weak) {
    notes.push(
      `${scenario.id}: ${item.name} — слабая `
      + `(проверок ${item.assertions}, обращений к экрану ${item.visible}${item.live ? "" : ", НЕ поднимает приложение"})`
    );
  }

  // Честность статуса: «закрыт» с перечисленными дырами — это ложь в документе, а не достижение.
  const gaps = Array.isArray(scenario.gaps) ? scenario.gaps : [];
  if (scenario.status === "закрыт" && gaps.length > 0) {
    problems.push(`${scenario.id}: помечен закрытым, но у него ${gaps.length} названных дыр`);
  }

  rows.push({ id: scenario.id, strong: strong.length, total: specs.length, gaps: gaps.length });
}

// Несгораемые проверки — те, что стоят на уже случившихся потерях.
for (const name of (registry._несгораемые && registry._несгораемые.specs) || []) {
  claimed.add(name);
  const measured = measureSpec(name);
  if (!measured.exists) problems.push(`несгораемая спека ${name}.spec.mjs отсутствует`);
  else if (!measured.strong) problems.push(`несгораемая спека ${name} ослабла до неубедительной`);
}

// Спеки, которые никакой сценарий себе не приписал. Не ошибка: реестр растёт постепенно.
// Но список нужен — он показывает, сколько проверок не привязано ни к одной боли.
const all = existsSync(specDir)
  ? readdirSync(specDir).filter((f) => f.endsWith(".spec.mjs")).map((f) => f.replace(/\.spec\.mjs$/, ""))
  : [];
const orphans = all.filter((name) => !claimed.has(name));

console.log("");
console.log("  СЦЕНАРИИ ВЛАДЕЛЬЦА");
console.log("  ─────────────────────────────────────────────────────────");
for (const row of rows) {
  const scenario = registry.scenarios.find((s) => s.id === row.id);
  const mark = row.strong > 0 ? "OK " : "нет";
  console.log(`  ${mark} ${row.id.padEnd(4)} доказательств ${row.strong}/${row.total}   дыр ${row.gaps}   ${scenario.pain.slice(0, 62)}`);
}
console.log("  ─────────────────────────────────────────────────────────");
console.log(`  Спек всего ${all.length}, привязано к болям ${claimed.size}, не привязано ${orphans.length}`);

const gapTotal = rows.reduce((sum, row) => sum + row.gaps, 0);
console.log(`  Названных дыр по сценариям: ${gapTotal}`);

if (notes.length) {
  console.log("");
  console.log("  Слабые спеки (проходят, но доказывают мало):");
  for (const note of notes) console.log(`    · ${note}`);
}

if (orphans.length) {
  console.log("");
  console.log("  Не привязаны ни к одной боли (кандидаты в реестр):");
  console.log(`    ${orphans.join(", ")}`);
}

if (problems.length) {
  console.log("");
  console.log("  КРАСНЫЙ:");
  for (const problem of problems) console.log(`    ✗ ${problem}`);
  console.log("");
  process.exit(1);
}

console.log("");
console.log("  Зелёный: у каждого сценария есть доказательство, дыры названы честно.");
console.log("");

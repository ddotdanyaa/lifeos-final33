// П24 · ТРЁХУРОВНЕВЫЙ ГЕЙТ и карта «файл → спеки».
//
// Полный набор — 2,3 часа. Гонять его после каждого пакета невозможно, а не гонять ничего —
// значит коммитить вслепую. Поэтому уровня три, и выбирает их не настроение, а место в ритме:
//
//   quick  (~2 мин, на пакет)  — verify + только те спеки, что покрывают ИЗМЕНЁННЫЕ файлы
//   wave   (~10 мин, на волну) — все 28+ аудитов + спеки всех затронутых подсистем
//   full   (~140 мин, на барьер) — всё, без исключений
//
// Карта «файл → спеки» не ведётся руками и потому не устаревает молча: она ВЫВОДИТСЯ из
// брифов подсистем. У каждого брифа есть `covers:` (какие файлы он описывает) и раздел
// «Как проверять изменения» со списком целевых спек. Изменил файл — знаешь подсистему; знаешь
// подсистему — знаешь её спеки. Свежесть самих брифов держит `audit-context-freshness`.
//
// Запуск:
//   node tools/gate.mjs quick
//   node tools/gate.mjs wave
//   node tools/gate.mjs full
//   node tools/gate.mjs map            # только карта, ничего не запускает
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";
import { join } from "node:path";

const BRIEF_DIR = "docs/context";
const SPEC_DIR = "output/playwright";
const level = process.argv[2] || "quick";

const specFiles = existsSync(SPEC_DIR)
  ? readdirSync(SPEC_DIR).filter((name) => name.endsWith(".spec.mjs"))
  : [];
const specByStem = new Map(specFiles.map((name) => [name.replace(/\.spec\.mjs$/, ""), name]));

function briefs() {
  if (!existsSync(BRIEF_DIR)) return [];
  return readdirSync(BRIEF_DIR)
    .filter((name) => name.endsWith(".brief.md"))
    .map((name) => {
      const text = readFileSync(join(BRIEF_DIR, name), "utf8");
      const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const covers = [];
      if (front) {
        let inCovers = false;
        for (const rawLine of front[1].split(/\r?\n/)) {
          if (/^covers:\s*$/.test(rawLine)) { inCovers = true; continue; }
          if (inCovers && /^\s*-\s+/.test(rawLine)) { covers.push(rawLine.replace(/^\s*-\s+/, "").split(":")[0].trim()); continue; }
          inCovers = false;
        }
      }
      // Спеки берём из всего тела: имена стоят в обратных кавычках и совпадают с файлами.
      const specs = [...new Set([...text.matchAll(/`([a-z0-9-]+)`/g)]
        .map((match) => match[1])
        .filter((stem) => specByStem.has(stem))
        .map((stem) => specByStem.get(stem)))];
      return { name, covers, specs };
    });
}

function changedFiles() {
  try {
    const tracked = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" });
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" });
    return [...new Set((tracked + "\n" + untracked).split("\n").map((line) => line.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

const map = briefs();
if (!map.length) {
  console.error("Нет брифов в " + BRIEF_DIR + ": карту «файл → спеки» выводить не из чего (П8).");
  process.exit(1);
}

if (level === "map") {
  console.log("КАРТА «файл → спеки» (выведена из брифов, не ведётся руками)\n");
  for (const brief of map) {
    console.log("  " + brief.name.replace(".brief.md", ""));
    console.log("    файлы: " + (brief.covers.join(", ") || "—"));
    console.log("    спеки: " + (brief.specs.length ? brief.specs.length + " шт." : "—"));
    if (brief.specs.length) console.log("           " + brief.specs.map((s) => s.replace(".spec.mjs", "")).join(", "));
    console.log("");
  }
  const covered = new Set(map.flatMap((brief) => brief.specs));
  const orphans = specFiles.filter((name) => !covered.has(name));
  console.log("Спек всего: " + specFiles.length + ", привязано к подсистемам: " + covered.size);
  if (orphans.length) {
    console.log("\nНи в одном брифе не названы (" + orphans.length + ") — на быстром гейте они не гоняются:");
    console.log("  " + orphans.map((name) => name.replace(".spec.mjs", "")).join(", "));
  }
  process.exit(0);
}

function run(label, command) {
  console.log("\n▸ " + label + "\n  " + command);
  const started = Date.now();
  try {
    execSync(command, { stdio: "inherit" });
    console.log("  ✓ " + label + " за " + Math.round((Date.now() - started) / 1000) + " с");
    return true;
  } catch {
    console.log("  ✗ " + label + " ЗАВАЛЕН за " + Math.round((Date.now() - started) / 1000) + " с");
    return false;
  }
}

let ok = true;
const startedAt = Date.now();

if (level === "quick") {
  const changed = changedFiles();
  const touched = map.filter((brief) => brief.covers.some((file) => changed.some((path) => path === file || path.startsWith(file.replace(/\/$/, "") + "/"))));
  const specs = [...new Set(touched.flatMap((brief) => brief.specs))];
  // Новая спека всегда гоняется своим же пакетом, даже если её ещё нет ни в одном брифе.
  for (const path of changed) {
    if (path.startsWith(SPEC_DIR) && path.endsWith(".spec.mjs") && !specs.includes(path.split("/").pop())) {
      specs.push(path.split("/").pop());
    }
  }
  console.log("Изменено файлов: " + changed.length + ". Затронуто подсистем: " + touched.length
    + " (" + (touched.map((b) => b.name.replace(".brief.md", "")).join(", ") || "ни одной") + ").");
  ok = run("verify", "npm run verify") && ok;
  ok = run("gate-tampering", "node tools/audit-no-gate-tampering.mjs") && ok;
  if (specs.length) {
    ok = run("спеки подсистем (" + specs.length + ")",
      "npx playwright test " + specs.map((name) => SPEC_DIR + "/" + name).join(" ") + " --workers=1 --reporter=line") && ok;
  } else {
    console.log("\n▸ спек для изменённых файлов не нашлось — либо правка вне подсистем, либо бриф не назвал спеку");
  }
} else if (level === "wave") {
  ok = run("verify", "npm run verify") && ok;
  ok = run("gate-tampering", "node tools/audit-no-gate-tampering.mjs") && ok;
  const audits = readdirSync("tools").filter((name) => /^audit-.*\.mjs$/.test(name));
  for (const audit of audits) ok = run(audit, "node tools/" + audit) && ok;
  const specs = [...new Set(map.flatMap((brief) => brief.specs))];
  ok = run("спеки всех подсистем (" + specs.length + ")",
    "npx playwright test " + specs.map((name) => SPEC_DIR + "/" + name).join(" ") + " --workers=1 --reporter=line") && ok;
} else if (level === "full") {
  ok = run("verify", "npm run verify") && ok;
  ok = run("gate-tampering", "node tools/audit-no-gate-tampering.mjs") && ok;
  const audits = readdirSync("tools").filter((name) => /^audit-.*\.mjs$/.test(name));
  for (const audit of audits) ok = run(audit, "node tools/" + audit) && ok;
  ok = run("полный набор спек (" + specFiles.length + " файлов)",
    "npx playwright test " + SPEC_DIR + " --workers=1 --reporter=line") && ok;
} else {
  console.error("Уровень: quick | wave | full | map");
  process.exit(1);
}

console.log("\n" + "═".repeat(70));
console.log("ГЕЙТ «" + level + "»: " + (ok ? "ЗЕЛЁНЫЙ" : "КРАСНЫЙ") + " за " + Math.round((Date.now() - startedAt) / 1000) + " секунд");
console.log("═".repeat(70));
process.exit(ok ? 0 : 1);

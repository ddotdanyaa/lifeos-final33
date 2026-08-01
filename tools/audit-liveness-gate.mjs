// tools/audit-liveness-gate.mjs — ХРАПОВИК ЖИВОСТИ.
//
// Перепись (`tools/audit-liveness.mjs`) считает, сколько контролов ничего не делают. Но само по
// себе число бесполезно: оно протухает при первой же правке, и через день никто не помнит, было
// девятнадцать или тридцать. Ровно так продукт и дошёл до состояния «сайт странный».
//
// Этот гейт делает число необратимым. Он хранит планку по каждому экрану и падает, если мёртвых
// стало БОЛЬШЕ. Стало меньше — планка опускается сама и назад уже не поднимается.
//
// Почему отдельный файл, а не часть переписи: перепись поднимает браузер и идёт минуты, а гейт
// обязан быть в `npm run verify`, то есть стоить секунды. Он читает готовую карту, не считая
// заново. Цена — гейт верен ровно настолько, насколько свежа карта, поэтому он же проверяет её
// возраст и говорит вслух, если карту давно не пересчитывали.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MAP = "ui/liveness-map.js";
const BASELINE = "docs/LIVENESS_BASELINE.json";
const STALE_DAYS = 7;

function readMap() {
  if (!existsSync(MAP)) {
    console.log("КРАСНЫЙ: нет " + MAP + ". Прогони: node tools/audit-liveness.mjs");
    process.exit(1);
  }
  const text = readFileSync(MAP, "utf8");
  const body = text.match(/export const LIVENESS = ([\s\S]*?);\n/);
  const date = text.match(/export const LIVENESS_DATE = "([^"]+)"/);
  if (!body) {
    console.log("КРАСНЫЙ: " + MAP + " не разбирается. Перегенерируй прогоном переписи.");
    process.exit(1);
  }
  return { map: JSON.parse(body[1]), date: date ? date[1] : "" };
}

function daysSince(iso) {
  if (!iso) return Infinity;
  const then = Date.parse(iso + "T00:00:00Z");
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((Date.now() - then) / 86400000);
}

const { map, date } = readMap();
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};

const worse = [];
const better = [];
const fresh = {};

for (const [surface, row] of Object.entries(map)) {
  const dead = Number(row.dead || 0);
  const was = baseline[surface];
  if (was === undefined) {
    fresh[surface] = dead;
    continue;
  }
  if (dead > was) worse.push({ surface, was, now: dead });
  else if (dead < was) better.push({ surface, was, now: dead });
  fresh[surface] = Math.min(dead, was);
}
// Экраны, которых нет в текущей карте, планку сохраняют: их просто не переписывали в этот раз,
// и молча обнулять их планку — значит разрешить регресс там, куда давно не смотрели.
for (const [surface, was] of Object.entries(baseline)) {
  if (fresh[surface] === undefined) fresh[surface] = was;
}

const total = Object.values(fresh).reduce((sum, value) => sum + value, 0);
const age = daysSince(date);

if (worse.length) {
  console.log("КРАСНЫЙ: мёртвых контролов стало больше");
  for (const row of worse) console.log("  " + row.surface + ": было " + row.was + " → стало " + row.now);
  console.log("");
  console.log("Это регресс: кнопка перестала что-либо делать. Почини или объясни в отчёте,");
  console.log("почему изменение намеренное — и тогда обнови " + BASELINE + " отдельным решением.");
  process.exit(1);
}

writeFileSync(BASELINE, JSON.stringify(fresh, null, 2) + "\n", "utf8");

if (better.length) {
  console.log("Планка опущена (назад уже не поднимется):");
  for (const row of better) console.log("  " + row.surface + ": " + row.was + " → " + row.now);
}
if (age > STALE_DAYS) {
  console.log("ВНИМАНИЕ: карте живости " + age + " дней. Гейт верен настолько, насколько свежа карта.");
  console.log("Пересчитай: node tools/audit-liveness.mjs");
}
console.log("audit:liveness-gate passed · мёртвых по планке: " + total + " · карта от " + (date || "неизвестно"));

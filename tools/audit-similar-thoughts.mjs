// tools/audit-similar-thoughts.mjs — ПРИЁМКА ПЕРЕНОСА ДОНОРА.
//
// Правило проекта для донорских пакетов: перенос считается верным, когда наш код даёт ТЕ ЖЕ
// ЧИСЛА, что код донора. Поэтому первая часть аудита — это дословно тест-кейсы `natural`
// (MIT, Adam Phillabaum & Chris Umbel) из `research/repos/natural/spec/`:
//
//   spec/dice_coefficient_spec.ts   → 'night'/'nacht' = 0.25, регистр и пробелы не влияют
//   spec/jaro-winkler_spec.ts       → DIXON/DICKSONX ≈ 0.81333, MARTHA/MARHTA ≈ 0.96111 и т.д.
//
// Без этой части перенос был бы пересказом: «похоже работает» — не результат.
//
// Вторая часть — поведение, которого у донора нет и быть не могло: русский язык, исключение
// служебных записей и молчание на коротком черновике.
import { diceSimilarity, jaroWinkler, findSimilarThoughts } from "../core/similar-thoughts.mjs";

let failures = 0;
let checks = 0;

function ok(name, condition, detail) {
  checks += 1;
  if (condition) return;
  failures += 1;
  console.log("  FAIL " + name + (detail ? " — " + detail : ""));
}

function approx(actual, expected) {
  return Math.abs(actual - expected) < 1e-5;
}

console.log("Тест-кейсы донора natural — коэффициент Дайса");
ok("night/nacht = 0.25", diceSimilarity("night", "nacht") === 0.25, "получено " + diceSimilarity("night", "nacht"));
ok("регистр не влияет", diceSimilarity("night", "NIGHT") === 1);
ok("лишние пробелы не влияют", diceSimilarity("the   space", "the space") === 1);

console.log("Тест-кейсы донора natural — Джаро–Винклер");
ok("DIXON/DICKSONX ≈ 0.81333", approx(jaroWinkler("DIXON", "DICKSONX", {}), 0.81333), "получено " + jaroWinkler("DIXON", "DICKSONX", {}));
ok("DWAYNE/DUANE ≈ 0.84", approx(jaroWinkler("DWAYNE", "DUANE", {}), 0.84), "получено " + jaroWinkler("DWAYNE", "DUANE", {}));
ok("MARTHA/MARHTA ≈ 0.96111", approx(jaroWinkler("MARTHA", "MARHTA", {}), 0.96111), "получено " + jaroWinkler("MARTHA", "MARHTA", {}));
ok("class/clams ≈ 0.90666", approx(jaroWinkler("class", "clams", {}), 0.90666));
ok("порядок строк не важен", approx(jaroWinkler("clams", "class", {}), 0.90666));
ok("точное совпадение = 1", jaroWinkler("RICK", "RICK", {}) === 1 && jaroWinkler("seddon", "seddon", {}) === 1);
ok("полное расхождение = 0", jaroWinkler("NOT", "SAME", {}) === 0);
ok("частичное расхождение ≈ 0.575", approx(jaroWinkler("aaa", "abcd", {}), 0.575));

console.log("Поведение LifeOS, которого у донора нет");
const notes = [
  { id: "n1", title: "Месячный прогноз финансов", text: "хочу видеть прогноз трат на месяц вперёд", createdAt: "2026-07-15" },
  { id: "n2", title: "Купить корм коту", text: "заканчивается корм", createdAt: "2026-07-22" },
  { id: "n3", title: "PWA boot", text: "install prompt available", createdAt: "2026-07-27", systemType: "receipt" },
  { id: "n4", title: "Прогноз финансов на месяц", text: "нужен прогноз по деньгам на месяц", createdAt: "2026-07-27" }
];

const found = findSimilarThoughts("месячный прогноз финансов", notes);
ok("похожая мысль найдена", found.length >= 1, "найдено " + found.length);
ok("первой идёт самая близкая", found[0] && (found[0].id === "n1" || found[0].id === "n4"), found[0] ? found[0].id : "пусто");
ok("переформулировка тоже поймана", found.some((row) => row.id === "n4"));
ok("служебная запись не считается мыслью", !found.some((row) => row.id === "n3"));
ok("несвязанная мысль не попала", !found.some((row) => row.id === "n2"));
ok("у находки есть человеческая причина", found[0] && typeof found[0].reason === "string" && found[0].reason.length > 3);
ok("вердикт из трёх допустимых", found.every((row) => ["дубль", "уточнение", "рядом"].includes(row.verdict)));
ok("короткий черновик молчит", findSimilarThoughts("прогноз", notes).length === 0);
ok("своя же запись исключается", !findSimilarThoughts("месячный прогноз финансов", notes, { excludeId: "n1" }).some((row) => row.id === "n1"));
ok("больше лимита не отдаём", findSimilarThoughts("месячный прогноз финансов", notes, { limit: 1 }).length <= 1);

console.log("");
if (failures) {
  console.log("КРАСНЫЙ: " + failures + " из " + checks + " проверок не прошли");
  process.exit(1);
}
console.log("ЗЕЛЁНЫЙ: " + checks + " проверок, включая " + 11 + " тест-кейсов донора natural");
for (const row of found) {
  console.log("  " + row.title + " · " + row.createdAt + " · " + row.verdict + " (" + row.score.toFixed(2) + ") — " + row.reason);
}

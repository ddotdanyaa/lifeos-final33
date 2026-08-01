// tools/audit-people-filter.mjs — гейт боли «Люди пять, он искусственное за людей считает».
//
// Красный без `core/people-filter.mjs`. Проверяет обе стороны сразу, потому что фильтр опасен
// именно перекосом: спрятать живого человека хуже, чем оставить лишнюю строку.
import { personVerdict, filterPeople, looksTechnical } from "../core/people-filter.mjs";

let failures = 0;
let checks = 0;

function ok(name, condition, detail) {
  checks += 1;
  if (condition) return;
  failures += 1;
  console.log("  FAIL " + name + (detail ? " — " + detail : ""));
}

console.log("Не человек — то, что владелец видел в списке людей");
for (const name of ["Финансовый", "Месячный", "Новое", "Whisper", "PWA", "Install Prompt", "Service Worker", "Whisper транскрипт", "Новая запись 30", "OCR", "IndexedDB", "Ollama"]) {
  ok("отвергнут: " + name, !personVerdict(name).isPerson, personVerdict(name).why);
}

console.log("Человек — то, что трогать нельзя ни при каких обстоятельствах");
for (const name of ["Юрий", "Виталий", "Дмитрий", "Анатолий", "Анна", "Максим", "Даня", "Володя", "Анна Петрова", "Мария Ивановна", "John", "Mike"]) {
  ok("оставлен: " + name, personVerdict(name).isPerson, personVerdict(name).why);
}

console.log("Отбор списка");
const people = [
  { name: "Анна", mentions: 4 },
  { name: "Whisper", mentions: 12 },
  { name: "Володя", mentions: 2 },
  { name: "PWA", mentions: 7 },
  { name: "Новая запись 30", mentions: 3 }
];
const result = filterPeople(people);
ok("осталось двое живых", result.kept.length === 2, "осталось " + result.kept.length);
ok("отвергнуто трое служебных", result.dropped.length === 3, "отвергнуто " + result.dropped.length);
ok("у каждого отвергнутого названа причина", result.dropped.every((row) => row.why && row.why.length > 3));
ok("пустой список не ломает отбор", filterPeople([]).kept.length === 0 && filterPeople(undefined).kept.length === 0);

// Второе место с той же болью: правая колонка карточки объекта («похожее по тексту»).
console.log("Служебные строки в «похожем по тексту»");
for (const title of ["PWA boot", "install prompt", "whisper транскрипт", "Service Worker кэш", "Квитанция OCR"]) {
  ok("отвергнута строка: " + title, looksTechnical(title));
}
for (const title of ["Прогноз финансов на месяц", "Купить корм коту", "Встреча с Анной", "Мысль про ферму аккаунтов"]) {
  ok("мысль владельца осталась: " + title, !looksTechnical(title));
}

console.log("");
if (failures) {
  console.log("КРАСНЫЙ: " + failures + " из " + checks + " проверок не прошли");
  process.exit(1);
}
console.log("ЗЕЛЁНЫЙ: " + checks + " проверок");
for (const row of result.dropped) console.log("  убран «" + row.name + "» — " + row.why);

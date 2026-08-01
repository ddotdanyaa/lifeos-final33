// tools/audit-owner-search.mjs — гейт боли «написал „граф“ — ничего не находит».
//
// Красный без `core/owner-search.mjs` и вендоренного `ui/vendor/fuse.mjs`: до них строка «Найти»
// не искала вообще — `searchQuery` писался в состояние и рисовался обратно в поле.
import { searchOwnerData, countFound } from "../core/owner-search.mjs";

let failures = 0;
let checks = 0;

function ok(name, condition, detail) {
  checks += 1;
  if (condition) return;
  failures += 1;
  console.log("  FAIL " + name + (detail ? " — " + detail : ""));
}

const data = {
  notes: [
    { id: "n1", title: "Новая запись 30", text: "расшифровка пока предположение" },
    { id: "n2", title: "Прогноз финансов на месяц", text: "хочу видеть траты вперёд" },
    { id: "n3", title: "PWA boot", text: "install prompt available", systemType: "receipt" },
    { id: "n4", title: "Мысль про граф знаний", text: "связи между записями должны быть видны" },
    { id: "n5", title: "Удалённая мысль", text: "граф", deleted: true }
  ],
  tasks: [{ id: "t1", title: "Починить граф на телефоне" }],
  sources: [{ id: "s1", name: "Новая запись 30.m4a" }],
  goals: [{ id: "g1", title: "Запустить тестировку с 1 августа" }]
};

console.log("Ровно то, что владелец набирал руками и не находил");
const graph = searchOwnerData("граф", data);
ok("«граф» что-то находит", countFound(graph) >= 2, "найдено " + countFound(graph));
ok("«граф» нашёл мысль", graph.some((g) => g.rows.some((r) => r.id === "n4")));
ok("«граф» нашёл задачу", graph.some((g) => g.key === "tasks" && g.rows.length));

const thirty = searchOwnerData("30", data);
ok("«30» что-то находит", countFound(thirty) >= 1, "найдено " + countFound(thirty));

const decode = searchOwnerData("расшифровка тридцать", data);
ok("«расшифровка тридцать» находит запись 30", decode.some((g) => g.rows.some((r) => r.id === "n1")), "найдено " + countFound(decode));

console.log("Чего в выдаче быть не должно");
ok("служебная запись не ищется", !searchOwnerData("prompt", data).some((g) => g.rows.some((r) => r.id === "n3")));
ok("удалённое не ищется", !graph.some((g) => g.rows.some((r) => r.id === "n5")));
ok("одна буква не ищет", searchOwnerData("г", data).length === 0);
ok("пустой запрос не ищет", searchOwnerData("", data).length === 0);
ok("несвязанное не находится", countFound(searchOwnerData("кастрюля велосипед", data)) === 0);

console.log("Дубли: один захват рождает запись И файл — показывать надо один раз");
const dupData = {
  notes: [{ id: "d1", title: "Мысль про граф знаний" }],
  sources: [{ id: "d2", name: "Мысль про граф знаний.md" }]
};
const dup = searchOwnerData("граф знаний", dupData);
ok("одна мысль показана один раз", countFound(dup) === 1, "показано " + countFound(dup));
ok("выиграл раздел, который ближе к владельцу", dup[0] && dup[0].key === "notes", dup[0] ? dup[0].key : "пусто");

console.log("Форма ответа");
ok("результат сгруппирован разделами", graph.every((g) => g.label && Array.isArray(g.rows)));
ok("у каждой строки есть id и заголовок", graph.every((g) => g.rows.every((r) => r.id && r.title)));
ok("группа не раздувается", searchOwnerData("запись", data, { perGroup: 1 }).every((g) => g.rows.length <= 1));
ok("отсутствие данных не ломает", searchOwnerData("граф", {}).length === 0 && searchOwnerData("граф", undefined).length === 0);

console.log("");
if (failures) {
  console.log("КРАСНЫЙ: " + failures + " из " + checks + " проверок не прошли");
  process.exit(1);
}
console.log("ЗЕЛЁНЫЙ: " + checks + " проверок");
for (const group of graph) console.log("  «граф» → " + group.label + ": " + group.rows.map((r) => r.title).join(" · "));

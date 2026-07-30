// Корпус пар для замера «поиска по смыслу» — из НАСТОЯЩИХ записей владельца, а не из придуманных.
//
// Зачем: порог для смысловой близости нельзя выбрать рассуждением. Замер 2026-07-30 на десяти
// придуманных записях показал, что `bge-m3` отделяет «об одном» от шума с запасом всего 0.027 —
// по такому разрыву порог не фиксируется, и «поиск по смыслу» остался выключенным. Владелец на
// вопрос «как лучше собрать корпус?» ответил: «а как лучше будет? Я же не знаю» — то есть решение
// моё. Правильный ответ — его собственные записи: на них порог и будет работать.
//
// Что делает: читает экспорт хранилища (Контроль → «Экспорт всего»), собирает КАНДИДАТОВ в пары
// тремя способами и раскладывает их поровну, чтобы разметка не оказалась однобокой:
//   • один день      — записи одного дня чаще про одно и то же;
//   • редкое слово   — общее слово, встречающееся у него в двух-трёх записях, а не в каждой;
//   • далёкие        — разные дни и ни одного общего редкого слова: заготовка шума.
// Способ — это ГИПОТЕЗА, а не метка. Ответ «связаны / нет» ставит только владелец: если метку
// поставит генератор, замер проверит генератор, а не эмбеддинги.
//
// Запуск: node tools/build-embedding-pairs.mjs <экспорт.json> [--out=docs/qc/embedding-pairs.json]
//         [--pairs=30]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const exportPath = args.find((item) => !item.startsWith("--"));
const outPath = (args.find((item) => item.startsWith("--out=")) || "--out=docs/qc/embedding-pairs.json").slice("--out=".length);
const wantPairs = Number((args.find((item) => item.startsWith("--pairs=")) || "--pairs=30").slice("--pairs=".length)) || 30;

if (!exportPath || !existsSync(exportPath)) {
  console.error("Нужен файл экспорта хранилища. Он делается в приложении: Контроль → «Экспорт всего».");
  console.error("Запуск: node tools/build-embedding-pairs.mjs <экспорт.json>");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(exportPath, "utf8"));
// Экспорт устроен как снимок состояния; заметки могут лежать и в корне, и внутри `state`.
const notesSource = payload.notes || (payload.state && payload.state.notes) || {};
const records = Object.values(notesSource)
  .filter((note) => note && !note.deleted && note.systemType !== "product_brain")
  .map((note) => ({
    id: String(note.id || ""),
    day: String(note.createdAt || "").slice(0, 10),
    text: [String(note.title || ""), String(note.body || "")].join(". ").replace(/\s+/g, " ").trim()
  }))
  // Слишком короткая запись ничего не скажет ни про смысл, ни про шум.
  .filter((record) => record.id && record.text.length >= 15)
  .slice(0, 400);

if (records.length < 6) {
  console.error("В экспорте нашлось записей: " + records.length + ". Для корпуса нужно хотя бы шесть.");
  console.error("Это не ошибка инструмента — просто данных пока мало. Позаписывай ещё и повтори.");
  process.exit(1);
}

// Слова длиной от пяти букв: короткие («если», «надо») связывают что угодно с чем угодно.
const wordsOf = (text) => new Set(String(text).toLowerCase().match(/[a-zа-яё]{5,}/gu) || []);
const wordIndex = new Map();
for (const record of records) {
  for (const word of wordsOf(record.text)) {
    if (!wordIndex.has(word)) wordIndex.set(word, []);
    wordIndex.get(word).push(record.id);
  }
}

const key = (a, b) => [a, b].sort().join("::");
const seen = new Set();
const candidates = [];
const push = (a, b, hypothesis, why) => {
  if (a === b) return;
  const id = key(a, b);
  if (seen.has(id)) return;
  seen.add(id);
  candidates.push({ a, b, hypothesis, why });
};

// 1) Один день.
const byDay = new Map();
for (const record of records) {
  if (!record.day) continue;
  if (!byDay.has(record.day)) byDay.set(record.day, []);
  byDay.get(record.day).push(record.id);
}
for (const [day, ids] of byDay) {
  for (let i = 0; i < ids.length - 1 && i < 3; i += 1) push(ids[i], ids[i + 1], "один день", "записаны " + day);
}

// 2) Редкое общее слово: два-три упоминания. Слово из каждой записи связывает всё со всем.
for (const [word, ids] of wordIndex) {
  if (ids.length < 2 || ids.length > 3) continue;
  push(ids[0], ids[1], "редкое слово", "общее слово «" + word + "»");
}

// 3) Далёкие: разные дни, ни одного общего слова длиной от пяти букв.
const cache = new Map(records.map((record) => [record.id, wordsOf(record.text)]));
const dayOf = new Map(records.map((record) => [record.id, record.day]));
for (let i = 0; i < records.length; i += 1) {
  for (let j = i + 1; j < records.length; j += 1) {
    const a = records[i].id;
    const b = records[j].id;
    if (dayOf.get(a) === dayOf.get(b)) continue;
    const wordsA = cache.get(a);
    let shared = false;
    for (const word of cache.get(b)) {
      if (wordsA.has(word)) {
        shared = true;
        break;
      }
    }
    if (!shared) push(a, b, "далёкие", "разные дни, ни одного общего слова");
  }
}

// Раскладываем поровну по гипотезам: перевес одного вида сделал бы разметку бесполезной.
const perKind = Math.max(1, Math.round(wantPairs / 3));
const chosen = [];
for (const hypothesis of ["один день", "редкое слово", "далёкие"]) {
  chosen.push(...candidates.filter((item) => item.hypothesis === hypothesis).slice(0, perKind));
}

const textOf = new Map(records.map((record) => [record.id, record.text]));
const out = {
  созданКогда: new Date().toISOString(),
  источник: exportPath,
  записей: records.length,
  как_размечать: "В каждой паре поставь в поле «связаны» либо «да», либо «нет». «Да» — если обе записи про одно и то же дело, предмет или событие. Связь «по жизни» (одна мысль объясняет другую, но говорят они о разном) — это «нет»: вектор такого не обещает, это работа графа.",
  что_дальше: "node tools/measure-semantic-neighbors.mjs --pairs=" + outPath + " — он посчитает разрыв между «да» и «нет» и скажет, можно ли включать поиск по смыслу.",
  пары: chosen.map((item) => ({
    связаны: "",
    гипотеза: item.hypothesis,
    почему_предложена: item.why,
    a: { id: item.a, текст: (textOf.get(item.a) || "").slice(0, 240) },
    b: { id: item.b, текст: (textOf.get(item.b) || "").slice(0, 240) }
  }))
};

if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");

console.log(JSON.stringify({
  инструмент: "build-embedding-pairs",
  записей: records.length,
  кандидатов: candidates.length,
  пар_в_файле: out.пары.length,
  по_гипотезам: {
    "один день": out.пары.filter((item) => item.гипотеза === "один день").length,
    "редкое слово": out.пары.filter((item) => item.гипотеза === "редкое слово").length,
    "далёкие": out.пары.filter((item) => item.гипотеза === "далёкие").length
  },
  файл: outPath
}, null, 2));
console.log("");
console.log("Пары собраны, но НЕ размечены — метку ставит только владелец.");
console.log("Открой " + outPath + " и заполни поле «связаны» (да/нет) в каждой паре.");

// П29 · КАЛИБРОВКА ПРИЁМКИ. Та же механика, что и в петле (см. О3), но ставка другая: не «примет
// ли владелец предложение», а «примет ли он ПАКЕТ этого вида».
//
// Зачем: если каждый пакет требует его глаза, автономность упирается в его сутки. Если ни один
// не требует — он теряет продукт. Выход не в доверии «вообще», а в доверии ПО ВИДАМ РАБОТЫ,
// подтверждённом историей: владелец утверждает ПОЛИТИКУ («правки брифов сливай сам»), а не
// каждый экземпляр («этот бриф сливай»).
//
// Три правила, без которых это превращается в самообман:
//
//   1. Политику включает ВЛАДЕЛЕЦ, не инструмент. Файл `docs/qc/acceptance-policy.json`
//      предлагается здесь, но поле `approvedByOwner` ставит только он. Пока его нет — политика
//      не действует, сколько бы ни было зелёной истории.
//   2. Планка высокая и с запасом по объёму: ≥95% принятых при ≥20 пакетах вида. На пяти
//      наблюдениях 100% не значит ничего.
//   3. НЕОБРАТИМОЕ — всегда через владельца, при любой истории. Удаление данных, публикация,
//      деньги, ключи, внешние вызовы. Тут статистика не аргумент: цена одной ошибки не
//      компенсируется девяноста девятью удачами.
//
// Запуск:
//   node tools/acceptance-policy.mjs            # что история говорит о видах работы
//   node tools/acceptance-policy.mjs --propose  # записать предложение политики (владельцу — утвердить)
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const CHRONICLE = "docs/qc/DISPATCHER_CHRONICLE.jsonl";
const POLICY = "docs/qc/acceptance-policy.json";
const MIN_SAMPLES = 20;
const MIN_ACCURACY = 0.95;

// Виды работы, у которых цена ошибки не считается статистикой. Список закрытый и расширяется
// только владельцем: сомнение здесь трактуется в пользу «спросить».
const NEVER_AUTOMATIC = [
  { kind: "удаление данных", why: "потерянное не возвращается зелёным гейтом" },
  { kind: "публикация наружу", why: "опубликованное уже прочитано, даже если удалить" },
  { kind: "деньги и платежи", why: "цена одной ошибки не компенсируется девяноста девятью удачами" },
  { kind: "ключи и учётные записи", why: "их вводит только владелец (CLAUDE.md §7)" },
  { kind: "смена контракта продукта", why: "9 пунктов меню, Seven Contracts, инварианты — это его решения, а не наши" }
];

// Вид работы выводится из названия пакета: «бриф», «спека», «аудит», «разбор», «UI». Грубо и
// намеренно: тонкая классификация здесь создала бы виды по одному наблюдению в каждом.
function workKind(title) {
  const text = String(title || "").toLocaleLowerCase("ru-RU");
  if (/бриф|контекст|док|летопис/.test(text)) return "документация";
  if (/аудит|гейт|спек|тест/.test(text)) return "гейты и спеки";
  if (/меню|экран|карточк|интерфейс|дизайн|ui/.test(text)) return "интерфейс";
  if (/разбор|намерен|речь|захват/.test(text)) return "разбор захвата";
  if (/петл|калибров|журнал решен/.test(text)) return "петля";
  if (/раскол|модул|рефактор/.test(text)) return "структура кода";
  return "прочее";
}

const rows = existsSync(CHRONICLE)
  ? readFileSync(CHRONICLE, "utf8").split(/\r?\n/).filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean)
  : [];

const decided = rows.filter((row) => row.event === "merged" || row.event === "blocked" || row.event === "owner-rejected");

const byKind = new Map();
for (const row of decided) {
  const kind = workKind(row.task);
  if (!byKind.has(kind)) byKind.set(kind, { kind, total: 0, accepted: 0 });
  const bucket = byKind.get(kind);
  bucket.total += 1;
  // Принято = влито и владелец потом не откатил. Откат считается отказом: он и есть его вердикт.
  if (row.event === "merged") bucket.accepted += 1;
}

const kinds = [...byKind.values()].map((bucket) => {
  const accuracy = bucket.total ? bucket.accepted / bucket.total : 0;
  const eligible = bucket.total >= MIN_SAMPLES && accuracy >= MIN_ACCURACY;
  return {
    kind: bucket.kind,
    packages: bucket.total,
    accepted: bucket.accepted,
    accuracy: Number(accuracy.toFixed(3)),
    eligible,
    status: bucket.total < MIN_SAMPLES
      ? "мало наблюдений: " + bucket.total + " из " + MIN_SAMPLES
      : (accuracy >= MIN_ACCURACY ? "можно предлагать владельцу авто-слияние" : "точность " + Math.round(accuracy * 100) + "% — ниже планки 95%")
  };
}).sort((a, b) => b.packages - a.packages);

const existing = existsSync(POLICY) ? JSON.parse(readFileSync(POLICY, "utf8")) : null;

console.log(JSON.stringify({
  audit: "acceptance-policy",
  "решённых пакетов в летописи": decided.length,
  "порог наблюдений": MIN_SAMPLES,
  "порог точности": MIN_ACCURACY,
  виды: kinds,
  "политика утверждена владельцем": Boolean(existing && existing.approvedByOwner)
}, null, 2));

if (!decided.length) {
  console.log("\nИстории пока нет: диспетчер ещё не принимал решений по пакетам.");
  console.log("Пока её нет, авто-слияние невозможно ни для одного вида работы — и это правильный");
  console.log("исход, а не недоработка. Доверие берётся из наблюдений, а не из уверенности.");
}

console.log("\nВСЕГДА через владельца, при любой истории:");
for (const row of NEVER_AUTOMATIC) console.log("  • " + row.kind + " — " + row.why);

if (process.argv.includes("--propose")) {
  const proposal = {
    proposedAt: new Date().toISOString().slice(0, 10),
    minSamples: MIN_SAMPLES,
    minAccuracy: MIN_ACCURACY,
    // Ключевое поле. Инструмент ставит false и не имеет права поставить true: политику включает
    // владелец, а не история. Иначе система разрешает себе сама — а это ровно то, чего нельзя.
    approvedByOwner: Boolean(existing && existing.approvedByOwner),
    autoMergeKinds: kinds.filter((row) => row.eligible).map((row) => row.kind),
    neverAutomatic: NEVER_AUTOMATIC.map((row) => row.kind),
    evidence: kinds
  };
  writeFileSync(POLICY, JSON.stringify(proposal, null, 2) + "\n", "utf8");
  console.log("\nПредложение политики записано в " + POLICY + ".");
  console.log("Оно НЕ действует: чтобы включить, владелец сам ставит \"approvedByOwner\": true.");
  console.log("Инструмент этого поля не трогает — иначе система разрешала бы себе сама.");
}

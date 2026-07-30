// Замер «похожего по смыслу» против «похожего по тексту» (§2.3 очереди ноутбука, срез I5).
//
// Зачем инструмент, а не вера: порог `SIMILAR_MIN_SCORE = 0.1` для лексической половины выбран
// ЗАМЕРОМ (настоящая пара 0.138, шум 0.069 — разделение вдвое, порог посередине). Для смысловой
// половины порог обязан выбираться так же, иначе «поиск по смыслу» станет генератором связей,
// которых владелец не признаёт, — а неверная связь дороже отсутствующей.
//
// Что делает: берёт пары записей с ИЗВЕСТНЫМ ответом (связаны / не связаны — размечено здесь, до
// замера), считает для каждой пары лексическую близость приложения и косинус эмбеддингов живого
// Ollama, и печатает обе колонки рядом. Порог для смысла = середина разрыва между худшей настоящей
// парой и лучшим шумом; если разрыва нет — вывод честный: «эмбеддинги не отделяют смысл от шума на
// этих данных», и включать их нельзя.
//
// Запуск: node tools/measure-semantic-neighbors.mjs [--model=nomic-embed-text]
// Нужны:  `npm start` на 4173 и живой Ollama со скачанной моделью эмбеддингов.

const APP_URL = process.env.LIFEOS_URL || "http://127.0.0.1:4173";
const OLLAMA = process.env.OLLAMA_ENDPOINT || "http://127.0.0.1:11434";
const found = process.argv.slice(2).find((item) => item.startsWith("--model="));
const MODEL = found ? found.slice("--model=".length) : (process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text");

// Записи владельца из его же сценария. Пары размечены ДО замера: `related: true` — те, которые он
// сам назвал бы про одно; `false` — те, где совпадают только слова или вообще ничего.
const RECORDS = [
  { id: "goal-car", text: "Хочу купить машину до августа" },
  { id: "sell-old", text: "Оценить продажу старой машины" },
  { id: "free-money", text: "Посчитать свободные деньги за три месяца" },
  { id: "credit-stance", text: "Марина против кредита, согласна если без кредита" },
  { id: "call-mom", text: "Позвонить маме в воскресенье" },
  { id: "dentist", text: "Записаться к стоматологу" },
  { id: "shift-money", text: "Отработал десять часов, вышло 6800" },
  { id: "shift-tired", text: "Смена была тяжёлая, устал сильно" },
  { id: "english", text: "Английский снова откладываю" },
  { id: "gym", text: "Завтра в 14:00 зал, купить протеин" }
];

const PAIRS = [
  { a: "goal-car", b: "sell-old", related: true, why: "продажа старой — часть покупки новой" },
  { a: "goal-car", b: "free-money", related: true, why: "деньги считаются под эту покупку" },
  { a: "goal-car", b: "credit-stance", related: true, why: "кредит — способ купить машину" },
  { a: "shift-money", b: "shift-tired", related: true, why: "одна и та же смена" },
  { a: "call-mom", b: "dentist", related: false, why: "два разных дела, общего только «надо»" },
  { a: "goal-car", b: "call-mom", related: false, why: "ничего общего" },
  { a: "english", b: "gym", related: false, why: "оба про себя, но про разное" },
  { a: "shift-money", b: "free-money", related: false, why: "совпадает слово «деньги», смысл разный" }
];

async function up(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function embed(text) {
  const response = await fetch(OLLAMA.replace(/\/+$/, "") + "/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: text })
  });
  if (!response.ok) throw new Error("Ollama ответил HTTP " + response.status);
  const payload = await response.json();
  if (!Array.isArray(payload.embedding) || !payload.embedding.length) throw new Error("модель вернула пустой вектор");
  return payload.embedding;
}

function cosine(left, right) {
  let dot = 0;
  let normLeft = 0;
  let normRight = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    dot += left[index] * right[index];
    normLeft += left[index] * left[index];
    normRight += right[index] * right[index];
  }
  const denominator = Math.sqrt(normLeft) * Math.sqrt(normRight);
  return denominator > 0 ? dot / denominator : 0;
}

if (!(await up(OLLAMA + "/api/tags"))) {
  console.error("Ollama на " + OLLAMA + " не отвечает — мерить смысл нечем.");
  process.exit(1);
}

// Лексическая половина считается ТЕМ ЖЕ кодом, что у владельца на экране: приложение открывается
// по-настоящему, записи заводятся его же путём. Отдельная копия tf-idf мерила бы саму себя.
const { chromium } = await import("playwright");
const { existsSync, readdirSync } = await import("node:fs");
const { join } = await import("node:path");
function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  return readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"))
    .find((candidate) => existsSync(candidate));
}

if (!(await up(APP_URL))) {
  console.error("Приложение на " + APP_URL + " не отвечает. Подними `npm start`.");
  process.exit(1);
}

const localChromium = findLocalChromium();
const browser = await chromium.launch(localChromium ? { executablePath: localChromium } : {});
const page = await browser.newPage();
let lexical = {};
try {
  await page.goto(APP_URL + "?measure-semantic=" + Date.now(), { waitUntil: "networkidle", timeout: 60000 });
  await page.locator(".lifeos-shell-v2").waitFor({ state: "visible", timeout: 30000 });
  lexical = await page.evaluate(async ({ records, pairs }) => {
    const api = window.__lifeosKnowledgeBase;
    await api.resetForTest();
    const ids = {};
    for (const record of records) ids[record.id] = await api.seedOwnerNoteForTest(record.text, 0);
    const scores = {};
    for (const pair of pairs) {
      const rows = api.similarScoresForTest(ids[pair.a]) || [];
      const row = rows.find((item) => String(item.label || "").includes(records.find((record) => record.id === pair.b).text.slice(0, 24)));
      scores[pair.a + "|" + pair.b] = row ? row.cosine : 0;
    }
    return scores;
  }, { records: RECORDS, pairs: PAIRS });
} finally {
  await browser.close();
}

const vectors = {};
for (const record of RECORDS) vectors[record.id] = await embed(record.text);

const rows = PAIRS.map((pair) => ({
  pair: pair.a + " ↔ " + pair.b,
  связаны: pair.related,
  почему: pair.why,
  "по тексту": Math.round((lexical[pair.a + "|" + pair.b] || 0) * 1000) / 1000,
  "по смыслу": Math.round(cosine(vectors[pair.a], vectors[pair.b]) * 1000) / 1000
}));

console.table(rows);

const relatedScores = rows.filter((row) => row.связаны).map((row) => row["по смыслу"]);
const noiseScores = rows.filter((row) => !row.связаны).map((row) => row["по смыслу"]);
const worstRelated = Math.min(...relatedScores);
const bestNoise = Math.max(...noiseScores);

console.log("\nСмысл: худшая настоящая пара " + worstRelated + ", лучший шум " + bestNoise);
if (worstRelated > bestNoise) {
  console.log("Разрыв есть. Порог по замеру (середина): " + (Math.round(((worstRelated + bestNoise) / 2) * 1000) / 1000));
} else {
  console.log("РАЗРЫВА НЕТ: на этих данных эмбеддинги не отделяют смысл от шума.");
  console.log("Включать «похожее по смыслу» с таким разделением нельзя — связь, которой нет, дороже отсутствующей.");
}

const lexRelated = Math.min(...rows.filter((row) => row.связаны).map((row) => row["по тексту"]));
const lexNoise = Math.max(...rows.filter((row) => !row.связаны).map((row) => row["по тексту"]));
console.log("Текст (для сравнения): худшая настоящая пара " + lexRelated + ", лучший шум " + lexNoise);
console.log("Пары, которые текст НЕ находит, а смысл находит — это и есть польза эмбеддингов:");
for (const row of rows) {
  if (row.связаны && row["по тексту"] < 0.1 && row["по смыслу"] > bestNoise) console.log("  · " + row.pair + " (" + row.почему + ")");
}

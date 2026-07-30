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
let RECORDS = [
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

// Первая разметка смешивала ДВА разных отношения, и замер из-за этого обвинял эмбеддинги в том,
// чего они и не обещают:
//   `смысл`   — записи об одном и том же предмете или событии. Это ровно то, что вектор умеет.
//   `контекст`— связаны жизнью владельца, а не языком («Марина против кредита» ↔ «хочу машину»).
//               Это знание про ЕГО план, и добывается оно графом и его же подтверждениями, а не
//               близостью фраз. Требовать этого от эмбеддингов — мерить не тот инструмент.
//   `шум`     — не связаны никак либо совпадают только словом.
let PAIRS = [
  { a: "goal-car", b: "sell-old", kind: "смысл", why: "обе про машину" },
  { a: "shift-money", b: "shift-tired", kind: "смысл", why: "одна и та же смена" },
  { a: "goal-car", b: "free-money", kind: "контекст", why: "деньги считаются под эту покупку" },
  { a: "goal-car", b: "credit-stance", kind: "контекст", why: "кредит — способ купить машину" },
  { a: "call-mom", b: "dentist", kind: "шум", why: "два разных дела, общего только «надо»" },
  { a: "goal-car", b: "call-mom", kind: "шум", why: "ничего общего" },
  { a: "english", b: "gym", kind: "шум", why: "оба про себя, но про разное" },
  { a: "shift-money", b: "free-money", kind: "шум", why: "совпадает слово «деньги», смысл разный" }
];

// ДОБАВЛЕНО 2026-07-30: замер на десяти придуманных записях дал разрыв 0.027 — по такому порог не
// фиксируется, и это был честный тупик, а не результат. Выход один: мерить на НАСТОЯЩИХ записях
// владельца с его же разметкой. Файл готовит `tools/build-embedding-pairs.mjs`, метки ставит он.
// Пары без метки просто пропускаются: незаполненная строка не должна тихо стать «не связаны».
const pairsArg = process.argv.slice(2).find((item) => item.startsWith("--pairs="));
if (pairsArg) {
  const path = pairsArg.slice("--pairs=".length);
  const { readFileSync, existsSync } = await import("node:fs");
  if (!existsSync(path)) {
    console.error("Файла с парами нет: " + path);
    console.error("Собери его: node tools/build-embedding-pairs.mjs <экспорт.json>");
    process.exit(1);
  }
  const file = JSON.parse(readFileSync(path, "utf8"));
  const rows = Array.isArray(file.пары) ? file.пары : [];
  const labelled = rows.filter((row) => /^(да|нет)$/i.test(String(row.связаны || "").trim()));
  if (labelled.length < 6) {
    console.error("Размечено пар: " + labelled.length + " из " + rows.length + ". Нужно хотя бы шесть.");
    console.error("Открой " + path + " и заполни поле «связаны» (да/нет). Без разметки замерять нечего:");
    console.error("порог, выбранный по неразмеченным парам, — это порог, выбранный наугад.");
    process.exit(1);
  }
  RECORDS.length = 0;
  PAIRS.length = 0;
  const known = new Set();
  for (const row of labelled) {
    for (const side of ["a", "b"]) {
      const item = row[side] || {};
      if (known.has(item.id)) continue;
      known.add(item.id);
      RECORDS.push({ id: String(item.id), text: String(item.текст || item.text || "") });
    }
    const related = /^да$/i.test(String(row.связаны).trim());
    PAIRS.push({ a: String(row.a.id), b: String(row.b.id), kind: related ? "смысл" : "шум", why: String(row.почему_предложена || "разметка владельца") });
  }
  console.log("Корпус владельца: записей " + RECORDS.length + ", размеченных пар " + PAIRS.length + " (из " + rows.length + ").");
}

async function up(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

// `nomic-embed-text` без задачного префикса работает заметно хуже — это требование самой модели, а
// не наша догадка. Мерить её без префикса значило бы обвинить модель в том, чего мы ей не дали.
const PREFIX = /nomic/i.test(MODEL) ? "search_document: " : "";

async function embed(text) {
  const response = await fetch(OLLAMA.replace(/\/+$/, "") + "/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: PREFIX + text })
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
  // После сброса приложение заводит папку заново, и до этого момента запись не создаётся вовсе
  // (`createNote` без папки отдаёт пустой id). Первая версия замера этого не ждала и получила
  // лексическую колонку из нулей — то есть «текст не находит ничего», чего на самом деле нет.
  await page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest());
  await page.getByTestId("surface-inbox").first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => Boolean(window.__lifeosKnowledgeBase.getStateSnapshot().activeFolderId), null, { timeout: 20000 });
  lexical = await page.evaluate(async ({ records, pairs }) => {
    const api = window.__lifeosKnowledgeBase;
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
  чего: pair.kind,
  почему: pair.why,
  "по тексту": Math.round((lexical[pair.a + "|" + pair.b] || 0) * 1000) / 1000,
  "по смыслу": Math.round(cosine(vectors[pair.a], vectors[pair.b]) * 1000) / 1000
}));

console.table(rows);

const scoresOf = (kind) => rows.filter((row) => row.чего === kind).map((row) => row["по смыслу"]);
const semantic = scoresOf("смысл");
const context = scoresOf("контекст");
const noise = scoresOf("шум");
const worstSemantic = Math.min(...semantic);
const bestNoise = Math.max(...noise);

console.log("\nМодель: " + MODEL + (PREFIX ? " (с префиксом «" + PREFIX.trim() + "»)" : ""));
console.log("Пары об одном предмете: " + JSON.stringify(semantic) + " — худшая " + worstSemantic);
console.log("Шум: " + JSON.stringify(noise) + " — лучший " + bestNoise);
console.log("Связи по контексту жизни: " + JSON.stringify(context) + " — от эмбеддингов НЕ ждём, это дело графа");

if (worstSemantic > bestNoise) {
  const threshold = Math.round(((worstSemantic + bestNoise) / 2) * 1000) / 1000;
  const margin = Math.round((worstSemantic - bestNoise) * 1000) / 1000;
  console.log("\nРазрыв ЕСТЬ: " + margin + " (порог по середине — " + threshold + ").");
  if (semantic.length < 6 || margin < 0.08) {
    console.log("Но фиксировать порог по нему НЕЛЬЗЯ: пар об одном предмете всего " + semantic.length +
      ", запас " + margin + ". Нужен корпус пар из настоящих записей владельца, а не из этой заготовки.");
  }
} else {
  console.log("\nРАЗРЫВА НЕТ: на этих данных модель не отделяет «об одном» от шума.");
  console.log("Включать «похожее по смыслу» нельзя — связь, которой нет, дороже отсутствующей.");
}

console.log("\nТекст (для сравнения): пары об одном " + JSON.stringify(rows.filter((row) => row.чего === "смысл").map((row) => row["по тексту"])) +
  ", лучший шум " + Math.max(...rows.filter((row) => row.чего === "шум").map((row) => row["по тексту"])));
console.log("Где смысл сильнее текста (в этом и была бы польза):");
for (const row of rows) {
  if (row.чего === "смысл" && row["по тексту"] < 0.1 && row["по смыслу"] > bestNoise) console.log("  · " + row.pair + " — " + row.почему);
}

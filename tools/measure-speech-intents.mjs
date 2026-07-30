// Замер разбора речи: ПРАВИЛА против ПРАВИЛ ПЛЮС МОДЕЛЬ (RR-001 Этап B, слой «в»).
//
// Зачем инструмент, а не спека: спека отвечает «работает/не работает», а здесь нужен ответ
// «лучше или хуже и на сколько». Владелец диктует двадцать с лишним раз за вечер, и решение
// «включать ли локальную модель по умолчанию» стоит принимать по числам на таком объёме, а не по
// одной удачной фразе. Так уже выбирался порог `SIMILAR_MIN_SCORE` и модель whisper.
//
// Что мерится:
//   1. Правила — `analyzeArtifactInput` (Этап A + Этап B), ровно то, что владелец видит сейчас.
//   2. Правила + модель — тот же разбор плюс намерения от живого Ollama через `mergeModelSpeechIntents`.
// Оба прогона идут В ПРИЛОЖЕНИИ, а не в отдельной копии логики: копия мерила бы саму себя.
//
// Ожидание (`expect` в корпусе) написано до замера и по СКАЗАННОМУ, а не по возможностям разбора.
// Промах — то, чего владелец не увидел. Лишний — объект, которого он не диктовал; в его прошлой
// жалобе именно лишние («12 объектов на одну голосовую») были дороже промахов.
//
// Запуск:  node tools/measure-speech-intents.mjs [--model=qwen2.5:3b] [--corpus=путь] [--out=путь]
// Нужны:   `npm start` на 4173, живой Ollama на 11434, корпус от `tools/make-voice-corpus.mjs`.

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

function argValue(name, fallback) {
  const found = process.argv.slice(2).find((item) => item.startsWith("--" + name + "="));
  return found ? found.slice(name.length + 3) : fallback;
}

const APP_URL = process.env.LIFEOS_URL || "http://127.0.0.1:4173";
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "http://127.0.0.1:11434";
const MODEL = argValue("model", process.env.OLLAMA_MODEL || "qwen2.5:3b");
const CORPUS = argValue("corpus", "output/playwright/fixtures/voice-corpus.json");
// Правила без модели: прогон на порядок быстрее (секунды против минут), и именно он нужен, когда
// мерят ПРАВКУ ПРАВИЛ. Спрашивать модель, чтобы узнать, стало ли лучше в правилах, — трата вечера.
const SKIP_MODEL = process.argv.slice(2).includes("--no-model");
const OUT = argValue("out", join("output", "measure", "speech-intents-" + (SKIP_MODEL ? "rules-only" : MODEL.replace(/[^a-z0-9.]+/gi, "-")) + ".json"));

// Тот же поиск локального Chromium, что в `audit-app-boots`: полного браузера здесь нет.
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

// Служебные черновики есть у КАЖДОЙ записи независимо от её смысла: «сохранить источник»,
// «открыть контекст в чате», «записать связи». Считать их лишними — значит утопить разницу
// между правилами и моделью в постоянном слагаемом, одинаковом для обеих сторон. Поэтому они
// названы отдельно, а не вычеркнуты: владелец их видит, и число это честное.
const SERVICE_DRAFT_IDS = new Set(["knowledge-summary", "automation-context", "control-graph", "media-transcript", "media-parser"]);

function isServiceDraft(draft) {
  return SERVICE_DRAFT_IDS.has(String(draft && draft.draftId || ""));
}

function draftAmount(draft) {
  const fields = draft && draft.fields ? draft.fields : {};
  // У баланса сумма лежит в своём поле (`balance`), а не в `amount`: счёт — это не транзакция.
  for (const name of ["amount", "balance", "value", "sum", "perHour"]) {
    const value = Number(fields[name]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function draftMatches(expectation, draft) {
  const types = Array.isArray(expectation.type) ? expectation.type : [expectation.type];
  if (!types.includes(draft.type)) return false;
  if (expectation.amount !== undefined && draftAmount(draft) !== expectation.amount) return false;
  if (expectation.hours !== undefined && Number(draft.fields && draft.fields.hours) !== expectation.hours) return false;
  if (expectation.startTime !== undefined && String(draft.fields && draft.fields.startTime) !== expectation.startTime) return false;
  return true;
}

// Жадное сопоставление: одно ожидание закрывается одним объектом. Второй объект того же смысла
// остаётся лишним — и это верно, потому что владельцу его показывают дважды.
function score(expectations, drafts) {
  const used = new Set();
  const hits = [];
  const misses = [];
  for (const expectation of expectations) {
    let matchedIndex = -1;
    for (let index = 0; index < drafts.length; index += 1) {
      if (used.has(index)) continue;
      if (!draftMatches(expectation, drafts[index])) continue;
      matchedIndex = index;
      break;
    }
    if (matchedIndex < 0) {
      // Промах промаху не равен. «Ждали смену, а получили календарный блок с тем же временем» —
      // это спор о типе, и по нему решает продукт, а не замер. «Ждали доход 4700 и не получили
      // ничего» — потеря сказанного. Смешивать их в одно число значит потом чинить не то.
      const near = drafts.find((item) => {
        if (expectation.amount !== undefined) return draftAmount(item) === expectation.amount;
        if (expectation.startTime !== undefined) return String(item.fields && item.fields.startTime) === expectation.startTime;
        if (expectation.hours !== undefined) return Number(item.fields && item.fields.hours) === expectation.hours;
        return false;
      });
      misses.push(Object.assign({}, expectation, near ? { рядом: near.type + " · " + near.title } : {}));
    } else {
      used.add(matchedIndex);
      hits.push({ expectation, draft: drafts[matchedIndex] });
    }
  }
  const extras = drafts.filter((_, index) => !used.has(index));
  return { hits, misses, extras };
}

function shortDraft(draft) {
  return draft.type + " · " + String(draft.title || "").slice(0, 60);
}

async function serverIsUp(url) {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

if (!existsSync(CORPUS)) {
  console.error("Корпуса нет: " + CORPUS);
  console.error("Собери его на ноутбуке: node tools/make-voice-corpus.mjs (нужен npm run whisper-server)");
  process.exit(1);
}
if (!(await serverIsUp(APP_URL))) {
  console.error("Приложение на " + APP_URL + " не отвечает. Подними `npm start`.");
  process.exit(1);
}
const ollamaUp = SKIP_MODEL ? false : await serverIsUp(OLLAMA_ENDPOINT + "/api/tags");
if (!SKIP_MODEL && !ollamaUp) {
  // Честный статус вместо имитации: без демона мерить «правила плюс модель» нечем.
  console.error("Ollama на " + OLLAMA_ENDPOINT + " не отвечает. Замер слоя модели невозможен.");
  process.exit(1);
}

const corpus = JSON.parse(readFileSync(CORPUS, "utf8"));
const localChromium = findLocalChromium();
const browser = await chromium.launch(localChromium ? { executablePath: localChromium } : {});
const page = await browser.newPage();
const rows = [];

try {
  await page.goto(APP_URL + "?measure=" + Date.now(), { waitUntil: "networkidle", timeout: 60000 });
  await page.locator(".lifeos-shell-v2").waitFor({ state: "visible", timeout: 30000 });

  for (let index = 0; index < corpus.length; index += 1) {
    const record = corpus[index];
    const heard = String(record.heard || record.said || "");
    const result = await page.evaluate(async ({ text, endpoint, model, skipModel }) => {
      const api = window.__lifeosKnowledgeBase;
      const analysis = api.analyzeArtifactInput(text);
      const slim = (list) => (list || []).map((item) => ({ draftId: item.draftId, type: item.type, title: item.title, fields: item.fields || {} }));
      const rules = slim(analysis.drafts);
      const model_ = skipModel
        ? { status: "off", intents: [], rejected: [], latencyMs: 0 }
        : await api.requestSpeechIntentsFromModel(text, { endpoint, model });
      let addedDrafts = [];
      if (model_.status === "ok") {
        const added = api.mergeModelSpeechIntentsForTest(analysis.speechIntents || [], model_.intents);
        addedDrafts = slim(api.draftsFromSpeechIntents(added));
      }
      return {
        rules,
        model: {
          status: model_.status,
          latencyMs: model_.latencyMs || 0,
          returned: model_.returned || 0,
          rejected: (model_.rejected || []).length,
          // Причина отказа важнее числа: «цитаты нет в словах владельца» значит, что модель
          // пересказывает, а «нет обязательного поля» — что не понимает схему. Лечится это
          // по-разному, а без причины и то и другое выглядит как «модель не сработала».
          rejectedReasons: (model_.rejected || []).map((item) => item.reason || "?"),
          error: model_.error || "",
          added: addedDrafts
        }
      };
    }, { text: heard, endpoint: OLLAMA_ENDPOINT, model: MODEL, skipModel: SKIP_MODEL });

    const expectations = Array.isArray(record.expect) ? record.expect : [];
    const rulesScore = score(expectations, result.rules);
    const bothScore = score(expectations, result.rules.concat(result.model.added));
    rows.push({ heard, expectations, result, rulesScore, bothScore });

    console.log(
      "[" + (index + 1) + "/" + corpus.length + "] " +
      "ожидали " + expectations.length +
      " · правила: попал " + rulesScore.hits.length + ", лишних " + rulesScore.extras.length +
      " · +модель (" + result.model.status + ", " + Math.round(result.model.latencyMs / 100) / 10 + " с): попал " +
      bothScore.hits.length + ", лишних " + bothScore.extras.length +
      (result.model.added.length ? " [добавила: " + result.model.added.map(shortDraft).join("; ") + "]" : "")
    );
  }
} finally {
  await browser.close();
}

const sum = (list) => list.reduce((total, item) => total + item, 0);
const latencies = rows.map((row) => row.result.model.latencyMs).sort((left, right) => left - right);
const statuses = {};
for (const row of rows) statuses[row.result.model.status] = (statuses[row.result.model.status] || 0) + 1;
const reasons = {};
for (const row of rows) {
  for (const reason of row.result.model.rejectedReasons || []) reasons[reason] = (reasons[reason] || 0) + 1;
}

const summary = {
  замер: "speech-intents",
  модель: SKIP_MODEL ? "нет (только правила)" : MODEL,
  корпус: CORPUS,
  записей: rows.length,
  ожиданий: sum(rows.map((row) => row.expectations.length)),
  правила: {
    объектов: sum(rows.map((row) => row.result.rules.length)),
    попаданий: sum(rows.map((row) => row.rulesScore.hits.length)),
    промахов: sum(rows.map((row) => row.rulesScore.misses.length)),
    "из них спор о типе": sum(rows.map((row) => row.rulesScore.misses.filter((item) => item.рядом).length)),
    лишних: sum(rows.map((row) => row.rulesScore.extras.length)),
    "из них служебных": sum(rows.map((row) => row.rulesScore.extras.filter(isServiceDraft).length))
  },
  "правила+модель": {
    объектов: sum(rows.map((row) => row.result.rules.length + row.result.model.added.length)),
    попаданий: sum(rows.map((row) => row.bothScore.hits.length)),
    промахов: sum(rows.map((row) => row.bothScore.misses.length)),
    "из них спор о типе": sum(rows.map((row) => row.bothScore.misses.filter((item) => item.рядом).length)),
    лишних: sum(rows.map((row) => row.bothScore.extras.length)),
    "из них служебных": sum(rows.map((row) => row.bothScore.extras.filter(isServiceDraft).length)),
    "добавила модель": sum(rows.map((row) => row.result.model.added.length)),
    "отклонено валидатором": sum(rows.map((row) => row.result.model.rejected))
  },
  "задержка модели": {
    медиана: latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0,
    максимум: latencies.length ? latencies[latencies.length - 1] : 0,
    "сумма на вечер": sum(latencies)
  },
  статусы: statuses,
  "почему валидатор отклонял": reasons
};

console.log("\n" + JSON.stringify(summary, null, 2));

console.log("\nПромахи правил (чего владелец не увидел):");
for (const row of rows) {
  for (const miss of row.rulesScore.misses) {
    console.log("  · " + JSON.stringify(miss) + "  ← «" + row.heard.slice(0, 70) + "»");
  }
}
console.log("\nЛишние у правил (чего он не диктовал):");
for (const row of rows) {
  for (const extra of row.rulesScore.extras) console.log("  · " + shortDraft(extra) + "  ← «" + row.heard.slice(0, 50) + "»");
}
console.log("\nЧто добавила модель:");
for (const row of rows) {
  for (const added of row.result.model.added) console.log("  · " + shortDraft(added) + "  ← «" + row.heard.slice(0, 50) + "»");
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ summary, rows }, null, 2) + "\n", "utf8");
console.log("\nЗамер записан: " + OUT);

// Локальный шлюз к бесплатным LLM: один адрес для Cursor, ключи внутри, переключение автоматом.
//
// Зачем он, если есть free-ai-keys.mjs: у бесплатных тарифов лимит выбирается посреди работы.
// Вставленный руками ключ в этот момент просто перестаёт отвечать, и владелец теряет ход — ровно
// то, чего он просил не допустить. Шлюз ловит 429/401 и уходит на следующего провайдера в том же
// запросе, поэтому в Cursor адрес вставляется ОДИН раз и больше не трогается.
//
// Что он НЕ делает: не заводит аккаунты, не выпрашивает и не подбирает ключи. Работает ровно на
// тех ключах, которые владелец получил сам по ссылкам из tools/free-ai-providers.json.
//
// Запуск:  node tools/ai-gateway.mjs [--port=4180]
// В Cursor: Base URL = http://127.0.0.1:4180/v1, API Key = любая строка, Model = lifeos-auto
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const port = Number((process.argv.find((a) => a.startsWith("--port=")) || "--port=4180").slice(7)) || 4180;

const registryArg = process.argv.find((a) => a.startsWith("--registry="));
const registryPath = registryArg ? registryArg.slice("--registry=".length) : join(here, "free-ai-providers.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8")).providers;

// Ключи там же, где их читает проверялка: один файл на оба инструмента. Текущий каталог тоже
// смотрим — шлюз запускают откуда угодно, и «ключей не найдено» при лежащем рядом файле врёт.
function loadKeys() {
  const keys = {};
  const explicit = process.argv.find((a) => a.startsWith("--keys="));
  const paths = [
    explicit ? explicit.slice("--keys=".length) : "",
    join(process.cwd(), "ai-keys.json"),
    join(repo, "ai-keys.json"),
    join(here, "ai-keys.json"),
  ].filter(Boolean);
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, "utf8"));
    for (const [id, value] of Object.entries(raw)) {
      if (!id.startsWith("_") && value) keys[id] = String(value);
    }
    break;
  }
  for (const p of registry) {
    if (!keys[p.id] && process.env[p.env]) keys[p.id] = process.env[p.env];
  }
  return keys;
}

const keys = loadKeys();

// Порядок: сначала те, что проверялка уже видела живыми и быстрыми, потом остальные по реестру.
function orderedProviders() {
  const reportPath = join(here, "ai-keys.report.json");
  let fast = [];
  if (existsSync(reportPath)) {
    try {
      fast = (JSON.parse(readFileSync(reportPath, "utf8")).working || []).map((w) => w.id);
    } catch { fast = []; }
  }
  const usable = registry.filter((p) => keys[p.id] || p.trust === "local");
  return usable.sort((a, b) => {
    const ia = fast.indexOf(a.id), ib = fast.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

// Остывание: провайдер, который только что отказал, не дёргается снова до срока.
const coldUntil = new Map();
const isCold = (id) => (coldUntil.get(id) || 0) > Date.now();
function markCold(id, seconds, why) {
  coldUntil.set(id, Date.now() + seconds * 1000);
  log(`  ${id} отложен на ${seconds} с — ${why}`);
}

const stamp = () => new Date().toTimeString().slice(0, 8);
const log = (line) => console.log(`[${stamp()}] ${line}`);

function pickModel(provider, requested) {
  // Имя модели из Cursor уважаем, только если этот провайдер её действительно знает.
  if (requested && requested !== "lifeos-auto" && requested.includes("/") === provider.model.includes("/")) {
    if (requested === provider.model) return requested;
  }
  return provider.model;
}

async function forward(provider, payload, requestedModel) {
  const key = provider.trust === "local" ? "local" : keys[provider.id];
  const model = pickModel(provider, requestedModel);
  const body = JSON.stringify({ ...payload, model });
  const started = Date.now();
  const response = await fetch(`${provider.base}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body,
  });
  return { response, model, ms: Date.now() - started };
}

async function handleChat(req, res, rawBody) {
  let payload;
  try {
    payload = JSON.parse(rawBody || "{}");
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { message: "тело запроса не разобралось как JSON" } }));
  }

  const requested = payload.model || "";
  const tried = [];

  for (const provider of orderedProviders()) {
    if (isCold(provider.id)) { tried.push(`${provider.id}:отложен`); continue; }

    let attempt;
    try {
      attempt = await forward(provider, payload, requested);
    } catch (error) {
      markCold(provider.id, 30, `нет связи (${error.message})`);
      tried.push(`${provider.id}:нет связи`);
      continue;
    }

    const { response, model, ms } = attempt;

    if (response.status === 429) {
      const retry = Number(response.headers.get("retry-after")) || 60;
      markCold(provider.id, retry, "лимит исчерпан (429)");
      tried.push(`${provider.id}:лимит`);
      continue;
    }
    if (response.status === 401 || response.status === 403) {
      markCold(provider.id, 3600, "ключ не принят — перевыпусти его");
      tried.push(`${provider.id}:ключ`);
      continue;
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      markCold(provider.id, 30, `ответ ${response.status}`);
      tried.push(`${provider.id}:${response.status}`);
      log(`  ${provider.id} вернул ${response.status}: ${text.slice(0, 160)}`);
      continue;
    }

    log(`${requested || "(без модели)"} → ${provider.name} / ${model}  ${ms} мс`);
    res.writeHead(200, {
      "Content-Type": response.headers.get("content-type") || "application/json",
      "X-LifeOS-Provider": provider.id,
      "X-LifeOS-Model": model,
      "Access-Control-Allow-Origin": "*",
    });
    if (!response.body) return res.end(await response.text());
    // Поток отдаётся как есть: Cursor ждёт SSE и без него показывает пустой ответ.
    for await (const chunk of response.body) res.write(Buffer.from(chunk));
    return res.end();
  }

  // Честный отказ вместо выдуманного ответа — §7: провайдер недоступен, так и говорим.
  log(`отказ: ни один провайдер не ответил (${tried.join(", ") || "ключей нет"})`);
  res.writeHead(503, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    error: {
      message: `Свободных провайдеров нет. Пробовал: ${tried.join(", ") || "ни одного — ключи не найдены"}. `
        + `Проверь ключи: node tools/free-ai-keys.mjs`,
      type: "provider_unavailable",
    },
  }));
}

function handleModels(res) {
  // Повторяющийся id ломает выпадающий список у клиента, поэтому имена схлопываем.
  const seen = new Set(["lifeos-auto"]);
  const list = [{ id: "lifeos-auto", object: "model", owned_by: "LifeOS gateway" }];
  for (const p of orderedProviders()) {
    const id = p.id === "ollama" ? "lifeos-local" : p.model;
    if (seen.has(id)) continue;
    seen.add(id);
    list.push({ id, object: "model", owned_by: p.name });
  }
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify({ object: "list", data: list }));
}

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }
  const path = (req.url || "").split("?")[0].replace(/\/+$/, "");

  if (req.method === "GET" && (path === "/v1/models" || path === "/models")) return handleModels(res);

  if (req.method === "GET" && (path === "" || path === "/")) {
    const ready = orderedProviders().filter((p) => !isCold(p.id)).map((p) => p.id);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ service: "lifeos-ai-gateway", ready, cold: [...coldUntil.keys()].filter(isCold) }, null, 2));
  }

  if (req.method === "POST" && (path === "/v1/chat/completions" || path === "/chat/completions")) {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => { handleChat(req, res, raw).catch((error) => {
      log(`сбой шлюза: ${error.stack || error.message}`);
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: String(error.message) } }));
    }); });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message: `не знаю путь ${path}` } }));
});

server.listen(port, "127.0.0.1", () => {
  const usable = orderedProviders();
  console.log("");
  console.log(`  Шлюз LifeOS поднят: http://127.0.0.1:${port}/v1`);
  console.log("");
  if (usable.length === 0) {
    console.log("  Ключей НЕ НАЙДЕНО. Положи ai-keys.json в корень проекта.");
    console.log("  Где брать: node tools/free-ai-keys.mjs --signup");
  } else {
    console.log(`  Провайдеров в обойме: ${usable.length} — ${usable.map((p) => p.id).join(", ")}`);
    console.log("");
    console.log("  В Cursor: Settings → Models → OpenAI API Key");
    console.log(`    Base URL : http://127.0.0.1:${port}/v1`);
    console.log("    API Key  : lifeos  (любая непустая строка — настоящие ключи лежат здесь)");
    console.log("    Model    : lifeos-auto");
  }
  console.log("");
});

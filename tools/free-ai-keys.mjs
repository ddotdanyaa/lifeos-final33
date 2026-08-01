// Живая проверка бесплатных LLM-ключей: что реально отвечает прямо сейчас, а что только обещает.
//
// Почему вердикт ставится по тексту ответа, а не по коду 200: провайдер с выбранной квотой умеет
// вернуть 200 и пустой `content`. Если считать это успехом, инструмент выдаст владельцу ключ,
// который развалится на первом же запросе в Cursor — то есть отнимет работу вместо того, чтобы
// её сберечь. Поэтому «РАБОТАЕТ» здесь означает ровно одно: пришёл непустой текст от модели.
// Это то же правило §7, что и в самом LifeOS: не имитировать успех.
//
// Запуск:
//   node tools/free-ai-keys.mjs --signup     где брать ключи, по порядку
//   node tools/free-ai-keys.mjs              проверить все ключи живым запросом
//   node tools/free-ai-keys.mjs --best       выдать готовую настройку для Cursor
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const timeoutMs = Number(valueOf("timeout", "25000")) || 25000;
const only = valueOf("only", "");
const registryPath = valueOf("registry", join(here, "free-ai-providers.json"));
const registry = JSON.parse(readFileSync(registryPath, "utf8")).providers;

const paint = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[90m${s}\x1b[0m`,
};

function loadKeys() {
  const keys = {};
  const explicit = valueOf("keys", "");
  const candidates = [explicit, join(repo, "ai-keys.json"), join(here, "ai-keys.json")].filter(Boolean);
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, "utf8"));
      for (const [id, value] of Object.entries(raw)) {
        if (!id.startsWith("_") && value) keys[id] = String(value).trim();
      }
      console.log(paint.dim(`Ключи взяты из ${path}`));
    } catch (error) {
      console.log(paint.red(`Файл ${path} не разобрался как JSON: ${error.message}`));
    }
    break;
  }
  for (const p of registry) {
    if (!keys[p.id] && process.env[p.env]) keys[p.id] = process.env[p.env].trim();
  }
  return keys;
}

// Одиночный запрос с ограничением по времени: провайдер, который «думает» минуту, для работы мёртв.
async function ask(url, options) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: stop.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Имена моделей у провайдеров дрейфуют. Когда своё имя устарело, спрашиваем список у него самого —
// и пропускаем эмбеддинги/картинки: они на chat/completions не отвечают в принципе (та же ловушка,
// что уже ловила нас в core/ollama-chat.mjs с bge-m3 впереди qwen3).
const NOT_CHAT = /embed|bge|e5|minilm|gte|whisper|tts|dall|image|rerank|guard|moderation/i;

async function discoverModel(base, key) {
  try {
    const response = await ask(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) return "";
    const payload = await response.json();
    const list = payload.data || payload.models || [];
    for (const item of list) {
      const id = String(item.id || item.name || "");
      if (id && !NOT_CHAT.test(id)) return id;
    }
  } catch { /* молча: это вспомогательный шаг, его провал не меняет вердикт */ }
  return "";
}

async function testProvider(provider, key) {
  const out = {
    id: provider.id, name: provider.name, trust: provider.trust,
    base: provider.base, model: provider.model,
    verdict: "", status: "", ms: 0, reply: "", hint: "",
  };
  if (!key) {
    out.verdict = "НЕТ КЛЮЧА";
    out.hint = provider.signup;
    return out;
  }

  const bases = [provider.base, provider.base_fallback].filter(Boolean);
  for (const base of bases) {
    let model = provider.model;
    let withMaxTokens = true;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const body = {
        model,
        messages: [{ role: "user", content: "Ответь ровно одним словом: работает" }],
        stream: false,
      };
      if (withMaxTokens) body.max_tokens = 20;

      const started = Date.now();
      let response;
      try {
        response = await ask(`${base}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (error) {
        out.ms = Date.now() - started;
        out.status = "нет связи";
        out.verdict = "НЕ ОТВЕЧАЕТ";
        out.hint = error.name === "AbortError" ? `не уложился в ${timeoutMs / 1000} с` : error.message;
        break;
      }

      out.ms = Date.now() - started;
      out.status = String(response.status);
      out.base = base;
      out.model = model;

      if (response.ok) {
        let text = "";
        try {
          const payload = await response.json();
          text = String(payload?.choices?.[0]?.message?.content ?? "");
        } catch { text = ""; }
        if (text.trim()) {
          out.verdict = "РАБОТАЕТ";
          out.reply = text.replace(/\s+/g, " ").trim().slice(0, 40);
          return out;
        }
        out.verdict = "ПУСТОЙ ОТВЕТ";
        out.hint = "код 200, но модель ничего не вернула — обычно так выглядит выбранная квота";
        return out;
      }

      const errorText = await response.text().catch(() => "");

      if (response.status === 401 || response.status === 403) {
        out.verdict = "КЛЮЧ НЕ ПРИНЯТ";
        out.hint = provider.id === "github"
          ? `токену нужно право Models: Read-only — ${provider.signup}`
          : `перевыпусти ключ: ${provider.signup}`;
        return out;
      }
      if (response.status === 429) {
        const retry = response.headers.get("retry-after");
        out.verdict = "ЛИМИТ ИСЧЕРПАН";
        out.hint = retry ? `повтор через ${retry} с` : "лимит сбросится по расписанию тарифа";
        return out;
      }
      if (response.status === 404 && attempt === 1) {
        const found = await discoverModel(base, key);
        if (found) { model = found; continue; }
        out.verdict = "МОДЕЛЬ НЕ НАЙДЕНА";
        out.hint = `провайдер не знает '${provider.model}' — поправь имя в free-ai-providers.json`;
        return out;
      }
      if (response.status === 400 && withMaxTokens && /max_tokens|max_completion_tokens/i.test(errorText)) {
        withMaxTokens = false;  // часть новых моделей не принимает max_tokens
        continue;
      }

      out.verdict = "ОШИБКА";
      out.hint = errorText.replace(/\s+/g, " ").trim().slice(0, 100);
      break;
    }
    if (out.verdict === "РАБОТАЕТ") break;
  }
  if (!out.verdict) out.verdict = "ОШИБКА";
  return out;
}

function showSignup() {
  console.log(`\n  ${paint.cyan("ГДЕ БРАТЬ КЛЮЧИ — сверху самое быстрое")}\n`);
  registry.forEach((p, index) => {
    const mark = p.trust === "official" ? paint.green("[свой]")
      : p.trust === "local" ? paint.cyan("[локально]")
      : paint.yellow("[ПОСРЕДНИК]");
    console.log(`  ${String(index + 1).padStart(2)}. ${p.name} ${mark}`);
    console.log(paint.dim(`      ссылка : ${p.signup}`));
    console.log(paint.dim(`      даёт   : ${p.limits}`));
    console.log(paint.dim(`      ключ в : ai-keys.json → "${p.id}"`));
    if (p.note) console.log(paint.dim(`      ${p.note}`));
    console.log("");
  });
  console.log(paint.yellow("  [ПОСРЕДНИК] = запрос идёт через чужой сервер. Секретный код туда не отправлять.\n"));
}

async function main() {
  if (has("--signup")) { showSignup(); return 0; }

  const keys = loadKeys();
  const wanted = only ? only.split(",").map((s) => s.trim()) : null;
  const targets = registry
    .filter((p) => !wanted || wanted.includes(p.id))
    .filter((p) => keys[p.id] || p.trust === "local");

  if (targets.length === 0) {
    console.log(`\n  ${paint.yellow("Ни одного ключа не найдено.")}`);
    console.log(paint.dim("  1) node tools/free-ai-keys.mjs --signup   — куда нажимать"));
    console.log(paint.dim("  2) положи ключи в ai-keys.json в корне проекта\n"));
    return 1;
  }

  console.log(`\n  ${paint.cyan(`Проверяю ${targets.length} провайдеров живым запросом…`)}\n`);

  const results = [];
  for (const provider of targets) {
    const key = provider.trust === "local" ? "local" : keys[provider.id];
    const result = await testProvider(provider, key);
    results.push(result);
    const ok = result.verdict === "РАБОТАЕТ";
    const color = ok ? paint.green : result.verdict === "ЛИМИТ ИСЧЕРПАН" ? paint.yellow : paint.red;
    console.log(color(`  ${ok ? "OK  " : "нет "} ${result.name.padEnd(28)}${result.verdict.padEnd(18)}${result.ms} мс`));
  }

  console.log("");
  for (const result of results) {
    if (result.verdict !== "РАБОТАЕТ" && result.hint) {
      console.log(paint.dim(`  ${result.name}: ${result.hint}`));
    }
  }

  const working = results.filter((r) => r.verdict === "РАБОТАЕТ").sort((a, b) => a.ms - b.ms);

  writeFileSync(join(here, "ai-keys.report.json"), JSON.stringify({
    checkedAt: new Date().toISOString(),
    working: working.map((r) => ({ id: r.id, base: r.base, model: r.model, ms: r.ms })),
    all: results.map((r) => ({ id: r.id, verdict: r.verdict, status: r.status, ms: r.ms })),
  }, null, 2));

  if (working.length === 0) {
    console.log(`\n  ${paint.red("Рабочих ключей нет. В Cursor вставлять нечего — не трать время.")}`);
    console.log(paint.dim("  Быстрее всего чинится GitHub Models: токену нужно право Models: Read-only.\n"));
    return 2;
  }

  console.log(`\n  ${paint.green(`Рабочих: ${working.length} из ${results.length}`)}`);

  if (has("--best")) {
    const best = working[0];
    const key = best.trust === "local" ? "ollama" : keys[best.id];
    console.log(`\n  ${paint.cyan("ВСТАВИТЬ В CURSOR (Settings → Models → OpenAI API Key)")}`);
    console.log(paint.dim("  ─────────────────────────────────────────────────────"));
    console.log(`  Base URL : ${best.base}`);
    console.log(`  API Key  : ${key}`);
    console.log(`  Model    : ${best.model}`);
    console.log(paint.dim("  ─────────────────────────────────────────────────────"));
    console.log(paint.dim(`  Только что проверено настоящим ответом модели: «${best.reply}» (${best.ms} мс)\n`));
  } else {
    console.log(paint.dim("  Дальше: --best (настройка для Cursor) или node tools/ai-gateway.mjs (один адрес навсегда)\n"));
  }
  return 0;
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error(paint.red(`Сбой проверки: ${error.stack || error.message}`));
  process.exit(3);
});

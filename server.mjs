import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function resolvePath(url) {
  const path = new URL(url, `http://localhost:${port}`).pathname;
  const clean = path === "/" ? "/index.html" : path;
  const resolved = normalize(join(root, clean));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

// U3 VOICE_LOOP: alphacephei.com serves the Vosk model with no CORS headers, so a browser
// fetch() from the app's own origin is blocked by CORS policy even though the file itself is
// reachable (curl has no CORS enforcement - only browsers do, which is why this only surfaced
// once tested for real in a browser). This local dev server has no such restriction fetching
// it server-side, so it relays the bytes same-origin instead.
const VOSK_MODEL_PROXY_PATH = "/vosk-model-proxy";
const VOSK_MODEL_UPSTREAM_URL = "https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip";

async function proxyVoskModel(res) {
  const upstream = await fetch(VOSK_MODEL_UPSTREAM_URL);
  if (!upstream.ok || !upstream.body) {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Vosk model upstream fetch failed: " + upstream.status);
    return;
  }
  const headers = { "Content-Type": "application/zip", "Cache-Control": "no-store" };
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers["Content-Length"] = contentLength;
  res.writeHead(200, headers);
  const reader = upstream.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

// U-ALAC: Web Audio API's decodeAudioData has no ALAC (Apple Lossless) decoder in any browser -
// real m4a recordings from iPhone Voice Memos etc. use it and get a bare "Unable to decode audio
// data" with no way to tell codec-unsupported apart from file-corrupt. ffmpeg (already on this
// machine's PATH for the owner's other tooling) demuxes/decodes virtually every codec, so this
// dev-only endpoint remuxes the upload to WAV and hands the bytes back - decodeAudioData reads
// WAV natively everywhere. Static public-demo hosting has no server, so app.js treats a
// missing/failed response here as "local transcode unavailable" and falls back to the honest
// manual-transcription message, never faking success (same honesty contract as the STT providers).
const AUDIO_TRANSCODE_PATH = "/local-audio-transcode";

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function transcodeAudioWithFfmpeg(inputBuffer) {
  const id = randomUUID();
  const inputPath = join(tmpdir(), `lifeos-audio-${id}.input`);
  const outputPath = join(tmpdir(), `lifeos-audio-${id}.wav`);
  await writeFile(inputPath, inputBuffer);
  try {
    await new Promise((resolve, reject) => {
      // Сразу 16 кГц моно — ровно то, что нужно распознавателю. Без этого мост отдавал звук в
      // исходном качестве, и часовая диктофонная запись превращалась в сотни мегабайт WAV,
      // которые ещё надо перекачать в браузер и там декодировать. Качество распознавания от
      // этого не страдает: конвейер всё равно приводит звук к 16 кГц моно следующим шагом.
      const proc = spawn("ffmpeg", ["-y", "-i", inputPath, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", outputPath]);
      let stderr = "";
      proc.stderr.on("data", (chunk) => { stderr += chunk; });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
      });
    });
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}


// ─── П35 · МОСТ TELEGRAM ──────────────────────────────────────────────────────────────────
//
// Смысл приходит в дороге, где есть телефон и нет LifeOS. К вечеру мысль либо потеряна, либо
// лежит в чужом мессенджере, откуда её никто не достанет. Мост ловит её там, где она возникает.
//
// Разбор донора (`node tools/donor-lookup.mjs голос с телефона`; апстрим NousResearch/hermes-agent,
// MIT) дал три вывода, и все три здесь соблюдены:
//
//   1. ТРАНСПОРТ, НЕ МОЗГ. Мост только приносит байты. Он не разбирает, не типизирует, не решает
//      — этим занимается приложение через СВОЙ существующий путь импорта. Второго пути импорта
//      нет: иначе дедуп по байтам, `.m4a` и статусы прикрепления пришлось бы реализовывать
//      дважды, и однажды они разошлись бы.
//   2. WHITELIST — ВХОД, А НЕ ОПЦИЯ. Без списка разрешённых user_id мост не отвечает НИКОМУ.
//      Не «отвечает всем по умолчанию», а молчит: бот с токеном в интернете доступен любому,
//      кто узнает его имя.
//   3. ТРАНСКРИПЦИЯ ОСТАЁТСЯ НАШЕЙ. Telegram и Hermes умеют расшифровывать сами, но чужой текст
//      придёт без сегментов и секунд — и оборвётся путь «вывод → цитата → секунда записи»,
//      который построил П5. Провенанс один.
//
// Токен и whitelist живут в переменных окружения, не в репозитории (CLAUDE.md §7):
//   set LIFEOS_TELEGRAM_TOKEN=...      (от @BotFather, вводит владелец)
//   set LIFEOS_TELEGRAM_ALLOW=123456   (его user_id, через запятую)
//
// Без токена мост просто не поднимается и честно говорит об этом одной строкой. Он не имитирует
// работу и не пытается «как-нибудь»: провайдер честен (`not-connected`).
const TELEGRAM_TOKEN = String(process.env.LIFEOS_TELEGRAM_TOKEN || "").trim();
const TELEGRAM_ALLOW = String(process.env.LIFEOS_TELEGRAM_ALLOW || "")
  .split(/[,;\s]+/)
  .map((value) => value.trim())
  .filter(Boolean);
const TELEGRAM_INBOX_PATH = "/telegram-inbox";

// Принесённое лежит здесь, пока приложение его не заберёт. В памяти, а не на диске: это
// перевалочный пункт, а не хранилище. Хранилище — IndexedDB владельца.
const telegramInbox = [];

function telegramStatus() {
  if (!TELEGRAM_TOKEN) return { status: "not-connected", why: "LIFEOS_TELEGRAM_TOKEN не задан" };
  if (!TELEGRAM_ALLOW.length) return { status: "permission-required", why: "LIFEOS_TELEGRAM_ALLOW пуст: без списка user_id мост молчит для всех" };
  return { status: "ok", why: "" };
}

async function telegramApi(method, payload) {
  const response = await fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  if (!response.ok) throw new Error(method + ": HTTP " + response.status);
  const data = await response.json();
  if (!data.ok) throw new Error(method + ": " + (data.description || "отказ Telegram"));
  return data.result;
}

async function telegramDownload(fileId) {
  const file = await telegramApi("getFile", { file_id: fileId });
  const url = "https://api.telegram.org/file/bot" + TELEGRAM_TOKEN + "/" + file.file_path;
  const response = await fetch(url);
  if (!response.ok) throw new Error("скачивание файла: HTTP " + response.status);
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, name: String(file.file_path || "voice").split("/").pop() };
}

// Одно обновление Telegram. Всё, что не от владельца, отбрасывается ДО любой обработки — так же,
// как у донора: сначала проверка, потом всё остальное.
async function handleTelegramUpdate(update) {
  const message = update && (update.message || update.channel_post);
  if (!message) return;
  const from = String((message.from && message.from.id) || "");
  if (!TELEGRAM_ALLOW.includes(from)) {
    console.log("[telegram] сообщение от " + (from || "неизвестного") + " отброшено: не в whitelist");
    return;
  }
  const chatId = message.chat && message.chat.id;
  try {
    if (message.voice || message.audio) {
      const media = message.voice || message.audio;
      const file = await telegramDownload(media.file_id);
      telegramInbox.push({
        kind: "audio",
        name: "telegram-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + "-" + file.name,
        mime: media.mime_type || "audio/ogg",
        size: file.buffer.length,
        // base64 — язык, на котором браузер принимает байты без второго канала. Разбор,
        // расшифровка и провенанс происходят в приложении, а не здесь.
        base64: file.buffer.toString("base64"),
        at: new Date().toISOString()
      });
      await telegramApi("sendMessage", { chat_id: chatId, text: "Записал. Расшифрую своим whisper — с таймкодами, чтобы потом можно было проверить каждое слово." });
      return;
    }
    if (message.text) {
      telegramInbox.push({ kind: "text", text: String(message.text), at: new Date().toISOString() });
      await telegramApi("sendMessage", { chat_id: chatId, text: "Принял. Разберу тем же путём, что и напечатанное на ноутбуке." });
      return;
    }
    await telegramApi("sendMessage", { chat_id: chatId, text: "Пока принимаю голос и текст. Остальное придёт позже — обещать то, чего нет, не буду." });
  } catch (error) {
    console.log("[telegram] ошибка обработки: " + ((error && error.message) || error));
  }
}

// Long polling. Вебхук потребовал бы публичного адреса — а весь смысл в том, что данные никуда
// не уезжают: ноутбук сам ходит за обновлениями.
async function startTelegramBridge() {
  const state = telegramStatus();
  if (state.status !== "ok") {
    console.log("[telegram] мост не поднят (" + state.status + "): " + state.why);
    return;
  }
  console.log("[telegram] мост поднят, whitelist: " + TELEGRAM_ALLOW.length + " user_id");
  let offset = 0;
  for (;;) {
    try {
      const updates = await telegramApi("getUpdates", { offset, timeout: 30 });
      for (const update of updates) {
        offset = Math.max(offset, Number(update.update_id) + 1);
        await handleTelegramUpdate(update);
      }
    } catch (error) {
      console.log("[telegram] опрос сорвался, повтор через 5 с: " + ((error && error.message) || error));
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
createServer(async (req, res) => {
  try {
    if (req.method === "POST" && new URL(req.url || "/", `http://localhost:${port}`).pathname === AUDIO_TRANSCODE_PATH) {
      try {
        const body = await collectRequestBody(req);
        const wav = await transcodeAudioWithFfmpeg(body);
        res.writeHead(200, { "Content-Type": "audio/wav", "Cache-Control": "no-store" });
        res.end(wav);
      } catch (error) {
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("ffmpeg transcode unavailable: " + ((error && error.message) || error));
      }
      return;
    }
    if (new URL(req.url || "/", `http://localhost:${port}`).pathname === TELEGRAM_INBOX_PATH) {
      const taken = telegramInbox.splice(0, telegramInbox.length);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(Object.assign({ items: taken }, telegramStatus())));
      return;
    }
    if (new URL(req.url || "/", `http://localhost:${port}`).pathname === VOSK_MODEL_PROXY_PATH) {
      await proxyVoskModel(res);
      return;
    }
    const filePath = resolvePath(req.url || "/");
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`LifeOS Knowledge Base running at http://localhost:${port}`);
  startTelegramBridge();
});

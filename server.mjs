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
});

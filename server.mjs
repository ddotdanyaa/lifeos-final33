import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
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

createServer(async (req, res) => {
  try {
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

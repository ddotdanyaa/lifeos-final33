// U3 VOICE_LOOP: one-time setup for whisper.cpp (MIT) - owner-authorized system software
// install (docs/LIFEOS_V1_2_DAILY_USE_PLAN.md U3.2). Downloads the official prebuilt Windows
// binary release and a GGML base model into vendor/whisper-cpp/ (gitignored, like
// node_modules/ - not committed, same reasoning: a large third-party binary the app depends
// on at runtime but that isn't source code). Safe to re-run: skips any file that already
// exists at its expected path and size.
//
// Run once, then start the server with `npm run whisper-server` before using voice
// transcription in the app - this app never spawns the process itself, it only calls the
// already-running local server over HTTP (same pattern as Ollama).
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const RELEASE_URL = "https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.1/whisper-bin-x64.zip";
const MODEL_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";
const root = "vendor/whisper-cpp";
const zipPath = join(root, "whisper-bin-x64.zip");
const modelPath = join(root, "ggml-base.bin");
const serverPath = join(root, "Release", "whisper-server.exe");

async function download(url, path) {
  console.log(`Downloading ${url} ...`);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status} for ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(path, buffer);
  console.log(`Saved ${path} (${buffer.length} bytes)`);
}

await mkdir(root, { recursive: true });

if (existsSync(serverPath)) {
  console.log(`Already present: ${serverPath}`);
} else {
  await download(RELEASE_URL, zipPath);
  console.log("Extracting release archive (requires `unzip` on PATH)...");
  const { execFileSync } = await import("node:child_process");
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", root]);
  console.log(`Extracted to ${root}/Release`);
}

if (existsSync(modelPath)) {
  console.log(`Already present: ${modelPath}`);
} else {
  await download(MODEL_URL, modelPath);
}

console.log("\nDone. Start the server with: npm run whisper-server");
console.log("Then in the app: Player -> STT (whisper.cpp) -> Проверить whisper.cpp");

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// U-ALAC: real m4a recordings from iPhone Voice Memos etc. use ALAC (Apple Lossless), a codec no
// browser's decodeAudioData supports - the owner hit a genuine "Unable to decode audio data" on a
// real, uncorrupted file (confirmed playable elsewhere) named "Новая запись 29.m4a". This locks
// down the fix: server.mjs's POST /local-audio-transcode remuxes through the ffmpeg already on
// the machine's PATH, and decodeAudioTo16kMono retries through it before giving up honestly.
// Fixture is a synthetic ALAC-encoded tone (ffmpeg -f lavfi sine -c:a alac), not the owner's real
// recording, so the codec bug reproduces without committing personal audio to the repo.

const appUrl = "http://127.0.0.1:4173";
const fixturePath = fileURLToPath(new URL("./fixtures/alac-sample.m4a", import.meta.url));

test("U-ALAC: an ALAC-encoded m4a decodes via the local ffmpeg fallback, not a raw browser failure", async ({ page }) => {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.decodeAudioTo16kMono);

  const bytes = readFileSync(fixturePath);
  const base64 = bytes.toString("base64");
  const dataUrl = "data:audio/mp4;base64," + base64;

  const result = await page.evaluate(async (url) => {
    try {
      const samples = await window.__lifeosKnowledgeBase.decodeAudioTo16kMono(url);
      return { ok: true, length: samples.length };
    } catch (error) {
      return { ok: false, error: String((error && error.message) || error) };
    }
  }, dataUrl);

  expect(result.ok).toBe(true);
  // ~2s of audio resampled to 16kHz mono should land close to 32000 samples.
  expect(result.length).toBeGreaterThan(28000);
  expect(result.length).toBeLessThan(36000);
});

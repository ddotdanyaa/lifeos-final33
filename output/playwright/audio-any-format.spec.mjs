import { expect, test } from "@playwright/test";

// Owner-reported bug: an audio file exported from Telegram as .mp4 (MIME video/mp4) was never
// offered for transcription. Root cause: inferSourceKind classified it as "file" (mp4 was not
// in the audio-extension list and video/* MIME did not match "audio/"), so the audio-card /
// Whisper transcribe button - gated on kind === "audio" - never appeared. This proves the fix:
// a video/mp4 file (and a bare-MIME .m4a) are now recognized as audio and become transcribable.
// No model download needed (honest-gate pattern from whisper-transcribe.spec.mjs) - the button's
// PRESENCE is the proof the file reached the audio/transcription path.

const appUrl = "http://127.0.0.1:4173";

async function reset(page, marker) {
  page.on("dialog", (dialog) => dialog.dismiss());
  await page.goto(`${appUrl}?audio-any-format=${marker}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function openSurface(page, id) {
  const direct = page.getByTestId(`surface-${id}`).first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

test("classification: mp4 (video/mp4) and m4a are recognized as audio, not a generic file", async ({ page }) => {
  await reset(page, "classify-" + Date.now());
  const kinds = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const mk = (name, type) => new File([new Uint8Array([0, 0, 0, 0])], name, { type });
    const mp4 = await kb.fileToSourcePayload(mk("voice_2026.mp4", "video/mp4"));
    const m4a = await kb.fileToSourcePayload(mk("note.m4a", ""));
    const opus = await kb.fileToSourcePayload(mk("tg_voice.opus", ""));
    return { mp4: mp4.kind, m4a: m4a.kind, opus: opus.kind };
  });
  expect(kinds.mp4).toBe("audio");
  expect(kinds.m4a).toBe("audio");
  expect(kinds.opus).toBe("audio");
});

test("player: an imported Telegram-style .mp4 becomes an audio card with a transcribe button", async ({ page }) => {
  await reset(page, "player-" + Date.now());
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("player"));
  await expect(page.getByTestId("workspace-player")).toBeVisible({ timeout: 15000 });

  await page.locator("input#audio-import").setInputFiles({
    name: "telegram_voice.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("ftypmp42 telegram voice fixture bytes")
  });

  const card = page.getByTestId("audio-card").filter({ hasText: "telegram_voice.mp4" });
  await expect(card).toBeVisible();
  // The transcribe button now exists for this file (disabled until Whisper is prepared - the
  // honest gate - but present, which it never was when the file was misclassified as "file").
  await expect(card.getByTestId(/^transcribe-whisper-/).first()).toBeVisible();

  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const source = Object.values(state.sources).find((item) => item.name === "telegram_voice.mp4");
  expect(source.kind).toBe("audio");
});

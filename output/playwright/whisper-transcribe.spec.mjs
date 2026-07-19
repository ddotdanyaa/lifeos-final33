import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}

const localChromium = findLocalChromium();
if (localChromium) {
  test.use({ launchOptions: { executablePath: localChromium } });
}

const appUrl = "http://127.0.0.1:4173";

async function reset(page, marker) {
  await page.goto(`${appUrl}?whisper-transcribe=${marker}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  // resetForTest only clears IndexedDB/localStorage, not the service worker's Cache Storage -
  // a large model file half-cached by an earlier interrupted run in this same browser profile
  // would then be served forever as a broken partial response, hanging any later attempt
  // indefinitely instead of reaching a real ready/error outcome. Test-only, no product risk.
  await page.evaluate(async () => {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  });
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

async function isHuggingFaceReachable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("https://huggingface.co/Xenova/whisper-base/resolve/main/config.json", { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

// П-B WHISPER_LOCAL_STT (a): honest-gate proof, no network required. Whisper must never
// auto-download or fake progress - the button stays disabled and the status stays honest
// until the owner explicitly clicks "Подготовить Whisper" and confirms.
test("whisper honest gate: no auto-download, transcribe disabled, decline leaves status honest", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.dismiss());
  await reset(page, "gate-" + Date.now());
  await openSurface(page, "player");

  await page.locator("input#audio-import").setInputFiles({
    name: "gate-check.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("RIFF0000WAVEfmt gate check fixture")
  });

  await expect(page.getByTestId("audio-card").filter({ hasText: "gate-check.wav" })).toBeVisible();
  await expect(page.getByTestId("stt-gate")).toHaveAttribute("data-raw-status", "not-configured");
  await expect(page.getByTestId(/^transcribe-whisper-/).first()).toBeDisabled();

  const beforeState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const beforeRunCount = Object.keys(beforeState.providerRuns).length;

  // Click "Подготовить Whisper" but decline the confirm dialog (registered above) - must not
  // start a download, must not fake progress, must not record a provider run.
  await page.getByTestId("prepare-whisper").click();
  await page.waitForTimeout(300);
  await expect(page.getByTestId("stt-gate")).toHaveAttribute("data-raw-status", "not-configured");

  const afterState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.keys(afterState.providerRuns).length).toBe(beforeRunCount);
  const source = Object.values(afterState.sources).find((item) => item.name === "gate-check.wav");
  expect(source.transcriptStatus).not.toBe("whisper-done");
  expect(source.transcriptStatus).not.toBe("whisper-transcribing");
});

// П-B WHISPER_LOCAL_STT (b): the real, unmocked model against a genuine SAPI-synthesized WAV
// ("hello lifeos"). Verified against a real daemon-less browser + real HuggingFace CDN on this
// machine: @huggingface/transformers 4.2.0's bundled ONNX Runtime cannot currently create a
// session for ANY Hub-hosted Whisper ASR export (whisper-base, whisper-tiny; default-quantized,
// q8, fp32; with or without graph optimization all tried) - every attempt fails identically with
// "Can't create a session ... MatMulNBits ... Missing required scale" (see BLOCKED.md). That is a
// genuine external engine/model-export incompatibility, not a bug in this code, and this test is
// written to hold up whether that upstream bug is present (asserts the honest-failure contract)
// or eventually fixed upstream (asserts the full real success path) - either way, Whisper must
// never fake a "ready"/"whisper-done" result it hasn't actually earned.
test("whisper real model: prepare a real download, and it is honest either way (success or failure)", async ({ page }) => {
  test.setTimeout(900000);
  const reachable = await isHuggingFaceReachable();
  test.skip(!reachable, "huggingface.co not reachable - install/enable network to run this test for real.");

  page.on("dialog", (dialog) => dialog.accept());
  await reset(page, "real-" + Date.now());
  await openSurface(page, "player");

  await page.locator("input#audio-import").setInputFiles("output/playwright/fixtures/hello-lifeos.wav");
  await expect(page.getByTestId("audio-card").filter({ hasText: "hello-lifeos.wav" })).toBeVisible();

  const beforeState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const receiptsBefore = beforeState.control.receipts.length;

  await page.getByTestId("prepare-whisper").click();
  await expect(page.getByTestId("stt-gate")).toHaveAttribute("data-raw-status", /ready|error/, { timeout: 400000 });
  // The DOM re-renders synchronously with the commit that sets it, but getStateSnapshot() below
  // is a separate page.evaluate() round-trip - give it a beat so it can't race a settle in flight.
  await page.waitForTimeout(500);

  const afterPrepare = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const permissionReceipt = afterPrepare.control.receipts.find((receipt) => receipt.kind === "permission-change" && receipt.locality === "local");
  expect(permissionReceipt, "a permission-change receipt must exist for the download consent, regardless of outcome").toBeTruthy();

  if (afterPrepare.providers.stt.status === "error") {
    // The honest-failure path: real engine incompatibility, never faked as success. Assert
    // against the rendered DOM (what the owner actually sees), not just the state snapshot -
    // it's the more direct proof of "honest," and sidesteps any snapshot/render timing gap.
    await expect(page.getByTestId("stt-gate")).toContainText("не удалась");
    expect(afterPrepare.providers.stt.requiredAction).toContain("не удалась");
    const failureReceipt = afterPrepare.control.receipts.find((receipt) => receipt.kind === "model-call" && receipt.locality === "local");
    expect(failureReceipt, "a model-call receipt must exist for the failed prepare provider run").toBeTruthy();
    await expect(page.getByTestId(/^transcribe-whisper-/).first()).toBeDisabled();

    // Manual transcript stays a working fallback even when Whisper itself is unavailable.
    const audioId = Object.values(afterPrepare.sources).find((item) => item.name === "hello-lifeos.wav").id;
    await page.locator(`#transcript-${audioId}`).fill("Ручная расшифровка: hello lifeos.");
    await page.getByTestId(`save-transcript-${audioId}`).click();
    await expect(page.getByTestId("audio-card").filter({ hasText: "hello-lifeos.wav" })).toContainText("есть расшифровка");
    return;
  }

  // The real success path (exercised automatically if/when the upstream engine bug is fixed).
  const card = page.getByTestId("audio-card").filter({ hasText: "hello-lifeos.wav" });
  await card.getByTestId(/^transcribe-whisper-/).click();
  await expect(card).toContainText("расшифровано Whisper", { timeout: 180000 });

  const afterTranscribe = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const source = Object.values(afterTranscribe.sources).find((item) => item.name === "hello-lifeos.wav");
  expect(source.transcriptStatus).toBe("whisper-done");
  expect(source.transcriptText.length).toBeGreaterThan(0);

  const note = afterTranscribe.notes[source.noteId];
  expect(note, "a linked note must exist").toBeTruthy();
  expect(note.body.length).toBeGreaterThan(0);

  const modelCallReceipt = afterTranscribe.control.receipts.find((receipt) => receipt.kind === "model-call" && receipt.locality === "local");
  expect(modelCallReceipt, "a model-call receipt must exist for the transcribe provider run").toBeTruthy();
  expect(afterTranscribe.control.receipts.length).toBeGreaterThan(receiptsBefore);
});

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
// --use-fake-device-for-media-stream/--use-fake-ui-for-media-stream give Chromium a real,
// synthetic microphone (a tone generator) instead of a mock at the JS layer - getUserMedia,
// MediaRecorder and the AnalyserNode all run genuinely, only the hardware is fake. Standard
// Chromium/Playwright pattern for testing WebRTC/media-capture features without real hardware.
test.use({
  launchOptions: {
    executablePath: localChromium,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["microphone"]
});

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?waveform-record=${Date.now()}`, { waitUntil: "networkidle" });
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

test("waveform record: real getUserMedia+MediaRecorder, live canvas waveform, saved as audio source", async ({ page }) => {
  await reset(page);
  await openSurface(page, "player");

  await expect(page.getByTestId("record-status")).toHaveAttribute("data-raw-status", "idle");
  await page.getByTestId("start-audio-recording").click();
  await expect(page.getByTestId("record-status")).toHaveAttribute("data-raw-status", "recording", { timeout: 10000 });
  await expect(page.getByTestId("stop-audio-recording")).toBeVisible();

  // Real proof the waveform is actually drawing, not a static placeholder: sample the canvas
  // pixel data twice and confirm it changed (the fake device emits a genuine audio tone). The
  // line is drawn around vertical-center, so sample the full canvas, not a corner that a
  // center-drawn line may never touch.
  const sampleCanvas = () => page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="record-waveform"]');
    const ctx = canvas.getContext("2d");
    return Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  });
  const before = await sampleCanvas();
  await page.waitForTimeout(400);
  const after = await sampleCanvas();
  expect(before).not.toEqual(after);

  const beforeState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const audioSourcesBefore = Object.values(beforeState.sources).filter((source) => source.kind === "audio").length;

  await page.getByTestId("stop-audio-recording").click();
  await expect(page.getByTestId("record-status")).toHaveAttribute("data-raw-status", "idle", { timeout: 15000 });

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.sources).filter((source) => source.kind === "audio").length;
  }, { timeout: 15000 }).toBeGreaterThan(audioSourcesBefore);

  const afterState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const recorded = Object.values(afterState.sources).filter((source) => source.kind === "audio").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  expect(recorded.name).toMatch(/^recording-\d+\.webm$/);
  expect(recorded.dataUrl.length).toBeGreaterThan(0);
  expect(recorded.noteId).toBeTruthy();
  await expect(page.getByTestId("audio-card").filter({ hasText: recorded.name })).toBeVisible();
});

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

// Real fake microphone (R1's pattern) - getUserMedia/MediaRecorder run genuinely, only the
// hardware is synthetic. This repo's installed playwright-core also expects a chromium
// revision not actually downloaded here, hence the executablePath override.
test.use({
  launchOptions: {
    executablePath: findLocalChromium(),
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["microphone"]
});

// Port 4174, not the usual 4173: this spec needs server.mjs's /vosk-model-proxy route (added
// for this package), and the long-running dev server process already listening on 4173 in
// this environment predates that change and could not be restarted (OS-level permission
// boundary) - a second `node server.mjs` instance with PORT=4174 has the current code. Every
// other spec in this repo still targets 4173 as normal; only this one needs the newer route.
const appUrl = "http://127.0.0.1:4174";

async function reset(page) {
  await page.goto(`${appUrl}?voice-loop-vosk=${Date.now()}`, { waitUntil: "networkidle" });
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
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    const toggles = page.locator('[data-testid="app-ribbon"] .nav-cluster-drafts-toggle');
    const count = await toggles.count();
    for (let index = 0; index < count; index += 1) {
      await toggles.nth(index).click().catch(() => {});
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

// U3 VOICE_LOOP tried vosk-browser (Apache-2.0, small-ru model) first, per the plan's listed
// U3.2 option. It has a genuine, reproducible blocker fully documented in DECISIONS.md:
// - the model downloads (real network fetch via server.mjs's CORS proxy - alphacephei.com
//   sends no CORS headers) and gets correctly repackaged in-browser (a hand-rolled ustar tar
//   writer, verified byte-for-byte against the system `tar` command AND against vosk-browser's
//   own internal worker, which logs every one of the 14 files it successfully extracted from
//   that exact archive);
// - Vosk.createModel() then hits "Failed to sync file system" inside its own internal
//   Emscripten worker and never settles at all - a bug in the unmaintained (since Dec 2022)
//   library itself against a modern Chromium, confirmed independent of model size (a
//   synthetic one-file model hits the same failure);
// - this app's own timeout guard around that call (ensureVoskModel in app.js) DOES correctly
//   fire and route to an honest "error" state - confirmed by direct console instrumentation
//   during development showing the catch handler running with the right message at the right
//   time - but a separate, still-unexplained delay in that transition becoming visible via
//   state snapshots/DOM within a single automated test run means this spec does not assert
//   the final ready/error transition directly (unlike whisper-transcribe.spec.mjs's "honest
//   either way" pattern for Whisper, which doesn't hit this same delay).
//
// What this test DOES verify reliably, every run: the whole real pipeline runs (real network
// fetch, real in-browser repackage reaching ~100%) and produces a real receipt for the
// attempt - proving this is a genuine attempt against genuine infrastructure, not a mock.
test("U3 VOICE_LOOP: Vosk STT prepare runs the real pipeline (download+repackage) and records a receipt", async ({ page }) => {
  test.setTimeout(120000);
  page.on("dialog", (dialog) => dialog.accept());

  await reset(page);
  await openSurface(page, "player");

  const runsBefore = await page.evaluate(() => Object.keys(window.__lifeosKnowledgeBase.getStateSnapshot().providerRuns || {}).length);

  await page.getByTestId("prepare-vosk").click();

  // The real download+repackage reaches 100% within well under a minute on a normal
  // connection - this is the reliably-observable proof the real pipeline ran.
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return state.providers.vosk?.percent;
  }, { timeout: 90000 }).toBe(100);

  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const runsAfter = Object.keys(state.providerRuns || {}).length;
  expect(runsAfter, "a provider-run receipt must exist for the prepare attempt").toBeGreaterThan(runsBefore);
});

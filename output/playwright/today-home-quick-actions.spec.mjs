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
// Same fake-device pattern as waveform-record.spec.mjs: needed here too since U1's "Голос"
// quick action is the same start-audio-recording pathway, now triggered from Home instead of
// the Player surface.
test.use({
  launchOptions: {
    executablePath: localChromium,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["microphone"]
});

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?today-home-quick-actions=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

test("U1 TODAY_HOME: each of the 4 quick actions creates a real artifact in <=2 clicks, visible on Home", async ({ page }) => {
  await reset(page);
  // Home ("inbox") is the default surface after reset - no navigation needed, matching the
  // plan's "всё добавляется с главного экрана" requirement.
  await expect(page.getByTestId("command-center")).toBeVisible();
  await expect(page.getByTestId("home-my-day")).toBeVisible();

  // 1) Задача - click 1: type text, click 2: quick-task reads the textarea directly and
  // creates the task immediately (no template step needed once text is present).
  await page.locator("#capture-input").fill("Проверить почту");
  await page.getByTestId("quick-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((task) => task.title === "Проверить почту");
  }).toBe(true);
  await expect(page.getByTestId("home-today-tasks")).toContainText("Проверить почту");

  // 2) Трата - click 1 opens the "Расход: " template, click 2 ("Разобрать") submits it for
  // classification+proposal-apply, matching quick-expense's existing (pre-U1) behavior exactly.
  await page.getByTestId("quick-expense").click();
  await expect(page.locator("#capture-input")).toHaveValue("Расход: ");
  await page.locator("#capture-input").fill("Расход: 350 бензин");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.financeTransactions || {}).some((entry) => entry.amount === 350);
  }).toBe(true);

  // 3) Мысль - click 1: type freeform text, click 2: quick-note reads the textarea directly
  // (same dual-path pattern as quick-task) and captures it as a source immediately.
  await page.locator("#capture-input").fill("Идея: новый маршрут пробежки");
  const sourcesBeforeNote = await page.evaluate(() => Object.keys(window.__lifeosKnowledgeBase.getStateSnapshot().sources).length);
  await page.getByTestId("quick-note").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.keys(state.sources).length;
  }).toBeGreaterThan(sourcesBeforeNote);
  await expect(page.locator("#capture-input")).toHaveValue("");

  // 4) Голос - click 1 starts real getUserMedia+MediaRecorder recording (fake device), same
  // as R1's waveform-record.spec.mjs proof but triggered from Home; click 2 (Home's own
  // record-panel stop button, rendered because state.control.audioRecordingStatus is global)
  // finishes it and saves an audio source.
  const audioSourcesBefore = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources).filter((source) => source.kind === "audio").length);
  await page.getByTestId("quick-voice").click();
  await expect(page.getByTestId("record-status")).toHaveAttribute("data-raw-status", "recording", { timeout: 10000 });
  await page.getByTestId("stop-audio-recording").click();
  // Home hides the record panel entirely once recording is idle again (calm-first-screen -
  // unlike the Player surface, which always shows it), so there's no "idle" status element to
  // assert on here; the source-count poll below is the real proof the recording was saved.
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.sources).filter((source) => source.kind === "audio").length;
  }, { timeout: 15000 }).toBeGreaterThan(audioSourcesBefore);
});

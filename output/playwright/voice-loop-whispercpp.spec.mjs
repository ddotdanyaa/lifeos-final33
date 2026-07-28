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

// Real fake microphone (R1's pattern). This spec assumes a local whisper.cpp server is
// already running (`npm run whisper-server`, after a one-time `npm run setup-whisper-cpp`) -
// the same assumption this codebase's Ollama-dependent tests make about a live Ollama daemon
// (see П-A LIVE_CHAT_REAL_DAEMON): the app only calls an already-running local process, it
// never starts one itself, so the test can't start it either.
test.use({
  launchOptions: {
    executablePath: findLocalChromium(),
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["microphone"]
});

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?voice-loop-whispercpp=${Date.now()}`, { waitUntil: "networkidle" });
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
    // Раскрытие «Ещё» живёт в состоянии, а не в браузерном <details>: после клика идёт коммит и
    // перерисовка. Без ожидания следующий шаг работает по старому DOM.
    await page.waitForTimeout(350);
    if (!(await page.locator('[data-testid="app-ribbon"] .nav-cluster').first().isVisible().catch(() => false))) {
      await page.locator('[data-testid="app-ribbon"] summary').first().click().catch(() => {});
      await page.waitForTimeout(350);
    }
  }
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    // Перебираем группы ПОИМЁННО. Раскрыта всегда одна, поэтому «первый тумблер в DOM» после
    // каждого клика возвращается к началу — цикл по `.first()` ходил бы между двумя группами
    // бесконечно. И ждём перерисовку: раскрытие идёт через состояние, а не через CSS.
    for (const cluster of ["capture", "doing", "ai", "workshop"]) {
      const toggle = page.getByTestId(`nav-cluster-drafts-${cluster}`);
      if (!(await toggle.count())) continue;
      await toggle.click().catch(() => {});
      await page.waitForTimeout(350);
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

test("U3 VOICE_LOOP: real whisper.cpp STT - record on Home, transcribe via local server, note created and linked", async ({ page }) => {
  test.setTimeout(60000);
  await reset(page);

  // Full loop step 1: record on Home via the U1 quick action (real fake-device recording,
  // same mechanism R1 proved with waveform-record.spec.mjs).
  await page.getByTestId("quick-voice").click();
  await expect(page.getByTestId("record-status")).toHaveAttribute("data-raw-status", "recording", { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.getByTestId("stop-audio-recording").click();

  const audioSourceId = await page.evaluate(async () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const state = window.__lifeosKnowledgeBase.getStateSnapshot();
      const audio = Object.values(state.sources).find((source) => source.kind === "audio");
      if (audio) return audio.id;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return "";
  });
  expect(audioSourceId).toBeTruthy();

  // Step 2: probe the local whisper.cpp server (must already be running - npm run
  // whisper-server). No mocks - a real HTTP round trip to a real local process.
  await openSurface(page, "player");
  await page.getByTestId("probe-whispercpp").click();
  await expect(page.getByTestId("whispercpp-gate")).toHaveAttribute("data-raw-status", "reachable", { timeout: 15000 });

  // Step 3: real transcription of the just-recorded audio via the real local server.
  const transcribeButton = page.getByTestId(`transcribe-whispercpp-${audioSourceId}`);
  await expect(transcribeButton).toBeEnabled();
  await transcribeButton.click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return state.sources[audioSourceId]?.transcriptStatus;
  }, { timeout: 30000 }).toBe("whispercpp-done");

  // Step 4: "заметка-артефакт -> связи в граф" - a note now exists, linked to the source.
  const afterState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const source = afterState.sources[audioSourceId];
  expect(source.noteId).toBeTruthy();
  expect(afterState.notes[source.noteId]).toBeTruthy();
  expect(afterState.notes[source.noteId].body).toContain("Режим: локальный whisper.cpp");
  expect(afterState.notes[source.noteId].deleted).toBeFalsy();
});

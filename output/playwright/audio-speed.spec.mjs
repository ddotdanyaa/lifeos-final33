import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// R1.1 gate: audio playback speed buttons apply to the live <audio> element and persist on
// the source artifact (Audiobookshelf idea; own code). Records real audio via the fake device
// (same mechanism as the voice-loop / waveform specs) so the player has a real audio source.

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

test.use({
  launchOptions: {
    executablePath: findLocalChromium(),
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["microphone"],
  viewport: { width: 1440, height: 1000 }
});

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?audio-speed=${Date.now()}`, { waitUntil: "networkidle" });
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

test("R1.1 audio speed: 1.5x button sets and persists playbackRate", async ({ page }) => {
  test.setTimeout(60000);
  await reset(page);

  // Record a short clip on Home (fake device) -> real audio source artifact.
  await page.getByTestId("quick-voice").click();
  await expect(page.getByTestId("record-status")).toHaveAttribute("data-raw-status", "recording", { timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.getByTestId("stop-audio-recording").click();
  const sourceId = await page.evaluate(async () => {
    for (let i = 0; i < 50; i += 1) {
      const state = window.__lifeosKnowledgeBase.getStateSnapshot();
      const audio = Object.values(state.sources).find((s) => s.kind === "audio");
      if (audio) return audio.id;
      await new Promise((r) => setTimeout(r, 300));
    }
    return "";
  });
  expect(sourceId).toBeTruthy();

  await openSurface(page, "player");
  await expect(page.getByTestId("audio-speed-row")).toBeVisible();
  await page.getByTestId("audio-rate-1-5").click();

  // Live <audio> element reflects the new rate.
  await expect.poll(async () =>
    page.evaluate(() => {
      const p = document.querySelector('[data-testid="audio-player"]');
      return p ? p.playbackRate : 0;
    })
  ).toBe(1.5);

  // Persisted on the source artifact.
  await expect.poll(async () =>
    page.evaluate((id) => window.__lifeosKnowledgeBase.getStateSnapshot().sources[id]?.playbackRate, sourceId)
  ).toBe(1.5);
});

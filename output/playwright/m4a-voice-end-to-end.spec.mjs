import { expect, test } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

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
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(240000);

const appUrl = "http://127.0.0.1:4173";
// Тот же голос и тот же текст, что и в wav-фикстуре, но в контейнере .m4a — ровно в таком
// формате телефон отдаёт диктофонную запись, и ровно на нём у владельца всё встало.
const M4A_FIXTURE = resolve("output", "playwright", "fixtures", "owner-voice-ru.m4a");

// Декодирование ALAC в отдельности уже закреплено (audio-alac-decode.spec.mjs), но владелец
// упёрся не в декодер, а в ПУТЬ ЦЕЛИКОМ: он не «вызывал функцию», он положил файл с телефона и
// нажал кнопку. Здесь проверяется именно это — от импорта до текста, на настоящей речи и
// настоящем локальном whisper.cpp.
test("файл .m4a с телефона доходит от импорта до расшифровки", async ({ page }) => {
  await page.goto(`${appUrl}?m4a-e2e=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState("networkidle");

  await page.locator("input#file-import").setInputFiles({ name: "owner-voice-ru.m4a", mimeType: "audio/mp4", buffer: readFileSync(M4A_FIXTURE) });
  await expect(page.getByTestId("capture-attachment").first()).toBeVisible({ timeout: 45000 });

  const sourceId = await page.evaluate(() => {
    const source = Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources).find((item) => /\.m4a$/i.test(item.name || ""));
    return source ? source.id : "";
  });
  expect(sourceId, "файл .m4a должен стать записью").toBeTruthy();
  // Телефонный файл — это аудио, а не «просто файл»: иначе у него не будет ни плеера, ни кнопки
  // расшифровки, и он молча осядет в списке.
  const kind = await page.evaluate((id) => window.__lifeosKnowledgeBase.getStateSnapshot().sources[id].kind, sourceId);
  expect(kind).toBe("audio");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("player")).catch(() => {});
    await page.waitForTimeout(600);
    if (await page.getByTestId("workspace-player").isVisible().catch(() => false)) break;
  }
  await expect(page.getByTestId("workspace-player")).toBeVisible({ timeout: 20000 });

  await page.getByTestId("probe-whispercpp").click();
  await expect(page.getByTestId("whispercpp-gate")).toHaveAttribute("data-raw-status", "reachable", { timeout: 20000 });

  await page.getByTestId(`transcribe-whispercpp-${sourceId}`).click();
  await expect.poll(async () => page.evaluate((id) => window.__lifeosKnowledgeBase.getStateSnapshot().sources[id]?.transcriptStatus, sourceId), { timeout: 120000, intervals: [2000] }).toBe("whispercpp-done");

  const transcript = await page.evaluate((id) => window.__lifeosKnowledgeBase.getStateSnapshot().sources[id].transcriptText, sourceId);
  expect(transcript.toLowerCase()).toContain("такси");
  expect(transcript).toMatch(/16/);
});

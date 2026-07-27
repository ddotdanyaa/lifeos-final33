import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
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
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";
const VOICE_FIXTURE = resolve("output", "playwright", "fixtures", "owner-voice-ru.wav");

// Владелец провалился в объект своей голосовой и написал прямо: «А где, сука, сам объект?».
// В карточке были вкладки Суть/Источники/Связи/Хронология/Противоречия — и ни файла, ни плеера,
// ни расшифровки. Карточка рассказывала ОБ объекте вместо того, чтобы его показать.
test("в карточке объекта видно сам исходник: плеер и расшифровка", async ({ page }) => {
  await page.goto(`${appUrl}?object-body=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState("networkidle");

  await page.locator("input#file-import").setInputFiles(VOICE_FIXTURE);
  await expect.poll(async () => page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {}).some((item) => item.kind === "audio")), { timeout: 20000 }).toBe(true);

  const sourceId = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources).find((item) => item.kind === "audio").id);
  // Расшифровка кладётся напрямую: этот тест про КАРТОЧКУ, а не про whisper — движок проверяют
  // voice-to-artifacts и voice-loop-whispercpp, и незачем требовать демон ради проверки вёрстки.
  await page.evaluate((id) => window.__lifeosKnowledgeBase.saveSourceTranscriptForTest(id, "Работаю сегодня с 16. Потратил 800 рублей на такси."), sourceId);
  await page.waitForTimeout(600);

  const noteId = await page.evaluate((id) => window.__lifeosKnowledgeBase.getStateSnapshot().sources[id].noteId, sourceId);
  await page.evaluate((id) => window.__lifeosKnowledgeBase.openObjectForTest(id), noteId);
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 20000 });

  // Сам исходник: плеер с привязкой к записи и текст расшифровки — прямо в карточке.
  const preview = page.getByTestId("object-source-preview").first();
  await expect(preview).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("object-source-audio").first()).toHaveAttribute("data-source-id", sourceId);
  await expect(page.getByTestId("object-source-transcript").first()).toContainText("такси");
});

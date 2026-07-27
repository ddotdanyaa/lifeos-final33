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
test.setTimeout(420000);

const appUrl = "http://127.0.0.1:4173";
const VOICE_FIXTURE = resolve("output", "playwright", "fixtures", "owner-voice-ru.wav");

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

// Владелец скинул два голосовых и не понял ничего: файлы прикрепились молча, кнопка «Разобрать»
// на них не реагировала, а расшифровка отвечала «файл не сохранён локально» про файл, который
// лежит у него на диске. Три отдельных дефекта на одном экране — здесь закреплены все три.

// Б1: прикрепление обязано быть видно там же, где прикрепляли.
test("прикреплённый файл виден в композиторе со своим статусом", async ({ page }) => {
  await reset(page, "attach-visible");

  await expect(page.getByTestId("capture-attachments")).toHaveCount(0);
  await page.locator("input#file-import").setInputFiles(VOICE_FIXTURE);

  const chip = page.getByTestId("capture-attachment").filter({ hasText: "owner-voice-ru.wav" });
  await expect(chip).toBeVisible({ timeout: 15000 });
  // Статус — человеческий и правдивый: звук сохранён, дальше его можно расшифровать.
  await expect(chip).toContainText("сохранено");
});

// Б2: кнопка при пустом поле и прикреплённых файлах не имеет права молчать.
test("«Разобрать» при пустом поле не молчит о прикреплённых файлах", async ({ page }) => {
  await reset(page, "attach-parse");
  await page.locator("input#file-import").setInputFiles(VOICE_FIXTURE);
  await expect(page.getByTestId("capture-attachment").first()).toBeVisible({ timeout: 45000 });

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().commandMessage || "");
  await page.getByTestId("capture-text").click();

  // Либо расшифровка пошла, либо честно названа причина — но не пустота.
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const source = Object.values(state.sources).find((item) => item.kind === "audio");
    return String(state.commandMessage || "") + "|" + String(source?.transcriptStatus || "");
  }), { timeout: 90000 }).not.toBe(before + "|");
});

// Б3: файл больше 8 МБ раньше терял звук целиком и получал сообщение, читавшееся как
// «файла нет на твоём ноутбуке». Теперь байты уходят блобом в IndexedDB, потолка нет.
test("файл больше 8 МБ сохраняется целиком и остаётся расшифровываемым", async ({ page }) => {
  await reset(page, "attach-big");

  // Настоящий WAV чуть выше порога инлайна (8 МБ): заголовок реальной записи + тишина до нужного
  // размера. Проверяется именно граница — файл, который в снимок состояния уже не помещается.
  const real = readFileSync(VOICE_FIXTURE);
  const padding = Buffer.alloc(9 * 1024 * 1024 - real.length, 0);
  const big = Buffer.concat([real, padding]);
  await page.locator("input#file-import").setInputFiles({ name: "long-dictation.wav", mimeType: "audio/wav", buffer: big });

  // Импорт одиннадцати мегабайт на занятой машине идёт десятки секунд: файл читается, состояние
  // пересобирается и дважды сохраняется, блоб пишется в IndexedDB. Бюджет здесь большой намеренно
  // и он же измеряет реальность — если запись не появляется и за три минуты, это не медленный
  // тест, а неприемлемо медленный импорт, и чинить надо импорт.
  await expect.poll(async () => page.evaluate(() => {
    const source = Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources).find((item) => item.name === "long-dictation.wav");
    return source ? Boolean(source.mediaStored) : false;
  }), { timeout: 180000, intervals: [3000] }).toBe(true);

  const stored = await page.evaluate(() => {
    const source = Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources).find((item) => item.name === "long-dictation.wav");
    return source ? { size: source.size, dataUrl: source.dataUrl.length, mediaStored: Boolean(source.mediaStored) } : null;
  });

  expect(stored, "запись должна появиться").toBeTruthy();
  expect(stored.size).toBeGreaterThan(8 * 1024 * 1024);
  // В снимке состояния байтов нет — и это правильно, они лежат блобом отдельно.
  expect(stored.dataUrl).toBe(0);
  expect(stored.mediaStored, "байты больше 8 МБ обязаны сохраниться блобом").toBe(true);

  // И они действительно читаются обратно: адрес для плеера и расшифровки существует.
  const resolvable = await page.evaluate(async () => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const source = Object.values(state.sources).find((item) => item.name === "long-dictation.wav");
    const url = await window.__lifeosKnowledgeBase.resolveSourceMediaUrlForTest(source.id);
    return typeof url === "string" && url.startsWith("blob:");
  });
  expect(resolvable, "сохранённые байты должны читаться обратно").toBe(true);
});

// Б5: перерисовка заменяет весь DOM, и поле поиска умирало после первой буквы.
test("глобальный поиск не теряет фокус на каждой букве", async ({ page }) => {
  await reset(page, "search-focus");

  const search = page.locator("#global-search");
  await search.click();
  await page.keyboard.type("маш", { delay: 120 });
  await page.waitForTimeout(600);

  await expect(search).toBeFocused();
  await expect(search).toHaveValue("маш");
});

import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  return readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"))
    .find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(240000);

const appUrl = "http://127.0.0.1:4173";
const LANG_DATA = join("vendor", "tesseract-lang", "fast", "rus.traineddata");

// Разбор чека — чистая логика, и проверяется он БЕЗ движка: строки, которые отдаёт OCR, известны, а
// правило важнее движка. Главное правило: сумма чека — та, что рядом со словом итога, а не самая
// большая. На чеке «НАЛИЧНЫМИ 500,00» больше, чем «ИТОГО 382,40», и позиция «2 x 129.00 = 258.00»
// больше любой отдельной цены. Взять максимум значило бы записать владельцу не ту трату.
test("сумма чека берётся у слова «Итого», а не у самого большого числа", async ({ page }) => {
  await page.goto(`${appUrl}?receipt-parse=${Date.now()}`, { waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });

  const receipt = [
    "Пятёрочка",
    "ООО Агроторг",
    "ИНН 7825706086",
    "Кассовый чек № 4417",
    "12.07.2026 19:42",
    "Молоко 1л         89,90",
    "2 x 129.00 =     258.00",
    "Скидка            -20,00",
    "ИТОГО            382,40",
    "НАЛИЧНЫМИ        500,00",
    "СДАЧА            117,60"
  ].join("\n");

  const parsed = await page.evaluate((text) => window.__lifeosKnowledgeBase.parseReceiptForTest(text), receipt);
  expect(parsed.amount, "сумма чека — 382,40, а не 500 и не 258").toBe(382.4);
  expect(parsed.day, "дата берётся с чека, а не сегодняшняя").toBe("2026-07-12");
  expect(parsed.merchant, "магазин — вывеска, а не форма собственности").toBe("Пятёрочка");
  expect(parsed.understood).toBe(true);

  // Чек без слова итога НЕ ПОНЯТ, и это честный ответ. Подставить цену позиции суммой покупки —
  // соврать про деньги владельца.
  const noTotal = await page.evaluate(() => window.__lifeosKnowledgeBase.parseReceiptForTest("Кофейня\nЛатте 320,00\nСпасибо за покупку"));
  expect(noTotal.understood, "без строки итога чек не понят").toBe(false);
  expect(noTotal.amount).toBe(0);
});

// Живой движок на настоящей картинке. Без языковых данных спека ПРОПУСКАЕТСЯ ВСЛУХ, а не проходит
// молча: молчаливый зелёный тут выглядел бы как «OCR работает».
test("фото чека становится предложением расхода — настоящим движком", async ({ page }) => {
  test.skip(!existsSync(LANG_DATA), "нет " + LANG_DATA + " — скачай: node tools/setup-tesseract-lang.mjs");

  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?receipt-ocr=${Date.now()}`, { waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest());
  await page.getByTestId("surface-inbox").first().waitFor({ state: "visible", timeout: 20000 });

  // Картинка рисуется в самом браузере: так чек одинаков на любой машине и не лежит в git
  // мегабайтом. Шрифт крупный и моноширинный — это тот же чек, только не мятый: мятую бумагу
  // проверяет владелец на своём телефоне, а спека проверяет ПУТЬ.
  const imageBytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 520;
    canvas.height = 360;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#000000";
    context.font = "26px monospace";
    const lines = ["ПЯТЕРОЧКА", "ЧЕК 4417", "12.07.2026", "МОЛОКО 89.90", "ХЛЕБ 54.50", "ИТОГО 382.40", "НАЛИЧНЫМИ 500.00"];
    lines.forEach((line, index) => context.fillText(line, 20, 46 + index * 44));
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const buffer = await blob.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  });

  // Файл приходит тем же путём, что и любой другой: буфером в input (знак процента в пути проекта
  // молча ломает setInputFiles с путём — ловушка, купленная болью, см. MEMORY.md).
  await page.locator("#file-import").setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from(imageBytes)
  });
  await expect(page.getByTestId("capture-attachments")).toBeVisible({ timeout: 20000 });

  const sourceId = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return (state.captureAttachments || [])[0] || "";
  });
  expect(sourceId, "фото обязано прикрепиться записью").toBeTruthy();

  await page.getByTestId("recognize-receipt-" + sourceId).click();

  // Движок работает локально и не быстро — ждём предложение, а не таймаут.
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.proposals || {})
      .filter((item) => !item.deleted && item.draftId === "receipt-ocr")
      .map((item) => Number((item.fields || {}).amount || 0));
  }), { timeout: 180000, intervals: [2000] }).toContainEqual(382.4);

  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const proposal = Object.values(state.proposals).find((item) => item.draftId === "receipt-ocr" && !item.deleted);
  expect(proposal.fields.day, "дата с чека, а не сегодняшняя").toBe("2026-07-12");
  expect(proposal.reason, "владелец видит, ЧТО прочитано с фото").toMatch(/Прочитано с фото/);

  // Деньги не появляются сами: до подтверждения в финансах ничего нет (§7).
  const before = Object.values(state.financeTransactions || {}).filter((item) => !item.deleted);
  expect(before.length, "OCR не пишет расход сам — только предложение").toBe(0);

  // И чек провайдера остаётся: локальный движок отчитался о прогоне.
  const run = Object.values(state.providerRuns || {}).find((item) => item.providerId === "tesseract" && item.status === "ok");
  expect(run, "прогон OCR обязан оставить чек провайдера").toBeTruthy();
});

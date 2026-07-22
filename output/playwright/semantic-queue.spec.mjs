import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort().reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";
async function reset(page) {
  await page.goto(`${appUrl}?semantic=${Date.now()}`, { waitUntil: "networkidle" });
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

// Срез 15 (Этап B): фоновый смысловой разбор. Записи владельца встают в очередь; проход локальной
// моделью даёт ПРЕДЛОЖЕНИЯ (не тихие действия). Модель не проверена → честно «недоступно».
test("semantic queue: capture enqueues, prompt+parser are honest, and no-model degrades honestly", async ({ page }) => {
  await reset(page);

  // 1. Чистые функции разбора (детерминированно, без Ollama) — доходят до окна.
  const promptOk = await page.evaluate(() => {
    const kb = window.__lifeosKnowledgeBase;
    const prompt = kb.buildSemanticParsePrompt("купил протеин 2000 и позвонить бухгалтеру", "2026-07-22");
    return prompt.includes("позвонить бухгалтеру") && /JSON-массив/.test(prompt) && /ничего не выдумывай/.test(prompt);
  });
  expect(promptOk).toBe(true);

  const parseOk = await page.evaluate(() => {
    const kb = window.__lifeosKnowledgeBase;
    const good = kb.parseSemanticModelResponse('```json\n[{"kind":"task","title":"позвонить бухгалтеру"},{"kind":"expense","title":"протеин","amount":2000}]\n```');
    const bad = kb.parseSemanticModelResponse("извини, не понял");
    return good.ok && good.items.length === 2 && good.items[1].amount === 2000 && bad.ok === false && bad.items.length === 0;
  });
  expect(parseOk).toBe(true);

  // 2. Содержательная запись встаёт в очередь фонового разбора.
  await openSurface(page, "inbox");
  await page.getByTestId("capture-input").fill("надо разобраться с налогами и позвонить бухгалтеру на неделе");
  await page.getByTestId("capture-text").click();
  await expect.poll(async () => page.evaluate(() => (window.__lifeosKnowledgeBase.getStateSnapshot().semanticQueue || []).length)).toBeGreaterThan(0);

  // 3. Виджет Дома «Фоновый разбор» показывает запись, ждущую разбора.
  await openSurface(page, "inbox");
  await expect(page.getByTestId("semantic-queue-panel")).toBeVisible();
  await expect(page.getByTestId("semantic-queue-item").first()).toBeVisible();

  // 4. Модель не проверена → «Разобрать смыслом» честно сообщает о недоступности, ничего не выдумывая.
  await page.getByTestId("run-semantic-queue").click();
  const passNote = page.getByTestId("semantic-pass-note");
  await expect(passNote).toBeVisible();
  await expect(passNote).toHaveAttribute("data-status", "provider_unavailable");
  const stillPending = await page.evaluate(() => (window.__lifeosKnowledgeBase.getStateSnapshot().semanticQueue || []).every((item) => item.status === "pending"));
  expect(stillPending).toBe(true);
});

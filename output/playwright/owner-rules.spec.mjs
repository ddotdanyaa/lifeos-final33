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
  await page.goto(`${appUrl}?rules=${Date.now()}`, { waitUntil: "networkidle" });
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

// Срез 14: правила поведения от владельца - артефакты, которые РЕАЛЬНО влияют (вплетаются в промпт
// локальной модели). Сценарий целиком: добавить правило → оно в промпте → пресет → выключить → удалить.
test("owner rules: add/preset/toggle/remove and they actually reach the chat prompt", async ({ page }) => {
  await reset(page);
  await openSurface(page, "control");
  await expect(page.getByTestId("owner-rules")).toBeVisible();

  const RULE = "Отвечай только смайликами";
  // 1. Добавить правило.
  await page.getByTestId("instruction-input").fill(RULE);
  await page.getByTestId("add-instruction").click();
  const ruleRow = page.locator('[data-testid="owner-rule"]').filter({ hasText: RULE });
  await expect(ruleRow).toBeVisible();
  await expect(ruleRow).toHaveAttribute("data-active", "1");

  // 2. Функциональная привязка: активное правило доходит до промпта локальной модели.
  const promptHasRule = await page.evaluate((rule) => {
    const kb = window.__lifeosKnowledgeBase;
    const state = kb.getStateSnapshot();
    const rules = kb.activeOwnerInstructions(state);
    const prompt = kb.buildOllamaChatPrompt({ title: "t", text: "x" }, [], "вопрос", "", "", false, rules);
    return prompt.includes(rule);
  }, RULE);
  expect(promptHasRule).toBe(true);

  // 3. Пресет добавляет правило.
  const before = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().ownerInstructions || {}).length);
  await page.getByTestId("instruction-preset").first().click();
  await expect.poll(async () => page.evaluate(() => (window.__lifeosKnowledgeBase.getStateSnapshot().ownerInstructions || []).length)).toBeGreaterThan(before);

  // 4. Выключить правило → оно перестаёт доходить до промпта.
  await ruleRow.getByTestId("toggle-instruction").click();
  await expect(page.locator('[data-testid="owner-rule"]').filter({ hasText: RULE })).toHaveAttribute("data-active", "0");
  const stillActive = await page.evaluate((rule) => {
    const kb = window.__lifeosKnowledgeBase;
    return kb.activeOwnerInstructions(kb.getStateSnapshot()).includes(rule);
  }, RULE);
  expect(stillActive).toBe(false);

  // 5. Удалить.
  await page.locator('[data-testid="owner-rule"]').filter({ hasText: RULE }).getByTestId("remove-instruction").click();
  await expect(page.locator('[data-testid="owner-rule"]').filter({ hasText: RULE })).toHaveCount(0);
});

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
  await page.goto(`${appUrl}?insight=${Date.now()}`, { waitUntil: "networkidle" });
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
async function capture(page, text) {
  await openSurface(page, "inbox");
  await page.locator("#capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  const primary = page.getByTestId("human-primary-action");
  if (await primary.isVisible().catch(() => false)) await primary.click();
  await page.waitForTimeout(180);
}

// Срез 11: Insight Engine + рефлексия. Сценарий целиком: реальные данные (3 одинаковых расхода +
// просроченная задача) → Дом показывает вычисленные инсайты → «Закрепить» создаёт постоянный
// insight-артефакт (receipt) → вечерняя рефлексия подводит день.
test("insight engine computes patterns, pin creates a real artifact, evening reflection sums the day", async ({ page }) => {
  await reset(page);

  // 1. Три одинаковых расхода → повторяющаяся трата.
  await capture(page, "кофе 300");
  await capture(page, "кофе 300");
  await capture(page, "кофе 300");
  // 2. Задача с прошедшим днём → просрочка.
  await capture(page, "Задача: позвонить врачу");
  const taskSnap = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const task = Object.values(taskSnap.tasks || {}).find((t) => !t.deleted && /врач/i.test(t.title || ""));
  if (task) {
    await page.evaluate((id) => window.__lifeosKnowledgeBase.setArtifactDayForTest("tasks", id, new Date(Date.now() - 86400000).toISOString().slice(0, 10)), task.id);
  }

  // 3. Дом: панель инсайтов с повторяющейся тратой.
  await openSurface(page, "inbox");
  await expect(page.getByTestId("insights-panel")).toBeVisible();
  const recur = page.locator('[data-testid="insight-card"]').filter({ hasText: "Частый расход" });
  await expect(recur).toBeVisible();
  await expect(recur).toContainText("3 раз");

  // 4. Закрепить инсайт → постоянный insight-артефакт (state.insights растёт).
  const beforePin = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().insights || {}).length);
  await recur.getByTestId("pin-insight").click();
  await expect.poll(async () => page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().insights || {}).length)).toBeGreaterThan(beforePin);
  const afterPin = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(afterPin.insights).some((i) => /Частый расход/.test(i.title))).toBe(true);

  // 5. Вечерняя рефлексия подводит день (были расходы/записи сегодня).
  await expect(page.getByTestId("evening-reflection")).toBeVisible();
  await expect(page.getByTestId("evening-summary")).toContainText("Сегодня");
});

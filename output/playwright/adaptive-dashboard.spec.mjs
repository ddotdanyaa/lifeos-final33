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
  await page.goto(`${appUrl}?dash=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Срез 14: адаптивный дашборд. Сценарий целиком: скрываю виджет → он уходит и появляется в полоске
// «скрытые» → показываю обратно → переставляю (порядок меняется, переживает ре-рендер).
test("adaptive dashboard: hide, show and reorder Home widgets, persisted", async ({ page }) => {
  await reset(page);

  const morning = page.locator('[data-testid="dash-widget"][data-widget="morning"]');
  await expect(morning).toBeVisible();
  await expect(morning.getByTestId("morning-summary")).toBeVisible();

  // 1. Скрыть «Утренняя сводка» → виджет исчезает, попадает в «скрытые».
  await morning.getByTestId("widget-hide").click();
  await expect(page.locator('[data-testid="dash-widget"][data-widget="morning"]')).toHaveCount(0);
  await expect(page.getByTestId("dash-hidden")).toBeVisible();
  const hiddenState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().dashboardLayout.hidden);
  expect(hiddenState).toContain("morning");

  // 2. Показать обратно.
  await page.getByTestId("widget-show").filter({ hasText: "Утренняя сводка" }).click();
  await expect(page.locator('[data-testid="dash-widget"][data-widget="morning"]')).toBeVisible();

  // 3. Переставить: «Утренняя сводка» вниз → в порядке она сдвигается (переживает ре-рендер).
  await page.locator('[data-testid="dash-widget"][data-widget="morning"]').getByTestId("widget-down").click();
  const order = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().dashboardLayout.order);
  expect(order.indexOf("morning")).toBe(1);
  expect(order[0]).toBe("insights");
});

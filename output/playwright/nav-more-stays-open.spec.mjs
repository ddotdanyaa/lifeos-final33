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
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

// Вторичное меню было родным <details>, а перерисовка заменяет весь DOM после ЛЮБОГО действия —
// раскрытие терялось, и меню закрывалось прямо под рукой. Экраны «Аудио», «Чтение», «Чат» живут
// именно там, поэтому путь к ним рвался: владелец жаловался, что «нажимаешь — всё ломается», а
// спека про плеер падала не на плеере, а на невидимой кнопке.
test("вторичное меню «Ещё» не закрывается само после действия", async ({ page }) => {
  await page.goto(`${appUrl}?nav-more=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });

  const ribbon = page.locator('[data-testid="app-ribbon"]');
  await expect(ribbon).not.toHaveAttribute("open", /.*/);

  await ribbon.locator("summary").click();
  await expect(ribbon).toHaveAttribute("open", /.*/, { timeout: 10000 });

  // Любое действие вызывает полную перерисовку — раскрытие обязано её пережить.
  await page.fill('[data-testid="capture-input"]', "проверка");
  await page.waitForTimeout(800);
  await expect(ribbon).toHaveAttribute("open", /.*/);

  // И экран из вторичного меню действительно достижим кликом, а не только программно.
  const player = page.getByTestId("surface-player").first();
  await expect(player).toBeVisible({ timeout: 10000 });
  await player.click();
  await expect(page.getByTestId("workspace-player")).toBeVisible({ timeout: 20000 });

  // Меню запомнило выбор владельца и после перехода: закрывать его за него никто не должен.
  await expect(page.locator('[data-testid="app-ribbon"]')).toHaveAttribute("open", /.*/);
});

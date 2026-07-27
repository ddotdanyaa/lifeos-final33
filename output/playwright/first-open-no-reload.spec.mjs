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
test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";

// Первое открытие на ЧИСТОМ профиле: service worker ставится впервые, забирает страницу себе и
// шлёт controllerchange. Приложение считало это событие «приехала новая версия» и перезагружалось
// через пару секунд после старта — вместе со всем, что владелец успел напечатать. У самого
// владельца воркер стоит давно, поэтому изо дня в день дефекта не видно; видно его ровно там, где
// хуже всего — при первом знакомстве с продуктом. И в каждом прогоне e2e: набор специально
// открывает чистый профиль, поэтому спеки разбора падали не на разборе, а на исчезнувшем вводе.
test("первое открытие не перезагружает себя и не теряет напечатанное", async ({ page }) => {
  const navigations = [];
  page.on("framenavigated", (frame) => { if (!frame.parentFrame()) navigations.push(frame.url()); });

  await page.goto(`${appUrl}?first-open=${Date.now()}`, { waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.getStateSnapshot);

  const navigationsAfterLoad = navigations.length;
  await page.fill('[data-testid="capture-input"]', "Оценить продажу старой машины");

  // Воркер успевает встать и захватить страницу за это время: если перезагрузка вооружена
  // неправильно, она случится именно здесь.
  await page.waitForTimeout(6000);

  expect(navigations.length, "страница не должна перезагружать себя после первого открытия").toBe(navigationsAfterLoad);
  await expect(page.locator('[data-testid="capture-input"]')).toHaveValue("Оценить продажу старой машины");

  // И напечатанное действительно разбирается — ввод дожил до кнопки.
  await page.click('[data-testid="capture-text"]');
  await expect.poll(async () => page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().proposals || {}).length), { timeout: 15000 }).toBeGreaterThan(0);
});

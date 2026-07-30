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
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

// Проба руками (§2.5, `tools/probe-live-interaction.mjs`, 2026-07-30) прошла по девяти пунктам
// главного меню настоящими кликами — с прокрученной страницы, потому что владелец приходит к меню
// не с верха экрана. Четыре раздела из девяти открывались СЕРЕДИНОЙ: Контроль на 400 px, Календарь
// на 158, Системы и База на 18. Ни одна зелёная спека этого не видела: они переходят между
// разделами с нулевой прокрутки.
//
// Три сброса прокрутки в `set-surface` не спасали — они стоят ДО перерисовки, а тяжёлые экраны
// (граф, календарь, плеер) дорастают после неё, и браузер возвращает прежний отступ. Поэтому сброс
// теперь стоит в конце `render()`, после монтирования тяжёлых частей, и только когда раздел
// действительно сменился.
const SCREENS = ["control", "calendar", "systems", "library", "graph", "finance"];

test("раздел открывается с начала, а не серединой", async ({ page }) => {
  await page.goto(`${appUrl}?opens-from-top=${Date.now()}`, { waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.getByTestId("surface-inbox").first().waitFor({ state: "visible", timeout: 20000 });

  for (const surface of SCREENS) {
    // Уходим вниз ДО перехода: именно так владелец и нажимает — дочитав экран до середины.
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.getByTestId("surface-" + surface).first().click();
    await page.waitForTimeout(400);

    const opened = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().activeSurface);
    expect(opened, "клик по «" + surface + "» обязан открыть этот раздел").toBe(surface);

    const y = await page.evaluate(() => window.scrollY);
    expect(y, "раздел «" + surface + "» открылся прокрученным на " + y + " px").toBeLessThanOrEqual(4);
  }
});

// Про внутренние прокрутки утверждения здесь НЕТ, и это осознанно. «Сейчас» в календаре
// (`mountCalendarNowScroll`) и хвост чата (`scrollChatThreadToLatest`) двигают свой контейнер, а
// сброс из `render()` трогает только окно — проверено чтением кода. Написать на это утверждение
// честно нельзя: на пустом календаре прокручивать нечего, и пришлось бы завести данные, то есть
// проверять свою же заготовку вместо продукта. Лучше признанный пробел, чем зелёная проверка ни о чём.

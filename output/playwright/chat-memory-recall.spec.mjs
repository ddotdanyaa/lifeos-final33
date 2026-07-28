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
  await page.goto(`${appUrl}?chatmem=${Date.now()}`, { waitUntil: "networkidle" });
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
    // Раскрытие «Ещё» живёт в состоянии, а не в браузерном <details>: после клика идёт коммит и
    // перерисовка. Без ожидания следующий шаг работает по старому DOM.
    await page.waitForTimeout(350);
    if (!(await page.locator('[data-testid="app-ribbon"] .nav-cluster').first().isVisible().catch(() => false))) {
      await page.locator('[data-testid="app-ribbon"] summary').first().click().catch(() => {});
      await page.waitForTimeout(350);
    }
  }
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    // Перебираем группы ПОИМЁННО. Раскрыта всегда одна, поэтому «первый тумблер в DOM» после
    // каждого клика возвращается к началу — цикл по `.first()` ходил бы между двумя группами
    // бесконечно. И ждём перерисовку: раскрытие идёт через состояние, а не через CSS.
    for (const cluster of ["capture", "doing", "ai", "workshop"]) {
      const toggle = page.getByTestId(`nav-cluster-drafts-${cluster}`);
      if (!(await toggle.count())) continue;
      await toggle.click().catch(() => {});
      await page.waitForTimeout(350);
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

// Срез 8.3: поиск по памяти из чата. СЦЕНАРИЙ целиком: пишем заметки -> в чате «найди про X» ->
// minisearch отвечает в чате -> тот же результат виден в панели «Память» Базы -> клик открывает.
test("chat memory recall answers from minisearch and shares the memory panel", async ({ page }) => {
  const token = String(Date.now()).slice(-6);
  let nextTitle = "";
  page.on("dialog", (dialog) => dialog.accept(dialog.type() === "prompt" ? nextTitle : undefined));
  await reset(page);

  await openSurface(page, "library");
  const coffeeTitle = "Рецепт кофе " + token;
  async function makeNote(title, body) {
    nextTitle = title;
    await page.getByTestId("new-note").click();
    await expect(page.getByTestId("note-title")).toHaveValue(title);
    await page.getByTestId("note-body").fill(body);
    await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  }
  await makeNote(coffeeTitle, "Утренний латте с корицей, любимый рецепт.");
  await makeNote("План поездки " + token, "Маршрут по горам летом.");

  // 1. В чате спрашиваем «найди в памяти кофе» -> ассистент отвечает с названием заметки.
  await openSurface(page, "chat");
  await page.getByTestId("chat-input").fill("найди в памяти кофе");
  await page.getByTestId("send-chat").click();
  const assistant = page.locator(".chat-message.assistant").last();
  await expect(assistant).toContainText("Нашёл в памяти");
  await expect(assistant).toContainText(coffeeTitle);

  // 2. Тот же результат виден в панели «Память» Базы (общий memorySearchReport - переиспользование).
  await openSurface(page, "library");
  const memRow = page.getByTestId("memory-search-row").filter({ hasText: coffeeTitle });
  await expect(memRow).toBeVisible();

  // 3. Клик по результату открывает заметку (полный путь: чат -> поиск -> панель -> заметка).
  await memRow.click();
  await expect(page.getByTestId("note-title")).toHaveValue(coffeeTitle);
});

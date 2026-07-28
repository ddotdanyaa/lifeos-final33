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
  await page.goto(`${appUrl}?memory=${Date.now()}`, { waitUntil: "networkidle" });
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

// Срез 8: 4 слоя памяти — вычисляемая проекция (возраст + связность), не 4 хранилища.
// Свежая → Активная; недавняя → Рабочая; старая со связью → Долговременная; старая одинокая → Архив.
test("memory layers are a computed projection over age and connectivity", async ({ page }) => {
  const token = String(Date.now());
  let nextTitle = "";
  page.on("dialog", (dialog) => dialog.accept(dialog.type() === "prompt" ? nextTitle : undefined));
  await reset(page);
  await openSurface(page, "library");

  async function makeNote(title, body) {
    nextTitle = title;
    await page.getByTestId("new-note").click();
    await expect(page.getByTestId("note-title")).toHaveValue(title);
    await page.getByTestId("note-body").fill(body);
    await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
    const snap = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    const note = Object.values(snap.notes).find((n) => n.title === title);
    return note.id;
  }

  const activeTitle = "Активная " + token;
  const workingTitle = "Рабочая " + token;
  const longTitle = "Долгая " + token;
  const archiveTitle = "Архивная " + token;

  const activeId = await makeNote(activeTitle, "Свежая мысль, только записал.");
  const workingId = await makeNote(workingTitle, "Недавняя рабочая заметка.");
  const longId = await makeNote(longTitle, "Старое, но связано: [[" + activeTitle + "]].");
  const archiveId = await makeNote(archiveTitle, "Старое и одинокое, без связей.");

  // Состариваем три заметки (updatedAt в прошлое); active оставляем свежей.
  await page.evaluate(([w, l, a]) => Promise.all([
    window.__lifeosKnowledgeBase.backdateNoteForTest(w, 5),
    window.__lifeosKnowledgeBase.backdateNoteForTest(l, 40),
    window.__lifeosKnowledgeBase.backdateNoteForTest(a, 40)
  ]), [workingId, longId, archiveId]);
  // Снимаем выбор с последней созданной заметки (иначе она «активная по выбору» вне зависимости
  // от возраста): переводим активную заметку на product-brain root, который проекция исключает.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("library"));
  await expect(page.getByTestId("memory-panel")).toBeVisible();

  const layer = (key) => page.locator(`[data-testid="memory-layer"][data-layer="${key}"]`);
  await expect(layer("active")).toContainText(activeTitle);
  await expect(layer("working")).toContainText(workingTitle);
  await expect(layer("longTerm")).toContainText(longTitle);
  await expect(layer("archive")).toContainText(archiveTitle);
  // Негативные проверки: слои не пересекаются.
  await expect(layer("archive")).not.toContainText(activeTitle);
  await expect(layer("active")).not.toContainText(archiveTitle);
  await expect(layer("archive")).not.toContainText(longTitle);

  // Клик по строке памяти открывает заметку в редакторе.
  await layer("working").getByTestId("memory-note-row").first().click();
  await expect(page.getByTestId("note-title")).toHaveValue(workingTitle);
});

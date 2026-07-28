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
  await page.goto(`${appUrl}?entity=${Date.now()}`, { waitUntil: "networkidle" });
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

// Срез 10: разрешение сущностей-людей. Сценарий целиком: пишем текст с именами → «Даня»
// авто-сливается в «Данил» (известное уменьшительное) → неоднозначная пара «Артурчик»/«Артур»
// предлагается на слияние (owner-gated) → подтверждаю → одна сущность.
test("entity resolution: aliases fold into one person, ambiguous pair is asked, not auto-merged", async ({ page }) => {
  await reset(page);

  await page.getByTestId("capture-input").fill("Проект вёл Данил. Помогал Даня. Пришёл Артур. Ещё Артурчик.");
  await page.getByTestId("capture-text").click();
  await page.waitForTimeout(400);

  await openSurface(page, "graph");
  await expect(page.getByTestId("people-panel")).toBeVisible();

  // 1. «Даня» распознан как «Данил» автоматически (известное уменьшительное) - одна строка с алиасом.
  const danil = page.locator('[data-testid="person-row"][data-person="Данил"]');
  await expect(danil).toBeVisible();
  await expect(danil).toContainText("Даня");

  // 2. «Артурчик»/«Артур» НЕ слиты молча - показано предложение (спросить при неуверенности).
  const suggestion = page.locator('[data-testid="person-merge-suggestion"]').filter({ hasText: "Артурчик" });
  await expect(suggestion).toBeVisible();
  await expect(suggestion).toContainText("Артур");

  // 3. Подтверждаю слияние → «Артурчик» становится алиасом «Артура», предложение исчезает.
  await suggestion.getByTestId("person-merge-apply").click();
  await expect(page.locator('[data-testid="person-merge-suggestion"]').filter({ hasText: "Артурчик" })).toHaveCount(0);
  const artur = page.locator('[data-testid="person-row"][data-person="Артур"]');
  await expect(artur).toBeVisible();
  await expect(artur).toContainText("Артурчик");
  // Отдельной строки «Артурчик» больше нет.
  await expect(page.locator('[data-testid="person-row"][data-person="Артурчик"]')).toHaveCount(0);
});

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

async function open(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Владелец: «сайт перегружен говном, мусором… слева всё намешано». Обход показал, из чего это
// ощущение складывается: рабочие экраны и недописанные каркасы стоят вперемешку одинаковыми
// строками, а два пункта («Цели» и «Привычки») рисуют вообще один и тот же экран.
// Канон (docs/design/LIFEOS_DESIGN_CANON.md §9) требует ровно этого: черновики — отдельной
// группой «🚧 В разработке», одинаковые экраны — объединить.

test("черновики стоят отдельной группой, а не вперемешку с рабочими разделами", async ({ page }) => {
  await open(page, "nav-honest");

  const ribbon = page.locator('[data-testid="app-ribbon"]');
  await ribbon.locator("summary").click();
  await expect(page.getByTestId("nav-draft-label")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("nav-draft-label")).toContainText("В разработке");

  // Порядок обязателен: рабочее выше подписи, черновики — ниже неё.
  const order = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-testid="app-ribbon"] button, [data-testid="nav-draft-label"]'));
    return nodes.map((node) => node.dataset.testid || "label");
  });
  const labelAt = order.indexOf("nav-draft-label");
  expect(labelAt).toBeGreaterThan(0);
  expect(order.slice(0, labelAt)).toContain("surface-player");
  expect(order.slice(labelAt)).toContain("surface-twin");
  expect(order.slice(0, labelAt)).not.toContain("surface-twin");
});

test("двух пунктов на один и тот же экран больше нет", async ({ page }) => {
  await open(page, "nav-merge");
  await page.locator('[data-testid="app-ribbon"] summary').click();
  await page.waitForTimeout(400);

  // «Цели» и «Привычки» рисовали идентичный экран — в меню остаётся один пункт.
  await expect(page.getByTestId("surface-goals")).toHaveCount(1);
  await expect(page.getByTestId("surface-habits")).toHaveCount(0);
  await expect(page.getByTestId("surface-goals")).toContainText("привычки");
});

test("экран-каркас честно говорит, что он в разработке", async ({ page }) => {
  await open(page, "nav-draft-note");

  for (const surface of ["twin", "databases", "smart-home"]) {
    await page.evaluate((id) => window.__lifeosKnowledgeBase.setSurfaceForTest(id), surface);
    await page.waitForTimeout(500);
    await expect(page.getByTestId("workspace-draft-note"), surface + " обязан признаться, что он каркас").toBeVisible({ timeout: 10000 });
  }

  // А рабочий экран такой подписи не носит — иначе она обесценится.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("library"));
  await page.waitForTimeout(600);
  await expect(page.getByTestId("workspace-draft-note")).toHaveCount(0);
});

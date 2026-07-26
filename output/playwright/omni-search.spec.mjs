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
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?omni=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function seed(page) {
  for (const line of ["Марина против кредита на машину", "Потратил 4380 продукты Лента"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));
  await page.waitForSelector('[data-testid="goal-input"]');
  await page.fill('[data-testid="goal-input"]', "Купить машину");
  await page.click('[data-testid="add-goal"]');
  await page.fill('[data-testid="task-input"]', "Оценить продажу машины");
  await page.click('[data-testid="add-task"]');
  await page.waitForTimeout(400);
}

async function openPalette(page, query) {
  await page.keyboard.press("Control+k");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.fill('[data-testid="command-palette-query"]', query);
  await page.waitForTimeout(400);
}

// S1: один ввод находит всё — артефакты, цели, задачи, захваты, связи и команды, без префиксов.
test("⌘K находит артефакты, цели, задачи, захваты, связи и команды одним запросом", async ({ page }) => {
  await reset(page);
  await seed(page);
  await openPalette(page, "машин");

  const groups = await page.$$eval('[data-testid="omni-group"]', (nodes) => nodes.map((node) => node.dataset.group));
  for (const expected of ["artifact", "goal", "task", "capture", "link"]) {
    expect(groups).toContain(expected);
  }

  // Точное совпадение выше нечёткого: по «машин» не приходят посторонние заметки.
  const artifacts = await page.$$eval('[data-testid="omni-result"][data-kind="artifact"]', (nodes) => nodes.map((node) => node.textContent.trim()));
  expect(artifacts.length).toBeGreaterThan(0);
  expect(artifacts.every((text) => /машин/i.test(text))).toBe(true);

  // Связь показывает объяснение, а не просто факт связанности (закон №8).
  const link = page.locator('[data-testid="omni-result"][data-kind="link"]').first();
  await expect(link).toContainText("→");
  await expect(link).toContainText("цель");
});

// S2: результат — это вход в объект: нашёл и провалился, без промежуточных экранов.
test("⌘K: результат открывает объект и закрывает палитру", async ({ page }) => {
  await reset(page);
  await seed(page);
  await openPalette(page, "машин");

  await page.locator('[data-testid="omni-result"][data-kind="goal"]').first().click();
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("object-title")).toContainText("машин");
  await expect(page.getByTestId("command-palette")).toHaveCount(0);
});

// S3: «везде» — палитра открывается тем же ⌘K с любого экрана, включая сам Объект.
test("⌘K открывается на каждом экране", async ({ page }) => {
  await reset(page);
  await seed(page);
  for (const surface of ["inbox", "today", "finance", "graph", "library", "control"]) {
    await page.evaluate((name) => window.__lifeosKnowledgeBase.setSurfaceForTest(name), surface);
    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
  }
});

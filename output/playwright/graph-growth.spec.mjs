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
test.setTimeout(150000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?growth=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function fill(page) {
  for (const line of ["разогрев", "Хочу купить машину до августа", "Оценить продажу старой машины", "Потратил 20000 бензин", "Заработал 200000 зарплата"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(220);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(500);
}

// G1: в первый день роста ещё НЕТ, и рисовать его нечем. Пустой график с одной точкой — это
// обещание динамики там, где её не было.
test("в первый день блок роста не показывается", async ({ page }) => {
  await reset(page);
  await fill(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.waitForTimeout(700);

  await expect(page.getByTestId("graph-growth")).toHaveCount(0);
});

// G2: когда история появилась, видно РАЗМЕР графа по дням и приток за каждый день отдельно.
test("рост графа виден по дням, приток подписан отдельно", async ({ page }) => {
  await reset(page);
  await fill(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.backdateObjectsForTest(3, 4));
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.waitForTimeout(900);

  await expect(page.getByTestId("graph-growth")).toBeVisible();
  const days = await page.getByTestId("graph-growth-day").count();
  expect(days).toBeGreaterThan(1);

  const growth = await page.evaluate(() => window.__lifeosKnowledgeBase.graphGrowthForTest());
  // Накопительный итог не убывает: это размер графа, а не приток.
  const totals = growth.days.map((row) => row.total);
  expect(totals).toEqual([...totals].sort((a, b) => a - b));
  // Пустой день остаётся пустым — данные владельца не сглаживаются.
  expect(growth.days.some((row) => row.added === 0)).toBe(true);
  expect(growth.days[growth.days.length - 1].added).toBeGreaterThan(0);
});

// G3 (закон №5): под графиком сказано, из чего он посчитан. И считается он по объектам ЖИЗНИ —
// иначе рост показывал бы машинерию платформы.
test("у графика роста видно, из чего он посчитан", async ({ page }) => {
  await reset(page);
  await fill(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.backdateObjectsForTest(3, 4));
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.waitForTimeout(900);

  await expect(page.getByTestId("graph-growth")).toContainText("по датам создания объектов жизни");
  await expect(page.getByTestId("graph-growth-head")).toContainText("Сейчас");
});

// G4: текстовый отчёт графа тоже называет рост — он читается вслух, без разглядывания столбиков.
test("отчёт графа называет рост словами", async ({ page }) => {
  await reset(page);
  await fill(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.backdateObjectsForTest(3, 4));
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.waitForTimeout(900);

  const lines = await page.locator('[data-testid="graph-report-line"][data-line="growth"]').allTextContents();
  expect(lines.length).toBe(1);
  expect(lines[0]).toMatch(/вырос на \d+/);
});

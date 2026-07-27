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

// G5: выбор темы сужает рост до её объектов — владелец просил смотреть, как растёт КОНКРЕТНЫЙ
// проект, а не вся база сразу. Тема названа прямо в подписи.
test("выбор темы сужает рост до её объектов", async ({ page }) => {
  await reset(page);
  await fill(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.backdateObjectsForTest(4, 3));
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.waitForTimeout(900);

  const whole = await page.evaluate(() => window.__lifeosKnowledgeBase.graphGrowthForTest());
  expect(whole.topic).toBeNull();

  await page.getByTestId("focus-topic").first().click();
  await page.waitForTimeout(700);

  const focused = await page.evaluate(() => window.__lifeosKnowledgeBase.graphGrowthForTest());
  expect(focused.topic).toBeTruthy();
  expect(focused.total).toBeLessThan(whole.total);
  expect(focused.why).toContain(focused.topic.name);
});

// G6: тема без истории не должна ЗАПИРАТЬ. Блок роста исчезал вместе с кнопкой возврата, и
// выйти из темы было нечем — нашлось прогоном пробы.
test("тема без истории оставляет выход из темы", async ({ page }) => {
  await reset(page);
  await fill(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.waitForTimeout(800);

  await page.getByTestId("focus-topic").first().click();
  await page.waitForTimeout(700);

  await expect(page.getByTestId("graph-growth")).toBeVisible();
  await expect(page.getByTestId("graph-growth-head")).toContainText("не из чего");
  await expect(page.getByTestId("clear-topic-focus")).toBeVisible();
});

// G7: тот же выбор снимается — и кнопкой возврата, и повторным нажатием на теме.
test("фокус темы снимается", async ({ page }) => {
  await reset(page);
  await fill(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.waitForTimeout(800);

  await page.getByTestId("focus-topic").first().click();
  await page.waitForTimeout(600);
  expect((await page.evaluate(() => window.__lifeosKnowledgeBase.graphGrowthForTest())).topic).toBeTruthy();

  await page.getByTestId("clear-topic-focus").click();
  await page.waitForTimeout(600);
  expect((await page.evaluate(() => window.__lifeosKnowledgeBase.graphGrowthForTest())).topic).toBeNull();
});

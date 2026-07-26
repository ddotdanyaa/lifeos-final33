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
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?brain=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Две явные темы: «машина» (четыре записи, разные падежи) и «тренировка» (три записи).
const DUMP = [
  "Марина против кредита на машину",
  "Хочу купить машину до августа",
  "Посчитать свободные деньги за 3 месяца на машину",
  "Оценить продажу старой машины",
  "Тренировка силовая 55 минут",
  "Тренировка бег 6 км",
  "После тренировки закрываю больше задач"
];

async function seedDump(page) {
  for (const line of DUMP) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await expect(page.getByTestId("workspace-graph")).toBeVisible({ timeout: 20000 });
}

// G1: темы графа имеют ИМЕНА и собирают записи об одном, а не проекции одной записи.
// Разные падежи («машину» / «машины») попадают в одну тему — иначе для русского продукта
// кластеризация бесполезна.
test("граф: темы названы по самому связанному объекту и собирают записи об одном", async ({ page }) => {
  await reset(page);
  await seedDump(page);

  const clusters = page.getByTestId("topic-cluster");
  expect(await clusters.count()).toBeGreaterThanOrEqual(2);

  const names = await clusters.locator("header strong").allTextContents();
  // Название темы — настоящий объект владельца, а не «Сообщество 3» и не служебный шаг разбора.
  expect(names.every((name) => !/Сообщество|Community/i.test(name))).toBe(true);
  expect(names.every((name) => !/Разобрать |Вытащить задачи|Сохранить источник|организатора/i.test(name))).toBe(true);

  const clusterTexts = await clusters.allTextContents();
  const carCluster = clusterTexts.find((text) => /машин/i.test(text));
  expect(carCluster).toBeTruthy();
  // В теме про машину должно быть больше одной записи — иначе темы не сложилось.
  expect((carCluster.match(/машин/gi) || []).length).toBeGreaterThan(1);

  const trainCluster = clusterTexts.find((text) => /тренировк/i.test(text));
  expect(trainCluster).toBeTruthy();
});

// G2: отчёт графа — текст о состоянии системы, а не картинка (донор-паттерн GRAPH_REPORT).
test("граф: отдаёт текстовый отчёт из посчитанного", async ({ page }) => {
  await reset(page);
  await seedDump(page);

  await expect(page.getByTestId("graph-report")).toBeVisible();
  await expect(page.getByTestId("graph-report-headline")).not.toBeEmpty();
  const lines = await page.getByTestId("graph-report-line").allTextContents();
  expect(lines.length).toBeGreaterThanOrEqual(2);
  expect(lines.some((line) => /объект/.test(line))).toBe(true);
  expect(lines.some((line) => /Тем[аы]|темы/i.test(line))).toBe(true);
});

// G3: «как связаны A и B» — кратчайший путь с объяснением каждого звена, а не подсветка узлов.
test("граф: путь между двумя объектами объясняет каждое звено", async ({ page }) => {
  await reset(page);
  await seedDump(page);

  // Берём двух участников ОДНОЙ темы — между ними путь обязан существовать.
  const cluster = page.getByTestId("topic-cluster").first();
  const pickers = cluster.getByTestId("pick-path-node");
  expect(await pickers.count()).toBeGreaterThanOrEqual(2);
  await pickers.nth(0).click();
  await page.getByTestId("topic-cluster").first().getByTestId("pick-path-node").nth(1).click();

  await expect(page.getByTestId("graph-path-summary")).toBeVisible();
  const steps = page.getByTestId("graph-path-step");
  expect(await steps.count()).toBeGreaterThanOrEqual(1);
  // У звена есть объяснение, а не только стрелка.
  await expect(steps.first().locator("em")).not.toBeEmpty();

  await page.getByTestId("clear-path-query").click();
  await expect(page.getByTestId("graph-path-hint")).toBeVisible();
});

// G4 (донор Mem0): важное не тонет под свежим шумом — вес считается из свежести, частоты и
// связности, и у каждой строки написано, из чего он сложился.
test("память: вес важности объяснён и не одинаков у всех", async ({ page }) => {
  await reset(page);
  await seedDump(page);

  const rows = page.getByTestId("memory-weight-row");
  expect(await rows.count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId("memory-weight-why").first()).not.toBeEmpty();

  const scores = (await page.getByTestId("memory-weight-score").allTextContents()).map((text) => Number(text.trim()));
  expect(scores.every((score) => score > 0 && score <= 100)).toBe(true);
  // Ранжирование должно что-то значить: если все веса равны, сортировать нечем.
  expect(new Set(scores).size).toBeGreaterThan(1);
});

// G5: мосты отвечают «что рассыплется без этого узла», а не показывают число ради числа.
test("граф: мосты объясняют, что держится на узле", async ({ page }) => {
  await reset(page);
  await seedDump(page);

  const bridges = page.getByTestId("graph-bridge");
  expect(await bridges.count()).toBeGreaterThanOrEqual(1);
  const why = await page.getByTestId("graph-bridge-why").allTextContents();
  expect(why.every((line) => line.trim().length > 10)).toBe(true);
});

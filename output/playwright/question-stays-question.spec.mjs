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
  await page.goto(`${appUrl}?ask=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function capture(page, line) {
  await page.fill('[data-testid="capture-input"]', line);
  await page.click('[data-testid="capture-text"]');
  await page.waitForTimeout(350);
}

// Q1: закон №7 — спросил, получил ответ с цитатами, и НИ ОДНОГО объекта не создалось.
// До этого вопрос уходил в общий разбор и превращался в задачу «Вытащить задачи из ...».
test("вопрос остаётся вопросом: ответ с цитатами, ничего не создано", async ({ page }) => {
  await reset(page);
  await capture(page, "Хочу купить машину до августа");
  await capture(page, "Марина против кредита на машину");

  const before = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      proposals: Object.values(state.proposals).length,
      tasks: Object.values(state.tasks).filter((item) => !item.deleted).length
    };
  });

  await capture(page, "Почему я до сих пор не купил машину?");

  await expect(page.getByTestId("grounded-answer")).toBeVisible();
  await expect(page.getByTestId("grounded-question")).toContainText("не купил машину");
  await expect(page.getByTestId("grounded-nothing-created")).toContainText("Ничего не создано");

  // Ответ опирается на дословные цитаты из своих же записей, а не на пересказ.
  const quotes = await page.getByTestId("grounded-citation-quote").allTextContents();
  expect(quotes.length).toBeGreaterThan(0);
  expect(quotes.some((quote) => quote.includes("машину"))).toBe(true);
  // Markdown-заголовок не выдаётся за слова владельца.
  expect(quotes.some((quote) => quote.trim().startsWith("«#"))).toBe(false);

  const after = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const question = Object.values(state.sources).find((item) => (item.text || "").includes("не купил машину"));
    return {
      proposals: Object.values(state.proposals).length,
      tasks: Object.values(state.tasks).filter((item) => !item.deleted).length,
      fromQuestion: Object.values(state.proposals).filter((item) => item.sourceId === (question && question.id)).length,
      questionSaved: Boolean(question)
    };
  });
  // Ни одного нового предложения и ни одной задачи из вопроса.
  expect(after.fromQuestion).toBe(0);
  expect(after.proposals).toBe(before.proposals);
  expect(after.tasks).toBe(before.tasks);
  // При этом сам вопрос не потерян — он сохранён как запись в потоке.
  expect(after.questionSaved).toBe(true);
});

// Q2: если отвечать не из чего — система прямо говорит это, а не сочиняет ответ (§7).
test("вопрос без данных: честный отказ вместо выдуманного ответа", async ({ page }) => {
  await reset(page);
  await capture(page, "Сколько я потратил на дайвинг в Таиланде?");

  await expect(page.getByTestId("grounded-answer-text")).toContainText("отвечать не из чего");
  await expect(page.getByTestId("grounded-citation")).toHaveCount(0);
  await expect(page.getByTestId("grounded-nothing-created")).toBeVisible();
});

// Q3: цитата ведёт в объект-источник — ответ можно проверить, а не принять на веру.
test("цитата открывает объект-источник", async ({ page }) => {
  await reset(page);
  await capture(page, "Марина против кредита на машину");
  await capture(page, "Почему я до сих пор не купил машину?");

  await page.getByTestId("grounded-citation").first().click();
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("object-verdict")).not.toBeEmpty();
});

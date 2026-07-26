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
  await page.goto(`${appUrl}?digest=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function capture(page, lines) {
  for (const line of lines) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(300);
  }
}

// DD1: вечерний дамп разбирается по стадиям, и у каждой стадии виден настоящий счётчик.
test("разбор дня: стадии с реальными счётчиками, ничего не записано без согласия", async ({ page }) => {
  await reset(page);
  await capture(page, [
    "Марина согласна на август если без кредита",
    "Потратил 4380 продукты Лента",
    "Надо ответить Дмитрию до среды",
    "Завтра в 16 работаю в такси"
  ]);

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  await expect(page.getByTestId("day-digest")).toBeVisible();
  await page.getByTestId("run-day-digest").click();

  const stages = page.getByTestId("digest-stage");
  expect(await stages.count()).toBeGreaterThanOrEqual(6);
  // Счётчик первой стадии — сколько захватов реально прочитано за сегодня.
  await expect(stages.first().getByTestId("digest-stage-value")).toContainText("4");
  // Стадия сверки с графом присутствует всегда: это закон №4 в конвейере, а не украшение.
  await expect(page.locator('[data-testid="digest-stage"][data-stage="graph"]')).toContainText("дубликаты не создаю");
  await expect(page.locator('[data-testid="digest-stage"][data-stage="done"]')).toContainText("Ничего не записано");

  // Разбор ничего не записал сам: задачи и деньги появляются только после согласия.
  const written = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      tasks: Object.values(state.tasks).filter((item) => !item.deleted).length,
      money: Object.values(state.financeTransactions).filter((item) => !item.deleted).length,
      proposals: Object.values(state.proposals).filter((item) => item.status === "open").length
    };
  });
  expect(written.tasks).toBe(0);
  expect(written.money).toBe(0);
  expect(written.proposals).toBeGreaterThan(0);
});

// DD2: закон №6 — то, в чём система не уверена, становится вопросом с вариантами ответа,
// и спрашивает только про жизнь владельца, а не про служебные шаги самого разбора.
test("разбор дня: низкая уверенность становится вопросом, ответ «нет» ничего не создаёт", async ({ page }) => {
  await reset(page);
  await capture(page, ["Завтра в 16 работаю в такси", "Может вообще без машины обойтись"]);

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  await page.getByTestId("run-day-digest").click();

  const asks = page.getByTestId("digest-ask");
  expect(await asks.count()).toBeGreaterThan(0);

  // Вопрос — про жизнь, а не про машинерию разбора.
  const questions = await page.getByTestId("digest-ask-question").allTextContents();
  expect(questions.some((text) => /организатор|контекст в чате|Разобрать |Вытащить задачи/i.test(text))).toBe(false);

  // У вопроса есть основание и уверенность — он не появляется из ниоткуда.
  await expect(asks.first().getByTestId("digest-ask-why")).toContainText("Уверенность");

  const before = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().planBlocks).filter((item) => !item.deleted).length);
  // Второй вариант — «Нет, это просто мысль»: объект не создаётся, запись остаётся в потоке.
  await asks.first().getByTestId("digest-ask-option").nth(1).click();
  const after = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      planBlocks: Object.values(state.planBlocks).filter((item) => !item.deleted).length,
      tasks: Object.values(state.tasks).filter((item) => !item.deleted).length,
      receipt: (state.control.receipts || []).slice(-1)[0]?.summary || ""
    };
  });
  expect(after.planBlocks).toBe(before);
  expect(after.tasks).toBe(0);
  expect(after.receipt).toContain("объект не создавался");
});

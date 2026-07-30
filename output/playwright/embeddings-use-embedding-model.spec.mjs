import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  return readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"))
    .find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

// Замер 2026-07-30 (`tools/measure-semantic-neighbors.mjs`, §2.3): числа для «похожего по смыслу»
// обязаны приходить от модели ДЛЯ ВЕКТОРОВ. Раньше тест эмбеддингов брал `selectedModel` — то есть
// чат-модель `qwen3:4b`. `/api/embeddings` на ней отвечает, вектор возвращается, статус зеленеет —
// и владелец получает «поиск по смыслу», построенный на числах языковой модели, а не обученной на
// близость. Здесь проверяется, что при установленной модели эмбеддингов выбирается ОНА.
//
// Демон замокан намеренно: смысл проверки — В ЧЬЁМ ИМЕНИ уходит запрос, а это не зависит от того,
// поднят ли Ollama. Живой замер на `bge-m3` и `nomic-embed-text` лежит в
// `docs/MEASURE_2026-07-30_SEMANTIC_NEIGHBORS.md`.
test("тест эмбеддингов идёт в модель для векторов, а не в чат-модель", async ({ page }) => {
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    // Порядок нарочно «неудобный»: чат-модель первая. Выбор обязан идти по назначению, а не по
    // тому, что стоит в списке раньше.
    body: JSON.stringify({ models: [{ name: "qwen3:4b" }, { name: "llama3.2:3b" }, { name: "bge-m3" }] })
  }));

  const asked = [];
  await page.route("**/api/embeddings", async (route) => {
    const body = route.request().postDataJSON();
    asked.push(String(body && body.model));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ embedding: Array.from({ length: 8 }, (unused, index) => (index + 1) / 8) })
    });
  });

  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?embeddings-model=${Date.now()}`, { waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest());
  await page.getByTestId("surface-inbox").first().waitFor({ state: "visible", timeout: 20000 });

  // Чат живёт во вторичном меню и по умолчанию скрыт — сначала раскрывается рибон, как и у
  // владельца. Пропустить этот шаг значит ждать клика по невидимой кнопке две минуты.
  const chat = page.getByTestId("surface-chat").first();
  if (!(await chat.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
    await page.waitForTimeout(500);
  }
  await chat.click();
  await page.getByTestId("probe-ollama").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "models_found");

  await page.getByTestId("chat-more-toggle").click();
  await page.getByTestId("test-ollama-embeddings").click();
  await expect(page.getByTestId("ollama-embeddings-status")).toHaveAttribute("data-raw-status", "embeddings_ok");

  expect(asked.length, "запрос за вектором обязан был уйти").toBeGreaterThan(0);
  expect(asked[0], "вектор просят у модели эмбеддингов, а не у чат-модели").toBe("bge-m3");

  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().ollama);
  expect(state.embeddingsModel, "в состоянии остаётся та же модель").toBe("bge-m3");
  expect(state.selectedModel, "чат-модель при этом не подменяется").not.toBe("bge-m3");
});

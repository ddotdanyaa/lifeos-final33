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
if (localChromium) {
  test.use({ launchOptions: { executablePath: localChromium } });
}

test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?semantic-search=${Date.now()}`, { waitUntil: "networkidle" });
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
  await page.getByTestId(`surface-${id}`).first().click();
}

function embeddingForPrompt(prompt) {
  const text = String(prompt || "").toLowerCase();
  if (text.includes("кофе")) return [1, 0, 0];
  if (text.includes("гор")) return [0, 1, 0];
  return [0, 0, 1];
}

// P6.5 SEMANTIC_SEARCH_GATED: a local vector index over notes via Ollama /api/embeddings,
// only attempted after the owner explicitly tests embeddings - honest provider_unavailable
// before that (or if the daemon call fails), real cosine-similarity ranking once connected,
// never a fake or hardcoded similarity score.
test("semantic search: honest unavailable state, real embeddings test, index build, and ranked results", async ({ page }) => {
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: [{ name: "nomic-embed-text" }] })
  }));

  let nextNoteTitle = "";
  page.on("dialog", (dialog) => dialog.accept(dialog.type() === "prompt" ? nextNoteTitle : undefined));
  await reset(page);
  await openSurface(page, "library");

  // 1. Before anything is connected: semantic search is honestly unavailable, not faked.
  await page.getByTestId("semantic-search-input").fill("кофе");
  await page.getByTestId("run-semantic-search").click();
  await expect(page.getByTestId("semantic-search-unavailable")).toBeVisible();
  await expect(page.getByTestId("semantic-search-unavailable")).toContainText("не подключён");

  // 2. Probe Ollama so a model is selected, then embeddings test fails first (honest failure).
  await openSurface(page, "chat");
  await page.route("**/api/embeddings", (route) => route.fulfill({ status: 500, body: "down" }));
  await page.getByTestId("probe-ollama").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "models_found");
  // Срез 7 фикс: расширенные настройки (эмбеддинги/адрес) теперь в свёрнутом по умолчанию
  // блоке «Ещё» (компактный тулбар, чтобы не налезал на тред). Открываем его один раз -
  // состояние управляемое (ctx.chatToolbarMoreOpen), поэтому переживает ре-рендеры теста.
  await page.getByTestId("chat-more-toggle").click();
  await page.getByTestId("test-ollama-embeddings").click();
  await expect(page.getByTestId("ollama-embeddings-status")).toHaveAttribute("data-raw-status", "provider_unavailable");

  // 3. Embeddings daemon comes online: the test now succeeds for real.
  await page.unroute("**/api/embeddings");
  await page.route("**/api/embeddings", async (route) => {
    const body = route.request().postDataJSON();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ embedding: embeddingForPrompt(body.prompt) }) });
  });
  await page.getByTestId("test-ollama-embeddings").click();
  await expect(page.getByTestId("ollama-embeddings-status")).toHaveAttribute("data-raw-status", "embeddings_ok");

  // 4. Create two notes with clearly distinct topics so the mock embeddings diverge.
  const token = String(Date.now());
  await openSurface(page, "library");
  nextNoteTitle = "Кофе заметка " + token;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(nextNoteTitle);
  await page.getByTestId("note-body").fill("Утренний кофе с молоком, любимый рецепт " + token);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  nextNoteTitle = "Горная тропа " + token;
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue(nextNoteTitle);
  await page.getByTestId("note-body").fill("Поход в горы летом, маршрут и снаряжение " + token);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  // 5. Build the real vector index (gated: only allowed once embeddings are connected).
  await openSurface(page, "providers");
  await page.getByTestId("build-semantic-index").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await expect(page.getByTestId("semantic-index-count")).not.toContainText("0 заметок");

  const afterIndex = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterIndex.control.semanticIndex.vectorCount).toBeGreaterThanOrEqual(2);

  // 6. Run a real semantic query: "кофе" should rank the coffee note with high confidence
  // and exclude the unrelated mountain note (cosine similarity below the honest threshold).
  await openSurface(page, "library");
  await page.getByTestId("semantic-search-input").fill("кофе");
  await page.getByTestId("run-semantic-search").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await expect(page.getByTestId("semantic-search-results")).toBeVisible();
  const coffeeRow = page.getByTestId("semantic-result-row").filter({ hasText: "Кофе заметка " + token });
  await expect(coffeeRow).toBeVisible();
  await expect(coffeeRow).toContainText("100%");
  const mountainRow = page.getByTestId("semantic-result-row").filter({ hasText: "Горная тропа " + token });
  await expect(mountainRow).toHaveCount(0);

  const afterSearch = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterSearch.control.semanticSearchReport.status).toBe("embeddings_ok");
  expect(afterSearch.control.semanticSearchReport.results.length).toBeGreaterThan(0);
});

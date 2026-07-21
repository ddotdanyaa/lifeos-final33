import { expect, test } from "@playwright/test";

// C1.4/C1.5/C1.6 gate: clickable source citations on an Ollama answer (donor idea: LibreChat
// citations + our graph-context - only notes that really went into the prompt), a model
// selector inline in the chat toolbar (donor idea: LibreChat model-select), and attaching an
// existing note to an outgoing message (donor idea: LibreChat attachments, kept local - a
// link to an existing artifact, nothing uploaded). No real Ollama daemon in this container,
// so /api/tags and /api/generate are mocked via page.route - same established pattern as
// chat-streaming.spec.mjs/ai-memory-gate.spec.mjs.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?chat-citations=${Date.now()}`, { waitUntil: "networkidle" });
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

async function connectOllama(page, models) {
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: (models || ["llama3.2:1b"]).map((name) => ({ name })) })
  }));
  await page.route("**/api/generate", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ response: "OK" })
  }));
  await openSurface(page, "chat");
  await page.getByTestId("probe-ollama").click();
  await page.getByTestId("test-ollama-generation").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "generation_ok");
  await page.unroute("**/api/generate");
}

test("C1.4 citations: real context notes appear as clickable chips, opening the note", async ({ page }) => {
  await reset(page);

  // A note whose distinctive word will be picked up by chatCitationQuery (words >= 5 chars)
  // and matched by searchNotes, so it genuinely ends up in the Ollama prompt's context.
  await page.locator("#capture-input").fill("Путешествие в Армению: маршрут и бюджет поездки");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();

  await connectOllama(page);
  await page.route("**/api/generate", (route) => route.fulfill({
    status: 200,
    contentType: "application/x-ndjson",
    body: JSON.stringify({ response: "Вот что нашлось.", done: true })
  }));

  await page.getByTestId("chat-input").first().fill("Расскажи про путешествие");
  await page.getByTestId("send-chat").first().click();

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.chatMessages).some((m) => m.role === "assistant" && (m.citations || []).length > 0);
  }).toBe(true);

  const chip = page.getByTestId("chat-citation-chip").first();
  await expect(chip).toBeVisible();
  await expect(chip).toContainText("Путешествие");
  await chip.click();
  await expect.poll(async () => (await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot())).activeSurface).toBe("library");
});

test("C1.5 model selector: switching the dropdown updates the real selected model", async ({ page }) => {
  await reset(page);
  await connectOllama(page, ["llama3.2:1b", "qwen2.5:3b"]);

  const select = page.getByTestId("chat-model-select");
  await expect(select).toBeVisible();
  await expect(select.locator("option")).toHaveCount(2);
  await select.selectOption("qwen2.5:3b");

  await expect.poll(async () =>
    page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().ollama.selectedModel)
  ).toBe("qwen2.5:3b");
});

test("C1.6 attachment: picking a note before sending links it to the owner message", async ({ page }) => {
  await reset(page);
  await page.locator("#capture-input").fill("Список покупок на неделю");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();

  await openSurface(page, "chat");
  const noteId = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.notes).find((n) => /Список покупок/i.test(n.title)).id;
  });
  await page.getByTestId("chat-attachment-select").selectOption(noteId);
  await page.getByTestId("chat-input").first().fill("Что купить на неделе?");
  await page.getByTestId("send-chat").first().click();

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.chatMessages).some((m) => m.role === "owner" && m.attachmentId);
  }).toBe(true);
  const chip = page.getByTestId("chat-attachment-chip").first();
  await expect(chip).toBeVisible();
  await expect(chip).toContainText("Список покупок");
  await chip.click();
  await expect.poll(async () => (await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot())).activeSurface).toBe("library");
});

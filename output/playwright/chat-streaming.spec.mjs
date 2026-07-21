import { expect, test } from "@playwright/test";

// C1.1/C1.2/C1.3 gate: Ollama chat streaming (donor idea: LibreChat - read the response
// incrementally, update the UI as chunks arrive), a Stop button that aborts an in-flight
// generation, and Regenerate for the last answer. No real Ollama daemon is available in
// this container, so /api/tags and /api/generate are mocked via page.route - the SAME
// established pattern already used by ai-memory-gate.spec.mjs/byok-vault-routing.spec.mjs
// for provider testing in this repo. This tests our client-side NDJSON-stream parsing,
// state-update, and UI wiring for real; only the network transport is faked.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?chat-streaming=${Date.now()}`, { waitUntil: "networkidle" });
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

// Gets Ollama into generation_ok with a plain (non-streaming) mocked /api/generate, matching
// how the existing probe/test flow actually works - separate from the streaming chat call.
async function connectOllama(page) {
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: [{ name: "llama3.2:1b" }] })
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

test("C1.1 streaming: chunked NDJSON response is assembled into the final chat message", async ({ page }) => {
  await reset(page);
  await connectOllama(page);

  const ndjson = [
    JSON.stringify({ response: "Локальные ", done: false }),
    JSON.stringify({ response: "данные ", done: false }),
    JSON.stringify({ response: "готовы.", done: false }),
    JSON.stringify({ response: "", done: true })
  ].join("\n");
  await page.route("**/api/generate", (route) => route.fulfill({
    status: 200,
    contentType: "application/x-ndjson",
    body: ndjson
  }));

  await page.getByTestId("chat-input").first().fill("Расскажи что-нибудь");
  await page.getByTestId("send-chat").first().click();

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.chatMessages).some((m) => m.role === "assistant" && /Локальные данные готовы/.test(m.text));
  }).toBe(true);

  // The finished message is no longer marked as streaming.
  const finalState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const assistantMsg = Object.values(finalState.chatMessages).find((m) => m.role === "assistant" && /Локальные данные готовы/.test(m.text));
  expect(assistantMsg.streaming).toBe(false);
});

test("C1.2 stop: aborting an in-flight generation finalizes the message honestly", async ({ page }) => {
  await reset(page);
  await connectOllama(page);

  // Delay the mocked response so there is a real window to click Stop while the fetch is
  // still pending - AbortController.abort() rejects the pending fetch regardless of mocking.
  await page.route("**/api/generate", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: JSON.stringify({ response: "не должно дойти", done: true }) });
  });

  await page.getByTestId("chat-input").first().fill("Долгий вопрос");
  await page.getByTestId("send-chat").first().click();
  await expect(page.getByTestId("chat-typing-cursor")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("stop-chat-stream").click();

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return (state.auditLog || []).some((e) => e.type === "chat.stream.stopped");
  }).toBe(true);
  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const assistantMsg = Object.values(state.chatMessages).find((m) => m.role === "assistant" && m.text);
  expect(assistantMsg.streaming).toBe(false);
  expect(assistantMsg.text).not.toContain("не должно дойти");
});

test("C1.3 regenerate: replaces the last assistant answer via a fresh request", async ({ page }) => {
  // This scenario chains four real persisting commits (probe, first send, regenerate-delete,
  // regenerate-resend) in one session. This container's CompressionStream reliably exhausts
  // its 1800ms budget on every single attempt before falling back (a real, pre-existing
  // environment characteristic of compressText's withTimeout - confirmed by direct tracing,
  // not specific to this feature), so the cumulative tax can exceed the default 5s poll.
  test.setTimeout(60000);
  await reset(page);
  await connectOllama(page);

  await page.route("**/api/generate", (route) => route.fulfill({
    status: 200,
    contentType: "application/x-ndjson",
    body: JSON.stringify({ response: "Первый ответ", done: true })
  }));
  await page.getByTestId("chat-input").first().fill("Вопрос для регенерации");
  await page.getByTestId("send-chat").first().click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.chatMessages).some((m) => m.role === "assistant" && /Первый ответ/.test(m.text));
  }).toBe(true);
  const firstAssistantId = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.chatMessages).find((m) => m.role === "assistant" && /Первый ответ/.test(m.text)).id;
  });

  await page.unroute("**/api/generate");
  await page.route("**/api/generate", (route) => route.fulfill({
    status: 200,
    contentType: "application/x-ndjson",
    body: JSON.stringify({ response: "Второй ответ", done: true })
  }));
  await page.getByTestId("regenerate-chat-answer").click();

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.chatMessages).some((m) => m.role === "assistant" && !m.deleted && /Второй ответ/.test(m.text));
  }, { timeout: 30000 }).toBe(true);
  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(state.chatMessages[firstAssistantId].deleted).toBe(true);
});

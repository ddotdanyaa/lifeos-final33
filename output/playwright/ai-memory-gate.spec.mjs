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

async function openSurface(page, id) {
  const direct = page.getByTestId(`surface-${id}`).first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

// P5.3 AI_MEMORY_GATE: an AI-generated answer (live Ollama chat, mocked here) can only
// become a real note/task/claim/etc through the existing proposal preview+apply flow -
// it is never written directly into notes/claims/insights/graph.
test("AI memory gate: live model answer never mutates memory directly, only via proposal", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: [{ name: "llama3.2:1b" }] })
  }));
  await page.route("**/api/generate", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ response: "This should never become a note by itself." })
  }));

  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "chat");
  await page.getByTestId("probe-ollama").click();
  await page.getByTestId("test-ollama-generation").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "generation_ok");

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const notesBefore = Object.keys(before.notes).length;
  const claimsBefore = Object.keys(before.claims).length;
  const insightsBefore = Object.keys(before.insights).length;
  const tasksBefore = Object.keys(before.tasks).length;
  const openProposalsBefore = Object.values(before.proposals).filter((p) => p.status === "open").length;

  await page.getByTestId("chat-input").first().fill("Придумай что-нибудь важное");
  await page.getByTestId("send-chat").click();
  await expect(page.getByTestId("chat-panel")).toContainText("This should never become a note by itself");

  // the AI answer alone must not have touched notes/claims/insights/tasks
  const afterAnswer = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.keys(afterAnswer.notes).length).toBe(notesBefore);
  expect(Object.keys(afterAnswer.claims).length).toBe(claimsBefore);
  expect(Object.keys(afterAnswer.insights).length).toBe(insightsBefore);
  expect(Object.keys(afterAnswer.tasks).length).toBe(tasksBefore);

  // The assistant's own reply must never itself become a task/note - it has no proposal
  // affordance at all (chatProposalPreview never renders one for role === "assistant").
  const assistantMessage = Object.values(afterAnswer.chatMessages).find((m) => m.role === "assistant" && m.text.includes("This should never become a note"));
  expect(assistantMessage).toBeTruthy();

  // U4 CHAT_ACTIONS (built after this test) wires createChatMessageProposal to run on every
  // OWNER message automatically, always finding at least the "knowledge" fallback draft - so
  // the owner's own trigger message ("Придумай что-нибудь важное") already has a real, open
  // proposal by now, previewed inline (chat-proposal-preview/chat-proposal-apply), not the
  // older chat-to-proposal fallback button (which only renders when no proposal exists at
  // all, and per this fallback logic no longer does for any owner message). This is still
  // the same P5.3 claim - it exists only as an open proposal, nothing was auto-applied.
  const ownerProposal = Object.values(afterAnswer.proposals).find((p) => p.status === "open" && p.fields?.source === "local-chat");
  expect(ownerProposal).toBeTruthy();
  expect(ownerProposal.fields.mutationMode).toBe("proposal-only");
  expect(Object.keys(afterAnswer.tasks).length).toBe(tasksBefore);
  expect(Object.keys(afterAnswer.notes).length).toBe(notesBefore);

  // Applying it explicitly is the only path to a real object - and it applies the owner's
  // own proposal (a "knowledge" draft becomes an insight, same as chat-actions.spec.mjs's own
  // "Заметка" case), never anything derived from the assistant's reply text.
  const insightsBeforeApply = Object.keys(afterAnswer.insights || {}).length;
  const ownerMessage = page.locator("[data-message-id]", { hasText: "Придумай что-нибудь важное" }).last();
  await ownerMessage.getByTestId("chat-proposal-apply").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return state.proposals[ownerProposal.id]?.status;
  }).toBe("applied");
  const afterApply = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.keys(afterApply.tasks).length).toBe(tasksBefore);
  expect(Object.keys(afterApply.insights || {}).length).toBeGreaterThan(insightsBeforeApply);
});

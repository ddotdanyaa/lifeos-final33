import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.LIFEOS_URL || "http://127.0.0.1:4173/";
const outDir = path.resolve("output/playwright");
fs.mkdirSync(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function includesAny(text, fragments) {
  const value = String(text || "").toLocaleLowerCase();
  return fragments.some((fragment) => value.includes(fragment.toLocaleLowerCase()));
}

async function openBrowser(viewport) {
  const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chrome) ? chrome : undefined
  });
  const context = await browser.newContext({
    viewport,
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  return { browser, page };
}

async function setSurface(page, surface) {
  const button = page.locator(`[data-testid="surface-${surface}"]:visible`).first();
  if (await button.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false)) {
    await button.click();
  } else {
    await page.evaluate((nextSurface) => window.__lifeosKnowledgeBase.setSurfaceForTest(nextSurface), surface);
  }
  await page.waitForFunction((nextSurface) => window.__lifeosKnowledgeBase.getStateSnapshot().activeSurface === nextSurface, surface, { timeout: 8000 }).catch(async () => {
    await page.evaluate((nextSurface) => window.__lifeosKnowledgeBase.setSurfaceForTest(nextSurface), surface);
    await page.waitForFunction((nextSurface) => window.__lifeosKnowledgeBase.getStateSnapshot().activeSurface === nextSurface, surface, { timeout: 8000 });
  });
  await page.waitForTimeout(350);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const kb = window.__lifeosKnowledgeBase;
    const state = kb.getStateSnapshot();
    const graph = kb.mapGraph(state);
    return {
      activeSurface: state.activeSurface,
      chatMessages: Object.values(state.chatMessages || {}),
      visibleChatMessages: (state.chatMessages ? Object.values(state.chatMessages) : []).filter((message) => !message.deleted),
      auditLog: state.auditLog || [],
      feedEvents: graph ? [] : [],
      graph,
      searchQuery: state.searchQuery || "",
      control: state.control || {},
      ollama: state.ollama || {},
      providerRuns: Object.values(state.providerRuns || {})
    };
  });
}

async function runMainFlow(page, label) {
  await page.goto(`${baseUrl}?browser_chat_proof=${Date.now()}_${label}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForFunction(() => Boolean(window.__lifeosKnowledgeBase), { timeout: 45000 });
  await page.evaluate(async () => {
    if (!navigator.serviceWorker) return;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  });
  await setSurface(page, "chat");
  await page.waitForSelector('[data-testid="chat-input"]', { timeout: 15000 });

  const bodyBefore = await page.locator("body").innerText();
  assert(!includesAny(bodyBefore, ["Артефакт связан с Библиотекой", "Сообщение привязано к активному артефакту", "Я понял:"]), "legacy chat text is visible before input");

  const modelStatus = await page.locator('[data-testid="local-model-status"]').first().innerText();
  const generationStatus = await page.locator('[data-testid="local-model-status"]').first().getAttribute("data-generation-status");
  const rawOllama = await page.locator('[data-testid="local-model-status"]').first().getAttribute("data-raw-status");
  if (rawOllama === "models_found" && generationStatus !== "generation_ok") {
    assert(!modelStatus.includes("доступна"), "models_found is shown as connected model");
  }

  const unique = `lifeos-chain-${Date.now()}-${label}`;
  const input = page.locator('[data-testid="chat-input"]');
  await input.fill(`${unique} первая строка`);
  await input.press("Shift+Enter");
  await input.type("вторая строка");
  const withNewline = await input.inputValue();
  assert(withNewline.includes("\n"), "Shift+Enter did not keep newline in the composer");
  await input.press("Enter");
  await page.waitForTimeout(900);
  assert((await input.inputValue()) === "", "Enter did not clear the composer");

  await input.fill(`ты оллама? ${unique}`);
  await input.press("Enter");
  await page.waitForTimeout(900);

  const bodyAfter = await page.locator("body").innerText();
  assert(bodyAfter.includes(unique), "chat text is not visible after send");
  assert(!includesAny(bodyAfter, ["Артефакт связан с Библиотекой", "Сообщение привязано к активному артефакту", "Я понял:"]), "legacy chat text is visible after input");
  assert(bodyAfter.includes("Ollama provider: status="), "Ollama answer does not include raw provider status");

  const state = await snapshot(page);
  const ownerMessage = state.visibleChatMessages.find((message) => message.role === "owner" && String(message.text || "").includes(unique));
  const assistantMessage = state.visibleChatMessages.find((message) => message.role === "assistant" && String(message.text || "").includes("Ollama provider: status="));
  assert(ownerMessage, "owner input did not become a chat artifact");
  assert(assistantMessage, "assistant answer was not recorded as a chat artifact");
  assert(ownerMessage.receiptId, "owner chat artifact has no receipt id");
  assert(state.auditLog.some((event) => String(event.type || "").includes("chat.input.artifact")), "chat input event is missing");

  const graphNodeIds = new Set((state.graph.nodes || []).map((node) => node.id));
  assert(graphNodeIds.has(ownerMessage.id), "chat artifact is absent from graph");
  assert((state.graph.links || []).some((link) => link.source === ownerMessage.id || link.target === ownerMessage.id), "chat artifact has no graph link");
  assert((state.control.receipts || []).some((receipt) => receipt.objectId === ownerMessage.id), "Data Control receipt is missing");

  await page.locator('[data-testid="global-search"]').fill(unique);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(350);
  const searched = await page.evaluate(() => {
    const kb = window.__lifeosKnowledgeBase;
    const state = kb.getStateSnapshot();
    return {
      searchQuery: state.searchQuery,
      graphSearch: state.graphView.searchQuery,
      selectedNodeId: state.graphView.selectedNodeId
    };
  });
  assert(searched.searchQuery.includes(unique), "global search did not retain the chat query");

  await setSurface(page, "feed");
  const feedText = await page.locator("body").innerText();
  assert(feedText.includes(unique), "feed does not show the chat event");

  await setSurface(page, "graph");
  await page.locator('[data-testid="graph-search"]').fill(unique);
  await page.waitForTimeout(350);
  const graphText = await page.locator("body").innerText();
  assert(graphText.includes(unique) || graphText.includes("chat"), "graph view does not expose the chat artifact");

  await setSurface(page, "control");
  const controlText = await page.locator("body").innerText();
  assert(controlText.includes("Receipts"), "Data Control does not show receipts");
  assert(controlText.includes(unique) || controlText.includes(ownerMessage.receiptId), "Data Control does not show the chat receipt");

  await page.screenshot({ path: path.join(outDir, `browser-chat-proof-${label}.png`), fullPage: true });

  return {
    unique,
    ownerMessageId: ownerMessage.id,
    assistantMessageId: assistantMessage.id,
    receiptId: ownerMessage.receiptId,
    chatCount: state.visibleChatMessages.length,
    auditCount: state.auditLog.length,
    graphNodes: state.graph.nodes.length,
    graphLinks: state.graph.links.length,
    receipts: (state.control.receipts || []).length,
    ollama: state.ollama
  };
}

const results = [];
for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }]
]) {
  const { browser, page } = await openBrowser(viewport);
  try {
    results.push({ label, result: await runMainFlow(page, label) });
  } finally {
    await browser.close();
  }
}

console.log(JSON.stringify({ baseUrl, results }, null, 2));

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
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });

// Реальная генерация qwen3 (reasoning-модель, эмитит <think>-токены) для инсайта на 900 токенов
// измеренно ~140с на этом железе; плюс отдельная реальная генерация в test-ollama-generation и
// сетап. 180с не хватало (тест упирался в таймаут на честном пути). Ставим реалистичную границу -
// это не ослабление проверок (ассерты те же), а честный бюджет под медленную локальную модель.
test.setTimeout(420000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?chat-brain=${Date.now()}`, { waitUntil: "networkidle" });
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
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    const toggles = page.locator('[data-testid="app-ribbon"] .nav-cluster-drafts-toggle');
    const count = await toggles.count();
    for (let index = 0; index < count; index += 1) {
      await toggles.nth(index).click().catch(() => {});
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

async function sendChat(page, text) {
  await page.getByTestId("chat-input").first().fill(text);
  await page.getByTestId("send-chat").click();
}

const hasCyrillic = (text) => /[а-яё]/i.test(text || "");

// V1 CHAT_BRAIN: reproduces the owner's own bad screenshot (2026-07-20) - a Russian question
// about graph insights that used to get an English "I don't have access" answer with garbage
// task-title "sources" and a spurious "save as note" proposal on the question itself. All three
// symptoms are asserted fixed here, against a real Ollama daemon (mocked in ollama-live-chat.spec.mjs
// already covers the mocked-daemon path; this proves the real prompt/context wiring end to end).
test("V1 CHAT_BRAIN: RU graph-insight question gets a real RU answer with real graph numbers, no garbage citations, no note-proposal", async ({ page }) => {
  // probe-ollama показывает window.confirm перед обращением к демону; без обработчика Playwright
  // авто-отклоняет диалог -> статус остаётся "unchecked". Принимаем все диалоги теста.
  page.on("dialog", (dialog) => dialog.accept());
  await reset(page);

  // Seed some real graph structure: a task whose words are all distinct from the questions
  // below, so a citation would only be honest if the classifier actually matched them.
  await page.getByTestId("capture-input").fill("Задача: забрать документы из мфц");
  await page.getByTestId("capture-text").click();
  await page.waitForTimeout(500);

  await openSurface(page, "chat");
  await page.getByTestId("probe-ollama").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "models_found", { timeout: 20000 });
  await page.getByTestId("test-ollama-generation").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "generation_ok", { timeout: 120000 });

  const beforeState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const assistantCountBefore = Object.values(beforeState.chatMessages || {}).filter((m) => m.role === "assistant").length;

  const question = "Ты умеешь давать инсайты по всем связям в графе? Какого уровня ты модель, сравни себя с чатом GPT, на каком уровне, версия 3 или 4?";
  await sendChat(page, question);
  await page.waitForFunction((countBefore) => {
    const snap = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(snap.chatMessages || {}).filter((m) => m.role === "assistant").length > countBefore;
  }, assistantCountBefore, { timeout: 30000 });

  const afterState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const ownerMessage = Object.values(afterState.chatMessages).find((m) => m.role === "owner" && m.text === question);
  expect(ownerMessage, "owner question message must exist").toBeTruthy();
  // The model-identity branch must answer directly from state.ollama, never inventing a
  // version number - and must not create a "save as note" proposal on the question.
  expect(ownerMessage.proposalId, "a question must not get a save-as-note proposal").toBeFalsy();
  const modelReply = Object.values(afterState.chatMessages).filter((m) => m.role === "assistant").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  expect(modelReply.text).toContain(afterState.ollama.selectedModel);
  expect(hasCyrillic(modelReply.text)).toBe(true);

  // Now a pure insight question (no model-identity words) - must go through the real LLM
  // call with real graph facts in the prompt and answer in Russian.
  const assistantCountBefore2 = Object.values(afterState.chatMessages || {}).filter((m) => m.role === "assistant").length;
  const insightQuestion = "Проанализируй связи и дай инсайты по графу";
  await sendChat(page, insightQuestion);
  await page.waitForFunction((countBefore) => {
    const snap = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(snap.chatMessages || {}).filter((m) => m.role === "assistant").length > countBefore;
  }, assistantCountBefore2, { timeout: 240000 });

  const finalState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const insightOwnerMessage = Object.values(finalState.chatMessages).find((m) => m.role === "owner" && m.text === insightQuestion);
  expect(insightOwnerMessage.proposalId, "an insight question must not get a save-as-note proposal either").toBeFalsy();
  const insightReply = Object.values(finalState.chatMessages).filter((m) => m.role === "assistant").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  expect(hasCyrillic(insightReply.text)).toBe(true);
  // Honest citations: no note titled around "мфц"/"документы" is topically related to a
  // question about graph structure, so it must not be cited as a "source" for this answer.
  expect(insightReply.text).not.toContain("мфц");
});

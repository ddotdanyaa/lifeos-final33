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

// 660 секунд, а не 240: замер 2026-07-30 на этой машине — проверка генерации до 120 секунд плюс
// настоящий ответ модели (короткий вопрос 77 с, длинный 400 с) и сетап. Прежнего окна не хватало
// на честное ожидание ГОТОВОГО ответа, а не появления пустого пузыря.
test.setTimeout(660000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?ollama-real-daemon=${Date.now()}`, { waitUntil: "networkidle" });
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
    // Раскрытие «Ещё» живёт в состоянии, а не в браузерном <details>: после клика идёт коммит и
    // перерисовка. Без ожидания следующий шаг работает по старому DOM.
    await page.waitForTimeout(350);
    if (!(await page.locator('[data-testid="app-ribbon"] .nav-cluster').first().isVisible().catch(() => false))) {
      await page.locator('[data-testid="app-ribbon"] summary').first().click().catch(() => {});
      await page.waitForTimeout(350);
    }
  }
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    // Перебираем группы ПОИМЁННО. Раскрыта всегда одна, поэтому «первый тумблер в DOM» после
    // каждого клика возвращается к началу — цикл по `.first()` ходил бы между двумя группами
    // бесконечно. И ждём перерисовку: раскрытие идёт через состояние, а не через CSS.
    for (const cluster of ["capture", "doing", "ai", "workshop"]) {
      const toggle = page.getByTestId(`nav-cluster-drafts-${cluster}`);
      if (!(await toggle.count())) continue;
      await toggle.click().catch(() => {});
      await page.waitForTimeout(350);
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

async function isDaemonReachable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch("http://127.0.0.1:11434/api/tags", { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

// П-A LIVE_CHAT_REAL_DAEMON: proves the P5.1 live-chat path against a genuinely running,
// unmocked local Ollama daemon - no page.route. Skips honestly (not a failure) on a machine
// with no daemon reachable, so this suite doesn't gate CI environments that lack Ollama,
// but a real green run on this machine is the actual proof this package requires.
test("ollama real daemon: probe, live generation, chat answer, receipts - no mocks", async ({ page }) => {
  const reachable = await isDaemonReachable();
  test.skip(!reachable, "No local Ollama daemon reachable at 127.0.0.1:11434 - install/start Ollama to run this test for real (see docs/OPERATING_MODES.md).");

  page.on("dialog", (dialog) => dialog.accept());
  await reset(page);
  await openSurface(page, "chat");

  // 1. Real probe against the real daemon: the model list must contain the model this
  // package installed (qwen3:4b), proving this isn't a stale/empty daemon.
  await page.getByTestId("probe-ollama").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "models_found", { timeout: 15000 });
  const afterProbe = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterProbe.ollama.models).toContain("qwen3:4b");

  // 2. Real generation test: a genuine round trip to /api/generate, not a canned reply.
  await page.getByTestId("test-ollama-generation").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "generation_ok", { timeout: 120000 });
  const afterTest = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterTest.ollama.lastGenerationSample.length).toBeGreaterThan(0);
  expect(afterTest.ollama.lastGenerationSample).not.toContain("<think>");

  // 3. A real question about the owner's own data, answered by the real local model - not
  // buildLocalChatAnswer's rule-based fallback. "LifeOS" already appears in the chat panel's
  // empty-state placeholder before anything is sent, so toContainText("LifeOS") would resolve
  // immediately and race ahead of the real (slow, CPU-bound) generation - wait for the assistant
  // message COUNT to increase instead, which can only become true once a real reply commits.
  // ИСПРАВЛЕНО 2026-07-30: ждать РОСТ ЧИСЛА сообщений ассистента было недостаточно. Стрим
  // создаёт пустой пузырь-заглушку сразу при отправке (streaming: true), поэтому счётчик
  // увеличивался мгновенно, и спека читала состояние ДО ответа модели. Проверка «должен быть
  // настоящий chat-run» падала не потому, что продукт сломан, а потому что её спросили слишком
  // рано. Ждём готовый ответ: не streaming и с непустым текстом.
  const finishedAssistantCount = (snapshot) => Object.values(snapshot.chatMessages || {})
    .filter((message) => message.role === "assistant" && !message.deleted && !message.streaming && String(message.text || "").trim())
    .length;
  const beforeChat = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const receiptsBefore = beforeChat.control.receipts.length;
  const assistantCountBefore = finishedAssistantCount(beforeChat);
  await page.getByTestId("chat-input").first().fill("Кратко: что ты видишь в моих данных LifeOS прямо сейчас?");
  await page.getByTestId("send-chat").click();
  // Замер на этой машине: короткий ответ `qwen3:4b` с подсказкой `/no_think` — 77 секунд,
  // без подсказки — 268. Окно берём с запасом, но конечное: висеть вечно спека не должна.
  await page.waitForFunction(
    (countBefore) => {
      const snapshot = window.__lifeosKnowledgeBase.getStateSnapshot();
      const finished = Object.values(snapshot.chatMessages || {})
        .filter((message) => message.role === "assistant" && !message.deleted && !message.streaming && String(message.text || "").trim());
      return finished.length > countBefore;
    },
    assistantCountBefore,
    { timeout: 420000 }
  );

  const afterChat = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const chatRun = Object.values(afterChat.providerRuns).find((run) => run.providerId === "ollama" && run.kind === "chat" && run.status === "generation_ok");
  expect(chatRun, "a real generation_ok chat providerRun must exist").toBeTruthy();
  expect(chatRun.details.model).toBeTruthy();
  expect(chatRun.details.citationIds).toBeDefined();

  const lastMessage = Object.values(afterChat.chatMessages).filter((message) => message.role === "assistant").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  expect(lastMessage).toBeTruthy();
  expect(lastMessage.text || lastMessage.content).not.toContain("<think>");
  expect((lastMessage.text || lastMessage.content).length).toBeGreaterThan(0);

  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterFlush = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const modelCallReceipt = afterFlush.control.receipts.find((receipt) => receipt.kind === "model-call" && receipt.locality === "local");
  expect(modelCallReceipt).toBeTruthy();
  expect(afterFlush.control.receipts.length).toBeGreaterThan(receiptsBefore);
});

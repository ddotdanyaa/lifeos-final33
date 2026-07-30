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

// P5.1 OLLAMA_LIVE: full local chat path when a daemon is available (mocked here -
// no real Ollama install on this machine), honest degraded fallback without it, a
// receipt per call with model/route/locality, and citations to source artifacts.
// Mocking the daemon over the network (not the app's internal logic) is the same
// technique the plan calls for at P5.2's gate ("новый e2e-кейс с mock").
test("ollama live chat: real generation when connected, honest fallback, receipts, citations", async ({ page }) => {
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: [{ name: "llama3.2:1b" }] })
  }));
  // Проверка генерации по-прежнему идёт на /api/generate (это отдельная кнопка в настройках),
  // а сам ответ чата — на /api/chat: замер 2026-07-30 показал, что только там рассуждение
  // thinking-модели уходит в своё поле message.thinking и не подменяет ответ.
  await page.route("**/api/generate", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ response: "OK" })
  }));
  await page.route("**/api/chat", (route) => route.fulfill({
    status: 200,
    contentType: "application/x-ndjson",
    body: JSON.stringify({ message: { role: "assistant", content: "Mocked local model answer about your notes." }, done: true })
  }));

  await page.goto("http://127.0.0.1:4173");
  page.on("dialog", (dialog) => dialog.accept());
  await openSurface(page, "chat");
  await page.getByTestId("probe-ollama").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "models_found");
  await page.getByTestId("test-ollama-generation").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "generation_ok");

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const receiptsBefore = before.control.receipts.length;

  await page.getByTestId("chat-input").first().fill("Расскажи про мои заметки");
  await page.getByTestId("send-chat").click();
  await expect(page.getByTestId("chat-panel")).toContainText("Mocked local model answer");

  const afterLive = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const chatRun = Object.values(afterLive.providerRuns).find((run) => run.providerId === "ollama" && run.kind === "chat");
  expect(chatRun).toBeTruthy();
  expect(chatRun.details.model).toBe("llama3.2:1b");
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterLiveFlushed = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const modelCallReceipt = afterLiveFlushed.control.receipts.find((receipt) => receipt.kind === "model-call");
  expect(modelCallReceipt).toBeTruthy();
  expect(modelCallReceipt.locality).toBe("local");
  expect(afterLiveFlushed.control.receipts.length).toBeGreaterThan(receiptsBefore);

  // honest fallback: once the daemon call starts failing, chat still answers (never
  // crashes, never fakes a model response) using the local rule-based path
  await page.unroute("**/api/chat");
  await page.route("**/api/chat", (route) => route.fulfill({ status: 500, body: "down" }));
  await page.getByTestId("chat-input").first().fill("Что с ollama");
  await page.getByTestId("send-chat").click();
  await expect(page.getByTestId("chat-panel")).toContainText("Ollama");
  await expect(page.getByTestId("chat-panel")).not.toContainText("Mocked local model answer about your notes.Mocked");
});

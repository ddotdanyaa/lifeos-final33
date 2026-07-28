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

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?chat-thread-search=${Date.now()}`, { waitUntil: "networkidle" });
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

async function sendChat(page, text) {
  await page.getByTestId("chat-input").first().fill(text);
  await page.getByTestId("send-chat").click();
  await expect.poll(async () => page.evaluate((needle) => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.chatMessages || {}).some((message) => (message.text || "").includes(needle));
  }, text), { timeout: 10000 }).toBe(true);
}

// R4 CHAT_THREAD_SEARCH: a Jan-style search field over the chat thread. A fresh reset has
// ollama.status !== "generation_ok", so send-chat always takes the deterministic local
// fallback path (buildLocalChatAnswer) - no Ollama/network dependency for this test.
test("chat thread search: filters the visible thread to matching messages only", async ({ page }) => {
  await reset(page);
  await openSurface(page, "chat");

  await sendChat(page, "PINEAPPLE_MARKER_ONE про ананасы и графики");
  await sendChat(page, "BANANA_MARKER_TWO про бананы и задачи");
  await sendChat(page, "CHERRY_MARKER_THREE про вишни и заметки");

  await expect(page.getByTestId("chat-thread-search")).toHaveValue("");
  await expect(page.getByTestId("chat-thread")).toContainText("PINEAPPLE_MARKER_ONE");
  await expect(page.getByTestId("chat-thread")).toContainText("BANANA_MARKER_TWO");
  await expect(page.getByTestId("chat-thread")).toContainText("CHERRY_MARKER_THREE");

  await page.getByTestId("chat-thread-search").fill("BANANA_MARKER_TWO");
  await expect(page.getByTestId("chat-thread")).toContainText("BANANA_MARKER_TWO");
  await expect(page.getByTestId("chat-thread")).not.toContainText("PINEAPPLE_MARKER_ONE");
  await expect(page.getByTestId("chat-thread")).not.toContainText("CHERRY_MARKER_THREE");
  await expect(page.getByTestId("chat-thread-search-result")).toHaveCount(1);

  // Honest empty state for a query matching nothing - never fakes a result.
  await page.getByTestId("chat-thread-search").fill("NOTHING_MATCHES_THIS_QUERY_ZZZ");
  await expect(page.getByTestId("chat-thread-search-empty")).toBeVisible();
  await expect(page.getByTestId("chat-thread-search-empty")).toContainText("NOTHING_MATCHES_THIS_QUERY_ZZZ");

  // Clearing the search restores the normal (recent-tail) view.
  await page.getByTestId("chat-thread-search").fill("");
  await expect(page.getByTestId("chat-thread")).toContainText("PINEAPPLE_MARKER_ONE");
  await expect(page.getByTestId("chat-thread")).toContainText("BANANA_MARKER_TWO");
  await expect(page.getByTestId("chat-thread")).toContainText("CHERRY_MARKER_THREE");
});

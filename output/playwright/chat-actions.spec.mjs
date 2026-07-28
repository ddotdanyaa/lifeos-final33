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

// This repo's installed playwright-core expects a chromium_headless_shell revision that
// isn't actually downloaded in this environment - every spec here needs this override.
test.use({ launchOptions: { executablePath: findLocalChromium() } });

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?chat-actions=${Date.now()}`, { waitUntil: "networkidle" });
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

async function sendChatMessage(page, text) {
  await page.locator("#chat-input").fill(text);
  await page.getByTestId("send-chat").click();
}

test("U4 CHAT_ACTIONS: 4 chat message types get a real proposal preview, apply into a real object + receipt", async ({ page }) => {
  await reset(page);
  await openSurface(page, "chat");

  // 1) Трата - "потратил 500 обед" must preview as a Расход proposal, not a generic task.
  await sendChatMessage(page, "потратил 500 обед");
  const expenseMessage = page.locator('[data-message-id]', { hasText: "потратил 500 обед" }).last();
  const expensePreview = expenseMessage.getByTestId("chat-proposal-preview");
  await expect(expensePreview).toBeVisible();
  await expect(expensePreview).toHaveAttribute("data-raw-type", "finance_expense");
  const auditBeforeExpense = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().auditLog.length);
  await expensePreview.getByTestId("chat-proposal-apply").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.financeTransactions || {}).some((tx) => tx.amount === 500 && tx.kind === "expense");
  }).toBe(true);
  await expect(expenseMessage.getByTestId("chat-proposal-preview")).toHaveAttribute("data-raw-status", "applied");
  await expect.poll(async () => page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().auditLog.length)).toBeGreaterThan(auditBeforeExpense);

  // 2) Задача - "нужно купить корм для кота" (no amount, so isExpense stays false) must
  // preview as an actual Задача proposal.
  await sendChatMessage(page, "нужно купить корм для кота");
  const taskMessage = page.locator('[data-message-id]', { hasText: "нужно купить корм для кота" }).last();
  const taskPreview = taskMessage.getByTestId("chat-proposal-preview");
  await expect(taskPreview).toHaveAttribute("data-raw-type", "task");
  await taskPreview.getByTestId("chat-proposal-apply").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks || {}).some((task) => /корм/i.test(task.title));
  }).toBe(true);

  // 3) Напоминание - "напомни позвонить маме завтра" - reminder wins over the task/calendar
  // signals also present in this phrase (priority order in createChatMessageProposal).
  await sendChatMessage(page, "напомни позвонить маме завтра");
  const reminderMessage = page.locator('[data-message-id]', { hasText: "напомни позвонить маме завтра" }).last();
  const reminderPreview = reminderMessage.getByTestId("chat-proposal-preview");
  await expect(reminderPreview).toHaveAttribute("data-raw-type", "reminder");
  await reminderPreview.getByTestId("chat-proposal-apply").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.reminders || {}).some((reminder) => /маме/i.test(reminder.title));
  }).toBe(true);

  // 4) Заметка - plain text with no task/money/reminder signal falls back to the always-
  // present "knowledge" draft, so even a pure thought gets a real, appliable proposal.
  await sendChatMessage(page, "Интересная мысль про архитектуру подключений");
  const noteMessage = page.locator('[data-message-id]', { hasText: "Интересная мысль про архитектуру" }).last();
  const notePreview = noteMessage.getByTestId("chat-proposal-preview");
  await expect(notePreview).toHaveAttribute("data-raw-type", "knowledge");
  const insightsBefore = await page.evaluate(() => Object.keys(window.__lifeosKnowledgeBase.getStateSnapshot().insights || {}).length);
  await notePreview.getByTestId("chat-proposal-apply").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.keys(state.insights || {}).length;
  }).toBeGreaterThan(insightsBefore);
});

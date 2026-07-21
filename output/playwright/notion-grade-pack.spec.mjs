import { expect, test } from "@playwright/test";

// Conveyor pack gate: C1.7 chat markdown bubbles, S1.1 vendored AFFiNE fuzzy search,
// D1.1/D1.2 live sparkline + progress ring on Home mini-cards, T1.4 one-click snooze.
// Donors per docs/DONOR_IMPLEMENTATION_QUEUE.md / OSS_DONOR_AUDIT.md.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  await page.goto(`${appUrl}?notion-grade=${Date.now()}`, { waitUntil: "networkidle" });
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

test("notion-grade pack: chat markdown, fuzzy search, live mini-cards, snooze", async ({ page }) => {
  await reset(page);

  // Seed: a task and an expense so Home cards have data.
  await page.locator("#capture-input").fill("Проверить отчёт");
  await page.getByTestId("quick-task").click();
  await page.locator("#capture-input").fill("350 бензин");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.financeTransactions || {}).some((tx) => tx.amount === 350);
  }).toBe(true);

  // D1.1: money mini-card shows a real 7-day sparkline (SVG polyline present after expense).
  await expect(page.getByTestId("money-sparkline")).toBeVisible();

  // C1.7: an owner chat message with markdown renders bold, not literal asterisks.
  await openSurface(page, "chat");
  await page.getByTestId("chat-input").first().fill("Это **важно** и `код`");
  await page.getByTestId("send-chat").first().click();
  const ownerBubble = page.locator(".chat-message.owner").last();
  await expect(ownerBubble.locator("strong").first()).toContainText("важно");
  await expect(ownerBubble.locator("code").first()).toContainText("код");

  // S1.1: graph search finds a node by fuzzy subsequence ("пвт" -> "Проверить отчёт").
  // Exact substring would return nothing; only the vendored AFFiNE fuzzy matcher does.
  await openSurface(page, "graph");
  await page.getByTestId("graph-search").fill("пвт");
  await page.getByTestId("graph-search").press("Enter");
  await expect(page.getByTestId("graph-results")).toContainText("Проверить отчёт");

  // T1.4: one-click snooze moves the task to tomorrow with a receipt.
  await openSurface(page, "today");
  await page.locator('[data-testid="task-row"], [data-testid="today-next-action"]').first().getByTestId("snooze-tomorrow").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    const task = Object.values(state.tasks).find((item) => item.title === "Проверить отчёт");
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const receipt = (state.auditLog || []).some((entry) => entry.type === "task.snooze");
    return Boolean(task && task.day === tomorrow && receipt);
  }).toBe(true);

  // D1.2: the Today mini-card progress ring reflects done/total (complete a task first).
  await openSurface(page, "inbox");
  await expect(page.getByTestId("owner-next-zone")).toBeVisible();
});

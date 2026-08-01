import { expect, test } from "@playwright/test";

// U6 EVENING_SUMMARY gate: day with tasks (some done, some not) + an expense -> the evening
// summary on Home honestly shows the facts, and "Перенести на завтра" moves the undone tasks
// by an explicit owner click with an audit receipt (plan v1.2 §3 U6; donor pattern:
// super-productivity daily-summary / plan-tasks-tomorrow, MIT - docs/OSS_DONOR_AUDIT.md).

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?evening-summary=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function quickTask(page, title) {
  await page.locator("#capture-input").fill(title);
  // Срез Г: кнопка переехала в «Ещё» вместе с требованием Т1 — раскрываем блок.
  await page.locator('[data-testid="capture-more"]').evaluate((el) => { el.open = true; });
  await page.getByTestId("quick-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((task) => task.title === title);
  }).toBe(true);
}

test("U6 EVENING_SUMMARY: honest day facts, explicit carry-over to tomorrow with receipt", async ({ page }) => {
  await reset(page);
  await expect(page.getByTestId("command-center")).toBeVisible();

  // Seed the day from the real capture paths: two tasks for today, one completed, plus an
  // expense via the U2 bare-text parser.
  await quickTask(page, "Проверить отчёт");
  await quickTask(page, "Написать письмо");
  await page
    .locator('[data-testid="home-task-row"]', { hasText: "Проверить отчёт" })
    .getByTestId("task-toggle")
    .click();
  await page.locator("#capture-input").fill("350 бензин");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.financeTransactions || {}).some((tx) => tx.amount === 350 && tx.kind === "expense");
  }).toBe(true);

  // The evening summary widget shows the honest facts of the day.
  const reflection = page.getByTestId("evening-reflection");
  await reflection.scrollIntoViewIfNeeded();
  await expect(reflection).toBeVisible();
  await expect(page.getByTestId("evening-summary")).toContainText("выполнено задач: 1");
  await expect(page.getByTestId("evening-summary")).toContainText("350");
  await expect(page.getByTestId("evening-remaining")).toContainText("Написать письмо");

  // Explicit owner action: carry the undone task over to tomorrow.
  await page.getByTestId("carry-over-tomorrow").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    const moved = Object.values(state.tasks).find((task) => task.title === "Написать письмо");
    const done = Object.values(state.tasks).find((task) => task.title === "Проверить отчёт");
    const receipt = (state.auditLog || []).some((entry) => entry.type === "task.carryover");
    const tomorrowKey = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    return Boolean(moved && moved.day === tomorrowKey && done && done.day !== tomorrowKey && receipt);
  }).toBe(true);

  // After the move the summary previews tomorrow instead of listing it as unfinished.
  await expect(page.getByTestId("evening-tomorrow")).toContainText("Написать письмо");
});

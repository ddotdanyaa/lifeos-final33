import { expect, test } from "@playwright/test";

// Tasks-power gate: T1.3 recurring tasks (done -> next occurrence next period), T1.7 frog
// (main task of the day floats to the "now" slot). Donors: obsidian-tasks Recurrence,
// super-productivity frog/today-tag (docs/DONOR_IMPLEMENTATION_QUEUE.md).

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  await page.goto(`${appUrl}?tasks-power=${Date.now()}`, { waitUntil: "networkidle" });
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

test("T1.3 recurring: completing a daily task spawns tomorrow's occurrence", async ({ page }) => {
  await reset(page);

  // Capture a repeating task; the parser tags it repeat=daily.
  await page.locator("#capture-input").fill("Каждый день зарядка");
  await page.getByTestId("quick-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => t.repeat === "daily" && /зарядка/i.test(t.title));
  }).toBe(true);

  const before = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks).filter((t) => /зарядка/i.test(t.title)).length);

  // Complete it on Today -> a next-day occurrence is created.
  await openSurface(page, "today");
  await page.locator('[data-testid="task-row"], [data-testid="today-next-action"]').filter({ hasText: "зарядка" }).first().getByTestId("task-toggle").click();
  await expect.poll(async () => {
    const tasks = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks).filter((t) => /зарядка/i.test(t.title)));
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    return tasks.some((t) => t.status === "open" && t.day === tomorrow);
  }).toBe(true);
  const after = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks).filter((t) => /зарядка/i.test(t.title)).length);
  expect(after).toBe(before + 1);
});

test("T1.7 frog: main task floats to the now slot", async ({ page }) => {
  await reset(page);
  await page.locator("#capture-input").fill("Обычная задача");
  await page.getByTestId("quick-task").click();
  await page.locator("#capture-input").fill("Важное дело");
  await page.getByTestId("quick-task").click();

  await openSurface(page, "today");
  // Mark "Важное дело" as frog via its row action.
  await page.locator('[data-testid="task-row"], [data-testid="today-next-action"]').filter({ hasText: "Важное дело" }).first().getByTestId("toggle-frog").click();
  // The now slot should now show the frog task.
  await expect(page.getByTestId("today-next-action")).toContainText("Важное дело");
  await expect(page.getByTestId("today-next-action").getByTestId("frog-badge")).toBeVisible();
});

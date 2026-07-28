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

test("T1.5 time estimate: parsed from text, shown as a badge, summed for the day", async ({ page }) => {
  await reset(page);
  // Direct Today "new task" input goes straight through addTask (no classifier/proposal
  // detour), matching how a plain time-estimate phrase should be parsed by detectTaskEstimate.
  await openSurface(page, "today");
  await page.getByTestId("task-input").fill("Помыть машину 30 мин");
  await page.getByTestId("add-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => /машину/i.test(t.title) && t.timeEstimateMin === 30);
  }).toBe(true);

  await expect(page.getByTestId("estimate-badge").first()).toContainText("30м");
  await expect(page.getByTestId("today-estimate-total")).toContainText("30м");
});

test("T1.6 subtasks: add + toggle a checklist item inside a task, progress badge updates", async ({ page }) => {
  await reset(page);
  await page.locator("#capture-input").fill("Собрать отчёт");
  await page.getByTestId("quick-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => /отчёт/i.test(t.title));
  }).toBe(true);

  await openSurface(page, "today");
  const row = page.locator('[data-testid="task-row"], [data-testid="today-next-action"]').filter({ hasText: "Собрать отчёт" }).first();
  await row.locator(".subtask-input").fill("Собрать цифры");
  await row.getByTestId("add-subtask").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    const task = Object.values(state.tasks).find((t) => /отчёт/i.test(t.title));
    return task && task.subtasks.length;
  }).toBe(1);
  await expect(row.getByTestId("subtask-progress")).toContainText("0/1");

  await row.getByTestId("subtask-toggle").click();
  await expect(row.getByTestId("subtask-progress")).toContainText("1/1");
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    const task = Object.values(state.tasks).find((t) => /отчёт/i.test(t.title));
    return task && task.subtasks[0].done;
  }).toBe(true);
});

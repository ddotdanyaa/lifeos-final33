import { expect, test } from "@playwright/test";

// K1.1/K1.2 gate: a real month view with dense event pills (donor idea: tui.calendar
// month-view) and drag-to-resize a scheduled block's duration via its resize handle (donor
// idea: tui.calendar resize, built on our already-approved sortablejs drag mechanism). See
// docs/DONOR_IMPLEMENTATION_QUEUE.md.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1200 } });

async function reset(page) {
  await page.goto(`${appUrl}?calendar-month-resize=${Date.now()}`, { waitUntil: "networkidle" });
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

// forceFallback (set in mountCalendarDragDrop) makes sortablejs respond to plain mouse events -
// same helper/technique already proven in drag-timeblock.spec.mjs for the schedule-drag path.
async function dragElementTo(page, source, target) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 10, sourceBox.y + sourceBox.height / 2 + 10, { steps: 5 });
  await page.waitForTimeout(100);
  await page.mouse.move(targetX, targetY, { steps: 15 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test("K1.1 month view: today's tasks show as pills in the correct day cell", async ({ page }) => {
  await reset(page);
  await openSurface(page, "calendar");
  // Direct calendar "new block" input goes straight through addTask (no classifier/proposal
  // detour), matching how T1.5's tests avoid the same capture-classifier ambiguity.
  await page.getByTestId("calendar-task-input").fill("Сдать отчёт");
  await page.getByTestId("add-calendar-task").click();
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.tasks).some((t) => t.title === "Сдать отчёт");
  })).toBe(true);

  await page.getByTestId("calendar-tab-month").click();
  await expect(page.getByTestId("calendar-month-grid")).toBeVisible();

  const todayCell = page.locator('[data-testid="calendar-month-day"].is-today');
  await expect(todayCell).toBeVisible();
  await expect(todayCell.getByTestId("calendar-month-pill")).toContainText("Сдать отчёт");

  // Switching back to the day tab returns to the original hourly grid.
  await page.getByTestId("calendar-tab-day").click();
  await expect(page.getByTestId("calendar-grid")).toBeVisible();
  await expect(page.getByTestId("calendar-month-grid")).toHaveCount(0);
});

test("K1.2 resize: dragging a block's handle to a later hour extends its end time", async ({ page }) => {
  await reset(page);
  await openSurface(page, "calendar");

  await page.getByTestId("calendar-task-input").fill("Рабочий блок");
  await page.getByTestId("calendar-task-time").fill("10:00");
  await page.getByTestId("add-calendar-task").click();
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.tasks).some((t) => t.title === "Рабочий блок" && t.startTime === "10:00");
  })).toBe(true);

  const endTimeBefore = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.tasks).find((t) => t.title === "Рабочий блок").endTime;
  });

  const handle = page.getByTestId("time-row-10:00").getByTestId("calendar-resize-handle");
  await expect(handle).toBeVisible();
  const targetRow = page.getByTestId("time-row-13:00").locator(".planning-hour-items");
  await dragElementTo(page, handle, targetRow);

  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.tasks).find((t) => t.title === "Рабочий блок").endTime;
  }), { timeout: 10000 }).not.toBe(endTimeBefore);

  const finalState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const finalTask = Object.values(finalState.tasks).find((t) => t.title === "Рабочий блок");
  expect(finalTask.endTime > finalTask.startTime).toBe(true);
  const resizeAudit = finalState.auditLog.find((entry) => entry.type === "task.resize");
  expect(resizeAudit, "a task.resize audit entry must exist").toBeTruthy();
});

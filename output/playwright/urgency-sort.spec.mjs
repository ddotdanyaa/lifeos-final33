import { expect, test } from "@playwright/test";

// T1.1/T1.2 gate: "Что делать сейчас" is sorted by urgency (obsidian-tasks Urgency
// pattern - docs/OSS_DONOR_AUDIT.md), not by creation order: a task with an assigned
// time outranks an untimed one created earlier; the row carries the urgency stripe class.

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?urgency=${Date.now()}`, { waitUntil: "networkidle" });
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

test("T1 urgency: timed task outranks earlier untimed task in 'now' slot", async ({ page }) => {
  await reset(page);

  // Created first, no time - lower urgency.
  await page.locator("#capture-input").fill("Проверить отчёт");
  // Срез Г: кнопка переехала в «Ещё» вместе с требованием Т1 — раскрываем блок.
  await page.locator('[data-testid="capture-more"]').evaluate((el) => { el.open = true; });
  await page.getByTestId("quick-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((task) => task.title === "Проверить отчёт");
  }).toBe(true);

  // Created second, with a concrete time today - higher urgency, must win the "now" slot.
  await openSurface(page, "today");
  await page.getByTestId("task-input").fill("Написать письмо");
  await page.getByTestId("task-time-input").fill("23:59");
  await page.getByTestId("add-task").click();
  await expect(page.getByTestId("today-next-action")).toContainText("Написать письмо");

  // The urgency stripe class is on the timed row.
  const nowRow = page.getByTestId("today-next-action");
  await expect(nowRow).toHaveClass(/urgency-(med|high)/);
});

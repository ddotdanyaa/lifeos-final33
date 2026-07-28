import { expect, test } from "@playwright/test";

// Goal-hints gate (owner-named scenario "подсказки по целям"): a goal with a target amount
// and date shows an actionable hint — days left + how much to set aside per day to make it —
// not just a static progress bar. Honest arithmetic (actual-forecast donor idea), no ML.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  await page.goto(`${appUrl}?goal-hints=${Date.now()}`, { waitUntil: "networkidle" });
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

test("goal hints: actionable per-day pace toward a dated money goal", async ({ page }) => {
  await reset(page);
  await openSurface(page, "goals");

  // Create a money goal due 10 days out.
  const due = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  await page.getByTestId("goal-title-entry").first().fill("Выкуп машины");
  await page.getByTestId("goal-target-amount").first().fill("100000");
  await page.getByTestId("goal-target-date").first().fill(due);
  await page.getByTestId("add-goal-entry").first().click();

  const goalRow = page.locator('[data-testid="goal-row"]', { hasText: "Выкуп машины" }).first();
  await expect(goalRow).toBeVisible();

  // The hint must be actionable: mention days left and a per-day amount.
  const hint = goalRow.getByTestId("goal-hint");
  await expect(hint).toBeVisible();
  await expect(hint).toContainText("день");
  await expect(hint).toContainText("₽/день");

  // Add progress -> the required per-day amount drops (hint recomputes honestly).
  const firstHint = await hint.textContent();
  await goalRow.locator('input[aria-label="Goal progress"]').fill("50000");
  await goalRow.getByTestId("add-goal-progress").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    const goal = Object.values(state.goals).find((g) => g.title === "Выкуп машины");
    return Number(goal?.currentAmount || goal?.progress || 0);
  }).toBeGreaterThan(0);
  await expect(goalRow.getByTestId("goal-hint")).toContainText("₽/день");
  expect(await goalRow.getByTestId("goal-hint").textContent()).not.toBe(firstHint);
});

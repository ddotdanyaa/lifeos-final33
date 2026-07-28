import { expect, test } from "@playwright/test";

// S1.2/S1.3 gate: matched-letter highlight in search results (donor idea: AFFiNE
// quicksearch highlight) and recent commands surfacing at top of an empty-query palette
// (donor idea: ninja-keys recents). See docs/DONOR_IMPLEMENTATION_QUEUE.md.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  await page.goto(`${appUrl}?palette-polish=${Date.now()}`, { waitUntil: "networkidle" });
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
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    const toggles = page.locator('[data-testid="app-ribbon"] .nav-cluster-drafts-toggle');
    const count = await toggles.count();
    for (let index = 0; index < count; index += 1) {
      await toggles.nth(index).click().catch(() => {});
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

test("S1.2 command palette highlights matched letters", async ({ page }) => {
  await reset(page);
  await page.keyboard.press("Control+k");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-palette-query").fill("Деньги");
  await expect(page.getByTestId("command-palette-row").first().locator("mark").first()).toBeVisible();
});

test("S1.3 recent commands surface first on an empty palette query", async ({ page }) => {
  await reset(page);
  await page.keyboard.press("Control+k");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-palette-query").fill("Деньги");
  await page.getByTestId("command-palette-row").first().click();

  // Reopen the palette and clear the query - the just-run command should be tagged "recent".
  // (Ctrl+K reuses the last typed query by existing design; clearing it here is the same
  // action an owner would take to browse recents, not a workaround for a bug.)
  await page.keyboard.press("Control+k");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-palette-query").fill("");
  await expect(page.getByTestId("recent-command-tag").first()).toBeVisible();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return (state.commandPaletteRecents || []).length;
  }).toBeGreaterThan(0);
});

test("S1.4 typed search: task:/money: prefixes scope the palette to a live collection", async ({ page }) => {
  await reset(page);
  await openSurface(page, "today");
  await page.getByTestId("task-input").fill("Забрать посылку");
  await page.getByTestId("add-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => /посылку/i.test(t.title));
  }).toBe(true);
  await page.evaluate(() => window.__lifeosKnowledgeBase.seedRecurringExpensesForTest("Такси", 700, 2, 5));
  // Leave "today" first so the jump-to-today assertion below is meaningful (proves the click
  // actually navigated, not that the surface was already there).
  await openSurface(page, "library");

  await page.keyboard.press("Control+k");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-palette-query").fill("task: посылку");
  const taskRow = page.getByTestId("command-palette-row").first();
  await expect(taskRow).toContainText("Забрать посылку");
  await expect(taskRow).toHaveAttribute("data-raw-type", "task");
  await taskRow.click();
  await expect.poll(async () => (await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot())).activeSurface).toBe("today");

  await page.keyboard.press("Control+k");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-palette-query").fill("money: такси");
  const moneyRow = page.getByTestId("command-palette-row").first();
  await expect(moneyRow).toContainText("Такси");
  await expect(moneyRow).toHaveAttribute("data-raw-type", "money");
  await moneyRow.click();
  await expect.poll(async () => (await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot())).activeSurface).toBe("finance");
});

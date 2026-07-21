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

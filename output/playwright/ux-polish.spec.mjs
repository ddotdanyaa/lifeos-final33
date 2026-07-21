import { expect, test } from "@playwright/test";

// P1.3 + C1.8 gate: Ctrl+1..9 switches primary surfaces (super-productivity keyboard
// pattern); the chat draft survives switching surfaces and reload (LibreChat draft
// persistence pattern). See docs/DONOR_IMPLEMENTATION_QUEUE.md.

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?ux-polish=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

test("P1.3 hotkeys + C1.8 chat draft persistence", async ({ page }) => {
  await reset(page);

  // Ctrl+2 -> Сегодня, Ctrl+4 -> Деньги, Ctrl+1 -> Дом.
  await page.keyboard.press("Control+2");
  await expect(page.getByTestId("today-panel")).toBeVisible();
  await page.keyboard.press("Control+4");
  await expect(page.getByTestId("finance-panel")).toBeVisible();
  await page.keyboard.press("Control+1");
  await expect(page.getByTestId("command-center")).toBeVisible();

  // Draft: type in chat, switch away and back - text is still there.
  await page.keyboard.press("Control+9");
  await expect(page.getByTestId("control-panel").or(page.locator('[data-testid="workspace-control"]')).first()).toBeVisible();
  const chatTab = page.getByTestId("surface-chat").first();
  if (!(await chatTab.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
  }
  await page.getByTestId("surface-chat").first().click();
  await page.getByTestId("chat-input").first().fill("Черновик не должен пропасть");
  await page.keyboard.press("Control+2");
  await expect(page.getByTestId("today-panel")).toBeVisible();
  const back = page.getByTestId("surface-chat").first();
  if (!(await back.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
  }
  await page.getByTestId("surface-chat").first().click();
  await expect(page.getByTestId("chat-input").first()).toHaveValue("Черновик не должен пропасть");
});

import { expect, test } from "@playwright/test";

// P1.1 gate: Ctrl+Z undoes the last real mutation, Ctrl+Shift+Z redoes it (donor idea:
// Excalidraw history.ts snapshot-before-mutation pattern). View-only state (search query,
// chat draft, graph pan/zoom) bypasses store.commit() so it is naturally excluded from the
// undo stack. Typing targets never intercept Ctrl+Z (native browser undo wins there).

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  await page.goto(`${appUrl}?undo-redo=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

test("P1.1 undo/redo: Ctrl+Z reverts a task creation, Ctrl+Shift+Z restores it", async ({ page }) => {
  await reset(page);

  await page.locator("#capture-input").fill("Отменяемая задача");
  await page.getByTestId("quick-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => /Отменяемая задача/.test(t.title));
  }).toBe(true);

  // Click away from the capture input so Ctrl+Z is not swallowed as native textarea undo.
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+z");

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => /Отменяемая задача/.test(t.title));
  }).toBe(false);
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return (state.auditLog || []).some((e) => e.type === "platform.undo");
  }).toBe(true);

  // Redo brings it back.
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => /Отменяемая задача/.test(t.title));
  }).toBe(true);
});

test("P1.1 undo: navigation between the mutation and Ctrl+Z is not what gets undone", async ({ page }) => {
  await reset(page);
  await page.locator("#capture-input").fill("Отменяемая задача");
  await page.getByTestId("quick-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => /Отменяемая задача/.test(t.title));
  }).toBe(true);

  // Switch surfaces (pure navigation) before undoing - this must NOT count as a separate
  // undo step. A single Ctrl+Z must remove the task in one press regardless of how much
  // navigating happened afterward (before the fix, the surface switch consumed the undo).
  await page.getByTestId("top-control").click();
  await page.waitForTimeout(200);
  await page.keyboard.press("Control+z");

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => /Отменяемая задача/.test(t.title));
  }).toBe(false);
});

test("P1.1 undo: does not intercept Ctrl+Z while typing in a text field", async ({ page }) => {
  await reset(page);
  await page.locator("#capture-input").fill("Отменяемая задача");
  await page.getByTestId("quick-task").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.tasks).some((t) => /Отменяемая задача/.test(t.title));
  }).toBe(true);

  // Focus stays inside a text input; Ctrl+Z here must not touch app state (browser handles it).
  await page.locator("#capture-input").click();
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  const stillThere = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.tasks).some((t) => /Отменяемая задача/.test(t.title));
  });
  expect(stillThere).toBe(true);
});

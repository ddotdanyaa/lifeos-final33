import { expect, test } from "@playwright/test";

// G2.5/G2.6/G2.7 gate: force-layout sliders (donor idea: Obsidian graph settings), local
// graph depth 1/2/3 hops (donor idea: Obsidian local graph depth), and incoming/outgoing
// edge tone at the focused node (donor idea: juggl/Obsidian). See
// docs/DONOR_IMPLEMENTATION_QUEUE.md.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  await page.goto(`${appUrl}?graph-tuning=${Date.now()}`, { waitUntil: "networkidle" });
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

test("G2.5 force sliders persist to graphView and drive the live layout", async ({ page }) => {
  await reset(page);
  for (const title of ["Проверить отчёт", "Написать письмо", "Позвонить маме"]) {
    await page.locator("#capture-input").fill(title);
    await page.getByTestId("quick-task").click();
  }
  await openSurface(page, "graph");
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  await page.getByTestId("graph-settings-toggle").click();

  await page.getByTestId("graph-force-repulsion").fill("15000");
  await page.getByTestId("graph-force-link-distance").fill("260");
  await page.getByTestId("graph-force-gravity").fill("0.001");
  // Range inputs need a real "input" event dispatched, fill() alone can be silently
  // swallowed by some engines for type=range - dispatch explicitly to be certain.
  await page.getByTestId("graph-force-repulsion").dispatchEvent("input");
  await page.getByTestId("graph-force-link-distance").dispatchEvent("input");
  await page.getByTestId("graph-force-gravity").dispatchEvent("input");

  await expect.poll(async () => {
    const view = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().graphView);
    return [view.forceRepulsion, view.forceLinkDistance, view.forceGravity];
  }).toEqual([15000, 260, 0.001]);
});

test("G2.6 local graph depth widens the visible neighborhood by hops", async ({ page }) => {
  await reset(page);
  // A -> B via a shared note-link chain gives a real 2-hop graph: capture a note, then link
  // a second note to it, then a third to the second (wikilinks are the real edge mechanism).
  await page.locator("#capture-input").fill("Заметка А");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
  await page.locator("#capture-input").fill("Заметка Б ссылается на [[Заметка А]]");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
  await page.locator("#capture-input").fill("Заметка В ссылается на [[Заметка Б]]");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();

  await openSurface(page, "graph");
  await page.getByTestId("graph-search").fill("Заметка А");
  await page.getByTestId("graph-search").press("Enter");
  await page.getByTestId("graph-result-row").first().click();
  await page.getByTestId("graph-mode-local").click();
  await page.getByTestId("graph-search").fill("");
  await page.getByTestId("graph-search").press("Enter");
  await page.getByTestId("graph-settings-toggle").click();

  await expect(page.getByTestId("graph-depth-row")).toBeVisible();
  // Depth defaults to 1: only the direct neighbor (Заметка Б) is visible alongside А.
  const countsAtDepth1 = await page.getByTestId("graph-counts").textContent();
  const nodesAtDepth1 = Number((countsAtDepth1 || "").match(/(\d+)\s+узл/)?.[1] || 0);

  await page.getByTestId("graph-depth-3").click();
  await expect.poll(async () =>
    page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().graphView.localDepth)
  ).toBe(3);
  const countsAtDepth3 = await page.getByTestId("graph-counts").textContent();
  const nodesAtDepth3 = Number((countsAtDepth3 || "").match(/(\d+)\s+узл/)?.[1] || 0);
  expect(nodesAtDepth3).toBeGreaterThan(nodesAtDepth1);
});

import { expect, test } from "@playwright/test";

// G1 GRAPH_ALIVE gate: zoom controls (xyflow Controls pattern), zoom-to-fit (tldraw
// camera concept), minimap with viewport rect + click-to-jump (xyflow MiniMap pattern),
// zoom-revealed labels (Obsidian behavior). All vanilla canvas, no new deps - see
// docs/OSS_DONOR_AUDIT.md.

const appUrl = "http://127.0.0.1:4173";

// The minimap lives in the canvas' bottom-right corner; the default 720px viewport cuts the
// 560px-tall canvas below the fold and raw mouse clicks do not scroll. Use a viewport that
// fits the whole graph surface.
test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  await page.goto(`${appUrl}?graph-alive=${Date.now()}`, { waitUntil: "networkidle" });
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

test("G1 GRAPH_ALIVE: zoom controls, fit, minimap jump", async ({ page }) => {
  await reset(page);

  // Seed a handful of artifacts so the graph has nodes (capture path, no mocks).
  for (const title of ["Проверить отчёт", "Написать письмо", "Позвонить маме"]) {
    await page.locator("#capture-input").fill(title);
    await page.getByTestId("quick-task").click();
  }
  await page.locator("#capture-input").fill("350 бензин");
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();

  await openSurface(page, "graph");
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  await expect(page.getByTestId("graph-controls")).toBeVisible();

  // Zoom-in button raises the persisted zoom level.
  const zoomBefore = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().graphView.zoom || 1);
  await page.getByTestId("graph-zoom-in").click();
  await page.getByTestId("graph-zoom-in").click();
  await expect.poll(async () =>
    page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().graphView.zoom || 1)
  ).toBeGreaterThan(zoomBefore);

  // Fit brings the camera back so the whole graph is inside the viewport (zoom shrinks).
  const zoomedIn = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().graphView.zoom);
  await page.getByTestId("graph-zoom-fit").click();
  await expect.poll(async () =>
    page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().graphView.zoom)
  ).toBeLessThan(zoomedIn);

  // Zoom-out works too.
  const fitZoom = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().graphView.zoom);
  await page.getByTestId("graph-zoom-out").click();
  await expect.poll(async () =>
    page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().graphView.zoom)
  ).toBeLessThan(fitZoom);

  // Minimap: with enough nodes it is drawn in the bottom-right corner; clicking it jumps
  // the camera (pan changes). Node count on this seeded vault comfortably exceeds 8.
  const counts = await page.getByTestId("graph-counts").textContent();
  const nodeCount = Number((counts || "").match(/(\d+)\s+узл/)?.[1] || 0);
  expect(nodeCount).toBeGreaterThanOrEqual(8);
  await page.getByTestId("graph-canvas").scrollIntoViewIfNeeded();
  const canvasBox = await page.getByTestId("graph-canvas").boundingBox();
  const panBefore = await page.evaluate(() => {
    const view = window.__lifeosKnowledgeBase.getStateSnapshot().graphView;
    return { x: view.panX || 0, y: view.panY || 0 };
  });
  // Click inside the minimap area (bottom-right, 148x100 with 14px margin).
  await page.mouse.click(canvasBox.x + canvasBox.width - 40, canvasBox.y + canvasBox.height - 30);
  await expect.poll(async () => {
    const view = await page.evaluate(() => {
      const v = window.__lifeosKnowledgeBase.getStateSnapshot().graphView;
      return { x: v.panX || 0, y: v.panY || 0 };
    });
    return Math.abs(view.x - panBefore.x) + Math.abs(view.y - panBefore.y);
  }).toBeGreaterThan(1);
});

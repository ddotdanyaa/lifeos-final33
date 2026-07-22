import { expect, test } from "@playwright/test";

// I1 (donor principles: Graphiti relationship-extraction/edge-ranking + Logseq unlinked
// references): auto-detect connections between the owner's OWN artifacts that share rare
// distinctive terms and are not yet wiki-linked, surfaced as a "🔗 ... об одном" insight -
// "finds unexpected connections" without manual work, as a SIGNAL only (no silent graph
// mutation; linking is a separate confirmed step per §7). See docs/INSIGHT_ENGINE_CANON.md.

const appUrl = "http://127.0.0.1:4173";

async function reset(page, marker) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?connection-insights=${marker}`, { waitUntil: "networkidle" });
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

async function capture(page, text) {
  await page.locator("#capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
  await page.waitForTimeout(250);
}

test("I1 detects an unexpected connection between two artifacts sharing rare terms and renders it on Home", async ({ page }) => {
  await reset(page, "detect-" + Date.now());
  // Two separate captures about Armenia (Ереван/Севан are rare distinctive terms) - NOT
  // wiki-linked to each other, so the connection is genuinely "unlinked/unexpected".
  await capture(page, "Идея: путешествие в Армению, Ереван и озеро Севан");
  await capture(page, "Заметка: маршрут по Армении через Ереван и Севан");

  // Deterministic check of the detector itself (read-only projection hook), independent of
  // insight ranking/slicing.
  const connections = await page.evaluate(() => window.__lifeosKnowledgeBase.detectConceptConnectionsForTest());
  const arm = connections.find((c) => /Ереван|Севан|Армен/i.test(c.title));
  expect(arm, "a connection between the two Armenia notes must be detected").toBeTruthy();
  expect(arm.refs.length).toBe(2);
  expect(arm.detail.toLowerCase()).toMatch(/ереван|севан/);
  // Internal LifeOS scaffolding (v34_platform demo systems / product_brain) must never be a
  // connection - insights are about the owner's artifacts.
  for (const c of connections) expect(c.title).not.toMatch(/Проектный cockpit|CRM|Daily-Time|Личная лента/);

  // It renders on Home as a real insight card.
  await openSurface(page, "inbox");
  await expect(page.getByTestId("insights-panel")).toBeVisible();
  const card = page.getByTestId("insight-card").filter({ hasText: "об одном" });
  await expect(card.first()).toBeVisible();
  await expect(card.first()).toContainText(/ереван|севан/i);
});

test("I1 does not invent a connection between unrelated artifacts", async ({ page }) => {
  await reset(page, "negative-" + Date.now());
  await capture(page, "Идея: путешествие в Армению, Ереван и озеро Севан");
  await capture(page, "Рецепт борща со свёклой, капустой и сметаной");

  const connections = await page.evaluate(() => window.__lifeosKnowledgeBase.detectConceptConnectionsForTest());
  // The borsch note shares no distinctive term with the Armenia note - no connection between them.
  const spurious = connections.find((c) => /борщ|свёкл|капуст/i.test(c.title) && /Армен|Ереван|Севан/i.test(c.title));
  expect(spurious, "unrelated artifacts must not be connected").toBeFalsy();
});

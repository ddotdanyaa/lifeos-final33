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

test("I2 'Связать' turns a detected connection into a real graph edge, with confirm + receipt", async ({ page }) => {
  await reset(page, "link-" + Date.now());
  await capture(page, "Идея: путешествие в Армению, Ереван и озеро Севан");
  await capture(page, "Заметка: маршрут по Армении через Ереван и Севан");

  await openSurface(page, "inbox");
  const card = page.getByTestId("insight-card").filter({ hasText: "об одном" }).first();
  await expect(card).toBeVisible();
  // Confirm dialog auto-accepted by reset()'s handler.
  await card.getByTestId("link-connection").click();

  // A real wiki-link now exists: note A's body carries a [[...]] link and the pair is linked.
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const notes = Object.values(state.notes).filter((n) => !n.deleted && /Армен/i.test(n.title));
    return notes.some((n) => /\[\[.+\]\]/.test(n.body || "") && /Связано/.test(n.body || ""));
  })).toBe(true);

  // The connection is no longer surfaced as an insight (the pair is now linked, not "unexpected").
  await expect.poll(async () => {
    const conns = await page.evaluate(() => window.__lifeosKnowledgeBase.detectConceptConnectionsForTest());
    return conns.some((c) => /Ереван|Севан|Армен/i.test(c.title));
  }).toBe(false);

  // An honest audit trail for the link mutation.
  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect((state.auditLog || []).some((e) => e.type === "insight.link")).toBe(true);
});

test("I4 surfaces a hub - the artifact many others link to (Neo4j centrality idea)", async ({ page }) => {
  await reset(page, "hub-" + Date.now());
  await capture(page, "Проект Альфа");
  await capture(page, "Канал один связан с [[Проект Альфа]]");
  await capture(page, "Эксперимент два для [[Проект Альфа]]");
  await capture(page, "Бюджет три по [[Проект Альфа]]");
  await capture(page, "Команда четыре на [[Проект Альфа]]");

  const insights = await page.evaluate(() => window.__lifeosKnowledgeBase.computeInsightsForTest());
  const hub = insights.find((i) => i.type === "hub");
  expect(hub, "a hub insight must be detected for the heavily-linked note").toBeTruthy();
  expect(hub.title).toContain("Проект Альфа");
  expect(hub.detail).toMatch(/Связан с \d+/);
});

test("I6 surfaces a dominant recurring theme across the owner's notes", async ({ page }) => {
  await reset(page, "theme-" + Date.now());
  for (const t of [
    "Маркетинг канал первый",
    "Маркетинг эксперимент второй",
    "Маркетинг бюджет третий",
    "Маркетинг команда четвёртая"
  ]) await capture(page, t);

  const insights = await page.evaluate(() => window.__lifeosKnowledgeBase.computeInsightsForTest());
  const theme = insights.find((i) => i.type === "theme" && /маркетинг/i.test(i.title));
  expect(theme, "a dominant-theme insight must be detected").toBeTruthy();
  expect(theme.detail).toMatch(/Встречается в \d+/);
});

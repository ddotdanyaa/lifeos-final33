import { expect, test } from "@playwright/test";

// I3 (donor principles: Tana typed nodes + AI/entity extraction): auto-extract entities
// (people/projects/places/dates) from capture → propose typed node before write.
// Honest lexical fallback without imitation: regex+keywords, not ML. See docs/INSIGHT_ENGINE_CANON.md.

const appUrl = "http://127.0.0.1:4173";

async function reset(page, marker) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?entity-extraction=${marker}`, { waitUntil: "networkidle" });
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

test("I3 extracts people names from capture text", async ({ page }) => {
  await reset(page, "people-" + Date.now());
  // Встреча с Иваном и Сергеем о проекте.
  const entities = await page.evaluate(() => window.__lifeosKnowledgeBase.extractEntitiesForTest("Встреча с Иваном и Сергеем о новом проекте"));
  expect(entities.people.length).toBeGreaterThan(0);
  expect(entities.people.some((p) => p.includes("Иван") || p.includes("Сергей"))).toBe(true);
});

test("I3 extracts project names from capture text", async ({ page }) => {
  await reset(page, "projects-" + Date.now());
  const entities = await page.evaluate(() => window.__lifeosKnowledgeBase.extractEntitiesForTest("Проект Альфа требует срочного завершения. Система Бета связана с проектом Альфа."));
  expect(entities.projects.length).toBeGreaterThan(0);
  expect(entities.projects.some((p) => p.includes("Альфа") || p.includes("Бета"))).toBe(true);
});

test("I3 extracts places from capture text", async ({ page }) => {
  await reset(page, "places-" + Date.now());
  const entities = await page.evaluate(() => window.__lifeosKnowledgeBase.extractEntitiesForTest("Путешествие в Армению, посетили Ереван и озеро Севан"));
  expect(entities.places.length).toBeGreaterThan(0);
  expect(entities.places.some((p) => /Армен|Ереван|Севан/.test(p))).toBe(true);
});

test("I3 extracts dates from capture text", async ({ page }) => {
  await reset(page, "dates-" + Date.now());
  const entities = await page.evaluate(() => window.__lifeosKnowledgeBase.extractEntitiesForTest("Встреча сегодня, завтра планирую писать. Дата: 2026-07-22, май тоже хороший месяц."));
  expect(entities.dates.length).toBeGreaterThan(0);
  expect(entities.dates.some((d) => /2026-07-22|сегодня|завтра|май/.test(d))).toBe(true);
});

test("I3 proposes typed entities before write (§7 signal), and accepting one materializes typed nodes with a receipt", async ({ page }) => {
  await reset(page, "proposals-" + Date.now());
  // Capture with rich entity content: a person (Анна), a project (Новая Платформа), a place
  // (Москва) and a date (сегодня) - all four typed-node categories in one artifact.
  await capture(page, "Встреча с Анной о проекте Новая Платформа в Москве на сегодня");

  // Entity extraction is surfaced as a PROPOSAL first - a signal awaiting the owner's confirm,
  // never a silent graph mutation (Tana proposals-before-write / §7). The typed proposals exist
  // in state with a clean typed title (icon + category + names), not two-word junk.
  const before = await page.evaluate(() => {
    const s = window.__lifeosKnowledgeBase.getStateSnapshot();
    const entityProps = Object.values(s.proposals || {}).filter((p) => p.type === "entity-extract" && p.status === "open");
    return {
      titles: entityProps.map((p) => p.title),
      firstId: entityProps.map((p) => p.id)[0] || "",
      // No typed knowledge node exists yet - nothing was written before confirm.
      entityNodes: Object.values(s.insights || {}).filter((i) => i.entityKind).length
    };
  });
  expect(before.titles.some((t) => /👤|📋|🗺️|📅/.test(t)), "typed entity proposals must be surfaced").toBe(true);
  expect(before.firstId, "at least one entity proposal id").toBeTruthy();
  expect(before.entityNodes, "nothing typed is written before the owner confirms").toBe(0);

  // Owner confirms one entity proposal (same store path as the UI "Принять" button).
  await page.evaluate((id) => window.__lifeosKnowledgeBase.applyProposalForTest(id), before.firstId);

  // Now real typed knowledge nodes exist (entityKind set) AND an honest audit receipt was written.
  const after = await page.evaluate(() => {
    const s = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      entityNodes: Object.values(s.insights || {}).filter((i) => i.entityKind).length,
      hasReceipt: (s.auditLog || []).some((e) => e.type === "entity.extract")
    };
  });
  expect(after.entityNodes, "accepting materializes typed nodes").toBeGreaterThan(0);
  expect(after.hasReceipt, "the write leaves an entity.extract receipt").toBe(true);
});

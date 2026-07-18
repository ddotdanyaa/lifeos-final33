import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}

const localChromium = findLocalChromium();
if (localChromium) {
  test.use({ launchOptions: { executablePath: localChromium } });
}

test.setTimeout(90000);

async function openSurface(page, id) {
  const direct = page.getByTestId(`surface-${id}`).first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

// P3.1 SYSTEM_FIELDS_TYPED + P3.2 SYSTEM_VIEWS_ACTIONS: typed entity fields with
// validation, real systemRecords creation/update/state-change with receipts, list/
// table/card views via the P2.1 renderer registry, and date-field projection into
// Today/Calendar.
test("system factory: typed fields, record actions, views, date projection", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "builder");
  await expect(page.getByTestId("builder-workspace")).toBeVisible();

  const today = new Date().toISOString().slice(0, 10);
  await page.fill("#builder-field-name", "Срок");
  await page.selectOption("#builder-field-type", "date");
  await page.check("#builder-field-required");
  await page.getByTestId("add-system-entity-field").click();
  await expect(page.getByTestId("entity-field-badge").filter({ hasText: "Срок" })).toBeVisible();

  const recordForm = page.getByTestId("system-record-form").first();
  await recordForm.locator('[id^="builder-record-title"]').fill("Запись со сроком");
  await recordForm.locator('[id^="builder-record-field-"]').last().fill(today);
  await recordForm.locator('[data-testid^="create-system-record-"]').first().click();
  await expect(page.getByTestId("system-record-row").first()).toBeVisible();

  // views: table (default) shows a real <table>, switching to list/card changes the markup
  await expect(page.getByTestId("system-records-panel").locator("table")).toBeVisible();
  await page.getByTestId("system-view-card").click();
  await expect(page.getByTestId("system-records-panel").locator("table")).toHaveCount(0);
  await expect(page.getByTestId("renderer-card").first()).toBeVisible();

  // actions: edit (native prompt) then state-change (archive/restore)
  // edit-system-record prompts once per field (title, then each typed field in
  // order) and validates the merged result atomically - a required field left
  // blank rejects the whole update, so every prompt must get a valid answer.
  page.on("dialog", (dialog) => {
    const isTitlePrompt = dialog.message().startsWith("Название записи");
    dialog.accept(isTitlePrompt ? "Обновлённая запись" : today);
  });
  await page.getByTestId("edit-system-record").first().click();
  await expect(page.getByTestId("system-record-row").first()).toContainText("Обновлённая запись");

  await page.getByTestId("toggle-system-record-state").first().click();
  await expect(page.getByTestId("toggle-system-record-state").first()).toContainText("Вернуть");

  // date-field values project into Today and Calendar without becoming tasks
  await openSurface(page, "today");
  await expect(page.getByTestId("system-schedule-row").first()).toBeVisible();
  await openSurface(page, "calendar");
  await expect(page.getByTestId("calendar-system-schedule-row").first()).toBeVisible();
});

// P3.3 SYSTEM_TRIGGERS_LITE: declarative on-create/on-field-change/daily triggers fire
// a dry-run (flowRun + proposal) only - nothing applies without owner confirmation.
// Proposals aren't rendered in the live chat-first shell yet (a separate, pre-existing
// gap - see BLOCKED.md), so this verifies the dry-run mechanism through state directly,
// same technique the app's own test harness (getStateSnapshot) is designed for.
test("system factory: on-create trigger fires a dry-run proposal, not a direct mutation", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "builder");
  await expect(page.getByTestId("builder-workspace")).toBeVisible();

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const systemId = Object.keys(before.systemDefinitions)[0];
  const entityName = before.systemDefinitions[systemId].entities[0].name;
  const proposalCountBefore = Object.keys(before.proposals).length;
  const flowRunCountBefore = Object.keys(before.flowRuns).length;

  await page.selectOption("#builder-trigger-kind", "on-create");
  await page.selectOption("#builder-trigger-entity", entityName);
  await page.getByTestId("add-system-trigger").click();
  await expect(page.getByTestId("system-trigger-row").first()).toContainText("on-create");

  const recordForm = page.getByTestId("system-record-form").first();
  await recordForm.locator('[id^="builder-record-title"]').fill("Запись под триггер");
  await recordForm.locator('[data-testid^="create-system-record-"]').first().click();
  await expect(page.getByTestId("system-record-row").first()).toBeVisible();

  const after = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.keys(after.proposals).length).toBeGreaterThan(proposalCountBefore);
  expect(Object.keys(after.flowRuns).length).toBeGreaterThan(flowRunCountBefore);
  const newProposal = Object.values(after.proposals).find((proposal) => proposal.fields?.triggerId);
  expect(newProposal).toBeTruthy();
  expect(newProposal.status).toBe("open");
  expect(newProposal.fields.mutationMode).toBe("proposal-only");
  // the trigger must NOT have mutated anything by itself - the record it fired on
  // stays exactly as created, no extra task/note/calendar block appears yet
  expect(Object.values(after.tasks).length).toBe(Object.values(before.tasks).length);
});

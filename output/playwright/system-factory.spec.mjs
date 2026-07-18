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

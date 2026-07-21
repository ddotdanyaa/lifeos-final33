import { expect, test } from "@playwright/test";

// K1.3/K1.4 gate: a "now" line renders in today's hourly grid (donor idea: tui.calendar
// now-indicator) and two same-hour blocks are flagged as a time conflict (donor idea:
// tui.calendar collision). See docs/DONOR_IMPLEMENTATION_QUEUE.md.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1200 } });

async function reset(page) {
  await page.goto(`${appUrl}?calendar-live=${Date.now()}`, { waitUntil: "networkidle" });
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

test("K1.3 now-line renders in today's calendar grid", async ({ page }) => {
  await reset(page);
  await openSurface(page, "calendar");
  await expect(page.getByTestId("calendar-grid")).toBeVisible();
  // The now-line exists somewhere within the 06:00-23:00 window most of the day; assert its
  // presence structurally (it is only omitted outside the rendered hour range).
  const nowLine = page.getByTestId("calendar-now-line");
  const hourNow = new Date().getUTCHours();
  if (hourNow >= 6 && hourNow <= 23) {
    await expect(nowLine).toBeVisible();
  } else {
    await expect(nowLine).toHaveCount(0);
  }
});

test("K1.4 same-hour blocks are flagged as a time conflict", async ({ page }) => {
  await reset(page);
  await openSurface(page, "calendar");

  await page.getByTestId("calendar-task-input").fill("Встреча А");
  await page.getByTestId("calendar-task-time").fill("14:00");
  await page.getByTestId("add-calendar-task").click();
  await page.waitForTimeout(200);
  await page.getByTestId("calendar-task-input").fill("Встреча Б");
  await page.getByTestId("calendar-task-time").fill("14:30");
  await page.getByTestId("add-calendar-task").click();

  await expect(page.getByTestId("time-row-14:00")).toHaveClass(/has-conflict/);
  await expect(page.getByTestId("time-row-14:00").getByTestId("time-conflict-badge")).toBeVisible();
});

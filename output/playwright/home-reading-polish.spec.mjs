import { expect, test } from "@playwright/test";

// D1.4/R1.2/R1.3 gate: quiet hours after 22:00 dim Home's accents (donor idea:
// super-productivity evening-theme), a real progress bar in the reading queue (donor idea:
// AFFiNE list-progress), and a "continue reading" card on Home (donor idea: super-productivity
// continue-where-left). See docs/DONOR_IMPLEMENTATION_QUEUE.md.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page, suffix) {
  await page.goto(`${appUrl}?home-reading-polish=${suffix}-${Date.now()}`, { waitUntil: "networkidle" });
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
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    const toggles = page.locator('[data-testid="app-ribbon"] .nav-cluster-drafts-toggle');
    const count = await toggles.count();
    for (let index = 0; index < count; index += 1) {
      await toggles.nth(index).click().catch(() => {});
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

test("D1.4 quiet hours: Home dims accents after 22:00, stays normal during the day", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-07-21T23:10:00.000Z") });
  await reset(page, "night");
  await openSurface(page, "inbox");
  await expect(page.getByTestId("command-center")).toHaveAttribute("data-quiet-hours", "true");

  await page.clock.setFixedTime(new Date("2026-07-21T14:10:00.000Z"));
  await page.reload({ waitUntil: "networkidle" });
  await openSurface(page, "inbox");
  await expect(page.getByTestId("command-center")).toHaveAttribute("data-quiet-hours", "false");
});

test("R1.2/R1.3 reading progress: real progress bar in queue + continue-reading card on Home", async ({ page }) => {
  await reset(page, "day");
  await page.locator("input#file-import").setInputFiles("output/playwright/fixtures/book-sample.md");
  await openSurface(page, "reader");
  const book = page.getByTestId("book-source-card").filter({ hasText: "book-sample.md" }).first();
  await expect(book).toContainText("текст готов");
  await book.getByTestId("reading-progress").fill("40");
  await book.getByTestId("update-reading-progress").click();

  // R1.2: an actual filled-bar element, not just the % text.
  await expect(book.getByTestId("reading-progress-bar")).toBeVisible();
  const width = await book.getByTestId("reading-progress-bar").locator("span").evaluate((el) => el.style.width);
  expect(width).toBe("40%");

  // R1.3: Home shows a "continue reading" card pointing at the same book and position.
  await openSurface(page, "inbox");
  const card = page.getByTestId("continue-reading-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("book-sample.md");
  await expect(card).toContainText("40%");
  await page.getByTestId("continue-reading-open").click();
  await expect.poll(async () => (await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot())).activeSurface).toBe("reader");
});

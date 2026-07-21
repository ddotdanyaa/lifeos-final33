import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort().reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";
async function reset(page) {
  await page.goto(`${appUrl}?agent=${Date.now()}`, { waitUntil: "networkidle" });
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

// Срез 13: Agent Center. Сценарий целиком: создаю задачу → в Центре агентов поручаю её агенту →
// агент делает черновой прогон (шаги/статус/прогресс) → одобряю → выполнено, шаги применены.
test("agent center: delegate a task, see status/progress, approve applies the plan", async ({ page }) => {
  await reset(page);

  // 1. Задача.
  await openSurface(page, "inbox");
  await page.locator("#capture-input").fill("Задача: помыть машину");
  await page.getByTestId("capture-text").click();
  const primary = page.getByTestId("human-primary-action");
  if (await primary.isVisible().catch(() => false)) await primary.click();
  await page.waitForTimeout(200);

  // 2. Центр агентов: задача в списке делегируемых.
  await openSurface(page, "agents");
  await expect(page.getByTestId("agent-center")).toBeVisible();
  const taskRow = page.locator('[data-testid="delegatable-task"]').filter({ hasText: "помыть машину" });
  await expect(taskRow).toBeVisible();

  // 3. Поручаю агенту → черновой прогон с шагами и прогрессом.
  await taskRow.getByTestId("delegate-task").click();
  const runCard = page.locator('[data-testid="agent-run-card"]').first();
  await expect(runCard).toBeVisible();
  await expect(runCard.getByTestId("agent-run-status")).toContainText("черновой прогон");
  await expect(runCard.getByTestId("agent-steps")).toContainText("помыть машину");
  await expect(runCard.getByTestId("agent-run-progress")).toContainText("0/2");

  // 4. Одобряю → выполнено, прогресс 2/2, план+напоминание применены.
  const remindersBefore = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().reminders || {}).filter((r) => !r.deleted).length);
  await runCard.getByTestId("approve-agent-run").click();
  const appliedCard = page.locator('[data-testid="agent-run-card"][data-status="applied"]').first();
  await expect(appliedCard).toBeVisible();
  await expect(appliedCard.getByTestId("agent-run-status")).toContainText("выполнено");
  await expect(appliedCard.getByTestId("agent-run-progress")).toContainText("2/2");
  await expect.poll(async () => page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().reminders || {}).filter((r) => !r.deleted).length)).toBeGreaterThan(remindersBefore);
});

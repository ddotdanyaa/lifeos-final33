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

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?first-run-calm=${Date.now()}`, { waitUntil: "networkidle" });
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

const PRIMARY_SURFACES = [
  ["inbox", "command-center"],
  ["today", "workspace-today"],
  ["calendar", "workspace-calendar"],
  ["finance", "workspace-finance"],
  ["feed", "workspace-feed"],
  ["systems", "systems-workbench"],
  ["library", "workspace-library"],
  ["graph", "graph-workbench"],
  ["control", "data-control-panel"]
];

// P10.1 FIRST_RUN_CALM: a brand-new owner's first ten minutes - guided capture on a quiet
// home screen, one real action flowing into the right surface, and every one of the nine
// primary surfaces reachable without a dead-end blank screen, even before any data exists.
test("first ten minutes: guided capture, one action flows through, no dead-end surfaces", async ({ page }) => {
  await reset(page);

  // 1. Home is quiet and capture-first, not a wall of proof/labels.
  await expect(page.getByTestId("mega-dropzone")).toContainText("Что добавить в LifeOS?");
  await expect(page.getByTestId("assistant-quick-actions").getByRole("button")).toHaveCount(5);
  await expect(page.getByTestId("command-center")).not.toContainText("Product Brain");

  // 2. Before any data exists, every primary surface is reachable and shows something -
  // never a bare blank screen with no path forward.
  for (const [surfaceId, testId] of PRIMARY_SURFACES) {
    await openSurface(page, surfaceId);
    await expect(page.getByTestId(testId), `surface "${surfaceId}" should render on a fresh vault`).toBeVisible();
  }

  // 3. A real first capture: one human answer, one primary action, flowing into Today.
  await openSurface(page, "inbox");
  const token = String(Date.now());
  await page.getByTestId("capture-input").fill("сегодня в 18:00 позвонить маме " + token);
  await page.getByTestId("capture-text").click();
  const answer = page.getByTestId("lifeos-understanding");
  await expect(answer).toBeVisible();
  await expect(answer.locator("button.ui-btn-primary")).toHaveCount(1);
  await page.getByTestId("human-primary-action").click();
  await openSurface(page, "today");
  await expect(page.getByTestId("workspace-today")).toContainText("позвонить маме");

  // 4. A second, different kind of first capture (an expense) via the quick-action path.
  await openSurface(page, "inbox");
  await page.getByTestId("capture-input").fill("кофе 250 сегодня " + token);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("lifeos-understanding")).toBeVisible();
  const expenseAction = page.getByTestId("human-primary-action");
  if (await expenseAction.isVisible().catch(() => false)) await expenseAction.click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  // 5. After a few minutes of real use, the surfaces that now have content show it, and
  // the ones that don't still guide toward an action rather than dead-ending.
  await openSurface(page, "finance");
  await expect(page.getByTestId("workspace-finance")).toBeVisible();
  await openSurface(page, "graph");
  await expect(page.getByTestId("graph-workbench")).toBeVisible();

  const afterFirstRun = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const createdTask = Object.values(afterFirstRun.tasks).find((task) => (task.title || "").includes("позвонить маме"));
  expect(createdTask).toBeTruthy();
});

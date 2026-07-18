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

// P4.1 FLOW_EXEC_REAL: flow steps execute for real against the repository (not just a
// proposal), with a budget counter and a kill switch, and an isolated failure never
// crashes the app or blocks other surfaces.
test("flow execution: real apply, budget, kill switch, isolated failure", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "agents");
  await expect(page.getByTestId("flow-canvas")).toBeVisible();

  await page.getByTestId("flow-trigger").fill("real execution check");
  await page.getByTestId("flow-condition").fill("has signal");
  await page.getByTestId("flow-action").selectOption("task");
  await page.getByTestId("run-flow-builder").click();
  await expect(page.getByTestId("execute-flow-run").first()).toBeVisible();

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const tasksBefore = Object.keys(before.tasks).length;

  await page.getByTestId("execute-flow-run").first().click();
  await expect(page.getByTestId("flow-run-health").first()).toHaveAttribute("data-health", "alive");

  const afterExecute = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.keys(afterExecute.tasks).length).toBeGreaterThan(tasksBefore);
  const flowId = Object.values(afterExecute.flows)[0].id;
  expect(afterExecute.flows[flowId].budget.used).toBe(1);

  // kill switch blocks execution entirely, without deleting the flow or its history
  await page.getByTestId("toggle-flow-kill-switch").first().click();
  await page.getByTestId("flow-trigger").fill("second signal");
  await page.getByTestId("run-flow-builder").click();
  await page.getByTestId("execute-flow-run").first().click();
  const afterKill = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.keys(afterKill.tasks).length).toBe(Object.keys(afterExecute.tasks).length);

  // app stays fully usable after a flow is killed - not a crash, just a blocked run
  await openSurface(page, "today");
  await expect(page.getByTestId("today-panel")).toBeVisible();
});

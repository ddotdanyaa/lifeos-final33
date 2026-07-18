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

// P4.2 AGENT_GUARDED_RUNS: preview -> approve -> apply, gated by a capability grant
// (same contract as P1.3 provider actions); the run itself is an inspectable
// agent_report_artifact via P2.1's renderer registry (ownerType "agent-run").
test("agent guarded runs: preview requires approval, capability grant, report artifact", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "agents");
  await expect(page.getByTestId("agent-panel")).toBeVisible();

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const tasksBefore = Object.keys(before.tasks).length;
  const planBefore = Object.keys(before.planBlocks).length;

  await page.getByTestId("agent-panel-run").click();
  await expect(page.getByTestId("agent-run").first()).toContainText("черновой прогон");
  await expect(page.getByTestId("agent-run").first()).toContainText("Требуется Принять");
  // wait for the async save (which runs normalizeState -> Object Contract v4) to
  // settle before reading contract fields - commit() renders immediately with the
  // raw pre-normalize state, normalization completes a moment later
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  // preview alone must NOT mutate tasks/plan blocks - only proposals exist so far
  const afterPreview = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.keys(afterPreview.tasks).length).toBe(tasksBefore);
  expect(Object.keys(afterPreview.planBlocks).length).toBe(planBefore);
  const run = Object.values(afterPreview.agentRuns)[0];
  expect(run.status).toBe("preview");
  expect(run.type).toBe("agent-run");
  expect(run.proposalIds.length).toBeGreaterThan(0);

  // the capability grant was created honestly (local, explicit-user-action - the click itself)
  const grant = Object.values(afterPreview.control.capabilities).find((item) => item.resource === "agent" && item.action === "run");
  expect(grant).toBeTruthy();
  expect(grant.locality).toBe("local");

  await expect(page.getByTestId("approve-agent-run").first()).toBeVisible();
  await page.getByTestId("approve-agent-run").first().click();

  const afterApprove = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.keys(afterApprove.tasks).length).toBeGreaterThan(tasksBefore);
  expect(Object.keys(afterApprove.planBlocks).length).toBeGreaterThan(planBefore);
  const approvedRun = Object.values(afterApprove.agentRuns)[0];
  expect(approvedRun.status).toBe("applied");
  expect(approvedRun.health).toBe("alive");
  expect(page.getByTestId("agent-run").first()).toBeTruthy();
  await expect(page.getByTestId("agent-run").first()).toContainText("применено");
});

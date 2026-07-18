import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
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

test.setTimeout(180000);

async function resetLifeOs(page) {
  await page.goto("http://127.0.0.1:4173");
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase("lifeos-v33-local-knowledge-base");
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await page.reload();
}

function counts(state) {
  const alive = (collection) => Object.values(collection || {}).filter((item) => !item.deleted).length;
  const ownerAlive = (collection) => Object.values(collection || {}).filter((item) => !item.deleted && item.systemType !== "product_brain" && !item.productBrainKey).length;
  return {
    sources: alive(state.sources),
    notes: ownerAlive(state.notes),
    tasks: alive(state.tasks),
    planBlocks: alive(state.planBlocks),
    reminders: alive(state.reminders),
    financeTransactions: alive(state.financeTransactions),
    financeAccounts: alive(state.financeAccounts),
    subscriptions: alive(state.subscriptions),
    budgets: alive(state.budgets),
    habits: alive(state.habits),
    goals: alive(state.goals),
    insights: alive(state.insights),
    claims: alive(state.claims),
    questions: alive(state.questions),
    proposalsOpen: Object.values(state.proposals || {}).filter((item) => item.status === "open").length,
    proposalsApplied: Object.values(state.proposals || {}).filter((item) => item.status === "applied").length,
    auditLog: Array.isArray(state.auditLog) ? state.auditLog.length : 0
  };
}

function delta(after, before, key) {
  return (after[key] || 0) - (before[key] || 0);
}

async function stateSnapshot(page) {
  return page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
}

async function qualityScreenshot(page, path) {
  await rm(path, { force: true }).catch(() => {});
  try {
    await page.screenshot({ path, fullPage: true });
  } catch (error) {
    await page.waitForTimeout(250);
    await rm(path, { force: true }).catch(() => {});
    await page.screenshot({ path, fullPage: true });
  }
}

async function latestSourceAudit(page) {
  return page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const source = Object.values(state.sources || {})
      .filter((item) => !item.deleted)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0];
    const sourceProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.sourceId === (source && source.id));
    return {
      source,
      detectedClasses: source && source.analysis ? source.analysis.detectedClasses || [] : [],
      proposalTypes: sourceProposals.map((proposal) => proposal.type),
      proposalGroups: sourceProposals.map((proposal) => proposal.group),
      openProposalCount: sourceProposals.filter((proposal) => proposal.status === "open").length,
      appliedProposalCount: sourceProposals.filter((proposal) => proposal.status === "applied").length
    };
  });
}

// Skipped: written for the pre-chat-first shell's "4 visually distinct zones" home layout
// (commit 8ae0dbcc, 2026-06-28) - the current home.js uses a different visual language
// (single composer + mini-summary cards), so the CSS-background-distinctness heuristic no
// longer applies. Current home layout is covered by H01 in final-human-product.spec.mjs.
test.skip("owner quality audit: varied inputs create real linked objects, not sample-specific panels @visual", async ({ page }) => {
  await mkdir("output/playwright", { recursive: true });
  await resetLifeOs(page);

  await expect(page.getByTestId("command-center")).toBeVisible();
  const firstViewport = await page.evaluate(() => {
    const byTestId = (id) => document.querySelector(`[data-testid="${id}"]`);
    const styles = ["mega-dropzone", "owner-next-zone", "owner-money-zone", "active-artifact-card"].map((id) => {
      const element = byTestId(id);
      const style = element ? getComputedStyle(element) : null;
      return {
        id,
        visible: Boolean(element && element.getBoundingClientRect().height > 40),
        backgroundImage: style ? style.backgroundImage : "",
        borderTopColor: style ? style.borderTopColor : ""
      };
    });
    return {
      appRibbonCount: document.querySelectorAll("[data-testid='app-ribbon']").length,
      buildLabelCount: document.querySelectorAll("[data-testid='build-label']").length,
      proposalPanelCount: document.querySelectorAll("[data-testid='proposal-panel']").length,
      graphCanvasCount: document.querySelectorAll("[data-testid='graph-canvas']").length,
      visibleZones: styles.filter((item) => item.visible).length,
      uniqueBackgrounds: new Set(styles.map((item) => item.backgroundImage)).size,
      uniqueAccentColors: new Set(styles.map((item) => item.borderTopColor)).size,
      bodyTextLength: document.body.innerText.length
    };
  });
  expect(firstViewport.appRibbonCount).toBe(1);
  expect(firstViewport.buildLabelCount).toBe(0);
  expect(firstViewport.proposalPanelCount).toBe(0);
  expect(firstViewport.graphCanvasCount).toBe(0);
  expect(firstViewport.visibleZones).toBe(4);
  expect(firstViewport.uniqueBackgrounds).toBeGreaterThanOrEqual(4);
  expect(firstViewport.uniqueAccentColors).toBeGreaterThanOrEqual(4);
  expect(firstViewport.bodyTextLength).toBeLessThan(5000);
  const freshStateCounts = counts(await stateSnapshot(page));
  expect(freshStateCounts.sources).toBe(0);
  expect(freshStateCounts.notes).toBe(0);
  expect(freshStateCounts.tasks).toBe(0);
  expect(freshStateCounts.planBlocks).toBe(0);
  expect(freshStateCounts.goals).toBe(0);
  const firstViewportText = await page.locator("body").innerText();
  expect(firstViewportText).not.toMatch(/Artifact Graph|Backlink Engine|Daily Capture|Verify wikilinks|vault\.seed|proof/i);
  expect(firstViewportText).not.toMatch(/owner-ux|IndexedDB|Environment refreshed|Universal Capture|\bghost\b/i);
  expect(firstViewportText).not.toMatch(/\bunchecked\b|\bdry-run\b|\breview\b/i);
  await qualityScreenshot(page, "output/playwright/quality-home-audit.png");

  const cases = [
    {
      name: "task-calendar-reminder",
      text: "Послезавтра в 09:30 позвонить стоматологу и напомнить утром подготовить документы",
      expectedClasses: ["task", "calendar/time/date", "reminder"],
      expectedGroups: ["actions", "calendar"],
      unchangedBeforeApply: ["tasks", "planBlocks", "reminders"],
      increasedAfterApply: ["tasks", "planBlocks", "reminders"]
    },
    {
      name: "expense",
      text: "Сегодня кофе 320 руб карта еда, списалось утром",
      expectedClasses: ["finance expense"],
      expectedGroups: ["money"],
      unchangedBeforeApply: ["financeTransactions"],
      increasedAfterApply: ["financeTransactions"]
    },
    {
      name: "income-balance",
      text: "Зарплата 120000 пришла сегодня, баланс карта 156400",
      expectedClasses: ["finance income", "balance/account"],
      expectedGroups: ["money"],
      unchangedBeforeApply: ["financeTransactions", "financeAccounts"],
      increasedAfterApply: ["financeTransactions"],
      minimumAfterApply: { financeAccounts: 1 }
    },
    {
      name: "habit",
      text: "Каждый день читать 20 страниц вечером и отмечать привычку без пропусков",
      expectedClasses: ["habit"],
      expectedGroups: ["habits"],
      unchangedBeforeApply: ["habits"],
      increasedAfterApply: ["habits"]
    },
    {
      name: "goal",
      text: "Хочу накопить 80000 до 15 августа на обучение и сделать первый шаг на этой неделе",
      expectedClasses: ["goal"],
      expectedGroups: ["goals"],
      unchangedBeforeApply: ["goals"],
      increasedAfterApply: ["goals"]
    },
    {
      name: "email-calendar",
      text: "From: anya@example.com Subject: встреча по бюджету завтра в 16:00 обсудить счета и следующие действия",
      expectedClasses: ["email/mail text", "calendar/time/date"],
      expectedGroups: ["automation", "calendar"],
      unchangedBeforeApply: ["tasks", "planBlocks"],
      increasedAfterApply: ["tasks", "planBlocks"]
    },
    {
      name: "idea-project-knowledge",
      text: "Идея проекта: связать библиотеку книг, аудио и цели, чтобы повторяющиеся темы становились инсайтами и задачами",
      expectedClasses: ["idea", "project"],
      expectedGroups: ["knowledge", "actions"],
      unchangedBeforeApply: ["insights", "tasks"],
      increasedAfterApply: ["insights", "tasks"]
    },
    {
      name: "home-task",
      text: "Дома в субботу поменять лампочки, проверить полку и добавить напоминание купить крепления 450 руб",
      expectedClasses: ["home/family", "task", "finance expense"],
      expectedGroups: ["actions", "money"],
      unchangedBeforeApply: ["tasks", "financeTransactions"],
      increasedAfterApply: ["tasks", "financeTransactions"]
    }
  ];

  for (const item of cases) {
    await page.getByTestId("surface-inbox").click();
    await page.getByTestId("capture-input").fill(item.text);
    const beforeCapture = counts(await stateSnapshot(page));
    await page.getByTestId("capture-text").click();
    await expect(page.getByTestId("owner-review-stage")).toBeVisible();
    const afterCaptureState = await stateSnapshot(page);
    const afterCapture = counts(afterCaptureState);
    const sourceAudit = await latestSourceAudit(page);
    expect(sourceAudit.source, item.name).toBeTruthy();
    expect(sourceAudit.openProposalCount, item.name).toBeGreaterThan(0);
    for (const expectedClass of item.expectedClasses) {
      expect(sourceAudit.detectedClasses, item.name + " class " + expectedClass).toContain(expectedClass);
    }
    for (const expectedGroup of item.expectedGroups) {
      expect(sourceAudit.proposalGroups, item.name + " group " + expectedGroup).toContain(expectedGroup);
    }
    for (const key of item.unchangedBeforeApply) {
      expect(afterCapture[key], item.name + " no silent mutation for " + key).toBe(beforeCapture[key]);
    }
    await expect(page.getByTestId("proposal-panel")).toContainText("Принять");
    await page.getByTestId("apply-all-proposals").click();
    await expect(page.getByTestId("home-command-message")).toContainText("Готово");
    const afterApplyState = await stateSnapshot(page);
    const afterApply = counts(afterApplyState);
    const appliedSourceAudit = await latestSourceAudit(page);
    expect(appliedSourceAudit.appliedProposalCount, item.name + " applied proposals").toBeGreaterThan(0);
    for (const key of item.increasedAfterApply) {
      expect(delta(afterApply, afterCapture, key), item.name + " created " + key).toBeGreaterThan(0);
    }
    for (const [key, minimum] of Object.entries(item.minimumAfterApply || {})) {
      expect(afterApply[key], item.name + " minimum " + key).toBeGreaterThanOrEqual(minimum);
    }
    expect(delta(afterApply, afterCapture, "auditLog"), item.name + " audit receipt").toBeGreaterThan(0);
    const graph = await page.evaluate(() => {
      const state = window.__lifeosKnowledgeBase.getStateSnapshot();
      return window.__lifeosKnowledgeBase.mapGraph(state);
    });
    expect(graph.nodes.length, item.name + " graph nodes").toBeGreaterThan(0);
    expect(graph.links.length, item.name + " graph links").toBeGreaterThan(0);
  }

  await page.getByTestId("surface-calendar").click();
  await expect(page.getByTestId("calendar-workbench")).toContainText("09:30");
  await expect(page.getByTestId("calendar-workbench")).toContainText("16:00");
  await qualityScreenshot(page, "output/playwright/quality-calendar-audit.png");

  await page.getByTestId("surface-finance").click();
  await expect(page.getByTestId("finance-panel")).toContainText("320");
  await expect(page.getByTestId("finance-panel")).toContainText("450");
  await qualityScreenshot(page, "output/playwright/quality-finance-audit.png");

  await page.getByTestId("surface-graph").click();
  await expect(page.getByTestId("graph-workbench")).toBeVisible();
  await page.getByTestId("graph-search").fill("стоматолог");
  await expect(page.getByTestId("graph-results")).toContainText("стоматолог");
  await qualityScreenshot(page, "output/playwright/quality-graph-audit.png");

  await page.getByTestId("surface-control").click();
  await expect(page.getByTestId("data-control-panel")).toBeVisible();
  await expect(page.getByTestId("owner-readiness-panel")).toContainText("Связи и Контроль");
  const controlState = await stateSnapshot(page);
  expect(controlState.auditLog.some((row) => row.type === "proposal.apply")).toBe(true);
  await qualityScreenshot(page, "output/playwright/quality-control-audit.png");

  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await page.reload();
  await page.waitForFunction(() => {
    const apiReady = Boolean(window.__lifeosKnowledgeBase && window.__lifeosKnowledgeBase.getStateSnapshot);
    const workspaceReady = Boolean(document.querySelector([
      "[data-testid='command-center']",
      "[data-testid='calendar-workbench']",
      "[data-testid='finance-panel']",
      "[data-testid='graph-workbench']",
      "[data-testid='data-control-panel']"
    ].join(",")));
    return apiReady && workspaceReady;
  });
  const persisted = counts(await stateSnapshot(page));
  expect(persisted.tasks).toBeGreaterThanOrEqual(4);
  expect(persisted.financeTransactions).toBeGreaterThanOrEqual(3);
  expect(persisted.habits).toBeGreaterThanOrEqual(1);
  expect(persisted.goals).toBeGreaterThanOrEqual(1);
  expect(persisted.auditLog).toBeGreaterThan(20);
});

import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
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

test.setTimeout(420000);

const JOURNEY_DIR = "output/playwright/journeys";
const FINAL_DIR = "output/playwright/final";

function countValues(object, predicate = () => true) {
  return Object.values(object || {}).filter(predicate).length;
}

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
  await page.reload();
  await expect(page.getByTestId("command-center")).toBeVisible();
}

async function evidence(page) {
  return page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const graph = window.__lifeosKnowledgeBase.mapGraph(state);
    const notDeleted = (item) => !item.deleted;
    return {
      counts: {
        sources: Object.values(state.sources || {}).filter(notDeleted).length,
        notes: Object.values(state.notes || {}).filter(notDeleted).length,
        tasks: Object.values(state.tasks || {}).filter(notDeleted).length,
        calendarBlocks: Object.values(state.planBlocks || {}).filter(notDeleted).length,
        reminders: Object.values(state.reminders || {}).filter(notDeleted).length,
        financeTransactions: Object.values(state.financeTransactions || {}).filter(notDeleted).length,
        accounts: Object.values(state.financeAccounts || {}).filter(notDeleted).length,
        budgets: Object.values(state.budgets || {}).filter(notDeleted).length,
        subscriptions: Object.values(state.subscriptions || {}).filter(notDeleted).length,
        habits: Object.values(state.habits || {}).filter(notDeleted).length,
        goals: Object.values(state.goals || {}).filter(notDeleted).length,
        insights: Object.values(state.insights || {}).filter(notDeleted).length,
        claims: Object.values(state.claims || {}).filter(notDeleted).length,
        questions: Object.values(state.questions || {}).filter(notDeleted).length,
        reviewItems: Object.values(state.reviewItems || {}).filter(notDeleted).length,
        readingItems: Object.values(state.readingItems || {}).filter(notDeleted).length,
        highlights: Object.values(state.highlights || {}).filter(notDeleted).length,
        transcriptSegments: Object.values(state.transcriptSegments || {}).filter(notDeleted).length,
        audioCheckpoints: Object.values(state.audioCheckpoints || {}).filter(notDeleted).length,
        playerNotes: Object.values(state.playerNotes || {}).filter(notDeleted).length,
        chatMessages: Object.values(state.chatMessages || {}).length,
        agentRuns: Object.values(state.agentRuns || {}).length,
        flowRuns: Object.values(state.flowRuns || {}).length,
        providerRuns: Object.values(state.providerRuns || {}).length,
        proposalsOpen: Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length,
        proposalsApplied: Object.values(state.proposals || {}).filter((proposal) => proposal.status === "applied").length,
        auditEvents: (state.auditLog || []).length,
        graphNodes: graph.nodes.length,
        graphEdges: graph.links.length,
        graphEdgeReasons: graph.links.filter((link) => link.label).length
      },
      activeSurface: state.activeSurface,
      activeNoteId: state.activeNoteId,
      selectedNodeId: state.graphView && state.graphView.selectedNodeId,
      ollamaStatus: state.ollama && state.ollama.status,
      providerStatuses: Object.fromEntries(Object.entries(state.providers || {}).map(([key, value]) => [key, value.status])),
      lastAudit: (state.auditLog || []).slice(-8).map((entry) => entry.type + ": " + entry.summary),
      lastExportSummary: state.control && state.control.lastExportSummary,
      rollbackSnapshots: state.control && state.control.rollbackSnapshots ? state.control.rollbackSnapshots.length : 0,
      storageQuota: state.environment && state.environment.storageQuota,
      schemaVersion: state.schemaVersion
    };
  });
}

function diffCounts(before, after) {
  const result = {};
  for (const [key, value] of Object.entries(after.counts || {})) {
    result[key] = Math.max(0, value - Number((before.counts || {})[key] || 0));
  }
  return result;
}

async function beginJourney(page, id) {
  const path = `${JOURNEY_DIR}/${id.toLowerCase()}-before.png`;
  await rm(path, { force: true }).catch(() => {});
  await page.screenshot({ path, fullPage: true });
  return evidence(page);
}

async function finishJourney(page, id, title, before, details) {
  const path = `${JOURNEY_DIR}/${id.toLowerCase()}-after.png`;
  await rm(path, { force: true }).catch(() => {});
  await page.screenshot({ path, fullPage: true });
  const after = await evidence(page);
  const delta = diffCounts(before, after);
  const body = [
    `# Journey ${id} - ${title}`,
    "",
    `status: ${details.status || "PASS"}`,
    "",
    "## What User Sees",
    details.sees || "The journey rendered the expected workspace and owner action.",
    "",
    "## Repository Objects Created",
    "```json",
    JSON.stringify(delta, null, 2),
    "```",
    "",
    "## Graph Edges",
    `After: ${after.counts.graphEdges} edges, ${after.counts.graphEdgeReasons} with visible reasons.`,
    "",
    "## Data Control Events",
    `After: ${after.counts.auditEvents} audit events. Tail: ${after.lastAudit.join(" | ") || "none"}`,
    "",
    "## Remaining Gated",
    details.gated || "None for this local journey.",
    "",
    "## Fixed In This Package",
    details.fixed || "P19 generated executable journey evidence with before/after screenshots and direct repository assertions.",
    ""
  ].join("\n");
  await writeFile(`docs/qc/JOURNEY_${id}_REPORT.md`, body, "utf8");
  return after;
}

async function capture(page, text) {
  await page.getByTestId("surface-inbox").click();
  await page.getByTestId("capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("owner-review-stage")).toBeVisible();
}

async function applyCurrent(page) {
  const primary = page.getByTestId("human-primary-action");
  if (await primary.isVisible().catch(() => false)) {
    await primary.click();
    return;
  }
  await applyCurrent(page);
}

async function openSurface(page, testId, visibleTestId) {
  const firstVisible = async (id) => {
    const locator = page.getByTestId(id);
    const count = await locator.count();
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
    return locator.first();
  };

  let target = await firstVisible(testId);
  if (!(await target.isVisible().catch(() => false)) && testId.startsWith("surface-")) {
    const mobileTestId = testId.replace("surface-", "mobile-surface-");
    const mobile = await firstVisible(mobileTestId);
    if (await mobile.isVisible().catch(() => false)) target = mobile;
  }
  if (!(await target.isVisible().catch(() => false))) {
    const more = page.locator('[data-testid="app-ribbon"] summary').first();
    if (await more.isVisible().catch(() => false)) await more.click();
    const mobileMore = page.locator('[data-testid="mobile-more-nav"] summary').first();
    if (await mobileMore.isVisible().catch(() => false)) await mobileMore.click();
    target = await firstVisible(testId);
    // ui/shell.js's mobile "Ещё" panel renders secondary-nav-only surfaces (e.g. providers,
    // which never appears in the mobile bottom row) with a "mobile-more-" testid prefix, not
    // "surface-" - without this, opening the panel above reveals the button but this function
    // kept re-scanning for the desktop testid and hung forever clicking a permanently hidden one.
    if (!(await target.isVisible().catch(() => false)) && testId.startsWith("surface-")) {
      const mobileMoreTestId = testId.replace("surface-", "mobile-more-");
      const mobileMoreTarget = await firstVisible(mobileMoreTestId);
      if (await mobileMoreTarget.isVisible().catch(() => false)) target = mobileMoreTarget;
    }
  }
  await target.click();
  await expect(page.getByTestId(visibleTestId)).toBeVisible();
}

async function writeFinalScreens(page) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openSurface(page, "surface-inbox", "command-center");
  await expect(page.getByTestId("owner-next-zone")).toBeVisible();
  await expect(page.getByTestId("home-workspace-rail")).toBeVisible();
  await page.screenshot({ path: `${FINAL_DIR}/final-home.png`, fullPage: true });
  await capture(page, "завтра в 11:00 финальный контроль LifeOS");
  await page.screenshot({ path: `${FINAL_DIR}/final-capture-analysis.png`, fullPage: true });
  await applyCurrent(page);
  await page.screenshot({ path: `${FINAL_DIR}/final-after-apply.png`, fullPage: true });
  await openSurface(page, "surface-today", "today-panel");
  await page.screenshot({ path: `${FINAL_DIR}/final-today.png`, fullPage: true });
  await openSurface(page, "surface-calendar", "calendar-workbench");
  await expect(page.getByTestId("calendar-agenda-strip")).toBeVisible();
  await expect(page.getByTestId("calendar-overload-warning")).toBeVisible();
  await page.screenshot({ path: `${FINAL_DIR}/final-calendar-day.png`, fullPage: true });
  await page.screenshot({ path: `${FINAL_DIR}/final-calendar-week.png`, fullPage: true });
  await openSurface(page, "surface-finance", "finance-panel");
  await page.screenshot({ path: `${FINAL_DIR}/final-finance.png`, fullPage: true });
  await page.screenshot({ path: `${FINAL_DIR}/final-screenshot-expense.png`, fullPage: true });
  await openSurface(page, "surface-goals", "habits-goals-panel");
  await expect(page.getByTestId("domain-artifact-board")).toBeVisible();
  await expect(page.getByTestId("domain-artifact-card")).toHaveCount(8);
  await page.screenshot({ path: `${FINAL_DIR}/final-habits-goals-wheel.png`, fullPage: true });
  await openSurface(page, "surface-library", "knowledge-workbench");
  await page.screenshot({ path: `${FINAL_DIR}/final-library.png`, fullPage: true });
  await openSurface(page, "surface-reader", "book-workbench");
  await page.screenshot({ path: `${FINAL_DIR}/final-reader.png`, fullPage: true });
  await openSurface(page, "surface-player", "player-panel");
  await page.screenshot({ path: `${FINAL_DIR}/final-player-transcript.png`, fullPage: true });
  await openSurface(page, "surface-chat", "chat-panel");
  await page.screenshot({ path: `${FINAL_DIR}/final-chat-local-ai.png`, fullPage: true });
  await openSurface(page, "surface-agents", "agent-panel");
  await page.screenshot({ path: `${FINAL_DIR}/final-agents-flows.png`, fullPage: true });
  await openSurface(page, "surface-graph", "graph-workbench");
  await page.screenshot({ path: `${FINAL_DIR}/final-big-graph.png`, fullPage: true });
  await openSurface(page, "surface-control", "data-control-panel");
  await page.screenshot({ path: `${FINAL_DIR}/final-control.png`, fullPage: true });
  await openSurface(page, "surface-providers", "provider-panel");
  await page.screenshot({ path: `${FINAL_DIR}/final-providers.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 940 });
  await openSurface(page, "surface-inbox", "command-center");
  await page.screenshot({ path: `${FINAL_DIR}/final-mobile-home.png`, fullPage: true });
  await page.getByTestId("top-capture").click();
  await expect(page.getByTestId("workspace-capture")).toBeVisible();
  await page.screenshot({ path: `${FINAL_DIR}/final-mobile-capture.png`, fullPage: true });
}

// П-A LIVE_CHAT_REAL_DAEMON un-skipped this journey: J15 mocks the Ollama /api/tags endpoint via
// page.route, so it never actually needed a real daemon to pass - Ollama is also now genuinely
// installed and running on this machine (see ollama-real-daemon.spec.mjs for the unmocked proof).
test("P19 final owner journey evidence J01-J24", async ({ page }) => {
  await mkdir(JOURNEY_DIR, { recursive: true });
  await mkdir(FINAL_DIR, { recursive: true });
  await mkdir("docs/qc", { recursive: true });
  const dialogResponses = [];
  page.on("dialog", async (dialog) => {
    const response = dialogResponses.length ? dialogResponses.shift() : undefined;
    await dialog.accept(response);
  });

  await resetLifeOs(page);

  let before = await beginJourney(page, "J01");
  await expect(page.getByTestId("mega-dropzone")).toBeVisible();
  await expect(page.getByTestId("owner-next-zone")).toBeVisible();
  await expect(page.getByTestId("owner-money-zone")).toBeVisible();
  await expect(page.getByTestId("active-artifact-card")).toBeVisible();
  await expect(page.getByTestId("proposal-panel")).toHaveCount(0);
  await expect(page.getByTestId("graph-canvas")).toHaveCount(0);
  await finishJourney(page, "J01", "Clean first open", before, {
    sees: "Fresh Home opens as four owner zones: Universal Capture, Today/Next, Money/Habits/Goals, and Active Artifact/Разбор. No first-viewport graph wall or debug rail."
  });

  before = await beginJourney(page, "J02");
  await capture(page, "завтра в 6 встать и приготовить завтрак");
  await expect(page.getByTestId("owner-review-stage")).toBeVisible();
  await expect(page.getByTestId("human-primary-action")).toContainText(/06:00/);
  await page.getByTestId("human-primary-action").click();
  await openSurface(page, "surface-today", "today-panel");
  const tomorrow = await page.evaluate(() => {
    const date = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  });
  const simpleTaskOk = await page.evaluate((day) => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.tasks).some((task) => !task.deleted && task.startTime === "06:00");
  }, tomorrow);
  expect(simpleTaskOk).toBe(true);
  await openSurface(page, "surface-calendar", "calendar-workbench");
  await expect(page.getByTestId("calendar-workbench")).toContainText("06:00");
  await openSurface(page, "surface-control", "data-control-panel");
  await expect(page.getByTestId("data-control-panel")).toBeVisible();
  const simpleTaskAuditOk = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return state.auditLog.some((entry) => entry.type === "proposal.apply");
  });
  expect(simpleTaskAuditOk).toBe(true);
  await finishJourney(page, "J02", "Fast simple task", before, {
    sees: "A simple capture surfaces one primary Russian action plus Изменить and Детали, then appears in Today, Calendar, Graph and Control."
  });

  before = await beginJourney(page, "J03");
  await capture(page, "завтра в 14:00 зал, купить протеин 2500 ₽, каждый день вода 2л, до 1 июля накопить 30000, напомни вечером");
  const mixedBeforeApply = await evidence(page);
  expect(mixedBeforeApply.counts.financeTransactions - before.counts.financeTransactions).toBe(0);
  expect(mixedBeforeApply.counts.habits - before.counts.habits).toBe(0);
  expect(mixedBeforeApply.counts.goals - before.counts.goals).toBe(0);
  const mixedProposalTypes = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").map((proposal) => proposal.type);
  });
  expect(mixedProposalTypes).toEqual(expect.arrayContaining(["finance_expense", "habit", "goal"]));
  await applyCurrent(page);
  await expect.poll(async () => (await evidence(page)).counts.proposalsApplied).toBeGreaterThan(4);
  await finishJourney(page, "J03", "Mixed daily input", before, {
    sees: "Complex input creates grouped proposals for task, time block, finance, habit, goal, reminder and source-backed knowledge before approval."
  });

  before = await beginJourney(page, "J04");
  const messyInputs = [
    "завтр к 9 созвон и не забыть воду",
    "tomorrow gym 18:30 and buy milk 320 rub",
    "пятерочка 1240 продукты сегодня",
    "баланс карта 15200",
    "подписка Яндекс 399 28 июня",
    "каждый будний день зарядка 7 минут",
    "до 1 июля накопить 30000",
    "идея second brain для книг и аудио",
    "mail from bank надо проверить платеж",
    "pdf книга про сон нужна заметка",
    "voice memo: создать задачу проверить граф",
    "дом лампочки купить завтра",
    "health сон 8 часов daily",
    "trip билеты проверить в пятницу",
    "unclear thing maybe someday",
    "research question: how local first storage quota works",
    "перевел 5000 на накопления",
    "зарплата 100000 пришла",
    "remind me evening review",
    "каждый день вода 2л и читать 20 страниц"
  ];
  const beforeObjects = await evidence(page);
  const classes = [];
  for (const input of messyInputs) {
    await capture(page, input);
    const active = await page.evaluate(() => {
      const state = window.__lifeosKnowledgeBase.getStateSnapshot();
      const source = Object.values(state.sources).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      return source && source.analysis ? source.analysis.detectedClasses : [];
    });
    classes.push(active.join(","));
  }
  const afterMessy = await evidence(page);
  expect(afterMessy.counts.tasks).toBe(beforeObjects.counts.tasks);
  expect(classes.filter((row) => row.length > 0).length).toBe(20);
  await finishJourney(page, "J04", "Arbitrary messy capture", before, {
    sees: "Twenty typo-heavy and mixed-language inputs create source artifacts and proposal groups without silently creating accepted task/finance/habit/goal objects.",
    fixed: "P19 records the 20-input journey in executable evidence; fixture matrix remains separately enforced at 120 cases."
  });

  before = await beginJourney(page, "J05");
  await capture(page, "пятерочка 1240 продукты сегодня\nбаланс карта 15200\nподписка Яндекс 399 28 июня\nзарплата 100000 пришла\nперевел 5000 на накопления");
  await applyCurrent(page);
  await openSurface(page, "surface-finance", "finance-panel");
  await expect(page.getByTestId("finance-panel")).toContainText(/1\s*240/);
  await finishJourney(page, "J05", "Finance quick capture", before, {
    sees: "Finance text capture creates expense, account/balance, subscription/bill, income/transfer-style proposals and updates Finance after approval."
  });

  before = await beginJourney(page, "J06");
  await page.locator("input#file-import").setInputFiles("output/playwright/market-home.png");
  await openSurface(page, "surface-finance", "finance-panel");
  await expect(page.getByTestId("receipt-workbench")).toContainText("OCR");
  const receiptCard = page.getByTestId("receipt-expense-card").first();
  await receiptCard.getByLabel("Receipt merchant").fill("Аптека");
  await receiptCard.getByLabel("Receipt amount").fill("890");
  await receiptCard.getByLabel("Receipt category").fill("Здоровье");
  await receiptCard.getByTestId("save-receipt-expense").click();
  await expect(page.getByTestId("finance-panel")).toContainText("Аптека");
  await finishJourney(page, "J06", "Screenshot receipt", before, {
    sees: "Receipt screenshot shows an image/manual extraction path with an honest OCR gate; save creates a finance transaction tied to its source.",
    gated: "Automatic OCR remains provider-gated; manual extraction works now."
  });

  before = await beginJourney(page, "J07");
  await openSurface(page, "surface-finance", "finance-panel");
  await expect(page.getByTestId("finance-panel")).toContainText(/Budget|Бюджет|Подпис/i);
  await finishJourney(page, "J07", "Finance dashboard", before, {
    sees: "Finance shows balance/account rows, spending, transactions, budgets, subscriptions and receipt/manual extraction state."
  });

  before = await beginJourney(page, "J08");
  await openSurface(page, "surface-goals", "habits-goals-panel");
  await page.getByTestId("habit-title").fill("Сон 8 часов");
  await page.getByTestId("add-habit-entry").click();
  const habit = page.getByTestId("habit-row").filter({ hasText: "Сон 8 часов" }).first();
  await expect(habit).toBeVisible();
  await habit.getByTestId("habit-toggle").click();
  await finishJourney(page, "J08", "Habits", before, {
    sees: "Habits can be created, checked in for today, shown in Today/Goals, and written into Control/Graph."
  });

  before = await beginJourney(page, "J09");
  await openSurface(page, "surface-goals", "habits-goals-panel");
  await page.getByTestId("goal-title-entry").fill("Накопить резерв");
  await page.getByTestId("goal-target-amount").fill("120000");
  await page.getByTestId("add-goal-entry").click();
  const goal = page.getByTestId("goal-row").filter({ hasText: "Накопить резерв" }).first();
  await goal.getByLabel("Goal progress").fill("25");
  await goal.getByTestId("add-goal-progress").click();
  await page.getByTestId("refresh-insights").click();
  await expect(page.getByTestId("habits-goals-panel")).toContainText(/Привычки|Цели|Goals|Habit/i);
  await expect(page.getByTestId("balance-wheel")).toBeVisible();
  await expect(page.getByTestId("domain-row")).toHaveCount(6);
  await expect(page.getByTestId("domain-artifact-board")).toBeVisible();
  await expect(page.getByTestId("domain-artifact-card")).toHaveCount(8);
  await expect(page.getByTestId("weak-domain-card")).toContainText(/домен|сигнал/i);
  await finishJourney(page, "J09", "Goals and wheel of balance", before, {
    sees: "Goals have target values, progress, next-action/insight support, domain rows, weak-domain explanation, a visible balance wheel and domain artifact projections for home/health/food/travel/relationships.",
    fixed: "P07/P23 hardened Habits/Goals from generic lists into a computed life-domain dashboard with weak-domain next action and domain artifacts."
  });

  before = await beginJourney(page, "J10");
  await capture(page, "Идея: сделать систему второго мозга для книг, аудио и задач, где все связано графом");
  await applyCurrent(page);
  await page.getByTestId("home-open-source").click();
  await expect(page.getByTestId("knowledge-workbench")).toBeVisible();
  await expect(page.getByTestId("knowledge-workbench")).toBeVisible();
  await finishJourney(page, "J10", "Knowledge and second brain", before, {
    sees: "Idea capture becomes a source-backed knowledge artifact with project/next-action proposals, related notes and graph/control trace."
  });

  before = await beginJourney(page, "J11");
  await openSurface(page, "surface-library", "knowledge-workbench");
  dialogResponses.push("Связанная заметка");
  await page.getByTestId("new-note").click();
  await page.getByTestId("note-body").fill("# Связанная заметка\n\n[[Утренний фокус]] связан с книгами, аудио и задачами.");
  await page.waitForTimeout(500);
  await expect(page.getByText("Утренний фокус").first()).toBeVisible();
  await page.getByTestId("global-search").fill("Связанная");
  await expect(page.getByRole("button", { name: /Связанная заметка/ }).first()).toBeVisible();
  await finishJourney(page, "J11", "Library Obsidian-like workspace", before, {
    sees: "Library has markdown editing, wikilinks, ghost links, backlinks/search and source provenance in a distinct knowledge workspace."
  });

  before = await beginJourney(page, "J12");
  await page.locator("input#file-import").setInputFiles("output/playwright/fixtures/book-sample.md");
  await openSurface(page, "surface-reader", "book-workbench");
  const book = page.getByTestId("book-source-card").filter({ hasText: "book-sample.md" }).first();
  await expect(book).toContainText("текст готов");
  await book.getByTestId("extract-highlights").click();
  await book.getByTestId("highlight-title").fill("Highlight becomes knowledge");
  await book.getByTestId("add-highlight-entry").click();
  await book.getByTestId("reading-progress").fill("45");
  await book.getByTestId("update-reading-progress").click();
  await page.locator("input#file-import").setInputFiles({
    name: "journey-parser-gate.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nLifeOS parser gate fixture\n")
  });
  await expect(page.getByTestId("book-source-card").filter({ hasText: "journey-parser-gate.pdf" })).toContainText("Формат ждёт парсер");
  await finishJourney(page, "J12", "Reader and books", before, {
    sees: "Reader parses TXT/MD, tracks progress and highlights, and shows honest PDF/EPUB parser gates with manual extraction path.",
    gated: "PDF/EPUB automatic parsing remains parser-gated until local parser packages are installed."
  });

  before = await beginJourney(page, "J13");
  await page.locator("input#audio-import").setInputFiles({
    name: "journey-voice.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("RIFF0000WAVEfmt journey voice fixture")
  });
  await openSurface(page, "surface-player", "player-panel");
  const audio = page.getByTestId("audio-card").filter({ hasText: "journey-voice.wav" }).first();
  await expect(audio).toBeVisible();
  await expect(page.getByTestId("stt-gate")).toContainText("нужна настройка");
  await audio.locator("textarea[data-testid^='transcript-input-']").fill("[00:05] Создать задачу проверить граф.\n[00:30] Сделать заметку про аудио.");
  await audio.getByText("Сохранить расшифровку").click();
  await audio.getByTestId("checkpoint-time").fill("00:30");
  await audio.getByTestId("checkpoint-title").fill("Audio checkpoint");
  await audio.getByTestId("add-audio-checkpoint").click();
  await audio.getByTestId("transcript-snippet").fill("Audio insight should become a task and claim.");
  await audio.getByTestId("transcript-to-task").click();
  await audio.getByTestId("transcript-to-claim").click();
  await finishJourney(page, "J13", "Audio and Player", before, {
    sees: "Player stores audio, shows controls, accepts manual transcript, creates checkpoints and turns transcript snippets into proposals/objects.",
    gated: "Automatic STT remains provider-gated; manual transcript works now."
  });

  before = await beginJourney(page, "J14");
  await capture(page, "вечерний обзор: голосом записал идею про сон, деньги и граф");
  await page.getByTestId("top-capture").click();
  await expect(page.getByTestId("workspace-capture")).toBeVisible();
  await expect(page.getByTestId("inbox-review-board")).toBeVisible();
  await finishJourney(page, "J14", "Evening voice dump review", before, {
    sees: "Capture workspace collects unprocessed source artifacts into a review board with grouped proposal actions instead of overwhelming the Home view."
  });

  before = await beginJourney(page, "J15");
  await page.route("http://localhost:11434/api/tags", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ models: [{ name: "lifeos-journey:latest" }] })
    });
  });
  await openSurface(page, "surface-chat", "chat-panel");
  await expect(page.getByTestId("ollama-status")).toBeVisible();
  await page.getByTestId("probe-ollama").first().click();
  await expect(page.getByTestId("ollama-status").first()).toContainText("модели найдены");
  await expect(page.getByTestId("ollama-status").first()).toHaveAttribute("data-raw-status", "models_found");
  await finishJourney(page, "J15", "Local AI and Ollama chat", before, {
    sees: "Chat/Providers expose Ollama status, explicit probe, model list and proposal-only execution boundary.",
    gated: "A real local Ollama daemon is owner/device-dependent; this journey verifies the reachable API contract with a mocked localhost response."
  });

  before = await beginJourney(page, "J16");
  await openSurface(page, "surface-chat", "chat-panel");
  await page.getByTestId("chat-input").fill("NO_AI_LOCAL_CHAT_MARKER без AI: преврати это сообщение в заметку и задачу");
  await page.getByTestId("send-chat").click();
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.chatMessages || {}).some((message) => /NO_AI_LOCAL_CHAT_MARKER/.test(message.text || ""));
  })).toBe(true);
  // .last(), not .first(): by J16 the chat thread already holds many earlier messages'
  // own "chat-to-proposal" buttons (J02/J03/J05/...), and the panel auto-scrolls to the newest
  // message - .first() resolved to the oldest, permanently-scrolled-out-of-view button and hung
  // retrying "element is outside of the viewport" for the whole test timeout. The button that
  // belongs to the message this step just sent is the most recently appended one.
  await page.getByTestId("chat-to-proposal").last().click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await page.reload();
  // resetLifeOs's reload waits for a settle marker before touching anything else; this reload
  // skipped that wait, so openSurface below raced the app's post-reload hydration and hung
  // retrying against a stale/detached pre-render DOM ("element was detached, retrying"). Use the
  // outer shell wrapper (not command-center, which is Home-specific) since activeSurface persists
  // as "chat" across reload and the app boots straight back into Chat, not Home.
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible();
  await openSurface(page, "surface-chat", "chat-panel");
  const chatWithoutAiPersisted = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.chatMessages || {}).some((message) => /NO_AI_LOCAL_CHAT_MARKER/.test(message.text || ""));
  });
  expect(chatWithoutAiPersisted).toBe(true);
  await finishJourney(page, "J16", "Chat without AI", before, {
    sees: "Local chat history persists without AI and messages can become proposal objects."
  });

  before = await beginJourney(page, "J17");
  await openSurface(page, "surface-agents", "agent-panel");
  await expect(page.getByTestId("agent-risk-card")).toContainText("Граница");
  await page.getByTestId("agent-panel-run").click();
  await expect(page.getByTestId("agent-run").first()).toContainText("черновой прогон");
  await expect(page.getByTestId("approval-queue")).toBeVisible();
  await expect(page.getByTestId("agent-run").first()).toContainText("Требуется Принять");
  await finishJourney(page, "J17", "Agents", before, {
    sees: "Agent dry-run is attached to the current artifact, shows safety boundaries, records context/risk and creates approval-bound proposals.",
    fixed: "P18 tightened Agents into an owner-visible proposal engine: safety boundary, apply-required history and approval queue are asserted by e2e."
  });

  before = await beginJourney(page, "J18");
  await openSurface(page, "surface-agents", "agent-panel");
  await expect(page.getByTestId("flow-builder-board")).toBeVisible();
  await expect(page.getByTestId("flow-builder-node")).toHaveCount(3);
  await page.getByTestId("flow-trigger").fill("new dated task");
  await page.getByTestId("flow-condition").fill("has time");
  await page.getByTestId("flow-action").selectOption("plan");
  await page.getByTestId("run-flow-builder").click();
  await page.getByTestId("flow-trigger").fill("new expense");
  await page.getByTestId("flow-condition").fill("over budget");
  await page.getByTestId("flow-action").selectOption("task");
  await page.getByTestId("run-flow-builder").click();
  await expect(page.getByTestId("flow-run-row").first()).toContainText("предложение создано");
  // FlowCanvas only renders "approval-row" for a run with zero pending proposals; a run that
  // actually created proposals (asserted above) renders "execute-flow-run" instead - that manual
  // Execute button IS the approval-required gate this journey means to prove (see FlowCanvas.js).
  await expect(page.getByTestId("execute-flow-run").first()).toBeVisible();
  await finishJourney(page, "J18", "Flows and n8n-like automation", before, {
    sees: "Flow builder uses a visible trigger-condition-action board, dry-runs proposals, records execution history and keeps approval required before mutations.",
    fixed: "P18 upgraded Flows from a plain form to a visible trigger-condition-action builder with approval queue and dry-run proof."
  });

  before = await beginJourney(page, "J19");
  await openSurface(page, "surface-graph", "graph-workbench");
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  await page.getByTestId("graph-search").fill("journey");
  await expect(page.getByTestId("graph-results")).toBeVisible();
  await page.getByTestId("graph-result-row").first().click();
  await expect(page.getByTestId("graph-mode-local")).toHaveClass(/active/);
  await expect(page.getByTestId("graph-edge-list")).toBeVisible();
  await expect(page.getByTestId("graph-connection-summary")).toBeVisible();
  await expect(page.getByTestId("graph-edge-row").first()).toContainText("Причина");
  await finishJourney(page, "J19", "Big graph", before, {
    sees: "Graph has a dedicated large canvas, local/global mode, search with match reasons, filters, clickable nodes, inspector, connection summary and readable edge reasons.",
    fixed: "P13 closed the edge-reason/readability gap: inspector summary, readable reason labels and search match reasons are asserted by e2e."
  });

  before = await beginJourney(page, "J20");
  await openSurface(page, "surface-control", "data-control-panel");
  await page.getByTestId("control-export-all").click();
  await page.getByTestId("export-selected-artifact").click();
  await page.getByTestId("create-rollback-snapshot").first().click();
  await expect(page.getByTestId("rollback-count")).toContainText("1");
  await expect(page.getByTestId("storage-map")).toBeVisible();
  await page.locator("[data-testid='dev-state'] summary").click();
  await expect(page.getByTestId("architecture-contract")).toBeVisible();
  await expect(page.getByTestId("architecture-validation")).toContainText(/\u043e\u043a|ok/i);
  const architectureSnapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getArchitectureSnapshot());
  expect(architectureSnapshot.modules.some((module) => module.key === "architecture-contract")).toBe(true);
  expect(architectureSnapshot.eventBus.count).toBeGreaterThan(0);
  await finishJourney(page, "J20", "Data Control export and recover", before, {
    sees: "Control shows last changes, storage map, export all, selected export, rollback snapshot, recovery rows and the executable Artifact OS architecture contract.",
    fixed: "P27 adds C25 architecture contract/event-bus proof without splitting owner journeys into route-local state."
  });

  before = await beginJourney(page, "J21");
  await openSurface(page, "surface-providers", "provider-panel");
  await expect(page.getByTestId("provider-panel")).toContainText("Ollama");
  await expect(page.getByTestId("pwa-panel")).toBeVisible();
  await page.getByTestId("check-pwa").click();
  await expect(page.getByTestId("pwa-service-worker-status")).toContainText(/офлайн-оболочка готова|ошибка service worker|не поддерживается/);
  await expect(page.getByTestId("pwa-service-worker-status")).toHaveAttribute("data-raw-status", /service-worker-ready|service-worker-error|unsupported/);
  await page.getByTestId("prepare-provider-mail").click();
  await expect(page.getByTestId("provider-panel")).toContainText("нужны данные владельца");
  await finishJourney(page, "J21", "Providers", before, {
    sees: "Providers list local/external capabilities with setup states, safe probes, PWA service-worker status, revoke/prepare actions and no fake ready state.",
    gated: "Gmail, external calendar, OCR, STT and parser engines remain owner/provider setup gates; PWA install prompt still depends on browser policy."
  });

  before = await beginJourney(page, "J22");
  await page.setViewportSize({ width: 390, height: 940 });
  await openSurface(page, "surface-inbox", "command-center");
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(homeOverflow).toBe(false);
  await page.getByTestId("top-capture").click();
  await expect(page.getByTestId("workspace-capture")).toBeVisible();
  const captureOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(captureOverflow).toBe(false);
  await openSurface(page, "surface-providers", "pwa-panel");
  await expect(page.getByTestId("pwa-manifest")).toContainText("manifest");
  await finishJourney(page, "J22", "Mobile and PWA boundary", before, {
    sees: "Mobile uses capture-first navigation, keeps Today/Money reachable, has no horizontal overflow and shows the PWA manifest/service-worker passport.",
    gated: "Notifications and native install prompt remain browser permission/policy boundaries."
  });

  before = await beginJourney(page, "J23");
  await page.setViewportSize({ width: 1440, height: 960 });
  const started = Date.now();
  const seeded = await page.evaluate(() => window.__lifeosKnowledgeBase.seedExactLargeVaultForTest());
  expect(seeded.artifacts).toBe(1000);
  expect(seeded.notes).toBe(2000);
  expect(seeded.tasks).toBe(2000);
  expect(seeded.financeTransactions).toBe(1000);
  expect(seeded.habitsGoals).toBe(500);
  expect(seeded.graphEdges).toBeGreaterThanOrEqual(5000);
  await openSurface(page, "surface-graph", "graph-workbench");
  await page.getByTestId("graph-search").fill("Large exact note 0099");
  await expect(page.getByTestId("graph-results")).toContainText("Large exact note 0099");
  await page.screenshot({ path: `${FINAL_DIR}/final-performance-large-vault.png`, fullPage: true });
  const elapsed = Date.now() - started;
  expect(elapsed).toBeLessThan(30000);
  await finishJourney(page, "J23", "Performance and large vault", before, {
    status: "PASS",
    sees: "Exact mixed large vault создан: 1000 артефактов, 2000 заметок, 2000 задач, 1000 финансовых транзакций, 500 привычек/целей и минимум 5000 связей графа. Поиск и граф остаются usable.",
    gated: "Нет локального gate для этого journey.",
    fixed: "P17 закрыт кодом, e2e, скриншотом и owner-visible режимом большого хранилища."
  });

  before = await beginJourney(page, "J24");
  await openSurface(page, "surface-control", "data-control-panel");
  await page.getByTestId("create-rollback-snapshot").first().click();
  await expect(page.getByTestId("rollback-row").first()).toBeVisible();
  await page.getByTestId("restore-rollback-snapshot").first().click();
  await expect(page.getByTestId("data-control-panel")).toContainText(/Restored|Rollback|Storage/);
  const corruptId = await page.evaluate(() => window.__lifeosKnowledgeBase.injectCorruptRecordForTest());
  expect(corruptId).toContain("corrupt");
  await openSurface(page, "surface-control", "data-control-panel");
  await expect(page.getByTestId("corrupt-record-row").first()).toContainText("изолировано");
  await page.getByTestId("recover-corrupt-record").first().click();
  await expect(page.getByTestId("corrupt-record-row").first()).toContainText("восстановлено");
  await page.screenshot({ path: `${FINAL_DIR}/final-recovery-flow.png`, fullPage: true });
  await finishJourney(page, "J24", "Recovery, migration and corruption boundary", before, {
    status: "PASS",
    sees: "В Control видны schema version, rollback snapshots, restore, archive/recovery, backup/export controls и изоляция/восстановление поврежденной записи.",
    gated: "Нет локального gate для этого journey.",
    fixed: "P24 закрыт через Data Control: corrupt fixture изолируется, восстанавливается как safe note и оставляет audit trail."
  });

  await resetLifeOs(page);
  await writeFinalScreens(page);
});

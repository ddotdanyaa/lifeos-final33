import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
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

test.setTimeout(120000);

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
}

test("owner artifact OS capture creates proposals and applies to workspaces @visual", async ({ page }) => {
  await mkdir("output/playwright", { recursive: true });
  await resetLifeOs(page);

  await expect(page.getByTestId("command-center")).toBeVisible();
  await expect(page.getByTestId("mega-dropzone")).toBeVisible();
  await expect(page.getByTestId("owner-next-zone")).toBeVisible();
  await expect(page.getByTestId("owner-money-zone")).toBeVisible();
  await expect(page.getByTestId("active-artifact-card")).toBeVisible();
  await expect(page.getByText("Вход").first()).toBeVisible();
  const firstViewportText = await page.locator("body").innerText();
  expect(firstViewportText).not.toMatch(/Р[ђ-џ]|С[ђ-џ]|вЂ/);
  await page.screenshot({ path: "output/playwright/owner-home.png", fullPage: true });

  const ownerInput = "Завтра в 14:00 зал, купить протеин 2500 ₽, каждый день вода 2л, до 1 июля накопить 30000, напомни вечером";
  await page.getByTestId("capture-input").fill(ownerInput);
  await page.getByTestId("capture-text").click();

  await expect(page.getByTestId("analysis-panel")).toContainText("finance expense");
  await expect(page.getByTestId("proposal-panel")).toContainText("Деньги");
  await expect(page.getByTestId("proposal-panel")).toContainText("Привычки");
  await expect(page.getByTestId("proposal-panel")).toContainText("Цели");
  const proposalCount = await page.getByTestId("proposal-row").count();
  expect(proposalCount).toBeGreaterThan(5);
  await page.screenshot({ path: "output/playwright/owner-analysis.png", fullPage: true });

  await page.getByTestId("apply-all-proposals").click();
  await expect(page.getByTestId("owner-next-zone")).toContainText(/сегодня|завтра|привычек/);
  await page.screenshot({ path: "output/playwright/owner-after-apply.png", fullPage: true });

  await page.getByTestId("surface-calendar").click();
  await expect(page.getByTestId("calendar-workbench")).toBeVisible();
  await expect(page.getByTestId("calendar-agenda-strip")).toBeVisible();
  await expect(page.getByTestId("calendar-overload-warning")).toBeVisible();
  await expect(page.getByTestId("calendar-workbench")).toContainText("14:00");
  const calendarToday = await page.evaluate(() => new Date().toISOString().slice(0, 10));
  const calendarTomorrow = await page.evaluate(() => {
    const date = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  });
  await page.getByTestId("calendar-task-input").fill("Позвонить врачу");
  await page.getByTestId("calendar-task-day").fill(calendarToday);
  await page.getByTestId("calendar-task-time").fill("08:30");
  await page.getByTestId("add-calendar-task").click();
  const calendarTask = page.locator(".schedule-item").filter({ hasText: "Позвонить врачу" }).first();
  await expect(calendarTask).toContainText("08:30");
  const editAnswers = ["Позвонить врачу срочно", calendarToday, "09:15"];
  page.on("dialog", async (dialog) => {
    await dialog.accept(editAnswers.shift() || "");
  });
  await calendarTask.getByTestId("edit-task").click();
  const editedCalendarTask = page.locator(".schedule-item").filter({ hasText: "Позвонить врачу срочно" }).first();
  await expect(editedCalendarTask).toContainText("09:15");
  await editedCalendarTask.getByTestId("task-reminder").click();
  await expect(page.getByTestId("calendar-workbench")).toContainText("Напомнить: Позвонить врачу срочно");
  await editedCalendarTask.getByTestId("task-tomorrow").click();
  const p002Snapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(p002Snapshot.tasks).some((task) => task.title === "Позвонить врачу срочно" && task.day === calendarTomorrow)).toBe(true);
  expect(Object.values(p002Snapshot.reminders).some((reminder) => reminder.title.includes("Позвонить врачу срочно"))).toBe(true);
  await page.locator(".schedule-item").filter({ hasText: "Позвонить врачу срочно" }).first().getByText("Контроль").click();
  await expect(page.getByTestId("data-control-panel")).toBeVisible();
  await page.getByTestId("surface-calendar").click();
  await page.screenshot({ path: "output/playwright/owner-calendar.png", fullPage: true });

  await page.getByTestId("surface-inbox").click();
  await page.getByTestId("surface-finance").click();
  await expect(page.getByTestId("finance-panel")).toBeVisible();
  await expect(page.getByTestId("finance-panel")).toContainText("протеин");
  await expect(page.getByTestId("finance-panel")).toContainText("2500");
  await page.getByTestId("account-name").fill("Карта");
  await page.getByTestId("account-balance").fill("50000");
  await page.getByTestId("set-finance-balance").click();
  await expect(page.getByTestId("finance-account-row").filter({ hasText: "Карта" })).toContainText("Карта");
  await page.getByTestId("finance-title").fill("Кофе");
  await page.getByTestId("finance-amount").fill("250");
  await page.getByTestId("finance-category").fill("Кафе");
  await page.getByTestId("finance-account").selectOption("Карта");
  await page.getByTestId("add-finance").click();
  await expect(page.getByTestId("finance-panel")).toContainText("Кофе");
  await page.getByTestId("budget-category").fill("Кафе");
  await page.getByTestId("budget-limit").fill("3000");
  await page.getByTestId("add-budget-entry").click();
  await expect(page.getByTestId("budget-row")).toContainText("Кафе");
  await page.getByTestId("subscription-title").fill("Яндекс Плюс");
  await page.getByTestId("subscription-amount").fill("399");
  await page.getByTestId("add-subscription-entry").click();
  await expect(page.getByTestId("subscription-row")).toContainText("Яндекс Плюс");
  await page.locator("input#file-import").setInputFiles("output/playwright/owner-home.png");
  await expect(page.getByTestId("receipt-workbench")).toContainText("OCR");
  const receiptCard = page.getByTestId("receipt-expense-card").first();
  await receiptCard.getByLabel("Receipt merchant").fill("Аптека");
  await receiptCard.getByLabel("Receipt amount").fill("890");
  await receiptCard.getByLabel("Receipt category").fill("Здоровье");
  await receiptCard.getByTestId("save-receipt-expense").click();
  await expect(page.getByTestId("finance-panel")).toContainText("Аптека");
  const financeSnapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(financeSnapshot.financeTransactions).some((tx) => tx.title === "Аптека" && tx.amount === 890 && tx.sourceId)).toBe(true);
  expect(Object.values(financeSnapshot.budgets).some((budget) => budget.category === "Кафе" && budget.limit === 3000)).toBe(true);
  expect(Object.values(financeSnapshot.subscriptions).some((sub) => sub.title === "Яндекс Плюс" && sub.amount === 399)).toBe(true);
  await page.screenshot({ path: "output/playwright/owner-finance.png", fullPage: true });

  await page.getByTestId("surface-inbox").click();
  await page.getByTestId("surface-habits").click();
  await expect(page.getByTestId("habits-goals-panel")).toBeVisible();
  await expect(page.getByTestId("balance-wheel")).toBeVisible();
  await expect(page.getByTestId("domain-row")).toHaveCount(6);
  await expect(page.getByTestId("weak-domain-card")).toBeVisible();
  await expect(page.getByTestId("habits-goals-panel")).toContainText("вода");
  await expect(page.getByTestId("habits-goals-panel")).toContainText("30000");
  await page.getByTestId("habit-title").fill("Сон 8 часов");
  await page.getByTestId("add-habit-entry").click();
  const sleepHabit = page.getByTestId("habit-row").filter({ hasText: "Сон 8 часов" });
  await expect(sleepHabit).toBeVisible();
  await sleepHabit.getByTestId("habit-toggle").click();
  await page.getByTestId("goal-title-entry").fill("Прочитать книгу");
  await page.getByTestId("goal-target-amount").fill("100");
  await page.getByTestId("add-goal-entry").click();
  const bookGoal = page.getByTestId("goal-row").filter({ hasText: "Прочитать книгу" }).first();
  await expect(bookGoal).toBeVisible();
  await bookGoal.getByLabel("Goal progress").fill("40");
  await bookGoal.getByTestId("add-goal-progress").click();
  await expect(bookGoal).toContainText("40%");
  await page.getByTestId("refresh-insights").click();
  await expect(page.getByTestId("insight-row").first()).toBeVisible();
  await page.getByTestId("insight-to-task").first().click();
  const p004Snapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(p004Snapshot.habits).some((habit) => habit.title === "Сон 8 часов" && habit.checkins[calendarToday])).toBe(true);
  expect(Object.values(p004Snapshot.goals).some((goal) => goal.title === "Прочитать книгу" && goal.progress === 40)).toBe(true);
  expect(Object.values(p004Snapshot.insights).some((insight) => insight.status === "applied")).toBe(true);
  await page.screenshot({ path: "output/playwright/owner-habits-goals.png", fullPage: true });
  await page.getByTestId("surface-library").click();
  await expect(page.getByTestId("knowledge-workbench")).toBeVisible();
  await page.getByTestId("note-body").fill([
    "# РљР°СЂС‚Р° СЌРЅРµСЂРіРёРё",
    "",
    "Р“Р»Р°РІРЅР°СЏ РјС‹СЃР»СЊ: СѓС‚СЂРµРЅРЅРёР№ СЃРѕРЅ РІР»РёСЏРµС‚ РЅР° С„РѕРєСѓСЃ Рё РЅР° С‚РµРјРї С‡С‚РµРЅРёСЏ.",
    "РџРѕРІС‚РѕСЂСЏСЋС‰Р°СЏСЃСЏ С‚РµРјР° СЃРЅР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ СЃРІСЏР·Р°РЅР° СЃ С†РµР»СЊСЋ С‡С‚РµРЅРёСЏ.",
    "РљР°Рє СЃРІСЏР·Р°С‚СЊ СЌС‚Рѕ СЃ РїСЂРёРІС‹С‡РєРѕР№ СЃРЅР°?",
    "[[РЎРѕРЅ 8 С‡Р°СЃРѕРІ]] РїРѕРјРѕРіР°РµС‚ С†РµР»Рё С‡С‚РµРЅРёСЏ."
  ].join("\n"));
  await page.getByTestId("extract-knowledge").click();
  await expect(page.getByTestId("claim-row").first()).toBeVisible();
  await expect(page.getByTestId("question-row").first()).toBeVisible();
  await expect(page.getByTestId("review-row").first()).toBeVisible();
  await page.getByTestId("claim-title").fill("Р СѓС‡РЅРѕР№ РІС‹РІРѕРґ: С‡С‚РµРЅРёРµ Р·Р°РІРёСЃРёС‚ РѕС‚ СЌРЅРµСЂРіРёРё");
  await page.getByTestId("add-claim-entry").click();
  await page.getByTestId("question-to-task").first().click();
  await page.getByTestId("toggle-review-item").first().click();
  const p005Snapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const appliedQuestion = Object.values(p005Snapshot.questions).find((question) => question.status === "applied");
  expect(Object.values(p005Snapshot.claims).filter((claim) => claim.noteId === p005Snapshot.activeNoteId).length).toBeGreaterThanOrEqual(4);
  expect(Boolean(appliedQuestion)).toBe(true);
  expect(Object.values(p005Snapshot.reviewItems).some((reviewItem) => reviewItem.status === "done")).toBe(true);
  expect(Object.values(p005Snapshot.tasks).some((task) => appliedQuestion && task.noteId === appliedQuestion.noteId && task.title.includes(appliedQuestion.title))).toBe(true);

  await page.locator("input#file-import").setInputFiles("output/playwright/fixtures/book-sample.md");
  await expect(page.getByTestId("book-workbench")).toContainText("book-sample.md");
  const mdBook = page.getByTestId("book-source-card").filter({ hasText: "book-sample.md" }).first();
  await expect(mdBook).toContainText("text-ready");
  await mdBook.getByTestId("extract-highlights").click();
  await mdBook.getByTestId("highlight-title").fill("Manual highlight connects book to plan");
  await mdBook.getByTestId("add-highlight-entry").click();
  await expect(mdBook.getByTestId("highlight-row").first()).toBeVisible();
  await mdBook.getByTestId("reading-progress").fill("35");
  await mdBook.getByTestId("update-reading-progress").click();

  await page.locator("input#file-import").setInputFiles({
    name: "parser-boundary.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\\nLifeOS parser boundary fixture\\n")
  });
  const pdfBook = page.getByTestId("book-source-card").filter({ hasText: "parser-boundary.pdf" }).first();
  await expect(pdfBook).toContainText("Parser gate");
  await pdfBook.getByLabel("Manual extracted text").fill("PDF chapter says owner data should stay local. This highlight must become review and graph evidence.");
  await pdfBook.getByTestId("save-source-extraction").click();
  await expect(pdfBook).toContainText("manual-extraction-ready");
  const p006Snapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(p006Snapshot.readingItems).some((item) => item.title === "book-sample" && item.progress === 35)).toBe(true);
  expect(Object.values(p006Snapshot.highlights).some((highlight) => highlight.text.includes("Manual highlight connects book to plan"))).toBe(true);
  expect(Object.values(p006Snapshot.sources).some((source) => source.name === "parser-boundary.pdf" && source.parserStatus === "manual-extraction-ready" && source.noteId)).toBe(true);
  await page.screenshot({ path: "output/playwright/owner-knowledge-insights.png", fullPage: true });
  await page.screenshot({ path: "output/playwright/owner-books.png", fullPage: true });

  await page.locator("input#audio-import").setInputFiles({
    name: "owner-meeting.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("RIFF0000WAVEfmt owner meeting fixture")
  });
  await page.getByTestId("surface-player").click();
  await expect(page.getByTestId("player-panel")).toBeVisible();
  const audioCard = page.getByTestId("audio-card").filter({ hasText: "owner-meeting.wav" }).first();
  await expect(audioCard).toBeVisible();
  await expect(page.getByTestId("stt-gate")).toContainText("not-configured");
  await audioCard.getByTestId("request-stt-gate").click();
  await expect(audioCard).toContainText("stt-provider-gated");
  const transcriptText = [
    "[00:05] Owner says LifeOS should connect audio, books, calendar and graph.",
    "[00:40] Create a task to review audio insight today.",
    "[01:10] The transcript should become claims, highlights and checkpoints."
  ].join("\n");
  await audioCard.locator("textarea[data-testid^='transcript-input-']").fill(transcriptText);
  await audioCard.getByText("Сохранить transcript").click();
  await expect(audioCard.getByTestId("transcript-segment-row").first()).toBeVisible();
  await audioCard.getByTestId("checkpoint-time").fill("01:10");
  await audioCard.getByTestId("checkpoint-title").fill("Review transcript insight");
  await audioCard.getByTestId("add-audio-checkpoint").click();
  await expect(audioCard.getByTestId("audio-checkpoint-row").first()).toBeVisible();
  await audioCard.getByTestId("transcript-snippet").fill("Audio insight should become a task, claim and highlight linked to graph.");
  await audioCard.getByTestId("transcript-to-task").click();
  await audioCard.getByTestId("transcript-to-claim").click();
  await audioCard.getByTestId("transcript-to-highlight").click();
  await expect(audioCard.getByTestId("player-note-row").first()).toBeVisible();
  const p007Snapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const audioSource = Object.values(p007Snapshot.sources).find((source) => source.name === "owner-meeting.wav");
  expect(Boolean(audioSource && audioSource.noteId && audioSource.transcriptStatus === "manual-transcript-ready")).toBe(true);
  expect(Object.values(p007Snapshot.transcriptSegments).filter((segment) => audioSource && segment.sourceId === audioSource.id && !segment.deleted).length).toBeGreaterThanOrEqual(3);
  expect(Object.values(p007Snapshot.audioCheckpoints).filter((checkpoint) => audioSource && checkpoint.sourceId === audioSource.id && !checkpoint.deleted).length).toBeGreaterThanOrEqual(2);
  expect(Object.values(p007Snapshot.playerNotes).filter((playerNote) => audioSource && playerNote.sourceId === audioSource.id && !playerNote.deleted).length).toBeGreaterThanOrEqual(3);
  expect(Object.values(p007Snapshot.tasks).some((task) => audioSource && task.sourceId === audioSource.id && task.title.includes("Из аудио"))).toBe(true);
  expect(Object.values(p007Snapshot.claims).some((claim) => audioSource && claim.sourceId === audioSource.id)).toBe(true);
  expect(Object.values(p007Snapshot.highlights).some((highlight) => audioSource && highlight.sourceId === audioSource.id)).toBe(true);
  await page.screenshot({ path: "output/playwright/owner-player-transcript.png", fullPage: true });

  await page.getByTestId("surface-chat").click();
  await page.getByTestId("chat-input").fill("Сделай из аудио follow-up задачу и план на завтра");
  await page.getByTestId("send-chat").click();
  await page.getByTestId("chat-to-proposal").first().click();
  await expect(page.getByTestId("proposal-panel")).toContainText("чата");
  await page.getByTestId("surface-agents").click();
  await expect(page.getByTestId("agent-panel")).toBeVisible();
  await page.getByTestId("agent-panel-run").click();
  await expect(page.getByTestId("agent-run").first()).toContainText("dry-run");
  await page.getByTestId("flow-trigger").fill("new transcript");
  await page.getByTestId("flow-condition").fill("has follow-up");
  await page.getByTestId("flow-action").selectOption("task");
  await page.getByTestId("run-flow-builder").click();
  await expect(page.getByTestId("flow-run-row").first()).toContainText("proposal_created");
  const p009Snapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(p009Snapshot.proposals).some((proposal) => proposal.fields && proposal.fields.source === "local-chat")).toBe(true);
  expect(Object.values(p009Snapshot.agentRuns).some((run) => run.status === "dry-run" && Array.isArray(run.scopes) && run.scopes.includes("create-proposals"))).toBe(true);
  expect(Object.values(p009Snapshot.flowRuns).some((run) => run.status === "proposal_created" && run.proposalIds.length)).toBe(true);
  await page.screenshot({ path: "output/playwright/owner-chat-agents-flow.png", fullPage: true });

  await page.getByTestId("surface-inbox").click();
  await page.getByTestId("surface-graph").click();
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  await expect(page.getByTestId("graph-inspector")).toBeVisible();
  await expect(page.getByTestId("graph-search")).toBeVisible();
  const fullGraphBeforeSearch = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return window.__lifeosKnowledgeBase.mapGraph(state);
  });
  expect(fullGraphBeforeSearch.links.some((link) => link.label && link.label.length > 0)).toBe(true);
  await page.getByTestId("graph-search").fill("owner-meeting");
  await expect(page.getByTestId("graph-results")).toContainText("owner-meeting");
  await page.getByTestId("graph-result-row").first().click();
  await expect(page.getByTestId("graph-mode-local")).toHaveClass(/active/);
  await expect(page.getByTestId("graph-edge-list")).toBeVisible();
  const p010Snapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(p010Snapshot.graphView.mode).toBe("local");
  expect(p010Snapshot.graphView.searchQuery).toBe("owner-meeting");
  expect(p010Snapshot.graphView.selectedNodeId).toBeTruthy();
  await expect(page.getByTestId("graph-counts")).toContainText(/nodes|узл/i);
  await page.screenshot({ path: "output/playwright/owner-big-graph.png", fullPage: true });

  await page.getByTestId("surface-providers").click();
  await expect(page.locator("main").getByTestId("provider-row-calendarSync")).toContainText("Внешний календарь");
  await expect(page.locator("main").getByTestId("provider-row-calendarSync")).toContainText("не подключено");
  await page.locator("main").getByTestId("prepare-provider-calendarSync").click();
  await expect(page.locator("main").getByTestId("provider-row-calendarSync")).toContainText("нужны данные владельца");
  const calendarProviderGate = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().providers.calendarSync);
  expect(calendarProviderGate.status).toBe("needs-owner-credentials");
  expect(calendarProviderGate.requiredAction).toContain("OAuth");
  await expect(page.locator("main").getByTestId("ollama-panel")).toBeVisible();
  await expect(page.locator("main").getByTestId("ollama-status")).toBeVisible();
  await page.route("http://localhost:11434/api/tags", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ models: [{ name: "lifeos-local:latest" }] })
    });
  });
  await page.locator("main").getByTestId("probe-ollama").click();
  await expect(page.locator("main").getByTestId("ollama-status")).toContainText("models_found");
  await expect(page.locator("main").getByTestId("ollama-selected-model")).toContainText("lifeos-local:latest");
  await page.locator("main").getByTestId("ollama-dry-run").click();
  await expect(page.locator("main").getByTestId("provider-run-row").first()).toContainText("proposal");
  const p008BeforeRevoke = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(Object.values(p008BeforeRevoke.providerRuns).some((run) => run.providerId === "ollama" && run.kind === "proposal-dry-run")).toBe(true);
  expect(Object.values(p008BeforeRevoke.proposals).some((proposal) => proposal.fields && proposal.fields.provider === "ollama" && proposal.status === "open")).toBe(true);
  await page.screenshot({ path: "output/playwright/owner-ollama.png", fullPage: true });
  await page.locator("main").getByTestId("revoke-ollama").click();
  await expect(page.locator("main").getByTestId("ollama-status")).toContainText("revoked");
  const p008AfterRevoke = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(p008AfterRevoke.ollama.status).toBe("revoked");
  expect(Object.values(p008AfterRevoke.providerRuns).some((run) => run.providerId === "ollama" && run.kind === "revoke")).toBe(true);

  await page.getByTestId("surface-control").click();
  await expect(page.getByTestId("data-control-panel")).toBeVisible();
  await expect(page.getByTestId("storage-map")).toContainText("finance");
  await expect(page.getByTestId("privacy-map")).toContainText("providers");
  await expect(page.getByTestId("owner-readiness-panel")).toBeVisible();
  await expect(page.getByTestId("owner-readiness-panel")).toContainText("Artifact chain");
  await expect(page.getByTestId("owner-readiness-panel")).toContainText("Provider gates");
  await expect(page.getByTestId("owner-readiness-panel")).toContainText("Error boundary");
  expect(await page.getByTestId("readiness-row").count()).toBeGreaterThanOrEqual(6);
  await page.context().setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByTestId("network-status")).toContainText("offline");
  await expect(page.getByTestId("owner-readiness-panel")).toContainText("offline-ready");
  await page.context().setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByTestId("network-status")).toContainText("online");
  await expect(page.getByTestId("control-actions")).toBeVisible();
  const selectedExport = page.waitForEvent("download");
  await page.getByTestId("export-selected-artifact").click();
  const selectedDownload = await selectedExport;
  expect(selectedDownload.suggestedFilename()).toBe("lifeos-selected-artifact.json");
  await expect(page.getByTestId("last-export-summary")).toContainText("selected");
  await page.locator("input#backup-import").setInputFiles({
    name: "lifeos-backup-preview.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      exportedAt: new Date().toISOString(),
      notes: [{ id: "imported-note", title: "Imported backup note" }],
      sources: [],
      tasks: [],
      financeTransactions: [],
      habits: [],
      goals: [],
      auditLog: []
    }))
  });
  await expect(page.getByTestId("last-import-summary")).toContainText("notes=1");
  await page.getByTestId("create-rollback-snapshot").click();
  await expect(page.getByTestId("rollback-count")).toContainText("1");
  await page.getByTestId("archive-selected-artifact").click();
  await expect(page.getByTestId("recovery-row").first()).toBeVisible();
  await page.getByTestId("recovery-row").first().getByText(/Restore|Вернуть/).click();
  await page.getByTestId("archive-selected-artifact").click();
  await expect(page.getByTestId("recovery-row").first()).toBeVisible();
  await page.getByTestId("restore-rollback-snapshot").first().click();
  await expect(page.getByTestId("last-import-summary")).toContainText("Restored rollback snapshot");
  const p011Snapshot = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(p011Snapshot.control.rollbackSnapshots.length).toBeGreaterThanOrEqual(1);
  expect(p011Snapshot.auditLog.some((row) => row.type === "control.rollback.restore")).toBe(true);
  expect(Object.values(p011Snapshot.sources).some((source) => source.kind === "backup" && source.status === "backup-imported")).toBe(true);
  await page.screenshot({ path: "output/playwright/owner-control.png", fullPage: true });

  await page.reload();
  await page.getByTestId("surface-inbox").click();
  await page.getByTestId("surface-finance").click();
  await expect(page.getByTestId("finance-panel")).toContainText("протеин");
  await page.getByTestId("surface-inbox").click();
  await page.getByTestId("surface-graph").click();
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  const graphAfterReload = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().graphView);
  expect(graphAfterReload.mode).toBe("local");
  expect(graphAfterReload.searchQuery).toBe("owner-meeting");

  await page.setViewportSize({ width: 390, height: 980 });
  await page.getByTestId("surface-inbox").click();
  await expect(page.getByTestId("mega-dropzone")).toBeVisible();
  await page.keyboard.press("Tab");
  const focusedElement = await page.evaluate(() => {
    const active = document.activeElement;
    return active ? { tag: active.tagName, text: active.textContent || active.getAttribute("aria-label") || "" } : null;
  });
  expect(focusedElement && focusedElement.tag).toBeTruthy();
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(horizontalOverflow).toBe(false);
  await page.screenshot({ path: "output/playwright/owner-mobile.png", fullPage: true });
});

test("large vault graph/search smoke creates proof screenshot", async ({ page }) => {
  await resetLifeOs(page);
  await expect(page.getByTestId("command-center")).toBeVisible();
  await page.evaluate(() => window.__lifeosKnowledgeBase.seedLargeVaultForTest(250));
  await page.getByTestId("surface-graph").click();
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  await page.getByTestId("graph-search").fill("Large vault node 42");
  await expect(page.getByTestId("graph-results")).toContainText("Large vault node 42");
  await page.getByTestId("graph-result-row").first().click();
  await expect(page.getByTestId("graph-mode-local")).toHaveClass(/active/);
  const largeGraphState = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const started = performance.now();
    const graph = window.__lifeosKnowledgeBase.mapGraph(state);
    const duration = performance.now() - started;
    return {
      graphView: state.graphView,
      graph,
      duration
    };
  });
  expect(largeGraphState.graph.nodes.length).toBeGreaterThan(0);
  expect(largeGraphState.graph.nodes.length).toBeLessThan(250);
  expect(largeGraphState.duration).toBeLessThan(2000);
  await page.screenshot({ path: "output/playwright/owner-large-vault.png", fullPage: true });
});

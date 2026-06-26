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
  await page.reload();
}

test("market-grade artifact OS rescue @market-owner @calendar @finance @reader-player @graph @ai-providers", async ({ page }) => {
  await mkdir("output/playwright", { recursive: true });
  page.on("dialog", async (dialog) => dialog.accept());

  await resetLifeOs(page);
  await expect(page.getByTestId("command-center")).toBeVisible();
  await expect(page.getByTestId("mega-dropzone")).toBeVisible();
  await expect(page.getByTestId("owner-next-zone")).toBeVisible();
  await expect(page.getByTestId("owner-money-zone")).toBeVisible();
  await expect(page.getByTestId("active-artifact-card")).toBeVisible();
  await expect(page.getByTestId("home-next-action")).toBeVisible();
  await expect(page.getByTestId("home-workspace-rail")).toBeHidden();
  await expect(page.getByTestId("app-ribbon")).toBeVisible();
  await expect(page.getByTestId("graph-canvas")).toHaveCount(0);
  await page.screenshot({ path: "output/playwright/market-home.png", fullPage: true });

  await page.getByTestId("open-command-palette").click();
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await expect(page.getByTestId("command-palette-row").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("command-palette")).toHaveCount(0);
  await page.keyboard.press("Control+K");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("command-palette")).toHaveCount(0);

  const ownerInput = [
    "Завтра в 14:00 спортзал.",
    "Купить протеин 2500 ₽, категория здоровье.",
    "Каждый день вода 2 литра.",
    "До 1 июля накопить 30000 ₽.",
    "Напомни вечером разобрать письмо от банка.",
    "Идея: написать заметку про сон, энергию и чтение."
  ].join(" ");

  await page.getByTestId("capture-input").fill(ownerInput);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("owner-review-stage")).toBeVisible();
  const beforeApply = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      tasks: Object.values(state.tasks).length,
      finance: Object.values(state.financeTransactions).length,
      habits: Object.values(state.habits).length,
      goals: Object.values(state.goals).length,
      proposals: Object.values(state.proposals).filter((proposal) => proposal.status === "open").length
    };
  });
  expect(beforeApply.tasks).toBe(0);
  expect(beforeApply.finance).toBe(0);
  expect(beforeApply.habits).toBe(0);
  expect(beforeApply.goals).toBe(0);
  expect(beforeApply.proposals).toBeGreaterThan(5);
  await page.screenshot({ path: "output/playwright/market-after-analysis.png", fullPage: true });

  await page.getByTestId("top-capture").click();
  await expect(page.getByTestId("workspace-capture")).toBeVisible();
  await expect(page.getByTestId("inbox-review-board")).toBeVisible();
  await page.screenshot({ path: "output/playwright/market-inbox-review.png", fullPage: true });

  await page.getByTestId("apply-all-proposals").click();
  await expect.poll(async () => {
    return page.evaluate(() => {
      const state = window.__lifeosKnowledgeBase.getStateSnapshot();
      return Object.values(state.proposals).filter((proposal) => proposal.status === "applied").length;
    });
  }).toBeGreaterThan(3);

  const afterApply = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const graph = window.__lifeosKnowledgeBase.mapGraph(state);
    return {
      tasks: Object.values(state.tasks).length,
      finance: Object.values(state.financeTransactions).length,
      habits: Object.values(state.habits).length,
      goals: Object.values(state.goals).length,
      auditApply: state.auditLog.some((row) => row.type === "proposal.apply"),
      edgeReasons: graph.links.filter((link) => link.label).length,
      graphNodes: graph.nodes.length
    };
  });
  expect(afterApply.tasks).toBeGreaterThan(0);
  expect(afterApply.finance).toBeGreaterThan(0);
  expect(afterApply.habits).toBeGreaterThan(0);
  expect(afterApply.goals).toBeGreaterThan(0);
  expect(afterApply.auditApply).toBe(true);
  expect(afterApply.edgeReasons).toBeGreaterThan(0);
  expect(afterApply.graphNodes).toBeGreaterThan(0);

  await page.getByTestId("open-command-palette").click();
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-palette-query").fill("вода");
  await page.getByTestId("save-current-search").click();
  await expect(page.getByTestId("saved-search-row")).toHaveCount(1);
  await page.getByTestId("saved-search-row").locator("button").first().click();
  await expect(page.getByTestId("global-search")).toHaveValue("вода");
  const commandPaletteProof = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const graph = window.__lifeosKnowledgeBase.mapGraph(state);
    return {
      savedSearches: Object.values(state.savedSearches || {}).filter((item) => !item.deleted).length,
      audit: state.auditLog.some((row) => row.type === "search.save" || row.type === "search.run"),
      graphNode: graph.nodes.some((node) => node.type === "saved-search"),
      graphReason: graph.links.some((link) => link.label === "saved-search-anchor" || link.label === "saved-search-match")
    };
  });
  expect(commandPaletteProof.savedSearches).toBe(1);
  expect(commandPaletteProof.audit).toBe(true);
  expect(commandPaletteProof.graphNode).toBe(true);
  expect(commandPaletteProof.graphReason).toBe(true);

  await page.getByTestId("surface-today").click();
  await expect(page.getByTestId("workspace-today")).toBeVisible();
  await expect(page.getByTestId("today-panel")).toBeVisible();
  await page.screenshot({ path: "output/playwright/market-today.png", fullPage: true });

  await page.getByTestId("surface-calendar").click();
  await expect(page.getByTestId("workspace-calendar")).toBeVisible();
  await expect(page.getByTestId("calendar-week")).toBeVisible();
  await expect(page.getByTestId("calendar-agenda-strip")).toBeVisible();
  await expect(page.getByTestId("calendar-overload-warning")).toBeVisible();
  await page.screenshot({ path: "output/playwright/market-calendar-week.png", fullPage: true });

  await page.getByTestId("surface-finance").click();
  await expect(page.getByTestId("workspace-finance")).toBeVisible();
  await expect(page.getByTestId("finance-panel")).toBeVisible();
  await page.locator("input#file-import").setInputFiles("output/playwright/market-home.png");
  await expect(page.getByTestId("receipt-workbench")).toBeVisible();
  await page.screenshot({ path: "output/playwright/market-finance.png", fullPage: true });

  await page.getByTestId("surface-goals").click();
  await expect(page.getByTestId("workspace-goals")).toBeVisible();
  await expect(page.getByTestId("habits-goals-panel")).toBeVisible();
  await expect(page.getByTestId("balance-wheel")).toBeVisible();
  await expect(page.getByTestId("domain-row")).toHaveCount(6);
  await expect(page.getByTestId("weak-domain-card")).toBeVisible();
  await expect(page.getByTestId("domain-artifact-board")).toBeVisible();
  await expect(page.getByTestId("domain-artifact-card")).toHaveCount(8);
  await expect(page.getByTestId("domain-artifact-board")).toContainText(/Дом|Еда|Поездки/);
  await page.screenshot({ path: "output/playwright/market-habits-goals-wheel.png", fullPage: true });

  await page.getByTestId("surface-library").click();
  await expect(page.getByTestId("workspace-library")).toBeVisible();
  await page.getByTestId("note-body").fill([
    "# Сон, чтение и энергия",
    "",
    "Главная мысль: сон влияет на фокус и скорость чтения.",
    "Как связать это с [[Вода 2 литра]] и целью чтения?"
  ].join("\n"));
  await page.getByTestId("extract-knowledge").click();
  await expect(page.getByTestId("knowledge-workbench")).toBeVisible();
  await page.screenshot({ path: "output/playwright/market-library-knowledge.png", fullPage: true });

  await page.locator("input#file-import").setInputFiles("output/playwright/fixtures/book-sample.md");
  await page.getByTestId("surface-reader").click();
  await expect(page.getByTestId("workspace-reader")).toBeVisible();
  await expect(page.getByTestId("book-workbench")).toBeVisible();
  await page.screenshot({ path: "output/playwright/market-reader.png", fullPage: true });

  await page.locator("input#audio-import").setInputFiles({
    name: "market-voice.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("RIFF0000WAVEfmt market voice fixture")
  });
  await page.getByTestId("surface-player").click();
  await expect(page.getByTestId("workspace-player")).toBeVisible();
  const audioCard = page.getByTestId("audio-card").filter({ hasText: "market-voice.wav" }).first();
  await expect(audioCard).toBeVisible();
  await audioCard.locator("textarea[data-testid^='transcript-input-']").fill("[00:05] Создать задачу проверить граф. [00:30] Сделать заметку про деньги и сон.");
  await audioCard.getByText("Сохранить расшифровку").click();
  await expect(audioCard.getByTestId("transcript-segment-row").first()).toBeVisible();
  await page.screenshot({ path: "output/playwright/market-player-transcript.png", fullPage: true });

  await page.getByTestId("surface-chat").click();
  await expect(page.getByTestId("workspace-chat")).toBeVisible();
  await expect(page.getByTestId("ollama-status")).toBeVisible();
  await page.getByTestId("chat-input").fill("Сделай proposal: связать аудио с задачей на завтра");
  await page.getByTestId("send-chat").click();
  await page.getByTestId("chat-to-proposal").first().click();
  await expect(page.getByTestId("proposal-panel")).toContainText(/proposal|предлож/i);
  await page.screenshot({ path: "output/playwright/market-chat-local-ai.png", fullPage: true });

  await page.getByTestId("surface-agents").click();
  await expect(page.getByTestId("workspace-agents")).toBeVisible();
  await page.getByTestId("agent-panel-run").click();
  await expect(page.getByTestId("agent-run").first()).toContainText("черновой прогон");
  await page.getByTestId("run-flow-builder").click();
  await expect(page.getByTestId("flow-run-row").first()).toContainText("предложение создано");
  await page.screenshot({ path: "output/playwright/market-agents-flows.png", fullPage: true });

  await page.getByTestId("surface-graph").click();
  await expect(page.getByTestId("workspace-hero-graph")).toBeVisible();
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  await page.getByTestId("graph-search").fill("market-voice");
  await expect(page.getByTestId("graph-results")).toContainText("market-voice");
  await page.getByTestId("graph-result-row").first().click();
  await expect(page.getByTestId("graph-mode-local")).toHaveClass(/active/);
  await expect(page.getByTestId("graph-edge-list")).toBeVisible();
  await page.screenshot({ path: "output/playwright/market-big-graph.png", fullPage: true });

  await page.getByTestId("surface-control").click();
  await expect(page.getByTestId("workspace-control")).toBeVisible();
  await expect(page.getByTestId("data-control-panel")).toBeVisible();
  await expect(page.getByTestId("storage-map")).toBeVisible();
  await expect(page.getByTestId("architecture-contract")).toBeVisible();
  await expect(page.getByTestId("architecture-validation")).toContainText("ок");
  const architectureProof = await page.evaluate(() => window.__lifeosKnowledgeBase.getArchitectureSnapshot());
  expect(architectureProof.collections.length).toBeGreaterThanOrEqual(30);
  expect(architectureProof.workspaces.length).toBeGreaterThanOrEqual(16);
  expect(architectureProof.modules.some((module) => module.key === "architecture-contract")).toBe(true);
  expect(architectureProof.stateAdapters.some((adapter) => adapter.key === "indexeddb-chunked")).toBe(true);
  expect(architectureProof.eventBus.count).toBeGreaterThan(0);
  await page.getByTestId("create-rollback-snapshot").first().click();
  await expect(page.getByTestId("rollback-count")).toContainText("1");
  await page.screenshot({ path: "output/playwright/market-control.png", fullPage: true });

  await page.getByTestId("surface-providers").click();
  await expect(page.getByTestId("workspace-providers")).toBeVisible();
  await expect(page.getByTestId("pwa-panel")).toBeVisible();
  await page.getByTestId("check-pwa").click();
  await expect(page.getByTestId("pwa-service-worker-status")).toContainText(/офлайн-оболочка готова|ошибка service worker|не поддерживается/);
  await expect(page.getByTestId("pwa-service-worker-status")).toHaveAttribute("data-raw-status", /service-worker-ready|service-worker-error|unsupported/);
  const pwaProof = await page.evaluate(async () => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const registration = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null;
    return {
      manifest: Boolean(document.querySelector("link[rel='manifest']")),
      serviceWorkerStatus: state.environment.serviceWorkerStatus,
      providerStatus: state.providers.pwa && state.providers.pwa.status,
      providerRun: Object.values(state.providerRuns || {}).some((run) => run.providerId === "pwa" && /service-worker-ready|service-worker-error|unsupported|supported/.test(run.status || "")),
      registration: Boolean(registration)
    };
  });
  expect(pwaProof.manifest).toBe(true);
  expect(pwaProof.serviceWorkerStatus).toMatch(/service-worker-ready|service-worker-error|unsupported/);
  expect(pwaProof.providerStatus).toBeTruthy();
  expect(pwaProof.providerRun).toBe(true);
  expect(pwaProof.registration || pwaProof.serviceWorkerStatus !== "service-worker-ready").toBe(true);
  await page.getByTestId("show-pwa-install").click();
  await expect(page.getByTestId("pwa-install-status")).toHaveAttribute("data-raw-status", /browser-menu-required|available|accepted|dismissed|prompted/);
  await expect(page.getByTestId("ollama-panel")).toBeVisible();
  await page.route("http://localhost:11434/api/tags", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ models: [{ name: "lifeos-market:latest" }] })
    });
  });
  await page.locator("main").getByTestId("probe-ollama").first().click();
  await expect(page.locator("main").getByTestId("ollama-status")).toContainText("модели найдены");
  await expect(page.locator("main").getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "models_found");
  await page.screenshot({ path: "output/playwright/market-providers.png", fullPage: true });

  await page.reload();
  await page.getByTestId("surface-finance").click();
  await expect(page.getByTestId("finance-panel")).toContainText("2500");

  await page.setViewportSize({ width: 390, height: 940 });
  await page.getByTestId("surface-inbox").click();
  await expect(page.getByTestId("command-center")).toBeVisible();
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(homeOverflow).toBe(false);
  await page.screenshot({ path: "output/playwright/market-mobile-home.png", fullPage: true });
  await page.getByTestId("top-capture").click();
  await expect(page.getByTestId("workspace-capture")).toBeVisible();
  const captureOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(captureOverflow).toBe(false);
  await page.screenshot({ path: "output/playwright/market-mobile-capture.png", fullPage: true });
});

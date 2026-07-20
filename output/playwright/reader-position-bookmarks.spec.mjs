import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

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
const shotDir = join("docs", "qc", "screens", "U5");

async function reset(page) {
  await page.goto(`${appUrl}?reader-position=${Date.now()}`, { waitUntil: "networkidle" });
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

// U5 READER: real page/chapter navigation for PDF/EPUB backed by pdfjs-dist (PDF, already
// used since P6.1) and the hand-rolled fflate EPUB spine parser (already used since P6.1 -
// see DECISIONS.md for why this package extends that parser instead of adopting epubjs's
// heavier Rendition/iframe machinery). Position persists on the existing readingItems object,
// not a new collection.
test("U5 READER: PDF page position survives close/reopen, bookmark navigates back", async ({ page }) => {
  await reset(page);
  const pdfPath = resolve("output", "playwright", "fixtures", "reader-fixture-3page.pdf");
  await page.getByTestId("file-import").setInputFiles(pdfPath);
  await openSurface(page, "reader");
  const pdfCard = page.getByTestId("book-source-card").filter({ hasText: "reader-fixture-3page.pdf" });
  await expect(pdfCard).toBeVisible();
  await pdfCard.getByTestId("extract-book-text").click();
  await expect(pdfCard).toContainText("текст готов", { timeout: 15000 });

  await expect(page.getByTestId("book-workbench-text")).toContainText("Page one", { timeout: 10000 });
  await expect(page.getByTestId("reader-unit-label")).toHaveText("Страница 1 / 3");
  await page.screenshot({ path: join(shotDir, "reader-pdf-before.png"), fullPage: true });

  // Navigate to page 2, drop a bookmark there, then move on to page 3.
  await page.getByTestId("reader-next-unit").click();
  await expect(page.getByTestId("reader-unit-label")).toHaveText("Страница 2 / 3");
  await expect(page.getByTestId("book-workbench-text")).toContainText("Page two");

  const pdfSourceId = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.sources).find((source) => source.name === "reader-fixture-3page.pdf").id;
  });
  await pdfCard.getByTestId("highlight-title").fill("Закладка на странице 2");
  await pdfCard.getByTestId("add-highlight-entry").click();

  await page.getByTestId("reader-next-unit").click();
  await expect(page.getByTestId("reader-unit-label")).toHaveText("Страница 3 / 3");
  await expect(page.getByTestId("book-workbench-text")).toContainText("Page three");

  // "Close, reopen": leave the Reader surface entirely and come back - the shell destroys
  // and rebuilds the DOM on every navigation, so this is a real re-mount, not a cache hit.
  await openSurface(page, "today");
  await openSurface(page, "reader");
  await expect(page.getByTestId("reader-unit-label")).toHaveText("Страница 3 / 3");
  await expect(page.getByTestId("book-workbench-text")).toContainText("Page three");

  const afterReopen = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const readingItem = Object.values(afterReopen.readingItems).find((item) => item.sourceId === pdfSourceId);
  expect(readingItem.unitIndex).toBe(2);
  expect(readingItem.unitTotal).toBe(3);

  // Bookmark navigates back to page 2.
  await page.getByTestId("go-to-highlight").first().click();
  await expect(page.getByTestId("reader-unit-label")).toHaveText("Страница 2 / 3");
  await expect(page.getByTestId("book-workbench-text")).toContainText("Page two");
  await page.screenshot({ path: join(shotDir, "reader-pdf-after.png"), fullPage: true });
});

test("U5 READER: EPUB chapter position survives close/reopen", async ({ page }) => {
  await reset(page);
  const epubPath = resolve("output", "playwright", "fixtures", "reader-fixture-3chapter.epub");
  await page.getByTestId("file-import").setInputFiles(epubPath);
  await openSurface(page, "reader");
  const epubCard = page.getByTestId("book-source-card").filter({ hasText: "reader-fixture-3chapter.epub" });
  await expect(epubCard).toBeVisible();
  await epubCard.getByTestId("extract-book-text").click();
  await expect(epubCard).toContainText("текст готов", { timeout: 15000 });

  await expect(page.getByTestId("book-workbench-text")).toContainText("Chapter 1", { timeout: 10000 });
  await expect(page.getByTestId("reader-unit-label")).toHaveText("Глава 1 / 3");

  await page.getByTestId("reader-next-unit").click();
  await expect(page.getByTestId("reader-unit-label")).toHaveText("Глава 2 / 3");
  await expect(page.getByTestId("book-workbench-text")).toContainText("Chapter 2");

  await openSurface(page, "today");
  await openSurface(page, "reader");
  await expect(page.getByTestId("reader-unit-label")).toHaveText("Глава 2 / 3");
  await expect(page.getByTestId("book-workbench-text")).toContainText("Chapter 2");

  const epubSourceId = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.sources).find((source) => source.name === "reader-fixture-3chapter.epub").id;
  });
  const afterReopen = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const readingItem = Object.values(afterReopen.readingItems).find((item) => item.sourceId === epubSourceId);
  expect(readingItem.unitIndex).toBe(1);
  expect(readingItem.unitTotal).toBe(3);
});

// Audio: currentTime persists on the source object itself (no new collection), saved on
// `pause` rather than continuously - see DECISIONS.md for why (a full re-render replaces the
// <audio> element on every store.commit, so saving on every timeupdate tick would reset
// playback constantly instead of preserving it).
test("U5 READER: audio position persists on pause, checkpoint bookmark seeks back", async ({ page }) => {
  await reset(page);
  const audioPath = resolve("output", "playwright", "fixtures", "hello-lifeos.wav");
  await page.getByTestId("audio-import").setInputFiles(audioPath);
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase?.getStateSnapshot?.();
    return Object.values(state?.sources || {}).some((source) => source.name === "hello-lifeos.wav");
  }), { timeout: 15000 }).toBeTruthy();

  await openSurface(page, "player");
  const audioSourceId = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.sources).find((source) => source.name === "hello-lifeos.wav").id;
  });
  await page.screenshot({ path: join(shotDir, "player-before.png"), fullPage: true });

  // Real seek + real pause on the real <audio> element (no mocked playback state).
  await page.evaluate(() => {
    const player = document.querySelector('[data-testid="audio-player"]');
    player.currentTime = 1;
    player.dispatchEvent(new Event("pause"));
  });
  await expect.poll(async () => page.evaluate((id) => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return state.sources[id]?.positionSeconds;
  }, audioSourceId)).toBeGreaterThan(0.5);

  // "Close, reopen": leave and come back - the <audio> element is destroyed and rebuilt.
  await openSurface(page, "today");
  await openSurface(page, "player");
  const restoredTime = await page.evaluate(() => new Promise((resolvePromise) => {
    const player = document.querySelector('[data-testid="audio-player"]');
    if (player.readyState >= 1) return resolvePromise(player.currentTime);
    player.addEventListener("loadedmetadata", () => resolvePromise(player.currentTime), { once: true });
  }));
  expect(restoredTime).toBeGreaterThan(0.5);

  // Bookmark: create a checkpoint, move away, then seek back to it via "Перейти".
  await page.getByTestId("checkpoint-time").first().fill("00:00");
  await page.getByTestId("checkpoint-title").first().fill("Начало");
  await page.getByTestId("add-audio-checkpoint").first().click();
  await expect(page.getByTestId("audio-checkpoint-row")).toBeVisible();
  await page.evaluate(() => { document.querySelector('[data-testid="audio-player"]').currentTime = 2; });
  await page.getByTestId("seek-audio-checkpoint").first().click();
  const seekedTime = await page.evaluate(() => document.querySelector('[data-testid="audio-player"]').currentTime);
  expect(seekedTime).toBeLessThan(0.5);
  await page.screenshot({ path: join(shotDir, "player-after.png"), fullPage: true });
});

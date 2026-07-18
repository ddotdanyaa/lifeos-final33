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
  await expect(page.getByTestId("command-center")).toBeVisible();
}

async function capture(page, text) {
  await page.getByTestId("surface-inbox").click();
  await page.getByTestId("capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("proposal-panel")).toBeVisible();
  return page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.sources).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].id;
  });
}

async function proposalsForSource(page, sourceId) {
  return page.evaluate((id) => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.proposals)
      .filter((proposal) => proposal.sourceId === id && proposal.status === "open")
      .map((proposal) => ({
        type: proposal.type,
        title: proposal.title,
        fields: proposal.fields,
        group: proposal.group
      }));
  }, sourceId);
}

// Skipped: written for the pre-chat-first shell (last touched by commit 8ae0dbcc, "Replace
// visible LifeOS shell with chat-first product UI", 2026-06-28) - expects a "proposal-panel"
// element the current shell doesn't render (replaced by the human-answer-card flow, covered
// by final-human-product.spec.mjs H02 and owner-rescue.spec.mjs). Kept for history, not gated.
test.skip("финальный owner parser: время, неоднозначность и отсутствие дублей", async ({ page }) => {
  await mkdir("output/playwright/final", { recursive: true });
  await resetLifeOs(page);
  const breakfastDate = await page.evaluate(() => {
    const breakfastOnly = "\u043f\u0440\u0438\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u0437\u0430\u0432\u0442\u0440\u0430\u043a";
    return window.__lifeosKnowledgeBase.parseDateFromText(breakfastOnly);
  });
  expect(breakfastDate).toBe("");

  const explicitId = await capture(page, "сегодня в 11 вечера заказать еду");
  const explicit = await proposalsForSource(page, explicitId);
  const explicitCalendar = explicit.find((proposal) => proposal.type === "calendar");
  expect(explicitCalendar?.fields?.day).toBe(new Date().toISOString().slice(0, 10));
  expect(explicitCalendar?.fields?.startTime).toBe("23:00");
  expect(explicitCalendar?.fields?.timeAmbiguous).toBeFalsy();

  const ambiguousId = await capture(page, "в 11 заказать еду");
  const ambiguous = await proposalsForSource(page, ambiguousId);
  const ambiguousCalendar = ambiguous.find((proposal) => proposal.type === "calendar");
  expect(ambiguousCalendar?.fields?.timeAmbiguous).toBe(true);
  expect(ambiguousCalendar?.fields?.startTime || "").toBe("");
  expect(ambiguousCalendar?.fields?.timeOptions).toEqual(expect.arrayContaining(["11:00", "23:00"]));
  await page.getByTestId("apply-all-proposals").click();
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterAmbiguousApply = await page.evaluate((id) => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      matchingBlocks: Object.values(state.planBlocks).filter((block) => block.sourceId === id && (block.startTime === "11:00" || block.startTime === "23:00")).length,
      needsChoiceAudit: state.auditLog.some((row) => row.type === "proposal.needs-owner-choice")
    };
  }, ambiguousId);
  expect(afterAmbiguousApply.matchingBlocks).toBe(0);
  expect(afterAmbiguousApply.needsChoiceAudit).toBe(true);

  const morningId = await capture(page, "завтра в 6 встать и приготовить завтрак");
  const morning = await proposalsForSource(page, morningId);
  const morningTask = morning.find((proposal) => proposal.type === "task");
  expect(morningTask?.fields?.day).not.toBe("");
  expect(morningTask?.fields?.startTime).toBe("06:00");
  const genericDuplicates = morning.filter((proposal) => /Разобрать|Вытащить задачи|локального организатора/i.test(proposal.title));
  expect(genericDuplicates).toHaveLength(0);

  await page.screenshot({ path: "output/playwright/final/final-parser-proposals.png", fullPage: true });
});

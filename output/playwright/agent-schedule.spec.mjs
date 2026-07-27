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
test.setTimeout(150000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?schedule=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function openAgents(page) {
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("flows"));
  await expect(page.getByTestId("agent-card").first()).toBeVisible({ timeout: 20000 });
}

async function state(page) {
  return page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
}

// A1: расписание задаётся владельцем и живёт в состоянии. До этого пакета расписания не было
// вовсе, и в карточке агента честно стояло «Расписания в LifeOS нет».
test("расписание агента задаётся и сохраняется", async ({ page }) => {
  await reset(page);
  await openAgents(page);

  await page.locator('[data-agent="evening-digest"] [data-testid="agent-schedule-time"]').fill("21:00");
  await page.locator('[data-agent="evening-digest"] [data-testid="agent-schedule-save"]').click();
  await page.waitForTimeout(400);

  const snapshot = await state(page);
  expect(snapshot.agentSchedules["evening-digest"].time).toBe("21:00");
  // Закон №3: значимое решение оставляет чек.
  expect((snapshot.control.receipts || []).some((row) => /расписан/i.test(row.summary || ""))).toBe(true);
});

// A2 (закон №9 и §7): наступившее время НЕ запускает агента. Оно предлагает запуск — решение
// остаётся за владельцем, иначе это скрытое действие.
test("наступившее время предлагает запуск, но не запускает", async ({ page }) => {
  await reset(page);
  await openAgents(page);
  // Время в прошлом относительно текущего момента — срок наступил заведомо.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setAgentScheduleForTest("evening-digest", "00:01"));
  await page.waitForTimeout(500);

  const before = await state(page);
  expect(before.control.agentRun).toBeFalsy();

  await expect(page.locator('[data-agent="evening-digest"] [data-testid="agent-schedule-due"]')).toBeVisible();
  const due = await page.locator('[data-agent="evening-digest"] [data-testid="agent-schedule-due"]').textContent();
  expect(due).toMatch(/время|наступил/i);
});

// A3: расписание снимается тем же местом, и это тоже решение с чеком.
test("расписание снимается и оставляет чек", async ({ page }) => {
  await reset(page);
  await openAgents(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setAgentScheduleForTest("goal-watcher", "08:30"));
  await page.waitForTimeout(300);

  await page.locator('[data-agent="goal-watcher"] [data-testid="agent-schedule-clear"]').click();
  await page.waitForTimeout(400);

  const snapshot = await state(page);
  expect(snapshot.agentSchedules["goal-watcher"]).toBeFalsy();
  expect((snapshot.control.receipts || []).some((row) => /расписание снято/i.test(row.summary || ""))).toBe(true);
});

// A4 (ловушка normalizeState): новое поле состояния должно быть и в дефолтах, и в белом списке,
// иначе расписание молча исчезнет при следующей сборке состояния.
test("расписание переживает перезагрузку", async ({ page }) => {
  await reset(page);
  await openAgents(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setAgentScheduleForTest("quiet-secretary", "07:45"));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => {
    const schedules = window.__lifeosKnowledgeBase?.getStateSnapshot()?.agentSchedules || {};
    return Boolean(schedules["quiet-secretary"]);
  }, null, { timeout: 20000 });

  const snapshot = await state(page);
  expect(snapshot.agentSchedules["quiet-secretary"].time).toBe("07:45");
});

// A5: карточка агента больше не врёт про «расписания нет» — но и не обещает автозапуск.
test("карточка агента честно описывает расписание", async ({ page }) => {
  await reset(page);
  await openAgents(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setAgentScheduleForTest("evening-digest", "21:00"));
  await page.waitForTimeout(400);

  const when = await page.locator('[data-agent="evening-digest"] [data-testid="agent-when"]').textContent();
  expect(when).toContain("21:00");
  expect(when).toMatch(/не запускает|предлож|сам не/i);
});

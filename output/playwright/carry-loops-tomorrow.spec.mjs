// СЦЕНАРИЙ 8 · НЕЗАКРЫТЫЕ ПЕТЛИ ПЕРЕЕЗЖАЮТ В ЗАВТРА.
//
// Вечерний итог рассказывал о дне и ничего с ним не делал: открытые задачи оставались висеть, и
// завтрашнее утро начиналось с нуля. Отчёт без перехода — это не итог, а сводка.
//
// Спека проверяет единственное движение, ради которого итог вообще нужен:
//   1) незакрытая задача со сроком СЕГОДНЯ попадает в `digest-open-loops`;
//   2) кнопка `carry-loops-tomorrow` переносит её на завтра — в данных, а не только на экране;
//   3) закрытая задача в петли не попадает (иначе список превращается в список всего);
//   4) «когда-нибудь» (задача без срока) не тащится в завтра: это список желаний, и перенос
//      превратил бы завтрашнее утро в ту же свалку.
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

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// «Сегодня» берём у продукта, а не у спеки: своя копия календаря расходится с ним в окне после
// полуночи и ловит часовой пояс, а не дефект (для этого и заведён `todayKeyForTest`).
function todayKey(page) {
  return page.evaluate(() => window.__lifeosKnowledgeBase.todayKeyForTest());
}

function dayAfter(day, offset) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

async function openDigest(page) {
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  await expect(page.getByTestId("day-digest")).toBeVisible({ timeout: 20000 });
}

function taskDay(page, taskId) {
  return page.evaluate((id) => {
    const task = window.__lifeosKnowledgeBase.getStateSnapshot().tasks[id];
    return task ? { day: task.day || "", status: task.status || "" } : null;
  }, taskId);
}

// C1: незакрытое за сегодня видно в итоге дня и переносится одной кнопкой.
test("незакрытая задача со сроком сегодня переносится на завтра одной кнопкой", async ({ page }) => {
  await reset(page, "loops-carry");
  const today = await todayKey(page);
  const taskId = await page.evaluate((day) => window.__lifeosKnowledgeBase.addTaskForTest("Позвонить подрядчику по кухне", day), today);
  expect(taskId).toBeTruthy();

  await openDigest(page);
  const loops = page.getByTestId("digest-open-loops");
  await expect(loops).toBeVisible();
  await expect(loops).toContainText("Осталось незакрытым");
  await expect(loops).toContainText("Позвонить подрядчику");

  await page.getByTestId("carry-loops-tomorrow").click();

  // Перенос — в данных. Экран может нарисовать что угодно; днём задачи распоряжается состояние.
  await expect.poll(async () => (await taskDay(page, taskId)).day, { timeout: 20000 }).toBe(dayAfter(today, 1));
  expect((await taskDay(page, taskId)).status, "перенос не закрывает задачу").not.toBe("done");

  // За сегодня незакрытого не осталось — список честно исчезает, а не остаётся с той же строкой.
  await expect(page.getByTestId("digest-open-loops")).toHaveCount(0, { timeout: 20000 });

  // Действие оставляет след: перенос это решение владельца, а не тихая правка (CLAUDE.md §7).
  const trace = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      audit: (state.auditLog || []).some((row) => String(row.type || "") === "day.carry"),
      receipt: (state.control.receipts || []).some((row) => /перенесено на завтра/i.test(row.summary || ""))
    };
  });
  expect(trace.audit).toBe(true);
  expect(trace.receipt).toBe(true);
});

// C2: просроченное называется просроченным. «Ещё со вчера» — это факт, по которому владелец
// решает быстрее, чем по дате, и он обязан быть на экране.
test("просроченное со вчера попадает в петли и помечено просроченным", async ({ page }) => {
  await reset(page, "loops-overdue");
  const today = await todayKey(page);
  const yesterday = dayAfter(today, -1);
  const taskId = await page.evaluate((day) => window.__lifeosKnowledgeBase.addTaskForTest("Отвезти документы в банк", day), yesterday);

  await openDigest(page);
  const loops = page.getByTestId("digest-open-loops");
  await expect(loops).toBeVisible();
  await expect(loops).toContainText("просрочено");
  await expect(loops).toContainText("ещё с " + yesterday);

  await page.getByTestId("carry-loops-tomorrow").click();
  await expect.poll(async () => (await taskDay(page, taskId)).day, { timeout: 20000 }).toBe(dayAfter(today, 1));
});

// C3: петля — это НЕЗАКРЫТОЕ. Закрытая задача в вечерний список не попадает, иначе он
// превращается в отчёт обо всём подряд, который никто не читает.
test("закрытая задача незакрытой петлёй не считается", async ({ page }) => {
  await reset(page, "loops-done");
  const today = await todayKey(page);
  const doneId = await page.evaluate((day) => window.__lifeosKnowledgeBase.addTaskForTest("Забрать заказ", day), today);
  await page.evaluate((id) => window.__lifeosKnowledgeBase.completeTaskForTest(id), doneId);

  await openDigest(page);
  // Незакрытого нет вовсе — блока нет. Пустой блок «Осталось незакрытым — 0» это шум.
  await expect(page.getByTestId("digest-open-loops")).toHaveCount(0);
});

// C4: будущее не тащится в завтра. Петля — это то, что уже НАСТУПИЛО и не закрыто; задача,
// поставленная на послезавтра, петлёй не является, и сдвигать её на завтра значит решать за
// владельца, когда ему это делать.
//
// Отдельная оговорка про «когда-нибудь». Комментарий `openLoopsForDay` в app.js обещает, что
// задача без срока в петли не попадает, — но проверить это невозможно: `normalizeState`
// (app.js:2926) ставит `task.day = task.day || todayKey()`, то есть задачи без срока в продукте
// не существует. Ветка недостижима, и спека не притворяется, что проверяет её.
test("задача на послезавтра петлёй не считается и в завтра не уезжает", async ({ page }) => {
  await reset(page, "loops-future");
  const today = await todayKey(page);
  const later = dayAfter(today, 2);
  const laterId = await page.evaluate((day) => window.__lifeosKnowledgeBase.addTaskForTest("Забрать справку в МФЦ", day), later);
  const todayId = await page.evaluate((day) => window.__lifeosKnowledgeBase.addTaskForTest("Оплатить интернет", day), today);

  await openDigest(page);
  const loops = page.getByTestId("digest-open-loops");
  await expect(loops).toBeVisible();
  await expect(loops).toContainText("Оплатить интернет");
  await expect(loops).not.toContainText("МФЦ");

  await page.getByTestId("carry-loops-tomorrow").click();
  await expect.poll(async () => (await taskDay(page, todayId)).day, { timeout: 20000 }).toBe(dayAfter(today, 1));
  const untouched = await taskDay(page, laterId);
  expect(untouched.day, "будущая задача обязана остаться на своём дне").toBe(later);
});

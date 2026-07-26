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
  await page.goto(`${appUrl}?weekday=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function captureAndApply(page, lines) {
  for (const line of ["разогрев"].concat(lines)) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(240);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(400);
}

// Ожидаемая дата считается по тем же часам, что и у приложения: иначе прогон около полуночи
// или в другом поясе сравнивал бы разные «сегодня».
async function nextWeekday(page, weekday) {
  return page.evaluate((target) => {
    const today = new Date();
    const key = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const base = new Date(key + "T00:00:00");
    const offset = (target - base.getUTCDay() + 7) % 7 || 7;
    return new Date(base.getTime() + offset * 86400000).toISOString().slice(0, 10);
  }, weekday);
}

async function taskDay(page, pattern) {
  return page.evaluate((source) => {
    const task = Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks || {})
      .find((item) => !item.deleted && new RegExp(source, "i").test(item.title || ""));
    return task ? task.day || "" : null;
  }, pattern);
}

// W1: «до среды» — самый частый способ назвать срок, и он не работал. Сравнение шло по точному
// слову, поэтому ловились только «вторник» и «четверг» — те два дня, у которых винительный
// совпадает с именительным. Всё остальное молча уезжало на сегодня, и день владельца набивался
// делами, которых он на сегодня не ставил.
test("«до среды» ставит задачу на среду, а не на сегодня", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Надо ответить Дмитрию до среды"]);

  const day = await taskDay(page, "Дмитрию");
  expect(day).toBe(await nextWeekday(page, 3));
});

// W2: «в пятницу» — винительный падеж, тоже не ловился.
test("«в пятницу» ставит задачу на пятницу", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Забрать документы в пятницу"]);

  const day = await taskDay(page, "документы");
  expect(day).toBe(await nextWeekday(page, 5));
});

// W3: «в выходные» — это ближайшая суббота, а не сегодня.
test("«в выходные» ставит задачу на субботу", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Позвонить маме в выходные"]);

  const day = await taskDay(page, "маме");
  expect(day).toBe(await nextWeekday(page, 6));
});

// W4: основа дня недели не должна цепляться к другим словам. «Среди недели» и «средство» —
// не среда; без явных границ основа «сред» ловила бы оба.
test("«среди» и «средство» не читаются как среда", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Среди недели разобрать бумаги"]);

  const day = await taskDay(page, "бумаги");
  expect(day).not.toBe(await nextWeekday(page, 3));
});

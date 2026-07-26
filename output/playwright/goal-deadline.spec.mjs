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
  await page.goto(`${appUrl}?deadline=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function capture(page, line) {
  await page.fill('[data-testid="capture-input"]', line);
  await page.click('[data-testid="capture-text"]');
  await page.waitForTimeout(300);
}

async function applyAll(page) {
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(400);
}

async function goals(page) {
  return page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals || {})
    .filter((item) => !item.deleted));
}

// G1: месяц называют чаще, чем число. «Хочу купить машину до августа» оставалась вообще без
// срока, а без срока не считается ни прогноз, ни вероятность — цель существовала как надпись.
test("«до августа» становится настоящим сроком цели", async ({ page }) => {
  await reset(page);
  await capture(page, "Хочу купить машину до августа");
  await applyAll(page);

  const list = await goals(page);
  const goal = list.find((item) => /машин/i.test(item.title || ""));
  expect(goal).toBeTruthy();
  // «до» — успеть ДО начала месяца, значит первое число. Середину месяца придумывать нельзя.
  expect(goal.targetDate).toMatch(/^\d{4}-08-01$/);
  expect(new Date(goal.targetDate).getTime()).toBeGreaterThan(Date.now());
});

// G2: «в сентябре» и «к декабрю» — это внутри месяца, значит последний его день. Разница с «до»
// смысловая, и обе формы должны читаться по-разному.
test("«в сентябре» — это конец месяца, а не его начало", async ({ page }) => {
  await reset(page);
  await capture(page, "Хочу поехать в отпуск в сентябре");
  await applyAll(page);

  const goal = (await goals(page)).find((item) => /отпуск/i.test(item.title || ""));
  expect(goal).toBeTruthy();
  expect(goal.targetDate).toMatch(/^\d{4}-09-30$/);
});

// G3 (закон №5): у выведенного срока видно, из каких слов он взят и как прочитан — иначе дата
// в карточке выглядит как введённая владельцем.
test("у выведенного срока видно происхождение", async ({ page }) => {
  await reset(page);
  await capture(page, "Хочу купить машину до августа");
  await applyAll(page);

  const goal = (await goals(page)).find((item) => /машин/i.test(item.title || ""));
  expect(goal.targetDateWhy).toContain("до августа");

  await page.evaluate((id) => window.__lifeosKnowledgeBase.openObjectForTest(id), goal.id);
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 20000 });
  const sources = await page.getByTestId("object-fact-source").allTextContents();
  expect(sources.some((line) => /срок распознан из слов/.test(line))).toBe(true);
});

// G4: конкретный день сильнее месяца — если число названо, месячное правило не вмешивается.
test("названное число сильнее месяца", async ({ page }) => {
  await reset(page);
  await capture(page, "Хочу закрыть цель завтра");
  await applyAll(page);

  const goal = (await goals(page)).find((item) => /закрыть цель/i.test(item.title || ""));
  expect(goal).toBeTruthy();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  expect(goal.targetDate).toBe(tomorrow);
  // Срок введён разбором даты, а не месячным правилом — объяснения про месяц быть не должно.
  expect(goal.targetDateWhy || "").toBe("");
});

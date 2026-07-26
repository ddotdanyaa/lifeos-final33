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
  await page.goto(`${appUrl}?observe=${Date.now()}`, { waitUntil: "networkidle" });
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
  await page.waitForTimeout(280);
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

async function live(page, collection) {
  return page.evaluate((name) => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot()[name] || {})
    .filter((item) => !item.deleted).map((item) => item.title), collection);
}

// O1: наблюдение о себе становится наблюдением, а не невыполнимым делом. Нашлось сквозным
// прогоном вечернего дампа: слово «задач» включало распознавание дела, и в списке появлялось
// «После тренировки закрываю больше задач» — задача, которую нельзя ни сделать, ни закрыть.
test("наблюдение о себе не попадает в список дел", async ({ page }) => {
  await reset(page);
  await capture(page, "После тренировки закрываю больше задач");
  await applyAll(page);

  const tasks = await live(page, "tasks");
  expect(tasks.filter((title) => /закрываю больше задач/i.test(title))).toEqual([]);

  // И при этом не потерялось: запись стала наблюдением со ссылкой на собственные слова владельца.
  const insights = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().insights || {})
    .filter((item) => !item.deleted));
  const observation = insights.find((item) => /закрываю больше задач/i.test(item.title || ""));
  expect(observation).toBeTruthy();
  expect(observation.reason).toContain("сам");
});

// O2 (закон №6): обязательство сильнее наблюдения. «Надо больше спать» — сравнение есть, но
// есть и «надо», значит это дело, и решать за владельца тут нечего.
test("обязательство со сравнением остаётся делом", async ({ page }) => {
  await reset(page);
  await capture(page, "Надо больше спать");
  await applyAll(page);

  const tasks = await live(page, "tasks");
  expect(tasks.some((title) => /спать/i.test(title))).toBe(true);
});

// O3: у записи со сроком наблюдения не бывает — при дате разбор идёт обычным путём, а не
// уводит запись из планирования.
test("запись со сроком не превращается в наблюдение", async ({ page }) => {
  await reset(page);
  await capture(page, "Завтра снова еду на объект");
  await applyAll(page);

  const observationSources = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {})
    .filter((item) => !item.deleted && item.parsedIntent === "observation").length);
  expect(observationSources).toBe(0);
});

// O4: разбор дня считает наблюдения отдельной строкой — они не числятся ни делами,
// ни «не понял».
test("разбор дня отдельно называет наблюдения о себе", async ({ page }) => {
  await reset(page);
  await capture(page, "После тренировки закрываю больше задач");
  await capture(page, "Английский снова откладываю");

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  await expect(page.getByTestId("day-digest")).toBeVisible({ timeout: 30000 });
  await page.getByTestId("run-day-digest").click();
  await expect(page.locator('[data-testid="digest-stage"][data-stage="read"]')).toContainText("наблюдения о себе");
});

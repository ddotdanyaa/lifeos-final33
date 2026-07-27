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
  await page.goto(`${appUrl}?event=${Date.now()}`, { waitUntil: "networkidle" });
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

async function live(page, collection) {
  return page.evaluate((name) => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot()[name] || {})
    .filter((item) => !item.deleted).map((item) => item.title), collection);
}

// E1: срок без времени — это ДЕЛО. Раньше при любой дате заводились и задача, и блок дня с тем же
// названием: один смысл давал два объекта (закон №4). Хуже того, оба попадали в один таймлайн
// и объявлялись конфликтом друг с другом — система находила «пересечение» объекта с двойником.
test("срок без времени даёт дело и не даёт блок дня", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Надо ответить Дмитрию до среды"]);

  const tasks = await live(page, "tasks");
  const plans = await live(page, "planBlocks");
  expect(tasks.some((title) => /Дмитрию/i.test(title))).toBe(true);
  expect(plans.filter((title) => /Дмитрию/i.test(title))).toEqual([]);
});

// E2: названное время делает запись СОБЫТИЕМ дня, и задачи-двойника у неё быть не должно.
test("время делает запись событием дня, а не парой «задача + блок»", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Завтра в 14:00 зал"]);

  const tasks = await live(page, "tasks");
  const plans = await live(page, "planBlocks");
  expect(plans.some((title) => /зал/i.test(title))).toBe(true);
  expect(tasks.filter((title) => /зал/i.test(title))).toEqual([]);
});

// E3: снятая команда не должна оставлять строчную букву. «Надо ответить Дмитрию» превращалось
// в «ответить Дмитрию до среды», и список дел выглядел сломанным.
test("заголовок сохраняет заглавную букву после снятия команды", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Надо ответить Дмитрию до среды"]);

  const tasks = await live(page, "tasks");
  const task = tasks.find((title) => /Дмитрию/i.test(title));
  expect(task).toBeTruthy();
  expect(task[0]).toBe(task[0].toLocaleUpperCase("ru-RU"));
});

// E4: величина в заголовке — не сумма. Чистка вырезала любое число из 2–9 цифр, и «Пробежать
// 10 км» превращалось в «Пробежать км».
test("величина остаётся в заголовке дела", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Пробежать 10 км в субботу"]);

  const tasks = await live(page, "tasks");
  expect(tasks.some((title) => /10\s*км/i.test(title))).toBe(true);
});

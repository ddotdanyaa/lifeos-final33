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
  await page.goto(`${appUrl}?intent=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function capture(page, lines) {
  for (const line of ["разогрев"].concat(lines)) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(260);
  }
}

async function intentOf(page, pattern) {
  return page.evaluate((source) => {
    const record = Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {})
      .find((item) => !item.deleted && new RegExp(source, "i").test(item.text || ""));
    return record ? record.parsedIntent || "" : null;
  }, pattern);
}

// D1: сомнение — не «не понял». Смысл системе известен: сомнение УЖЕ стоит рядом с целью в
// противоречиях. Помечать такую запись непонятой значит отчитываться о неудаче там, где её нет.
test("сомнение помечено сомнением, а не «не разобрано»", async ({ page }) => {
  await reset(page);
  await capture(page, ["Может вообще без машины обойтись"]);

  expect(await intentOf(page, "без машины")).toBe("doubt");
});

// D2: свершившийся факт — тоже не «не понял». «Счёт за воду пришёл» уже случилось, и дела из
// этого выдумывать нельзя (закон №6): «пришёл счёт» не значит «оплати счёт».
test("свершившийся факт помечен фактом и не становится делом", async ({ page }) => {
  await reset(page);
  await capture(page, ["Счёт за воду пришёл"]);

  expect(await intentOf(page, "за воду")).toBe("fact");
  const tasks = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks || {})
    .filter((item) => !item.deleted).map((item) => item.title));
  expect(tasks.filter((title) => /воду/i.test(title))).toEqual([]);
});

// D3: обязательство сильнее факта. «Надо оплатить счёт за воду» — это дело, и подменять его
// «фактом» из-за слова «счёт» нельзя.
test("обязательство сильнее свершившегося факта", async ({ page }) => {
  await reset(page);
  await capture(page, ["Надо оплатить счёт за воду"]);

  expect(await intentOf(page, "оплатить счёт")).not.toBe("fact");
});

// D4: разбор дня называет сомнения и факты отдельными строками, а не сваливает их в «не понял».
test("разбор дня отдельно называет сомнения и факты", async ({ page }) => {
  await reset(page);
  await capture(page, ["Может вообще без машины обойтись", "Смета на кухню пришла"]);

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  await expect(page.getByTestId("day-digest")).toBeVisible({ timeout: 30000 });
  await page.getByTestId("run-day-digest").click();

  const read = page.locator('[data-testid="digest-stage"][data-stage="read"]');
  await expect(read).toContainText("сомнени");
  await expect(read).toContainText("факт");
});

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
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?builder=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// B1: обещание канона «своя сущность сразу получает контракт объекта» показывается проверкой
// по фактам, а не галочкой авансом: невыполненный пункт остаётся невыполненным.
test("builder: контракт объекта показан проверкой, а не обещанием", async ({ page }) => {
  await reset(page);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("builder"));
  await expect(page.getByTestId("builder-contract")).toBeVisible();

  const checks = page.getByTestId("builder-contract-check");
  expect(await checks.count()).toBeGreaterThanOrEqual(6);
  // У каждого пункта есть посчитанное значение, а не просто название.
  const texts = await checks.allTextContents();
  expect(texts.every((text) => text.includes(":"))).toBe(true);

  // Пункты, за которыми пока ничего нет, честно помечены невыполненными.
  const classes = await checks.evaluateAll((nodes) => nodes.map((node) => node.className));
  expect(classes).toContain("missing");
});

// B2: запись своей сущности — обычный артефакт: открывается тем же экраном Объекта.
test("builder: запись своей сущности открывается как обычный объект", async ({ page }) => {
  await reset(page);
  const recordId = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const record = Object.values(state.systemRecords || {}).find((item) => !item.deleted);
    return record ? record.id : "";
  });
  test.skip(!recordId, "в чистом хранилище записей систем ещё нет");

  await page.evaluate((id) => {
    document.querySelector("#app").insertAdjacentHTML("beforeend", `<button id="e2e-open" data-action="open-object" data-id="${id}">o</button>`);
  }, recordId);
  await page.click("#e2e-open");
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("object-verdict")).not.toBeEmpty();
});

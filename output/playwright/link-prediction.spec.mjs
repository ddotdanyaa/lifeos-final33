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
  await page.goto(`${appUrl}?predict=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// «Марина» — общий сосед двух разных тем (машина и кухня): именно такую неочевидную связь
// формула Adamic-Adar и должна поднять наверх.
async function seed(page) {
  for (const line of [
    "Марина против кредита на машину",
    "Хочу купить машину до августа",
    "Посчитать свободные деньги на машину",
    "Оценить продажу старой машины",
    "Марина хочет ремонт кухни",
    "Смета на ремонт кухни 240000"
  ]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await expect(page.getByTestId("workspace-graph")).toBeVisible({ timeout: 20000 });
}

// L1 (P2-2): кандидат связи объяснён общими соседями и остаётся ПРЕДЛОЖЕНИЕМ, пока не подтвердят.
test("кандидаты связей: объяснены общими соседями, ничего не создано до подтверждения", async ({ page }) => {
  await reset(page);
  await seed(page);

  const predictions = page.getByTestId("link-prediction");
  expect(await predictions.count()).toBeGreaterThan(0);
  await expect(page.getByTestId("link-prediction-why").first()).toContainText("Общих соседей");
  await expect(page.getByTestId("link-prediction-why").first()).toContainText("прямой связи");

  // Пока не подтверждено — ни одной новой вики-связи в заметках.
  const linkedBefore = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().notes)
    .filter((note) => !note.deleted && /Связано: \[\[/.test(note.body || "")).length);
  expect(linkedBefore).toBe(0);
});

// L2: подтверждение создаёт настоящую связь и чек; отказ не создаёт ничего, но тоже виден.
test("кандидаты связей: подтверждение создаёт связь, отказ ничего не создаёт", async ({ page }) => {
  await reset(page);
  await seed(page);

  await page.getByTestId("link-prediction-apply").first().click();
  const afterApply = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      linked: Object.values(state.notes).filter((note) => !note.deleted && /Связано: \[\[/.test(note.body || "")).length,
      receipts: (state.control.receipts || []).filter((row) => row.kind === "link").length
    };
  });
  expect(afterApply.linked).toBe(1);
  expect(afterApply.receipts).toBe(1);

  // Отказ: связей не прибавляется, но решение зафиксировано чеком.
  const dismiss = page.getByTestId("link-prediction-dismiss").first();
  if (await dismiss.count()) {
    await dismiss.click();
    const afterDismiss = await page.evaluate(() => {
      const state = window.__lifeosKnowledgeBase.getStateSnapshot();
      return {
        linked: Object.values(state.notes).filter((note) => !note.deleted && /Связано: \[\[/.test(note.body || "")).length,
        dismissed: (state.control.receipts || []).filter((row) => /отклонён/.test(row.summary || "")).length
      };
    });
    expect(afterDismiss.linked).toBe(1);
    expect(afterDismiss.dismissed).toBeGreaterThan(0);
  }
});

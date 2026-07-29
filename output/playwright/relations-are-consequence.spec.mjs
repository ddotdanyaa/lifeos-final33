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
  await page.goto(`${appUrl}?rel=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function captureAndApply(page, lines) {
  for (const line of lines) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(300);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const open = Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open");
    for (const proposal of open) await kb.applyProposalForTest(proposal.id);
  });
}

// Слово владельца: «граф как интерфейс бесполезен, никто им не будет пользоваться».
// Связь должна быть СЛЕДСТВИЕМ объекта: к общей картине приходят от конкретной связи
// конкретного объекта, когда её стало мало, — а не идут в неё как в место назначения.
test("к общей картине связей ведёт сам объект", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, [
    "Заработал 200000 зарплата",
    "Потратил 40000 продукты",
    "Потратил 20000 бензин"
  ]);

  // Проваливаемся в объект той дорогой, которой ходит владелец, — из Записей.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("library"));
  await page.waitForSelector('[data-testid="workspace-library"]', { timeout: 15000 });
  await page.locator('[data-action="open-object"]').first().click();
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 15000 });

  await page.getByTestId("object-tab-rel").click();
  await expect(page.getByTestId("object-panel-rel")).toBeVisible();
  await expect(page.getByTestId("object-relation").first()).toBeVisible();

  // Выход к общей картине стоит ровно там, где связей объекта стало мало.
  await expect(page.getByTestId("object-relations-all")).toBeVisible();
  await page.getByTestId("object-relations-all").click();
  await expect(page.getByTestId("workspace-graph")).toBeVisible({ timeout: 15000 });
});

// Обратная половина того же правила: под пустотой выхода быть не должно — кнопка «вся картина»
// там обещала бы картину, которой нет.
test("у объекта без связей выхода к общей картине нет", async ({ page }) => {
  await reset(page);
  const empty = await page.evaluate(() => {
    const kb = window.__lifeosKnowledgeBase;
    const state = kb.getStateSnapshot();
    const inspector = state.objectInspector;
    return Boolean(inspector);
  });
  expect(typeof empty).toBe("boolean");

  await captureAndApply(page, ["Оценить продажу старой машины"]);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("library"));
  await page.waitForSelector('[data-testid="workspace-library"]', { timeout: 15000 });
  await page.locator('[data-action="open-object"]').first().click();
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("object-tab-rel").click();
  await expect(page.getByTestId("object-panel-rel")).toBeVisible();

  const relations = await page.getByTestId("object-relation").count();
  const exit = await page.getByTestId("object-relations-all").count();
  // Выход существует тогда и только тогда, когда есть от чего идти дальше.
  expect(exit > 0).toBe(relations > 0);
});

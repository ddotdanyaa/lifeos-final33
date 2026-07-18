import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}

const localChromium = findLocalChromium();
if (localChromium) {
  test.use({ launchOptions: { executablePath: localChromium } });
}

test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?ux-coherence=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Every surface id registered in ui/shell.js's primaryNav/secondaryNav, mapped to the
// exact command-palette title text (app.js's commandPaletteItems) so the search filter
// (which matches title/hint/group/shortcut, not the raw id) can find each row.
const ALL_NAV_SURFACES = {
  inbox: "Дом",
  today: "Сегодня",
  calendar: "Календарь",
  finance: "Финансы",
  feed: "Лента",
  systems: "Системы",
  library: "База знаний",
  graph: "Большой граф",
  control: "Контроль данных",
  capture: "Вход",
  projects: "Проекты",
  chat: "Чат",
  agents: "Агенты и сценарии",
  models: "Model Hub",
  "smart-home": "Умный дом",
  marketplace: "Marketplace",
  builder: "Builder",
  design: "Design Studio",
  databases: "Базы",
  screen: "Screen Companion",
  twin: "Personal Twin",
  goals: "Цели и баланс",
  habits: "Привычки",
  reader: "Чтение",
  player: "Голос",
  providers: "Подключения"
};

// P10.4 UX_COHERENCE: the command palette is a single searchable entry point that covers
// every registered v34 surface (not just a hardcoded subset) plus a real System Factory
// action, proven by driving the palette itself rather than asserting on its source array.
test("command palette: every v34 surface is a searchable command, plus a real Factory action", async ({ page }) => {
  await reset(page);
  await page.getByTestId("open-command-palette").click();
  await expect(page.getByTestId("command-palette")).toBeVisible();

  for (const [surfaceId, title] of Object.entries(ALL_NAV_SURFACES)) {
    await page.getByTestId("command-palette-query").fill(title);
    const row = page.locator(`[data-testid="command-palette-row"][data-id="surface:${surfaceId}"]`);
    await expect(row, `command palette should list surface "${surfaceId}" ("${title}")`).toBeVisible();
  }

  // A real Factory action lives in the palette and genuinely navigates to the Builder.
  await page.getByTestId("command-palette-query").fill("Factory");
  const factoryRow = page.locator('[data-testid="command-palette-row"][data-id="quick:system"]');
  await expect(factoryRow).toBeVisible();
  await factoryRow.click();
  await expect(page.getByTestId("command-palette")).toHaveCount(0);
  await expect(page.getByTestId("builder-workspace")).toBeVisible();

  const afterFactory = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(afterFactory.activeSurface).toBe("builder");
});

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

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?backlinks-panel=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function openSurface(page, id) {
  const direct = page.getByTestId(`surface-${id}`).first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
  }
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    const toggles = page.locator('[data-testid="app-ribbon"] .nav-cluster-drafts-toggle');
    const count = await toggles.count();
    for (let index = 0; index < count; index += 1) {
      await toggles.nth(index).click().catch(() => {});
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

async function newNote(page, dialogResponses, title) {
  dialogResponses.push(title);
  await page.getByTestId("new-note").click();
}

// R3 BACKLINKS_PANEL: state.backlinks (noteId -> [linking note ids]) was already computed on
// every commit; only the Foam-style rendered panel + testid were missing from ui/library.js.
test("backlinks panel: a note linking to another shows up as its incoming backlink", async ({ page }) => {
  const dialogResponses = [];
  page.on("dialog", async (dialog) => {
    const response = dialogResponses.length ? dialogResponses.shift() : undefined;
    await dialog.accept(response);
  });

  await reset(page);
  await openSurface(page, "library");

  await newNote(page, dialogResponses, "Заметка Beta R3");
  await expect(page.getByTestId("note-title")).toHaveValue("Заметка Beta R3");

  await newNote(page, dialogResponses, "Заметка Alpha R3");
  await expect(page.getByTestId("note-title")).toHaveValue("Заметка Alpha R3");
  await page.getByTestId("note-body").fill("# Заметка Alpha R3\n\nСвязано с [[Заметка Beta R3]].");
  await page.waitForTimeout(400);

  // Beta has no backlinks yet at this point (Alpha links to it, but Beta hasn't been reopened
  // while state.backlinks recomputed) - open Beta and confirm the panel now shows Alpha.
  await page.getByTestId("note-row").filter({ hasText: "Заметка Beta R3" }).first().click();
  await expect(page.getByTestId("note-title")).toHaveValue("Заметка Beta R3");

  await expect(page.getByTestId("library-backlinks-panel")).toBeVisible();
  await expect(page.getByTestId("backlink-row").filter({ hasText: "Заметка Alpha R3" })).toBeVisible();

  // Alpha itself should show no backlinks (nothing links to it).
  await page.getByTestId("note-row").filter({ hasText: "Заметка Alpha R3" }).first().click();
  await expect(page.getByTestId("note-title")).toHaveValue("Заметка Alpha R3");
  await expect(page.getByTestId("backlinks-empty")).toBeVisible();

  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const beta = Object.values(state.notes).find((note) => note.title === "Заметка Beta R3");
  const alpha = Object.values(state.notes).find((note) => note.title === "Заметка Alpha R3");
  expect(state.backlinks[beta.id]).toContain(alpha.id);
});

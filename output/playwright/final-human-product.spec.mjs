import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

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
  test.use({
    launchOptions: { executablePath: localChromium },
    serviceWorkers: "block"
  });
}

test.setTimeout(120000);

const appUrl = process.env.LIFEOS_URL || "http://127.0.0.1:4173";
const shotDir = join("output", "playwright", "final-human");

async function reset(page) {
  await page.goto(`${appUrl}?final-human=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function openSurface(page, id) {
  const firstVisible = async (testId) => {
    const locator = page.getByTestId(testId);
    const count = await locator.count();
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
    return locator.first();
  };
  let target = await firstVisible(`surface-${id}`);
  if (!(await target.isVisible().catch(() => false))) {
    await page.getByTestId("app-ribbon").locator("summary").first().click();
    target = await firstVisible(`surface-${id}`);
  }
  await target.click();
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBe(0);
}

async function capture(page, text) {
  await openSurface(page, "inbox");
  await page.getByTestId("capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("lifeos-understanding")).toBeVisible();
}

test("H01 Home is chat-first, quiet, and not a proof cockpit", async ({ page }) => {
  await mkdir(shotDir, { recursive: true });
  await reset(page);
  await expect(page.getByTestId("mega-dropzone")).toContainText("Что добавить в LifeOS?");
  await expect(page.getByTestId("assistant-quick-actions").getByRole("button")).toHaveCount(5);
  await expect(page.getByTestId("home-workspace-rail").getByRole("button")).toHaveCount(9);
  await expect(page.getByTestId("command-center")).not.toContainText("Product Brain");
  await expect(page.getByTestId("command-center")).not.toContainText("ledger");
  await expect(page.getByTestId("command-center")).not.toContainText("evidence");
  await expect(page.getByTestId("graph-workbench")).toHaveCount(0);
  await expect(page.getByTestId("data-control-panel")).toHaveCount(0);
  await page.screenshot({ path: join(shotDir, "home.png"), fullPage: true });
});

test("H02 Simple task gives one human answer and one main action", async ({ page }) => {
  await reset(page);
  await capture(page, "сегодня в 11 вечера заказать еду");
  const answer = page.getByTestId("lifeos-understanding");
  await expect(answer).toContainText("Это задача.");
  await expect(answer).toContainText("Когда: сегодня, 23:00.");
  await expect(answer).toContainText("Что сделать: заказать еду.");
  await expect(page.getByTestId("human-primary-action")).toContainText("Создать задачу сегодня в 23:00");
  await expect(answer.locator("button.ui-btn-primary")).toHaveCount(1);
  await page.getByTestId("human-primary-action").click();
  await page.screenshot({ path: join(shotDir, "home-after-task.png"), fullPage: true });
  await openSurface(page, "today");
  await expect(page.getByTestId("workspace-today")).toContainText("заказать еду");
  await page.screenshot({ path: join(shotDir, "today.png"), fullPage: true });
});

test("H03 Finance capture updates money dashboard", async ({ page }) => {
  await reset(page);
  await capture(page, "пятерочка 1240 продукты сегодня, баланс карта 15200");
  const answer = page.getByTestId("lifeos-understanding");
  await expect(answer).toContainText("Расход: Пятёрочка, 1240 ₽");
  await expect(answer).toContainText("Баланс: Карта, 15200 ₽");
  await page.getByTestId("human-primary-action").click();
  await openSurface(page, "finance");
  await expect(page.getByTestId("workspace-finance")).toContainText("Пятёрочка");
  await expect(page.getByTestId("workspace-finance")).toContainText(/15\s*200/);
  await expect(page.locator(".finance-dashboard")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "finance.png"), fullPage: true });
});

test("H04 Knowledge idea becomes library object without Product Brain wall", async ({ page }) => {
  await reset(page);
  await capture(page, "идея: сделать второй мозг для книг и аудио");
  await expect(page.getByTestId("lifeos-understanding")).toContainText("идея / знание / проект");
  await expect(page.getByTestId("human-primary-action")).toContainText("Сохранить идею в базу знаний");
  await page.getByTestId("human-primary-action").click();
  await openSurface(page, "library");
  await expect(page.getByTestId("workspace-library")).not.toContainText("Product Brain");
  await page.screenshot({ path: join(shotDir, "library.png"), fullPage: true });
});

test("H05 Chat works locally without Ollama", async ({ page }) => {
  await reset(page);
  await openSurface(page, "chat");
  await expect(page.getByTestId("workspace-chat")).not.toContainText("Product Brain");
  await page.getByTestId("chat-input").fill("привет");
  await page.getByTestId("send-chat").click();
  await expect(page.getByTestId("chat-panel")).toContainText("привет");
  await page.getByTestId("chat-input").fill("что сделать с активным артефактом?");
  await page.getByTestId("send-chat").click();
  await expect(page.getByTestId("chat-panel")).toContainText("LifeOS");
  await page.screenshot({ path: join(shotDir, "chat.png"), fullPage: true });
});

test("H06 Agents and flows use node canvas and dry-run history", async ({ page }) => {
  await reset(page);
  await openSurface(page, "agents");
  await expect(page.getByTestId("flow-canvas")).toBeVisible();
  await expect(page.getByTestId("workspace-agents")).not.toContainText("Product Brain");
  await expect(page.getByTestId("flow-canvas")).toContainText("Trigger");
  await expect(page.getByTestId("flow-canvas")).toContainText("Condition");
  await expect(page.getByTestId("flow-canvas")).toContainText("Action");
  await expect(page.getByTestId("flow-canvas")).toContainText("Approval");
  await expect(page.getByTestId("flow-canvas")).toContainText("Audit");
  await page.getByTestId("run-flow-builder").click();
  await expect(page.getByTestId("execution-history")).toContainText(/Проверка|Dry-run|ожидает/i);
  await page.screenshot({ path: join(shotDir, "agents-flow.png"), fullPage: true });
});

test("H07 Graph is a full canvas with filters and edge reasons", async ({ page }) => {
  await reset(page);
  await capture(page, "идея: граф должен объяснять связи");
  await page.getByTestId("human-primary-action").click();
  await openSurface(page, "graph");
  await expect(page.getByTestId("graph-workbench")).toBeVisible();
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  await expect(page.getByTestId("graph-filter-productBrain")).not.toBeChecked();
  await page.getByTestId("graph-canvas").click({ position: { x: 180, y: 140 } });
  await expect(page.getByTestId("graph-inspector")).toBeVisible();
  await expect(page.getByTestId("edge-reason").first()).toBeVisible();
  await page.screenshot({ path: join(shotDir, "graph.png"), fullPage: true });
  await openSurface(page, "control");
  await expect(page.getByTestId("data-control-panel")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "control.png"), fullPage: true });
  await openSurface(page, "providers");
  await expect(page.getByTestId("provider-panel")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "providers.png"), fullPage: true });
});

test("H08 Calendar shows a readable time grid, not a dense table", async ({ page }) => {
  await reset(page);
  await capture(page, "сегодня в 11 вечера заказать еду");
  await page.getByTestId("human-primary-action").click();
  await openSurface(page, "calendar");
  await expect(page.getByTestId("workspace-calendar")).toBeVisible();
  // testid, not the ".calendar-grid" class - R2 renamed the class to "hourly-time-grid" to stop
  // colliding with a dead-code component's unrelated same-named class (see TimeGrid.js).
  await expect(page.getByTestId("calendar-grid")).toBeVisible();
  // Регистр заголовка намеренно изменён продуктом: снятая команда больше не оставляет строчную
  // букву («надо заказать еду» → «Заказать еду»), поэтому проверка идёт без учёта регистра.
  await expect(page.getByTestId("calendar-agenda-strip")).toContainText(/заказать еду/i);
  await page.screenshot({ path: join(shotDir, "calendar.png"), fullPage: true });
});

test("H09 Reader and player are usable with manual fallbacks", async ({ page }) => {
  await reset(page);
  await mkdir(join("output", "playwright", "fixtures"), { recursive: true });
  const bookPath = resolve("output", "playwright", "fixtures", "final-human-book.md");
  const audioPath = resolve("output", "playwright", "fixtures", "final-human-audio.wav");
  await writeFile(bookPath, "# Материал\n\nИдея для базы знаний и [[Связи]].", "utf8");
  await writeFile(audioPath, Buffer.from("RIFF0000WAVEfmt "));
  await page.getByTestId("file-import").setInputFiles(bookPath);
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase?.getStateSnapshot?.();
    return Object.values(state?.sources || {}).some((source) => String(source.name || "").includes("final-human-book"));
  }), { timeout: 15000 }).toBeTruthy();
  await openSurface(page, "reader");
  await expect(page.getByTestId("reader-surface")).toContainText("final-human-book.md");
  await expect(page.getByTestId("reader-surface")).toContainText("текст готов");
  await page.screenshot({ path: join(shotDir, "reader.png"), fullPage: true });
  await page.getByTestId("audio-import").setInputFiles(audioPath);
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase?.getStateSnapshot?.();
    return Object.values(state?.sources || {}).some((source) => String(source.name || "").includes("final-human-audio"));
  }), { timeout: 15000 }).toBeTruthy();
  await openSurface(page, "player");
  // П-B WHISPER_LOCAL_STT reworded this copy to mention the new Whisper path honestly
  // ("...офлайн после подготовки; ручной текст работает всегда") - manual transcript is
  // still always available, just described accurately alongside the new capability.
  await expect(page.getByTestId("player-panel")).toContainText("ручной текст работает всегда");
  await page.locator('textarea[data-testid^="transcript-input-"]').first().fill("Фрагмент: сделать заметку из аудио.");
  await page.locator('[data-testid^="save-transcript-"]').click();
  await expect(page.getByTestId("player-surface")).toContainText("Фрагмент");
  await page.screenshot({ path: join(shotDir, "player.png"), fullPage: true });
});

test("H10 Mobile is capture-first without horizontal overflow", async ({ page }) => {
  await reset(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("mega-dropzone")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "mobile.png"), fullPage: true });
});

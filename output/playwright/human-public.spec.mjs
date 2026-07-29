import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
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
  test.use({
    launchOptions: {
      executablePath: localChromium
    }
  });
}

test.setTimeout(120000);

const appUrl = process.env.LIFEOS_URL || "http://127.0.0.1:4173";
const shotDir = join("output", "playwright", "final-human");

async function reset(page) {
  await page.goto(`${appUrl}?human-public=${Date.now()}`, { waitUntil: "networkidle" });
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
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
    target = await firstVisible(`surface-${id}`);
  }
  await target.click();
}

test("human public chat-first flow", async ({ page }) => {
  await mkdir(shotDir, { recursive: true });
  await reset(page);

  await expect(page.getByTestId("command-center")).toBeVisible();
  await expect(page.getByTestId("mega-dropzone")).toContainText("Что добавить в LifeOS?");
  // Заголовок карточки изменён намеренно: «LifeOS понял» — рассказ системы о себе, а владелец
  // спрашивает, что стало с тем, что он сказал. Проверка та же, слово человеческое.
  await expect(page.getByTestId("lifeos-understanding")).toContainText("Что я понял из записи");
  await expect(page.getByTestId("home-workspace-rail").getByRole("button")).toHaveCount(9);
  await expect(page.getByTestId("command-center")).not.toContainText("Product Brain");
  await expect(page.getByTestId("command-center")).not.toContainText("ledger");
  await page.screenshot({ path: join(shotDir, "home-chat-first.png"), fullPage: true });

  await page.getByTestId("capture-input").fill("сегодня в 11 вечера заказать еду");
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("lifeos-understanding")).toContainText("Это задача");
  await expect(page.getByTestId("lifeos-understanding")).toContainText("сегодня, 23:00");
  await expect(page.getByTestId("human-primary-action")).toContainText("Создать задачу сегодня в 23:00");
  await page.getByTestId("human-primary-action").click();
  await openSurface(page, "today");
  await expect(page.getByTestId("workspace-today")).toContainText("заказать еду");
  await page.screenshot({ path: join(shotDir, "after-simple-task.png"), fullPage: true });

  await openSurface(page, "calendar");
  await expect(page.getByTestId("workspace-calendar")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "calendar-clean.png"), fullPage: true });

  await openSurface(page, "inbox");
  await page.getByTestId("capture-input").fill("пятерочка 1240 продукты сегодня, баланс карта 15200");
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("lifeos-understanding")).toContainText("Расход: Пятёрочка, 1240 ₽");
  await expect(page.getByTestId("lifeos-understanding")).toContainText("Баланс: Карта, 15200 ₽");
  await expect(page.getByTestId("human-primary-action")).toContainText("Добавить расход и обновить баланс");
  await page.getByTestId("human-primary-action").click();
  await openSurface(page, "finance");
  await expect(page.getByTestId("workspace-finance")).toContainText("Пятёрочка");
  await expect(page.getByTestId("workspace-finance")).toContainText(/15\s*200/);
  await page.screenshot({ path: join(shotDir, "finance-dashboard.png"), fullPage: true });

  await openSurface(page, "inbox");
  await page.getByTestId("capture-input").fill("идея: сделать второй мозг для книг и аудио");
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("lifeos-understanding")).toContainText("идея / знание / проект");
  await expect(page.getByTestId("human-primary-action")).toContainText("Сохранить идею в базу знаний");
  await page.getByTestId("human-primary-action").click();
  await openSurface(page, "library");
  await expect(page.getByTestId("workspace-library")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "reader-real.png"), fullPage: true });

  const bookPath = join("output", "playwright", "fixtures", "human-public-book.md");
  await mkdir(join("output", "playwright", "fixtures"), { recursive: true });
  await writeFile(bookPath, "# Книга\n\nЦитата для базы знаний и [[Связи]].", "utf8");
  await page.getByTestId("file-import").setInputFiles(bookPath);
  await openSurface(page, "reader");
  await expect(page.getByTestId("workspace-reader")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "reader-real.png"), fullPage: true });

  const audioPath = join("output", "playwright", "fixtures", "human-public-audio.wav");
  await writeFile(audioPath, Buffer.from("RIFF0000WAVEfmt "));
  await page.getByTestId("audio-import").setInputFiles(audioPath);
  await openSurface(page, "player");
  await expect(page.getByTestId("workspace-player")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "player-transcript.png"), fullPage: true });

  await openSurface(page, "chat");
  await expect(page.getByTestId("workspace-chat")).toBeVisible();
  await expect(page.getByTestId("workspace-chat")).not.toContainText("LifeOS Product Brain");
  await page.getByTestId("chat-panel").getByTestId("chat-input").fill("сохрани это как мысль к активному артефакту");
  await page.getByTestId("send-chat").click();
  await expect(page.getByTestId("chat-panel")).toContainText("сохрани это как мысль");
  await page.screenshot({ path: join(shotDir, "chat-local-ai.png"), fullPage: true });

  await openSurface(page, "agents");
  await expect(page.getByTestId("flow-canvas")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "agents-flow-canvas.png"), fullPage: true });

  await openSurface(page, "graph");
  await expect(page.getByTestId("graph-canvas")).toBeVisible();
  await expect(page.getByTestId("graph-filter-productBrain")).not.toBeChecked();
  await page.screenshot({ path: join(shotDir, "big-graph.png"), fullPage: true });

  await openSurface(page, "control");
  await expect(page.getByTestId("data-control-panel")).toBeVisible();
  await page.locator("[data-testid='dev-state'] summary").click();
  await expect(page.getByTestId("dev-state-panel")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "control-human.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-bottom-nav [data-testid="mobile-surface-inbox"]').click();
  await expect(page.getByTestId("mega-dropzone")).toBeVisible();
  await page.screenshot({ path: join(shotDir, "mobile-home.png"), fullPage: true });
});

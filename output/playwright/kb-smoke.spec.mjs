import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
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
  test.use({
    launchOptions: {
      executablePath: localChromium
    }
  });
}

test.setTimeout(90000);

test("local-first knowledge base supports wikilinks, ghosts, rename cascade, search and graph", async ({ page }) => {
  await mkdir("output/playwright/fixtures", { recursive: true });
  const token = String(Date.now());
  await page.goto("http://127.0.0.1:4173");
  await expect(page.getByTestId("home-workspace-rail")).toBeHidden();
  await expect(page.getByTestId("command-center")).toBeVisible();
  await expect(page.getByTestId("mega-dropzone")).toBeVisible();
  await expect(page.getByTestId("owner-next-zone")).toBeVisible();
  await expect(page.getByTestId("owner-money-zone")).toBeVisible();
  await expect(page.getByTestId("proposal-panel")).toHaveCount(0);

  const captureNeedle = "Universal inbox capture " + token;
  await page.getByTestId("capture-input").fill(captureNeedle + "\n\nНужно подготовить план проверки " + token + ".\nЗавтра проверить календарь.\nLinks to [[Inbox Concept " + token + "]].");
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("active-artifact-card")).toContainText("Universal inbox capture");
  await expect(page.getByTestId("owner-review-stage")).toBeVisible();
  await expect(page.getByTestId("analysis-panel")).toContainText("Задач");
  await expect(page.getByTestId("proposal-panel")).toBeVisible();
  await expect(page.getByTestId("proposal-row").first()).toBeVisible();
  await expect(page.getByTestId("proposal-panel")).toContainText("Принять");
  await page.getByTestId("home-open-source").click();
  await expect(page.getByTestId("note-body")).toContainText(captureNeedle);
  await expect(page.getByTestId("knowledge-workbench")).toBeVisible();
  await expect(page.getByTestId("book-workbench")).toBeVisible();
  await expect(page.getByTestId("library-control-trail")).toBeVisible();
  await page.getByTestId("surface-chat").click();
  await page.getByTestId("chat-panel").getByTestId("chat-input").fill("Turn this into a connected workspace " + token);
  await page.getByTestId("send-chat").click();
  await expect(page.getByTestId("chat-panel")).toContainText("connected workspace " + token);
  await page.getByTestId("surface-agents").click();
  await page.getByTestId("agent-panel-run").click();
  await expect(page.getByTestId("agent-panel")).toContainText("Local organizer");

  page.once("dialog", async (dialog) => dialog.accept("Cascade Source"));
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue("Cascade Source");
  await page.getByTestId("note-body").fill("# Cascade Source\n\nLinks to [[Target B]] and [[Ghost Alpha]].");
  await page.waitForTimeout(1800);

  page.once("dialog", async (dialog) => dialog.accept("Target B"));
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue("Target B");
  await page.getByTestId("note-body").fill("# Target B\n\nBack to [[Cascade Source]].");
  await page.waitForTimeout(1800);

  await page.getByRole("button", { name: /Target B/ }).first().click();
  await page.getByTestId("note-title").fill("Renamed Target");
  await page.getByTestId("note-title").dispatchEvent("change");
  await page.waitForTimeout(600);

  await page.getByRole("button", { name: /Cascade Source/ }).first().click();
  await expect(page.getByTestId("note-body")).toContainText("[[Renamed Target]]");
  await expect(page.getByText("Ghost Alpha").first()).toBeVisible();

  await page.getByTestId("global-search").fill("renamed");
  await expect(page.getByRole("button", { name: /Renamed Target/ }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await page.getByTestId("global-search").fill("renamed");
  await expect(page.getByRole("button", { name: /Renamed Target/ }).first()).toBeVisible();

  const bookPath = join("output", "playwright", "fixtures", "lifeos-book-" + token + ".txt");
  const bookNeedle = "LifeOS imported book " + token;
  await writeFile(bookPath, "# " + bookNeedle + "\n\nChapter links to [[Renamed Target]] and [[Audio Reflection " + token + "]].", "utf8");
  await page.getByTestId("file-import").setInputFiles(bookPath);
  await expect(page.getByTestId("note-title")).toHaveValue("lifeos-book-" + token);
  await expect(page.getByTestId("note-body")).toContainText(bookNeedle);
  await page.getByTestId("global-search").fill(bookNeedle);
  await expect(page.getByRole("button", { name: new RegExp("lifeos-book-" + token) }).first()).toBeVisible();

  await page.evaluate((value) => {
    const file = new File(["# " + value + "\n\nDropped into [[Inbox Drop]]."], "drop-" + value + ".txt", { type: "text/plain" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const target = document.querySelector(".kb-shell");
    target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
    target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
  }, "artifact-" + token);
  await expect(page.getByTestId("note-title")).toHaveValue("drop-artifact-" + token);

  const pdfPath = join("output", "playwright", "fixtures", "parser-boundary-" + token + ".pdf");
  await writeFile(pdfPath, Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"));
  await page.getByTestId("file-import").setInputFiles(pdfPath);
  await expect(page.getByText("pdf-parser-required").first()).toBeVisible();

  const audioPath = join("output", "playwright", "fixtures", "meeting-" + token + ".wav");
  await writeFile(audioPath, Buffer.from("RIFF0000WAVEfmt "));
  await page.getByTestId("audio-import").setInputFiles(audioPath);
  await expect(page.getByText("meeting-" + token + ".wav").first()).toBeVisible();
  await page.getByTestId("surface-player").click();
  await expect(page.getByTestId("player-panel").locator("audio").first()).toBeVisible();
  const transcriptNeedle = "Manual transcript " + token + " links to [[Renamed Target]].";
  await page.locator("[data-testid^='transcript-input-']").first().fill(transcriptNeedle);
  await page.getByRole("button", { name: "Сохранить transcript" }).first().click();
  await expect(page.getByTestId("transcript-segment-row").first()).toBeVisible();
  await page.getByRole("button", { name: "Open note" }).first().click();
  await expect(page.getByTestId("note-title")).toHaveValue("meeting-" + token + " Transcript");
  await expect(page.getByTestId("note-body")).toContainText(transcriptNeedle);

  const goalNeedle = "Ship connected LifeOS " + token;
  const taskNeedle = "Review imported book " + token;
  const planNeedle = "Plan owner day " + token;
  await page.getByTestId("surface-today").click();
  await expect(page.getByTestId("today-panel")).toBeVisible();
  await page.getByTestId("goal-input").fill(goalNeedle);
  await page.getByTestId("add-goal").click();
  await expect(page.getByText(goalNeedle).first()).toBeVisible();
  await page.getByTestId("task-input").fill(taskNeedle);
  await page.getByTestId("task-time-input").fill("08:15");
  await page.getByTestId("add-task").click();
  const taskRow = page.locator("[data-testid='task-row']").filter({ hasText: taskNeedle });
  await expect(taskRow).toBeVisible();
  await expect(taskRow.getByTestId("task-time")).toContainText("08:15");
  await page.getByTestId("surface-calendar").click();
  await expect(page.getByTestId("calendar-workbench")).toContainText(taskNeedle);
  await expect(page.getByTestId("calendar-workbench")).toContainText("08:15");
  await page.getByTestId("surface-today").click();
  await taskRow.getByTestId("task-toggle").click();
  await expect(taskRow).toContainText("Готово");
  await page.getByTestId("plan-input").fill(planNeedle);
  await page.getByTestId("plan-time-input").fill("16:00");
  await page.getByTestId("add-plan-block").click();
  const planRow = page.locator("[data-testid='plan-row']").filter({ hasText: planNeedle });
  await expect(planRow).toBeVisible();
  await expect(planRow).toContainText("16:00");
  await planRow.getByTestId("plan-toggle").click();
  await expect(planRow).toContainText("Готово");

  await page.getByTestId("surface-chat").click();
  await expect(page.getByTestId("ollama-status")).toBeVisible();
  await expect(page.getByTestId("ollama-endpoint")).toHaveValue(/localhost:11434/);
  await page.getByTestId("surface-providers").click();
  await page.getByTestId("prepare-provider-mail").click();
  await expect(page.getByTestId("provider-panel")).toContainText("needs-owner-credentials");
  await page.getByTestId("surface-graph").click();
  const sourceFilter = page.getByTestId("graph-filter-sources");
  await expect(sourceFilter).toBeChecked();
  await sourceFilter.uncheck();
  await expect(sourceFilter).not.toBeChecked();
  await sourceFilter.check();

  page.once("dialog", async (dialog) => dialog.accept("Recoverable " + token));
  await page.getByTestId("new-note").click();
  await expect(page.getByTestId("note-title")).toHaveValue("Recoverable " + token);
  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByTestId("delete-note").click();
  await page.getByTestId("surface-control").click();
  const recoveryRow = page.locator("[data-testid='recovery-row']").filter({ hasText: "Recoverable " + token });
  await expect(recoveryRow).toBeVisible();
  await recoveryRow.locator("button").first().click();
  await page.getByTestId("surface-library").click();
  await expect(page.getByTestId("note-title")).toHaveValue("Recoverable " + token);

  await page.getByTestId("global-search").fill("meeting-" + token);
  await expect(page.getByRole("button", { name: new RegExp("meeting-" + token) }).first()).toBeVisible();

  const countsText = await page.getByTestId("graph-counts").textContent();
  expect(countsText || "").toMatch(/[0-9]+ nodes/);
  const image = await page.getByTestId("graph-canvas").screenshot({
    path: "output/playwright/kb-graph-canvas.png"
  });
  expect(image.length).toBeGreaterThan(1000);
});

test("mobile calm home keeps intake, graph and control usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 980 });
  await page.goto("http://127.0.0.1:4173");
  await expect(page.getByTestId("home-workspace-rail")).toBeHidden();
  await expect(page.getByTestId("command-center")).toBeVisible();
  await expect(page.getByTestId("mega-dropzone")).toBeVisible();
  await page.getByTestId("top-control").click();
  await expect(page.getByTestId("data-control-panel")).toBeVisible();
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(horizontalOverflow).toBe(false);
  const image = await page.screenshot({
    path: "output/playwright/lifeos-mobile-cockpit.png",
    fullPage: true
  });
  expect(image.length).toBeGreaterThan(1000);
});

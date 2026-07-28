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

async function openSurface(page, id) {
  const direct = page.getByTestId(`surface-${id}`).first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
    // Раскрытие «Ещё» живёт в состоянии, а не в браузерном <details>: после клика идёт коммит и
    // перерисовка. Без ожидания следующий шаг работает по старому DOM.
    await page.waitForTimeout(350);
    if (!(await page.locator('[data-testid="app-ribbon"] .nav-cluster').first().isVisible().catch(() => false))) {
      await page.locator('[data-testid="app-ribbon"] summary').first().click().catch(() => {});
      await page.waitForTimeout(350);
    }
  }
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    // Перебираем группы ПОИМЁННО. Раскрыта всегда одна, поэтому «первый тумблер в DOM» после
    // каждого клика возвращается к началу — цикл по `.first()` ходил бы между двумя группами
    // бесконечно. И ждём перерисовку: раскрытие идёт через состояние, а не через CSS.
    for (const cluster of ["capture", "doing", "ai", "workshop"]) {
      const toggle = page.getByTestId(`nav-cluster-drafts-${cluster}`);
      if (!(await toggle.count())) continue;
      await toggle.click().catch(() => {});
      await page.waitForTimeout(350);
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

// P6.3 ICS_EML_FILE_IMPORT: .ics -> real calendar events, .eml -> a readable source/note,
// both parsed only from the file the owner picked - no account/server access at all.
test("ICS and EML file import: real calendar events and readable email source", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "inbox");

  const token = String(Date.now());
  const icsText = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "SUMMARY:Team sync " + token,
    "DTSTART:20260901T140000",
    "DTEND:20260901T150000",
    "DESCRIPTION:Weekly sync",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  await page.locator("input#file-import").setInputFiles({
    name: "meeting-" + token + ".ics",
    mimeType: "text/calendar",
    buffer: Buffer.from(icsText, "utf8")
  });

  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterIcs = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const planBlock = Object.values(afterIcs.planBlocks).find((block) => block.title.includes("Team sync " + token));
  expect(planBlock).toBeTruthy();
  expect(planBlock.day).toBe("2026-09-01");
  expect(planBlock.startTime).toBe("14:00");
  expect(planBlock.endTime).toBe("15:00");
  const icsReceipt = Object.values(afterIcs.providerRuns).find((run) => run.providerId === "import" && run.details?.icsEvents > 0);
  expect(icsReceipt).toBeTruthy();

  const emlText = [
    "From: sender@example.test",
    "Subject: Quarterly report " + token,
    "Date: Tue, 01 Sep 2026 12:00:00 +0000",
    "",
    "Please review the attached quarterly numbers " + token + "."
  ].join("\r\n");
  await page.locator("input#file-import").setInputFiles({
    name: "report-" + token + ".eml",
    mimeType: "message/rfc822",
    buffer: Buffer.from(emlText, "utf8")
  });
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const afterEml = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const emlSource = Object.values(afterEml.sources).find((source) => source.name === "report-" + token + ".eml");
  expect(emlSource).toBeTruthy();
  expect(emlSource.text).toContain("Quarterly report " + token);
  expect(emlSource.text).toContain("Please review the attached quarterly numbers " + token);
  const emlNote = afterEml.notes[emlSource.noteId];
  expect(emlNote.title).toContain("Quarterly report " + token);
});

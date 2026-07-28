import { expect, test } from "@playwright/test";

// U-DUMP: the daily workflow is "dump 20-30 audio/files after work, nothing lost, then work the
// insights". Two concrete regressions this locks down: (1) the audio list must be a bounded,
// countable, deletable list - not an endless wall that pushes the page down; (2) each added file
// must be removable (archive-source, reversible), so old files don't pile up forever.

const appUrl = "http://127.0.0.1:4173";

async function reset(page, marker) {
  await page.goto(`${appUrl}?player-dump=${marker}`, { waitUntil: "networkidle" });
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

async function importAudio(page, name) {
  await page.locator("input#audio-import").setInputFiles({
    name,
    mimeType: "audio/wav",
    buffer: Buffer.from("RIFF0000WAVEfmt " + name)
  });
  await expect(page.getByTestId("audio-card").filter({ hasText: name })).toBeVisible();
}

test("U-DUMP: many dumped audio files stay a bounded, countable, deletable list", async ({ page }) => {
  await reset(page, "list-" + Date.now());
  await openSurface(page, "player");

  // Dump several files (stand-in for 20-30 after a workday).
  for (const name of ["Новая запись 27.m4a.wav", "Новая запись 28.m4a.wav", "Новая запись 29.m4a.wav", "Новая запись 30.m4a.wav"]) {
    await importAudio(page, name);
  }

  // The list is countable and the column is bounded with its own scroll (not the page growing).
  await expect(page.getByTestId("audio-count")).toHaveText("4");
  await expect(page.getByTestId("audio-card")).toHaveCount(4);
  const overflowY = await page.locator(".audio-list").evaluate((el) => getComputedStyle(el).overflowY);
  expect(["auto", "scroll"]).toContain(overflowY);

  // Only the active (top) card is expanded by default - the rest are compact, so the list is
  // scannable instead of an endless wall of fully-expanded editors.
  const openDetails = await page.locator(".audio-card-more[open]").count();
  expect(openDetails).toBe(1);
});

test("U-DUMP: an added file can be deleted (archive-source), reversible with a receipt", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await reset(page, "delete-" + Date.now());
  await openSurface(page, "player");

  await importAudio(page, "лишний файл.wav");
  await importAudio(page, "нужный файл.wav");
  await expect(page.getByTestId("audio-count")).toHaveText("2");

  // Delete the specific unwanted card via its own delete button (confirm auto-accepted).
  const doomed = page.getByTestId("audio-card").filter({ hasText: "лишний файл.wav" });
  await doomed.getByTestId(/^archive-source-/).click();

  // It's gone from the list, the count dropped, and the source is archived (not hard-deleted) with
  // an audit receipt so it can be restored from Control (§7 - reversible + traceable).
  await expect(page.getByTestId("audio-card").filter({ hasText: "лишний файл.wav" })).toHaveCount(0);
  await expect(page.getByTestId("audio-count")).toHaveText("1");
  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const archived = Object.values(state.sources).find((s) => s.name === "лишний файл.wav");
  expect(archived.deleted).toBe(true);
  expect((state.auditLog || []).some((e) => e.type === "source.archive")).toBe(true);
});

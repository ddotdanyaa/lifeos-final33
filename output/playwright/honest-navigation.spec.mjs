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
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

async function open(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Владелец: «сайт перегружен говном, мусором… слева всё намешано». Обход показал, из чего это
// ощущение складывается: рабочие экраны и недописанные каркасы стоят вперемешку одинаковыми
// строками, а два пункта («Цели» и «Привычки») рисуют вообще один и тот же экран.
// Канон (docs/design/LIFEOS_DESIGN_CANON.md §9) требует ровно этого: черновики — отдельной
// группой «🚧 В разработке», одинаковые экраны — объединить.

// П32 изменил продукт НАМЕРЕННО: одна общая куча «🚧 В разработке» разошлась по четырём
// кластерам, и каркас теперь признаётся ПРЯМО В СВОЕЙ СТРОКЕ. Суть канона §9 («не смешивать
// рабочее и каркасы одинаковыми строками») от этого не ослабла, а усилилась: раньше признание
// стояло один раз на границе, теперь — на каждом каркасе, в каждой группе. Проверка идёт за
// продуктом и стала строже: правило применяется ко ВСЕМ кластерам сразу, а не к одной границе.
test("каркас признаётся в своей строке, и ни один рабочий раздел не стоит после каркаса", async ({ page }) => {
  await open(page, "nav-honest");

  const ribbon = page.locator('[data-testid="app-ribbon"]');
  await ribbon.locator("summary").click();

  const clusters = ["capture", "doing", "ai", "workshop"];
  let draftsSeen = 0;
  for (const cluster of clusters) {
    // Каркасы свёрнуты за строку «+N в разработке» — раскрываем её, чтобы увидеть их все.
    const toggle = page.getByTestId("nav-cluster-drafts-" + cluster);
    if (await toggle.count()) await toggle.click();
    await page.waitForTimeout(250);
    const rows = await page.evaluate((id) => {
      const body = document.querySelector('[data-testid="nav-cluster-' + id + '"] .nav-cluster-body');
      if (!body) return [];
      return Array.from(body.querySelectorAll("button.nav-item")).map((node) => ({
        id: node.dataset.testid,
        draft: node.classList.contains("draft"),
        text: node.textContent || ""
      }));
    }, cluster);
    expect(rows.length, "кластер «" + cluster + "» не должен быть пустым").toBeGreaterThan(0);

    // Рабочее — выше каркасов, всегда и в каждой группе.
    const firstDraft = rows.findIndex((row) => row.draft);
    if (firstDraft >= 0) {
      expect(rows.slice(firstDraft).every((row) => row.draft),
        "в кластере «" + cluster + "» рабочий раздел стоит ПОСЛЕ каркаса").toBe(true);
    }
    // И каждый каркас говорит о себе сам.
    for (const row of rows.filter((item) => item.draft)) {
      draftsSeen += 1;
      expect(row.text, row.id + " обязан признаться прямо в строке").toContain("в разработке");
    }
  }
  expect(draftsSeen, "каркасы обязаны остаться доступными, а не исчезнуть из меню").toBeGreaterThanOrEqual(9);
});

// Ради этого пакет и делался: шестнадцать плоских строк перестали быть списком.
test("вторичное меню — четыре группы, раскрыта максимум одна", async ({ page }) => {
  await open(page, "nav-clusters");
  await page.locator('[data-testid="app-ribbon"] summary').click();

  for (const cluster of ["capture", "doing", "ai", "workshop"]) {
    await expect(page.getByTestId("nav-cluster-head-" + cluster)).toBeVisible({ timeout: 10000 });
  }

  // Рабочий раздел виден СРАЗУ, без раскрытия: до того, что работает, один клик, а не два.
  // Иначе уплотнение меню оплачено тем, что до всего стало дальше.
  await expect(page.getByTestId("surface-chat")).toBeVisible();
  await expect(page.getByTestId("surface-player")).toBeVisible();
  await expect(page.getByTestId("surface-goals")).toBeVisible();

  // Каркасы свёрнуты за одну строку с честным числом — и раскрыта максимум одна такая строка.
  await page.getByTestId("nav-cluster-drafts-ai").click();
  await page.waitForTimeout(250);
  await expect(page.locator('[data-testid="nav-cluster-ai"] .nav-cluster-drafts')).toBeVisible();

  await page.getByTestId("nav-cluster-drafts-workshop").click();
  await page.waitForTimeout(250);
  await expect(page.locator('[data-testid="nav-cluster-workshop"] .nav-cluster-drafts')).toBeVisible();
  await expect(page.locator('[data-testid="nav-cluster-ai"] .nav-cluster-drafts')).toHaveCount(0);
  expect(await page.locator('[data-testid="app-ribbon"] .nav-cluster-drafts').count()).toBe(1);
});

test("двух пунктов на один и тот же экран больше нет", async ({ page }) => {
  await open(page, "nav-merge");
  await page.locator('[data-testid="app-ribbon"] summary').click();
  await page.waitForTimeout(400);

  // «Цели» и «Привычки» рисовали идентичный экран — в меню остаётся один пункт.
  await expect(page.getByTestId("surface-goals")).toHaveCount(1);
  await expect(page.getByTestId("surface-habits")).toHaveCount(0);
  await expect(page.getByTestId("surface-goals")).toContainText("привычки");
});

test("экран-каркас честно говорит, что он в разработке", async ({ page }) => {
  await open(page, "nav-draft-note");

  for (const surface of ["twin", "databases", "smart-home"]) {
    await page.evaluate((id) => window.__lifeosKnowledgeBase.setSurfaceForTest(id), surface);
    await page.waitForTimeout(500);
    await expect(page.getByTestId("workspace-draft-note"), surface + " обязан признаться, что он каркас").toBeVisible({ timeout: 10000 });
  }

  // А рабочий экран такой подписи не носит — иначе она обесценится.
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("library"));
  await page.waitForTimeout(600);
  await expect(page.getByTestId("workspace-draft-note")).toHaveCount(0);
});

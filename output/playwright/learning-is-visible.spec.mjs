// ЧЕМУ СИСТЕМА НАУЧИЛАСЬ — ВИДНО ВЛАДЕЛЬЦУ.
//
// Требование владельца от 2026-08-01 дословно: «должна быть визуальная компонента, понятная,
// чтобы понимать вообще, что установилось, что не установилось».
//
// До этой панели обучение работало вслепую: журнал решений писался, калибровка считалась,
// канарейка сторожила — и НИЧЕГО из этого владелец не мог проверить. Панель калибровки отвечает
// на другой вопрос: она показывает СНИМОК («принято 78%»), а не изменение от его правок.
// Разница та же, что между остатком на счёте и выпиской.
//
// Спека проверяет три вещи, и каждая — про честность, а не про наличие блока:
//   1) сигналов нет → так и написано, активность не рисуется;
//   2) сигналы есть, но поведение не сдвинулось → сказано прямо, а не выдан фиктивный процент;
//   3) поведение сдвинулось → показан сдвиг, и он совпадает с тем, что реально посчитала
//      калибровка (панель не может разойтись с движком — она из него получена).
import { expect, test } from "@playwright/test";

const appUrl = "http://127.0.0.1:4173";
const DAY = 86400000;

test.use({ viewport: { width: 1440, height: 1000 } });
test.setTimeout(120000);

async function reset(page, tag) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function openControl(page) {
  const direct = page.getByTestId("surface-control").first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click().catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.getByTestId("surface-control").first().click();
  await page.waitForTimeout(500);
}

test("сигналов не было — панель говорит это прямо, а не рисует активность", async ({ page }) => {
  await reset(page, "learn-empty");
  await openControl(page);

  const panel = page.getByTestId("control-learning");
  await expect(panel).toBeVisible();
  await expect(page.getByTestId("learning-empty")).toBeVisible();
  await expect(page.getByTestId("learning-empty")).toContainText("учиться было не на чем");
  // Пустые сутки не должны давать ни одной строки изменения — иначе панель выдумывает движение.
  await expect(page.getByTestId("learning-change")).toHaveCount(0);
});

test("сигналы есть, но их мало — панель не двигает уверенность и говорит почему", async ({ page }) => {
  await reset(page, "learn-thin");

  // Три свежих решения: меньше порога доверия, значит поведение меняться не должно.
  await page.evaluate((day) => window.__lifeosKnowledgeBase.seedDecisionsForTest([
    { type: "задача", decision: "applied", createdAt: new Date(Date.now() - 0.1 * day).toISOString() },
    { type: "задача", decision: "applied", createdAt: new Date(Date.now() - 0.2 * day).toISOString() },
    { type: "задача", decision: "dismissed", createdAt: new Date(Date.now() - 0.3 * day).toISOString() }
  ]), DAY);

  await openControl(page);
  await expect(page.getByTestId("learning-signals")).toContainText("Сигналов от тебя: 3");
  await expect(page.getByTestId("learning-signals")).toContainText("принято 2");
  await expect(page.getByTestId("learning-signals")).toContainText("отклонено 1");
  // Главное: честное «не сдвинулось», а не выдуманный процент.
  await expect(page.getByTestId("learning-no-change")).toBeVisible();
  await expect(page.getByTestId("learning-no-change")).toContainText("слишком мало");
});

test("поведение сдвинулось — сдвиг показан и совпадает с тем, что посчитала калибровка", async ({ page }) => {
  await reset(page, "learn-shift");

  await page.evaluate((day) => {
    const rows = [];
    // Десять СТАРЫХ принятий (за пределами суток): по ним тип стал доверенным и принимается 100%.
    for (let i = 0; i < 10; i += 1) {
      rows.push({ type: "привычка", decision: "applied", createdAt: new Date(Date.now() - (3 + i * 0.1) * day).toISOString() });
    }
    // Десять СВЕЖИХ отклонений: внутри суток. Именно они обязаны сдвинуть уверенность вниз.
    for (let i = 0; i < 10; i += 1) {
      rows.push({ type: "привычка", decision: "dismissed", createdAt: new Date(Date.now() - (0.05 + i * 0.05) * day).toISOString() });
    }
    return window.__lifeosKnowledgeBase.seedDecisionsForTest(rows);
  }, DAY);

  await openControl(page);

  await expect(page.getByTestId("learning-signals")).toContainText("Сигналов от тебя: 10");
  await expect(page.getByTestId("learning-signals")).toContainText("отклонено 10");

  const change = page.getByTestId("learning-change").first();
  await expect(change).toBeVisible();
  await expect(change).toContainText("привычка");
  await expect(page.getByTestId("learning-change-kind").first()).toContainText("принимается реже");

  // Панель не имеет права расходиться с движком: она получена из той же калибровки.
  const delta = await page.evaluate(() => window.__lifeosKnowledgeBase.computeLearningDeltaForTest());
  expect(delta.signals).toBe(10);
  expect(delta.dismissed).toBe(10);
  const shift = delta.changes.find((row) => row.type === "привычка");
  expect(shift).toBeTruthy();
  expect(shift.shift).toBeLessThan(0);

  // Показанный процент обязан быть тем же, что в данных, — иначе экран врёт с уверенным видом.
  const shown = await page.getByTestId("learning-change-kind").first().innerText();
  expect(shown).toContain(`${Math.round(shift.shift * 100)}%`);

  // И-6: у каждой строки есть основание, до которого можно дойти.
  await expect(page.getByTestId("learning-sources-toggle")).toBeVisible();
  await page.getByTestId("learning-sources-toggle").click();
  await expect(page.getByTestId("learning-source").first()).toBeVisible();
});

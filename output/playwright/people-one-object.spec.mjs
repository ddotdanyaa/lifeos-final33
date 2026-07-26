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
test.setTimeout(150000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?people=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function capture(page, line) {
  await page.fill('[data-testid="capture-input"]', line);
  await page.click('[data-testid="capture-text"]');
  await page.waitForTimeout(260);
}

async function people(page) {
  return page.evaluate(() => window.__lifeosKnowledgeBase.resolvePeopleForTest());
}

async function receipts(page) {
  return page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().control.receipts.map((row) => row.kind + "|" + row.summary));
}

async function openPerson(page, name) {
  await page.evaluate((wanted) => {
    const kb = window.__lifeosKnowledgeBase;
    const person = kb.resolvePeopleForTest().find((row) => row.name === wanted);
    kb.openObjectForTest(person ? person.objectId : "");
  }, name);
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 20000 });
}

// P1 (донор Graphiti, dedup_helpers.py): нечёткое сравнение имён без проверки «своеобразности»
// склеивает разных людей. Голого расстояния Левенштейна ≤ 1 хватало, чтобы предложить слить
// «Марину» с «Кариной» — в русском одно имя расходится в хвосте, а не с первой буквы.
test("разные имена в одну правку не предлагаются к слиянию", async ({ page }) => {
  await reset(page);
  await capture(page, "Марина против кредита на машину");
  await capture(page, "Карина прислала смету по кухне");

  const list = await people(page);
  expect(list.map((row) => row.name).sort()).toEqual(["Карина", "Марина"]);

  const suggestions = await page.evaluate(() => window.__lifeosKnowledgeBase.personMergeSuggestionsForTest());
  const pair = suggestions.find((row) => /Марина/.test(row.pairId) && /Карина/.test(row.pairId));
  expect(pair).toBeUndefined();
});

// P2: близкие написания ОДНОГО имени по-прежнему предлагаются — и предложение называет,
// на чём держится, а не показывает одну метку уверенности (закон №5).
test("похожие написания одного имени предлагаются с объяснением", async ({ page }) => {
  await reset(page);
  await capture(page, "Наталья прислала смету по кухне");
  await capture(page, "Наталия ждёт ответа по кухне");

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await expect(page.getByTestId("person-merge-suggestion").first()).toBeVisible({ timeout: 20000 });
  const why = await page.getByTestId("person-merge-why").first().textContent();
  expect(why).toContain("совпали первые");
  expect(why).toContain("уверенность");
});

// P3 (P0-1): слияние людей идёт общим путём усиления — оставляет чек в Контроле и обратимо.
// Раньше был только аудит: в журнале слияние не отражалось, а разъединить было нечем.
test("слияние людей оставляет чек и разъединяется обратно", async ({ page }) => {
  await reset(page);
  await capture(page, "Наталья прислала смету по кухне");
  await capture(page, "Наталия ждёт ответа по кухне");
  expect((await people(page)).length).toBe(2);

  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.getByTestId("person-merge-apply").first().click();
  await page.waitForTimeout(400);

  const merged = await people(page);
  expect(merged.length).toBe(1);
  expect(merged[0].mentions).toBe(2);

  // Закон №3: значимое действие видно чеком, а не только внутренним аудитом.
  const afterMerge = await receipts(page);
  expect(afterMerge.some((row) => row.startsWith("reinforce|") && /Наталия/.test(row) && /Наталья/.test(row))).toBe(true);

  // И это решение отменяемо из карточки самого человека.
  await openPerson(page, merged[0].name);
  await expect(page.getByTestId("object-people-merged")).toBeVisible();
  await page.getByTestId("object-people-unmerge").first().click();
  await page.waitForTimeout(400);

  expect((await people(page)).length).toBe(2);
  const afterUnmerge = await receipts(page);
  expect(afterUnmerge.some((row) => /отделён обратно/.test(row))).toBe(true);
});

// P4: сведение по основе имени — правило языка, а не факт. «Ярослав» и «Ярослава» дают одну
// основу и молча становились одним человеком. Владелец может это отменить, и его слово сильнее
// автоматического правила: форма перестаёт сводиться и после перезагрузки состояния.
test("сведение по основе имени отменяемо владельцем и переживает перезагрузку", async ({ page }) => {
  await reset(page);
  await capture(page, "Ярослав прислал смету по кухне");
  await capture(page, "Ярослава ждёт ответа по кухне");

  const before = await people(page);
  expect(before.length).toBe(1);
  expect(before[0].raw.sort()).toEqual(["Ярослав", "Ярослава"]);

  await openPerson(page, before[0].name);
  // Карточка честно называет правило, по которому имена сведены.
  await expect(page.getByTestId("object-people-rule")).toContainText("правилу языка");
  const forms = await page.getByTestId("object-people-form").count();
  expect(forms).toBe(2);

  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('[data-testid="object-people-split"]')];
    const target = buttons.find((node) => node.closest('[data-testid="object-people-form"]').textContent.includes("Ярослава"));
    (target || buttons[0]).click();
  });
  await page.waitForTimeout(500);

  const after = await people(page);
  expect(after.length).toBe(2);
  expect(after.map((row) => row.name).sort()).toEqual(["Ярослав", "Ярослава"]);
  expect((await receipts(page)).some((row) => /отдельный человек/.test(row))).toBe(true);

  // Ловушка normalizeState: новое поле должно быть и в дефолтах, и в белом списке, иначе
  // разделение молча исчезнет при следующей сборке состояния.
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => (window.__lifeosKnowledgeBase?.resolvePeopleForTest() || []).length > 0, null, { timeout: 20000 });
  const restored = await people(page);
  expect(restored.length).toBe(2);
  expect(restored.map((row) => row.name).sort()).toEqual(["Ярослав", "Ярослава"]);
});

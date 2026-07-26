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
  await page.goto(`${appUrl}?similar=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function dump(page, lines) {
  // Первый захват после сброса иногда уходит раньше, чем привяжется обработчик, поэтому
  // прогревочная строка идёт первой и в проверках не участвует.
  for (const line of ["разогрев"].concat(lines)) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(220);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(500);
}

async function openGoal(page, pattern) {
  const goal = await page.evaluate((source) => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals || {})
    .find((item) => !item.deleted && new RegExp(source, "i").test(item.title || "")), pattern);
  expect(goal).toBeTruthy();
  await page.evaluate((id) => window.__lifeosKnowledgeBase.openObjectForTest(id), goal.id);
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 20000 });
}

// R1: запись, про которую владелец писал раньше другими словами, находится по тексту — и видно,
// за что она сюда попала. Точное сравнение слов здесь проваливается: «машину» и «машины» —
// разные строки, поэтому сравниваются трёхбуквенные куски, устойчивые к склонению.
test("похожая запись находится и объяснена общими словами", async ({ page }) => {
  await reset(page);
  await dump(page, [
    "Хочу купить машину до августа",
    "Оценить продажу старой машины",
    "Позвонить маме в выходные",
    "Ремонт кухни аванс подрядчику"
  ]);
  await openGoal(page, "машин");

  await expect(page.getByTestId("object-similar")).toBeVisible();
  const rows = await page.getByTestId("object-similar-row").allTextContents();
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.some((text) => /машин/i.test(text))).toBe(true);
  // Закон №5: рядом с процентом сказано, за что запись сюда попала.
  const why = await page.getByTestId("object-similar-why").allTextContents();
  expect(why.some((line) => /общие слова|куски слов/.test(line))).toBe(true);
});

// R2 (честность): это сходство ТЕКСТА, а не смысла. Модели смысла в продукте нет, и подпись
// обязана говорить это прямо, иначе процент выглядит как вывод нейросети.
test("подпись честно говорит, что это не смысловое сходство", async ({ page }) => {
  await reset(page);
  await dump(page, ["Хочу купить машину до августа", "Оценить продажу старой машины"]);
  await openGoal(page, "машин");

  await expect(page.getByTestId("object-similar-note")).toContainText("не смысла");
});

// R3: служебная шапка тела заметки («Source artifact», «Kind: text») одинакова у ВСЕХ записей.
// До её удаления «Позвонить маме» и цель про машину были похожи на 54% — по одной этой шапке.
test("служебная шапка заметки не делает похожими любые две записи", async ({ page }) => {
  await reset(page);
  await dump(page, ["Позвонить маме в выходные", "Ремонт кухни аванс подрядчику"]);

  const task = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().tasks || {})
    .find((item) => !item.deleted && /маме/i.test(item.title || "")));
  expect(task).toBeTruthy();
  await page.evaluate((id) => window.__lifeosKnowledgeBase.openObjectForTest(id), task.id);
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 20000 });

  const rows = await page.getByTestId("object-similar-row").allTextContents();
  expect(rows.filter((text) => /Ремонт|кухни/i.test(text))).toEqual([]);
});

// R4: сосед по графу не показывается ещё раз как «похожее» — это повтор, а не находка.
test("связанный объект не дублируется в похожем", async ({ page }) => {
  await reset(page);
  await dump(page, ["Хочу купить машину до августа", "Оценить продажу старой машины"]);
  await openGoal(page, "машин");

  const similar = await page.getByTestId("object-similar-row").allTextContents();
  await page.getByTestId("object-tab-rel").click();
  const relations = await page.getByTestId("object-relation").allTextContents();

  for (const row of similar) {
    const title = row.replace(/\d+%$/, "").trim();
    expect(relations.some((relation) => relation.includes(title))).toBe(false);
  }
});

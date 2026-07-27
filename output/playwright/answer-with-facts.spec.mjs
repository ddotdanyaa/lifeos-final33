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
  await page.goto(`${appUrl}?facts=${Date.now()}`, { waitUntil: "networkidle" });
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
  await page.waitForTimeout(320);
}

async function applyAll(page) {
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(600);
}

async function seedCarTheme(page) {
  await capture(page, "Хочу купить машину до августа");
  await capture(page, "Оценить продажу старой машины");
  await capture(page, "Потратил 20000 бензин для машины");
  await applyAll(page);
}

// A1: раньше на вопрос база отвечала «тема встречается 5 раз» и цитатами — а она ЗНАЕТ больше:
// у темы есть цель со сроком. Не сказать этого — заставить владельца собирать ответ руками из
// того, что система уже собрала.
test("ответ называет цель по теме и её срок", async ({ page }) => {
  await reset(page);
  await seedCarTheme(page);

  await capture(page, "Что там с машиной?");
  await expect(page.getByTestId("grounded-answer")).toBeVisible();
  await expect(page.getByTestId("grounded-facts")).toBeVisible();

  const facts = await page.locator('[data-testid="grounded-fact"][data-kind="goal"]').allTextContents();
  expect(facts.length).toBeGreaterThan(0);
  expect(facts[0]).toContain("Цель");
  expect(facts[0]).toMatch(/срок .+, осталось \d+ (день|дня|дней)|срок .+ уже прошёл/);
});

// A2: открытые задачи по теме — тоже ответ. Число обязано сходиться с настоящими задачами,
// а не быть round-числом «для красоты».
test("ответ называет открытые задачи по теме тем же числом, что и в базе", async ({ page }) => {
  await reset(page);
  await seedCarTheme(page);

  await capture(page, "Что там с машиной?");
  await expect(page.getByTestId("grounded-facts")).toBeVisible();

  const line = await page.locator('[data-testid="grounded-fact"][data-kind="task"]').first().textContent();
  expect(line).toContain("Открытых задач по теме");

  const real = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(state.tasks).filter((task) => !task.deleted && task.status !== "done"
      && /машин/i.test(task.title || "")).length;
  });
  expect(line).toContain("Открытых задач по теме: " + real);
});

// A3: движение денег по теме считается по настоящим тратам за 30 дней.
test("ответ называет деньги по теме за 30 дней", async ({ page }) => {
  await reset(page);
  await seedCarTheme(page);

  await capture(page, "Сколько уходит на машину?");
  await expect(page.getByTestId("grounded-facts")).toBeVisible();

  const money = await page.locator('[data-testid="grounded-fact"][data-kind="money"]').first().textContent();
  expect(money).toContain("Деньги по теме за 30 дней");
  expect(money.replace(/ /g, " ")).toContain("20 000 ₽");
});

// A4: факт — не украшение, а ссылка. Число можно проверить, провалившись в объект.
test("факт ведёт в объект, из которого посчитан", async ({ page }) => {
  await reset(page);
  await seedCarTheme(page);

  await capture(page, "Что там с машиной?");
  await expect(page.getByTestId("grounded-facts")).toBeVisible();

  await page.getByTestId("grounded-fact").first().click();
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 20000 });
});

// A5 (закон №5): конвейер честно говорит, что по объектам считать было нечего. Молчание тут
// неотличимо от «не посмотрел».
test("когда по объектам считать нечего, это сказано вслух", async ({ page }) => {
  await reset(page);
  await capture(page, "Читал вчера статью про древнюю керамику");
  await page.waitForTimeout(400);

  await capture(page, "Что я знаю про керамику?");
  await expect(page.getByTestId("grounded-answer")).toBeVisible();

  expect(await page.getByTestId("grounded-facts").count()).toBe(0);
  await expect(page.getByTestId("grounded-pipeline")).toContainText("по объектам считать нечего");
});

// A6: закон №7 держится. Ответ числами — по-прежнему ответ, а не действие: ничего не создано.
test("ответ числами ничего не создаёт", async ({ page }) => {
  await reset(page);
  await seedCarTheme(page);

  const before = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      tasks: Object.values(state.tasks).filter((item) => !item.deleted).length,
      goals: Object.values(state.goals).filter((item) => !item.deleted).length,
      proposals: Object.values(state.proposals).length
    };
  });

  await capture(page, "Что там с машиной?");
  await expect(page.getByTestId("grounded-facts")).toBeVisible();
  await expect(page.getByTestId("grounded-nothing-created")).toContainText("Ничего не создано");

  const after = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      tasks: Object.values(state.tasks).filter((item) => !item.deleted).length,
      goals: Object.values(state.goals).filter((item) => !item.deleted).length,
      proposals: Object.values(state.proposals).length
    };
  });
  expect(after).toEqual(before);
});

// A8: НАЙДЕНО ПРОБОЙ. При пяти записях ровно про машину ответ писал «дословных записей по теме
// нет»: минисёрч знает prefix и fuzzy 0.2, а «машиной» отличается от «машину» на две правки, и
// прямой проход по захватам сравнивал подстрокой. Вопрос в одной падежной форме не находил
// записи в другой — то есть цитатная часть ответа по-русски почти не работала.
test("вопрос в другой падежной форме находит свои записи", async ({ page }) => {
  await reset(page);
  await seedCarTheme(page);

  await capture(page, "Что там с машиной?");
  await expect(page.getByTestId("grounded-answer")).toBeVisible();

  const quotes = await page.getByTestId("grounded-citation-quote").allTextContents();
  expect(quotes.length).toBeGreaterThan(2);
  expect(quotes.join(" ")).toContain("машин");
  await expect(page.getByTestId("grounded-answer-text")).not.toContainText("Дословных записей по теме нет");

  // И «совпало 0 из 2» под очевидно подходящей цитатой больше не стоит.
  const ranks = await page.getByTestId("grounded-citation-rank").allTextContents();
  expect(ranks.every((line) => !line.includes("совпало 0"))).toBe(true);
});

// A9: НАЙДЕНО ПРОБОЙ. Конвейер обещал «порядок — по близости в графе», но реранк не запускался
// никогда: якорь искали по id захвата, а узел графа жизни несёт id самой сильной проекции.
// Обещание в подписи должно быть выполнено, иначе это украшение.
test("реранк по графу действительно отрабатывает, а не только обещан", async ({ page }) => {
  await reset(page);
  await seedCarTheme(page);
  await capture(page, "Марина против кредита на машину");
  await applyAll(page);

  await capture(page, "Что там с машиной?");
  await expect(page.getByTestId("grounded-answer")).toBeVisible();

  const ranks = await page.getByTestId("grounded-citation-rank").allTextContents();
  expect(ranks.length).toBeGreaterThan(2);
  const byGraph = ranks.filter((line) => /связано с первым|шаг(е|ах) от первого/.test(line));
  expect(byGraph.length).toBeGreaterThan(0);
});

// A7: подстрочное сравнение по-русски врёт (MEMORY.md, четыре случая). Факты сопоставляются по
// ОСНОВАМ, поэтому «машину» и «машины» — одна тема, а посторонние слова с общим началом не
// затаскивают в ответ чужие объекты.
test("склонения попадают в тему, посторонние слова — нет", async ({ page }) => {
  await reset(page);
  await seedCarTheme(page);
  await capture(page, "Купить маску для бассейна");
  await applyAll(page);

  await capture(page, "Что там с машиной?");
  await expect(page.getByTestId("grounded-facts")).toBeVisible();

  const lines = (await page.getByTestId("grounded-fact").allTextContents()).join(" | ");
  expect(lines).toContain("машин");
  expect(lines).not.toContain("маску");
});

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
  await page.goto(`${appUrl}?lens=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function fill(page) {
  for (const line of [
    "разогрев",
    "Позвонить Дмитрию завтра",
    "Оценить продажу старой машины",
    "Купить фильтр для воды",
    "Потратил 20000 бензин",
    "Заработал 200000 зарплата",
    "Хочу купить машину до августа"
  ]) {
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
  await page.waitForTimeout(600);
}

async function openLibrary(page) {
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("library"));
  await expect(page.getByTestId("lens-panel")).toBeVisible({ timeout: 20000 });
}

// L1: срез существует как конструктор, а не как язык запросов. Без условия он показывает
// источник целиком — пустой экран «настройте фильтр» был бы отпиской.
test("срез открывается сразу и без условия показывает источник целиком", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  await expect(page.getByTestId("lens-source")).toBeVisible();
  const view = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());
  expect(view.from).toBe("tasks");
  expect(view.shown).toBe(view.total);
  expect(view.shown).toBeGreaterThan(0);
  await expect(page.getByTestId("lens-why")).toContainText("без условия");
  expect(await page.getByTestId("lens-row").count()).toBe(view.shown);
});

// L2: смена источника меняет и колонки — поля у Денег и у Задач разные. Если бы колонки
// остались от прошлого источника, срез показывал бы пустые ячейки и врал о структуре.
test("смена источника меняет и записи, и поля", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  await page.getByTestId("lens-source").selectOption("financeTransactions");
  await page.waitForTimeout(600);

  const view = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());
  expect(view.from).toBe("financeTransactions");
  expect(view.fields.map((field) => field.id)).toContain("kind");
  await expect(page.getByTestId("lens-why")).toContainText("Деньги");

  const fieldOptions = await page.locator('[data-testid="lens-field"] option').allTextContents();
  expect(fieldOptions.join(" ")).toContain("вид");
});

// L3: условие действительно фильтрует, и «сколько было / сколько осталось» сказано вслух
// (закон №5). Число под срезом обязано сходиться с числом строк на экране.
test("условие сужает срез, и подпись объясняет чем", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  await page.getByTestId("lens-source").selectOption("financeTransactions");
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());

  await page.getByTestId("lens-field").selectOption("kind");
  await page.waitForTimeout(500);
  await page.getByTestId("lens-value-select").selectOption("income");
  await page.waitForTimeout(600);

  const after = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());
  expect(after.matched).toBeLessThan(before.total);
  expect(after.matched).toBeGreaterThan(0);
  await expect(page.getByTestId("lens-why")).toContainText("условию отвечают " + after.matched);
  expect(await page.getByTestId("lens-row").count()).toBe(after.shown);
});

// L4: наполовину набранное условие ничего не фильтрует — и подпись говорит именно это, а не
// делает вид, будто фильтр уже работает.
test("выбранное поле без значения не притворяется фильтром", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());
  await page.getByTestId("lens-field").selectOption("title");
  await page.waitForTimeout(600);

  const after = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());
  expect(after.where.field).toBe("title");
  expect(after.matched).toBe(before.total);
});

// L4b: НАЙДЕНО ПРОБОЙ, тесты этого не видели. Выбранное поле «вид» с операцией «равно» и
// пустым значением: браузер показывал выбранным первый пункт списка («доход»), подпись писала
// «вид равно доход» — а в таблице стояли и доходы, и расходы. Экран обещал одно, показывал
// другое. Теперь в списке значений первым идёт «любое», и оно же выбрано, пока значения нет.
test("недобранное условие не показывает выбранным то, что не применено", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  await page.getByTestId("lens-source").selectOption("financeTransactions");
  await page.waitForTimeout(500);
  await page.getByTestId("lens-field").selectOption("kind");
  await page.waitForTimeout(700);

  // Показано ровно то, что применено: «любое».
  expect(await page.getByTestId("lens-value-select").inputValue()).toBe("");
  const view = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());
  expect(view.complete).toBe(false);
  expect(view.matched).toBe(view.total);
  await expect(page.getByTestId("lens-why")).toContainText("ещё не дописано");

  // И в списке видны обе стороны — это и есть «пока показаны все».
  const kinds = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest().rows.map((row) => row.cells[2]));
  expect(new Set(kinds).size).toBeGreaterThan(1);

  // Сохранять такое под именем «вид равно» нельзя: имя обязано означать условие.
  await page.getByTestId("save-lens").click();
  await page.waitForTimeout(700);
  await expect(page.getByTestId("lens-saved-row").first()).toContainText("Деньги — все");
});

// L5: срез — представление, а не копия. Строка ведёт в тот же объект, что и на других экранах.
test("строка среза ведёт в объект", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  await page.getByTestId("lens-row").first().click();
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 20000 });
});

// L6: тот же срез читается таблицей — одни данные, разные рендеры (канон «данные ≠
// представление»). Набор записей от смены вида не меняется.
test("список и таблица показывают одно и то же", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  const listRows = await page.getByTestId("lens-row").count();
  await page.getByTestId("lens-render-table").click();
  await page.waitForTimeout(600);

  await expect(page.getByTestId("lens-table")).toBeVisible();
  expect(await page.getByTestId("lens-row").count()).toBe(listRows);
  const headers = await page.locator('[data-testid="lens-table"] th').allTextContents();
  expect(headers.join(" ")).toContain("название");
});

// L7: сохранённый срез — обычный артефакт: у него человеческое название, чек в Контроле и
// возврат по клику. Новой сущности под это не заводили.
test("срез сохраняется под человеческим именем и открывается обратно", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  await page.getByTestId("lens-source").selectOption("financeTransactions");
  await page.waitForTimeout(500);
  await page.getByTestId("lens-field").selectOption("kind");
  await page.waitForTimeout(500);
  await page.getByTestId("lens-value-select").selectOption("income");
  await page.waitForTimeout(500);
  await page.getByTestId("save-lens").click();
  await page.waitForTimeout(700);

  await expect(page.getByTestId("lens-saved-row").first()).toContainText("Деньги — вид равно доход");

  // Уходим на другой источник и возвращаемся по сохранённому срезу.
  await page.getByTestId("lens-source").selectOption("tasks");
  await page.waitForTimeout(600);
  expect((await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest())).from).toBe("tasks");

  await page.getByTestId("open-lens").first().click();
  await page.waitForTimeout(700);
  const restored = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());
  expect(restored.from).toBe("financeTransactions");
  expect(restored.where).toEqual({ field: "kind", op: "equals", value: "income" });

  // Закон §7: значимое действие оставило чек.
  const receipts = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().control.receipts.filter((row) => row.kind === "lens"));
  expect(receipts.length).toBeGreaterThan(0);
  expect(receipts[receipts.length - 1].summary).toContain("Деньги — вид равно доход");
});

// L8 (закон №4): тот же срез, сохранённый дважды, не удваивается.
test("повторное сохранение того же среза не плодит копии", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  await page.getByTestId("save-lens").click();
  await page.waitForTimeout(600);
  await page.getByTestId("save-lens").click();
  await page.waitForTimeout(600);

  expect(await page.getByTestId("lens-saved-row").count()).toBe(1);
});

// L9: смена источника обнуляет условие. Поле «вид» из Денег в Задачах не существует, и
// оставленное молча условие фильтровало бы по несуществующему полю — то есть по пустоте.
test("смена источника снимает условие от прежнего источника", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  await page.getByTestId("lens-source").selectOption("financeTransactions");
  await page.waitForTimeout(500);
  await page.getByTestId("lens-field").selectOption("kind");
  await page.waitForTimeout(500);
  await page.getByTestId("lens-value-select").selectOption("income");
  await page.waitForTimeout(500);

  await page.getByTestId("lens-source").selectOption("habits");
  await page.waitForTimeout(600);

  const view = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());
  expect(view.from).toBe("habits");
  expect(view.where.field).toBe("");
  expect(view.shown).toBe(view.total);
});

// L10: пустой результат — это ответ, а не поломка. И он должен так и звучать.
test("пустой срез объясняет пустоту, а не молчит", async ({ page }) => {
  await reset(page);
  await fill(page);
  await openLibrary(page);

  await page.getByTestId("lens-field").selectOption("title");
  await page.waitForTimeout(500);
  await page.getByTestId("lens-value").fill("такого текста в задачах нет");
  await page.getByTestId("lens-value").blur();
  await page.waitForTimeout(700);

  await expect(page.getByTestId("lens-empty")).toBeVisible();
  await expect(page.getByTestId("lens-empty")).toContainText("не ошибка");
  const view = await page.evaluate(() => window.__lifeosKnowledgeBase.lensViewForTest());
  expect(view.matched).toBe(0);
  expect(view.total).toBeGreaterThan(0);
});

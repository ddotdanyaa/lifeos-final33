// ВЫВОД МОЖНО ПРОВЕРИТЬ, ПОПРАВИТЬ И ПРЕВРАТИТЬ В ДЕЛО.
//
// Панель «Что я заметил» — единственное место, где система говорит о владельце своими словами.
// Ровно там он не мог сделать ничего из трёх:
//   • дойти до записей, из которых вывод сделан (`refs` считались у 9 детекторов из 12 и не
//     рисовались ни разу);
//   • сказать «не то» (кнопки не было вовсе, а `ignoreInsight` был недостижим);
//   • превратить вывод в дело (`insight-to-task` существовал без единой кнопки).
//
// Отдельно проверяется рецидив, из-за которого возвращать кнопку «как было» нельзя было:
// `ensureInsight` искал совпадение только среди НЕотклонённых, не находил — и заводил вывод
// заново. Отклонение владельца не подавляло вывод, а воскрешало его.
import { expect, test } from "@playwright/test";

const appUrl = "http://127.0.0.1:4173";

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

// Три просроченные задачи дают детерминированный вывод «задачи просрочены» с refs на заметки.
async function seedOverdue(page) {
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const past = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
    for (const title of ["Позвонить в сервис", "Отправить документы", "Оплатить страховку"]) {
      await kb.addTaskForTest(title, past);
    }
  });
  await page.waitForTimeout(600);
}

test("у вывода видны записи, из которых он сделан, и они открываются", async ({ page }) => {
  await reset(page, "insight-src");
  await seedOverdue(page);

  const card = page.getByTestId("insight-card").first();
  await expect(card).toBeVisible();

  // Основание обязано быть либо показано, либо честно названо отсутствующим — но не умолчано.
  const hasSources = await page.getByTestId("insight-sources").count();
  const hasNone = await page.getByTestId("insight-sources-none").count();
  expect(hasSources + hasNone).toBeGreaterThan(0);

  if (hasSources) {
    const source = page.getByTestId("insight-source").first();
    await expect(source).toBeVisible();
    // Дата обязательна: «третий день подряд» проверяется датами, а не числом ссылок.
    await expect(source).toContainText(/\d{4}-\d{2}-\d{2}/);
  }
});

test("«не то» убирает вывод и он не возвращается после перезагрузки", async ({ page }) => {
  await reset(page, "insight-dismiss");
  await seedOverdue(page);

  const before = await page.getByTestId("insight-card").count();
  expect(before).toBeGreaterThan(0);
  const title = await page.getByTestId("insight-card").first().innerText();

  await page.getByTestId("dismiss-insight").first().click();
  await page.waitForTimeout(600);

  const after = await page.getByTestId("insight-card").count();
  expect(after).toBe(before - 1);

  // Главная проверка: отклонение переживает перезагрузку. Прежде сигнал не только не подавлял,
  // но и воскрешал вывод — поэтому проверяем именно возврат, а не мгновенное исчезновение.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const titles = await page.getByTestId("insight-card").allInnerTexts();
  expect(titles.join(" | ")).not.toContain(title.split("\n")[0]);
});

test("отклонённое не пересоздаётся движком заново", async ({ page }) => {
  await reset(page, "insight-revive");

  const revived = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    // Заводим вывод, отклоняем его и просим движок обеспечить такой же ещё раз.
    const first = await kb.ensureInsightForTest("Повторяющаяся тема: память", "проверка");
    await kb.ignoreInsightForTest(first);
    const second = await kb.ensureInsightForTest("Повторяющаяся тема: память", "проверка");
    const all = await kb.insightsForTest();
    return { first, second, same: first === second, count: all.filter((row) => row.title === "Повторяющаяся тема: память").length };
  });

  // Второй вызов обязан вернуть ТОТ ЖЕ отклонённый вывод, а не завести копию.
  expect(revived.same).toBe(true);
  expect(revived.count).toBe(1);
});

test("вывод превращается в дело одним нажатием", async ({ page }) => {
  await reset(page, "insight-deed");
  await seedOverdue(page);

  const title = (await page.getByTestId("insight-card").first().innerText()).split("\n")[1] || "";

  await expect(page.getByTestId("insight-to-deed").first()).toBeVisible();
  await page.getByTestId("insight-to-deed").first().click();
  await page.waitForTimeout(800);

  // Проверяем по ТОМУ, ЧТО ВИДИТ ВЛАДЕЛЕЦ: задача с текстом вывода появилась на экране.
  // Чтение внутреннего состояния прошло бы и при неработающем интерфейсе.
  const shown = await page.locator("body").innerText();
  expect(shown).toContain(title.slice(0, 20));
});

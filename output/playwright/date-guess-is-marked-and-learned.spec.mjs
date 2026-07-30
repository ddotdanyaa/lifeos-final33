import { expect, test } from "@playwright/test";

// ГЕЙТ решения владельца от 2026-07-30 про нераспознанную дату:
// «Ну как понять пустой? Предположение. Мы же всегда даем предположение... человек сам же вводит
// потом правильную дату, и система может видеть то, что... мы неправильно распознали, предположили
// другую. И вообще у нас же система самообучающаяся».
// Значит три вещи вместе, иначе решение выполнено только на словах:
//   1) дата всё равно ставится (пустого поля нет);
//   2) она видна КАК предположение, а не как факт;
//   3) правка владельца записывается и меняет следующую догадку.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?date-guess=${Date.now()}`, { waitUntil: "networkidle" });
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
    await page.waitForTimeout(350);
  }
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
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

async function addTaskByHand(page, title) {
  await page.locator("#task-input").fill(title);
  await page.getByTestId("add-task").click();
  await page.waitForTimeout(400);
}

const taskByTitle = (page, title) => page.evaluate((needle) => {
  const snap = window.__lifeosKnowledgeBase.getStateSnapshot();
  return Object.values(snap.tasks || {}).find((task) => !task.deleted && task.title === needle) || null;
}, title);

test("дата не названа — ставим предположение и честно помечаем его", async ({ page }) => {
  await reset(page);
  await openSurface(page, "today");
  await addTaskByHand(page, "Собрать документы для банка");

  const task = await taskByTitle(page, "Собрать документы для банка");
  expect(task, "задача должна создаться").toBeTruthy();
  // 1) Пустой даты нет: владелец отверг пустое поле прямо.
  expect(task.day).toBeTruthy();
  // 2) И она помечена как догадка — вместе с фразой, из которой дату прочитать не удалось.
  expect(task.dayIsGuess).toBe(true);
  expect(task.dayGuessedFrom).toBe("Собрать документы для банка");
  // 3) Пометка видна на экране, а не только в состоянии.
  await expect(page.getByTestId("task-day-guess").first()).toBeVisible();
});

test("дата названа вслух — это факт, и пометки предположения нет", async ({ page }) => {
  await reset(page);
  await openSurface(page, "today");
  await addTaskByHand(page, "Позвонить в сервис завтра");

  const task = await taskByTitle(page, "Позвонить в сервис завтра");
  expect(task).toBeTruthy();
  expect(task.dayIsGuess).toBe(false);
  expect(task.dayGuessedFrom).toBe("");
  // Задача уехала на завтра, поэтому в «Сегодня» её строки нет — и пометки тоже быть не должно
  // ни у одной строки этого экрана.
  await expect(page.getByTestId("task-day-guess")).toHaveCount(0);
});

test("правка владельца записывается и меняет следующую догадку", async ({ page }) => {
  test.setTimeout(90000);
  await reset(page);
  await openSurface(page, "today");

  // Владелец трижды переносит задачу без названной даты на завтра. Это и есть его ответ на
  // вопрос «какой день ставить, когда день не назван».
  for (const title of ["Отвезти счётчики", "Забрать посылку", "Записаться к врачу"]) {
    await addTaskByHand(page, title);
    const row = page.getByTestId("task-row").filter({ hasText: title }).first();
    await row.getByTestId("snooze-tomorrow").click();
    await page.waitForTimeout(500);
  }

  const store = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().control.dateGuess);
  expect(store, "правки должны храниться").toBeTruthy();
  expect(store.corrections.length).toBe(3);
  // В правке лежит и исходная фраза, и наша догадка, и решение владельца — без этого учить нечему.
  const first = store.corrections[0];
  expect(first.phrase).toBe("Отвезти счётчики");
  expect(first.guessedDay).toBeTruthy();
  expect(first.ownerDay).toBeTruthy();
  expect(first.offsetDays).toBe(1);

  // А теперь главное: следующая задача без даты получает ЗАВТРА, а не сегодня. Система не
  // «записала правку в журнал», а изменила поведение.
  await addTaskByHand(page, "Купить лампочки");
  const learned = await taskByTitle(page, "Купить лампочки");
  const tomorrow = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  });
  expect(learned.dayIsGuess).toBe(true);
  expect(learned.day).toBe(tomorrow);
});

test("правка на дату, которую нельзя обобщить, не портит правило", async ({ page }) => {
  await reset(page);
  await openSurface(page, "today");
  await addTaskByHand(page, "Разобрать старые чеки");
  const row = page.getByTestId("task-row").filter({ hasText: "Разобрать старые чеки" }).first();
  await row.getByTestId("snooze-tomorrow").click();
  await page.waitForTimeout(500);

  // Одной правки мало: вывод по одному примеру был бы шумом, а не обучением.
  await addTaskByHand(page, "Проверить показания воды");
  const next = await taskByTitle(page, "Проверить показания воды");
  const today = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().todayKey || new Date().toISOString().slice(0, 10));
  expect(next.day).toBe(today);
  // И повторная правка той же задачи не записывается второй раз: догадка уже стала фактом.
  const store = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().control.dateGuess);
  expect(store.corrections.length).toBe(1);
});

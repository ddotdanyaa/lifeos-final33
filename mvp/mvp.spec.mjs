// Сквозная проверка MVP: пять болей, каждая от начала до конца, глазами владельца.
// Все проверки идут через ВИДИМОЕ на экране — чтение внутреннего состояния прошло бы
// и при полностью сломанном интерфейсе.
import { expect, test } from "@playwright/test";

const url = "http://127.0.0.1:4180";
test.use({ viewport: { width: 900, height: 1400 } });
test.setTimeout(90000);

async function open(page) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__mvp);
  await page.evaluate(() => window.__mvp.reset());
  await page.waitForTimeout(200);
}

async function write(page, text) {
  await page.getByTestId("capture-input").fill(text);
  await page.getByTestId("save-record").click();
  await page.waitForTimeout(300);
}

test("S1 · пишу мысль, ничего не выбирая — тип определяется сам", async ({ page }) => {
  await open(page);
  await write(page, "Надо позвонить в сервис и записаться на диагностику.");
  await expect(page.getByTestId("facts")).toBeVisible();
  await expect(page.getByTestId("fact-type").first()).toHaveText("задача");
  // Нигде на экране владелец не выбирал тип.
  await expect(page.locator("select")).toHaveCount(0);
});

test("S1 · черновик переживает перезагрузку", async ({ page }) => {
  await open(page);
  await page.getByTestId("capture-input").fill("Недописанная мысль про машину");
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await expect(page.getByTestId("capture-input")).toHaveValue("Недописанная мысль про машину");
});

test("S2 · каждый вывод отдельно, с цитатой и своими кнопками", async ({ page }) => {
  await open(page);
  await write(page, "Потратил 800 рублей на такси. Надо отправить документы. Может быть, стоит сменить работу.");

  const facts = page.getByTestId("fact");
  expect(await facts.count()).toBeGreaterThanOrEqual(3);

  // У каждого вывода — своя цитата и свои три кнопки. Одной кнопки «принять всё» нет.
  for (let i = 0; i < await facts.count(); i += 1) {
    await expect(facts.nth(i).getByTestId("fact-quote")).toContainText("из фразы:");
    await expect(facts.nth(i).getByTestId("fact-accept")).toBeVisible();
    await expect(facts.nth(i).getByTestId("fact-reject")).toBeVisible();
  }
  const all = await page.locator("body").innerText();
  expect(all).not.toContain("Принять всё");
});

test("S2 · неуверенный вывод спрашивает, а не решает", async ({ page }) => {
  await open(page);
  await write(page, "Может быть, стоит продать машину.");
  const ask = page.getByTestId("fact-ask").first();
  await expect(ask).toBeVisible();
  await expect(ask).toContainText("не уверен");
  await expect(page.getByTestId("fact-confidence").first()).toContainText("не уверен");
});

test("S3 · похожее показывается ДО сохранения", async ({ page }) => {
  await open(page);
  await write(page, "Думаю про долговременную память системы");
  await page.getByTestId("capture-input").fill("Опять мысли про долговременную память");
  await page.waitForTimeout(500);
  await expect(page.getByTestId("similar-before-save")).toBeVisible();
  await expect(page.getByTestId("similar-record").first()).toBeVisible();
});

test("S4 · у вывода видны записи с датами, и они открываются", async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.__mvp.seed([
    { text: "Думаю про долговременную память и как её хранить", createdAt: "2026-07-28T10:00:00.000Z" },
    { text: "Снова возвращаюсь к долговременной памяти системы", createdAt: "2026-07-30T10:00:00.000Z" },
    { text: "Долговременная память — главное направление", createdAt: "2026-08-01T10:00:00.000Z" }
  ]));
  await page.waitForTimeout(400);

  const insight = page.getByTestId("insight").first();
  await expect(insight).toBeVisible();
  await expect(page.getByTestId("insight-sources").first()).toBeVisible();
  const source = page.getByTestId("insight-source").first();
  await expect(source).toContainText(/\d{4}-\d{2}-\d{2}/);
  await expect(page.getByTestId("insight-confidence").first()).toContainText("уверенность");
});

test("S4 · вывод можно отклонить, и он не возвращается", async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.__mvp.seed([
    { text: "Думаю про долговременную память и как её хранить", createdAt: "2026-07-28T10:00:00.000Z" },
    { text: "Снова возвращаюсь к долговременной памяти системы", createdAt: "2026-07-30T10:00:00.000Z" }
  ]));
  await page.waitForTimeout(400);

  const before = await page.getByTestId("insight").count();
  expect(before).toBeGreaterThan(0);
  await page.getByTestId("insight-dismiss").first().click();
  await page.waitForTimeout(400);
  expect(await page.getByTestId("insight").count()).toBe(before - 1);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  expect(await page.getByTestId("insight").count()).toBe(before - 1);
});

test("S5 · мои правки меняют поведение, и это видно", async ({ page }) => {
  await open(page);

  // Сутки без правок — панель честно молчит.
  await expect(page.getByTestId("learning-empty")).toBeVisible();

  // Пять раз подряд отклоняю выводы одного типа — ровно порог, после которого вес двигается.
  for (let i = 0; i < 5; i += 1) {
    await write(page, `Может быть, стоит подумать над вариантом номер ${i}.`);
    await page.getByTestId("fact-reject").first().click();
    await page.waitForTimeout(200);
  }

  await expect(page.getByTestId("learning-signals")).toContainText("Твоих правок: 5");
  const change = page.getByTestId("learning-change").first();
  await expect(change).toBeVisible();
  await expect(page.getByTestId("learning-change-value").first()).toContainText("осторожнее");

  // И-6: до каждой строки можно дойти.
  await page.getByTestId("learning-sources-toggle").click();
  await expect(page.getByTestId("learning-source").first()).toBeVisible();

  // Главное: следующий такой же вывод приходит с УЧТЁННЫМ весом, а не с прежним.
  await write(page, "Может быть, стоит взять отпуск.");
  await expect(page.getByTestId("fact-learned").first()).toContainText("поправлено твоей историей");
});

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
  await page.goto(`${appUrl}?knowledge=${Date.now()}`, { waitUntil: "networkidle" });
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
  await page.waitForTimeout(280);
}

async function applyAll(page) {
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(400);
}

async function insights(page) {
  return page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().insights || {})
    .filter((item) => !item.deleted).map((item) => item.title));
}

// K1: коллекция знаний состоит из того, что знает ВЛАДЕЛЕЦ. Служебные шаги разбора
// («Сохранить источник в библиотеку», «Записать связи и контроль») описывают, что делает
// система. Прогон вечернего дампа из 22 записей давал 60 «инсайтов», из которых 44 были ровно
// такими строками — коллекция знаний состояла из машинерии платформы.
test("служебные шаги разбора не становятся знанием", async ({ page }) => {
  await reset(page);
  await capture(page, "Ремонт кухни аванс подрядчику");
  await capture(page, "Смета на кухню пришла");
  await applyAll(page);

  const titles = await insights(page);
  expect(titles.filter((title) => /Сохранить источник|Записать связи|Открыть контекст/i.test(title))).toEqual([]);

  // Шаг при этом не «пропал»: он отмечен выполненным, и это видно в журнале.
  const applied = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().proposals)
    .filter((item) => item.status === "applied" && /Записать связи и контроль/i.test(item.title || "")).length);
  expect(applied).toBeGreaterThan(0);
});

// K2 (закон №4 внутри извлечения): у человека объект УЖЕ есть — карточка `person:<имя>`.
// Материализация сущностей заводила рядом второй объект «👤 Дмитрию», и один и тот же человек
// находился в поиске дважды.
test("человек не получает второй объект при извлечении сущностей", async ({ page }) => {
  await reset(page);
  await capture(page, "Надо ответить Дмитрию до среды");
  await applyAll(page);

  const titles = await insights(page);
  expect(titles.filter((title) => /^👤/.test(title))).toEqual([]);
  expect(titles.filter((title) => /^📅/.test(title))).toEqual([]);

  // Человек при этом на месте — и он один.
  const people = await page.evaluate(() => window.__lifeosKnowledgeBase.resolvePeopleForTest());
  expect(people.filter((row) => /дмитри/i.test(row.name)).length).toBe(1);
});

// K3: прилагательное — не место. Основа «Англи» совпадала с началом слова «Английский», и запись
// про язык давала страну Англию отдельным узлом знания.
test("«английский» не становится страной", async ({ page }) => {
  await reset(page);
  await capture(page, "Английский снова откладываю");
  await applyAll(page);

  const titles = await insights(page);
  expect(titles.filter((title) => /Англия/i.test(title))).toEqual([]);
});

// K4: заглавное слово в начале фразы — не имя. «Ремонт кухни аванс подрядчику» давало человека
// по имени Ремонт, и панель «Люди» наполнялась предметами записей.
test("нарицательное в начале записи не становится человеком", async ({ page }) => {
  await reset(page);
  await capture(page, "Ремонт кухни аванс подрядчику");
  await capture(page, "Подписка списалась опять");

  const people = await page.evaluate(() => window.__lifeosKnowledgeBase.resolvePeopleForTest().map((row) => row.name));
  expect(people.filter((name) => /Ремонт|Подписка/i.test(name))).toEqual([]);
});

// K5: название проекта из нескольких слов не рассыпается на людей. «Новая Платформа» лежала в
// наборе проектов целиком, а заглавные слова проверялись по одному — и обе половины уезжали
// в список людей.
test("многословный проект не рассыпается на людей", async ({ page }) => {
  await reset(page);
  await capture(page, "Встреча с Анной о проекте Новая Платформа в Москве на сегодня");

  const people = await page.evaluate(() => window.__lifeosKnowledgeBase.resolvePeopleForTest().map((row) => row.name));
  expect(people.filter((name) => /Новая|Платформа|Москв/i.test(name))).toEqual([]);
  expect(people.some((name) => /Анн/i.test(name))).toBe(true);
});

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
test.setTimeout(120000);

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

// E1: имя без слова-подсказки. Реальные голосовые звучат как «Марина против кредита» —
// раньше такие имена терялись целиком, и люди почти не появлялись в графе.
test("сущности: имя распознаётся без слова-подсказки", async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(() => {
    const extract = window.__lifeosKnowledgeBase.extractEntitiesFromText;
    return {
      lead: extract("Марина против кредита на машину").people,
      mid: extract("Надо ответить Дмитрию до среды").people,
      cue: extract("Сегодня встретился с Игорем и Сергеем").people
    };
  });
  expect(result.lead).toContain("Марина");
  expect(result.mid).toContain("Дмитрию");
  expect(result.cue).toEqual(expect.arrayContaining(["Игорем", "Сергеем"]));
});

// E2: заглавная буква сама по себе не делает человека. Глагол в начале фразы, место в косвенном
// падеже и магазин в записи про трату людьми считаться не должны.
test("сущности: глаголы, места и магазины не становятся людьми", async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(() => {
    const extract = window.__lifeosKnowledgeBase.extractEntitiesFromText;
    return {
      verb: extract("Хочу купить машину до августа").people,
      trip: extract("Съездили в Москву с Аней"),
      spend: extract("Потратил 4380 продукты Лента").people
    };
  });
  expect(result.verb).toEqual([]);
  // Место распознано как место и не продублировано человеком в косвенном падеже.
  expect(result.trip.places).toContain("Москва");
  expect(result.trip.people).toContain("Аней");
  expect(result.trip.people).not.toContain("Москву");
  expect(result.trip.people).not.toContain("Съездили");
  // Магазин в записи про трату — не человек.
  expect(result.spend).toEqual([]);
});

// E3: падежи одного человека — один человек, а не три записи в панели «Люди».
test("люди: падежи одного имени сводятся в одного человека", async ({ page }) => {
  await reset(page);
  for (const line of ["Марина против кредита на машину", "Позвонить Марине завтра", "Дмитрий ждёт ответа", "Надо ответить Дмитрию до среды"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await expect(page.getByTestId("people-panel")).toBeVisible();

  const people = await page.getByTestId("person-row").allTextContents();
  const marina = people.filter((row) => /Марин/i.test(row));
  const dmitry = people.filter((row) => /Дмитр/i.test(row));
  // По одной строке на человека, а не по строке на падеж.
  expect(marina.length).toBe(1);
  expect(dmitry.length).toBe(1);
  // Показывается именительный падеж, а косвенный остаётся псевдонимом.
  expect(marina[0]).toContain("Марина");
  expect(dmitry[0]).toContain("Дмитрий");
  // Обе записи засчитаны одному человеку.
  expect(marina[0]).toContain("2");
  expect(dmitry[0]).toContain("2");
});

// E4: человек — полноценный объект. Раньше клик по человеку вёл в Граф, то есть в никуда;
// теперь у него тот же контракт: вердикт, источники, связи, хронология.
test("люди: человек открывается карточкой объекта с источниками и связями", async ({ page }) => {
  await reset(page);
  for (const line of ["Марина против кредита на машину", "Позвонить Марине завтра", "Марина согласна на август"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.getByTestId("person-row").first().click();

  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("object-title")).toHaveText("Марина");
  await expect(page.getByTestId("object-kind")).toContainText("человек");
  // Вердикт опирается на посчитанные упоминания, а не на общие слова.
  await expect(page.getByTestId("object-verdict")).toContainText("3");
  // Род имени системе неизвестен — «связан/связана» писать нельзя.
  const verdict = await page.getByTestId("object-verdict").textContent();
  expect(verdict).not.toMatch(/Связан[аы]?\s/);

  // Источники — реальные захваты, где встретилось имя.
  await page.getByTestId("object-tab-src").click();
  expect(await page.getByTestId("object-source-row").count()).toBeGreaterThanOrEqual(3);

  // Связи — объекты, в тексте которых человек упомянут.
  await page.getByTestId("object-tab-rel").click();
  expect(await page.getByTestId("object-relation").count()).toBeGreaterThan(0);
  await expect(page.getByTestId("object-relation-why").first()).toContainText("упомянут");
});

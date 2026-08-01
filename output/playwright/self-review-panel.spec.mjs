// СРЕЗ Д · «ЧТО Я ПОНЯЛ О СЕБЕ» — ВТОРОЙ ЦИКЛ.
//
// Владелец 2026-07-31: «система сама будет писать, что ей нужно далее для разработки». Первый цикл
// уже работал: калибровка училась на решениях владельца и делала предложения точнее. Второго —
// взгляда системы на СВОИ ошибки — не было, и все посчитанные числа (калибровка, антилесть,
// канарейка) никуда не выходили.
//
// Спека держит два требования, и второе важнее первого:
//   1) панель есть в Контроле, и «самое слабое место» — непустая строка;
//   2) при нехватке данных она ЧЕСТНО говорит «пока не знаю: решений N из 8», а не молчит и не
//      придумывает вывод. Пустая строка и правдоподобная фраза здесь одинаково плохи: первая
//      выглядит как поломка, вторая — как знание, которого нет.
//
// Пороги живут в `core/self-review.mjs` (MIN_DECISIONS=20 на предложение убрать тип) и в app.js
// (MIN_DECISIONS_FOR_TRUST=8 на доверие к типу). Спека проверяет их поведение, а не переписывает.
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

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.evaluate(() => window.__lifeosKnowledgeBase.forgetDecisionsForTest());
}

async function openControl(page) {
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("control"));
  await expect(page.getByTestId("control-self-review")).toBeVisible({ timeout: 20000 });
}

function seedDecisions(page, rows) {
  return page.evaluate((seed) => window.__lifeosKnowledgeBase.seedDecisionsForTest(seed), rows);
}

// S1: панель существует и говорит словами. Пустая строка «самого слабого места» — это молчание,
// а молчание системы о себе владелец справедливо читает как «нечего показать».
test("в Контроле есть панель самонаблюдения с непустой строкой о слабом месте", async ({ page }) => {
  await reset(page, "self-review-exists");
  await openControl(page);

  const panel = page.getByTestId("control-self-review");
  await expect(panel).toContainText("Что я понял о себе");
  const weakest = page.getByTestId("self-review-weakest");
  await expect(weakest).toBeVisible();
  const text = (await weakest.textContent() || "").trim();
  expect(text.length, "строка о слабом месте не имеет права быть пустой").toBeGreaterThan(0);
});

// S2: журнал пуст — и это ровно тот случай, ради которого спека написана. Система обязана
// назвать НЕХВАТКУ ЧИСЛОМ: «решений 0 из 8». Не «всё хорошо», не пусто.
test("журнал пуст — панель честно называет нехватку числом, а не молчит", async ({ page }) => {
  await reset(page, "self-review-empty");
  await openControl(page);

  const weakest = page.getByTestId("self-review-weakest");
  await expect(weakest).toContainText("Пока не знаю");
  await expect(weakest).toContainText("решений в журнале 0 из 8");
  // Предлагать при пустом журнале нечего, и это тоже сказано вслух, а не показано пустотой.
  await expect(page.getByTestId("self-review-empty")).toBeVisible();
  await expect(page.getByTestId("self-review-row")).toHaveCount(0);
});

// S3: данных мало, но они есть. Число в строке — настоящий счётчик журнала, а не константа:
// три решения обязаны читаться как «3 из 8», иначе фраза декоративная.
test("решений меньше порога — в строке стоит настоящий счётчик, а не общая фраза", async ({ page }) => {
  await reset(page, "self-review-thin");
  await seedDecisions(page, [
    { type: "task", decision: "applied" },
    { type: "task", decision: "applied" },
    { type: "task", decision: "dismissed" }
  ]);
  await openControl(page);

  await expect(page.getByTestId("self-review-weakest")).toContainText("решений в журнале 3 из 8");
  // Порог предложения (20) выше порога доверия (8) намеренно: ошибиться в оценке уверенности
  // дёшево, а зря убрать из продукта работающее — нет.
  await expect(page.getByTestId("self-review-row")).toHaveCount(0);
});

// S4: данных хватило — «пока не знаю» обязано СМЕНИТЬСЯ выводом с числом. Иначе честная фраза
// становится вечной отговоркой, и панель не самонаблюдение, а заглушка.
test("данных хватило — вместо «пока не знаю» появляется вывод с числом под ним", async ({ page }) => {
  await reset(page, "self-review-measured");
  // Двадцать решений по одному типу, из них принято одно: владелец отклоняет этот тип почти
  // всегда, и самое дешёвое улучшение продукта — перестать его показывать.
  const rows = [{ type: "reminder", decision: "applied" }];
  for (let index = 0; index < 19; index += 1) rows.push({ type: "reminder", decision: "dismissed" });
  await seedDecisions(page, rows);
  await openControl(page);

  const weakest = page.getByTestId("self-review-weakest");
  await expect(weakest).not.toContainText("Пока не знаю");
  await expect(weakest).toContainText("Я зря показываю «reminder»");
  // Число обязательно: «кажется, стоит починить X» — это не наблюдение.
  await expect(weakest).toContainText("из 20");

  const candidate = page.getByTestId("self-review-row").first();
  await expect(candidate).toBeVisible();
  await expect(candidate.getByTestId("self-review-evidence")).toContainText("Ты взял");
  await expect(candidate.getByTestId("self-review-evidence")).toContainText("20");
  // Двадцать решений выше порога доверия — значит «измерено», а не «мало данных».
  await expect(candidate.locator(".control-self-trust")).toHaveAttribute("data-raw-trusted", "yes");
  // Кандидатов не больше трёх: десять предложений владелец не прочитает и согласится со всеми.
  expect(await page.getByTestId("self-review-row").count()).toBeLessThanOrEqual(3);
});

// S5: система смотрит на СЕБЯ, а не на данные владельца. Вердикты по похожим мыслям — единственный
// сигнал о качестве самой подсказки, и панель обязана уметь сказать о ней отдельно.
test("панель считает точность собственной подсказки о повторе, а не только типы владельца", async ({ page }) => {
  await reset(page, "self-review-hint");
  // Восемь вердиктов по подсказке, из них подтверждены два: подсказка видит повтор там, где его
  // нет. Тип строкой — тот же `SIMILAR_VERDICT_TYPE`, которым пишет вердикт сам продукт.
  const rows = [{ type: "похожая мысль", decision: "applied" }, { type: "похожая мысль", decision: "applied" }];
  for (let index = 0; index < 6; index += 1) rows.push({ type: "похожая мысль", decision: "dismissed" });
  await seedDecisions(page, rows);
  await openControl(page);

  const weakest = page.getByTestId("self-review-weakest");
  await expect(weakest).toContainText("Я слишком часто вижу повтор там, где его нет");
  // Два подтверждения из восьми — это ровно 25%, и число обязано быть посчитанным, а не круглым.
  await expect(weakest).toContainText("Из 8 подсказок ты подтвердил 25%");
});

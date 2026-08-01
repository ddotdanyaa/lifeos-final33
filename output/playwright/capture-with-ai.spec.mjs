// «РАЗОБРАТЬ С ИИ» — ВТОРАЯ ГЛУБИНА ОДНОГО ДЕЙСТВИЯ, И ОНА ЧЕСТНА В ОТКАЗЕ.
//
// Владелец 2026-08-01, на своей же мысли про смену в такси: «этот разбор по цифрам, по датам, по
// времени. Но этого недостаточно, чтобы по смыслу понять. Поэтому две кнопки: разобрать — и
// разобрать с Оллама». Правила видят «завтра», «12 часов», «такси» — и не видят, что за этим
// стоит решение, которое надо принять сегодня вечером.
//
// Опасность у такой кнопки ровно одна, и она не про качество модели. Модель у владельца
// выключена, не выбрана или не запущена — это НОРМАЛЬНОЕ состояние, а не сбой. Кнопка, которая
// в этом состоянии молчит, читается как сломанная; кнопка, которая рисует успех, — врёт
// (CLAUDE.md §7: `not-connected` / `provider_unavailable` никогда не имитируются). А кнопка,
// которая теряет запись, пока ждёт модель, хуже обеих.
//
// Спека проверяет именно это:
//   1) «с ИИ» стоит РЯДОМ с «Разобрать», а не вместо неё — одно действие с двумя глубинами;
//   2) модель не выбрана → на экране честное «не выбрана», а запись УЖЕ сохранена правилами;
//   3) модель выбрана, но демон не отвечает → на экране назван отказ, чек провайдера пишет его
//      настоящим статусом, и снова ничего не потеряно;
//   4) пустое поле → ответ словами, а не тишина.
//
// Демон здесь не поднимается: ответ Ollama подменяется на сетевом уровне (тот же приём, что в
// ollama-live-chat.spec.mjs). Спека, которой нужен запущенный Ollama, проверяла бы машину, а не
// продукт.
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
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";

// Та самая мысль владельца: правила достанут из неё день и время, а смысл («решить сегодня
// вечером, во сколько вставать») — только модель. На ней и видно, что даёт каждая половина.
const SHIFT_THOUGHT = "Завтра в 12 смена в такси, надо выспаться";

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

function liveSources(page) {
  return page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {})
    .filter((source) => source && !source.deleted)
    .map((source) => ({ id: source.id, text: String(source.text || source.transcriptText || "") })));
}

function speechIntentRuns(page) {
  return page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().providerRuns || {})
    .filter((run) => run && run.providerId === "ollama" && run.kind === "speech-intents")
    .map((run) => ({ status: String(run.status || ""), summary: String(run.summary || "") })));
}

// Выбрать модель без живого демона: список моделей подменяется на сетевом уровне, дальше
// продукт идёт своим обычным путём — кнопкой «Проверить» в Чате, как это делает владелец.
async function selectModelWithoutDaemon(page, modelName) {
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: [{ name: modelName }] })
  }));
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("chat"));
  await page.getByTestId("probe-ollama").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "models_found", { timeout: 20000 });
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("capture"));
  await expect(page.getByTestId("capture-input")).toBeVisible({ timeout: 20000 });
}

// A1: две кнопки, склеенные в одну форму. Это утверждение о том, что владельцу НЕ НАДО выбирать
// между «сохранить» и «понять»: обычный разбор остаётся главным действием, «с ИИ» стоит справа
// от него второй глубиной. Разнеси их по разным местам — и выбор возвращается.
test("«с ИИ» стоит рядом с «Разобрать», а не вместо неё", async ({ page }) => {
  await reset(page, "ai-button-place");
  const main = page.getByTestId("capture-text");
  const withAi = page.getByTestId("capture-with-ai");
  await expect(main).toBeVisible();
  // Видна сразу, без раскрытия «Ещё»: спрятанная вторая глубина — это отсутствующая вторая
  // глубина.
  await expect(withAi).toBeVisible();

  const mainBox = await main.boundingBox();
  const aiBox = await withAi.boundingBox();
  expect(mainBox).toBeTruthy();
  expect(aiBox).toBeTruthy();
  expect(aiBox.x, "«с ИИ» — правая половина того же действия").toBeGreaterThan(mainBox.x);
  expect(Math.abs(aiBox.y - mainBox.y), "обе половины стоят одной строкой").toBeLessThan(mainBox.height);
  // Кнопка называет цену: «медленнее, но понимает смысл». Без этого владелец не может выбрать
  // осознанно, а значит будет выбирать наугад.
  await expect(withAi).toHaveAttribute("title", /смысл/i);
});

// A2 — главный случай. У владельца локальная модель НЕ ВЫБРАНА (`selectedModel` пуст по
// умолчанию), и это состояние, в котором он нажмёт кнопку первым. Продукт обязан сказать это
// словами — и всё равно сохранить запись правилами, потому что мысль дороже разбора.
test("модель не выбрана: ответ честный, запись сохранена правилами", async ({ page }) => {
  await reset(page, "ai-not-connected");
  const before = await liveSources(page);

  await page.getByTestId("capture-input").fill(SHIFT_THOUGHT);
  await page.getByTestId("capture-with-ai").click();

  const notice = page.getByTestId("home-surface-notice");
  await expect(notice).toBeVisible({ timeout: 60000 });
  // Названы обе половины ответа: чего нет и что при этом сделано.
  await expect(notice).toContainText("Локальная модель не выбрана");
  await expect(notice).toContainText("по правилам уже сохранён");
  // §7: успеха, которого не было, на экране нет.
  await expect(notice).not.toContainText("Модель добавила");
  await expect(notice).not.toContainText("Модель прочитала");

  // Запись существует. Это и есть «ничего не потеряно»: правила отработали ДО обращения к
  // модели, а не после её ответа.
  const after = await liveSources(page);
  expect(after.length, "запись обязана появиться независимо от модели").toBe(before.length + 1);
  expect(after.some((source) => source.text.includes("смена в такси"))).toBe(true);
  await expect(page.getByTestId("capture-input")).toHaveValue("", { timeout: 20000 });

  // И правила действительно разобрали её: построчный разбор на экране — то же, что дала бы
  // обычная кнопка. «С ИИ» никогда не хуже обычной — в этом и был смысл склейки.
  await expect(page.getByTestId("parse-breakdown")).toBeVisible({ timeout: 20000 });
  expect(await page.getByTestId("parse-row").count()).toBeGreaterThan(0);
});

// A3: модель выбрана, но демона нет — Ollama не запущен, ноутбук в дороге, порт занят. Отказ
// обязан быть НАЗВАН, а не сведён к «ничего не найдено»: это разные вещи, и владелец по ним
// принимает разные решения (запустить Ollama против «модель посмотрела и не увидела»).
test("модель выбрана, но не отвечает: отказ назван, и ничего не потеряно", async ({ page }) => {
  await reset(page, "ai-provider-down");
  await selectModelWithoutDaemon(page, "qwen3:4b");
  // Демон недоступен ровно так, как это выглядит при незапущенном Ollama: соединение не
  // устанавливается.
  await page.route("**/api/generate", (route) => route.abort("connectionrefused"));
  const before = await liveSources(page);

  await page.getByTestId("capture-input").fill(SHIFT_THOUGHT);
  await page.getByTestId("capture-with-ai").click();

  const notice = page.getByTestId("home-surface-notice");
  await expect(notice).toBeVisible({ timeout: 60000 });
  await expect(notice).toContainText("Модель не ответила");
  await expect(notice).toContainText("Разбор по правилам сохранён");
  await expect(notice).not.toContainText("Модель добавила");

  const after = await liveSources(page);
  expect(after.length, "запись сохраняется до обращения к модели — падение демона её не трогает").toBe(before.length + 1);
  await expect(page.getByTestId("parse-breakdown")).toBeVisible({ timeout: 20000 });

  // Отказ уходит в чек провайдера своим настоящим статусом. Экранная фраза живёт минуту, а
  // Контроль отвечает на вопрос «почему разбор с ИИ ничего не даёт уже неделю».
  const runs = await speechIntentRuns(page);
  expect(runs.length, "обращение к модели обязано оставить чек, даже если оно не удалось").toBeGreaterThan(0);
  expect(runs.some((run) => run.status === "provider_unavailable"), "статус в чеке — настоящий, а не «ok»").toBe(true);
});

// A4: пустое поле. Раньше это был главный источник «кнопка не работает»: обработчик честно
// решал ничего не делать и молчал (правило core/surface-notice.mjs). Модели тут нечего разбирать
// — но сказать об этом обязательно.
test("пустое поле: «с ИИ» отвечает словами, а не тишиной", async ({ page }) => {
  await reset(page, "ai-empty");
  const before = await liveSources(page);

  await page.getByTestId("capture-with-ai").click();

  const notice = page.getByTestId("home-surface-notice");
  await expect(notice).toBeVisible({ timeout: 20000 });
  await expect(notice).toContainText("Сначала напиши мысль");
  // И пустая запись не заводится: молчание было плохо, но пустой артефакт — хуже.
  expect((await liveSources(page)).length).toBe(before.length);
});

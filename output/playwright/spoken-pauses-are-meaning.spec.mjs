import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

// Настоящая диктофонная запись владельца: двадцать минут живой речи, знаков препинания нет
// вовсе, границы — только паузы, которые whisper отдаёт отдельными строками.
const SPOKEN = [
  "Так короче я поработал с 8 до 3 часа",
  "Я заработал уже с вычетом налогов и комиссией",
  "Сейчас еду к Володе потому что тут рядом",
  "Надо в аптеку заехать выкупить таблетки"
].join("\n");

async function open(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.analyzeArtifactInput);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

function meaningfulDrafts(page, text) {
  return page.evaluate((value) => window.__lifeosKnowledgeBase.analyzeArtifactInput(value).drafts
    .filter((item) => !["knowledge-summary", "automation-context", "control-graph"].includes(item.draftId))
    .map((item) => ({ type: item.type, title: item.title })), text);
}

// Владелец расшифровал настоящую запись и увидел ОДНУ задачу, названием которой был весь текст
// на пол-экрана. Причина не в разборе: whisper отдаёт речь разбитой по паузам говорящего, а
// приложение прогоняло её через очистку, которая схлопывает любые пробельные символы, включая
// переводы строк. Единственные границы смысла, какие есть у речи без знаков препинания,
// уничтожались до того, как разбор их видел.
test("паузы говорящего дают отдельные смыслы, а не одну простыню", async ({ page }) => {
  await open(page, "spoken");

  const drafts = await meaningfulDrafts(page, SPOKEN);
  expect(drafts.length, "четыре фразы — не один объект").toBeGreaterThan(2);

  const titles = drafts.map((item) => item.title);
  // Каждое название — про СВОЮ фразу и помещается в строку.
  for (const title of titles) {
    expect(title.length, "название объекта не бывает длиной в абзац: " + title).toBeLessThanOrEqual(90);
  }
  expect(titles.some((title) => /аптек/i.test(title)), "последняя фраза не должна теряться").toBe(true);
  expect(titles.some((title) => /Волод/i.test(title))).toBe(true);
});

// «с 8 до 3 часа» — это смена, а не срок цели. Правило «до <число> <слово>» ловило любое слово,
// и рабочий день объявлялся целью с названием во весь экран.
test("«с 8 до 3 часа» не становится целью, а «до 5 августа» остаётся сроком", async ({ page }) => {
  await open(page, "spoken-goal");

  const shift = await meaningfulDrafts(page, "Так короче я поработал с 8 до 3 часа");
  expect(shift.some((item) => item.type === "goal"), "рабочая смена целью не является").toBe(false);

  const goal = await meaningfulDrafts(page, "Хочу купить машину до 5 августа");
  expect(goal.some((item) => item.type === "goal"), "настоящий срок обязан остаться целью").toBe(true);
});

// «Люди: вычетом, Так, Сейчас, Володе» — из четырёх «людей» человеком был один.
test("из речи в люди попадают люди, а не зачины фраз и предлоги", async ({ page }) => {
  await open(page, "spoken-people");

  const people = await page.evaluate((value) => window.__lifeosKnowledgeBase.extractEntitiesFromText(value).people, SPOKEN);
  expect(people).toContain("Володе");
  // Флаг регистронезависимости отменял требование заглавной буквы у имени: «с вычетом налогов»
  // давало человека по имени «вычетом».
  expect(people.join(" ").toLowerCase()).not.toContain("вычет");
  // Перевод строки — конец фразы: слово в начале строки заглавное по правилам письма, а не
  // потому что это имя.
  expect(people).not.toContain("Так");
  expect(people).not.toContain("Сейчас");

  // И обратная сторона: настоящие имена по-прежнему находятся, а глагол-подсказка человеком не
  // становится («Встретил Дмитрия» — это один человек, а не два).
  const normal = await page.evaluate(() => window.__lifeosKnowledgeBase.extractEntitiesFromText("Встретил Дмитрия и Марину, звонил Ольге").people);
  expect(normal).toContain("Дмитрия");
  expect(normal).toContain("Марину");
  expect(normal).toContain("Ольге");
  expect(normal).not.toContain("Встретил");
});

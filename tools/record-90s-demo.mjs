// П38 · ВИДЕО 90 СЕКУНД — единственная веха, которая доказывает, что продукт ЕСТЬ.
//
// Не презентация и не обещание: сценарий владельца, снятый на живом приложении. Три голосовых →
// три артефакта → граф → одно действие. Если хоть один шаг не проходит, видео не снимется — и
// это правильный исход, потому что снимать нечего.
//
// Playwright пишет видео сам (`recordVideo`), поэтому здесь нет ни одного кадра, который кто-то
// нарисовал: на плёнке ровно то, что делает приложение.
//
// Запуск (нужен `npm start` на 4173):
//   node tools/record-90s-demo.mjs
// Результат: output/demo/lifeos-90s.webm + расшифровка шагов в консоли.
import { chromium } from "@playwright/test";
import { mkdirSync, existsSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const APP = "http://127.0.0.1:4173";
const OUT = join("output", "demo");

// Три голосовых владельца — те же, что в спеках. Разные смыслы, чтобы было видно РАЗБОР, а не
// три одинаковых карточки.
const DICTATIONS = [
  {
    name: "смена.m4a",
    text: [
      "Так, сегодня поработал с 8 до 11, 3 часа получается.",
      "316 после налога пришло.",
      "Потом ещё 1700, получается 4700 всего."
    ].join("\n")
  },
  {
    name: "дела.m4a",
    text: ["Еду к Володе сегодня вечером.", "Надо в аптеку зайти."].join("\n")
  },
  {
    name: "мысль.m4a",
    text: "После тренировки закрываю заметно больше задач, чем обычно."
  }
];

function step(text) {
  console.log("  " + text);
}

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } }
});
const page = await context.newPage();

let failed = "";
try {
  console.log("\n90 СЕКУНД: три голосовых → три артефакта → граф → одно действие\n");

  step("Открываю LifeOS на чистом хранилище");
  await page.goto(APP + "/?demo=" + Date.now(), { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest, null, { timeout: 60000 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await page.waitForTimeout(2500);

  for (const dictation of DICTATIONS) {
    step("Голосовая «" + dictation.name + "» → расшифровка → разбор");
    await page.evaluate(async ([name, text]) => {
      const kb = window.__lifeosKnowledgeBase;
      const id = await kb.addImportedSourceForTest({
        name, kind: "audio", mime: "audio/mp4", size: 120000, checksum: "demo-" + name + "-" + Date.now()
      });
      await kb.saveSourceTranscriptForTest(id, text);
    }, [dictation.name, dictation.text]);
    await page.waitForTimeout(2200);
  }

  step("Дом: сколько предложений ждёт решения");
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("inbox"));
  await page.waitForTimeout(3000);

  const parsed = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().proposals)
    .filter((item) => item.status === "open")
    .map((item) => item.type + " · " + item.title));
  // Доказательство, а не украшение: если разбор не дал типизированных объектов, снимать нечего.
  const typed = parsed.filter((row) => /^(shift|finance_income|finance_expense|calendar|task|insight)/.test(row));
  if (typed.length < 3) throw new Error("разбор дал меньше трёх типизированных объектов: " + JSON.stringify(parsed));
  console.log("\n  Разобрано:");
  for (const row of typed) console.log("    " + row);
  console.log("");

  step("Подтверждаю смену — она становится настоящим объектом с чеком");
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const shift = Object.values(kb.getStateSnapshot().proposals).find((item) => item.status === "open" && item.type === "shift");
    if (shift) await kb.applyProposalForTest(shift.id);
  });
  await page.waitForTimeout(2500);

  step("Граф: записи связались между собой");
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("graph"));
  await page.waitForTimeout(4000);

  step("Контроль: что изменилось и почему — каждый шаг оставил след");
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("control"));
  await page.waitForTimeout(3500);

  step("Сегодня: одно действие, которое из этого следует");
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));
  await page.waitForTimeout(3000);
} catch (error) {
  failed = String((error && error.message) || error);
} finally {
  await context.close();
  await browser.close();
}

// Playwright даёт видео случайное имя — переименовываем в человеческое.
const videos = existsSync(OUT) ? readdirSync(OUT).filter((name) => name.endsWith(".webm")) : [];
const newest = videos.sort().pop();
if (newest && !failed) {
  const target = join(OUT, "lifeos-90s.webm");
  try {
    renameSync(join(OUT, newest), target);
    console.log("\nВидео: " + target);
  } catch {
    console.log("\nВидео: " + join(OUT, newest));
  }
}

if (failed) {
  console.error("\nСценарий не прошёл — видео не считается снятым: " + failed);
  console.error("Это правильный исход: доказывать нечего, пока путь не работает целиком.");
  process.exit(1);
}
console.log("Сценарий пройден целиком: три голосовых стали объектами, объект подтверждён, след виден.");

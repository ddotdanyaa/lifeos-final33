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

test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?chat-data=${Date.now()}`, { waitUntil: "networkidle" });
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
    // Раскрытие «Ещё» живёт в состоянии, а не в браузерном <details>: после клика идёт коммит и
    // перерисовка. Без ожидания следующий шаг работает по старому DOM.
    await page.waitForTimeout(350);
    if (!(await page.locator('[data-testid="app-ribbon"] .nav-cluster').first().isVisible().catch(() => false))) {
      await page.locator('[data-testid="app-ribbon"] summary').first().click().catch(() => {});
      await page.waitForTimeout(350);
    }
  }
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    // Перебираем группы ПОИМЁННО. Раскрыта всегда одна, поэтому «первый тумблер в DOM» после
    // каждого клика возвращается к началу — цикл по `.first()` ходил бы между двумя группами
    // бесконечно. И ждём перерисовку: раскрытие идёт через состояние, а не через CSS.
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

async function recordShift(page, phrase) {
  await openSurface(page, "inbox");
  await page.getByTestId("capture-input").fill(phrase);
  await page.getByTestId("capture-text").click();
  await page.getByTestId("human-primary-action").click();
  await page.waitForTimeout(300);
}

async function ask(page, question) {
  await page.locator("#chat-input").first().fill(question);
  await page.getByTestId("send-chat").click();
  await page.waitForTimeout(500);
}

async function lastAssistant(page) {
  return page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    const msgs = Object.values(state.chatMessages).filter((m) => m.role === "assistant" && !m.deleted).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    return msgs.length ? (msgs[msgs.length - 1].text || msgs[msgs.length - 1].content || "") : "";
  });
}

// Срез 5 плана v1.4: чат отвечает на вопросы про деньги/смены/совет ТОЛЬКО из реальных
// данных, без Ollama (регекс + агрегация артефактов). Это выполняет правило «первый вопрос
// работает без модели» и «ноль заглушек, все цифры реальные».
test("Срез 5: чат отвечает на деньги/смену/совет реальными цифрами без Ollama", async ({ page }) => {
  await reset(page);

  // Две реальные смены сегодня (в пределах недели).
  await recordShift(page, "Отработал 12 часов, заработал 8000");
  await recordShift(page, "Отработал 8 часов, заработал 5000, бензин 1000");

  await openSurface(page, "chat");

  // 1. Сколько заработал за неделю → сумма реальных доходов (8000 + 5000 = 13000).
  await ask(page, "Сколько я заработал на неделе?");
  let answer = await lastAssistant(page);
  expect(answer).toContain("13000");
  expect(/[а-яё]/i.test(answer)).toBe(true);

  // 2. Последняя смена → данные самой свежей смены с часами.
  await ask(page, "Какая была последняя смена?");
  answer = await lastAssistant(page);
  expect(answer).toContain("Последняя смена");
  expect(/8 час/.test(answer)).toBe(true);
  expect(answer).toContain("5000");

  // 3. Совет "стоит ли работать" без цели → честно просит задать цель.
  await ask(page, "Стоит ли завтра работать?");
  answer = await lastAssistant(page);
  expect(answer).toContain("цель");

  // Задать недельную цель → совет становится обоснованным остатком.
  await openSurface(page, "finance");
  await page.getByTestId("weekly-goal-input").fill("30000");
  await page.getByTestId("set-weekly-goal").click();
  await openSurface(page, "chat");
  await ask(page, "Стоит ли завтра работать?");
  answer = await lastAssistant(page);
  expect(answer).toContain("Да, стоит");
  expect(answer).toContain("17000");

  // Вопрос НЕ порождает предложение «сохранить заметку».
  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const questionMsgs = Object.values(state.chatMessages).filter((m) => m.role === "owner" && /\?$/.test(m.text || ""));
  expect(questionMsgs.length).toBeGreaterThan(0);
  expect(questionMsgs.every((m) => !m.proposalId)).toBe(true);
});

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

// Реальная генерация qwen3 (reasoning-модель) — честный бюджет под медленную локальную модель,
// а не ослабление проверок: ассерты те же. ЗАМЕР 2026-07-30 прямым запросом к демону на этом же
// промпте разбора связей: первый символ ответа на 336-й секунде, весь ответ на 400-й. Плюс
// проверка генерации до 120 секунд и сетап — отсюда 900. Прежние 420 не покрывали даже один
// настоящий ответ, и спека падала на честном пути.
test.setTimeout(900000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?chat-brain=${Date.now()}`, { waitUntil: "networkidle" });
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

async function sendChat(page, text) {
  await page.getByTestId("chat-input").first().fill(text);
  await page.getByTestId("send-chat").click();
}

const hasCyrillic = (text) => /[а-яё]/i.test(text || "");

// ИСПРАВЛЕНО 2026-07-30: считать ВСЕ сообщения ассистента нельзя — стрим создаёт пустой пузырь
// сразу при отправке (streaming: true), счётчик растёт мгновенно, и спека читала ответ ДО того,
// как модель написала первый символ. Отсюда и падение «ответ не по-русски»: он был просто пустым.
const finishedAssistantCount = (snapshot) => Object.values(snapshot.chatMessages || {})
  .filter((message) => message.role === "assistant" && !message.deleted && !message.streaming && String(message.text || "").trim())
  .length;

async function waitForFinishedAnswer(page, countBefore, timeout) {
  await page.waitForFunction(
    (before) => {
      const snap = window.__lifeosKnowledgeBase.getStateSnapshot();
      const finished = Object.values(snap.chatMessages || {})
        .filter((message) => message.role === "assistant" && !message.deleted && !message.streaming && String(message.text || "").trim());
      return finished.length > before;
    },
    countBefore,
    { timeout }
  );
}

const lastFinishedAnswer = (snapshot) => Object.values(snapshot.chatMessages || {})
  .filter((message) => message.role === "assistant" && !message.deleted && !message.streaming && String(message.text || "").trim())
  .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
  .slice(-1)[0];

// V1 CHAT_BRAIN: reproduces the owner's own bad screenshot (2026-07-20) - a Russian question
// about graph insights that used to get an English "I don't have access" answer with garbage
// task-title "sources" and a spurious "save as note" proposal on the question itself. All three
// symptoms are asserted fixed here, against a real Ollama daemon (mocked in ollama-live-chat.spec.mjs
// already covers the mocked-daemon path; this proves the real prompt/context wiring end to end).
test("V1 CHAT_BRAIN: RU graph-insight question gets a real RU answer with real graph numbers, no garbage citations, no note-proposal", async ({ page }) => {
  // probe-ollama показывает window.confirm перед обращением к демону; без обработчика Playwright
  // авто-отклоняет диалог -> статус остаётся "unchecked". Принимаем все диалоги теста.
  page.on("dialog", (dialog) => dialog.accept());
  await reset(page);

  // Seed some real graph structure: a task whose words are all distinct from the questions
  // below, so a citation would only be honest if the classifier actually matched them.
  await page.getByTestId("capture-input").fill("Задача: забрать документы из мфц");
  await page.getByTestId("capture-text").click();
  await page.waitForTimeout(500);

  await openSurface(page, "chat");
  await page.getByTestId("probe-ollama").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "models_found", { timeout: 20000 });
  await page.getByTestId("test-ollama-generation").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "generation_ok", { timeout: 120000 });

  const beforeState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const assistantCountBefore = finishedAssistantCount(beforeState);

  const question = "Ты умеешь давать инсайты по всем связям в графе? Какого уровня ты модель, сравни себя с чатом GPT, на каком уровне, версия 3 или 4?";
  await sendChat(page, question);
  // Этот вопрос отвечается детерминированно из state.ollama, без модели — окно маленькое.
  await waitForFinishedAnswer(page, assistantCountBefore, 30000);

  const afterState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const ownerMessage = Object.values(afterState.chatMessages).find((m) => m.role === "owner" && m.text === question);
  expect(ownerMessage, "owner question message must exist").toBeTruthy();
  // The model-identity branch must answer directly from state.ollama, never inventing a
  // version number - and must not create a "save as note" proposal on the question.
  expect(ownerMessage.proposalId, "a question must not get a save-as-note proposal").toBeFalsy();
  const modelReply = lastFinishedAnswer(afterState);
  expect(modelReply.text).toContain(afterState.ollama.selectedModel);
  expect(hasCyrillic(modelReply.text)).toBe(true);

  // Now a pure insight question (no model-identity words) - must go through the real LLM
  // call with real graph facts in the prompt and answer in Russian.
  const assistantCountBefore2 = finishedAssistantCount(afterState);
  const insightQuestion = "Проанализируй связи и дай инсайты по графу";
  await sendChat(page, insightQuestion);
  // Настоящая генерация на CPU, ЗАМЕРЕНО 2026-07-30 прямым запросом к демону на этом же
  // промпте: первый символ ответа на 336-й секунде, весь ответ на 400-й (короткий вопрос — 77).
  // Окно 540 секунд — это измеренное время плюс запас, а не круглое число из головы.
  await waitForFinishedAnswer(page, assistantCountBefore2, 540000);

  const finalState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const insightOwnerMessage = Object.values(finalState.chatMessages).find((m) => m.role === "owner" && m.text === insightQuestion);
  expect(insightOwnerMessage.proposalId, "an insight question must not get a save-as-note proposal either").toBeFalsy();
  const insightReply = lastFinishedAnswer(finalState);
  expect(hasCyrillic(insightReply.text)).toBe(true);
  // ИСПРАВЛЕНО 2026-07-30: проверка стояла на ТЕКСТЕ ответа («не должно быть слова мфц») и была
  // неверной по сути. Живая модель теперь отвечает по настоящим фактам графа, а самый связанный
  // узел в этом графе действительно называется «Задача: забрать документы из мфц» — запрещать
  // это слово значит запрещать правду. Исходный дефект из скриншота владельца был другим: чужой
  // заголовок задачи подставлялся В СПИСОК ИСТОЧНИКОВ ответа. Источники теперь структурные
  // (message.citations, чипы в ui/chat.js), поэтому и проверяем их, а не буквы в тексте.
  const insightCitations = insightReply.citations || [];
  expect(insightCitations.some((citation) => /мфц/i.test(String(citation.title || ""))), "заметка про мфц не может быть источником ответа про структуру графа").toBe(false);
  // И самодельного списка источников внутри текста быть не должно — именно так это выглядело
  // на скриншоте, из-за которого пакет CHAT_BRAIN и появился.
  expect(insightReply.text).not.toMatch(/Источники:/i);
});

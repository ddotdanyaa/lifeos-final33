import { expect, test } from "@playwright/test";

// ГЕЙТ пакета «чат отвечает, а не думает вслух» (2026-07-30).
// Владелец видел в чате не ответ, а черновик рассуждения модели: «Хорошо, мне нужно ответить…».
// Замеры на живом демоне (Ollama 0.32.1, `qwen3:4b`) — не догадки, они и задают эти проверки:
//   • `think: false` рассуждение НЕ выключает ни на /api/generate, ни на /api/chat: шаблон самой
//     модели безусловно допечатывает `<think>`, и текст рассуждения попадает в ответ;
//   • `think: true` на /api/chat уводит рассуждение в отдельное поле `message.thinking`,
//     а `message.content` остаётся чистым ответом;
//   • бюджет: рассуждение съедало 1143 токена ДО первого символа ответа, поэтому при старом
//     num_predict 500 ответа не было вовсе (`done_reason: "length"`, пустой текст);
//   • подсказка `/no_think` у семейства qwen3 срезает время с 268 до 77 секунд при том же ответе.
// Сеть замокана (настоящий демон отвечает минутами), но разбор потока, флаги запроса, выбор
// модели и поведение при исчерпанном бюджете здесь настоящие.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?chat-thinking=${Date.now()}`, { waitUntil: "networkidle" });
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

// Список моделей намеренно в том же порядке, в каком его отдаёт демон владельца: две модели
// эмбеддингов скачаны позже, поэтому идут ПЕРВЫМИ. Это и был найденный дефект.
const OWNER_MODELS = {
  models: [
    { name: "bge-m3:latest", capabilities: ["embedding"] },
    { name: "nomic-embed-text:latest", capabilities: ["embedding"] },
    { name: "qwen3:4b", capabilities: ["completion", "tools", "thinking"] },
    { name: "qwen2.5:3b", capabilities: ["completion", "tools"] }
  ]
};

async function connectOllama(page, tags) {
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(tags || OWNER_MODELS)
  }));
  await page.route("**/api/generate", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ response: "OK" })
  }));
  await openSurface(page, "chat");
  await page.getByTestId("probe-ollama").click();
  await page.getByTestId("test-ollama-generation").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "generation_ok");
  await page.unroute("**/api/generate");
}

async function lastAssistantText(page) {
  return page.evaluate(() => {
    const snap = window.__lifeosKnowledgeBase.getStateSnapshot();
    const replies = Object.values(snap.chatMessages || {})
      .filter((message) => message.role === "assistant" && !message.deleted && message.text)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return replies.length ? replies[replies.length - 1].text : "";
  });
}

test("модель эмбеддингов не становится моделью чата, даже если она первая в списке", async ({ page }) => {
  await reset(page);
  await connectOllama(page);
  const selected = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().ollama.selectedModel);
  // Без правки здесь оказалась бы `bge-m3:latest`, и проверка генерации не могла бы пройти
  // в принципе: эта модель умеет только эмбеддинги.
  expect(selected).toBe("qwen3:4b");
});

test("рассуждение уходит своим каналом: в ответе только ответ, а запрос идёт на /api/chat с think", async ({ page }) => {
  await reset(page);
  await connectOllama(page);

  const seenRequests = [];
  await page.route("**/api/chat", async (route) => {
    seenRequests.push(route.request().postDataJSON());
    // Так отвечает настоящий демон с `think: true`: рассуждение отдельными чанками в
    // `message.thinking`, ответ — в `message.content`.
    const ndjson = [
      JSON.stringify({ message: { role: "assistant", thinking: "Хорошо, мне нужно ответить на вопрос " }, done: false }),
      JSON.stringify({ message: { role: "assistant", thinking: "про деньги. Сначала посмотрю условие." }, done: false }),
      JSON.stringify({ message: { role: "assistant", content: "В базе 350 заметок, всё на месте." }, done: false }),
      JSON.stringify({ message: { role: "assistant", content: "" }, done: true, done_reason: "stop" })
    ].join("\n");
    await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: ndjson });
  });

  await page.getByTestId("chat-input").first().fill("Расскажи что-нибудь про мои заметки");
  await page.getByTestId("send-chat").first().click();

  await expect.poll(() => lastAssistantText(page)).toContain("350");

  const answer = await lastAssistantText(page);
  // Главное утверждение пакета: ни одного слова из рассуждения в ответе.
  expect(answer).not.toContain("Хорошо, мне нужно ответить");
  expect(answer).not.toContain("посмотрю условие");
  expect(answer).toBe("В базе 350 заметок, всё на месте.");
  // И «Модель думает…» пропадает, когда ответ пришёл — это отметка паузы, а не украшение.
  await expect(page.getByTestId("chat-thinking-note")).toHaveCount(0);

  expect(seenRequests.length).toBeGreaterThan(0);
  const request = seenRequests[0];
  expect(request.think).toBe(true);
  expect(Array.isArray(request.messages)).toBe(true);
  // Подсказка `/no_think` для qwen3 — измеренное ускорение в 3,5 раза, а не украшение промпта.
  expect(request.messages[0].content).toContain("/no_think");
  // Бюджет ответа больше не общий с рассуждением.
  expect(request.options.num_predict).toBeGreaterThan(1000);

  // Размышление названо в квитанции: владелец может увидеть, на что ушло время.
  const thinkingChars = await page.evaluate(() => {
    const snap = window.__lifeosKnowledgeBase.getStateSnapshot();
    const run = Object.values(snap.providerRuns || {}).find((entry) => entry.providerId === "ollama" && entry.kind === "chat");
    return run ? Number(run.details?.thinkingChars || 0) : -1;
  });
  expect(thinkingChars).toBeGreaterThan(0);
});

test("модель без размышления: HTTP 400 на флаг не ломает чат, повтор идёт без флага", async ({ page }) => {
  await reset(page);
  await connectOllama(page);

  const bodies = [];
  await page.route("**/api/chat", async (route) => {
    const body = route.request().postDataJSON();
    bodies.push(body);
    // Так отвечает настоящий демон на `think` у модели без размышления — замерено на `qwen2.5:3b`.
    if (body.think) {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "\"qwen2.5:3b\" does not support thinking" }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: JSON.stringify({ message: { role: "assistant", content: "Ответ без размышления." }, done: true, done_reason: "stop" })
    });
  });

  await page.getByTestId("chat-input").first().fill("Расскажи что-нибудь про базу");
  await page.getByTestId("send-chat").first().click();

  await expect.poll(() => lastAssistantText(page)).toContain("Ответ без размышления");
  expect(bodies.length).toBe(2);
  expect(bodies[0].think).toBe(true);
  expect(bodies[1].think).toBeUndefined();
  // Во втором запросе подсказки для размышления тоже быть не должно — она бы стала мусором в вопросе.
  expect(bodies[1].messages[0].content).not.toContain("/no_think");
});

test("бюджет кончился на размышлении — причина названа, а на экране честный локальный ответ", async ({ page }) => {
  await reset(page);
  await connectOllama(page);

  await page.route("**/api/chat", (route) => route.fulfill({
    status: 200,
    contentType: "application/x-ndjson",
    // Ровно то, что вернул живой демон при num_predict 600: рассуждение есть, ответа нет.
    body: [
      JSON.stringify({ message: { role: "assistant", thinking: "Долгое рассуждение без ответа." }, done: false }),
      JSON.stringify({ message: { role: "assistant", content: "" }, done: true, done_reason: "length" })
    ].join("\n")
  }));

  await page.getByTestId("chat-input").first().fill("Расскажи длинную историю про заметки");
  await page.getByTestId("send-chat").first().click();

  // Пустого пузыря не остаётся: срабатывает честный локальный ответ, и это записано в журнал.
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return (state.auditLog || []).some((entry) => entry.type === "chat.stream.failed");
  }).toBe(true);
  const answer = await lastAssistantText(page);
  expect(answer.length).toBeGreaterThan(0);
  expect(answer).not.toContain("Долгое рассуждение");
});

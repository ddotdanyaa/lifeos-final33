import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

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
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";

// Настоящая русская речь, а не текст: фикстура записана системным голосом ru-RU и звучит как
// вечерняя диктовка владельца — три разных смысла в одной записи. Расшифровывает её настоящий
// локальный whisper.cpp (`npm run whisper-server`), как и в voice-loop-whispercpp.spec.mjs:
// демон должен быть уже поднят, приложение его только зовёт и никогда не запускает само.
const VOICE_FIXTURE = resolve("output", "playwright", "fixtures", "owner-voice-ru.wav");

async function reset(page) {
  await page.goto(`${appUrl}?voice-to-artifacts=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

async function openPlayer(page) {
  // Экран «Аудио» живёт во вторичном меню, и раскрытие не переживает перерисовку: зовём
  // переключение поверхности напрямую и ждём, пока рабочее место действительно появится.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("player")).catch(() => {});
    await page.waitForTimeout(600);
    if (await page.getByTestId("workspace-player").isVisible().catch(() => false)) return;
  }
  await expect(page.getByTestId("workspace-player")).toBeVisible({ timeout: 15000 });
}

// §2.1 передачи на ноутбук: голосовой круг целиком, без единой подмены. Речь -> локальный
// whisper.cpp -> расшифровка -> разбор -> предложения -> подтверждение -> артефакты и чеки.
// Смысл проверки не в том, что «что-то появилось»: одна запись с ТРЕМЯ смыслами обязана дать
// три разных артефакта. До резки по клаузам она давала один — задачу с названием
// «Работаю с Потратил на такси ответить в Дмитрию до среды», склеенным из всех трёх фраз.
test("голос: одна диктовка с тремя смыслами становится сменой, расходом и задачей", async ({ page }) => {
  await reset(page);
  await openPlayer(page);

  await page.locator("input#audio-import").setInputFiles(VOICE_FIXTURE);
  await expect.poll(async () => page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {}).some((item) => item.kind === "audio")), { timeout: 20000 }).toBe(true);
  const audioId = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources).find((item) => item.kind === "audio").id);

  // Настоящий HTTP-раунд к настоящему локальному демону. Честный статус обязателен: если
  // whisper.cpp не поднят, спека падает здесь и говорит правду, а не имитирует расшифровку.
  await page.getByTestId("probe-whispercpp").click();
  await expect(page.getByTestId("whispercpp-gate")).toHaveAttribute("data-raw-status", "reachable", { timeout: 20000 });

  await page.getByTestId(`transcribe-whispercpp-${audioId}`).click();
  await expect.poll(async () => page.evaluate((id) => window.__lifeosKnowledgeBase.getStateSnapshot().sources[id]?.transcriptStatus, audioId), { timeout: 90000 }).toBe("whispercpp-done");

  const transcript = await page.evaluate((id) => window.__lifeosKnowledgeBase.getStateSnapshot().sources[id].transcriptText, audioId);
  expect(transcript).toMatch(/16/);
  expect(transcript).toMatch(/800/);
  expect(transcript.toLowerCase()).toContain("такси");

  const proposals = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().proposals)
    .filter((item) => item.status === "open")
    .map((item) => ({ id: item.id, type: item.type, title: item.title, fields: item.fields })));

  // Смысл первый: смена. Час начала назван вслух («с 16») и должен стать временем блока.
  const shift = proposals.find((item) => (item.type === "calendar" || item.type === "shift") && /смена|работа/i.test(item.title));
  expect(shift, "надиктованная смена должна стать предложением").toBeTruthy();
  expect(shift.fields.startTime).toBe("16:00");

  // Смысл второй: расход. Сумма и место названы в другом предложении той же записи.
  const expense = proposals.find((item) => item.type === "finance_expense");
  expect(expense, "надиктованная трата должна стать предложением расхода").toBeTruthy();
  expect(expense.fields.amount).toBe(800);

  // Смысл третий: дело со сроком. Название — только из СВОЕЙ фразы, без слов двух соседних.
  const task = proposals.find((item) => item.type === "task");
  expect(task, "надиктованное дело должно стать предложением задачи").toBeTruthy();
  expect(task.title.toLowerCase()).toContain("ответить");
  expect(task.title.toLowerCase()).not.toContain("такси");
  expect(task.title.toLowerCase()).not.toContain("работаю");

  // Подтверждение владельцем — и только оно — создаёт объекты. Каждый оставляет чек в Контроле.
  const receiptsBefore = await page.evaluate(() => (window.__lifeosKnowledgeBase.getStateSnapshot().auditLog || []).length);
  for (const id of [shift.id, expense.id, task.id]) {
    await page.evaluate((proposalId) => window.__lifeosKnowledgeBase.applyProposalForTest(proposalId), id);
    await page.waitForTimeout(200);
  }

  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const alive = (collection) => Object.values(state[collection] || {}).filter((item) => item && !item.deleted);
  expect(alive("financeTransactions").some((tx) => tx.amount === 800 && tx.kind === "expense"), "расход 800 ₽ записан").toBe(true);
  expect(alive("tasks").some((item) => /ответить/i.test(item.title || "")), "задача записана").toBe(true);
  expect(alive("planBlocks").some((item) => item.startTime === "16:00"), "смена стоит в дне на 16:00").toBe(true);
  expect((state.auditLog || []).length, "каждое подтверждение оставляет след в Контроле").toBeGreaterThan(receiptsBefore);
});

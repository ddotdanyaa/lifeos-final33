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

test.setTimeout(90000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?voice-shift=${Date.now()}`, { waitUntil: "networkidle" });
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

// Срез 6 плана v1.4: голос — первоклассный вход. Расшифровка (голос ИЛИ ручная — тут ручная,
// детерминированно, без демона whisper.cpp) проходит ТОТ ЖЕ разбор, что и печатный ввод:
// надиктованная смена становится предложением-сменой в чате и записывается одним нажатием.
// Реальную запись голоса через whisper.cpp покрывает voice-loop-whispercpp.spec.mjs (нужен демон).
test("Срез 6: расшифровка смены проходит полный capture-пайплайн и записывается из чата", async ({ page }) => {
  await reset(page);

  // Импорт аудио-источника (реальный wav из U3).
  await openSurface(page, "player");
  await page.getByTestId("player-import-audio").click().catch(() => {});
  await page.getByTestId("audio-import").setInputFiles(resolve("output", "playwright", "fixtures", "hello-lifeos.wav"));
  await expect.poll(async () => page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {}).some((s) => s.kind === "audio"))).toBe(true);

  const audioId = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources).find((s) => s.kind === "audio").id);

  // Ручная расшифровка = надиктованная смена (тот же текст, что дал бы whisper.cpp).
  await page.locator(`#transcript-${audioId}`).fill("Отработал 12 часов, заработал 8700, бензин 1900, обсудить с Женей маршрут");
  await page.getByTestId(`save-transcript-${audioId}`).click();
  await page.waitForTimeout(400);

  // Расшифровка попала в чат как сообщение владельца с предложением-сменой.
  const afterSave = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const ownerMsg = Object.values(afterSave.chatMessages).find((m) => m.role === "owner" && /Отработал 12 часов/.test(m.text || ""));
  expect(ownerMsg, "расшифровка должна стать сообщением владельца в чате").toBeTruthy();
  expect(ownerMsg.proposalId, "у надиктованной смены должно быть предложение").toBeTruthy();
  const shiftProposal = afterSave.proposals[ownerMsg.proposalId];
  expect(shiftProposal.type).toBe("shift");
  // Люди-сущности извлечены из расшифровки (срез 2).
  const audioSource = afterSave.sources[audioId];
  expect(audioSource.analysis.entities.people).toContain("Женей");

  // Подтверждение сменой в чате (тот же красивый чат из среза 5.5) -> реальная запись.
  await openSurface(page, "chat");
  const shiftMsg = page.locator("[data-message-id]", { hasText: "Отработал 12 часов" }).last();
  await shiftMsg.getByTestId("chat-proposal-apply").click();
  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
    return Object.values(state.financeTransactions || {}).filter((tx) => !tx.deleted).length;
  }).toBeGreaterThanOrEqual(2);

  const finalState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const txs = Object.values(finalState.financeTransactions).filter((tx) => !tx.deleted);
  const income = txs.find((tx) => tx.kind === "income");
  expect(income.amount).toBe(8700);
  expect(income.shiftHours).toBe(12);
  expect(txs.some((tx) => tx.kind === "expense" && tx.amount === 1900)).toBe(true);
});

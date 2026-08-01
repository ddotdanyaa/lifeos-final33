// СЦЕНАРИЙ 9 · СИСТЕМА ВОЗРАЖАЕТ, НО НЕ ЗАПРЕЩАЕТ И ОБЪЯСНЯЕТ.
//
// Владелец: «Поеду отдыхать» → «Ты сам поставил цель 200 000, в этом месяце не хватает 43 000.
// Поэтому не рекомендую». Ключевое слово — САМ ПОСТАВИЛ: система напоминает ему его же цель его
// же числами и оставляет решение ему.
//
// Возражение появляется ТОЛЬКО когда есть три вещи разом: собственная цель владельца, срок и
// посчитанный разрыв (`computeObjections`, app.js). Без любой из них это уже не возражение, а
// нравоучение — и оно запрещено. Поэтому спека проверяет обе стороны:
//   1) три условия сошлись → карточка с ЧИСЛОМ и раскрываемым основанием;
//   2) разрыв посчитать не из чего → система молчит, а не морализирует;
//   3) владелец снял возражение → оно не поднимается снова, в том числе после перезагрузки,
//      и цель при этом остаётся жива. Снять предупреждение ≠ отказаться от цели.
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

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Движение по счетам заводится захватом, как это делает владелец, а не подкладыванием строк в
// хранилище: возражение считается из ЕГО денег, и подмена данных проверяла бы формулу вместо
// сценария. Тот же приём, что в `forecast-history.spec.mjs`.
async function seedMoneyFlow(page) {
  for (const line of ["Заработал 200000 зарплата", "Потратил 40000 продукты", "Потратил 20000 бензин"]) {
    await page.getByTestId("capture-input").fill(line);
    await page.getByTestId("capture-text").click();
    await page.waitForTimeout(250);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
}

// Цель заводится СОБСТВЕННОЙ формой владельца — это и есть «ты сам поставил».
async function seedGoalWithDeadline(page, title, amount, daysAhead) {
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("goals"));
  await page.waitForSelector('[data-testid="goal-title-entry"]');
  await page.fill('[data-testid="goal-title-entry"]', title);
  await page.fill('[data-testid="goal-target-amount"]', String(amount));
  await page.fill('[data-testid="goal-target-date"]', new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10));
  await page.click('[data-testid="add-goal-entry"]');
  await page.waitForTimeout(300);
  return page.evaluate((name) => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals)
    .find((item) => item.title === name).id, title);
}

async function openHome(page) {
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("inbox"));
}

// O1: три условия сошлись — возражение есть, и оно объяснено числом, а не тоном.
test("цель со сроком и разрывом поднимает возражение с числом и раскрываемым основанием", async ({ page }) => {
  await reset(page, "objection-shown");
  await seedMoneyFlow(page);
  // Полтора миллиона за два месяца при потоке около 47 000 в месяц — разрыв, который видно
  // арифметикой, а не мнением.
  await seedGoalWithDeadline(page, "Купить машину", 1150000, 60);
  await openHome(page);

  const card = page.getByTestId("objection-card").first();
  await expect(card).toBeVisible({ timeout: 20000 });
  // «САМ ПОСТАВИЛ» — это не оборот речи, а суть: система напоминает его цель, а не свою оценку.
  await expect(card).toContainText("Ты сам поставил");
  await expect(card).toContainText("Купить машину");

  // Число рядом с утверждением обязательно: «не рекомендую» без числа — это мнение.
  const verdict = card.getByTestId("objection-verdict");
  await expect(verdict).toBeVisible();
  const verdictText = (await verdict.textContent() || "").trim();
  expect(verdictText).toMatch(/\d+\s*%/);
  const percent = Number((verdictText.match(/(\d+)\s*%/) || [])[1]);
  // Порог возражения — 45%: выше него цель идёт нормально, и лезть с предупреждением значит
  // стать тем, кого выключают.
  expect(percent).toBeLessThan(45);

  // Основание РАСКРЫВАЕМОЕ: свёрнуто по умолчанию (иначе это стена текста при каждом заходе),
  // но владелец обязан иметь возможность не поверить и проверить, откуда взялось число.
  const why = card.getByTestId("objection-why");
  await expect(why).toBeHidden();
  await card.locator("details.objection-why summary").click();
  await expect(why).toBeVisible();
  const explanation = (await why.textContent() || "").trim();
  expect(explanation.length).toBeGreaterThan(0);
  // Объяснение опирается на посчитанные числа: поток, накопится, нужно.
  expect(explanation).toMatch(/поток|Стабильность потока|обеспечен/i);

  // Решает он: названы оба выхода, и ни один не подан как правильный.
  await expect(card.locator('[data-action="dismiss-objection"]')).toBeVisible();
  await expect(card.locator('[data-action="set-surface"]')).toBeVisible();
});

// O2: разрыв посчитать не из чего — система молчит. Возражение без обеспечения числом было бы
// нравоучением, а оно запрещено прямо в `computeObjections` (`if (!forecast.hasFlow) return []`).
test("без движения по счетам возражение не поднимается — считать разрыв нечем", async ({ page }) => {
  await reset(page, "objection-silent");
  await seedGoalWithDeadline(page, "Купить машину", 1150000, 60);
  await openHome(page);

  // Цель есть и она со сроком, но денег система не видела ни разу.
  const goals = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals).filter((item) => !item.deleted).length);
  expect(goals).toBeGreaterThan(0);
  await expect(page.getByTestId("objection-card")).toHaveCount(0);
});

// O3: снял — значит снял. Возражение, которое поднимается снова после «понял», превращает
// систему в ту, которую выключают целиком.
test("снятое возражение больше не поднимается и переживает перезагрузку, а цель остаётся жива", async ({ page }) => {
  await reset(page, "objection-dismiss");
  await seedMoneyFlow(page);
  const goalId = await seedGoalWithDeadline(page, "Купить машину", 1150000, 60);
  await openHome(page);
  await expect(page.getByTestId("objection-card").first()).toBeVisible({ timeout: 20000 });

  await page.locator('[data-action="dismiss-objection"]').first().click();
  await expect(page.getByTestId("objection-card")).toHaveCount(0, { timeout: 20000 });

  // Снятие — решение владельца, и оно записано в состояние, а не спрятано в переменной вкладки.
  const dismissed = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().control.dismissedObjections || []);
  expect(dismissed).toContain(goalId);

  // Цель осталась: снято ПРЕДУПРЕЖДЕНИЕ, а не цель. Спутать это значит удалить чужое решение.
  const goal = await page.evaluate((id) => {
    const item = window.__lifeosKnowledgeBase.getStateSnapshot().goals[id];
    return item ? { deleted: Boolean(item.deleted), status: item.status || "", targetDate: item.targetDate || "" } : null;
  }, goalId);
  expect(goal.deleted).toBe(false);
  expect(goal.status).not.toBe("done");
  expect(goal.targetDate).not.toBe("");

  // И после перезагрузки возражение не возвращается: «понял» переживает закрытие вкладки.
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await openHome(page);
  await expect(page.getByTestId("objection-card")).toHaveCount(0);
});

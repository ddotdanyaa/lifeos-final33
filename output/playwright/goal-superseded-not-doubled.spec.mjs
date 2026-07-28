// О7 · ВЫТЕСНЕНИЕ (П20). Боль владельца одной фразой: **«Polo → Camry» — это одна изменившаяся
// цель, а не две.**
//
// В марте он сказал «хочу Polo», в июле — «беру Camry». Система, которая просто хранит факты,
// покажет ему две цели и будет считать разрыв по обеим. Система, которая перетирает, потеряет
// март и не сможет ответить, когда и почему он передумал. Обе неправы.
//
// Разбор шести доноров (Mem0, Graphiti, Zep, Neo4j GDS) сходится в одном: НИКТО НЕ УДАЛЯЕТ.
// Спека проверяет ровно это: старая цель жива, помечена причиной, не всплывает среди
// действующих — и возвращается одним кликом.
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

test("новая цель на ту же тему предлагает вытеснение, а не заводит вторую молча", async ({ page }) => {
  await reset(page, "supersede-propose");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.addGoalForTest("Хочу купить машину Polo");
    await kb.addGoalForTest("Беру машину Camry");
    const state = kb.getStateSnapshot();
    return {
      goals: Object.values(state.goals).filter((item) => !item.deleted).map((item) => item.title),
      proposals: Object.values(state.proposals)
        .filter((item) => item.status === "open" && item.type === "supersede")
        .map((item) => ({ title: item.title, reason: item.reason, fields: item.fields }))
    };
  });

  // Обе цели существуют — система ничего не стёрла.
  expect(result.goals.length).toBe(2);
  // И появилось ПРЕДЛОЖЕНИЕ, а не автоматическое действие: решает владелец (И-1).
  expect(result.proposals.length, "изменившаяся цель обязана быть замечена").toBe(1);
  expect(result.proposals[0].title).toContain("Polo");
  expect(result.proposals[0].title).toContain("Camry");
  expect(result.proposals[0].reason, "причина названа словами владельца, а не кодом").toContain("общая тема");
  expect(result.proposals[0].fields.sharedTopic).toContain("машину");
});

test("после подтверждения старая цель жива, помечена причиной и не всплывает", async ({ page }) => {
  await reset(page, "supersede-apply");

  const after = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const oldId = await kb.addGoalForTest("Хочу купить машину Polo");
    await kb.addGoalForTest("Беру машину Camry");
    const proposal = Object.values(kb.getStateSnapshot().proposals).find((item) => item.type === "supersede" && item.status === "open");
    await kb.applyProposalForTest(proposal.id);
    const state = kb.getStateSnapshot();
    const older = state.goals[oldId];
    return {
      exists: Boolean(older) && !older.deleted,
      supersededBy: older ? older.supersededBy : "",
      reason: older ? older.supersededReason : "",
      at: older ? older.supersededAt : "",
      status: older ? older.status : "",
      liveTitles: (kb.liveGoalsForTest() || []).map((item) => item.title)
    };
  });

  // Никто не удаляет — это единственный вывод, в котором сошлись все шесть доноров.
  expect(after.exists, "вытеснённая цель обязана остаться в базе").toBe(true);
  expect(after.supersededBy.length, "на ней стоит ссылка на новую цель").toBeGreaterThan(0);
  expect(after.reason.length, "и причина: без неё это тихая потеря данных (И-6)").toBeGreaterThan(0);
  expect(after.at.length, "и дата, с которой она перестала быть правдой").toBeGreaterThan(0);
  expect(after.status).toBe("superseded");

  // Но среди действующих её больше нет: одна изменившаяся цель, а не две.
  expect(after.liveTitles.join(" "), "Polo не должен считаться действующей целью").not.toContain("Polo");
  expect(after.liveTitles.join(" ")).toContain("Camry");
});

test("вытеснение отменяется одним движением", async ({ page }) => {
  await reset(page, "supersede-undo");

  const after = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const oldId = await kb.addGoalForTest("Хочу купить машину Polo");
    await kb.addGoalForTest("Беру машину Camry");
    const proposal = Object.values(kb.getStateSnapshot().proposals).find((item) => item.type === "supersede" && item.status === "open");
    await kb.applyProposalForTest(proposal.id);
    await kb.undoGoalSupersedeForTest(oldId);
    const older = kb.getStateSnapshot().goals[oldId];
    return {
      supersededBy: older.supersededBy,
      status: older.status,
      liveTitles: (kb.liveGoalsForTest() || []).map((item) => item.title)
    };
  });

  // Вытеснение — гипотеза системы, и ошибаться она обязана дёшево.
  expect(after.supersededBy).toBe("");
  expect(after.status).toBe("active");
  expect(after.liveTitles.join(" "), "отменил — цель вернулась ровно как была").toContain("Polo");
});

test("две РАЗНЫЕ цели вытеснением не считаются", async ({ page }) => {
  await reset(page, "supersede-no-false");

  const proposals = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.addGoalForTest("Хочу купить машину Polo");
    await kb.addGoalForTest("Накопить на отпуск в Турции");
    await kb.addGoalForTest("Выучить английский до сентября");
    return Object.values(kb.getStateSnapshot().proposals)
      .filter((item) => item.status === "open" && item.type === "supersede").length;
  });

  // Без общей темы это просто разные цели, и трогать их нельзя: ложное вытеснение прячет
  // настоящую цель владельца, а это хуже, чем показать лишнюю.
  expect(proposals).toBe(0);
});

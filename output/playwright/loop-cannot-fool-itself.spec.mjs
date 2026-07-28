// О8 · КАНАРЕЙКА и О4 · АНТИ-ЛЕСТЬ (П17, П18).
//
// Калибровка считает себя по тем же данным, на которых учится, — и потому не может заметить,
// что поехала. Две проверки закрывают ровно эту дыру:
//
//   • Канарейка — пятьдесят замороженных вердиктов владельца, которые НИКОГДА не входят в
//     обучение. Точность на них упала → обучение замораживается, и ни одно число из журнала
//     больше не выдаётся за знание.
//   • Анти-лесть — согласие и правда меряются ОТДЕЛЬНО. Владелец соглашается охотнее, когда
//     предложение звучит уверенно, а не когда оно верно; система это замечает и начинает
//     звучать увереннее. Расхождение между «принял» и «принял без правки» и есть лесть.
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
  await page.evaluate(() => window.__lifeosKnowledgeBase.forgetDecisionsForTest());
}

test("канарейка не замораживается раньше времени и честно говорит, чего не хватает", async ({ page }) => {
  await reset(page, "canary-early");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.seedDecisionsForTest(Array.from({ length: 10 }, () => ({ type: "task", decision: "applied" })));
    return kb.freezeCanaryForTest();
  });

  expect(result.frozen, "на десяти решениях эталона не построить").toBe(0);
  expect(result.status).toContain("рано");
  expect(result.need).toBe(40);
});

test("замороженные вердикты выходят из обучения совсем", async ({ page }) => {
  await reset(page, "canary-excluded");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    // 50 ранних решений — они уйдут в канарейку — и 10 поздних, на которых система учится.
    const early = Array.from({ length: 50 }, (_, index) => ({
      type: "task", decision: "applied", createdAt: new Date(Date.now() - (60 - index) * 86400000).toISOString()
    }));
    const late = Array.from({ length: 10 }, () => ({ type: "task", decision: "dismissed" }));
    await kb.seedDecisionsForTest(early.concat(late));
    const before = kb.computeCalibrationForTest();
    const frozen = await kb.freezeCanaryForTest();
    const after = kb.computeCalibrationForTest();
    return { before: before.total, frozen: frozen.frozen, after: after.total, acceptance: after.byType.task.acceptance };
  });

  expect(result.frozen).toBe(50);
  expect(result.before).toBe(60);
  // Ровно те пятьдесят исчезли из обучающей выборки — иначе система проверяет себя по тому,
  // на чём училась, и всегда оказывается права.
  expect(result.after, "канарейка обязана выйти из обучения целиком").toBe(10);
  expect(result.acceptance, "остались только поздние отказы").toBe(0);
});

test("точность упала — обучение заморожено, а не продолжается как ни в чём не бывало", async ({ page }) => {
  await reset(page, "canary-drop");

  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    // Ранние 50: владелец почти всё принимал — эталон «система его понимала».
    const early = Array.from({ length: 50 }, (_, index) => ({
      type: "task", decision: index < 45 ? "applied" : "dismissed", confidence: 0.9,
      createdAt: new Date(Date.now() - (90 - index) * 86400000).toISOString()
    }));
    await kb.seedDecisionsForTest(early);
    await kb.freezeCanaryForTest();
    // Потом всё изменилось: свежие решения — сплошные отказы, и калибровка это выучила.
    await kb.seedDecisionsForTest(Array.from({ length: 20 }, () => ({ type: "task", decision: "dismissed" })));
    const verdict = await kb.applyCanaryVerdictForTest();
    const calibration = kb.computeCalibrationForTest();
    return { verdict, calibration };
  });

  expect(result.verdict.frozenLearning, "система стала предсказывать хуже эталона").toBe(true);
  expect(result.verdict.accuracy).toBeLessThan(result.verdict.baseline);
  // И это немедленно видно в калибровке: числа перестают выдаваться за знание.
  expect(result.calibration.canaryFrozen).toBe(true);
  for (const row of result.calibration.types) {
    expect(row.trusted, "при замороженном обучении доверять нечему").toBe(false);
    expect(row.status).toContain("обучение заморожено");
  }
});

test("анти-лесть: согласие с правкой не считается попаданием", async ({ page }) => {
  await reset(page, "sycophancy");

  const flattering = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    // Владелец принимает почти всё — но половину переписывает.
    const rows = [];
    for (let index = 0; index < 10; index += 1) rows.push({ type: "task", decision: "applied", edited: index % 2 === 0, confidence: 0.9 });
    await kb.seedDecisionsForTest(rows);
    return kb.computeSycophancyForTest();
  });

  expect(flattering.measured).toBe(true);
  expect(flattering.agreement, "приняты все десять").toBeCloseTo(1, 2);
  expect(flattering.truth, "но без правки — только половина").toBeCloseTo(0.5, 2);
  expect(flattering.flattering, "расхождение в 50 пунктов — это лесть, а не успех").toBe(true);
  expect(flattering.status).toContain("принимают с правкой");
});

test("анти-лесть: чистое согласие лестью не объявляется", async ({ page }) => {
  await reset(page, "sycophancy-clean");

  const honest = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const rows = [];
    for (let index = 0; index < 8; index += 1) rows.push({ type: "task", decision: "applied", edited: false, confidence: 0.8 });
    for (let index = 0; index < 4; index += 1) rows.push({ type: "task", decision: "dismissed", edited: false, confidence: 0.4 });
    await kb.seedDecisionsForTest(rows);
    return kb.computeSycophancyForTest();
  });

  // Принял без правки — попали. Ложная тревога здесь так же вредна, как пропущенная лесть:
  // она заставит систему сомневаться в том, что работает.
  expect(honest.flattering).toBe(false);
  expect(honest.status).toContain("сходятся");
  // И видно то, ради чего мерили: уверенность там, где согласились, выше, чем там, где нет.
  expect(honest.confidenceOnYes).toBeGreaterThan(honest.confidenceOnNo);
});

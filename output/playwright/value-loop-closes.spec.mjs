// П37 · ПЕТЛЯ ЦЕННОСТИ: чек → инсайт → следующее предложение точнее.
//
// Три механизма были по отдельности: чек фиксирует подтверждённое, журнал решений это помнит,
// калибровка считает частоту. Не хватало ЗАМЫКАНИЯ — момента, когда подтверждённый объект
// возвращается к владельцу выводом.
//
// Это единственное место, где видно, что система не просто хранит, а работает: он подтвердил
// такси в третий раз — и получил не четвёртое такое же предложение, а наблюдение о том, что
// такси стало заметной статьёй.
//
// Правило честности здесь строже обычного и проверяется отдельно: вывод делается ТОЛЬКО из
// подтверждённого. Предложение, которое владелец не принял, — не факт его жизни.
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

// Три подтверждённых такси — это уже не три случайных расхода, а статья.
async function captureAndApply(page, text, type) {
  return page.evaluate(async ([value, kind]) => {
    const kb = window.__lifeosKnowledgeBase;
    await kb.captureTextForTest(value);
    const proposal = Object.values(kb.getStateSnapshot().proposals)
      .filter((item) => item.status === "open" && item.type === kind)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!proposal) return "";
    await kb.applyProposalForTest(proposal.id);
    return proposal.id;
  }, [text, type]);
}

test("три подтверждения складываются в вывод, а не в четвёртое такое же предложение", async ({ page }) => {
  await reset(page, "value-loop");

  for (const text of ["Потратил 800 рублей на такси", "Потратил 700 рублей на такси", "Потратил 900 рублей на такси"]) {
    const id = await captureAndApply(page, text, "finance_expense");
    expect(id, "расход обязан появиться и примениться: " + text).toBeTruthy();
  }

  const result = await page.evaluate(() => {
    const kb = window.__lifeosKnowledgeBase;
    return {
      findings: kb.computeValueLoopForTest(),
      insights: Object.values(kb.getStateSnapshot().proposals)
        .filter((item) => item.status === "open" && item.type === "insight" && item.fields && item.fields.valueLoop)
        .map((item) => ({ title: item.title, reason: item.reason, times: item.fields.times, from: (item.fields.fromProposals || []).length }))
    };
  });

  expect(result.findings.length, "три такси обязаны быть замечены").toBeGreaterThan(0);
  const taxi = result.findings.find((row) => /такси/i.test(row.subject));
  expect(taxi, "именно такси, а не «расход вообще»").toBeTruthy();
  expect(taxi.times).toBe(3);
  expect(taxi.total, "суммы складываются: 800 + 700 + 900").toBe(2400);

  // И это дошло до владельца предложением, а не осталось внутри системы.
  expect(result.insights.length).toBeGreaterThan(0);
  const insight = result.insights.find((row) => /такси/i.test(row.title));
  expect(insight, "вывод обязан дойти до владельца").toBeTruthy();
  expect(insight.times).toBe(3);
  // Провенанс: видно, из каких именно подтверждений он собран.
  expect(insight.from, "вывод без ссылок на подтверждения — просто фраза").toBe(3);
  expect(insight.reason).toContain("ПОДТВЕРЖДЁННЫХ");
});

test("непринятое в вывод не входит: это не факт жизни владельца", async ({ page }) => {
  await reset(page, "value-loop-honest");

  const findings = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    // Три одинаковых расхода — но владелец их ОТКЛОНИЛ.
    for (const text of ["Потратил 800 рублей на такси", "Потратил 700 рублей на такси", "Потратил 900 рублей на такси"]) {
      await kb.captureTextForTest(text);
      const proposal = Object.values(kb.getStateSnapshot().proposals)
        .filter((item) => item.status === "open" && item.type === "finance_expense")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (proposal) await kb.dismissProposalForTest(proposal.id);
    }
    return kb.computeValueLoopForTest();
  });

  // Система выдвинула гипотезу трижды и трижды получила «нет». Строить на этом вывод значило бы
  // выдавать собственную догадку за данные владельца.
  expect(findings.filter((row) => /такси/i.test(row.subject)).length).toBe(0);
});

test("двух повторов мало: вывод не делается на паре совпадений", async ({ page }) => {
  await reset(page, "value-loop-thin");

  const findings = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const text of ["Потратил 800 рублей на такси", "Потратил 700 рублей на такси"]) {
      await kb.captureTextForTest(text);
      const proposal = Object.values(kb.getStateSnapshot().proposals)
        .filter((item) => item.status === "open" && item.type === "finance_expense")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (proposal) await kb.applyProposalForTest(proposal.id);
    }
    return kb.computeValueLoopForTest();
  });

  // Два раза — это совпадение. Порог существует, чтобы система не объявляла закономерностью
  // всё подряд: обесценив вывод один раз, вернуть ему доверие нечем.
  expect(findings.filter((row) => /такси/i.test(row.subject)).length).toBe(0);
});

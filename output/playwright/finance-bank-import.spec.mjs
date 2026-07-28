import { expect, test } from "@playwright/test";

// F1/F2 (owner directive 2026-07-22, docs/LIFEOS_V1_4_FULL_BUILD_PLAN.md §4A): bank OAuth is
// honestly not-connected (no faked "connected" state, §7) - the real always-working path is a
// CSV/OFX statement export the owner already has from their bank. Rows become PROPOSALS, never
// a silent write; re-importing an overlapping statement must not double the transactions.

const appUrl = "http://127.0.0.1:4173";

async function reset(page, marker) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?bank-import=${marker}`, { waitUntil: "networkidle" });
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

const SAMPLE_CSV = [
  "Дата;Сумма;Описание",
  "22.07.2026;-1500,00;Пятёрочка продукты",
  "21.07.2026;45000,00;Зарплата",
  "20.07.2026;-350,50;Такси"
].join("\n");

test("F1: the bank provider is honestly not-connected, never faked", async ({ page }) => {
  await reset(page, "gate-" + Date.now());
  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(state.providers.bank).toBeTruthy();
  expect(state.providers.bank.status).toBe("not-connected");
  expect(state.providers.bank.requiredAction).toMatch(/OAuth/);
});

test("F2: parses a RU-bank CSV export into dated/typed rows (rules-first, no network)", async ({ page }) => {
  await reset(page, "parse-" + Date.now());
  const result = await page.evaluate((csv) => window.__lifeosKnowledgeBase.parseBankStatementForTest(csv, "statement.csv"), SAMPLE_CSV);
  expect(result.format).toBe("csv");
  expect(result.rows.length).toBe(3);
  const expense = result.rows.find((r) => /Пятёрочка/.test(r.title));
  expect(expense).toBeTruthy();
  expect(expense.kind).toBe("expense");
  expect(expense.amount).toBe(1500);
  expect(expense.day).toBe("2026-07-22");
  const income = result.rows.find((r) => /Зарплата/.test(r.title));
  expect(income.kind).toBe("income");
  expect(income.amount).toBe(45000);
});

test("F2: imported rows surface as proposals, and accepting one writes a real transaction with a receipt", async ({ page }) => {
  await reset(page, "import-" + Date.now());
  await openSurface(page, "finance");

  await page.setInputFiles("#bank-statement-import", {
    name: "statement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(SAMPLE_CSV, "utf-8")
  });
  await page.waitForTimeout(300);

  const afterImport = await page.evaluate(() => {
    const s = window.__lifeosKnowledgeBase.getStateSnapshot();
    const props = Object.values(s.proposals || {}).filter((p) => (p.type === "finance_expense" || p.type === "finance_income") && p.status === "open");
    return { count: props.length, ids: props.map((p) => p.id), hasReceipt: (s.auditLog || []).some((e) => e.type === "bank.statement.import") };
  });
  expect(afterImport.count).toBe(3);
  expect(afterImport.hasReceipt).toBe(true);

  // Accept one proposal the same way the UI "apply-proposal" action does.
  await page.evaluate((id) => window.__lifeosKnowledgeBase.applyProposalForTest(id), afterImport.ids[0]);
  const afterAccept = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const txCount = Object.values(afterAccept.financeTransactions || {}).filter((tx) => !tx.deleted).length;
  expect(txCount).toBe(1);
});

test("F2: re-importing an overlapping statement does not duplicate transactions or proposals", async ({ page }) => {
  await reset(page, "dedup-" + Date.now());
  await openSurface(page, "finance");

  await page.setInputFiles("#bank-statement-import", {
    name: "statement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(SAMPLE_CSV, "utf-8")
  });
  await page.waitForTimeout(300);

  // Accept all three so they become real transactions (same path as the UI's "apply-all").
  const firstBatch = await page.evaluate(() => {
    const s = window.__lifeosKnowledgeBase.getStateSnapshot();
    return Object.values(s.proposals || {}).filter((p) => (p.type === "finance_expense" || p.type === "finance_income") && p.status === "open").map((p) => p.id);
  });
  for (const id of firstBatch) {
    await page.evaluate((pid) => window.__lifeosKnowledgeBase.applyProposalForTest(pid), id);
  }

  // Re-import the SAME statement - every row should be skipped as a duplicate, not re-proposed.
  await page.setInputFiles("#bank-statement-import", {
    name: "statement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(SAMPLE_CSV, "utf-8")
  });
  await page.waitForTimeout(300);

  const final = await page.evaluate(() => {
    const s = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      openProposals: Object.values(s.proposals || {}).filter((p) => (p.type === "finance_expense" || p.type === "finance_income") && p.status === "open").length,
      transactions: Object.values(s.financeTransactions || {}).filter((tx) => !tx.deleted).length
    };
  });
  expect(final.openProposals, "no new proposals from the duplicate re-import").toBe(0);
  expect(final.transactions, "transaction count stays at 3, not doubled to 6").toBe(3);
});

import { renderMoneyDashboard } from "./components/MoneyDashboard.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, escapeHtml, money, safeList } from "./components/shared.js";

function stripExtension(name) {
  return String(name || "").replace(/\.[^.]+$/, "");
}

function accountOptions(accounts) {
  const rows = accounts && accounts.length ? accounts : [{ name: "Основной счет" }];
  return rows.map((account) => `<option value="${escapeHtml(account.name || "Основной счет")}">${escapeHtml(account.name || "Основной счет")}</option>`).join("");
}

function receiptCard(ctx, source) {
  const image = source.dataUrl
    ? `<img class="receipt-preview" src="${escapeHtml(source.dataUrl)}" alt="Чек">`
    : `<div class="empty-inline">Файл сохранён, preview недоступен.</div>`;
  return [
    `<article class="receipt-expense-card" data-testid="receipt-expense-card">`,
    `<div class="receipt-media">${image}<div><strong>${escapeHtml(source.name || "Чек")}</strong><span>OCR не подключён. Ручное заполнение работает сейчас.</span></div></div>`,
    `<div class="receipt-form">`,
    `<input id="receipt-merchant-${escapeHtml(source.id)}" aria-label="Receipt merchant" value="${escapeHtml(stripExtension(source.name))}">`,
    `<input id="receipt-amount-${escapeHtml(source.id)}" aria-label="Receipt amount" type="number" min="0" step="0.01">`,
    `<input id="receipt-category-${escapeHtml(source.id)}" aria-label="Receipt category" value="Разное">`,
    `<select id="receipt-account-${escapeHtml(source.id)}" aria-label="Receipt account">${accountOptions(ctx.financeAccounts)}</select>`,
    `<input id="receipt-day-${escapeHtml(source.id)}" aria-label="Receipt day" type="date" value="${escapeHtml(ctx.todayKey)}">`,
    `<input id="receipt-note-${escapeHtml(source.id)}" aria-label="Receipt note" value="">`,
    `<button data-action="save-receipt-expense" data-id="${escapeHtml(source.id)}" data-testid="save-receipt-expense">Сохранить расход</button>`,
    `</div>`,
    `</article>`
  ].join("");
}

function weeklyChartSection(ctx) {
  const weekly = ctx.financeWeekly || { labels: [], expenseByDay: [], incomeByDay: [] };
  const weekExpense = weekly.expenseByDay.reduce((sum, value) => sum + value, 0);
  const weekIncome = weekly.incomeByDay.reduce((sum, value) => sum + value, 0);
  return [
    `<section class="finance-weekly" data-testid="finance-weekly-summary">`,
    `<h3>Неделя</h3>`,
    `<div class="finance-weekly-totals"><span>Расходы: ${money(weekExpense)}</span><span>Доходы: ${money(weekIncome)}</span></div>`,
    `<div class="finance-weekly-chart-box"><canvas data-testid="finance-weekly-chart"></canvas></div>`,
    `</section>`
  ].join("");
}

export function renderFinance(ctx) {
  const body = [
    `<div data-testid="finance-panel">`,
    renderMoneyDashboard(ctx),
    weeklyChartSection(ctx),
    `<section class="finance-deep-row">`,
    `<div class="budget-panel"><h3>Категории</h3>${safeList(ctx.budgets, (budget) => `<div class="budget-row" data-testid="budget-row"><span>${escapeHtml(budget.category || "Категория")}</span><strong>${money(budget.limit)}</strong></div>`, `<div class="empty-inline">Добавь бюджет для категории.</div>`)}</div>`,
    `<div class="subscription-panel"><h3>Подписки</h3>${safeList(ctx.subscriptions, (sub) => `<div class="subscription-row" data-testid="subscription-row"><span>${escapeHtml(sub.title || "Подписка")}</span><strong>${money(sub.amount)}</strong></div>`, `<div class="empty-inline">Регулярные платежи появятся здесь.</div>`)}</div>`,
    `<div class="receipt-panel" data-testid="receipt-workbench"><h3>Скрин чека</h3><p>Чек сохраняется локально. Если OCR не подключён, расход можно заполнить вручную.</p>${button("import-file", "Добавить скрин", { kind: "primary", testId: "capture-import" })}</div>`,
    safeList(ctx.receiptSources || [], (source) => receiptCard(ctx, source), ""),
    `</section>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("finance", "Деньги", "Баланс, расходы, бюджет, подписки и чеки в одном понятном месте.", body, { testId: "workspace-finance", kicker: "Финансы" });
}

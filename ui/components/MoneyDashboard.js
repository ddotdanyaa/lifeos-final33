import { button, escapeHtml, money, safeList } from "./shared.js";

export function renderMoneyDashboard(ctx) {
  const summary = ctx.financeSummary || {};
  const accounts = ctx.accounts || [];
  const transactions = ctx.transactions || [];
  return [
    `<div class="money-dashboard finance-dashboard" data-testid="money-dashboard">`,
    `<div class="money-hero"><span>Баланс</span><strong>${money(summary.balance)}</strong><em>Сегодня: ${money(summary.todaySpend)} · месяц: ${money(summary.monthSpend)}</em></div>`,
    `<div class="money-metrics">`,
    `<div><span>Бюджет месяца</span><strong>${summary.budgetLimit ? money(summary.budgetLeft) : "не задан"}</strong></div>`,
    `<div><span>Счета</span><strong>${accounts.length}</strong></div>`,
    `<div><span>Подписки</span><strong>${ctx.subscriptions?.length || 0}</strong></div>`,
    `</div>`,
    `<div class="finance-entry-strip" data-testid="finance-entry-form">`,
    `<input id="finance-title" data-testid="finance-title" aria-label="Название операции" placeholder="Название">`,
    `<input id="finance-amount" data-testid="finance-amount" type="number" min="0" step="0.01" aria-label="Сумма" placeholder="0">`,
    `<input id="finance-category" data-testid="finance-category" aria-label="Категория" value="Разное">`,
    `<select id="finance-kind" data-testid="finance-kind"><option value="expense">Расход</option><option value="income">Доход</option><option value="transfer">Перевод</option><option value="balance">Баланс</option></select>`,
    button("add-finance", "Записать", { kind: "primary", testId: "add-finance" }),
    `</div>`,
    `<div class="money-columns">`,
    `<section><h3>Операции</h3>${safeList(transactions.slice(0, 8), (tx) => `<div class="money-row" data-testid="finance-transaction"><span><strong>${escapeHtml(tx.title || "Операция")}</strong><em>${escapeHtml([tx.day, tx.category].filter(Boolean).join(" · "))}</em></span><b>${tx.kind === "income" ? "+" : "-"}${money(tx.amount)}</b></div>`, `<div class="empty-inline">Добавь расход текстом или вручную.</div>`)}</section>`,
    `<section><h3>Счета</h3>${safeList(accounts, (account) => `<div class="money-row" data-testid="finance-account-row"><span>${escapeHtml(account.name || "Счёт")}</span><b>${money(account.balance)}</b></div>`, `<div class="empty-inline">Напиши: баланс карта 15200.</div>`)}</section>`,
    `</div>`,
    `</div>`
  ].join("");
}

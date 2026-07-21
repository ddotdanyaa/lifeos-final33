import { renderMoneyDashboard } from "./components/MoneyDashboard.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, escapeHtml, money, safeList } from "./components/shared.js";
// (Срез 3 использует button/escapeHtml из того же импорта - ничего нового.)

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

// Срез 3 (v1.4): недельный виджет смен - часы, доход/час, редактируемая цель недели и
// остаток до неё. Всё считается из финансовых транзакций (shiftHours на доходах), не из
// отдельной коллекции.
function weeklyChartSection(ctx) {
  const weekly = ctx.financeWeekly || { labels: [], expenseByDay: [], incomeByDay: [], hoursByDay: [] };
  const weekExpense = weekly.expenseByDay.reduce((sum, value) => sum + value, 0);
  const weekIncome = weekly.incomeByDay.reduce((sum, value) => sum + value, 0);
  const weekHours = (weekly.hoursByDay || []).reduce((sum, value) => sum + value, 0);
  const perHour = weekHours > 0 ? Math.round(weekIncome / weekHours) : 0;
  const goal = Number(ctx.financeWeeklyGoal || 0);
  const goalLeft = goal > 0 ? Math.max(0, goal - weekIncome) : 0;
  return [
    `<section class="finance-weekly" data-testid="finance-weekly-summary">`,
    `<h3>Неделя</h3>`,
    `<div class="finance-weekly-totals">`,
    `<span>Расходы: ${money(weekExpense)}</span><span>Доходы: ${money(weekIncome)}</span>`,
    `<span data-testid="shift-week-hours">Часы: ${weekHours ? weekHours + " ч" : "—"}</span>`,
    `<span data-testid="shift-week-rate">Доход/час: ${perHour ? money(perHour) : "—"}</span>`,
    goal > 0 ? `<span data-testid="weekly-goal-left">До цели: ${money(goalLeft)}</span>` : "",
    `</div>`,
    `<div class="weekly-goal-row"><label>Цель недели<input id="weekly-goal-input" data-testid="weekly-goal-input" type="number" min="0" step="500" value="${escapeHtml(goal || "")}" placeholder="30000" aria-label="Недельная цель дохода"></label>${button("set-weekly-goal", "Сохранить цель", { kind: "ghost", testId: "set-weekly-goal" })}</div>`,
    `<div class="finance-weekly-chart-box"><canvas data-testid="finance-weekly-chart"></canvas></div>`,
    `</section>`
  ].join("");
}

// F1.6: топ-категории месяца полосками (донор-паттерн tremor BarList, наш SVG/CSS).
function topCategoriesSection(ctx) {
  const rows = (ctx.financeSummary && ctx.financeSummary.topCategories) || [];
  if (!rows.length) return "";
  return [
    `<section class="finance-barlist" data-testid="finance-top-categories">`,
    `<h3>Топ категорий месяца</h3>`,
    rows.map((row) => `<div class="barlist-row" data-testid="barlist-row"><div class="barlist-track"><span class="barlist-fill" style="width:${Math.round(row.share * 100)}%"></span><span class="barlist-name">${escapeHtml(row.name)}</span></div><strong class="barlist-value">${money(row.amount)}</strong></div>`).join(""),
    `</section>`
  ].join("");
}

// F1.7: тепловая карта трат по дням месяца (донор-идея expensica calendar-view).
function spendHeatmapSection(ctx) {
  const summary = ctx.financeSummary || {};
  const cells = summary.heatmap || [];
  if (!cells.length || !cells.some((cell) => cell.spent > 0)) return "";
  const max = summary.heatMax || 1;
  return [
    `<section class="finance-heatmap" data-testid="finance-heatmap">`,
    `<h3>Траты по дням месяца</h3>`,
    `<div class="heatmap-grid">`,
    cells.map((cell) => {
      const intensity = cell.spent > 0 ? 0.18 + 0.82 * (cell.spent / max) : 0;
      const bg = cell.spent > 0 ? `background:color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, transparent)` : "";
      return `<div class="heatmap-cell" data-testid="heatmap-cell" data-spent="${cell.spent}" title="${cell.dayKey}: ${cell.spent ? Math.round(cell.spent).toLocaleString("ru-RU") + " ₽" : "нет трат"}" style="${bg}"><span>${cell.day}</span></div>`;
    }).join(""),
    `</div>`,
    `</section>`
  ].join("");
}

// F1.1: подсказка об обнаруженных регулярных платежах (донор-идея actual find-schedules).
function recurringHintSection(ctx) {
  const rows = (ctx.financeSummary && ctx.financeSummary.recurring) || [];
  if (!rows.length) return "";
  return [
    `<section class="finance-recurring" data-testid="finance-recurring">`,
    `<h3>Похоже на регулярные платежи</h3>`,
    rows.map((row) => `<div class="recurring-row" data-testid="recurring-row"><span>${escapeHtml(row.category)}</span><em>~${money(row.amount)} · ${row.count} раза</em>${button("make-subscription", "Сделать регулярным", { id: row.category, kind: "ghost", testId: "make-subscription" })}</div>`).join(""),
    `</section>`
  ].join("");
}

export function renderFinance(ctx) {
  const body = [
    `<div data-testid="finance-panel">`,
    renderMoneyDashboard(ctx),
    weeklyChartSection(ctx),
    topCategoriesSection(ctx),
    spendHeatmapSection(ctx),
    recurringHintSection(ctx),
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

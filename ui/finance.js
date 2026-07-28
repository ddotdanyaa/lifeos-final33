import { renderMoneyDashboard } from "./components/MoneyDashboard.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, dataSection, escapeHtml, money, safeList } from "./components/shared.js";
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
// F1.2: та же коллекция как прогноз "до конца месяца ожидается ещё -X" (донор-идея actual
// schedules) - честная проекция по среднему интервалу, показана строкой над списком.
function recurringHintSection(ctx) {
  const rows = (ctx.financeSummary && ctx.financeSummary.recurring) || [];
  if (!rows.length) return "";
  const forecast = (ctx.financeSummary && ctx.financeSummary.recurringForecast) || { total: 0, items: [] };
  return [
    `<section class="finance-recurring" data-testid="finance-recurring">`,
    `<h3>Похоже на регулярные платежи</h3>`,
    forecast.total > 0
      ? `<p class="recurring-forecast" data-testid="recurring-forecast">До конца месяца ожидается ещё ~${money(forecast.total)} по регулярным платежам</p>`
      : "",
    rows.map((row) => `<div class="recurring-row" data-testid="recurring-row"><span>${escapeHtml(row.category)}</span><em>~${money(row.amount)} · ${row.count} раза</em>${button("make-subscription", "Сделать регулярным", { id: row.category, kind: "ghost", testId: "make-subscription" })}</div>`).join(""),
    `</section>`
  ].join("");
}

// F1.4: бюджет-конверт по категориям (донор-идея actual budget) - потрачено/лимит/остаток
// вместо голого числа лимита, с прогресс-полоской и предупреждением о перерасходе.
function budgetEnvelopeRow(ctx, budget) {
  const envelopes = (ctx.financeSummary && ctx.financeSummary.budgetEnvelopes) || [];
  const envelope = envelopes.find((item) => item.category === budget.category);
  if (!envelope) return `<div class="budget-row" data-testid="budget-row"><span>${escapeHtml(budget.category || "Категория")}</span><strong>${money(budget.limit)}</strong></div>`;
  const share = envelope.limit ? Math.max(0, Math.min(100, Math.round((envelope.spent / envelope.limit) * 100))) : 0;
  return [
    `<div class="budget-row budget-envelope ${envelope.over ? "is-over" : ""}" data-testid="budget-row" data-raw-over="${envelope.over ? "true" : "false"}">`,
    `<div class="budget-envelope-head"><span>${escapeHtml(budget.category || "Категория")}</span><strong>${money(envelope.spent)} / ${money(envelope.limit)}</strong></div>`,
    `<div class="budget-envelope-bar"><span style="width:${share}%"></span></div>`,
    `<em data-testid="budget-envelope-remaining">${envelope.over ? "Перерасход на " + money(-envelope.remaining) : "Осталось " + money(envelope.remaining)}</em>`,
    `</div>`
  ].join("");
}

// F1.8: "хватит ли до зарплаты" - линейный burn-rate прогноз (донор-идея actual forecast,
// честная арифметика). Пусто, если день зарплаты не задан - никогда не имитирует прогноз.
function paydayForecastSection(ctx) {
  const summary = ctx.financeSummary || {};
  const forecast = summary.paydayForecast;
  const paydayDay = Number(ctx.financePaydayDay || 0);
  return [
    `<section class="finance-payday" data-testid="finance-payday">`,
    `<h3>Хватит ли до зарплаты</h3>`,
    `<div class="payday-input-row"><label>День зарплаты<input id="finance-payday-input" data-testid="finance-payday-input" type="number" min="0" max="28" step="1" value="${escapeHtml(paydayDay || "")}" placeholder="5" aria-label="День зарплаты в месяце"></label>${button("set-finance-payday", "Сохранить", { kind: "ghost", testId: "set-finance-payday" })}</div>`,
    forecast
      ? `<p class="payday-forecast" data-testid="payday-forecast-text" data-raw-will-last="${forecast.willLast ? "true" : "false"}">${forecast.willLast
          ? `При текущем темпе трат (~${money(summary.dailyBurnRate)}/день) баланса хватит до зарплаты ${escapeHtml(forecast.paydayDate)} (через ${forecast.daysUntil} дн.)`
          : `При текущем темпе трат (~${money(summary.dailyBurnRate)}/день) может не хватить ~${money(forecast.shortfall)} до зарплаты ${escapeHtml(forecast.paydayDate)} (через ${forecast.daysUntil} дн.)`}</p>`
      : `<p class="empty-inline" data-testid="payday-forecast-empty">Укажи день зарплаты, чтобы увидеть прогноз.</p>`,
    `</section>`
  ].join("");
}

// F1/F2 (owner directive 2026-07-22, docs/LIFEOS_V1_4_FULL_BUILD_PLAN.md §4A): bank OAuth
// aggregation is honestly not-connected - never a faked "connected" state (§7). The real,
// always-working path is a CSV/OFX statement the owner exports from their own bank site;
// each row becomes a PROPOSAL (never a silent write) via app.js's importBankStatement, reusing
// the existing finance_expense/finance_income proposal machinery - same accept flow as any
// other money proposal, with dedup so re-importing an overlapping statement doesn't double it.
function bankImportSection(ctx) {
  const bank = (ctx.providers || []).find((row) => row.key === "bank");
  const status = bank && bank.provider ? bank.provider.status : "not-connected";
  return [
    `<section class="finance-tool finance-bank-import" data-testid="finance-bank-import-form">`,
    `<h3>Импорт выписки</h3>`,
    `<p class="finance-bank-import-hint" data-testid="bank-provider-status" data-raw-status="${escapeHtml(status)}">Банк напрямую не подключён (OAuth не настроен). Экспортируй выписку CSV/OFX на сайте банка и импортируй файл — каждая строка появится как предложение в разборе.</p>`,
    button("import-bank-statement", "Импорт CSV/OFX", { kind: "primary", testId: "import-bank-statement" }),
    `<input id="bank-statement-import" data-testid="bank-statement-import-input" type="file" accept=".csv,.ofx,.qfx,text/csv" hidden>`,
    `</section>`
  ].join("");
}

export function renderFinance(ctx) {
  const body = [
    `<div data-testid="finance-panel">`,
    renderMoneyDashboard(ctx),
    bankImportSection(ctx),
    weeklyChartSection(ctx),
    topCategoriesSection(ctx),
    spendHeatmapSection(ctx),
    recurringHintSection(ctx),
    paydayForecastSection(ctx),
    `<section class="finance-deep-row">`,
    // П2: подпись «Категории» — над категориями. Форма ниже остаётся: завести первый бюджет
    // владелец должен уметь и на пустом экране.
    `<div class="budget-panel">${dataSection("Категории", ctx.budgets, (budget) => budgetEnvelopeRow(ctx, budget))}<div class="budget-add-row"><input id="budget-category" data-testid="budget-category" placeholder="Категория" aria-label="Категория бюджета"><input id="budget-limit" data-testid="budget-limit" type="number" min="0" step="500" placeholder="Лимит" aria-label="Лимит бюджета">${button("add-budget-entry", "Добавить бюджет", { kind: "ghost", testId: "add-budget-entry" })}</div></div>`,
    `<div class="subscription-panel">${dataSection("Подписки", ctx.subscriptions, (sub) => `<div class="subscription-row" data-testid="subscription-row"><span>${escapeHtml(sub.title || "Подписка")}</span><strong>${money(sub.amount)}</strong></div>`)}</div>`,
    `<div class="receipt-panel" data-testid="receipt-workbench"><h3>Скрин чека</h3><p>Чек сохраняется локально. Если OCR не подключён, расход можно заполнить вручную.</p>${button("import-file", "Добавить скрин", { kind: "primary", testId: "capture-import" })}</div>`,
    safeList(ctx.receiptSources || [], (source) => receiptCard(ctx, source), ""),
    `</section>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("finance", "Деньги", "Баланс, расходы, бюджет, подписки и чеки в одном понятном месте.", body, { testId: "workspace-finance", kicker: "Финансы" });
}

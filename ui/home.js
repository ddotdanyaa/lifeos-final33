import { renderAssistantInput } from "./components/AssistantInput.js";
import { renderHumanAnswerCard } from "./components/HumanAnswerCard.js";
import { renderRecordPanel } from "./components/PlayerSurface.js";
import { renderTimeGrid } from "./components/TimeGrid.js";
import { button, emptyState, escapeHtml, money, plural, safeList, taskUrgency } from "./components/shared.js";
import { taskRow } from "./today.js";

function renderMyDay(ctx) {
  const todayItems = (ctx.scheduleItems || []).filter((item) => item.day === ctx.todayKey);
  const undoneToday = (ctx.tasks || []).filter((task) => !task.deleted && task.status !== "done" && task.day === ctx.todayKey)
    .sort((a, b) => taskUrgency(b, ctx.todayKey) - taskUrgency(a, ctx.todayKey))
    .slice(0, 5);
  const recordingStatus = ctx.control?.audioRecordingStatus;
  const isRecordingActive = recordingStatus && recordingStatus.status && recordingStatus.status !== "idle";
  return [
    `<section class="home-my-day" data-testid="home-my-day">`,
    `<h2>Мой день</h2>`,
    isRecordingActive ? renderRecordPanel(recordingStatus) : "",
    `<div class="home-my-day-grid">`,
    renderTimeGrid(ctx, todayItems),
    `<aside class="home-today-tasks" data-testid="home-today-tasks">${safeList(undoneToday, (task) => taskRow(ctx, task, "home-task-row"), emptyState("Задач на сегодня нет", "Добавь через быстрые действия ниже."))}</aside>`,
    `</div>`,
    `</section>`
  ].join("");
}

// Срез 4 (v1.4): утренняя сводка - первое, что видишь при открытии. Только реальные
// данные (ctx.morningSummary из app.js), никаких заглушек: дата, прогресс к недельной
// цели, задачи на сегодня, итоги вчера.
function renderMorningSummary(ctx) {
  const m = ctx.morningSummary || {};
  const goalLine = m.weeklyGoal > 0
    ? `До недельной цели <strong>${money(m.weeklyGoalLeft)}</strong> (заработано ${money(m.weekIncome)} из ${money(m.weeklyGoal)})`
    : `Недельная цель не задана — поставь её в Деньгах`;
  const tasksLine = m.openTasksToday > 0
    ? `<strong>${m.openTasksToday}</strong> ${plural(m.openTasksToday, "задача", "задачи", "задач")} на сегодня${m.openTaskTitles && m.openTaskTitles.length ? ": " + m.openTaskTitles.map((t) => escapeHtml(t)).join(", ") : ""}`
    : `Задач на сегодня нет`;
  const yesterdayLine = m.hasYesterday
    ? `Вчера: выполнено ${m.yesterdayDone}, заработано ${money(m.yesterdayEarned)}, потрачено ${money(m.yesterdaySpent)}`
    : `Вчера записей не было`;
  return [
    `<section class="morning-summary" data-testid="morning-summary">`,
    `<div class="morning-summary-head"><span>Доброе утро</span><time data-testid="morning-date">${escapeHtml(m.dateLine || "")}</time></div>`,
    `<ul class="morning-summary-list">`,
    `<li data-testid="morning-goal">${goalLine}</li>`,
    `<li data-testid="morning-tasks">${tasksLine}</li>`,
    `<li data-testid="morning-yesterday">${yesterdayLine}</li>`,
    `</ul>`,
    `</section>`
  ].join("");
}

// Срез 11: панель инсайтов - вычисленные закономерности (app.js computeInsights). Каждый инсайт
// можно «Закрепить» в постоянный артефакт (owner-gated, с receipt). Пустой список - панель скрыта.
function renderInsightsPanel(ctx) {
  const insights = ctx.computedInsights || [];
  if (!insights.length) return "";
  return [
    `<section class="insights-panel" data-testid="insights-panel">`,
    `<div class="insights-head"><span>Инсайты</span><em>замечено в твоих данных</em></div>`,
    `<div class="insights-list">`,
    safeList(insights, (insight) => [
      `<div class="insight-card" data-testid="insight-card" data-insight="${escapeHtml(insight.id)}">`,
      `<span class="insight-icon" aria-hidden="true">${insight.icon}</span>`,
      `<div class="insight-body"><strong>${escapeHtml(insight.title)}</strong><span>${escapeHtml(insight.detail)} · уверенность: ${escapeHtml(insight.confidence)}</span></div>`,
      button("pin-insight", "Закрепить", { id: insight.id, kind: "ghost", testId: "pin-insight" }),
      `</div>`
    ].join(""), ""),
    `</div>`,
    `</section>`
  ].join("");
}

// Срез 11: «подвести день» - спокойная вечерняя рефлексия из фактов дня + верхний инсайт.
function renderEveningReflection(ctx) {
  const reflection = ctx.eveningReflection || {};
  if (!reflection.hasActivity) return "";
  const parts = [];
  if (reflection.income || reflection.expense) parts.push(`деньги: +${money(reflection.income)} / −${money(reflection.expense)}`);
  if (reflection.tasksDone) parts.push(`выполнено задач: ${reflection.tasksDone}`);
  if (reflection.captures) parts.push(`записей: ${reflection.captures}`);
  if (reflection.tasksOpen) parts.push(`осталось задач: ${reflection.tasksOpen}`);
  // U6: полная вечерняя сводка (образец: super-productivity daily-summary, MIT —
  // docs/OSS_DONOR_AUDIT.md): факт дня, невыполненное с явным переносом, превью завтра.
  const remaining = reflection.remaining || [];
  const tomorrowPreview = reflection.tomorrowPreview || [];
  return [
    `<section class="evening-reflection" data-testid="evening-reflection">`,
    `<div class="evening-head"><span>Подвести день</span></div>`,
    `<p data-testid="evening-summary">Сегодня — ${parts.join(", ")}.</p>`,
    reflection.topInsight ? `<p class="evening-insight" data-testid="evening-insight">${reflection.topInsight.icon} ${escapeHtml(reflection.topInsight.title)}</p>` : "",
    remaining.length ? [
      `<div class="evening-remaining" data-testid="evening-remaining">`,
      `<span>Не выполнено (${remaining.length}):</span>`,
      `<ul>${remaining.slice(0, 7).map((task) => `<li data-testid="evening-remaining-task">${escapeHtml(task.title)}</li>`).join("")}</ul>`,
      button("carry-over-tomorrow", "Перенести на завтра", { kind: "primary", testId: "carry-over-tomorrow" }),
      `</div>`
    ].join("") : "",
    tomorrowPreview.length ? `<p class="evening-tomorrow" data-testid="evening-tomorrow">Завтра: ${tomorrowPreview.map((title) => escapeHtml(title)).join(" · ")}</p>` : "",
    `</section>`
  ].join("");
}

// Срез 12: модель пользователя + поддержка решения. Характеристики с уверенностью и раскрытием
// «почему» (details), решение «стоит ли работать» с обоснованием и альтернативами. Ничего не
// приговаривает - показывает наблюдаемые числа и объяснение.
function renderUserModelPanel(ctx) {
  const traits = ctx.userModel || [];
  const decision = ctx.workDecision || null;
  if (!traits.length && !decision) return "";
  const traitCards = traits.map((trait) => [
    `<div class="trait-card" data-testid="trait-card" data-trait="${escapeHtml(trait.key)}">`,
    `<div class="trait-head"><strong>${escapeHtml(trait.name)}</strong><span class="trait-label">${escapeHtml(trait.label)}</span></div>`,
    `<div class="trait-bar"><span style="width:${Math.max(0, Math.min(100, trait.value))}%"></span></div>`,
    `<details class="trait-why"><summary>Почему · уверенность: ${escapeHtml(trait.confidence)}</summary><p data-testid="trait-why">${escapeHtml(trait.why)}</p></details>`,
    `</div>`
  ].join("")).join("");
  const decisionCard = decision ? [
    `<div class="decision-card" data-testid="decision-card">`,
    `<div class="decision-q">${escapeHtml(decision.question)}</div>`,
    `<div class="decision-answer" data-testid="decision-answer">${escapeHtml(decision.recommendation)} <span class="decision-conf">уверенность: ${escapeHtml(decision.confidence)}</span></div>`,
    `<p class="decision-why" data-testid="decision-why">${escapeHtml(decision.why)}</p>`,
    decision.alternatives && decision.alternatives.length
      ? `<div class="decision-alts"><span>Альтернативы:</span> ${decision.alternatives.map((alt) => `<em>${escapeHtml(alt)}</em>`).join(" · ")}</div>`
      : "",
    `</div>`
  ].join("") : "";
  return [
    `<section class="user-model-panel" data-testid="user-model-panel">`,
    `<div class="insights-head"><span>О тебе</span><em>из наблюдаемых данных, с объяснением</em></div>`,
    traitCards ? `<div class="trait-grid" data-testid="trait-grid">${traitCards}</div>` : "",
    decisionCard,
    `</section>`
  ].join("");
}

// Срез 14: адаптивный дашборд - виджеты Дома в порядке владельца, каждый можно скрыть/переставить.
// Раскладка приходит из app.js (dashboardLayout). Пустые виджеты не рисуются; скрытые - в отдельной
// полоске с «показать». Капча-первый принцип сохранён: ввод выше настраиваемых панелей.
const DASHBOARD_WIDGET_RENDERERS = {
  morning: renderMorningSummary,
  insights: renderInsightsPanel,
  usermodel: renderUserModelPanel,
  reflection: renderEveningReflection,
  myday: renderMyDay
};
function renderDashboardWidgets(ctx) {
  const layout = ctx.dashboardLayout || { order: [], hiddenKeys: [] };
  const cards = [];
  for (const item of layout.order || []) {
    if (item.hidden) continue;
    const renderer = DASHBOARD_WIDGET_RENDERERS[item.key];
    const content = renderer ? renderer(ctx) : "";
    if (!content) continue;
    cards.push([
      `<div class="dash-widget" data-testid="dash-widget" data-widget="${escapeHtml(item.key)}">`,
      `<div class="dash-widget-bar"><span class="dash-widget-name">${escapeHtml(item.label)}</span>`,
      `<span class="dash-widget-ctl">`,
      button("move-widget-up", "↑", { id: item.key, kind: "ghost", testId: "widget-up" }),
      button("move-widget-down", "↓", { id: item.key, kind: "ghost", testId: "widget-down" }),
      button("hide-widget", "Скрыть", { id: item.key, kind: "ghost", testId: "widget-hide" }),
      `</span></div>`,
      content,
      `</div>`
    ].join(""));
  }
  const hidden = (layout.order || []).filter((item) => item.hidden);
  const hiddenStrip = hidden.length
    ? `<div class="dash-hidden" data-testid="dash-hidden"><span>Скрытые виджеты:</span>${hidden.map((item) => button("show-widget", item.label, { id: item.key, kind: "ghost", testId: "widget-show" })).join("")}</div>`
    : "";
  return `<div class="dash-widgets" data-testid="dash-widgets">${cards.join("")}${hiddenStrip}</div>`;
}

// D1.1/F1.5: микрографик 7 дней (идея tremor SparkChart) - инлайн-SVG polyline.
function sparklineSvg(series, testId) {
  const values = (series || []).map((value) => Math.max(0, Number(value) || 0));
  if (values.length < 2 || !values.some((value) => value > 0)) return "";
  const max = Math.max(...values);
  const width = 72;
  const height = 20;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * width},${height - 2 - (value / max) * (height - 4)}`).join(" ");
  return `<svg class="mini-sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true" data-testid="${testId}"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// D1.2: прогресс-кольцо дня (done/total задач) - мини-donut на SVG-дуге.
function progressRing(done, total, testId) {
  if (!total) return "";
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const share = Math.max(0, Math.min(1, done / total));
  return `<svg class="mini-ring" viewBox="0 0 24 24" role="img" aria-label="Выполнено ${done} из ${total}" data-testid="${testId}"><circle cx="12" cy="12" r="${radius}" fill="none" stroke="currentColor" opacity="0.18" stroke-width="3"/><circle cx="12" cy="12" r="${radius}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(share * circumference).toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 12 12)"/></svg>`;
}

export function renderAssistantHome(ctx) {
  const today = ctx.todaySummary || {};
  const finance = ctx.financeSummary || {};
  const habitsDone = `${today.habitDone || 0}/${today.habitTotal || 0}`;
  const streak = today.habitStreak || 0;
  return [
    `<section class="assistant-home-v2" data-testid="command-center">`,
    `<div class="home-hero-copy">`,
    `<span>LifeOS</span>`,
    `<h1>Локальная ОС для дня, знаний и контроля</h1>`,
    `<p>Один вход превращает хаос в артефакты: задачи, деньги, знания, календарь, привычки и связи.</p>`,
    `</div>`,
    `<div class="assistant-home-grid">`,
    renderAssistantInput(ctx),
    renderHumanAnswerCard(ctx),
    `<aside class="home-mini-summary">`,
    `<button class="mini-summary-card" data-action="set-surface" data-id="today" data-testid="owner-next-zone"><span>Сегодня ${progressRing(today.doneToday || 0, (today.doneToday || 0) + (today.todayCount || 0), "today-ring")}</span><strong>${escapeHtml(today.next?.title || "Нет следующего действия")}</strong><em>${today.todayCount || 0} сегодня · ${today.unscheduled || 0} без времени</em></button>`,
    `<button class="mini-summary-card money" data-action="set-surface" data-id="finance" data-testid="owner-money-zone"><span>Деньги ${sparklineSvg(finance.sparkline, "money-sparkline")}</span><strong>${money(finance.balance)}</strong><em>${money(finance.todaySpend)} сегодня</em></button>`,
    `<button class="mini-summary-card habits" data-action="set-surface" data-id="habits" data-testid="owner-habit-zone"><span>Привычки ${streak >= 2 ? `<em class="streak-flame" data-testid="habit-streak">🔥${streak}</em>` : ""}</span><strong>${escapeHtml(habitsDone)}</strong><em>${ctx.goals?.length || 0} целей</em></button>`,
    `</aside>`,
    `</div>`,
    renderDashboardWidgets(ctx),
    ctx.commandMessage ? `<div class="human-toast" data-testid="home-command-message">${escapeHtml(ctx.commandMessage)}</div>` : "",
    `</section>`
  ].join("");
}

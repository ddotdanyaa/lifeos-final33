import { renderAssistantInput } from "./components/AssistantInput.js";
import { renderHumanAnswerCard } from "./components/HumanAnswerCard.js";
import { renderRecordPanel } from "./components/PlayerSurface.js";
import { renderTimeGrid } from "./components/TimeGrid.js";
import { button, emptyState, escapeHtml, money, safeList } from "./components/shared.js";
import { taskRow } from "./today.js";

function renderMyDay(ctx) {
  const todayItems = (ctx.scheduleItems || []).filter((item) => item.day === ctx.todayKey);
  const undoneToday = (ctx.tasks || []).filter((task) => !task.deleted && task.status !== "done" && task.day === ctx.todayKey).slice(0, 5);
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

export function renderAssistantHome(ctx) {
  const today = ctx.todaySummary || {};
  const finance = ctx.financeSummary || {};
  const habitsDone = `${today.habitDone || 0}/${today.habitTotal || 0}`;
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
    `<button class="mini-summary-card" data-action="set-surface" data-id="today" data-testid="owner-next-zone"><span>Сегодня</span><strong>${escapeHtml(today.next?.title || "Нет следующего действия")}</strong><em>${today.todayCount || 0} сегодня · ${today.unscheduled || 0} без времени</em></button>`,
    `<button class="mini-summary-card money" data-action="set-surface" data-id="finance" data-testid="owner-money-zone"><span>Деньги</span><strong>${money(finance.balance)}</strong><em>${money(finance.todaySpend)} сегодня</em></button>`,
    `<button class="mini-summary-card habits" data-action="set-surface" data-id="habits" data-testid="owner-habit-zone"><span>Привычки</span><strong>${escapeHtml(habitsDone)}</strong><em>${ctx.goals?.length || 0} целей</em></button>`,
    `</aside>`,
    `</div>`,
    renderMyDay(ctx),
    ctx.commandMessage ? `<div class="human-toast" data-testid="home-command-message">${escapeHtml(ctx.commandMessage)}</div>` : "",
    `</section>`
  ].join("");
}

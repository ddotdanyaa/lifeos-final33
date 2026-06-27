import { renderAssistantInput } from "./components/AssistantInput.js";
import { renderHumanAnswerCard } from "./components/HumanAnswerCard.js";
import { button, escapeHtml, money } from "./components/shared.js";

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
    ctx.commandMessage ? `<div class="human-toast" data-testid="home-command-message">${escapeHtml(ctx.commandMessage)}</div>` : "",
    `</section>`
  ].join("");
}

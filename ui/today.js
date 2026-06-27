import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, emptyState, escapeHtml, safeList, scheduleLine } from "./components/shared.js";

function taskRow(ctx, task, testId = "task-row") {
  const done = task.status === "done";
  return [
    `<article class="today-task-row ${done ? "is-done" : ""}" data-testid="${testId}">`,
    `<button class="round-check" data-action="toggle-task" data-id="${escapeHtml(task.id)}" data-testid="task-toggle">${done ? "✓" : ""}</button>`,
    `<div><strong>${escapeHtml(task.title || "Задача")}</strong><span>${escapeHtml(scheduleLine(task, ctx.todayKey, ctx.tomorrowKey))}</span></div>`,
    `<div class="row-actions">${button("edit-task", "Изменить", { id: task.id, kind: "ghost" })}${button("task-reminder", "Напомнить", { id: task.id, kind: "ghost" })}</div>`,
    `</article>`
  ].join("");
}

export function renderToday(ctx) {
  const todayTasks = ctx.tasks.filter((task) => !task.deleted && task.status !== "done" && task.day === ctx.todayKey);
  const timed = todayTasks.filter((task) => task.startTime).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  const noTime = todayTasks.filter((task) => !task.startTime);
  const overdue = ctx.tasks.filter((task) => !task.deleted && task.status !== "done" && task.day && task.day < ctx.todayKey);
  const reminders = (ctx.reminders || []).filter((item) => !item.deleted && item.status !== "done").slice(0, 5);
  const body = [
    `<div class="today-layout" data-testid="today-panel">`,
    `<section class="now-column">`,
    `<span>Что делать сейчас</span>`,
    todayTasks[0] ? taskRow(ctx, todayTasks[0], "today-next-action") : emptyState("День спокойный", "Добавь задачу через главный ввод.", button("focus-capture", "Добавить", { kind: "primary" })),
    `<div class="weak-day-box"><strong>Слабый день</strong><span>Оставь только одно важное действие и привычки без давления.</span></div>`,
    `</section>`,
    `<section class="timed-column"><h3>Сегодня по времени</h3>${safeList(timed, (task) => taskRow(ctx, task), emptyState("Нет задач по времени", "Поставь время в календаре или через ввод."))}</section>`,
    `<section class="bucket-column"><h3>Без времени</h3>${safeList(noTime, (task) => taskRow(ctx, task), `<div class="empty-inline">Пусто.</div>`)}</section>`,
    `<aside class="today-side"><h3>Привычки</h3>${safeList(ctx.habits.slice(0, 6), (habit) => `<button class="habit-check" data-action="toggle-habit" data-id="${escapeHtml(habit.id)}" data-testid="habit-row"><span>${habit.checkedToday ? "✓" : ""}</span><strong>${escapeHtml(habit.title || "Привычка")}</strong></button>`, `<div class="empty-inline">Привычки появятся после ввода.</div>`)}<h3>Напоминания</h3>${safeList(reminders, (item) => `<div class="reminder-chip"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(scheduleLine(item, ctx.todayKey, ctx.tomorrowKey))}</span></div>`, `<div class="empty-inline">Нет напоминаний.</div>`)}${overdue.length ? `<div class="overdue-note">${overdue.length} просрочено</div>` : ""}</aside>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("today", "Сегодня", "Спокойный режим выполнения: следующее, время, без времени, привычки и напоминания.", body, { testId: "workspace-today", kicker: "День" });
}

import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, emptyState, escapeHtml, safeList, scheduleLine } from "./components/shared.js";

export function taskRow(ctx, task, testId = "task-row") {
  const done = task.status === "done";
  return [
    `<article class="today-task-row ${done ? "is-done" : ""}" data-testid="${testId}">`,
    `<button class="round-check" data-action="toggle-task" data-id="${escapeHtml(task.id)}" data-testid="task-toggle">${done ? "✓" : ""}</button>`,
    `<div><strong>${escapeHtml(task.title || "Задача")}</strong><span data-testid="task-time">${escapeHtml(scheduleLine(task, ctx.todayKey, ctx.tomorrowKey))}</span>${done ? `<em>Готово</em>` : ""}</div>`,
    `<div class="row-actions">${button("edit-task", "Изменить", { id: task.id, kind: "ghost" })}${button("task-reminder", "Напомнить", { id: task.id, kind: "ghost" })}</div>`,
    `</article>`
  ].join("");
}

function planRow(ctx, block) {
  const done = block.status === "done";
  return [
    `<article class="today-task-row plan-row ${done ? "is-done" : ""}" data-testid="plan-row">`,
    `<button class="round-check" data-action="toggle-plan-block" data-id="${escapeHtml(block.id)}" data-testid="plan-toggle">${done ? "✓" : ""}</button>`,
    `<div><strong>${escapeHtml(block.title || "Блок")}</strong><span data-testid="plan-time">${escapeHtml(scheduleLine(block, ctx.todayKey, ctx.tomorrowKey))}</span>${done ? `<em>Готово</em>` : ""}</div>`,
    `<div class="row-actions">${button("edit-plan", "Изменить", { id: block.id, kind: "ghost" })}</div>`,
    `</article>`
  ].join("");
}

export function renderToday(ctx) {
  const todayTasks = ctx.tasks.filter((task) => !task.deleted && task.status !== "done" && task.day === ctx.todayKey);
  const doneToday = ctx.tasks.filter((task) => !task.deleted && task.status === "done" && task.day === ctx.todayKey);
  const timed = todayTasks.concat(doneToday).filter((task) => task.startTime).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  const noTime = todayTasks.filter((task) => !task.startTime);
  const overdue = ctx.tasks.filter((task) => !task.deleted && task.status !== "done" && task.day && task.day < ctx.todayKey);
  const reminders = (ctx.reminders || []).filter((item) => !item.deleted && item.status !== "done").slice(0, 5);
  const goals = (ctx.goals || []).filter((goal) => !goal.deleted);
  const planBlocks = (ctx.planBlocks || []).filter((block) => !block.deleted && block.day === ctx.todayKey);
  const systemSchedule = (ctx.systemRecordSchedule || []).filter((entry) => entry.day === ctx.todayKey);
  const body = [
    `<div class="today-layout" data-testid="today-panel">`,
    `<section class="now-column">`,
    `<span>Что делать сейчас</span>`,
    todayTasks[0] ? taskRow(ctx, todayTasks[0], "today-next-action") : emptyState("День спокойный", "Добавь задачу через главный ввод.", button("focus-capture", "Добавить", { kind: "primary" }), "🌤"),
    `<div class="today-goal-form"><h3>Цели</h3>${safeList(goals.slice(0, 4), (goal) => `<div class="goal-mini-row" data-testid="goal-row"><strong>${escapeHtml(goal.title || "Цель")}</strong>${button("toggle-goal", goal.status === "done" ? "Вернуть" : "Готово", { id: goal.id, kind: "ghost" })}</div>`, `<div class="empty-inline">Целей пока нет.</div>`)}<div class="today-form-row"><input id="goal-input" data-testid="goal-input" placeholder="Новая цель" aria-label="Новая цель">${button("add-goal", "Добавить", { kind: "primary", testId: "add-goal" })}</div></div>`,
    `</section>`,
    `<section class="timed-column"><h3>Сегодня по времени</h3>${safeList(timed, (task) => taskRow(ctx, task), emptyState("Нет задач по времени", "Поставь время в календаре или через ввод."))}<div class="today-form-row"><input id="task-input" data-testid="task-input" placeholder="Новая задача" aria-label="Новая задача"><input id="task-time" data-testid="task-time-input" placeholder="ЧЧ:ММ" aria-label="Время задачи">${button("add-task", "Добавить", { kind: "primary", testId: "add-task" })}</div></section>`,
    `<section class="bucket-column"><h3>Без времени</h3>${safeList(noTime, (task) => taskRow(ctx, task), `<div class="empty-inline">Пусто.</div>`)}</section>`,
    `<aside class="today-side"><h3>Привычки</h3>${safeList(ctx.habits.slice(0, 6), (habit) => `<button class="habit-check" data-action="toggle-habit" data-id="${escapeHtml(habit.id)}" data-testid="habit-row"><span>${habit.checkedToday ? "✓" : ""}</span><strong>${escapeHtml(habit.title || "Привычка")}</strong></button>`, `<div class="empty-inline">Привычки появятся после ввода.</div>`)}<h3>Напоминания</h3>${safeList(reminders, (item) => `<div class="reminder-chip"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(scheduleLine(item, ctx.todayKey, ctx.tomorrowKey))}</span></div>`, `<div class="empty-inline">Нет напоминаний.</div>`)}${overdue.length ? `<div class="overdue-note">${overdue.length} просрочено</div>` : ""}<h3>План дня</h3>${safeList(planBlocks, (block) => planRow(ctx, block), `<div class="empty-inline">Блоков плана пока нет.</div>`)}<div class="today-form-row"><input id="plan-input" data-testid="plan-input" placeholder="Новый блок плана" aria-label="Новый блок плана"><input id="plan-time" data-testid="plan-time-input" placeholder="ЧЧ:ММ" aria-label="Время блока">${button("add-plan-block", "Добавить", { kind: "primary", testId: "add-plan-block" })}</div><h3>Записи систем</h3><div data-testid="system-schedule-list">${safeList(systemSchedule, (entry) => `<div class="reminder-chip" data-testid="system-schedule-row"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.systemTitle + " · " + entry.fieldName)}</span></div>`, `<div class="empty-inline">Нет записей систем на сегодня.</div>`)}</div></aside>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("today", "Сегодня", "Спокойный режим выполнения: следующее, время, без времени, привычки и напоминания.", body, { testId: "workspace-today", kicker: "День" });
}

import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, emptyState, escapeHtml, safeList, scheduleLine, taskUrgency, urgencyClass } from "./components/shared.js";

// T1.6: подзадачи-чеклист внутри задачи (донор-идея super-productivity subTaskIds) - строка
// на подзадачу + прогресс-бейдж. Форма добавления скрыта на компактной карточке Дома
// (allowSubtaskEdit=false), чтобы не раздувать спокойный первый экран (CLAUDE.md §6).
function subtasksBlock(task, allowSubtaskEdit) {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  if (!subtasks.length && !allowSubtaskEdit) return "";
  const doneCount = subtasks.filter((item) => item.done).length;
  return [
    `<div class="task-subtasks" data-testid="task-subtasks">`,
    subtasks.length ? `<span class="subtask-progress" data-testid="subtask-progress">${doneCount}/${subtasks.length}</span>` : "",
    safeList(subtasks, (sub) => `<label class="subtask-row ${sub.done ? "is-done" : ""}" data-testid="subtask-row"><input type="checkbox" data-action="toggle-subtask" data-id="${escapeHtml(task.id)}::${escapeHtml(sub.id)}" data-testid="subtask-toggle" ${sub.done ? "checked" : ""}><span>${escapeHtml(sub.title)}</span></label>`, ""),
    allowSubtaskEdit
      ? `<div class="subtask-add-row"><input class="subtask-input" data-task-id="${escapeHtml(task.id)}" data-testid="subtask-input" placeholder="Подзадача" aria-label="Новая подзадача">${button("add-subtask", "+", { id: task.id, kind: "ghost", testId: "add-subtask" })}</div>`
      : "",
    `</div>`
  ].join("");
}

export function taskRow(ctx, task, testId = "task-row") {
  const done = task.status === "done";
  // T1.5: бейдж оценки времени (донор-идея super-productivity timeEstimate) - "~25м"/"~1ч20м".
  const estimateLabel = task.timeEstimateMin ? formatEstimate(task.timeEstimateMin) : "";
  const allowSubtaskEdit = testId !== "home-task-row";
  return [
    `<article class="today-task-row ${done ? "is-done" : ""} ${urgencyClass(task, ctx.todayKey)}" data-testid="${testId}">`,
    `<button class="round-check" data-action="toggle-task" data-id="${escapeHtml(task.id)}" data-testid="task-toggle">${done ? "✓" : ""}</button>`,
    `<div><strong>${task.frog ? `<span class="frog-badge" data-testid="frog-badge" title="Главная задача дня">🐸</span> ` : ""}${escapeHtml(task.title || "Задача")}${task.repeat ? ` <span class="repeat-badge" data-testid="repeat-badge" title="Повторяется">↻</span>` : ""}${estimateLabel ? ` <span class="estimate-badge" data-testid="estimate-badge" title="Оценка времени">~${escapeHtml(estimateLabel)}</span>` : ""}</strong><span data-testid="task-time">${escapeHtml(scheduleLine(task, ctx.todayKey, ctx.tomorrowKey))}</span>${done ? `<em>Готово</em>` : ""}</div>`,
    `<div class="row-actions">${done ? "" : button("toggle-frog", task.frog ? "Снять 🐸" : "🐸 Главная", { id: task.id, kind: "ghost", testId: "toggle-frog" })}${done ? "" : button("snooze-task-tomorrow", "→Завтра", { id: task.id, kind: "ghost", testId: "snooze-tomorrow" })}${button("edit-task", "Изменить", { id: task.id, kind: "ghost" })}</div>`,
    subtasksBlock(task, allowSubtaskEdit),
    `</article>`
  ].join("");
}

function formatEstimate(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m}м`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${hours}ч${rest}м` : `${hours}ч`;
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
  // T1.1: «Что делать сейчас» и списки дня отсортированы по срочности (obsidian-tasks
  // Urgency-паттерн), а не по порядку создания.
  const byUrgency = (a, b) => taskUrgency(b, ctx.todayKey) - taskUrgency(a, ctx.todayKey);
  const todayTasks = ctx.tasks.filter((task) => !task.deleted && task.status !== "done" && task.day === ctx.todayKey).sort(byUrgency);
  // T1.5: сумма оценок времени открытых задач на сегодня (донор-идея SP daily timeEstimate).
  const totalEstimateMin = todayTasks.reduce((sum, task) => sum + (task.timeEstimateMin || 0), 0);
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
    totalEstimateMin ? `<span class="estimate-total" data-testid="today-estimate-total">Запланировано: ~${escapeHtml(formatEstimate(totalEstimateMin))}</span>` : "",
    todayTasks[0] ? taskRow(ctx, todayTasks[0], "today-next-action") : emptyState("День спокойный", "Добавь задачу через главный ввод.", button("focus-capture", "Добавить", { kind: "primary" })),
    `<div class="weak-day-box"><strong>Слабый день</strong><span>Оставь только одно важное действие и привычки без давления.</span></div>`,
    `<div class="today-goal-form"><h3>Цели</h3>${safeList(goals.slice(0, 4), (goal) => `<div class="goal-mini-row" data-testid="goal-row"><strong>${escapeHtml(goal.title || "Цель")}</strong>${button("toggle-goal", goal.status === "done" ? "Вернуть" : "Готово", { id: goal.id, kind: "ghost" })}</div>`, `<div class="empty-inline">Целей пока нет.</div>`)}<div class="today-form-row"><input id="goal-input" data-testid="goal-input" placeholder="Новая цель" aria-label="Новая цель">${button("add-goal", "Добавить", { kind: "primary", testId: "add-goal" })}</div></div>`,
    `</section>`,
    `<section class="timed-column"><h3>Сегодня по времени</h3>${safeList(timed, (task) => taskRow(ctx, task), emptyState("Нет задач по времени", "Поставь время в календаре или через ввод."))}<div class="today-form-row"><input id="task-input" data-testid="task-input" placeholder="Новая задача" aria-label="Новая задача"><input id="task-time" data-testid="task-time-input" placeholder="ЧЧ:ММ" aria-label="Время задачи">${button("add-task", "Добавить", { kind: "primary", testId: "add-task" })}</div></section>`,
    `<section class="bucket-column"><h3>Без времени</h3>${safeList(noTime, (task) => taskRow(ctx, task), `<div class="empty-inline">Пусто.</div>`)}</section>`,
    `<aside class="today-side"><h3>Привычки</h3>${safeList(ctx.habits.slice(0, 6), (habit) => `<button class="habit-check" data-action="toggle-habit" data-id="${escapeHtml(habit.id)}" data-testid="habit-row"><span>${habit.checkedToday ? "✓" : ""}</span><strong>${escapeHtml(habit.title || "Привычка")}</strong></button>`, `<div class="empty-inline">Привычки появятся после ввода.</div>`)}<h3>Напоминания</h3>${safeList(reminders, (item) => `<div class="reminder-chip"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(scheduleLine(item, ctx.todayKey, ctx.tomorrowKey))}</span></div>`, `<div class="empty-inline">Нет напоминаний.</div>`)}${overdue.length ? `<div class="overdue-note">${overdue.length} просрочено</div>` : ""}<h3>План дня</h3>${safeList(planBlocks, (block) => planRow(ctx, block), `<div class="empty-inline">Блоков плана пока нет.</div>`)}<div class="today-form-row"><input id="plan-input" data-testid="plan-input" placeholder="Новый блок плана" aria-label="Новый блок плана"><input id="plan-time" data-testid="plan-time-input" placeholder="ЧЧ:ММ" aria-label="Время блока">${button("add-plan-block", "Добавить", { kind: "primary", testId: "add-plan-block" })}</div><h3>Записи систем</h3><div data-testid="system-schedule-list">${safeList(systemSchedule, (entry) => `<div class="reminder-chip" data-testid="system-schedule-row"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.systemTitle + " · " + entry.fieldName)}</span></div>`, `<div class="empty-inline">Нет записей систем на сегодня.</div>`)}</div></aside>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("today", "Сегодня", "Спокойный режим выполнения: следующее, время, без времени, привычки и напоминания.", body, { testId: "workspace-today", kicker: "День" });
}

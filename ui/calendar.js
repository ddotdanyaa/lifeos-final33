import { renderTimeGrid } from "./components/TimeGrid.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, emptyState, escapeHtml, safeList, scheduleLine } from "./components/shared.js";

export function renderCalendar(ctx) {
  const todayItems = ctx.scheduleItems.filter((item) => item.day === ctx.todayKey);
  const unscheduled = ctx.scheduleItems.filter((item) => !item.startTime && !item.time).slice(0, 8);
  const timedToday = todayItems.filter((item) => item.startTime || item.time);
  const isOverloaded = timedToday.length >= 6 || todayItems.length >= 9;
  const overloadTitle = isOverloaded ? "Перегруз календаря" : "День выглядит спокойно";
  const overloadDetail = isOverloaded
    ? `${todayItems.length} блоков сегодня. Перенеси часть задач или сократи длинные блоки.`
    : `${todayItems.length} блоков сегодня. Без времени: ${unscheduled.length}.`;
  const actions = [
    `<input id="calendar-task-input" data-testid="calendar-task-input" placeholder="Новый блок" aria-label="Новый блок календаря">`,
    `<input id="calendar-task-day" data-testid="calendar-task-day" type="date" value="${escapeHtml(ctx.todayKey)}" aria-label="Дата">`,
    `<input id="calendar-task-time" data-testid="calendar-task-time" type="time" aria-label="Время">`,
    button("add-calendar-task", "Добавить", { kind: "primary", testId: "add-calendar-task" })
  ].join("");
  const body = [
    `<div class="calendar-planner" data-testid="calendar-workbench">`,
    `<nav class="calendar-tabs"><button class="active">Сегодня</button><button>Завтра</button><button>Неделя</button></nav>`,
    `<section class="calendar-load-state" data-testid="calendar-overload-warning"><span>Фокус дня</span><strong>${escapeHtml(overloadTitle)}</strong><em>${escapeHtml(overloadDetail)}</em></section>`,
    `<main class="calendar-main-grid">`,
    renderTimeGrid(ctx, todayItems),
    `<aside class="unscheduled-bucket"><h3>Без времени</h3>${safeList(unscheduled, (item) => `<button class="unscheduled-item" data-action="focus-graph-node" data-id="${escapeHtml(item.id)}" data-testid="calendar-agenda-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(scheduleLine(item, ctx.todayKey, ctx.tomorrowKey))}</span></button>`, emptyState("Нет свободных задач", "Все задачи либо назначены, либо день пуст."))}</aside>`,
    `</main>`,
    `<footer class="calendar-agenda-strip" data-testid="calendar-agenda-strip">${safeList(ctx.scheduleItems.slice(0, 6), (item) => `<button data-action="focus-graph-node" data-id="${escapeHtml(item.id)}"><time>${escapeHtml(scheduleLine(item, ctx.todayKey, ctx.tomorrowKey))}</time><strong>${escapeHtml(item.title || "Блок")}</strong></button>`, `<span>Добавь задачу, и она появится в плане.</span>`)}</footer>`,
    `<section class="calendar-system-schedule" data-testid="calendar-system-schedule"><h3>Даты систем</h3>${safeList((ctx.systemRecordSchedule || []).slice(0, 10), (entry) => `<div class="reminder-chip" data-testid="calendar-system-schedule-row"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.day + " · " + entry.systemTitle)}</span></div>`, `<span>Даты систем появятся после заполнения полей типа "дата".</span>`)}</section>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("calendar", "Календарь", "Планирование времени, а не таблица задач.", body, { testId: "workspace-calendar", actions, kicker: "План" });
}

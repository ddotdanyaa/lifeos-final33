import { renderTimeGrid } from "./components/TimeGrid.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, dataSection, emptyState, escapeHtml, safeList, scheduleLine, surfaceNotice } from "./components/shared.js";

// K1.1: месячный вид с плотными полосками событий по дням (донор-идея tui.calendar
// month-view) - плюс к уже существующему дневному грид-виду, не вместо него.
function renderCalendarMonthView(ctx) {
  const month = ctx.calendarMonth || { monthLabel: "", weeks: [] };
  const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return [
    `<section class="calendar-month-view" data-testid="calendar-month-view">`,
    `<div class="calendar-month-head"><strong>${escapeHtml(month.monthLabel)}</strong></div>`,
    `<div class="calendar-month-weekdays">${weekdayLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>`,
    `<div class="calendar-month-grid" data-testid="calendar-month-grid">`,
    month.weeks.map((week) => week.map((cell) => {
      if (!cell) return `<div class="calendar-month-day is-blank"></div>`;
      return [
        `<div class="calendar-month-day${cell.isToday ? " is-today" : ""}" data-testid="calendar-month-day" data-day="${escapeHtml(cell.dayKey)}">`,
        `<span class="calendar-month-day-num">${cell.day}</span>`,
        `<div class="calendar-month-pills">`,
        cell.items.map((item) => `<span class="calendar-month-pill calendar-month-pill-${escapeHtml(item.kind || "task")}" data-testid="calendar-month-pill">${escapeHtml(item.title)}</span>`).join(""),
        cell.overflow > 0 ? `<span class="calendar-month-more" data-testid="calendar-month-more">+${cell.overflow}</span>` : "",
        `</div>`,
        `</div>`
      ].join("");
    }).join("")).join(""),
    `</div>`,
    `</section>`
  ].join("");
}

export function renderCalendar(ctx) {
  const isMonth = ctx.calendarView === "month";
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
  // K1.1: «Сегодня»/«Месяц» реально переключают вид (state.calendarView); «Завтра»/«Неделя»
  // остаются как были - декоративные, вне рамок этого пакета, не трогаем.
  const tabs = `<nav class="calendar-tabs" data-testid="calendar-tabs"><button class="${!isMonth ? "active" : ""}" data-action="set-calendar-view" data-id="day" data-testid="calendar-tab-day">Сегодня</button><button>Завтра</button><button>Неделя</button><button class="${isMonth ? "active" : ""}" data-action="set-calendar-view" data-id="month" data-testid="calendar-tab-month">Месяц</button></nav>`;
  const mainSection = isMonth
    ? renderCalendarMonthView(ctx)
    : [
        `<section class="calendar-load-state" data-testid="calendar-overload-warning"><span>Фокус дня</span><strong>${escapeHtml(overloadTitle)}</strong><em>${escapeHtml(overloadDetail)}</em></section>`,
        `<main class="calendar-main-grid">`,
        renderTimeGrid(ctx, todayItems),
        // П2: подпись «Без времени» — только над задачами без времени. Пустое состояние
        // отвечает на вопрос «почему пусто» и остаётся; подпись над ним не нужна.
        `<aside class="unscheduled-bucket">${dataSection("Без времени", unscheduled, (item) => `<button class="unscheduled-item" data-action="focus-graph-node" data-id="${escapeHtml(item.id)}" data-testid="calendar-agenda-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(scheduleLine(item, ctx.todayKey, ctx.tomorrowKey))}</span></button>`)}${unscheduled.length ? "" : emptyState("Нет свободных задач", "Все задачи либо назначены, либо день пуст.")}</aside>`,
        `</main>`,
        `<footer class="calendar-agenda-strip" data-testid="calendar-agenda-strip">${safeList(ctx.scheduleItems.slice(0, 6), (item) => `<button data-action="focus-graph-node" data-id="${escapeHtml(item.id)}"><time>${escapeHtml(scheduleLine(item, ctx.todayKey, ctx.tomorrowKey))}</time><strong>${escapeHtml(item.title || "Блок")}</strong></button>`, `<span>Добавь задачу, и она появится в плане.</span>`)}</footer>`
      ].join("");
  const body = [
    `<div class="calendar-planner" data-testid="calendar-workbench">`,
    tabs,
    // Ответ на нажатие по вкладке. «Сегодня» на свежем экране уже активна, и переключать ей
    // нечего — но молчать в ответ она не должна, иначе живая вкладка выглядит мёртвой.
    surfaceNotice(ctx, "calendar", "calendar-view-notice"),
    mainSection,
    // Раздела нет вовсе, пока в системах не заполнено ни одного поля-даты: обещание «появятся
    // после заполнения полей типа дата» рассказывает об устройстве системы, а не о дне владельца.
    `<section class="calendar-system-schedule" data-testid="calendar-system-schedule">${dataSection("Даты систем", (ctx.systemRecordSchedule || []).slice(0, 10), (entry) => `<div class="reminder-chip" data-testid="calendar-system-schedule-row"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.day + " · " + entry.systemTitle)}</span></div>`)}</section>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("calendar", "Календарь", "Планирование времени, а не таблица задач.", body, { testId: "workspace-calendar", actions, kicker: "План" });
}

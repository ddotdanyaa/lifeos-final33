import { button, escapeHtml, safeList, scheduleLine } from "./shared.js";

export function renderTimeGrid(ctx, items = []) {
  const hours = [];
  for (let hour = 6; hour <= 23; hour += 1) hours.push(String(hour).padStart(2, "0") + ":00");
  const rows = hours.map((slot) => {
    const rowItems = items.filter((item) => (item.startTime || item.time || "").slice(0, 2) === slot.slice(0, 2));
    return [
      `<div class="planning-hour" data-testid="time-row-${escapeHtml(slot)}">`,
      `<time>${escapeHtml(slot)}</time>`,
      `<div class="planning-hour-items">`,
      safeList(rowItems, (item) => {
        const id = item.id || "";
        return `<button class="calendar-time-block" data-action="focus-graph-node" data-id="${escapeHtml(id)}" data-testid="calendar-item"><span>${escapeHtml(scheduleLine(item, ctx.todayKey, ctx.tomorrowKey))}</span><strong>${escapeHtml(item.title || "Блок времени")}</strong></button>`;
      }, `<span class="planning-empty"></span>`),
      `</div>`,
      `</div>`
    ].join("");
  });
  // "hourly-time-grid", not "calendar-grid": app.js's dead legacy renderCalendarPanelLegacy/V5
  // functions (unreachable in the live chat-first shell) also emit class="calendar-grid" for an
  // unrelated 7-day mini-calendar, and styles.css's rule for THAT (grid-template-columns:
  // repeat(7, ...)) was silently applying here too via the shared class name - collapsing all 18
  // hour rows into a 7-column grid (rows overlapping 7-at-a-time) since nothing in the newer rule
  // overrode display/grid-template-columns. Kept data-testid="calendar-grid" unchanged (no test
  // depended on the class name itself, only final-human-product.spec.mjs's H08, updated to match).
  return `<div class="hourly-time-grid" data-testid="calendar-grid">${rows.join("")}</div>`;
}

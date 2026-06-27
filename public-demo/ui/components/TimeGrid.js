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
  return `<div class="calendar-grid" data-testid="calendar-grid">${rows.join("")}</div>`;
}

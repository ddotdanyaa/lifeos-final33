import { button, escapeHtml } from "./shared.js";

export function renderInspectorDrawer(title, rows = [], actions = []) {
  return [
    `<aside class="inspector-drawer" data-testid="workspace-inspector">`,
    `<strong>${escapeHtml(title || "Детали")}</strong>`,
    `<div class="inspector-rows">`,
    rows.map((row) => `<div><span>${escapeHtml(row[0])}</span><em>${escapeHtml(row[1])}</em></div>`).join(""),
    `</div>`,
    actions.length ? `<div class="inspector-actions">${actions.map((item) => button(item.action, item.label, { id: item.id || "", kind: "ghost" })).join("")}</div>` : "",
    `</aside>`
  ].join("");
}

import { button, escapeHtml } from "./shared.js";

export function renderPrimaryActionCard(title, detail, action, label, options = {}) {
  return [
    `<article class="primary-action-card ${escapeHtml(options.className || "")}" data-testid="${escapeHtml(options.testId || "primary-action-card")}">`,
    `<div><strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ""}</div>`,
    button(action, label, { id: options.id || "", kind: "primary", testId: options.buttonTestId || "" }),
    `</article>`
  ].join("");
}

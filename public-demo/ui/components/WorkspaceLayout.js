import { escapeHtml } from "./shared.js";

export function renderWorkspaceLayout(name, title, subtitle, body, options = {}) {
  const testId = options.testId || `workspace-${name}`;
  const classes = ["workspace-v2", `${name}-workspace`].concat(options.classes || []);
  return [
    `<section class="${classes.join(" ")}" data-testid="${escapeHtml(testId)}">`,
    `<header class="workspace-head">`,
    `<div><span>${escapeHtml(options.kicker || "")}</span><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>`,
    options.actions ? `<div class="workspace-actions">${options.actions}</div>` : "",
    `</header>`,
    body,
    `</section>`
  ].join("");
}

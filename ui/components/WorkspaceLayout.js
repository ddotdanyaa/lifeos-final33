import { escapeHtml } from "./shared.js";

// Экраны-каркасы (список — в ui/shell.js, взят из канона §9). У них есть заголовок и пара
// кнопок, но нет работающего сценария. Молчать об этом нельзя: владелец заходит, видит
// оформленную страницу и решает, что продукт сломан, — вместо того чтобы знать, что раздел
// просто ещё не дописан. Подпись стоит В САМОМ ВЕРХУ экрана, до того как он начнёт кликать.
const DRAFT_SURFACE_IDS = new Set([
  "projects", "models", "smart-home", "marketplace", "builder", "design", "databases", "screen", "twin"
]);

export function renderWorkspaceLayout(name, title, subtitle, body, options = {}) {
  const testId = options.testId || `workspace-${name}`;
  const classes = ["workspace-v2", `${name}-workspace`].concat(options.classes || []);
  const draft = DRAFT_SURFACE_IDS.has(name)
    ? `<p class="workspace-draft-note" data-testid="workspace-draft-note">🚧 Раздел в разработке: экран есть, сценарий за ним ещё не собран. Ничего не потеряется — записывать пока лучше через Дом.</p>`
    : "";
  return [
    `<section class="${classes.join(" ")}" data-testid="${escapeHtml(testId)}">`,
    `<header class="workspace-head">`,
    `<div><span>${escapeHtml(options.kicker || "")}</span><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>`,
    options.actions ? `<div class="workspace-actions">${options.actions}</div>` : "",
    `</header>`,
    draft,
    body,
    `</section>`
  ].join("");
}

import { button, escapeHtml } from "./shared.js";

// Честность (§7): разделы-каркасы (система-фабрика, CRUD-заготовки, gated-провайдеры) не проходят
// сценарий от начала до конца как ежедневные разделы. Не имитируем готовность — на них висит
// честная плашка «в разработке», а рабочий ежедневный контур назван прямо.
const DRAFT_SURFACES = new Set([
  "systems", "builder", "projects", "models", "smart-home",
  "marketplace", "design", "databases", "screen", "twin"
]);

function draftNote(name) {
  if (!DRAFT_SURFACES.has(name)) return "";
  return [
    `<div class="workspace-draft-note" data-testid="workspace-draft-note">`,
    `<span class="draft-badge">В разработке</span>`,
    `<p>Этот раздел ещё собирается: часть действий пока не проходит сценарий от начала до конца. Готовые ежедневные разделы — Дом, Сегодня, Деньги, Календарь, Граф, Чат.</p>`,
    button("set-surface", "На Дом", { id: "inbox", kind: "ghost", testId: "draft-note-home" }),
    `</div>`
  ].join("");
}

export function renderWorkspaceLayout(name, title, subtitle, body, options = {}) {
  const testId = options.testId || `workspace-${name}`;
  const classes = ["workspace-v2", `${name}-workspace`].concat(options.classes || []);
  return [
    `<section class="${classes.join(" ")}${DRAFT_SURFACES.has(name) ? " is-draft-surface" : ""}" data-testid="${escapeHtml(testId)}">`,
    `<header class="workspace-head">`,
    `<div><span>${escapeHtml(options.kicker || "")}</span><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>`,
    options.actions ? `<div class="workspace-actions">${options.actions}</div>` : "",
    `</header>`,
    draftNote(name),
    body,
    `</section>`
  ].join("");
}

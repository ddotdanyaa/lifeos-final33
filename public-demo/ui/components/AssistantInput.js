import { button, escapeHtml } from "./shared.js";

export function renderAssistantInput(ctx) {
  const quickButtons = [
    ["quick-task", "Задача", "quick-task"],
    ["quick-expense", "Расход", "quick-expense"],
    ["import-file", "Файл / скрин", "capture-import"],
    ["import-audio", "Аудио", "capture-audio"],
    ["import-file", "Книга", "capture-book"]
  ];
  return [
    `<section class="assistant-composer" data-testid="mega-dropzone">`,
    `<label for="capture-input">Что добавить в LifeOS?</label>`,
    `<textarea id="capture-input" data-testid="capture-input" spellcheck="true" aria-label="Универсальный ввод LifeOS" placeholder="Напиши, скажи, скинь файл, чек, аудио, книгу, письмо, задачу или мысль…">${escapeHtml(ctx.captureDraft || "")}</textarea>`,
    `<div class="assistant-quick-actions" data-testid="assistant-quick-actions">`,
    quickButtons.map(([action, label, testId]) => button(action, label, { testId })).join(""),
    `</div>`,
    `<div class="assistant-submit-row">`,
    button("capture-text", "Разобрать", { kind: "calm", testId: "capture-text" }),
    button("bulk-import-lines", "Импорт по строкам", { kind: "ghost", testId: "bulk-import-lines" }),
    button("clear-capture", "Очистить", { kind: "ghost", testId: "clear-capture" }),
    `</div>`,
    `</section>`
  ].join("");
}

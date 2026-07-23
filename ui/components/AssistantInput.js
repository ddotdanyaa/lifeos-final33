import { button, escapeHtml } from "./shared.js";

// Первый экран спокойный (§6): одно поле + одно главное действие + несколько частых типов.
// Файл/аудио/книга/импорт-списком — power-user, они уезжают в прогрессивное раскрытие
// «Прикрепить», а не громоздятся на главном экране рядом с вводом.
export function renderAssistantInput(ctx) {
  const captureChips = [
    ["start-audio-recording", "Голос", "quick-voice"],
    ["quick-expense", "Расход", "quick-expense"],
    ["quick-task", "Задача", "quick-task"],
    ["quick-note", "Мысль", "quick-note"]
  ];
  const attachActions = [
    ["import-file", "Файл / скрин", "capture-import"],
    ["import-audio", "Аудио", "capture-audio"],
    ["import-file", "Книга", "capture-book"],
    ["bulk-import-lines", "Импорт по строкам", "bulk-import-lines"]
  ];
  const hasDraft = Boolean(ctx.captureDraft);
  return [
    `<section class="assistant-composer" data-testid="mega-dropzone">`,
    `<label for="capture-input">Что добавить в LifeOS?</label>`,
    `<textarea id="capture-input" data-testid="capture-input" spellcheck="true" aria-label="Универсальный ввод LifeOS" placeholder="Напиши, скажи, скинь файл, чек, аудио, книгу, письмо, задачу или мысль…">${escapeHtml(ctx.captureDraft || "")}</textarea>`,
    `<div class="assistant-quick-actions" data-testid="assistant-quick-actions">`,
    captureChips.map(([action, label, testId]) => button(action, label, { testId })).join(""),
    `</div>`,
    `<div class="assistant-submit-row">`,
    button("capture-text", "Разобрать", { kind: "calm", testId: "capture-text" }),
    hasDraft ? button("clear-capture", "Очистить", { kind: "ghost", testId: "clear-capture" }) : "",
    `</div>`,
    `<details class="assistant-attach" data-testid="assistant-attach">`,
    `<summary data-testid="assistant-attach-toggle">Прикрепить файл, аудио, книгу или импорт списком</summary>`,
    `<div class="assistant-attach-row">`,
    attachActions.map(([action, label, testId]) => button(action, label, { testId, kind: "ghost" })).join(""),
    `</div>`,
    `</details>`,
    `</section>`
  ].join("");
}

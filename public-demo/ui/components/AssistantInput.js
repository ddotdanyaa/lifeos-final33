import { button, escapeHtml } from "./shared.js";

// Прикреплённые файлы. Раньше импорт проходил молча — владелец выбирал два голосовых, на
// экране не менялось ничего, и он справедливо решал, что файлы не прикрепились. Теперь каждый
// виден строкой: имя, размер и честный статус, который считается из самой записи.
function renderAttachments(attachments) {
  if (!attachments.length) return "";
  return [
    `<div class="capture-attachments" data-testid="capture-attachments">`,
    `<span class="capture-attachments-title">Прикреплено: ${attachments.length}</span>`,
    attachments.map((item) => [
      `<button class="capture-attachment" data-action="open-source-note" data-id="${escapeHtml(item.id)}" data-testid="capture-attachment" title="Открыть запись">`,
      `<strong>${escapeHtml(item.name || "Файл")}</strong>`,
      `<span>${escapeHtml(formatAttachmentSize(item.size))} · ${escapeHtml(item.status)}</span>`,
      `</button>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

function formatAttachmentSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return "размер неизвестен";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " МБ";
}

export function renderAssistantInput(ctx) {
  const attachments = ctx.captureAttachments || [];
  const quickButtons = [
    ["start-audio-recording", "Голос", "quick-voice"],
    ["quick-expense", "Расход", "quick-expense"],
    ["quick-task", "Задача", "quick-task"],
    ["quick-note", "Мысль", "quick-note"],
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
    renderAttachments(attachments),
    `<div class="assistant-submit-row">`,
    // Кнопка называет то, что сделает. Раньше при пустом поле и двух прикреплённых голосовых
    // она не делала ничего — ни действия, ни объяснения, и это читалось как зависание.
    button("capture-text", attachments.length && !(ctx.captureDraft || "").trim() ? "Разобрать прикреплённое (" + attachments.length + ")" : "Разобрать", { kind: "calm", testId: "capture-text" }),
    button("bulk-import-lines", "Импорт по строкам", { kind: "ghost", testId: "bulk-import-lines" }),
    button("clear-capture", "Очистить", { kind: "ghost", testId: "clear-capture" }),
    `</div>`,
    `</section>`
  ].join("");
}

import { escapeHtml } from "./shared.js";

// Закон №7 канона: вопрос остаётся вопросом. Система отвечает текстом с цитатами на свои же
// артефакты и явно пишет, что ничего не создала. Цитата кликабельна — ведёт в объект-источник,
// чтобы ответ можно было проверить, а не принять на веру.
export function renderGroundedAnswer(ctx) {
  const view = ctx.groundedAnswer || { hasAnswer: false };
  if (!view.hasAnswer) return "";
  return [
    `<section class="grounded-answer" data-testid="grounded-answer">`,
    `<p class="canon-eyebrow">Ответ · ${escapeHtml(view.at)}</p>`,
    `<h3 class="grounded-question" data-testid="grounded-question">${escapeHtml(view.question)}</h3>`,
    `<p class="grounded-text" data-testid="grounded-answer-text">${escapeHtml(view.answer)}</p>`,
    view.citations.length ? [
      `<div class="grounded-citations" data-testid="grounded-citations">`,
      view.citations.map((row) => [
        `<button class="grounded-citation" data-action="open-object" data-id="${escapeHtml(row.id)}" data-testid="grounded-citation">`,
        `<span class="grounded-citation-head"><strong>${escapeHtml(row.title)}</strong><time>${escapeHtml(row.at)}</time></span>`,
        `<em data-testid="grounded-citation-quote">«${escapeHtml(row.quote)}»</em>`,
        `</button>`
      ].join("")).join(""),
      `</div>`
    ].join("") : "",
    `<p class="grounded-nothing" data-testid="grounded-nothing-created">${escapeHtml(view.nothingCreatedLine)}</p>`,
    `</section>`
  ].join("");
}

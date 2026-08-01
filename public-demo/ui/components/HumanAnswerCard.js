import { button, escapeHtml } from "./shared.js";

export function renderHumanAnswerCard(ctx) {
  const answer = ctx.answer || {};
  // Перепись живого 2026-07-31 нашла «Главное действие» мёртвым на пустом экране — и была права
  // по существу, а не придиралась. Когда разбирать нечего, эта карточка повторяет композер
  // слово в слово: та же кнопка, то же действие, тот же ответ. Два одинаковых главных действия
  // на экране — это ноль главных действий, и второе нажатие честно ничего не меняет.
  //
  // Карточка не «прячется, чтобы гейт позеленел»: она перестаёт существовать в состоянии, где ей
  // нечего сказать. Появилась запись или черновик — вернулась и снова отвечает на «ну и что?».
  if (!ctx.latestSource && !String(ctx.captureDraft || "").trim()) return "";
  const facts = Array.isArray(answer.facts) && answer.facts.length ? answer.facts : ["Я разберу ввод и покажу действие до любых изменений."];
  const primary = answer.primary || { label: "Разобрать ввод", action: "capture-text", id: "", disabled: false };
  const secondary = Array.isArray(answer.secondary) ? answer.secondary : [];
  const visibleSecondary = secondary.slice(0, 2);
  const hiddenSecondary = secondary.slice(2);
  return [
    `<section class="human-answer-card" data-testid="lifeos-understanding">`,
    `<div class="human-answer-copy" data-testid="active-artifact-card">`,
    // «LifeOS понял» — система рассказывает о себе. Владелец спрашивает не «что понял LifeOS»,
    // а «что стало с тем, что я сказал». Заголовок говорит от его лица, а не от лица движка.
    `<span>Что я понял из записи</span>`,
    `<ul>${facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>`,
    `</div>`,
    `<div class="human-main-action" data-testid="owner-review-stage">`,
    `<span>Главное действие</span>`,
    button(primary.action || "capture-text", primary.label || "Разобрать ввод", {
      id: primary.id || "",
      kind: "primary",
      testId: "human-primary-action",
      disabled: Boolean(primary.disabled),
      title: primary.disabled ? "Нужно уточнить время" : ""
    }),
    `</div>`,
    `<div class="human-secondary-actions">`,
    ctx.latestSource ? button("open-source-note", "Открыть источник", { id: ctx.latestSource.id, kind: "ghost", testId: "home-open-source" }) : "",
    visibleSecondary.map((item) => button(item.action || "focus-capture", item.label || "Изменить", { id: item.id || "", kind: "ghost" })).join(""),
    hiddenSecondary.length ? `<details><summary>Детали</summary><div>${hiddenSecondary.map((item) => button(item.action || "focus-capture", item.label || "Деталь", { id: item.id || "", kind: "ghost" })).join("")}</div></details>` : `<details><summary>Детали</summary><p>Связи и контроль доступны в отдельных рабочих режимах, чтобы не перегружать первый экран.</p></details>`,
    `</div>`,
    `</section>`
  ].join("");
}

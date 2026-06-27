import { button, escapeHtml } from "./shared.js";

export function renderHumanAnswerCard(ctx) {
  const answer = ctx.answer || {};
  const facts = Array.isArray(answer.facts) && answer.facts.length ? answer.facts : ["Я разберу ввод и покажу действие до любых изменений."];
  const primary = answer.primary || { label: "Разобрать ввод", action: "capture-text", id: "", disabled: false };
  const secondary = Array.isArray(answer.secondary) ? answer.secondary : [];
  const visibleSecondary = secondary.slice(0, 2);
  const hiddenSecondary = secondary.slice(2);
  return [
    `<section class="human-answer-card" data-testid="lifeos-understanding">`,
    `<div class="human-answer-copy" data-testid="active-artifact-card">`,
    `<span>LifeOS понял</span>`,
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

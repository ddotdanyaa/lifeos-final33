import { renderGraphCanvas } from "./components/GraphCanvas.js";
import { renderInspectorDrawer } from "./components/InspectorDrawer.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, escapeHtml, safeList } from "./components/shared.js";

// Срез 10: разрешение сущностей-людей. Канонические люди (алиасы слиты) + предложения слить
// неоднозначные пары (owner-gated). Проекции приходят из app.js (resolvePeople,
// personMergeSuggestions). Живёт в Графе, т.к. люди - это узлы связей.
function personRow(person) {
  const aliasChips = person.aliases.length
    ? `<span class="person-aliases">${person.aliases.map((alias) => `<span class="person-alias-chip">${escapeHtml(alias)}</span>`).join("")}</span>`
    : "";
  return [
    `<div class="person-row" data-testid="person-row" data-person="${escapeHtml(person.name)}">`,
    `<div class="person-main"><strong>${escapeHtml(person.name)}</strong>${aliasChips}</div>`,
    `<span class="person-count">${person.mentions} упом.</span>`,
    `</div>`
  ].join("");
}

function personMergeRow(suggestion) {
  return [
    `<div class="person-merge" data-testid="person-merge-suggestion" data-pair="${escapeHtml(suggestion.pairId)}">`,
    `<span class="person-merge-text">«${escapeHtml(suggestion.alias)}» и «${escapeHtml(suggestion.target)}» — один человек? <em>(уверенность: ${escapeHtml(suggestion.confidence)})</em></span>`,
    `<span class="person-merge-actions">`,
    button("merge-person", "Объединить", { id: suggestion.pairId, kind: "primary", testId: "person-merge-apply" }),
    button("dismiss-person-merge", "Нет", { id: suggestion.pairId, kind: "ghost", testId: "person-merge-dismiss" }),
    `</span>`,
    `</div>`
  ].join("");
}

function renderPeoplePanel(ctx) {
  const people = ctx.resolvedPeople || [];
  const suggestions = ctx.personMergeSuggestions || [];
  return [
    `<section class="info-panel people-panel" data-testid="people-panel">`,
    `<div class="section-title">Люди <span class="people-count" data-testid="people-count">${people.length}</span></div>`,
    suggestions.length
      ? `<div class="person-merges" data-testid="person-merge-list">${suggestions.map(personMergeRow).join("")}</div>`
      : "",
    people.length
      ? `<div class="person-list" data-testid="person-list">${safeList(people, personRow, "")}</div>`
      : `<div class="empty-inline" data-testid="people-empty">Имена появятся здесь, когда встретятся в твоих записях. «Данил» и «Даня» я узнаю как одного человека.</div>`,
    `</section>`
  ].join("");
}

export function renderGraph(ctx) {
  const body = `<div class="graph-workspace-split">${renderGraphCanvas(ctx)}${renderInspectorDrawer(ctx)}</div>${renderPeoplePanel(ctx)}`;
  return renderWorkspaceLayout("graph", "Граф связей", "Большой canvas: локальный и глобальный граф, фильтры, поиск, inspector и причины связей.", body, { testId: "workspace-graph", kicker: "Связи" });
}

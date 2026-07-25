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

// P1-1 (канон design-system/Graph.dc.html): граф отвечает на вопросы о жизни, а не только
// рисует узлы. Донор-алгоритм — PageRank (Neo4j GDS), реализован под нашу проекцию.
function renderGraphAnswers(ctx) {
  const answers = ctx.graphAnswers || [];
  if (!answers.length) {
    return [
      `<section class="graph-answers graph-answers-empty" data-testid="graph-answers">`,
      `<div class="graph-answers-head"><span>Вопросы о жизни</span></div>`,
      `<p class="empty-inline" data-testid="graph-answers-empty">Пока мало данных для выводов. Появятся, когда накопятся связи, цели и задачи.</p>`,
      `</section>`
    ].join("");
  }
  return [
    `<section class="graph-answers" data-testid="graph-answers">`,
    `<div class="graph-answers-head"><span>Вопросы о жизни</span><em>посчитано по твоим связям</em></div>`,
    answers.map((answer) => [
      `<article class="graph-answer" data-testid="graph-answer" data-answer="${escapeHtml(answer.id)}">`,
      `<h3>${escapeHtml(answer.question)}</h3>`,
      `<strong data-testid="graph-answer-head">${escapeHtml(answer.head)}</strong>`,
      `<p>${escapeHtml(answer.body)}</p>`,
      `<div class="graph-answer-rows">${answer.rows.map((row) => [
        `<div class="graph-answer-row" data-testid="graph-answer-row">`,
        `<span class="gar-label">${escapeHtml(row.label)}</span>`,
        `<span class="gar-bar"><i style="width:${Math.max(4, Math.min(100, Number(row.percent) || 0))}%"></i></span>`,
        `<span class="gar-value">${escapeHtml(String(row.value))}</span>`,
        `</div>`
      ].join("")).join("")}</div>`,
      `<p class="graph-answer-evidence" data-testid="graph-answer-evidence">${escapeHtml(answer.evidence)}</p>`,
      `</article>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

export function renderGraph(ctx) {
  const body = `<div class="graph-workspace-split">${renderGraphCanvas(ctx)}${renderInspectorDrawer(ctx)}</div>${renderGraphAnswers(ctx)}${renderPeoplePanel(ctx)}`;
  return renderWorkspaceLayout("graph", "Граф связей", "Большой canvas: локальный и глобальный граф, фильтры, поиск, inspector и причины связей.", body, { testId: "workspace-graph", kicker: "Связи" });
}

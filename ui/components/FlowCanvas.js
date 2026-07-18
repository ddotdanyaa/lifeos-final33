import { button, escapeHtml, publicText } from "./shared.js";

function flowBudgetRow(flow) {
  return [
    `<div class="flow-budget-row" data-testid="flow-budget-row">`,
    `<strong>${escapeHtml(flow.name)}</strong>`,
    `<span data-testid="flow-budget">${flow.budget.used}/${flow.budget.limit} запусков</span>`,
    button("toggle-flow-kill-switch", flow.killSwitch ? "Включить сценарий" : "Kill switch", { id: flow.id, kind: flow.killSwitch ? "primary" : "danger", testId: "toggle-flow-kill-switch" }),
    `</div>`
  ].join("");
}

export function renderFlowCanvas(ctx) {
  const runs = ctx.flowRuns || [];
  const flows = ctx.flows || [];
  const stages = [
    ["Trigger", "Новое событие"],
    ["Condition", "Условие"],
    ["Action", "Действие"],
    ["Approval", "Подтверждение"],
    ["Audit", "След"]
  ];
  const builderNodes = [
    ["trigger", "Триггер", `<input id="flow-trigger" data-testid="flow-trigger" aria-label="Flow trigger" value="новая задача с датой">`],
    ["condition", "Условие", `<input id="flow-condition" data-testid="flow-condition" aria-label="Flow condition" value="есть время">`],
    ["action", "Действие", `<select id="flow-action" data-testid="flow-action" aria-label="Flow action"><option value="task">предложить задачу</option><option value="plan">предложить блок времени</option><option value="review">предложить разбор</option></select>`]
  ];
  return [
    `<div class="flow-canvas" data-testid="flow-canvas">`,
    stages.map((node, index) => [
      `<div class="flow-node flow-node-${index}">`,
      `<span>${escapeHtml(node[0])}</span>`,
      `<strong>${escapeHtml(node[1])}</strong>`,
      `</div>`,
      index < stages.length - 1 ? `<div class="flow-edge"></div>` : ""
    ].join("")).join(""),
    `</div>`,
    `<div class="flow-builder-board" data-testid="flow-builder-board">`,
    builderNodes.map(([kind, title, control]) => `<div class="flow-builder-node flow-builder-node-${escapeHtml(kind)}" data-testid="flow-builder-node"><strong>${escapeHtml(title)}</strong>${control}</div>`).join(""),
    `</div>`,
    `<div class="flow-builder" data-testid="flow-builder">`,
    button("run-flow-builder", "Проверить сценарий", { kind: "primary", testId: "run-flow-builder" }),
    `</div>`,
    `<div class="flow-budget-list" data-testid="flow-budget-list">${flows.map(flowBudgetRow).join("") || ""}</div>`,
    `<div class="execution-history" data-testid="execution-history">`,
    runs.slice(0, 5).map((run) => [
      `<div data-testid="flow-run-row">`,
      `<strong>${escapeHtml(publicText(run.title || run.kind || "Проверка"))}</strong>`,
      `<span>предложение создано · ${escapeHtml(publicText(run.summary || run.status || "ожидает подтверждения"))}</span>`,
      `<mark data-testid="flow-run-health" data-health="${escapeHtml(run.health || "alive")}">${escapeHtml(run.health || "alive")}</mark>`,
      run.status === "executed"
        ? `<em data-testid="approval-row">выполнено</em>`
        : (run.proposalIds || []).length
          ? button("execute-flow-run", "Выполнить", { id: run.id, kind: "primary", testId: "execute-flow-run" })
          : `<em data-testid="approval-row">ожидает подтверждения</em>`,
      `</div>`
    ].join("")).join("") || `<div><strong>Пока нет запусков</strong><span>Dry-run создаст запись перед любым действием.</span></div>`,
    `</div>`
  ].join("");
}

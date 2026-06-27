import { button, escapeHtml, publicText } from "./shared.js";

export function renderFlowCanvas(ctx) {
  const runs = ctx.flowRuns || [];
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
    `<div class="execution-history" data-testid="execution-history">`,
    runs.slice(0, 5).map((run) => `<div data-testid="flow-run-row"><strong>${escapeHtml(publicText(run.title || run.kind || "Проверка"))}</strong><span>предложение создано · ${escapeHtml(publicText(run.summary || run.status || "ожидает подтверждения"))}</span><em data-testid="approval-row">ожидает подтверждения</em></div>`).join("") || `<div><strong>Пока нет запусков</strong><span>Dry-run создаст запись перед любым действием.</span></div>`,
    `</div>`
  ].join("");
}

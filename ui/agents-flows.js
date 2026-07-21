import { renderFlowCanvas } from "./components/FlowCanvas.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, compactText, escapeHtml, publicText, safeList } from "./components/shared.js";

// Срез 13: Agent Center - делегирование задачи агенту + статус/прогресс/результат/история в
// человеческом UI. Проекции из app.js (delegatableTasks, agentRuns). Всё как предложения -
// применяется по «Одобрить».
function agentRunCard(run) {
  const total = (run.proposalIds || []).length;
  const statusLabel = run.status === "applied" ? "выполнено" : "черновой прогон";
  const progress = run.status === "applied" ? total + "/" + total : "0/" + total;
  const steps = Array.isArray(run.steps) ? run.steps : [];
  return [
    `<div class="agent-run-card" data-testid="agent-run-card" data-status="${escapeHtml(run.status || "")}">`,
    `<div class="agent-run-head"><strong>${escapeHtml(publicText(run.name || "Агент"))}</strong>${run.taskTitle ? `<span class="agent-run-task">${escapeHtml(compactText(run.taskTitle, 60))}</span>` : ""}<span class="agent-run-status" data-testid="agent-run-status">${escapeHtml(statusLabel)}</span></div>`,
    steps.length ? `<ol class="agent-steps" data-testid="agent-steps">${steps.map((step) => `<li class="step-${escapeHtml(step.status || "")}">${escapeHtml(step.label || "")}</li>`).join("")}</ol>` : "",
    `<div class="agent-run-foot"><span class="agent-run-progress" data-testid="agent-run-progress">Прогресс: ${escapeHtml(progress)}</span>${run.status === "preview" && total ? button("approve-agent-run", "Одобрить", { id: run.id, kind: "primary", testId: "approve-agent-run" }) : `<span class="agent-run-result" data-testid="agent-run-result">${escapeHtml(compactText(run.summary || "", 120))}</span>`}</div>`,
    `</div>`
  ].join("");
}

function renderAgentCenter(ctx) {
  const tasks = ctx.delegatableTasks || [];
  const runs = ctx.agentRuns || [];
  return [
    `<section class="agent-center" data-testid="agent-center">`,
    `<h3>Центр агентов</h3>`,
    `<div class="agent-delegate" data-testid="agent-delegate">`,
    `<span class="agent-delegate-label">Поручить задачу агенту</span>`,
    tasks.length
      ? tasks.map((task) => `<div class="delegate-row" data-testid="delegatable-task"><span>${escapeHtml(compactText(task.title, 64))}</span>${button("delegate-task-to-agent", "Поручить", { id: task.id, kind: "ghost", testId: "delegate-task" })}</div>`).join("")
      : `<div class="empty-inline" data-testid="no-delegatable-tasks">Открытых задач нет — запиши задачу, и её можно будет поручить агенту.</div>`,
    `</div>`,
    `<div class="agent-runs" data-testid="agent-runs">${safeList(runs.slice(0, 6), agentRunCard, `<div class="empty-inline">Пока агент ничего не делал.</div>`)}</div>`,
    `</section>`
  ].join("");
}

export function renderAgentsFlows(ctx) {
  const agentRuns = ctx.agentRuns || [];
  const flowRuns = ctx.flowRuns || [];
  const runs = agentRuns.length ? agentRuns : flowRuns;
  const body = [
    `<div class="agents-flow-layout" data-testid="agent-panel">`,
    `<section class="agent-command">`,
    `<h3>Агент-проверка</h3>`,
    `<p>Агент читает активный артефакт, показывает риск и создаёт только предложения.</p>`,
    `<div class="agent-risk-card" data-testid="agent-risk-card"><strong>Граница безопасности</strong><span>Никаких тихих действий: только черновой прогон, затем явное Принять.</span></div>`,
    `${button("run-agent-active", "Проверить агента", { kind: "primary", testId: "agent-panel-run" })}`,
    `</section>`,
    renderAgentCenter(ctx),
    `<section class="flow-stage">`,
    `<h3>Сценарий</h3>`,
    renderFlowCanvas(ctx),
    `</section>`,
    `<aside class="agent-history"><h3>История</h3>${safeList(runs.slice(0, 6), (run) => [
      `<div class="run-row" data-testid="agent-run">`,
      `<strong>${escapeHtml(publicText(run.name || run.title || run.kind || "черновой прогон"))}</strong>`,
      `<span>${run.status === "applied" ? "применено" : "черновой прогон · Требуется Принять"}</span>`,
      `<em>${escapeHtml(compactText(run.summary || run.status || "", 120))}</em>`,
      run.health ? `<mark data-testid="agent-run-health" data-health="${escapeHtml(run.health)}">${escapeHtml(run.health)}</mark>` : "",
      run.status === "preview" && (run.proposalIds || []).length
        ? button("approve-agent-run", "Одобрить", { id: run.id, kind: "primary", testId: "approve-agent-run" })
        : "",
      `</div>`
    ].join(""), `<div class="empty-inline">Запусти агента или сценарий.</div>`)}</aside>`,
    `<section class="approval-queue" data-testid="approval-queue"><h3>Очередь подтверждения</h3><p>Все результаты остаются предложениями до явного действия владельца.</p></section>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("agents", "Агенты и сценарии", "Trigger → Condition → Action → Approval → Audit. Никаких тихих действий.", body, { testId: "workspace-agents", kicker: "Автоматизация" });
}

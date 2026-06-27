import { renderFlowCanvas } from "./components/FlowCanvas.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, compactText, escapeHtml, publicText, safeList } from "./components/shared.js";

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
    `<section class="flow-stage">`,
    `<h3>Сценарий</h3>`,
    renderFlowCanvas(ctx),
    `</section>`,
    `<aside class="agent-history"><h3>История</h3>${safeList(runs.slice(0, 6), (run) => `<div class="run-row" data-testid="agent-run"><strong>${escapeHtml(publicText(run.title || run.kind || "черновой прогон"))}</strong><span>черновой прогон · Требуется Принять</span><em>${escapeHtml(compactText(run.summary || run.status || "", 120))}</em></div>`, `<div class="empty-inline">Запусти агента или сценарий.</div>`)}</aside>`,
    `<section class="approval-queue" data-testid="approval-queue"><h3>Очередь подтверждения</h3><p>Все результаты остаются предложениями до явного действия владельца.</p></section>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("agents", "Агенты и сценарии", "Trigger → Condition → Action → Approval → Audit. Никаких тихих действий.", body, { testId: "workspace-agents", kicker: "Автоматизация" });
}

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

// Агенты (канон design-system/Agents.dc.html): у каждого виден триггер, шаги, права и журнал
// чеков, а работает он строго циклом план → подтверждение → исполнение → отчёт → квитанция.
// Данные из app.js (computeAgentsView); в списке только агенты, за которыми стоит настоящий код.
function agentCard(agent) {
  return [
    `<article class="agent-card" data-testid="agent-card" data-agent="${escapeHtml(agent.id)}">`,
    `<header class="agent-card-head"><h4>${escapeHtml(agent.name)}</h4><span class="agent-card-when" data-testid="agent-when">${escapeHtml(agent.schedule ? agent.schedule.label : agent.when)}</span></header>`,
    // Расписание задаётся здесь же. §7: наступившее время НЕ запускает агента — оно ставит
    // предложение, а запуск остаётся кнопкой владельца.
    `<div class="agent-schedule" data-testid="agent-schedule">`,
    agent.schedule && agent.schedule.due
      ? `<p class="agent-schedule-due" data-testid="agent-schedule-due">${escapeHtml(agent.schedule.label)}</p>`
      : "",
    `<label class="agent-schedule-field"><span>По расписанию в</span><input type="time" data-testid="agent-schedule-time" data-agent-time="${escapeHtml(agent.id)}" value="${escapeHtml(agent.schedule ? agent.schedule.time : "")}"></label>`,
    button("set-agent-schedule", "Сохранить время", { id: agent.id, kind: "ghost", testId: "agent-schedule-save" }),
    agent.schedule ? button("clear-agent-schedule", "Снять расписание", { id: agent.id, kind: "ghost", testId: "agent-schedule-clear" }) : "",
    `</div>`,
    `<ol class="agent-card-steps" data-testid="agent-steps-list">${agent.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`,
    // Права показываются обеими сторонами: что агент может И чего он не может (§7).
    `<ul class="agent-card-rights" data-testid="agent-rights">`,
    agent.rights.map((right) => `<li class="${right.allowed ? "can" : "cannot"}" data-testid="agent-right"><span aria-hidden="true">${right.allowed ? "+" : "−"}</span>${escapeHtml(right.label)}</li>`).join(""),
    `</ul>`,
    // Донор LangGraph: прогон идёт по шагам и останавливается перед необратимым — владелец
    // видит, где агент сейчас, и может прервать его до изменения данных (закон №9).
    agent.run ? [
      `<div class="agent-run-live" data-testid="agent-run-live" data-status="${escapeHtml(agent.run.status)}">`,
      `<strong>Идёт по шагам · ${agent.run.cursor}/${agent.run.total}</strong>`,
      `<ol class="agent-run-steps">`,
      agent.run.steps.map((step) => [
        `<li class="agent-run-step state-${escapeHtml(step.state)}" data-testid="agent-run-step" data-state="${escapeHtml(step.state)}">`,
        `<span>${escapeHtml(step.label)}${step.irreversible ? ` <em class="agent-step-irreversible" data-testid="agent-step-irreversible">необратимый</em>` : ""}</span>`,
        step.detail ? `<em>${escapeHtml(step.detail)}</em>` : "",
        `</li>`
      ].join("")).join(""),
      `</ol>`,
      agent.run.status === "paused" ? [
        `<p class="agent-run-question" data-testid="agent-run-question">${escapeHtml(agent.run.question)}</p>`,
        `<div class="agent-plan-actions">`,
        button("resume-agent-run", "Подтвердить шаг", { id: agent.id, kind: "primary", testId: "resume-agent-run" }),
        button("cancel-agent-run", "Остановить агента", { kind: "ghost", testId: "cancel-agent-run" }),
        `</div>`
      ].join("") : agent.run.status === "done" ? "" : [
        `<div class="agent-plan-actions">`,
        button("advance-agent-run", "Следующий шаг", { id: agent.id, kind: "primary", testId: "advance-agent-run" }),
        button("cancel-agent-run", "Остановить", { kind: "ghost", testId: "cancel-agent-run" }),
        `</div>`
      ].join(""),
      `</div>`
    ].join("") : "",
    agent.plan ? [
      `<div class="agent-plan" data-testid="agent-plan">`,
      `<strong>План</strong>`,
      `<p data-testid="agent-plan-summary">${escapeHtml(agent.plan.summary)}</p>`,
      `<div class="agent-plan-actions">`,
      agent.plan.canRun
        ? button("confirm-agent-plan", "Подтвердить и запустить", { id: agent.id, kind: "primary", testId: "confirm-agent-plan" })
        : `<span class="agent-plan-blocked" data-testid="agent-plan-blocked">Запускать нечего — подтверждать нечего.</span>`,
      button("cancel-agent-plan", "Отменить", { kind: "ghost", testId: "cancel-agent-plan" }),
      `</div>`,
      `</div>`
    ].join("") : button("plan-agent", "Показать план", { id: agent.id, kind: "ghost", testId: "plan-agent" }),
    agent.report ? [
      `<div class="agent-report" data-testid="agent-report">`,
      `<strong>Отчёт · ${escapeHtml(agent.report.at)}</strong>`,
      `<p data-testid="agent-report-summary">${escapeHtml(agent.report.summary)}</p>`,
      agent.report.findings.length
        ? `<ul class="agent-report-findings">${agent.report.findings.map((row) => `<li data-testid="agent-report-finding">${escapeHtml(row)}</li>`).join("")}</ul>`
        : "",
      `</div>`
    ].join("") : "",
    `<div class="agent-journal" data-testid="agent-journal">`,
    `<span class="agent-journal-title">Журнал чеков</span>`,
    agent.journal.length
      ? agent.journal.map((row) => `<div class="agent-journal-row" data-testid="agent-journal-row"><time>${escapeHtml(row.at)}</time><span>${escapeHtml(row.summary)}</span></div>`).join("")
      : `<div class="empty-inline" data-testid="agent-journal-empty">Агент ещё ни разу не запускался.</div>`,
    `</div>`,
    `</article>`
  ].join("");
}

function renderNamedAgents(ctx) {
  const agents = (ctx.agentsView || {}).agents || [];
  if (!agents.length) return "";
  return [
    `<section class="named-agents" data-testid="named-agents">`,
    `<p class="canon-eyebrow">Агенты <em>${agents.length}</em></p>`,
    `<p class="named-agents-note">Каждый агент показывает план до запуска и пишет квитанцию после. Необратимого без подтверждения не делает ни один.</p>`,
    agents.map(agentCard).join(""),
    `</section>`
  ].join("");
}

export function renderAgentsFlows(ctx) {
  const agentRuns = ctx.agentRuns || [];
  const flowRuns = ctx.flowRuns || [];
  const runs = agentRuns.length ? agentRuns : flowRuns;
  const body = [
    renderNamedAgents(ctx),
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

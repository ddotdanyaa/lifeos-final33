import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, dataSection, emptyState, escapeHtml, money, safeList } from "./components/shared.js";

function progress(goal) {
  const current = Number(goal.currentAmount || goal.progress || 0);
  const target = Number(goal.targetAmount || 0);
  if (!target) return goal.status === "done" ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

// U2 MONEY_FAST "темп": a plain, honest fact vs. linear-schedule comparison (not a
// prediction) - if the goal has both a target amount and a target date, compare actual
// progress today against what a straight line from creation to the deadline would expect.
function goalPace(goal, todayKey) {
  const target = Number(goal.targetAmount || 0);
  if (!target || !goal.targetDate) return null;
  const created = new Date(goal.createdAt || goal.targetDate);
  const due = new Date(goal.targetDate);
  const today = new Date(todayKey || goal.createdAt);
  if (Number.isNaN(created.getTime()) || Number.isNaN(due.getTime())) return null;
  const totalDays = Math.max(1, Math.round((due - created) / 86400000));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.round((today - created) / 86400000)));
  const expected = Math.min(target, (target * elapsedDays) / totalDays);
  const actual = Number(goal.currentAmount || goal.progress || 0);
  // Подсказка по цели (донор-идея actual forecast / SP goal pace, честная арифметика, не ML):
  // сколько дней осталось и сколько нужно откладывать в день, чтобы успеть точно в срок.
  const daysLeft = Math.max(0, Math.round((due - today) / 86400000));
  const remaining = Math.max(0, target - actual);
  const neededPerDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
  let hint;
  if (remaining <= 0) hint = "Цель достигнута — можно закрыть.";
  else if (daysLeft <= 0) hint = `Срок вышел, не хватает ${Math.round(remaining).toLocaleString("ru-RU")} ₽.`;
  else hint = `Осталось ${daysLeft} ${pluralDays(daysLeft)} — нужно ~${neededPerDay.toLocaleString("ru-RU")} ₽/день, чтобы успеть.`;
  return { onTrack: actual >= expected, diff: Math.round(actual - expected), daysLeft, neededPerDay, remaining: Math.round(remaining), hint };
}

function pluralDays(n) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "день";
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return "дня";
  return "дней";
}

export function renderHabitsGoals(ctx) {
  const domains = ctx.lifeDomains || [];
  const weak = domains.slice().sort((a, b) => Number(a.score || 0) - Number(b.score || 0))[0] || domains[0] || {};
  const domainArtifacts = [
    ["Дом", "быт, семья, порядок"],
    ["Здоровье", "сон, спорт, еда"],
    ["Деньги", "расходы, резерв, бюджет"],
    ["Работа", "проекты, фокус, календарь"],
    ["Знания", "книги, идеи, заметки"],
    ["Отношения", "люди, сообщения, забота"],
    ["Путешествия", "планы, билеты, сборы"],
    ["Восстановление", "ритм, слабый день, отдых"]
  ];
  const body = [
    `<div class="habit-goal-dashboard habits-wheel" data-testid="habits-goals-panel">`,
    `<section class="habit-checkin">${dataSection("Чек-ин", ctx.habits, (habit) => `<button class="habit-card" data-action="toggle-habit" data-id="${escapeHtml(habit.id)}" data-testid="habit-row"><span data-testid="habit-toggle">${habit.checkedToday ? "✓" : "○"}</span><strong>${escapeHtml(habit.title || "Привычка")}</strong><em>${escapeHtml(habit.frequency || "ежедневно")}</em></button>`)}${ctx.habits.length ? "" : emptyState("Привычек пока нет", "Напиши: каждый день вода 2л.")}<div class="habit-form-grid"><input id="habit-title" data-testid="habit-title" placeholder="Новая привычка"><select id="habit-frequency" data-testid="habit-frequency"><option value="daily">каждый день</option><option value="weekly">еженедельно</option></select>${button("add-habit-entry", "Добавить", { kind: "primary", testId: "add-habit-entry" })}</div></section>`,
    `<section class="goal-progress">${dataSection("Цели", ctx.goals, (goal) => `<article class="goal-card" data-testid="goal-row"><div><strong>${escapeHtml(goal.title || "Цель")}</strong><span>${goal.targetAmount ? money(goal.targetAmount) : goal.targetDate || "без лимита"}</span></div><progress value="${progress(goal)}" max="100" data-testid="goal-progress-bar"></progress>${(() => { const pace = goalPace(goal, ctx.todayKey); return pace ? `<div class="goal-pace ${pace.onTrack ? "on-track" : "behind"}" data-testid="goal-pace" data-raw-pace="${pace.onTrack ? "ahead" : "behind"}">${pace.onTrack ? "Успеваю" : "Отстаю"} по графику (${pace.diff >= 0 ? "+" : ""}${money(pace.diff)})</div><div class="goal-hint" data-testid="goal-hint">${escapeHtml(pace.hint)}</div>` : ""; })()}<div class="goal-actions"><input id="goal-progress-${escapeHtml(goal.id)}" aria-label="Goal progress" type="number" min="0" step="0.01" placeholder="Прогресс">${button("add-goal-progress", "+Прогресс", { id: goal.id, kind: "ghost", testId: "add-goal-progress" })}${button("goal-next-task", "Следующий шаг", { id: goal.id, kind: "ghost", testId: "goal-next-task" })}${button("toggle-goal", goal.status === "done" ? "Вернуть" : "Закрыть", { id: goal.id, kind: "ghost" })}</div></article>`)}${ctx.goals.length ? "" : emptyState("Целей пока нет", "Напиши: до 1 июля накопить 30000.")}<div class="goal-form-grid"><input id="goal-title-entry" data-testid="goal-title-entry" placeholder="Новая цель"><input id="goal-target-amount" data-testid="goal-target-amount" type="number" placeholder="Сумма"><input id="goal-target-date" data-testid="goal-target-date" type="date">${button("add-goal-entry", "Добавить", { kind: "primary", testId: "add-goal-entry" })}</div></section>`,
    `<section class="balance-wheel" data-testid="balance-wheel"><h3>Колесо баланса</h3><div class="wheel-radar">${domains.slice(0, 6).map((domain, index) => `<span style="--i:${index};--score:${Number(domain.score || 50)}"><b>${escapeHtml(domain.title || "Домен")}</b></span>`).join("")}</div><p>${escapeHtml(domains[0]?.nextAction || "Домены жизни усиливаются через задачи, деньги, привычки и знания.")}</p>${button("refresh-insights", "Обновить инсайты", { kind: "ghost", testId: "refresh-insights" })}<div class="domain-list">${domains.slice(0, 6).map((domain) => `<div class="domain-row" data-testid="domain-row" style="--domain-color:${escapeHtml(domain.color || "#7c3aed")}"><span>${escapeHtml(domain.title || "Домен")}</span><div><i style="width:${Number(domain.score || 0)}%"></i></div><strong>${Number(domain.score || 0)}%</strong><em>${escapeHtml(domain.reason || domain.nextAction || "Нужен следующий шаг.")}</em></div>`).join("")}</div></section>`,
    `<section class="domain-artifact-board" data-testid="domain-artifact-board"><div class="weak-domain-card" data-testid="weak-domain-card"><strong>Слабый домен: ${escapeHtml(weak.title || "домен")}</strong><span>${escapeHtml(weak.reason || weak.nextAction || "мало сигналов, нужен следующий маленький шаг")}</span></div><div class="domain-artifact-grid">${domainArtifacts.map(([title, text]) => `<article class="domain-artifact-card" data-testid="domain-artifact-card"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></article>`).join("")}</div></section>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("habits", "Привычки и цели", "Регулярное поведение, прогресс и жизненные домены без давления.", body, { testId: "workspace-habits", kicker: "Ритм" });
}

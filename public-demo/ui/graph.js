import { renderGraphCanvas } from "./components/GraphCanvas.js";
import { renderInspectorDrawer } from "./components/InspectorDrawer.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, escapeHtml, safeList } from "./components/shared.js";
import { filterPeople } from "../core/people-filter.mjs";

// Срез 10: разрешение сущностей-людей. Канонические люди (алиасы слиты) + предложения слить
// неоднозначные пары (owner-gated). Проекции приходят из app.js (resolvePeople,
// personMergeSuggestions). Живёт в Графе, т.к. люди - это узлы связей.
// Человек кликабелен: у него теперь своя карточка объекта (упоминания, источники, связи,
// хронология) — раньше клик по человеку вёл в Граф, то есть в никуда.
function personRow(person) {
  const aliasChips = person.aliases.length
    ? `<span class="person-aliases">${person.aliases.map((alias) => `<span class="person-alias-chip">${escapeHtml(alias)}</span>`).join("")}</span>`
    : "";
  return [
    `<button class="person-row" data-action="open-object" data-id="${escapeHtml(person.objectId || "")}" data-testid="person-row" data-person="${escapeHtml(person.name)}">`,
    `<div class="person-main"><strong>${escapeHtml(person.name)}</strong>${aliasChips}</div>`,
    `<span class="person-count">${person.mentions} упом.</span>`,
    `</button>`
  ].join("");
}

function personMergeRow(suggestion) {
  return [
    `<div class="person-merge" data-testid="person-merge-suggestion" data-pair="${escapeHtml(suggestion.pairId)}">`,
    // Закон №5: предложение называет, на чём оно держится — совпавшее начало имени и величину
    // расхождения, а не одну лишь метку уверенности.
    `<span class="person-merge-text">«${escapeHtml(suggestion.alias)}» и «${escapeHtml(suggestion.target)}» — один человек? <em data-testid="person-merge-why">${escapeHtml(suggestion.why || "")} · уверенность: ${escapeHtml(suggestion.confidence)}</em></span>`,
    `<span class="person-merge-actions">`,
    button("merge-person", "Объединить", { id: suggestion.pairId, kind: "primary", testId: "person-merge-apply" }),
    button("dismiss-person-merge", "Нет", { id: suggestion.pairId, kind: "ghost", testId: "person-merge-dismiss" }),
    `</span>`,
    `</div>`
  ].join("");
}

function renderPeoplePanel(ctx) {
  // Боль владельца 2026-07-30: «Люди пять… он искусственное за людей теперь считает». В список
  // приходили наши же технические слова — Whisper, PWA, install prompt, — потому что служебные
  // записи лежат в одном хранилище с мыслями. Счётчик, которому нельзя верить, хуже отсутствующего.
  //
  // Убранное не прячется молча: под списком стоит честная строка «убрано N не-людей». Скрытое
  // без объяснения — то же враньё, что и показанное лишнее.
  const { kept: people, dropped } = filterPeople(ctx.resolvedPeople || []);
  const keptNames = new Set(people.map((person) => person.name));
  // Предложение слить двух «людей» бессмысленно, если один из них — подсистема.
  const suggestions = (ctx.personMergeSuggestions || []).filter((row) => {
    const names = [row.leftName, row.rightName, row.name].filter(Boolean);
    return !names.length || names.every((name) => keptNames.has(name));
  });
  return [
    `<section class="info-panel people-panel" data-testid="people-panel">`,
    `<div class="section-title">Люди <span class="people-count" data-testid="people-count">${people.length}</span></div>`,
    suggestions.length
      ? `<div class="person-merges" data-testid="person-merge-list">${suggestions.map(personMergeRow).join("")}</div>`
      : "",
    people.length
      ? `<div class="person-list" data-testid="person-list">${safeList(people, personRow, "")}</div>`
      : `<div class="empty-inline" data-testid="people-empty">Имена появятся здесь, когда встретятся в твоих записях. «Данил» и «Даня» я узнаю как одного человека.</div>`,
    dropped.length
      ? `<div class="empty-inline" data-testid="people-dropped" title="${escapeHtml(dropped.map((row) => row.name + " — " + row.why).join(" · "))}">Убрано ${dropped.length}: это подсистемы, а не люди</div>`
      : "",
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

// P0-5 (донор Graphify cluster.py, MIT — алгоритм перенесён нативно): темы графа с ИМЕНАМИ.
// Имя темы — самый связанный объект внутри неё, а не «Сообщество 7». Без кластеров граф после
// вечернего дампа превращается в клубок, в котором ничего не читается.
function renderTopicClusters(ctx) {
  const focusedHub = ctx.graphGrowth && ctx.graphGrowth.topic ? ctx.graphGrowth.topic.hubId : "";
  const clusters = ctx.topicClusters || [];
  if (!clusters.length) return "";
  return [
    `<section class="topic-clusters" data-testid="topic-clusters">`,
    `<div class="graph-answers-head"><span>Темы</span><em>посчитано по связям, имя — самый связанный объект темы</em></div>`,
    clusters.map((cluster) => [
      `<article class="topic-cluster${focusedHub === cluster.hubId ? " focused" : ""}" data-testid="topic-cluster" data-cluster="${escapeHtml(cluster.id)}">`,
      `<header><strong>${escapeHtml(cluster.name)}</strong><span data-testid="topic-cluster-size">${cluster.size} ${cluster.size === 1 ? "объект" : "объектов"} · плотность ${cluster.cohesion}%</span>`,
      // Выбор темы — это фильтр взгляда, а не изменение данных: повторное нажатие снимает его.
      button("focus-topic", ctx.graphGrowth && ctx.graphGrowth.topic && ctx.graphGrowth.topic.hubId === cluster.hubId ? "Смотрю рост" : "Рост темы", {
        id: cluster.hubId,
        kind: "ghost",
        testId: "focus-topic"
      }),
      `</header>`,
      `<div class="topic-cluster-members">${cluster.members.map((member) => `<span class="topic-member-wrap"><button class="topic-member" data-action="open-object" data-id="${escapeHtml(member.id)}" data-testid="topic-member">${escapeHtml(member.label)}</button>${button("pick-path-node", "Путь", { id: member.id, kind: "ghost", testId: "pick-path-node" })}</span>`).join("")}</div>`,
      `</article>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

// Рост графа во времени. Владелец просил видеть не срез, а движение: заходишь каждый день и
// видишь, что база стала больше. Столбик — РАЗМЕР графа на тот день, число над ним — сколько
// прибавилось именно в этот день; пустой день так и остаётся пустым, без сглаживания.
function renderGraphGrowth(ctx) {
  const growth = ctx.graphGrowth || { hasGrowth: false, days: [] };
  // Блок остаётся на месте, пока тема выбрана: иначе вместе с ним пропадает выход из темы.
  if (!growth.hasGrowth && !growth.topic) return "";
  return [
    `<section class="graph-growth" data-testid="graph-growth">`,
    `<div class="graph-answers-head"><span>Как рос граф${growth.topic ? " · тема «" + escapeHtml(growth.topic.name) + "»" : ""}</span><em>${escapeHtml(growth.why)}</em></div>`,
    growth.topic ? `<div class="graph-growth-focus" data-testid="graph-growth-focus">${button("clear-topic-focus", "Показать весь граф", { kind: "ghost", testId: "clear-topic-focus" })}</div>` : "",
    growth.hasGrowth
      ? `<p class="graph-growth-head" data-testid="graph-growth-head">Сейчас ${escapeHtml(growth.totalLabel || "")} · за ${escapeHtml(growth.daysLabel || "")} прибавилось ${growth.gained}.</p>`
      : `<p class="graph-growth-head" data-testid="graph-growth-head">Сейчас ${escapeHtml(growth.totalLabel || "")}. ${escapeHtml(growth.emptyReason || "")}</p>`,
    growth.hasGrowth ? `<div class="graph-growth-bars">` : "",
    // День кликабелен: «вырос на 22» ничего не значит, пока не видно, ЧТО именно добавилось.
    (growth.hasGrowth ? growth.days : []).map((row) => [
      `<button class="graph-growth-day${growth.openDay && growth.openDay.day === row.day ? " open" : ""}" data-action="open-growth-day" data-id="${escapeHtml(row.day)}" data-testid="graph-growth-day" title="${escapeHtml(row.label)}: ${row.total} всего, +${row.added} за день">`,
      `<em>${row.added ? "+" + row.added : ""}</em>`,
      `<i style="height:${Math.max(4, row.percent)}%"></i>`,
      `<span>${escapeHtml(row.label)}</span>`,
      `</button>`
    ].join("")).join(""),
    growth.hasGrowth ? `</div>` : "",
    growth.openDay ? [
      `<div class="graph-growth-detail" data-testid="graph-growth-detail">`,
      `<p class="canon-eyebrow">${escapeHtml(growth.openDay.label)} · что добавилось</p>`,
      growth.openDay.empty
        ? `<p class="empty-inline" data-testid="graph-growth-detail-empty">В этот день не добавилось ничего.</p>`
        : `<div class="graph-growth-detail-list">${growth.openDay.items.map((item) => [
            `<button class="graph-growth-item" data-action="open-object" data-id="${escapeHtml(item.id)}" data-testid="graph-growth-item">`,
            item.kindLabel ? `<span>${escapeHtml(item.kindLabel)}</span>` : "",
            `<strong>${escapeHtml(item.label)}</strong>`,
            `</button>`
          ].join("")).join("")}</div>`,
      growth.openDay.more ? `<p class="graph-growth-more" data-testid="graph-growth-more">И ещё ${growth.openDay.more}.</p>` : "",
      `</div>`
    ].join("") : "",
    `</section>`
  ].join("");
}

// Текстовый отчёт графа (донор-паттерн Graphify GRAPH_REPORT.md): граф отдаёт абзац о состоянии
// системы, а не только картинку. Собран из уже посчитанного, ничего не пишет.
function renderGraphReport(ctx) {
  const report = ctx.graphReport || { hasReport: false, lines: [] };
  if (!report.hasReport) return "";
  return [
    `<section class="graph-report" data-testid="graph-report">`,
    `<p class="canon-eyebrow">Отчёт графа</p>`,
    `<h3 data-testid="graph-report-headline">${escapeHtml(report.headline)}</h3>`,
    `<ul class="graph-report-lines">${report.lines.map((line) => `<li data-testid="graph-report-line" data-line="${escapeHtml(line.key)}">${escapeHtml(line.text)}</li>`).join("")}</ul>`,
    `</section>`
  ].join("");
}

// «Что рассыплется без этого узла» (Neo4j GDS betweenness + прямая проверка связности):
// не метрика ради метрики, а ответ на вопрос владельца.
function renderBridges(ctx) {
  const bridges = ctx.bridgeNodes || [];
  if (!bridges.length) return "";
  return [
    `<section class="graph-bridges" data-testid="graph-bridges">`,
    `<div class="graph-answers-head"><span>Мосты</span><em>через них проходит связность</em></div>`,
    bridges.map((bridge) => [
      `<button class="graph-bridge" data-action="open-object" data-id="${escapeHtml(bridge.id)}" data-testid="graph-bridge">`,
      `<strong>${escapeHtml(bridge.label)}</strong>`,
      `<em data-testid="graph-bridge-why">${escapeHtml(bridge.why)}</em>`,
      `<span>${bridge.degree} ${bridge.degree === 1 ? "связь" : "связей"}</span>`,
      `</button>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

// Неожиданные связи (донор Graphify surprising_connections): не «что связано», а «почему это
// заметно» — каждый признак балла превращён в человеческую строку.
function renderSurprisingLinks(ctx) {
  const links = ctx.surprisingLinks || [];
  if (!links.length) return "";
  return [
    `<section class="graph-surprises" data-testid="graph-surprises">`,
    `<div class="graph-answers-head"><span>Неожиданное</span><em>связи, которые сам бы не искал</em></div>`,
    links.map((link) => [
      `<button class="graph-surprise" data-action="open-object" data-id="${escapeHtml(link.id)}" data-testid="graph-surprise">`,
      `<strong>${escapeHtml(link.from)} ↔ ${escapeHtml(link.to)}</strong>`,
      `<em data-testid="graph-surprise-why">${escapeHtml(link.reasons.join(" · "))}</em>`,
      `<span>${escapeHtml(link.why)}</span>`,
      `</button>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

// P2-2 (формула Adamic-Adar из Neo4j GDS): связи, которых ЕЩЁ НЕТ, но которые напрашиваются.
// Это предложение: пока владелец не подтвердил, ребра не создаётся (§7).
function renderLinkPredictions(ctx) {
  const rows = ctx.linkPredictions || [];
  if (!rows.length) return "";
  return [
    `<section class="link-predictions" data-testid="link-predictions">`,
    `<div class="graph-answers-head"><span>Возможно, связано</span><em>связи ещё нет — система предлагает, решаешь ты</em></div>`,
    rows.map((row) => [
      `<article class="link-prediction" data-testid="link-prediction" data-prediction="${escapeHtml(row.id)}">`,
      `<strong>${escapeHtml(row.a)} ↔ ${escapeHtml(row.b)}</strong>`,
      `<em data-testid="link-prediction-why">${escapeHtml(row.why)} Уверенность ${row.confidence}%.</em>`,
      `<div class="link-prediction-actions">`,
      button("answer-link-prediction", "Связать", { id: row.id + "::link", kind: "primary", testId: "link-prediction-apply" }),
      button("answer-link-prediction", "Не связано", { id: row.id + "::no", kind: "ghost", testId: "link-prediction-dismiss" }),
      `</div>`,
      `</article>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

// «Как связаны A и B» — кратчайший путь как ОТВЕТ: цепочка с объяснением каждого звена.
function renderGraphPath(ctx) {
  const path = ctx.graphPath;
  const query = ctx.graphPathQuery || { from: "", to: "" };
  const picking = Boolean(query.from && !query.to);
  return [
    `<section class="graph-path" data-testid="graph-path">`,
    `<div class="graph-answers-head"><span>Как связаны</span><em>${picking ? "выбери второй объект" : "выбери два объекта в темах или мостах"}</em></div>`,
    path && path.found ? [
      `<p class="graph-path-summary" data-testid="graph-path-summary">Цепочка из ${path.length} ${path.length === 1 ? "шага" : "шагов"}:</p>`,
      `<ol class="graph-path-steps">${path.steps.map((step) => `<li data-testid="graph-path-step"><strong>${escapeHtml(step.from)} → ${escapeHtml(step.to)}</strong><em>${escapeHtml(step.why)}</em></li>`).join("")}</ol>`,
      button("clear-path-query", "Сбросить", { kind: "ghost", testId: "clear-path-query" })
    ].join("") : path && !path.found ? [
      `<p class="empty-inline" data-testid="graph-path-none">Между этими объектами пути нет: они живут в разных частях системы и пока ничем не связаны.</p>`,
      button("clear-path-query", "Сбросить", { kind: "ghost", testId: "clear-path-query" })
    ].join("") : `<p class="empty-inline" data-testid="graph-path-hint">Нажми «Путь» у двух объектов ниже — покажу цепочку связей между ними и объясню каждое звено.</p>`,
    `</section>`
  ].join("");
}

// P0-4 (донор Mem0): важное не тонет под свежим шумом. Вес = свежесть + частота + связность,
// забывание — вес, а не удаление, поэтому старое с сильными связями остаётся видимым.
function renderMemoryImportance(ctx) {
  const rows = ctx.memoryImportance || [];
  const forgotten = ctx.forgottenImportant || [];
  if (!rows.length) return "";
  return [
    `<section class="memory-importance" data-testid="memory-importance">`,
    `<div class="graph-answers-head"><span>Важное в памяти</span><em>свежесть + частота + связность</em></div>`,
    rows.map((row) => [
      `<div class="memory-weight-row" data-testid="memory-weight-row">`,
      `<button class="memory-weight-title" data-action="open-object" data-id="${escapeHtml(row.id)}" data-testid="memory-weight-open">${escapeHtml(row.title)}</button>`,
      `<span class="memory-weight-bar"><i style="width:${Math.max(3, Math.min(100, row.score))}%"></i></span>`,
      `<span class="memory-weight-score" data-testid="memory-weight-score">${row.score}</span>`,
      `<em class="memory-weight-why" data-testid="memory-weight-why">${escapeHtml(row.why)}</em>`,
      `<span class="memory-path-pick">${button("pick-path-node", "Путь", { id: row.id, kind: "ghost", testId: "pick-path-node" })}</span>`,
      `</div>`
    ].join("")).join(""),
    forgotten.length
      ? `<p class="memory-forgotten" data-testid="memory-forgotten">Забыто, но важно: ${forgotten.map((row) => escapeHtml(row.title)).join(" · ")}. Старое приглушается весом, но не исчезает.</p>`
      : "",
    `</section>`
  ].join("");
}

export function renderGraph(ctx) {
  const body = [
    renderGraphReport(ctx),
    renderGraphGrowth(ctx),
    `<div class="graph-workspace-split">${renderGraphCanvas(ctx)}${renderInspectorDrawer(ctx)}</div>`,
    renderGraphAnswers(ctx),
    renderTopicClusters(ctx),
    renderBridges(ctx),
    renderGraphPath(ctx),
    renderSurprisingLinks(ctx),
    renderLinkPredictions(ctx),
    renderMemoryImportance(ctx),
    renderPeoplePanel(ctx)
  ].join("");
  // §3 канона: внутренние термины не могут быть подписями. Здесь стояло «Большой canvas:
  // локальный и глобальный граф, фильтры, поиск, inspector и причины связей» — это опись
  // устройства движка, а не ответ на вопрос «что здесь происходит». Экран отвечает тем, ради
  // чего владелец на него заходит: что с чем связано и почему.
  return renderWorkspaceLayout("graph", "Связи", "Что с чем связано в твоих записях и почему: темы, люди, мосты между ними и то, как всё это росло.", body, { testId: "workspace-graph", kicker: "Связи" });
}

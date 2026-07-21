import { button, escapeHtml, highlightMatch, safeList } from "./shared.js";
import { fuzzyMatch } from "../vendor/affine-fuzzy-match.js";

// G2.5/G2.6: слайдеры сил раскладки (отталкивание/длина связи/гравитация центра, донор-идея
// Obsidian graph settings) + глубина локального графа 1/2/3 хопа (Obsidian local graph
// depth). Управляемое состояние (ctx.graphSettingsOpen), НЕ нативный <details> - тот же
// фикс, что уже применён к чат-тулбару «Ещё»: нативный <details> схлопывается на каждом
// ре-рендере, а клик по слайдеру/кнопке глубины как раз вызывает ре-рендер.
function renderGraphSettingsRow(ctx, mode) {
  const forces = ctx.graphForces || { repulsion: 8600, linkDistance: 158, gravity: 0.004 };
  const depth = ctx.graphLocalDepth || 1;
  const open = Boolean(ctx.graphSettingsOpen);
  const body = open ? `<div class="graph-settings-body">${[
    `<label class="graph-force-slider"><span>Отталкивание</span><input type="range" id="graph-force-repulsion" data-testid="graph-force-repulsion" min="2000" max="18000" step="200" value="${escapeHtml(String(forces.repulsion))}" aria-label="Сила отталкивания узлов"></label>`,
    `<label class="graph-force-slider"><span>Длина связи</span><input type="range" id="graph-force-link-distance" data-testid="graph-force-link-distance" min="40" max="320" step="10" value="${escapeHtml(String(forces.linkDistance))}" aria-label="Желаемая длина связи"></label>`,
    `<label class="graph-force-slider"><span>Гравитация центра</span><input type="range" id="graph-force-gravity" data-testid="graph-force-gravity" min="0" max="0.02" step="0.001" value="${escapeHtml(String(forces.gravity))}" aria-label="Гравитация к центру"></label>`,
    mode === "local"
      ? `<div class="graph-depth-row" data-testid="graph-depth-row"><span>Глубина</span><div class="segmented-control">${[1, 2, 3].map((n) => `<button class="${depth === n ? "active" : ""}" data-action="set-graph-depth" data-id="${n}" data-testid="graph-depth-${n}">${n}</button>`).join("")}</div></div>`
      : "",
    // G2.12: «граф на дату» - показать только узлы, появившиеся не позже выбранного дня
    // (донор-идея Timeline-интеграция/слайдер).
    `<label class="graph-date-filter-field"><span>Граф на дату</span><input type="date" id="graph-date-filter" data-testid="graph-date-filter" value="${escapeHtml(ctx.graphDateFilter || "")}" aria-label="Показать граф на дату"></label>`,
    ctx.graphDateFilter ? button("clear-graph-date-filter", "Сбросить", { kind: "ghost", testId: "clear-graph-date-filter" }) : ""
  ].join("")}</div>` : "";
  return `<div class="graph-settings" data-testid="graph-settings"><button type="button" class="graph-settings-toggle" data-action="toggle-graph-settings" data-testid="graph-settings-toggle" aria-expanded="${open ? "true" : "false"}">Настройки раскладки</button>${body}</div>`;
}

export function renderGraphCanvas(ctx) {
  const graph = ctx.graph || { nodes: [], links: [] };
  const filters = ctx.graphFilters || {};
  const selected = ctx.selectedGraph || {};
  const mode = ctx.graphMode === "local" ? "local" : "global";
  const query = String(ctx.graphSearch || "").trim().toLowerCase();
  // S1.1: точное вхождение приоритетно, затем fuzzy (донорский AFFiNE fuzzy-match).
  const results = query
    ? graph.nodes
      .filter((node) => [node.title, node.label, node.type, node.id].some((value) => String(value || "").toLowerCase().includes(query) || fuzzyMatch(String(value || ""), query)))
      .slice(0, 8)
    : [];
  const filterRows = [
    ["notes", "Заметки"],
    ["sources", "Источники"],
    ["tasks", "Задачи"],
    ["money", "Деньги"],
    ["habits", "Привычки"],
    ["goals", "Цели"],
    ["knowledge", "Знания"],
    ["channels", "Каналы"],
    ["systems", "Системы"],
    ["models", "Модели"],
    ["home", "Дом"],
    ["productBrain", "Разработка"]
  ];
  return [
    `<div class="graph-workbench-v2 graph-canvas-workspace" data-testid="graph-workbench">`,
    `<div class="graph-toolbar-v2">`,
    `<div class="graph-toolbar-head">`,
    `<input id="graph-search" data-testid="graph-search" placeholder="Найти узел или связь" value="${escapeHtml(ctx.graphSearch || "")}" aria-label="Поиск по графу">`,
    `<div class="segmented-control" data-testid="graph-mode"><button class="${mode === "global" ? "active" : ""}" data-action="set-graph-mode" data-id="global" data-testid="graph-mode-global">Все</button><button class="${mode === "local" ? "active" : ""}" data-action="set-graph-mode" data-id="local" data-testid="graph-mode-local">Локально</button></div>`,
    `</div>`,
    `<div class="graph-filter-row">${filterRows.map(([key, label]) => `<label><input type="checkbox" data-testid="graph-filter-${escapeHtml(key)}" data-graph-filter="${escapeHtml(key)}"${filters[key] ? " checked" : ""}>${escapeHtml(label)}</label>`).join("")}</div>`,
    renderGraphSettingsRow(ctx, mode),
    // S1.2: подсветка совпавших букв (донор-идея AFFiNE quicksearch highlight).
    query ? `<div class="graph-results" data-testid="graph-results">${safeList(results, (node) => `<button class="graph-result-row" data-testid="graph-result-row" data-action="focus-graph-node" data-id="${escapeHtml(node.id)}"><strong>${highlightMatch(node.title || node.label || node.id, query)}</strong><span>${escapeHtml(node.type || "узел")}</span></button>`, `<p class="empty-inline">Совпадений нет.</p>`)}</div>` : "",
    `</div>`,
    `<div class="graph-canvas-shell">`,
    `<canvas id="graph-canvas" class="graph-canvas" data-testid="graph-canvas"></canvas>`,
    // G1: панель зума поверх canvas (паттерн xyflow Controls / tldraw camera, MIT - см.
    // docs/OSS_DONOR_AUDIT.md). «Вписать» = zoom-to-fit по границам всех узлов.
    `<div class="graph-controls" data-testid="graph-controls">`,
    `<button data-action="graph-zoom-in" data-testid="graph-zoom-in" aria-label="Приблизить" title="Приблизить">+</button>`,
    `<button data-action="graph-zoom-out" data-testid="graph-zoom-out" aria-label="Отдалить" title="Отдалить">−</button>`,
    `<button data-action="graph-zoom-fit" data-testid="graph-zoom-fit" aria-label="Вписать граф" title="Вписать граф">⛶</button>`,
    `<button data-action="graph-reheat" data-testid="graph-reheat" aria-label="Оживить раскладку" title="Оживить раскладку">↻</button>`,
    `</div>`,
    `<aside class="graph-inspector" data-testid="graph-inspector">`,
    `<span data-testid="graph-counts">${graph.nodes.length} узлов · ${graph.links.length} связей</span>`,
    selected.title ? `<strong>${escapeHtml(selected.title)}</strong><em>${escapeHtml(selected.meta || "")}</em>` : `<strong>Выбери узел</strong><em>Клик по узлу покажет причины связей и рабочее место.</em>`,
    `<div class="graph-connection-summary" data-testid="graph-connection-summary">${selected.title ? "Локальные связи выбранного узла" : "Выбери узел, чтобы увидеть связи"}</div>`,
    `<div class="graph-edge-list" data-testid="graph-edge-list">${safeList((selected.edgeReasons || []).slice(0, 8), (reason) => `<button class="graph-edge-row" data-testid="graph-edge-row">Причина: ${escapeHtml(reason)}</button>`, `<button class="graph-edge-row" data-testid="graph-edge-row">Причина: связь объясняется источником, задачей, заметкой или действием.</button>`)}</div>`,
    selected.edgeReasons?.length ? `<div class="edge-reasons">${safeList(selected.edgeReasons.slice(0, 5), (reason) => `<p data-testid="edge-reason">${escapeHtml(reason)}</p>`, "")}</div>` : `<p data-testid="edge-reason">Связь объясняется источником, задачей, заметкой или действием.</p>`,
    selected.workspace ? button("set-surface", "Открыть рабочее место", { id: selected.workspace, kind: "primary" }) : "",
    `</aside>`,
    `</div>`,
    `</div>`
  ].join("");
}

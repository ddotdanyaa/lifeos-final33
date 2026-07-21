import { button, escapeHtml, safeList } from "./shared.js";

export function renderGraphCanvas(ctx) {
  const graph = ctx.graph || { nodes: [], links: [] };
  const filters = ctx.graphFilters || {};
  const selected = ctx.selectedGraph || {};
  const mode = ctx.graphMode === "local" ? "local" : "global";
  const query = String(ctx.graphSearch || "").trim().toLowerCase();
  const results = query
    ? graph.nodes
      .filter((node) => [node.title, node.label, node.type, node.id].some((value) => String(value || "").toLowerCase().includes(query)))
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
    query ? `<div class="graph-results" data-testid="graph-results">${safeList(results, (node) => `<button class="graph-result-row" data-testid="graph-result-row" data-action="focus-graph-node" data-id="${escapeHtml(node.id)}"><strong>${escapeHtml(node.title || node.label || node.id)}</strong><span>${escapeHtml(node.type || "узел")}</span></button>`, `<p class="empty-inline">Совпадений нет.</p>`)}</div>` : "",
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

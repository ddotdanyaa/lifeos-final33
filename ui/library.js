import { renderBookWorkbenchPanel } from "./components/ReaderSurface.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, collapsiblePanel, compactText, dataSection, emptyState, escapeHtml, safeList, sectionStack, surfaceNotice } from "./components/shared.js";

function wikiLinks(text) {
  const links = [];
  String(text || "").replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const clean = String(title || "").trim();
    if (clean && !links.includes(clean)) links.push(clean);
    return "";
  });
  return links;
}

function renderClaimEntry(claim) {
  return `<div class="knowledge-card" data-testid="claim-row"><strong>${escapeHtml(compactText(claim.title || claim.text, 80))}</strong>${button("claim-to-task", "В задачу", { id: claim.id, kind: "ghost", testId: "claim-to-task" })}</div>`;
}

function renderQuestionEntry(question) {
  return `<div class="knowledge-card" data-testid="question-row"><strong>${escapeHtml(compactText(question.title || question.text, 80))}</strong></div>`;
}

function renderReviewEntry(reviewItem) {
  const done = reviewItem.status === "done";
  return `<div class="knowledge-card${done ? " done" : ""}" data-testid="review-row"><strong>${escapeHtml(compactText(reviewItem.title, 80))}</strong><span>${escapeHtml(reviewItem.day || "")}</span>${button("toggle-review-item", done ? "Вернуть" : "Готово", { id: reviewItem.id, kind: "ghost", testId: "toggle-review-item" })}</div>`;
}

function semanticSearchSection(ctx) {
  const report = ctx.semanticSearchReport || null;
  const index = ctx.semanticIndex || {};
  const rows = report && report.status === "embeddings_ok"
    ? safeList(
        report.results,
        (result) => `<button class="knowledge-note-row" data-action="open-note" data-id="${escapeHtml(result.noteId)}" data-testid="semantic-result-row"><strong>${escapeHtml(result.title)}</strong><span data-testid="semantic-result-score">${Math.round(result.score * 100)}%</span></button>`,
        `<div class="empty-inline" data-testid="semantic-search-empty">По смыслу ничего не найдено.</div>`
      )
    : "";
  // Свёрнут по умолчанию, но подпись честно говорит СОСТОЯНИЕ: без эмбеддингов поиск недоступен,
  // и узнать это можно не раскрывая блок.
  const body = [
    `<label>Запрос<input id="semantic-search-input" data-testid="semantic-search-input" autocomplete="off" aria-label="Семантический поиск" placeholder="Найти заметки по смыслу"></label>`,
    button("run-semantic-search", "Найти по смыслу", { kind: "ghost", testId: "run-semantic-search" }),
    `<div><span>Индекс: ${index.vectorCount || 0} заметок${index.model ? " (" + escapeHtml(index.model) + ")" : ""}</span></div>`,
    report && report.status !== "embeddings_ok"
      ? `<div class="empty-inline" data-testid="semantic-search-unavailable">Семантический поиск недоступен: ${escapeHtml(report.reason || "провайдер эмбеддингов не подключён")}</div>`
      : "",
    report && report.status === "embeddings_ok" ? `<div data-testid="semantic-search-results">${rows}</div>` : "",
  ].join("");
  return collapsiblePanel({
    id: "library-semantic",
    title: "Семантический поиск",
    hint: report && report.status === "embeddings_ok" ? "" : "нужны локальные эмбеддинги",
    count: index.vectorCount || 0,
    open: Boolean((ctx.panelOpen || {})["library-semantic"]),
    body,
    testId: "semantic-search-panel",
    className: "semantic-search-panel"
  });
}

// Срез 8: панель «Память» - 4 слоя как вычисляемая проекция (app.js memoryLayers). Не новое
// хранилище: те же заметки, разложенные по возрасту+связности. Каждый слой - счётчик, подсказка
// и топ-заметки (кликабельны в редактор). Пустой слой честно показывает 0, а не прячется.
// Срез 8.2: полнотекстовый поиск по памяти на minisearch (prefix + опечатки, ранжирование).
// Локальный, всегда доступен (в отличие от семантического, который gated за эмбеддинги).
function memorySearchResults(ctx) {
  const report = ctx.memorySearchReport;
  if (!report || !report.query) return "";
  if (report.status === "error") {
    return `<div class="empty-inline" data-testid="memory-search-error">Поиск не удался: ${escapeHtml(report.reason || "ошибка")}.</div>`;
  }
  if (!report.results.length) {
    return `<div class="empty-inline" data-testid="memory-search-empty">По «${escapeHtml(report.query)}» ничего не найдено.</div>`;
  }
  return `<div class="memory-search-results" data-testid="memory-search-results">${safeList(report.results, (result) => `<button class="knowledge-note-row" data-action="open-note" data-id="${escapeHtml(result.noteId)}" data-testid="memory-search-row"><strong>${escapeHtml(compactText(result.title, 60))}</strong><span>${escapeHtml(result.layer || "")}</span></button>`, "")}</div>`;
}

function renderMemorySection(ctx) {
  const layers = ctx.memoryLayers || [];
  const total = layers.reduce((sum, layer) => sum + layer.count, 0);
  return [
    `<section class="info-panel memory-panel" data-testid="memory-panel">`,
    `<div class="section-title">Память <span class="memory-total" data-testid="memory-total">${total}</span></div>`,
    `<div class="memory-search">`,
    `<input id="memory-search-input" data-testid="memory-search-input" autocomplete="off" aria-label="Поиск по памяти" placeholder="Найти по памяти (полнотекст)…">`,
    button("run-memory-search", "Найти", { kind: "ghost", testId: "run-memory-search" }),
    `</div>`,
    memorySearchResults(ctx),
    `<div class="memory-layers">`,
    layers.map((layer) => [
      `<div class="memory-layer" data-testid="memory-layer" data-layer="${escapeHtml(layer.key)}">`,
      `<div class="memory-layer-head"><strong>${escapeHtml(layer.label)}</strong><span class="memory-layer-count" data-testid="memory-layer-count-${escapeHtml(layer.key)}">${layer.count}</span></div>`,
      `<p class="memory-layer-hint">${escapeHtml(layer.hint)}</p>`,
      layer.notes.length
        ? `<div class="memory-layer-notes">${safeList(layer.notes.slice(0, 5), (note) => `<button class="knowledge-note-row" data-action="open-note" data-id="${escapeHtml(note.id)}" data-testid="memory-note-row"><strong>${escapeHtml(compactText(note.title, 60))}</strong><span>${note.degree} св · ${note.ageDays} дн</span></button>`, "")}</div>`
        : `<div class="empty-inline" data-testid="memory-layer-empty">Пусто</div>`,
      `</div>`
    ].join("")).join(""),
    `</div>`,
    `</section>`
  ].join("");
}

// R3 BACKLINKS_PANEL: Foam-style incoming-links panel. state.backlinks (noteId -> [linking
// note ids]) is already computed on every commit; this just resolves and renders it.
function renderBacklinksPanel(ctx, noteId) {
  const backlinkIds = (ctx.backlinks && ctx.backlinks[noteId]) || [];
  const notesById = new Map((ctx.notes || []).map((note) => [note.id, note]));
  const backlinkNotes = backlinkIds.map((id) => notesById.get(id)).filter(Boolean);
  // Счётчик в заголовке отвечает на главный вопрос («ссылается кто-нибудь или нет») без
  // раскрытия — ради этого блок и можно держать свёрнутым.
  return collapsiblePanel({
    id: "library-backlinks",
    title: "Обратные ссылки",
    count: backlinkNotes.length,
    open: Boolean((ctx.panelOpen || {})["library-backlinks"]),
    body: safeList(
      backlinkNotes,
      (note) => `<button class="knowledge-note-row" data-action="open-note" data-id="${escapeHtml(note.id)}" data-testid="backlink-row"><strong>${escapeHtml(note.title || "Заметка")}</strong></button>`,
      `<div class="empty-inline" data-testid="backlinks-empty">Пока никто не ссылается на эту заметку.</div>`
    ),
    testId: "library-backlinks-panel",
    className: "library-backlinks-panel"
  });
}

// Q1 СРЕЗЫ (доноры Dataview + Tana live-searches). Канон: «данные ≠ представление, один
// артефакт → много рендеров». Владелец выбирает источник, одно условие и вид — и получает
// живое представление над теми же артефактами, а не копию данных.
// Языка запросов и произвольного JS тут нет намеренно: всё выбирается из закрытых списков,
// поэтому сломать срез опечаткой невозможно, а прочитать его может человек, а не парсер.
function lensSelect(part, options, current, testId, label) {
  const rows = options.map((option) => `<option value="${escapeHtml(option.id)}"${option.id === current ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
  return `<label class="lens-field"><span>${escapeHtml(label)}</span><select data-lens="${escapeHtml(part)}" data-testid="${escapeHtml(testId)}" aria-label="${escapeHtml(label)}">${rows}</select></label>`;
}

function lensValueControl(view) {
  const field = (view.fields || []).find((row) => row.id === view.where.field);
  if (!field || !view.where.op) return "";
  // «Заполнено» не требует значения — поле ввода тут было бы приглашением заполнить пустоту.
  if (view.where.op === "filled") return "";
  if (field.type === "select") {
    const options = (field.values || []).map((value, index) => ({ id: value, label: (field.labels || [])[index] || value || "любое" }));
    // Пункт «любое» обязателен и идёт первым: без него браузер показывает выбранным первое
    // значение списка, а фильтруется при этом ничего — экран обещал бы «только доход» и
    // показывал бы расходы тоже (нашлось пробой).
    if (!options.some((option) => option.id === "")) options.unshift({ id: "", label: "любое" });
    return lensSelect("value", options, view.where.value, "lens-value-select", "Значение");
  }
  const type = field.type === "date" ? "date" : field.type === "number" ? "number" : "text";
  return `<label class="lens-field"><span>Значение</span><input type="${type}" data-lens="value" data-testid="lens-value" value="${escapeHtml(view.where.value)}" autocomplete="off" aria-label="Значение условия"></label>`;
}

function lensRows(view) {
  if (!view.rows.length) {
    return `<div class="empty-inline" data-testid="lens-empty">Под это условие не попал ни один артефакт. Это не ошибка — просто таких записей пока нет.</div>`;
  }
  if (view.render === "table") {
    return [
      `<div class="lens-table-scroll">`,
      `<table class="lens-table" data-testid="lens-table">`,
      `<thead><tr>${view.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}<th></th></tr></thead>`,
      `<tbody>`,
      view.rows.map((row) => [
        `<tr data-testid="lens-row">`,
        row.cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join(""),
        `<td>${button("open-object", "Объект", { id: row.id, kind: "ghost", testId: "lens-open-object" })}</td>`,
        `</tr>`
      ].join("")).join(""),
      `</tbody></table></div>`
    ].join("");
  }
  return `<div class="lens-list">${view.rows.map((row) => [
    `<button class="knowledge-note-row lens-row" data-action="open-object" data-id="${escapeHtml(row.id)}" data-testid="lens-row">`,
    `<strong>${escapeHtml(row.label)}</strong>`,
    `<span>${escapeHtml(row.cells.filter(Boolean).slice(1, 3).join(" · "))}</span>`,
    `</button>`
  ].join("")).join("")}</div>`;
}

function renderLensPanel(ctx) {
  const view = ctx.lensView;
  if (!view) return "";
  const saved = ctx.savedLenses || [];
  const fieldOptions = [{ id: "", label: "без условия" }].concat((view.fields || []).map((field) => ({ id: field.id, label: field.label })));
  const body = [
    `<p class="lens-intro">Один и тот же артефакт можно смотреть по-разному. Срез — это условие, а не копия: записи остаются на своих местах.</p>`,
    `<div class="lens-builder" data-testid="lens-builder">`,
    lensSelect("from", view.sources, view.from, "lens-source", "Откуда"),
    lensSelect("field", fieldOptions, view.where.field, "lens-field", "Поле"),
    view.where.field ? lensSelect("op", view.ops, view.where.op, "lens-op", "Условие") : "",
    lensValueControl(view),
    view.where.field ? button("clear-lens-condition", "Снять условие", { kind: "ghost", testId: "clear-lens-condition" }) : "",
    `</div>`,
    `<div class="lens-actions">`,
    `<div class="lens-render-switch" role="group" aria-label="Вид среза">`,
    button("set-lens-render", "Список", { id: "list", kind: view.render === "list" ? "primary" : "ghost", testId: "lens-render-list" }),
    button("set-lens-render", "Таблица", { id: "table", kind: view.render === "table" ? "primary" : "ghost", testId: "lens-render-table" }),
    `</div>`,
    button("save-lens", "Сохранить срез", { kind: "ghost", testId: "save-lens" }),
    `</div>`,
    `<p class="lens-why" data-testid="lens-why">${escapeHtml(view.why)}</p>`,
    lensRows(view),
    saved.length ? [
      `<div class="lens-saved" data-testid="lens-saved">`,
      `<div class="section-title">Сохранённые срезы</div>`,
      saved.map((lens) => [
        `<div class="lens-saved-row" data-testid="lens-saved-row">`,
        `<button class="lens-saved-open" data-action="open-lens" data-id="${escapeHtml(lens.id)}" data-testid="open-lens"><strong>${escapeHtml(lens.title)}</strong><span>${lens.resultCount}</span></button>`,
        button("delete-lens", "Удалить", { id: lens.id, kind: "ghost", testId: "delete-lens" }),
        `</div>`
      ].join("")).join(""),
      `</div>`
    ].join("") : ""
  ].join("");
  // Срез — рабочий инструмент экрана, поэтому открыт по умолчанию; но свернуть его владелец
  // тоже вправе, и выбор запоминается.
  return collapsiblePanel({
    id: "library-lens",
    title: "Срезы",
    count: view.shown,
    open: Boolean((ctx.panelOpen || {})["library-lens"]),
    body,
    testId: "lens-panel",
    className: "lens-panel"
  });
}

function renderControlTrail(ctx, noteId) {
  const forNote = (list) => (list || []).filter((item) => item.noteId === noteId);
  const rows = [
    ["Выводы", forNote(ctx.claims).length],
    ["Вопросы", forNote(ctx.questions).length],
    ["Повторение", forNote(ctx.reviewItems).length],
    ["Источники", (ctx.sources || []).filter((item) => item.noteId === noteId).length]
  ];
  return collapsiblePanel({
    id: "library-control",
    title: "Контроль базы",
    count: rows.reduce((sum, row) => sum + row[1], 0),
    open: Boolean((ctx.panelOpen || {})["library-control"]),
    body: [
      `<div class="control-trail-counts">${rows.map(([label, value]) => `<span class="control-trail-row"><em>${escapeHtml(label)}</em><strong>${value}</strong></span>`).join("")}</div>`,
      `<div class="control-trail-actions">${button("set-surface", "Открыть контроль", { id: "control", kind: "ghost" })}</div>`
    ].join(""),
    testId: "library-control-trail",
    className: "library-control-trail"
  });
}

export function renderLibrary(ctx) {
  const notes = (ctx.notes || []).filter((note) => note.systemType !== "product_brain").slice(0, 20);
  const active = ctx.activeNote && ctx.activeNote.systemType !== "product_brain" ? ctx.activeNote : notes[0];
  const claims = (ctx.claims || []).filter((item) => !active || item.noteId === active.id);
  const questions = (ctx.questions || []).filter((item) => !active || item.noteId === active.id);
  const reviewItems = (ctx.reviewItems || []).filter((item) => !active || item.noteId === active.id);
  const links = wikiLinks(active?.body || "");

  const noteHeader = active ? [
    `<div class="note-header">`,
    `<div><label for="note-title">Название</label><input id="note-title" data-testid="note-title" value="${escapeHtml(active.title || "")}" autocomplete="off"></div>`,
    // Объект (канон): заметка — это не только текст. «Открыть объект» показывает её вердикт,
    // источники, связи, хронологию и противоречия.
    button("open-object", "Открыть объект", { id: active.id, kind: "ghost", testId: "library-open-object" }),
    button("delete-note", "Удалить", { id: active.id, kind: "danger", testId: "delete-note" }),
    `</div>`
  ].join("") : "";

  const knowledgeForms = active ? [
    `<div class="knowledge-forms">`,
    `<label>Вывод<input id="claim-title" data-testid="claim-title" autocomplete="off" aria-label="Вывод"></label>`,
    button("add-claim-entry", "Добавить", { id: active.id, testId: "add-claim-entry" }),
    `<label>Вопрос<input id="question-title" data-testid="question-title" autocomplete="off" aria-label="Вопрос"></label>`,
    button("add-question-entry", "Добавить", { id: active.id, testId: "add-question-entry" }),
    `</div>`
  ].join("") : "";

  const body = [
    `<div class="knowledge-layout library-layout" data-testid="knowledge-workbench">`,
    `<aside class="knowledge-sidebar"><input id="library-search" placeholder="Поиск по базе" aria-label="Поиск по базе">${dataSection("Заметки", notes, (note) => `<button class="knowledge-note-row" data-action="open-note" data-id="${escapeHtml(note.id)}" data-testid="note-row"><strong>${escapeHtml(note.title || "Заметка")}</strong><span>${wikiLinks(note.body || "").length} связей</span></button>`)}${notes.length ? "" : emptyState("База пустая", "Сохрани идею или импортируй текст.")}${button("new-note", "Новая заметка", { kind: "primary", testId: "new-note" })}</aside>`,
    `<article class="markdown-editor-surface">`,
    noteHeader,
    active ? `<header><span>Markdown</span><h3>${escapeHtml(active?.title || "Заметка")}</h3></header><textarea id="note-body" data-testid="note-body">${escapeHtml(active.body || "")}</textarea><div class="wikilink-preview" data-testid="wikilink-preview"><strong>Связи</strong>${safeList(links, (link) => `<button data-action="focus-graph-node" data-id="${escapeHtml(link)}">${escapeHtml(link)}</button>`, `<span>Wikilinks появятся как [[Название]].</span>`)}</div>` : `<div class="empty-inline">Выбери заметку.</div>`,
    knowledgeForms,
    `</article>`,
    // П2: три подписи с обещаниями («инсайты появятся», «вопросы станут задачами») исчезают.
    // Есть выводы — есть раздел «Выводы». Нет ничего — одна честная строка, из чего это
    // берётся, а не три строки о том, чего нет.
    `<aside class="knowledge-cards" data-testid="knowledge-cards">${sectionStack([
      dataSection("Выводы", claims.slice(0, 8), renderClaimEntry, { testId: "knowledge-claims-head" }),
      dataSection("Вопросы", questions.slice(0, 6), renderQuestionEntry, { testId: "knowledge-questions-head" }),
      dataSection("Повторение", reviewItems.slice(0, 6), renderReviewEntry, { testId: "knowledge-review-head" })
    ], emptyState("Смысл ещё не извлечён", "Выводы, вопросы и повторение появятся из твоих заметок, аудио и чтения."))}</aside>`,
    `</div>`,
    renderLensPanel(ctx),
    // Чтение на экране Базы — вторично: у него есть собственное рабочее место «Чтение».
    // В заголовке стоит счётчик материалов, поэтому свёрнутый блок не скрывает факта.
    collapsiblePanel({
      id: "library-book",
      title: "Чтение",
      count: (ctx.bookSources || []).length,
      hint: (ctx.bookSources || []).length ? "" : "материалов пока нет",
      open: Boolean((ctx.panelOpen || {})["library-book"]),
      body: renderBookWorkbenchPanel(ctx),
      testId: "library-book-panel"
    }),
    // Ответ экрана на нажатие: без него «Добавить вопрос» при пустом поле молчит, и правильная
    // работа неотличима от поломки (перепись живого, 2026-07-31).
    surfaceNotice(ctx, "library", "library-notice"),
    renderMemorySection(ctx),
    semanticSearchSection(ctx),
    active ? renderBacklinksPanel(ctx, active.id) : "",
    active ? renderControlTrail(ctx, active.id) : ""
  ].join("");
  return renderWorkspaceLayout("library", "База знаний", "Заметки, wikilinks, backlinks, источники и карточки знания.", body, { testId: "workspace-library", kicker: "Знания" });
}

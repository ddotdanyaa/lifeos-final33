import { renderBookWorkbenchPanel } from "./components/ReaderSurface.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, compactText, emptyState, escapeHtml, safeList } from "./components/shared.js";

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
  return [
    `<section class="info-panel semantic-search-panel" data-testid="semantic-search-panel">`,
    `<div class="section-title">Семантический поиск</div>`,
    `<label>Запрос<input id="semantic-search-input" data-testid="semantic-search-input" autocomplete="off" aria-label="Семантический поиск" placeholder="Найти заметки по смыслу"></label>`,
    button("run-semantic-search", "Найти по смыслу", { kind: "ghost", testId: "run-semantic-search" }),
    `<div><span>Индекс: ${index.vectorCount || 0} заметок${index.model ? " (" + escapeHtml(index.model) + ")" : ""}</span></div>`,
    report && report.status !== "embeddings_ok"
      ? `<div class="empty-inline" data-testid="semantic-search-unavailable">Семантический поиск недоступен: ${escapeHtml(report.reason || "провайдер эмбеддингов не подключён")}</div>`
      : "",
    report && report.status === "embeddings_ok" ? `<div data-testid="semantic-search-results">${rows}</div>` : "",
    `</section>`
  ].join("");
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
  return [
    `<section class="info-panel library-backlinks-panel" data-testid="library-backlinks-panel">`,
    `<div class="section-title">Обратные ссылки</div>`,
    safeList(
      backlinkNotes,
      (note) => `<button class="knowledge-note-row" data-action="open-note" data-id="${escapeHtml(note.id)}" data-testid="backlink-row"><strong>${escapeHtml(note.title || "Заметка")}</strong></button>`,
      `<div class="empty-inline" data-testid="backlinks-empty">Пока никто не ссылается на эту заметку.</div>`
    ),
    `</section>`
  ].join("");
}

function renderControlTrail(ctx, noteId) {
  const forNote = (list) => (list || []).filter((item) => item.noteId === noteId);
  const rows = [
    ["Выводы", forNote(ctx.claims).length],
    ["Вопросы", forNote(ctx.questions).length],
    ["Повторение", forNote(ctx.reviewItems).length],
    ["Источники", (ctx.sources || []).filter((item) => item.noteId === noteId).length]
  ];
  return [
    `<section class="info-panel library-control-trail" data-testid="library-control-trail">`,
    `<div class="section-title">Контроль базы</div>`,
    `<div class="control-trail-counts">${rows.map(([label, value]) => `<span class="control-trail-row"><em>${escapeHtml(label)}</em><strong>${value}</strong></span>`).join("")}</div>`,
    `<div class="control-trail-actions">${button("set-surface", "Открыть контроль", { id: "control", kind: "ghost" })}</div>`,
    `</section>`
  ].join("");
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
    `<aside class="knowledge-sidebar"><input id="library-search" placeholder="Поиск по базе" aria-label="Поиск по базе"><h3>Заметки</h3>${safeList(notes, (note) => `<button class="knowledge-note-row" data-action="open-note" data-id="${escapeHtml(note.id)}" data-testid="note-row"><strong>${escapeHtml(note.title || "Заметка")}</strong><span>${wikiLinks(note.body || "").length} связей</span></button>`, emptyState("База пустая", "Сохрани идею или импортируй текст."))}${button("new-note", "Новая заметка", { kind: "primary", testId: "new-note" })}</aside>`,
    `<article class="markdown-editor-surface">`,
    noteHeader,
    active ? `<header><span>Markdown</span><h3>${escapeHtml(active?.title || "Заметка")}</h3></header><textarea id="note-body" data-testid="note-body">${escapeHtml(active.body || "")}</textarea><div class="wikilink-preview" data-testid="wikilink-preview"><strong>Связи</strong>${safeList(links, (link) => `<button data-action="focus-graph-node" data-id="${escapeHtml(link)}">${escapeHtml(link)}</button>`, `<span>Wikilinks появятся как [[Название]].</span>`)}</div>` : `<div class="empty-inline">Выбери заметку.</div>`,
    knowledgeForms,
    `</article>`,
    `<aside class="knowledge-cards"><h3>Выводы</h3>${safeList(claims.slice(0, 8), renderClaimEntry, `<div class="empty-inline">Инсайты появятся из чтения, аудио и заметок.</div>`)}<h3>Вопросы</h3>${safeList(questions.slice(0, 6), renderQuestionEntry, `<div class="empty-inline">Вопросы станут задачами без потери источника.</div>`)}<h3>Повторение</h3>${safeList(reviewItems.slice(0, 6), renderReviewEntry, `<div class="empty-inline">Карточка повторения появится после извлечения смысла.</div>`)}</aside>`,
    `</div>`,
    renderBookWorkbenchPanel(ctx),
    renderMemorySection(ctx),
    semanticSearchSection(ctx),
    active ? renderBacklinksPanel(ctx, active.id) : "",
    active ? renderControlTrail(ctx, active.id) : ""
  ].join("");
  return renderWorkspaceLayout("library", "База знаний", "Заметки, wikilinks, backlinks, источники и карточки знания.", body, { testId: "workspace-library", kicker: "Знания" });
}

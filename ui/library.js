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

export function renderLibrary(ctx) {
  const notes = (ctx.notes || []).filter((note) => note.systemType !== "product_brain").slice(0, 20);
  const active = ctx.activeNote && ctx.activeNote.systemType !== "product_brain" ? ctx.activeNote : notes[0];
  const claims = ctx.claims || [];
  const links = wikiLinks(active?.body || "");
  const body = [
    `<div class="knowledge-layout library-layout" data-testid="knowledge-workbench">`,
    `<aside class="knowledge-sidebar"><input id="library-search" placeholder="Поиск по базе" aria-label="Поиск по базе"><h3>Заметки</h3>${safeList(notes, (note) => `<button class="knowledge-note-row" data-action="open-note" data-id="${escapeHtml(note.id)}" data-testid="note-row"><strong>${escapeHtml(note.title || "Заметка")}</strong><span>${wikiLinks(note.body || "").length} связей</span></button>`, emptyState("База пустая", "Сохрани идею или импортируй текст."))}${button("new-note", "Новая заметка", { kind: "primary", testId: "new-note" })}</aside>`,
    `<article class="markdown-editor-surface"><header><span>Markdown</span><h3>${escapeHtml(active?.title || "Заметка")}</h3></header>${active ? `<textarea id="note-body" data-testid="note-body">${escapeHtml(active.body || "")}</textarea><div class="wikilink-preview" data-testid="wikilink-preview"><strong>Связи</strong>${safeList(links, (link) => `<button data-action="focus-graph-node" data-id="${escapeHtml(link)}">${escapeHtml(link)}</button>`, `<span>Wikilinks появятся как [[Название]].</span>`)}</div>` : `<div class="empty-inline">Выбери заметку.</div>`}</article>`,
    `<aside class="knowledge-cards"><h3>Карточки знания</h3>${safeList(claims.slice(0, 8), (claim) => `<div class="knowledge-card" data-testid="claim-row"><strong>${escapeHtml(compactText(claim.title || claim.text, 80))}</strong>${button("claim-to-task", "В задачу", { id: claim.id, kind: "ghost", testId: "claim-to-task" })}</div>`, `<div class="empty-inline">Инсайты появятся из чтения, аудио и заметок.</div>`)}</aside>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("library", "База знаний", "Заметки, wikilinks, backlinks, источники и карточки знания.", body, { testId: "workspace-library", kicker: "Знания" });
}

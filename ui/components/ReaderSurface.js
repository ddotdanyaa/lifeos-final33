import { button, compactText, escapeHtml, safeList } from "./shared.js";

function readingFor(ctx, sourceId) {
  return (ctx.readingItems || []).find((item) => item.sourceId === sourceId) || null;
}

function sourceStatus(source) {
  if (source.parserStatus === "text-ready" || source.status === "text-ready" || source.text) return "текст готов";
  if (/\.(pdf|epub)$/i.test(source.name || "")) return source.parserError ? "ошибка парсера: " + source.parserError : "Формат ждёт парсер";
  return "сохранено";
}

function isGatedBook(source) {
  return /\.(pdf|epub)$/i.test(source.name || "") && !source.text && Boolean(source.dataUrl);
}

function bookKind(source) {
  if (/\.pdf$/i.test(source.name || "")) return "pdf";
  if (/\.epub$/i.test(source.name || "")) return "epub";
  return "";
}

// U5 READER: page number for PDF, chapter index for EPUB - both are the same "unitIndex
// into a per-unit text array" concept, driven by readingItem.unitTotal set at extraction time.
export function renderBookWorkbenchPanel(ctx) {
  const books = ctx.bookSources || [];
  const active = books[0] || null;
  const activeReading = active ? readingFor(ctx, active.id) : null;
  const kind = active ? bookKind(active) : "";
  const units = kind === "pdf" ? active.pageTexts : kind === "epub" ? active.chapterTexts : null;
  const hasUnits = Boolean(active && activeReading && Array.isArray(units) && units.length && activeReading.unitTotal);
  const unitIndex = hasUnits ? Math.min(Math.max(0, activeReading.unitIndex || 0), units.length - 1) : 0;
  const unitLabel = kind === "pdf" ? "Страница" : "Глава";
  const body = hasUnits ? units[unitIndex] || "" : active ? active.text || active.transcriptText || active.name || "" : "";
  return [
    `<article class="reading-page" data-testid="book-workbench">`,
    active ? `<header><span>Прогресс ${Math.round(activeReading?.progress || 0)}%</span><h3>${escapeHtml(active.name || "Материал")}</h3></header><p data-testid="book-workbench-text">${escapeHtml(compactText(body, 1800) || "Текст сохранён как источник. Для PDF/EPUB нужен парсер или ручная выдержка.")}</p>` : `<header><span>Reader</span><h3>Текст появится здесь</h3></header><p>TXT/MD читаются сразу. PDF и EPUB сохраняются как источник и честно просят парсер.</p>`,
    hasUnits
      ? `<div class="reader-nav" data-testid="reader-nav">${button("reader-prev-unit", "← Назад", { id: activeReading.id, kind: "ghost", testId: "reader-prev-unit", disabled: unitIndex <= 0 })}<span data-testid="reader-unit-label">${escapeHtml(unitLabel)} ${unitIndex + 1} / ${units.length}</span>${button("reader-next-unit", "Вперёд →", { id: activeReading.id, kind: "ghost", testId: "reader-next-unit", disabled: unitIndex >= units.length - 1 })}</div>`
      : "",
    `<div class="reader-actions">${button("import-file", "Импорт", { testId: "reader-import" })}${button("set-surface", "В базу знаний", { id: "library", kind: "ghost" })}</div>`,
    `</article>`
  ].join("");
}

export function renderReaderSurface(ctx) {
  const books = ctx.bookSources || [];
  return [
    `<div class="reader-surface" data-testid="reader-surface">`,
    `<aside class="reader-list">`,
    `<h3>Очередь чтения</h3>`,
    safeList(books, (book) => {
      const reading = readingFor(ctx, book.id);
      return `<article class="book-source-card" data-testid="book-source-card"><strong>${escapeHtml(book.name || "Текст")}</strong><span>${escapeHtml(sourceStatus(book))}</span>${reading ? `<em>${Math.round(reading.progress || 0)}%</em>` : ""}${button("open-source-note", "Открыть источник", { id: book.id, kind: "ghost" })}${isGatedBook(book) ? button("extract-book-text", "Извлечь текст", { id: book.id, kind: "primary", testId: "extract-book-text" }) : ""}<input id="highlight-title-${escapeHtml(book.id)}" data-testid="highlight-title" aria-label="Текст цитаты" placeholder="Цитата или мысль"><span class="book-card-actions">${button("extract-highlights", "Найти цитаты", { id: book.id, kind: "ghost", testId: "extract-highlights" })}${button("add-highlight-entry", "Добавить цитату", { id: book.id, kind: "ghost", testId: "add-highlight-entry" })}</span>${reading ? `<label class="reading-progress-mini">Прогресс<input id="reading-progress-${escapeHtml(reading.id)}" data-testid="reading-progress" type="number" min="0" max="100" value="${escapeHtml(reading.progress || 0)}" aria-label="Прогресс чтения"></label>${button("update-reading-progress", "Сохранить", { id: reading.id, kind: "ghost", testId: "update-reading-progress" })}` : ""}</article>`;
    }, `<div class="empty-inline">Импортируй TXT или MD.</div>`),
    button("import-file", "Добавить текст", { kind: "primary", testId: "book-import" }),
    `</aside>`,
    renderBookWorkbenchPanel(ctx),
    `<aside class="reader-notes"><h3>Выделения</h3>${safeList(ctx.highlights?.slice(0, 5) || [], (item) => `<div class="highlight-row" data-testid="highlight-row"><strong>${escapeHtml(compactText(item.text || item.title, 80))}</strong>${item.readingItemId ? button("go-to-highlight", "Перейти", { id: item.id, kind: "ghost", testId: "go-to-highlight" }) : ""}</div>`, `<div class="empty-inline">Выделение можно превратить в знание или задачу.</div>`)}</aside>`,
    `</div>`
  ].join("");
}

import { RENDERER_MODES, OBJECT_CONTRACT_V4_FIELDS, presentArtifact } from "../../artifact-os-architecture.mjs";
import { button, compactText, escapeHtml, renderArtifactByMode, safeList } from "./shared.js";

function contractFieldRows(record) {
  return OBJECT_CONTRACT_V4_FIELDS.map((field) => {
    const raw = record[field];
    const value = raw && typeof raw === "object" ? JSON.stringify(raw) : String(raw ?? "");
    return `<div class="inspector-field-row" data-testid="inspector-field-row"><span>${escapeHtml(field)}</span><strong>${escapeHtml(compactText(value, 60))}</strong></div>`;
  }).join("");
}

function receiptRows(receipts) {
  return safeList(
    receipts,
    (receipt) => `<div class="inspector-receipt-row" data-testid="inspector-receipt-row"><span>${escapeHtml(receipt.kind)} · ${escapeHtml(receipt.locality)}</span><strong>${escapeHtml(compactText(receipt.summary, 100))}</strong><time>${escapeHtml(String(receipt.createdAt || "").slice(0, 16))}</time></div>`,
    `<div class="empty-inline" data-testid="inspector-receipt-empty">Квитанций для этого артефакта пока нет.</div>`
  );
}

function relationRows(record, edgeReasons) {
  const relations = Array.isArray(record.relations) ? record.relations : [];
  const items = relations.length ? relations : edgeReasons;
  return safeList(
    items,
    (relation) => `<div class="inspector-relation-row" data-testid="inspector-relation-row">${escapeHtml(typeof relation === "string" ? relation : JSON.stringify(relation))}</div>`,
    `<div class="empty-inline" data-testid="inspector-relation-empty">Связей пока нет.</div>`
  );
}

function rendererSwitch(activeMode) {
  return `<div class="inspector-renderer-switch" data-testid="inspector-renderer-switch">${RENDERER_MODES.map((mode) => button("set-inspector-renderer", mode, { id: mode, kind: mode === activeMode ? "primary" : "ghost", testId: "inspector-renderer-" + mode })).join("")}</div>`;
}

export function renderInspectorDrawer(ctx) {
  const selected = ctx.selectedGraph || {};
  const record = selected.record;
  if (!record) {
    return `<aside class="inspector-drawer inspector-drawer-empty" data-testid="inspector-drawer"><strong>Инспектор</strong><p class="empty-inline" data-testid="inspector-empty">Выбери артефакт в графе, ленте, поиске или контроле, чтобы открыть универсальный инспектор.</p></aside>`;
  }
  const mode = RENDERER_MODES.includes(ctx.control?.inspectorRenderer) ? ctx.control.inspectorRenderer : "card";
  const item = presentArtifact(record, record.type);
  const preview = mode === "table-row" ? `<table><tbody>${renderArtifactByMode(item, mode)}</tbody></table>` : mode === "timeline" ? `<ul>${renderArtifactByMode(item, mode)}</ul>` : renderArtifactByMode(item, mode);
  // MVP: инспектор ведёт человеческим (превью + связи), а сырой контракт объекта — под
  // сворачиваемым «Технические поля», чтобы не нагромождать. Поля остаются в DOM (тесты целы).
  return [
    `<aside class="inspector-drawer" data-testid="inspector-drawer">`,
    `<header><strong>${escapeHtml(selected.title || record.title)}</strong><span>${escapeHtml(selected.meta || record.type)}</span></header>`,
    `<section class="inspector-section" data-testid="inspector-renderer-section"><h4>Как выглядит</h4>${rendererSwitch(mode)}<div class="inspector-preview" data-testid="inspector-preview">${preview}</div></section>`,
    `<section class="inspector-section" data-testid="inspector-relations-section"><h4>Связи</h4>${relationRows(record, selected.edgeReasons || [])}</section>`,
    `<section class="inspector-section" data-testid="inspector-receipts-section"><h4>Квитанции</h4>${receiptRows(selected.receipts || [])}</section>`,
    `<details class="inspector-section inspector-contract-details" data-testid="inspector-contract-fields"><summary>Технические поля</summary>${contractFieldRows(record)}</details>`,
    `<section class="inspector-actions" data-testid="inspector-actions">`,
    button("export-selected-artifact", "Экспорт", { kind: "ghost", testId: "inspector-export" }),
    button("create-rollback-snapshot", "Снимок отката", { kind: "ghost", testId: "inspector-rollback" }),
    `</section>`,
    `</aside>`
  ].join("");
}

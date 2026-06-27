import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, compactText, escapeHtml, publicText, safeList } from "./components/shared.js";

function auditTypeLabel(type) {
  const map = {
    "proposal.apply": "Принято",
    "insight.create": "Инсайт",
    "inbox.capture": "Ввод",
    "source.import": "Источник",
    "highlight.extract": "Выделения",
    "highlight.create": "Выделение",
    "review.create": "Повторение",
    "reading.create": "Чтение",
    "note.create": "Заметка",
    "flow.dry-run": "Сценарий",
    "agent.run": "Агент",
    "chat.message": "Чат",
    "control.rollback.snapshot": "Rollback",
    "control.rollback.restore": "Restored",
    "control.corrupt.isolate": "Изоляция",
    "control.corrupt.recover": "Восстановлено"
  };
  return map[String(type || "")] || String(type || "Изменение").replace(/[._-]+/g, " ");
}

function auditSummaryText(summary) {
  return publicText(summary)
    .replace(/^Applied proposal:/i, "Принято предложение:")
    .replace(/^Source imported:/i, "Источник добавлен:")
    .replace(/^Note created:/i, "Заметка создана:");
}

function rollbackRows(snapshots) {
  return safeList(
    snapshots,
    (snapshot) => [
      `<div class="recovery-row rollback-row" data-testid="rollback-row">`,
      `<span>${escapeHtml((snapshot.title || "Снимок отката") + " / " + (snapshot.summary || "готов к восстановлению"))}</span>`,
      button("restore-rollback-snapshot", "Восстановить", { id: snapshot.id, kind: "ghost", testId: "restore-rollback-snapshot" }),
      `</div>`
    ].join(""),
    `<div class="empty-inline" data-testid="rollback-empty">Снимков отката пока нет.</div>`
  );
}

function corruptStatusLabel(status) {
  return status === "recovered" ? "восстановлено" : "изолировано";
}

function corruptRows(records) {
  return safeList(
    records,
    (record) => [
      `<div class="recovery-row corrupt-row" data-testid="corrupt-record-row">`,
      `<span>${escapeHtml(corruptStatusLabel(record.status) + " / " + (record.kind || "record") + ": " + (record.reason || "запись отделена от рабочей базы"))}</span>`,
      button("recover-corrupt-record", "Восстановить", { id: record.id, kind: "ghost", testId: "recover-corrupt-record", disabled: record.status === "recovered" }),
      `</div>`
    ].join(""),
    `<div class="empty-inline" data-testid="corrupt-record-empty">Изолированных повреждённых записей нет.</div>`
  );
}

export function renderControl(ctx) {
  const audit = ctx.auditLog || [];
  const snapshots = ctx.control?.rollbackSnapshots || [];
  const corruptRecords = ctx.control?.corruptRecords || [];
  const rollbackCount = snapshots.length;
  const storageUsage = Number(ctx.environment?.storageUsage || 0);
  const storageQuota = Number(ctx.environment?.storageQuota || 0);
  const storageText = `${Math.round(storageUsage / 1024)} KB из ${storageQuota ? Math.round(storageQuota / 1024 / 1024) + " MB" : "доступного объёма"}`;
  const body = [
    `<div class="control-human-layout" data-testid="data-control-panel">`,
    `<header class="control-panel-intro"><h3>Контроль данных</h3><p>Человеческий след изменений, экспорт, Storage, откат и восстановление без стены технических доказательств.</p></header>`,
    `<section class="control-primary">`,
    `<h3>Что изменилось</h3>`,
    safeList(
      audit.slice(-10).reverse(),
      (event) => `<div class="control-event" data-testid="audit-row"><strong>${escapeHtml(auditTypeLabel(event.type))}</strong><span>${escapeHtml(compactText(auditSummaryText(event.summary || ""), 130))}</span><time>${escapeHtml(String(event.createdAt || event.at || "").slice(0, 16))}</time></div>`,
      `<div class="empty-inline">Изменений пока нет.</div>`
    ),
    `</section>`,
    `<aside class="control-actions">`,
    `<h3>Данные</h3>`,
    `<div class="control-meter"><span>Снимки отката</span><strong data-testid="rollback-count">${rollbackCount}</strong></div>`,
    `<div class="storage-map" data-testid="storage-map"><span>Где хранится</span><strong>Storage / IndexedDB / локально</strong><em>${escapeHtml(storageText)}</em></div>`,
    button("export-vault", "Экспорт всего", { kind: "primary", testId: "control-export-all" }),
    button("export-selected-artifact", "Экспорт фокуса", { kind: "ghost", testId: "export-selected-artifact" }),
    button("import-backup", "Импорт бэкапа", { kind: "ghost", testId: "import-backup" }),
    button("create-rollback-snapshot", "Снимок отката", { kind: "ghost", testId: "create-rollback-snapshot" }),
    button("archive-selected-artifact", "В архив", { kind: "danger", testId: "archive-selected-artifact" }),
    `<section class="recovery-list" data-testid="rollback-list"><h4>Rollback snapshots</h4>${rollbackRows(snapshots)}</section>`,
    `<section class="recovery-list" data-testid="corrupt-record-list"><h4>Повреждённые записи</h4><strong data-testid="corrupt-record-count">${corruptRecords.length}</strong>${corruptRows(corruptRecords)}</section>`,
    `<details class="dev-state-panel" data-testid="dev-state"><summary>Состояние разработки</summary><div data-testid="dev-state-panel"><div data-testid="architecture-contract"><strong>Product Brain</strong><span>Доступен только здесь, в графе через фильтр разработки и в чате через /dev. Artifact OS contract: ввод -> артефакт -> проекции -> граф -> контроль.</span><mark data-testid="architecture-validation">ок</mark>${button("set-surface", "Открыть граф разработки", { id: "graph", kind: "ghost" })}</div></div></details>`,
    `</aside>`,
    `</div>`
  ].join("");

  return renderWorkspaceLayout(
    "control",
    "Контроль",
    "Понятный след изменений, экспорт, восстановление и архив без стены технических доказательств.",
    body,
    { testId: "workspace-control", kicker: "Доверие" }
  );
}

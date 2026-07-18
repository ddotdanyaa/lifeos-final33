import { renderInspectorDrawer } from "./components/InspectorDrawer.js";
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

function deletedNoteRows(notes) {
  return safeList(
    notes,
    (note) => [
      `<div class="recovery-row" data-testid="recovery-row">`,
      `<span>${escapeHtml(note.title || "Заметка")}</span>`,
      button("restore-note", "Восстановить", { id: note.id, kind: "ghost", testId: "restore-note" }),
      `</div>`
    ].join(""),
    `<div class="empty-inline" data-testid="recovery-empty">Удалённых заметок нет.</div>`
  );
}

function corruptStatusLabel(status) {
  return status === "recovered" ? "восстановлено" : "изолировано";
}

function capabilityRows(grants) {
  return safeList(
    grants,
    (grant) => [
      `<div class="recovery-row capability-row" data-testid="capability-row">`,
      `<span>${escapeHtml(grant.resource + "/" + grant.action + " • " + grant.locality + " • " + grant.approval)}</span>`,
      grant.revokedAt
        ? `<mark data-testid="capability-revoked">отозвано</mark>`
        : button("revoke-capability", "Отозвать", { id: grant.id, kind: "ghost", testId: "revoke-capability" }),
      `</div>`
    ].join(""),
    `<div class="empty-inline" data-testid="capability-empty">Грантов способностей пока нет.</div>`
  );
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

function mergeReviewRows(entries) {
  return safeList(
    entries,
    (entry) => `<div class="recovery-row merge-review-row" data-testid="merge-review-row"><span>${escapeHtml(entry.sourceName + " похож на " + entry.duplicateOfName)}</span>${button("merge-duplicate", "Объединить", { id: entry.id, kind: "ghost", testId: "merge-duplicate" })}${button("keep-both-duplicates", "Оставить оба", { id: entry.id, kind: "ghost", testId: "keep-both-duplicates" })}</div>`,
    `<div class="empty-inline" data-testid="merge-review-empty">Дубликатов на рассмотрении нет.</div>`
  );
}

function backupRestorePreview(report) {
  if (!report) {
    return `<div class="empty-inline" data-testid="backup-restore-empty">Бэкап не загружен.</div>`;
  }
  return [
    `<div class="backup-restore-report" data-testid="backup-restore-report">`,
    `<div><strong>${escapeHtml(report.filename)}</strong></div>`,
    `<div><span>${escapeHtml(report.summary)}</span></div>`,
    `<div class="backup-restore-actions">`,
    button("confirm-backup-restore", "Восстановить бэкап", { kind: "primary", testId: "confirm-backup-restore" }),
    button("cancel-backup-restore", "Отменить", { kind: "ghost", testId: "cancel-backup-restore" }),
    `</div>`,
    `</div>`
  ].join("");
}

function obsidianScanPreview(report) {
  if (!report) {
    return `<div class="empty-inline" data-testid="obsidian-scan-empty">Vault ещё не отсканирован.</div>`;
  }
  const sampleTitles = (report.files || []).slice(0, 5).map((file) => escapeHtml(file.title)).join(", ");
  const wikilinkTotal = (report.files || []).reduce((sum, file) => sum + Number(file.wikilinkCount || 0), 0);
  const tagTotal = (report.files || []).reduce((sum, file) => sum + (file.tags || []).length, 0);
  return [
    `<div class="obsidian-scan-report" data-testid="obsidian-scan-report">`,
    `<div><strong>${escapeHtml(report.vaultName)}</strong><span> — ${report.files.length} заметок, ${report.attachmentCount} вложений</span></div>`,
    `<div><span>Тегов: ${tagTotal} · Wiki-ссылок: ${wikilinkTotal}</span></div>`,
    sampleTitles ? `<div><em>${sampleTitles}${report.files.length > 5 ? "…" : ""}</em></div>` : "",
    `<div class="obsidian-scan-actions">`,
    button("confirm-obsidian-import", "Подтвердить импорт", { kind: "primary", testId: "confirm-obsidian-import" }),
    button("cancel-obsidian-import", "Отменить", { kind: "ghost", testId: "cancel-obsidian-import" }),
    `</div>`,
    `</div>`
  ].join("");
}

const TRASH_KIND_LABELS = {
  note: "Заметка",
  source: "Источник",
  task: "Задача",
  reminder: "Напоминание",
  habit: "Привычка",
  goal: "Цель",
  plan: "Блок времени"
};

function trashKindLabel(kind) {
  return TRASH_KIND_LABELS[kind] || String(kind || "").replace(/[-_]+/g, " ");
}

function trashRows(items) {
  return safeList(
    items,
    (item) => [
      `<div class="recovery-row trash-row" data-testid="trash-row">`,
      `<span>${escapeHtml(trashKindLabel(item.kind) + ": " + item.title)}</span>`,
      `<mark data-testid="trash-days-left">${item.daysLeft} ${item.daysLeft === 1 ? "день" : "дней"}</mark>`,
      button("restore-trash-item", "Восстановить", { id: item.kind + ":" + item.id, kind: "ghost", testId: "restore-trash-item" }),
      button("purge-trash-item-forever", "Удалить навсегда", { id: item.kind + ":" + item.id, kind: "danger", testId: "purge-trash-item-forever" }),
      `</div>`
    ].join(""),
    `<div class="empty-inline" data-testid="trash-empty">Корзина пуста.</div>`
  );
}

export function renderControl(ctx) {
  const audit = ctx.auditLog || [];
  const snapshots = ctx.control?.rollbackSnapshots || [];
  const corruptRecords = ctx.control?.corruptRecords || [];
  const mergeReview = ctx.mergeReview || [];
  const obsidianScanReport = ctx.obsidianScanReport || null;
  const backupRestoreReport = ctx.backupRestoreReport || null;
  const trashItems = ctx.trashItems || [];
  const trashGraceDays = ctx.trashGraceDays || 30;
  const capabilities = Object.values(ctx.control?.capabilities || {}).sort((a, b) => String(b.grantedAt || "").localeCompare(String(a.grantedAt || "")));
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
    `<label class="backup-encrypt-field"><span>Пароль шифрования (опционально)</span><input id="backup-encrypt-passphrase" data-testid="backup-encrypt-passphrase" type="password" autocomplete="off" placeholder="оставь пустым для обычного экспорта"></label>`,
    button("export-vault", "Экспорт всего", { kind: "primary", testId: "control-export-all" }),
    button("export-selected-artifact", "Экспорт фокуса", { kind: "ghost", testId: "export-selected-artifact" }),
    button("import-backup", "Импорт бэкапа", { kind: "ghost", testId: "import-backup" }),
    button("create-rollback-snapshot", "Снимок отката", { kind: "ghost", testId: "create-rollback-snapshot" }),
    button("archive-selected-artifact", "В архив", { kind: "danger", testId: "archive-selected-artifact" }),
    `<section class="recovery-list" data-testid="rollback-list"><h4>Rollback snapshots</h4>${rollbackRows(snapshots)}</section>`,
    `<section class="recovery-list" data-testid="trash-list"><h4>Корзина</h4><span>Восстановление доступно ${trashGraceDays} дней, затем удаление навсегда</span><strong data-testid="trash-count">${trashItems.length}</strong>${button("undo-last-trash", "Отменить последнее удаление", { kind: "ghost", testId: "undo-last-trash", disabled: !trashItems.length })}${trashRows(trashItems)}</section>`,
    `<section class="recovery-list" data-testid="deleted-note-list"><h4>Удалённые заметки</h4>${deletedNoteRows(ctx.deletedNotes || [])}</section>`,
    `<section class="recovery-list" data-testid="corrupt-record-list"><h4>Повреждённые записи</h4><strong data-testid="corrupt-record-count">${corruptRecords.length}</strong>${corruptRows(corruptRecords)}</section>`,
    `<section class="recovery-list" data-testid="capability-list"><h4>Способности провайдеров</h4><strong data-testid="capability-count">${capabilities.length}</strong>${capabilityRows(capabilities)}</section>`,
    `<section class="recovery-list" data-testid="merge-review-list"><h4>Дубликаты на рассмотрении</h4><strong data-testid="merge-review-count">${mergeReview.length}</strong>${mergeReviewRows(mergeReview)}</section>`,
    `<section class="recovery-list" data-testid="obsidian-bridge-section"><h4>Obsidian vault</h4>${button("import-obsidian-vault", "Импорт vault", { kind: "ghost", testId: "import-obsidian-vault" })}${button("export-obsidian-vault", "Экспорт в Obsidian", { kind: "ghost", testId: "export-obsidian-vault" })}${obsidianScanPreview(obsidianScanReport)}</section>`,
    `<section class="recovery-list" data-testid="backup-restore-section"><h4>Восстановление бэкапа</h4>${backupRestorePreview(backupRestoreReport)}</section>`,
    renderInspectorDrawer(ctx),
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

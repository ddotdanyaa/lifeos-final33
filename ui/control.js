import { renderInspectorDrawer } from "./components/InspectorDrawer.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, compactText, escapeHtml, publicText, safeList, surfaceNotice } from "./components/shared.js";

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
    "control.corrupt.recover": "Восстановлено",
    // Экран называется «понятный след без стены технических доказательств», поэтому события
    // владельца не должны выглядеть как «goal create».
    "goal.create": "Цель",
    "goal.reinforce": "Цель усилена",
    "goal.toggle": "Цель закрыта",
    "task.create": "Задача",
    "artifact.reinforce": "Усиление",
    "entity.merge": "Люди объединены",
    "entity.unmerge": "Люди разъединены",
    "entity.split": "Люди разделены",
    "entity.unsplit": "Разделение снято",
    "entity.extract": "Сущности",
    "digest.run": "Разбор дня",
    "agent.schedule": "Расписание",
    "agent.schedule.clear": "Расписание снято",
    "object.conflict.revert": "Откат решения",
    "habit.create": "Привычка",
    "finance.create": "Деньги",
    "plan.create": "Блок дня",
    "reminder.create": "Напоминание",
    "claim.create": "Утверждение",
    "insight.link": "Связь",
    "link.predict.apply": "Связь создана",
    "link.predict.dismiss": "Связь отклонена",
    "finance.transaction": "Деньги",
    "finance.account": "Счёт",
    "chat.input.artifact": "Сообщение",
    "chat.answer.artifact": "Ответ"
  };
  return map[String(type || "")] || String(type || "Изменение").replace(/[._-]+/g, " ");
}

// «2026-07-27T05:42» — это технический след, а экран обещает обратное. Дату показываем так же,
// как её показывают остальные экраны: «27 июл 05:42».
const AUDIT_MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function auditStamp(value) {
  const date = new Date(String(value || ""));
  if (isNaN(date.getTime())) return String(value || "").slice(0, 16);
  const time = String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
  return date.getDate() + " " + AUDIT_MONTHS[date.getMonth()] + " " + time;
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

const HEALTH_LABELS = {
  alive: "работает",
  starting: "запускается",
  degraded: "частично работает",
  failed: "не работает",
  disabled: "отключено",
  updating: "обновляется",
  requires_config: "нужна настройка",
  permission_blocked: "нужно разрешение",
  provider_unavailable: "не подключено",
  index_stale: "индекс устарел"
};

function healthLabel(health) {
  return HEALTH_LABELS[health] || health;
}

function healthRows(rows) {
  return safeList(
    rows,
    (row) => `<div class="recovery-row health-row" data-testid="health-row" data-health="${escapeHtml(row.health)}"><span>${escapeHtml(row.label)}</span><mark data-testid="health-state">${escapeHtml(healthLabel(row.health))}</mark>${row.detail ? `<em>${escapeHtml(compactText(row.detail, 90))}</em>` : ""}</div>`,
    `<div class="empty-inline" data-testid="health-empty">Подсистемы ещё не проверены.</div>`
  );
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

function productMapPanel(productMap) {
  const counts = productMap.counts || {};
  return [
    `<div class="product-map-panel" data-testid="product-map-panel">`,
    `<strong>Карта продукта (LifeOS о себе)</strong>`,
    productMap.importedAt
      ? `<span data-testid="product-map-status">${counts.modules || 0} модулей · ${counts.capabilities || 0} способностей · ${counts.collections || 0} коллекций · ${counts.packages || 0} пакетов · ${(productMap.links || []).length} связей</span>`
      : `<span data-testid="product-map-status">Карта продукта ещё не импортирована.</span>`,
    productMap.lastError ? `<span data-testid="product-map-error">${escapeHtml(productMap.lastError)}</span>` : "",
    button("import-product-map", "Импортировать карту продукта", { kind: "ghost", testId: "import-product-map" }),
    `</div>`
  ].join("");
}

// Срез 14: правила поведения системы от владельца (артефакты). Активные реально вплетаются в
// ответы локальной модели (app.js buildOllamaChatPrompt). Пресеты - готовые частые правила.
function renderOwnerInstructions(ctx) {
  const rules = ctx.ownerInstructions || [];
  const presets = ctx.instructionPresets || [];
  return [
    `<section class="owner-rules" data-testid="owner-rules">`,
    `<h3>Правила системы</h3>`,
    `<p>Правила поведения от тебя. Активные вплетаются в ответы локальной модели в Чате.</p>`,
    `<div class="owner-rule-add"><input id="instruction-input" data-testid="instruction-input" autocomplete="off" placeholder="Например: отвечай коротко и по-русски" aria-label="Новое правило">${button("add-instruction", "Добавить правило", { kind: "primary", testId: "add-instruction" })}</div>`,
    presets.length ? `<div class="owner-rule-presets" data-testid="instruction-presets"><span>Пресеты:</span>${presets.map((preset) => button("apply-instruction-preset", preset.text, { id: preset.id, kind: "ghost", testId: "instruction-preset" })).join("")}</div>` : "",
    `<div class="owner-rule-list" data-testid="owner-rule-list">${safeList(rules, (rule) => `<div class="owner-rule ${rule.active ? "active" : "inactive"}" data-testid="owner-rule" data-rule="${escapeHtml(rule.id)}" data-active="${rule.active ? "1" : "0"}"><span>${escapeHtml(rule.text)}</span><span class="owner-rule-ctl">${button("toggle-instruction", rule.active ? "Вкл" : "Выкл", { id: rule.id, kind: "ghost", testId: "toggle-instruction" })}${button("remove-instruction", "Удалить", { id: rule.id, kind: "ghost", testId: "remove-instruction" })}</span></div>`, `<div class="empty-inline" data-testid="owner-rules-empty">Пока нет правил. Добавь своё или выбери пресет.</div>`)}</div>`,
    `</section>`
  ].join("");
}


// Контроль (канон design-system/Control.dc.html): два ответа, которых не хватало — куда данные
// могут уйти (и что именно уйдёт) и что система сделала (с откатом). Данные из app.js
// (computeOutboundRoutes / computeReceiptJournal), здесь только разметка.
// Тумблер политики данных. Решение владельца 2026-07-30: приватность — это ОДИН переключатель,
// а не флажок у каждой функции («это такой вот тумблер, который можно перетягивать в разные
// стороны»). Стоит прямо над списком маршрутов наружу: сначала правило, потом то, на что оно
// действует. Оба полюса описаны его словами — быстро против безопасно, без обещаний.
function renderDataPolicySwitch(ctx) {
  const mode = ctx.control?.dataPolicy?.mode === "network-allowed" ? "network-allowed" : "local-only";
  const localActive = mode === "local-only";
  return [
    `<section class="data-policy" data-testid="data-policy" data-mode="${escapeHtml(mode)}">`,
    `<div class="section-title">Что можно делать с данными</div>`,
    `<p class="outbound-note">Одно правило на всю систему. Локальная модель на этом компьютере работает в любом режиме — «наружу» значит за пределы устройства.</p>`,
    `<div class="data-policy-options">`,
    `<button type="button" class="data-policy-option${localActive ? " is-active" : ""}" data-action="set-data-policy" data-id="local-only" data-testid="data-policy-local">`,
    `<strong>Всё остаётся на этом компьютере</strong><span>Ни один запрос не уходит наружу. Медленнее и неудобнее, зато данные не покидают устройство.</span>`,
    `</button>`,
    `<button type="button" class="data-policy-option${localActive ? "" : " is-active"}" data-action="set-data-policy" data-id="network-allowed" data-testid="data-policy-network">`,
    `<strong>Можно обращаться наружу</strong><span>Быстрее и удобнее. Каждое обращение всё равно видно ниже и попадает в чеки.</span>`,
    `</button>`,
    `</div>`,
    `<em class="data-policy-current" data-testid="data-policy-current">Сейчас: ${localActive ? "всё остаётся на этом компьютере" : "обращения наружу разрешены"}.</em>`,
    // Ответ на само нажатие — включая «ничего не изменилось, режим уже такой». Без него выбранный
    // полюс молчал в ответ на клик и был неотличим от мёртвой кнопки.
    surfaceNotice(ctx, "control", "data-policy-notice"),
    `</section>`
  ].join("");
}

function renderOutboundRoutes(ctx) {
  const view = ctx.outboundRoutes || { routes: [], zones: [], activeCount: 0 };
  return [
    `<section class="outbound-routes" data-testid="outbound-routes">`,
    `<div class="section-title">Маршруты наружу <span data-testid="outbound-active-count">${view.activeCount} ${view.activeCount === 1 ? "включён" : "включено"}</span></div>`,
    `<p class="outbound-note">Ниже — всё, что вообще способно отправить данные с этого устройства. У каждого маршрута написано, что именно уйдёт.</p>`,
    view.routes.map((route) => [
      `<div class="outbound-route${route.active ? " is-active" : ""}" data-testid="outbound-route" data-route="${escapeHtml(route.id)}">`,
      `<div class="outbound-route-head"><strong>${escapeHtml(route.label)}</strong><span class="outbound-status" data-testid="outbound-status">${escapeHtml(route.statusLabel)}</span></div>`,
      `<p data-testid="outbound-payload">${escapeHtml(route.payload)}</p>`,
      route.note ? `<em class="outbound-note-line">${escapeHtml(route.note)}</em>` : "",
      `</div>`
    ].join("")).join(""),
    `<div class="privacy-zones" data-testid="privacy-zones">`,
    view.zones.map((zone) => `<div class="privacy-zone" data-testid="privacy-zone"><strong>${escapeHtml(zone.label)}</strong><span>${escapeHtml(zone.value)}</span><em>${escapeHtml(zone.detail)}</em></div>`).join(""),
    `</div>`,
    `</section>`
  ].join("");
}

function renderReceiptJournal(ctx) {
  const rows = ctx.receiptJournal || [];
  return [
    `<section class="receipt-journal" data-testid="receipt-journal">`,
    `<div class="section-title">Журнал чеков <span data-testid="receipt-count">${rows.length}</span></div>`,
    rows.length
      ? rows.map((row) => [
          `<div class="receipt-row" data-testid="receipt-row" data-kind="${escapeHtml(row.kind)}">`,
          `<time>${escapeHtml(row.at)}</time>`,
          `<span class="receipt-body"><strong>${escapeHtml(row.kind)}</strong><em>${escapeHtml(compactText(row.summary, 160))}</em></span>`,
          `<span class="receipt-actions">`,
          row.openable ? button("open-object", "Объект", { id: row.objectId, kind: "ghost", testId: "receipt-open-object" }) : "",
          // Кнопка отката стоит только там, где возврат действительно реализован.
          row.revertible ? button("revert-receipt", "Вернуть как было", { id: row.objectId, kind: "ghost", testId: "receipt-revert" }) : "",
          `</span>`,
          `</div>`
        ].join("")).join("")
      : `<div class="empty-inline" data-testid="receipt-journal-empty">Чеков пока нет: система ещё ничего значимого не делала.</div>`,
    `</section>`
  ].join("");
}

// О3 · КАЛИБРОВКА, показанная честно. Уверенности в разборе назначались руками (0.7, 0.72,
// 0.84) — это привычка автора, а не знание о владельце. Настоящая уверенность — доля
// предложений этого типа, которые он ПРИНЯЛ.
//
// Панель не считает сама и ничего не меняет: она показывает, что накоплено. Мало решений —
// так и написано, числа нет. Инвариант И-2: память отдельно, политика отдельно.
function renderCalibrationPanel(ctx) {
  const calibration = ctx.calibration || { total: 0, types: [] };
  if (!calibration.total) return "";
  const rows = (calibration.types || []).filter((row) => row.decisions > 0).slice(0, 8);
  if (!rows.length) return "";
  return [
    `<section class="control-calibration" data-testid="control-calibration">`,
    `<h3>Что система знает о своих предложениях</h3>`,
    `<p class="control-calibration-note" data-testid="calibration-note">Решений в журнале: ${calibration.total}${calibration.retro ? ` (из них ${calibration.retro} восстановлено из журнала изменений — половинный вес)` : ""}.</p>`,
    // О8: канарейка — единственная проверка, которая смотрит НЕ на те данные, на которых
    // система училась. Её вердикт важнее любого процента выше.
    ctx.canary && ctx.canary.frozenLearning
      ? `<p class="control-calibration-drift" data-testid="calibration-canary">Канарейка: точность на замороженных вердиктах упала до ${Math.round((ctx.canary.accuracy || 0) * 100)}% при эталоне ${Math.round((ctx.canary.baseline || 0) * 100)}% — обучение остановлено до твоего разбора.</p>`
      : "",
    // О4: согласие ≠ правда.
    ctx.sycophancy && ctx.sycophancy.flattering
      ? `<p class="control-calibration-drift" data-testid="calibration-sycophancy">${escapeHtml(ctx.sycophancy.status)}. Значит система тебе нравится больше, чем помогает — вес двигается от правды, а не от согласия.</p>`
      : "",
    calibration.drifted
      ? `<p class="control-calibration-drift" data-testid="calibration-drift">Последние решения расходятся с прежними — история обнулена, система учится заново. Это честнее, чем держаться за устаревшую правду о тебе.</p>`
      : "",
    rows.map((row) => [
      `<div class="control-calibration-row" data-testid="calibration-row">`,
      `<strong>${escapeHtml(row.type)}</strong>`,
      row.trusted
        ? `<span data-testid="calibration-value">принято ${Math.round(row.acceptance * 100)}%</span>`
        : `<span class="control-calibration-thin" data-testid="calibration-thin">${escapeHtml(row.status)}</span>`,
      `<em>${row.decisions} ${row.decisions === 1 ? "решение" : "решений"}${row.editedShare > 0 ? ` · с правкой ${Math.round(row.editedShare * 100)}%` : ""}</em>`,
      `</div>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

// СРЕЗ Д · «ЧТО Я ПОНЯЛ О СЕБЕ». Владелец 2026-07-31: «система сама будет писать, что ей нужно
// далее для разработки». Панель ничего не считает и ничего не меняет — она называет то, что уже
// измерено калибровкой, антилестью, канарейкой и счётчиком экранов.
//
// «Самое слабое место» стоит ПЕРВЫМ и показывается всегда, даже когда данных не хватает: строка
// «пока не знаю, решений 3 из 8» — это честный ответ, а пустой экран честным ответом не является.
function renderSelfReviewPanel(ctx) {
  const review = ctx.selfReview;
  if (!review) return "";
  return [
    `<section class="control-self-review" data-testid="control-self-review">`,
    `<h3>Что я понял о себе</h3>`,
    `<p class="control-self-weakest" data-testid="self-review-weakest">${escapeHtml(review.weakest || "")}</p>`,
    review.candidates && review.candidates.length
      ? review.candidates.map((row) => [
        `<div class="control-self-row" data-testid="self-review-row">`,
        `<strong>${escapeHtml(row.title)}</strong>`,
        // Основание обязательно и всегда числом: предложение без числа — это мнение системы
        // о себе, а мнений у неё быть не должно.
        `<span data-testid="self-review-evidence">${escapeHtml(row.evidence)}</span>`,
        `<em class="control-self-trust" data-raw-trusted="${row.trusted ? "yes" : "no"}">${row.trusted ? "измерено" : "мало данных"}</em>`,
        `</div>`
      ].join("")).join("")
      : `<p class="control-calibration-thin" data-testid="self-review-empty">Предлагать пока нечего: решений в журнале ${review.total}.</p>`,
    `</section>`
  ].join("");
}

export function renderControl(ctx) {
  const audit = ctx.auditLog || [];
  const snapshots = ctx.control?.rollbackSnapshots || [];
  const corruptRecords = ctx.control?.corruptRecords || [];
  const mergeReview = ctx.mergeReview || [];
  // Четыре механизма безопасности молчат одновременно — значит владельцу здесь делать нечего,
  // и четырнадцать строк пустых заголовков ему об этом не сообщают, а мешают. Корзина сюда НЕ
  // входит: у неё свой срок хранения и своя кнопка отмены, то есть там есть что делать и в
  // пустом состоянии.
  const quietRecovery = !snapshots.length
    && !(ctx.deletedNotes || []).length
    && !corruptRecords.length
    && !mergeReview.length;
  const healthRegistry = ctx.healthRegistry || [];
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
      (event) => `<div class="control-event" data-testid="audit-row"><strong>${escapeHtml(auditTypeLabel(event.type))}</strong><span>${escapeHtml(compactText(auditSummaryText(event.summary || ""), 130))}</span><time>${escapeHtml(auditStamp(event.createdAt || event.at || ""))}</time></div>`,
      `<div class="empty-inline">Изменений пока нет.</div>`
    ),
    // Сначала вывод о себе, потом цифры под ним: владелец пришёл узнать «что не так», а не
    // читать таблицу принятий и выводить из неё смысл самостоятельно.
    renderSelfReviewPanel(ctx),
    renderCalibrationPanel(ctx),
    renderOwnerInstructions(ctx),
    renderDataPolicySwitch(ctx),
    renderOutboundRoutes(ctx),
    renderReceiptJournal(ctx),
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
    // ЧЕСТНАЯ ПУСТОТА. Четыре механизма безопасности молчат почти всегда — и раньше каждый
    // занимал заголовок плюс строку «ничего нет». Четырнадцать строк, из которых владелец не
    // узнавал НИЧЕГО: экран выглядел набором пустых обещаний, и это ровно его жалоба.
    //
    // Свернули не «в никуда»: пока все четыре пусты, они дают одну строку, где КАЖДОЕ состояние
    // названо своими словами и своим маркером — скрытия данных здесь нет (§7 запрещает скрытое
    // поведение и в показе тоже). Появилось хоть что-то в любом из них — секции возвращаются
    // целиком, потому что тогда там есть что делать.
    quietRecovery
      ? `<section class="recovery-list recovery-quiet" data-testid="recovery-quiet"><h4>Ничего не ждёт внимания</h4><span data-testid="rollback-empty">Снимков отката пока нет.</span><span data-testid="recovery-empty">Удалённых заметок нет.</span><span data-testid="corrupt-record-empty">Изолированных повреждённых записей нет.</span><span data-testid="merge-review-empty">Дубликатов на рассмотрении нет.</span></section>`
      : "",
    quietRecovery ? "" : `<section class="recovery-list" data-testid="rollback-list"><h4>Снимки отката</h4>${rollbackRows(snapshots)}</section>`,
    `<section class="recovery-list" data-testid="trash-list"><h4>Корзина</h4><span>Восстановление доступно ${trashGraceDays} дней, затем удаление навсегда</span><strong data-testid="trash-count">${trashItems.length}</strong>${button("undo-last-trash", "Отменить последнее удаление", { kind: "ghost", testId: "undo-last-trash", disabled: !trashItems.length })}${trashRows(trashItems)}</section>`,
    quietRecovery ? "" : `<section class="recovery-list" data-testid="deleted-note-list"><h4>Удалённые заметки</h4>${deletedNoteRows(ctx.deletedNotes || [])}</section>`,
    quietRecovery ? "" : `<section class="recovery-list" data-testid="corrupt-record-list"><h4>Повреждённые записи</h4><strong data-testid="corrupt-record-count">${corruptRecords.length}</strong>${corruptRows(corruptRecords)}</section>`,
    `<section class="recovery-list" data-testid="capability-list"><h4>Способности провайдеров</h4><strong data-testid="capability-count">${capabilities.length}</strong>${capabilityRows(capabilities)}</section>`,
    quietRecovery ? "" : `<section class="recovery-list" data-testid="merge-review-list"><h4>Дубликаты на рассмотрении</h4><strong data-testid="merge-review-count">${mergeReview.length}</strong>${mergeReviewRows(mergeReview)}</section>`,
    `<section class="recovery-list" data-testid="obsidian-bridge-section"><h4>Obsidian vault</h4>${button("import-obsidian-vault", "Импорт vault", { kind: "ghost", testId: "import-obsidian-vault" })}${button("export-obsidian-vault", "Экспорт в Obsidian", { kind: "ghost", testId: "export-obsidian-vault" })}${obsidianScanPreview(obsidianScanReport)}</section>`,
    `<section class="recovery-list" data-testid="backup-restore-section"><h4>Восстановление бэкапа</h4>${backupRestorePreview(backupRestoreReport)}</section>`,
    `<section class="recovery-list" data-testid="health-registry-section"><h4>Состояние подсистем</h4>${healthRows(healthRegistry)}</section>`,
    renderInspectorDrawer(ctx),
    `<details class="dev-state-panel" data-testid="dev-state"><summary>Состояние разработки</summary><div data-testid="dev-state-panel"><div data-testid="architecture-contract"><strong>Product Brain</strong><span>Доступен только здесь, в графе через фильтр разработки и в чате через /dev. Artifact OS contract: ввод -> артефакт -> проекции -> граф -> контроль.</span><mark data-testid="architecture-validation">ок</mark>${button("set-surface", "Открыть граф разработки", { id: "graph", kind: "ghost" })}</div>${productMapPanel(ctx.control?.productMap || {})}</div></details>`,
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

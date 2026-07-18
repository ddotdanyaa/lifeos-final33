import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, compactText, escapeHtml, providerLabel, renderArtifactByMode, safeList } from "./components/shared.js";
import { RENDERER_MODES, SYSTEM_FIELD_TYPES, VIEW_PRESET_DENSITIES, VIEW_PRESET_GROUPINGS, presentArtifact } from "../artifact-os-architecture.mjs";

function live(values) {
  return Object.values(values || {}).filter((item) => !item.deleted);
}

function sortRecent(items) {
  return items.slice().sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

function statusLabel(value) {
  return providerLabel(value || "active");
}

function meta(parts) {
  return parts.filter(Boolean).map((part) => escapeHtml(part)).join(" · ");
}

function options(items, selectedId = "") {
  return items.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === selectedId ? " selected" : ""}>${escapeHtml(item.title || item.name || item.id)}</option>`).join("");
}

function miniStat(label, value, tone = "") {
  return `<div class="v34-stat ${escapeHtml(tone)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function noteButton(noteId) {
  return noteId ? button("open-graph-node", "Открыть артефакт", { id: noteId, kind: "ghost", testId: "open-v34-note" }) : "";
}

function graphButton(id) {
  return id ? button("focus-graph-node", "В граф", { id, kind: "ghost", testId: "focus-v34-node" }) : "";
}

function feedEventRow(event) {
  return [
    `<article class="v34-feed-row" data-testid="feed-event-row">`,
    `<time>${escapeHtml(String(event.createdAt || "").slice(0, 16))}</time>`,
    `<div><strong>${escapeHtml(event.title || "Событие")}</strong><span>${escapeHtml(compactText(event.summary || "", 150))}</span></div>`,
    `<mark>${escapeHtml(event.channel || event.kind || "life")}</mark>`,
    `</article>`
  ].join("");
}

export function renderFeed(ctx) {
  const channels = sortRecent(live(ctx.channels));
  const events = sortRecent(ctx.feedEvents || []).slice(0, 24);
  const body = [
    `<div class="v34-workspace v34-feed-workspace" data-testid="feed-workspace">`,
    `<section class="v34-overview">`,
    miniStat("каналы", String(channels.length), "teal"),
    miniStat("события", String(events.length), "amber"),
    miniStat("источники", String((ctx.sources || []).length), "blue"),
    miniStat("следы аудита", String((ctx.auditLog || []).length), "red"),
    `</section>`,
    `<div class="v34-split">`,
    `<section class="v34-panel">`,
    `<header><h3>Поток жизни</h3>${button("set-surface", "Добавить вход", { id: "capture", kind: "primary", testId: "feed-open-capture" })}</header>`,
    safeList(events, feedEventRow, `<div class="empty-inline">События появятся после ввода, действий, проверок провайдеров или установки локальных систем.</div>`),
    `</section>`,
    `<aside class="v34-panel">`,
    `<header><h3>Каналы</h3>${button("set-surface", "Контроль", { id: "control", kind: "ghost", testId: "feed-open-control" })}</header>`,
    safeList(
      channels,
      (channel) => [
        `<article class="v34-object-row" data-testid="channel-row">`,
        `<div><strong>${escapeHtml(channel.title)}</strong><span>${meta([channel.kind, channel.view, channel.description])}</span></div>`,
        `<div class="v34-row-actions">${graphButton(channel.id)}${noteButton(channel.noteId)}</div>`,
        `</article>`
      ].join(""),
      `<div class="empty-inline">Каналы создаются при инициализации v34-примитивов.</div>`
    ),
    `</aside>`,
    `</div>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("feed", "Лента", "Единый поток источников, действий, системных событий и проверок.", body, { testId: "workspace-feed", kicker: "v34" });
}

function systemRow(system) {
  return [
    `<article class="v34-object-row" data-testid="system-row">`,
    `<div><strong>${escapeHtml(system.title)}</strong><span>${meta([system.kind, system.health, `${(system.entities || []).length} сущностей`, `${(system.actions || []).length} действий`])}</span></div>`,
    `<div class="v34-row-actions">${graphButton(system.id)}${noteButton(system.noteId)}</div>`,
    `</article>`
  ].join("");
}

function entityFieldBadges(entity) {
  return entity.fields.length
    ? entity.fields.map((field) => `<span class="entity-field-badge" data-testid="entity-field-badge">${escapeHtml(field.name)}: ${escapeHtml(field.type)}${field.required ? "*" : ""}</span>`).join("")
    : `<span class="entity-field-badge empty">без полей</span>`;
}

function systemEntityFieldForm(system) {
  const entityOptions = system.entities.map((entity) => `<option value="${escapeHtml(entity.name)}">${escapeHtml(entity.name)}</option>`).join("");
  return [
    `<div class="v34-form" data-testid="system-field-form">`,
    `<input type="hidden" id="builder-field-system" value="${escapeHtml(system.id)}">`,
    `<label><span>Сущность</span><select id="builder-field-entity">${entityOptions}</select></label>`,
    `<label><span>Название поля</span><input id="builder-field-name" autocomplete="off" value=""></label>`,
    `<label><span>Тип</span><select id="builder-field-type">${SYSTEM_FIELD_TYPES.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}</select></label>`,
    `<label><span>Варианты (для select, через запятую)</span><input id="builder-field-options" autocomplete="off" value=""></label>`,
    `<label class="checkbox-field"><input type="checkbox" id="builder-field-required"><span>Обязательное</span></label>`,
    button("add-system-entity-field", "Добавить поле", { kind: "primary", testId: "add-system-entity-field", disabled: !system.entities.length }),
    `</div>`
  ].join("");
}

const SYSTEM_VIEW_MODES = [["list", "feed-bubble"], ["table", "table-row"], ["card", "card"]];

function systemViewSwitch(systemId, activeRenderer) {
  return `<div class="system-view-switch" data-testid="system-view-switch">${SYSTEM_VIEW_MODES.map(([label, mode]) => button("set-system-view", label, { id: systemId + "::" + mode, kind: mode === activeRenderer ? "primary" : "ghost", testId: "system-view-" + label })).join("")}</div>`;
}

function systemRecordActions(record) {
  return `${button("edit-system-record", "Изменить", { id: record.id, kind: "ghost", testId: "edit-system-record" })}${button("toggle-system-record-state", record.lifecycleState === "archived" ? "Вернуть" : "Архивировать", { id: record.id, kind: "ghost", testId: "toggle-system-record-state" })}`;
}

function systemRecordRows(records, renderer) {
  if (!records.length) return `<div class="empty-inline">Записей пока нет.</div>`;
  if (renderer === "table-row") {
    const rows = records.map((record) => {
      const item = presentArtifact(record, "system-record");
      return `${renderArtifactByMode(item, renderer)}<tr class="system-record-actions-row" data-testid="system-record-row"><td colspan="4" class="v34-row-actions">${systemRecordActions(record)}</td></tr>`;
    }).join("");
    return `<table><tbody>${rows}</tbody></table>`;
  }
  const markup = records.map((record) => {
    const item = presentArtifact(record, "system-record");
    const preview = renderArtifactByMode(item, renderer);
    return `<div class="system-record-wrap" data-testid="system-record-row">${preview}<div class="v34-row-actions">${systemRecordActions(record)}</div></div>`;
  }).join("");
  return renderer === "feed-bubble" ? `<div class="system-record-list">${markup}</div>` : markup;
}

function systemRecordForm(system, entity, records, entityIndex, viewRenderer) {
  // ids are index-based, not name-based: entity/field names are free-form (often
  // Cyrillic-only), and stripping non-ASCII chars for an id slug would collapse
  // multiple distinct names to the same id - index is always unique and stable
  // for the duration of one render.
  const fieldInputs = entity.fields.map((field, fieldIndex) => {
    const inputId = "builder-record-field-" + entityIndex + "-" + fieldIndex;
    if (field.type === "select") {
      return `<label><span>${escapeHtml(field.name)}</span><select id="${inputId}">${field.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}</select></label>`;
    }
    const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";
    return `<label><span>${escapeHtml(field.name)}${field.required ? " *" : ""}</span><input id="${inputId}" type="${inputType}" autocomplete="off" value=""></label>`;
  }).join("");
  return [
    `<div class="v34-form" data-testid="system-record-form">`,
    `<h5>${escapeHtml(entity.name)}</h5>`,
    `<input type="hidden" id="builder-record-system-${entityIndex}" value="${escapeHtml(system.id)}">`,
    `<input type="hidden" id="builder-record-entity-${entityIndex}" value="${escapeHtml(entity.name)}">`,
    `<label><span>Название записи</span><input id="builder-record-title-${entityIndex}" autocomplete="off" value=""></label>`,
    fieldInputs,
    button("create-system-record", "Добавить запись", { id: String(entityIndex), kind: "primary", testId: "create-system-record-" + entityIndex }),
    systemRecordRows(records, viewRenderer),
    `</div>`
  ].join("");
}

function installedPackRow(pack) {
  return [
    `<article class="v34-object-row" data-testid="installed-pack-row">`,
    `<div><strong>${escapeHtml(pack.title)}</strong><span>${meta([pack.status, pack.installMode, pack.vendorCodeExecuted ? "код запускался" : "без внешнего кода"])}</span></div>`,
    `<div class="v34-row-actions">${graphButton(pack.id)}${pack.systemId ? button("open-graph-node", "Система", { id: pack.systemId, kind: "ghost", testId: "open-installed-system" }) : ""}</div>`,
    `</article>`
  ].join("");
}

export function renderSystems(ctx, variant = "systems") {
  const systems = sortRecent(live(ctx.systemDefinitions));
  const installed = sortRecent(live(ctx.installedPacks));
  const isBuilder = variant === "builder";
  const focusedSystem = (ctx.selectedGraph?.kind === "system" ? systems.find((system) => system.id === ctx.selectedGraph.id) : null) || systems[0] || null;
  const records = live(ctx.systemRecords || []);
  const body = [
    `<div class="v34-workspace ${isBuilder ? "v34-builder-workspace" : "v34-systems-workbench"}" data-testid="${isBuilder ? "builder-workspace" : "systems-workbench"}">`,
    `<section class="v34-overview">`,
    miniStat("системы", String(systems.length), "teal"),
    miniStat("установки", String(installed.length), "purple"),
    miniStat("пакеты", String(live(ctx.marketplacePacks).length), "amber"),
    miniStat("базы", String(live(ctx.customDatabases).length), "blue"),
    `</section>`,
    `<div class="v34-split">`,
    `<section class="v34-panel">`,
    `<header><h3>${isBuilder ? "Конструктор примитивов" : "Системы"}</h3>${button("set-surface", "Marketplace", { id: "marketplace", kind: "ghost", testId: "systems-open-marketplace" })}</header>`,
    `<div class="v34-form" data-testid="create-system-form">`,
    `<label><span>Название системы</span><input id="system-title" autocomplete="off" value="${isBuilder ? "Моя новая система" : ""}"></label>`,
    `<label><span>Тип</span><select id="system-kind"><option value="custom">custom</option><option value="crm">crm</option><option value="learning">learning</option><option value="operations">operations</option><option value="home">home</option></select></label>`,
    button("create-system", "Создать систему", { kind: "primary", testId: "create-system" }),
    `</div>`,
    isBuilder ? `<div class="v34-primitive-strip" data-testid="builder-primitives"><span>source</span><span>artifact</span><span>event</span><span>channel</span><span>view</span><span>action</span><span>adapter</span></div>` : "",
    safeList(systems, systemRow, `<div class="empty-inline">Создай первую систему или установи локальный пакет.</div>`),
    `</section>`,
    `<aside class="v34-panel">`,
    `<header><h3>Установленные пакеты</h3>${button("set-surface", "Граф", { id: "graph", kind: "ghost", testId: "systems-open-graph" })}</header>`,
    safeList(installed, installedPackRow, `<div class="empty-inline">Установленные локальные пакеты будут видны здесь как receipts.</div>`),
    `</aside>`,
    `</div>`,
    isBuilder && focusedSystem ? [
      `<section class="v34-panel" data-testid="system-entity-fields-panel">`,
      `<header><h3>Типизированные поля: ${escapeHtml(focusedSystem.title)}</h3></header>`,
      safeList(focusedSystem.entities, (entity) => `<div class="entity-fields-row" data-testid="entity-fields-row"><strong>${escapeHtml(entity.name)}</strong>${entityFieldBadges(entity)}</div>`, `<div class="empty-inline">У системы пока нет сущностей.</div>`),
      systemEntityFieldForm(focusedSystem),
      `</section>`,
      `<section class="v34-panel" data-testid="system-records-panel">`,
      `<header><h3>Записи</h3>${systemViewSwitch(focusedSystem.id, (ctx.designStudio?.viewPresets?.["system:" + focusedSystem.id]?.renderer) || "table-row")}</header>`,
      focusedSystem.entities.map((entity, entityIndex) => systemRecordForm(focusedSystem, entity, records.filter((record) => record.systemId === focusedSystem.id && record.entityName === entity.name), entityIndex, (ctx.designStudio?.viewPresets?.["system:" + focusedSystem.id]?.renderer) || "table-row")).join(""),
      `</section>`
    ].join("") : "",
    `</div>`
  ].join("");
  return renderWorkspaceLayout(
    isBuilder ? "builder" : "systems",
    isBuilder ? "Builder" : "Системы",
    isBuilder ? "Сборка личных систем из примитивов: сущности, поля, виды, действия и политики." : "Любая личная система хранится как артефакт, видна в графе и экспортируется из контроля.",
    body,
    { testId: isBuilder ? "workspace-builder" : "workspace-systems", kicker: "v34" }
  );
}

export function renderProjects(ctx) {
  const projects = sortRecent(live(ctx.projects));
  const items = sortRecent(live(ctx.projectItems));
  const selectedProjectId = projects[0]?.id || "";
  const body = [
    `<div class="v34-workspace v34-projects-workspace" data-testid="projects-workspace">`,
    `<section class="v34-overview">`,
    miniStat("проекты", String(projects.length), "red"),
    miniStat("пункты", String(items.length), "amber"),
    miniStat("задачи", String((ctx.tasks || []).length), "blue"),
    miniStat("заметки", String((ctx.notes || []).length), "teal"),
    `</section>`,
    `<div class="v34-split">`,
    `<section class="v34-panel">`,
    `<header><h3>Проекты</h3>${button("set-surface", "Сегодня", { id: "today", kind: "ghost", testId: "projects-open-today" })}</header>`,
    `<div class="v34-form" data-testid="create-project-form">`,
    `<label><span>Новый проект</span><input id="project-title" autocomplete="off" value=""></label>`,
    button("create-project", "Создать проект", { kind: "primary", testId: "create-project" }),
    `</div>`,
    safeList(
      projects,
      (project) => `<article class="v34-object-row" data-testid="project-row"><div><strong>${escapeHtml(project.title)}</strong><span>${meta([project.status, project.nextAction])}</span></div><div class="v34-row-actions">${graphButton(project.id)}${noteButton(project.noteId)}</div></article>`,
      `<div class="empty-inline">Проекты появятся после создания.</div>`
    ),
    `</section>`,
    `<aside class="v34-panel">`,
    `<header><h3>Решения и действия</h3></header>`,
    `<div class="v34-form" data-testid="add-project-item-form">`,
    `<label><span>Проект</span><select id="project-select">${options(projects, selectedProjectId)}</select></label>`,
    `<label><span>Пункт</span><input id="project-item-title" autocomplete="off" value=""></label>`,
    `<label><span>Тип</span><select id="project-item-kind"><option value="decision">решение</option><option value="task">задача</option><option value="risk">риск</option><option value="note">заметка</option></select></label>`,
    button("add-project-item", "Добавить пункт", { kind: "primary", testId: "add-project-item", disabled: !projects.length }),
    `</div>`,
    safeList(
      items,
      (item) => `<article class="v34-object-row" data-testid="project-item-row"><div><strong>${escapeHtml(item.title)}</strong><span>${meta([item.kind, item.status, projects.find((project) => project.id === item.projectId)?.title || "проект"])}</span></div><div class="v34-row-actions">${graphButton(item.id)}</div></article>`,
      `<div class="empty-inline">Добавь решение, риск или следующий шаг проекта.</div>`
    ),
    `</aside>`,
    `</div>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("projects", "Проекты", "Рабочий контур: проекты, решения, риски, задачи и документы в одной связанной системе.", body, { testId: "workspace-projects", kicker: "Работа" });
}

export function renderModelHub(ctx) {
  const models = sortRecent(live(ctx.modelProfiles));
  const runs = sortRecent((ctx.providerRuns || []).filter((run) => run.providerId === "models" || run.providerId === "ollama")).slice(0, 6);
  const body = [
    `<div class="v34-workspace v34-models-workspace" data-testid="models-workspace">`,
    `<section class="v34-overview">`,
    miniStat("маршруты", String(models.length), "blue"),
    miniStat("проверки", String(runs.length), "teal"),
    miniStat("локально", "owner-run", "amber"),
    `</section>`,
    `<div class="v34-split">`,
    `<section class="v34-panel">`,
    `<header><h3>Model Hub</h3><div class="v34-row-actions">${button("probe-ollama", "Проверить Ollama", { kind: "ghost", testId: "model-probe-ollama" })}${button("test-ollama-generation", "Тест генерации", { kind: "ghost", testId: "model-test-ollama-generation" })}</div></header>`,
    `<div class="v34-form" data-testid="add-model-form">`,
    `<label><span>Название</span><input id="model-title" autocomplete="off" value=""></label>`,
    `<label><span>Endpoint</span><input id="model-endpoint" autocomplete="off" value=""></label>`,
    `<label><span>Тип</span><select id="model-kind"><option value="local-llm">local-llm</option><option value="owner-key">owner-key</option><option value="cloud-gated">cloud-gated</option></select></label>`,
    button("add-model-profile", "Добавить маршрут", { kind: "primary", testId: "add-model-profile" }),
    `</div>`,
    safeList(
      models,
      (model) => `<article class="v34-object-row" data-testid="model-row"><div><strong>${escapeHtml(model.title)}</strong><span>${meta([model.kind, statusLabel(model.status), model.endpoint || "owner-provided", model.boundary])}</span></div><div class="v34-row-actions">${button("verify-model-route", "Проверить", { id: model.id, kind: "ghost", testId: "verify-model-route" })}${graphButton(model.id)}${noteButton(model.noteId)}</div></article>`,
      `<div class="empty-inline">Маршруты моделей появятся после добавления.</div>`
    ),
    `</section>`,
    `<aside class="v34-panel">`,
    `<header><h3>История проверок</h3>${button("set-surface", "Провайдеры", { id: "providers", kind: "ghost", testId: "models-open-providers" })}</header>`,
    safeList(runs, (run) => `<article class="v34-object-row" data-testid="model-run-row"><div><strong>${escapeHtml(run.providerId || "provider")}</strong><span>${meta([run.kind, statusLabel(run.status), run.summary])}</span></div></article>`, `<div class="empty-inline">Проверки маршрутов будут записываться здесь и в Data Control.</div>`),
    `</aside>`,
    `</div>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("models", "Model Hub", "Маршруты AI видны как паспорта: статус, граница данных, проверка без скрытой отправки.", body, { testId: "workspace-models", kicker: "AI" });
}

export function renderSmartHome(ctx) {
  const devices = sortRecent(live(ctx.smartHomeDevices));
  const events = sortRecent(live(ctx.smartHomeEvents));
  const selectedDeviceId = devices[0]?.id || "";
  const provider = (ctx.providers || []).find((row) => row.key === "smartHome")?.provider || {};
  const body = [
    `<div class="v34-workspace v34-smart-home-workspace" data-testid="smart-home-workspace">`,
    `<section class="v34-overview">`,
    miniStat("устройства", String(devices.length), "teal"),
    miniStat("события", String(events.length), "amber"),
    miniStat("статус", statusLabel(provider.status || "not-connected"), "red"),
    `</section>`,
    `<div class="v34-split">`,
    `<section class="v34-panel">`,
    `<header><h3>Устройства</h3>${button("prepare-provider", "Подготовить hub", { id: "smartHome", kind: "ghost", testId: "prepare-smart-home-provider" })}</header>`,
    `<div class="v34-form" data-testid="add-home-device-form">`,
    `<label><span>Устройство</span><input id="home-device-title" autocomplete="off" value=""></label>`,
    `<label><span>Комната</span><input id="home-device-room" autocomplete="off" value=""></label>`,
    button("add-smart-home-device", "Добавить устройство", { kind: "primary", testId: "add-smart-home-device" }),
    `</div>`,
    safeList(
      devices,
      (device) => `<article class="v34-object-row" data-testid="smart-home-device-row"><div><strong>${escapeHtml(device.title)}</strong><span>${meta([device.room, device.provider, statusLabel(device.status)])}</span></div><div class="v34-row-actions">${graphButton(device.id)}${noteButton(device.noteId)}</div></article>`,
      `<div class="empty-inline">Добавь устройство вручную или подключи локальный hub позже.</div>`
    ),
    `</section>`,
    `<aside class="v34-panel">`,
    `<header><h3>События дома</h3></header>`,
    `<div class="v34-form" data-testid="home-event-form">`,
    `<label><span>Устройство</span><select id="home-device-select">${options(devices, selectedDeviceId)}</select></label>`,
    `<label><span>Событие</span><input id="home-event-text" autocomplete="off" value=""></label>`,
    button("record-smart-home-event", "Записать событие", { kind: "primary", testId: "record-smart-home-event", disabled: !devices.length }),
    `</div>`,
    safeList(events, (event) => `<article class="v34-object-row" data-testid="smart-home-event-row"><div><strong>${escapeHtml(event.title)}</strong><span>${meta([statusLabel(event.status), devices.find((device) => device.id === event.deviceId)?.title || "устройство"])}</span></div><div class="v34-row-actions">${graphButton(event.id)}</div></article>`, `<div class="empty-inline">События записываются вручную до подключения hub.</div>`),
    `</aside>`,
    `</div>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("smart-home", "Умный дом", "Карта устройств и событий без скрытого управления: локальный hub подключается только явно.", body, { testId: "workspace-smart-home", kicker: "Дом" });
}

export function renderMarketplace(ctx) {
  const packs = sortRecent(live(ctx.marketplacePacks));
  const installed = sortRecent(live(ctx.installedPacks));
  const body = [
    `<div class="v34-workspace v34-marketplace-workspace" data-testid="marketplace-workspace">`,
    `<section class="v34-overview">`,
    miniStat("пакеты", String(packs.length), "purple"),
    miniStat("установлено", String(installed.length), "teal"),
    miniStat("режим", "local-definition", "amber"),
    `</section>`,
    `<div class="v34-panel">`,
    `<header><h3>Локальные пакеты систем</h3>${button("set-surface", "Системы", { id: "systems", kind: "ghost", testId: "marketplace-open-systems" })}</header>`,
    `<div class="v34-pack-grid">`,
    safeList(
      packs,
      (pack) => {
        const isInstalled = installed.some((item) => item.packId === pack.id);
        return [
          `<article class="v34-pack-card" data-testid="marketplace-pack-row">`,
          `<header><strong>${escapeHtml(pack.title)}</strong><mark>${escapeHtml(pack.kind || "pack")}</mark></header>`,
          `<p>${escapeHtml(compactText(pack.description || "", 160))}</p>`,
          `<div class="v34-chip-line">${(pack.entities || []).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`,
          `<footer>${button("install-pack", isInstalled ? "Установлено" : "Установить локально", { id: pack.id, kind: isInstalled ? "ghost" : "primary", testId: "install-pack", disabled: isInstalled })}${graphButton(pack.id)}${noteButton(pack.noteId)}</footer>`,
          `</article>`
        ].join("");
      },
      `<div class="empty-inline">Пакеты появятся из локального registry.</div>`
    ),
    `</div>`,
    `</div>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("marketplace", "Marketplace", "Паки устанавливаются как локальные system definitions без запуска чужого кода.", body, { testId: "workspace-marketplace", kicker: "Системы" });
}

const M0_PROOF_SOURCES = [
  { type: "artifact", label: "note", pick: (ctx) => ctx.notes },
  { type: "agent-run", label: "agent_report", pick: (ctx) => ctx.agentRuns },
  { type: "installed-pack", label: "import_receipt", pick: (ctx) => ctx.installedPacks }
];

function m0ProofSection(ctx) {
  const groups = M0_PROOF_SOURCES.map(({ type, label, pick }) => {
    const record = (pick(ctx) || [])[0] || null;
    const item = presentArtifact(record || { title: `Нет данных: ${label}` }, type);
    const previews = RENDERER_MODES.map((mode) => {
      const markup = mode === "table-row"
        ? `<table><tbody>${renderArtifactByMode(item, mode)}</tbody></table>`
        : mode === "timeline"
          ? `<ul>${renderArtifactByMode(item, mode)}</ul>`
          : renderArtifactByMode(item, mode);
      return `<div class="renderer-preview" data-testid="renderer-preview-${escapeHtml(mode)}"><span>${escapeHtml(mode)}</span>${markup}</div>`;
    }).join("");
    return `<div class="m0-proof-group" data-testid="m0-proof-group" data-m0-type="${escapeHtml(type)}"><h4>${escapeHtml(label)} (M0)</h4><div class="m0-proof-grid">${previews}</div></div>`;
  }).join("");
  return `<section class="v34-panel m0-proof" data-testid="m0-proof-section"><header><h3>Доказательство M0: 3 типа × 4 рендера</h3></header>${groups}</section>`;
}

function viewPresetControls(ctx) {
  const surface = ctx.activeSurface || "inbox";
  const preset = (ctx.designStudio?.viewPresets || {})[surface] || { renderer: "card", density: "normal", grouping: "none" };
  return [
    `<div class="v34-form" data-testid="view-preset-form">`,
    `<label><span>Поверхность</span><input id="view-preset-surface" autocomplete="off" value="${escapeHtml(surface)}" readonly></label>`,
    `<label><span>Рендер</span><select id="view-preset-renderer">${RENDERER_MODES.map((mode) => `<option value="${escapeHtml(mode)}"${mode === preset.renderer ? " selected" : ""}>${escapeHtml(mode)}</option>`).join("")}</select></label>`,
    `<label><span>Плотность</span><select id="view-preset-density">${VIEW_PRESET_DENSITIES.map((density) => `<option value="${escapeHtml(density)}"${density === preset.density ? " selected" : ""}>${escapeHtml(density)}</option>`).join("")}</select></label>`,
    `<label><span>Группировка</span><select id="view-preset-grouping">${VIEW_PRESET_GROUPINGS.map((grouping) => `<option value="${escapeHtml(grouping)}"${grouping === preset.grouping ? " selected" : ""}>${escapeHtml(grouping)}</option>`).join("")}</select></label>`,
    button("save-view-preset", "Сохранить вид", { kind: "primary", testId: "save-view-preset" }),
    `</div>`
  ].join("");
}

export function renderDesignStudio(ctx) {
  const profiles = sortRecent(live(ctx.designProfiles));
  const activeId = ctx.designStudio?.activeProfileId || profiles[0]?.id || "";
  const mode = ctx.designStudio?.renderMode || profiles.find((profile) => profile.id === activeId)?.mode || "dashboard";
  const body = [
    `<div class="v34-workspace v34-design-workspace" data-testid="design-workspace">`,
    `<section class="v34-overview">`,
    miniStat("профили", String(profiles.length), "purple"),
    miniStat("активный", profiles.find((profile) => profile.id === activeId)?.title || "не выбран", "teal"),
    miniStat("вид", mode, "amber"),
    `</section>`,
    `<div class="v34-split">`,
    `<section class="v34-panel">`,
    `<header><h3>Design Studio</h3></header>`,
    `<div class="v34-form" data-testid="design-profile-form">`,
    `<label><span>Профиль</span><select id="design-profile-select">${options(profiles, activeId)}</select></label>`,
    `<label><span>Режим</span><select id="design-render-mode"><option value="dashboard"${mode === "dashboard" ? " selected" : ""}>dashboard</option><option value="graph"${mode === "graph" ? " selected" : ""}>graph</option><option value="timeline"${mode === "timeline" ? " selected" : ""}>timeline</option><option value="dense"${mode === "dense" ? " selected" : ""}>dense</option></select></label>`,
    button("save-design-profile", "Сохранить профиль", { kind: "primary", testId: "save-design-profile", disabled: !profiles.length }),
    `</div>`,
    `<header><h3>Вид поверхности (renderer/density/grouping)</h3></header>`,
    viewPresetControls(ctx),
    `</section>`,
    `<aside class="v34-panel">`,
    `<header><h3>Профили отображения</h3></header>`,
    safeList(profiles, (profile) => `<article class="v34-object-row" data-testid="design-profile-row"><div><strong>${escapeHtml(profile.title)}</strong><span>${meta([profile.mode, statusLabel(profile.status), profile.description])}</span></div><span class="v34-color-swatch" style="--swatch:${escapeHtml(profile.accent || "#0f766e")}"></span></article>`, `<div class="empty-inline">Профили дизайна будут доступны после инициализации.</div>`),
    `</aside>`,
    `</div>`,
    m0ProofSection(ctx),
    `</div>`
  ].join("");
  return renderWorkspaceLayout("design", "Design Studio", "Данные и оформление разделены: можно менять режимы отображения без миграции базы.", body, { testId: "workspace-design", kicker: "Вид" });
}

export function renderDatabases(ctx) {
  const databases = sortRecent(live(ctx.customDatabases));
  const rows = sortRecent(live(ctx.databaseRows));
  const selectedDatabaseId = databases[0]?.id || "";
  const body = [
    `<div class="v34-workspace v34-databases-workspace" data-testid="databases-workspace">`,
    `<section class="v34-overview">`,
    miniStat("базы", String(databases.length), "blue"),
    miniStat("строки", String(rows.length), "teal"),
    miniStat("виды", "table/cards/timeline/graph", "amber"),
    `</section>`,
    `<div class="v34-split">`,
    `<section class="v34-panel">`,
    `<header><h3>Персональные базы</h3></header>`,
    `<div class="v34-form" data-testid="database-form">`,
    `<label><span>Название базы</span><input id="database-title" autocomplete="off" value=""></label>`,
    button("add-database", "Создать базу", { kind: "primary", testId: "add-database" }),
    `</div>`,
    safeList(databases, (database) => `<article class="v34-object-row" data-testid="database-row"><div><strong>${escapeHtml(database.title)}</strong><span>${meta([statusLabel(database.status), `${(database.fields || []).length} поля`, (database.views || []).join(", ")])}</span></div><div class="v34-row-actions">${graphButton(database.id)}${noteButton(database.noteId)}</div></article>`, `<div class="empty-inline">Создай базу для CRM, коллекции, исследований или любых своих объектов.</div>`),
    `</section>`,
    `<aside class="v34-panel">`,
    `<header><h3>Строки</h3></header>`,
    `<div class="v34-form" data-testid="database-row-form">`,
    `<label><span>База</span><select id="database-select">${options(databases, selectedDatabaseId)}</select></label>`,
    `<label><span>Название строки</span><input id="database-row-title" autocomplete="off" value=""></label>`,
    `<label><span>Статус</span><select id="database-row-status"><option value="open">open</option><option value="active">active</option><option value="done">done</option><option value="review">review</option></select></label>`,
    button("add-database-row", "Добавить строку", { kind: "primary", testId: "add-database-row", disabled: !databases.length }),
    `</div>`,
    safeList(rows, (row) => `<article class="v34-object-row" data-testid="database-item-row"><div><strong>${escapeHtml(row.title)}</strong><span>${meta([statusLabel(row.status), databases.find((database) => database.id === row.databaseId)?.title || "база"])}</span></div><div class="v34-row-actions">${graphButton(row.id)}</div></article>`, `<div class="empty-inline">Строки появятся после добавления в выбранную базу.</div>`),
    `</aside>`,
    `</div>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("databases", "Базы", "Реляционные личные системы: поля, строки, виды, граф и экспорт в одном репозитории.", body, { testId: "workspace-databases", kicker: "Данные" });
}

export function renderScreenCompanion(ctx) {
  const sessions = sortRecent(live(ctx.screenCompanionSessions));
  const provider = (ctx.providers || []).find((row) => row.key === "screen")?.provider || {};
  const body = [
    `<div class="v34-workspace v34-screen-workspace" data-testid="screen-workspace">`,
    `<section class="v34-overview">`,
    miniStat("сессии", String(sessions.length), "blue"),
    miniStat("статус", statusLabel(provider.status || "permission-required"), "red"),
    miniStat("граница", "explicit permission", "amber"),
    `</section>`,
    `<div class="v34-split">`,
    `<section class="v34-panel">`,
    `<header><h3>Screen Companion</h3>${button("prepare-screen-companion", "Подготовить разрешение", { kind: "primary", testId: "prepare-screen-companion" })}</header>`,
    `<p class="v34-boundary">LifeOS не читает экран автоматически. Здесь создаётся только permission gate и запись в audit/provider runs.</p>`,
    `<div class="v34-boundary-grid"><span>scope</span><strong>${escapeHtml((provider.scopes || []).join(", ") || "screen-capture")}</strong><span>действие</span><strong>${escapeHtml(provider.requiredAction || "Нужно явное разрешение владельца.")}</strong></div>`,
    `</section>`,
    `<aside class="v34-panel">`,
    `<header><h3>Сессии</h3>${button("set-surface", "Провайдеры", { id: "providers", kind: "ghost", testId: "screen-open-providers" })}</header>`,
    safeList(sessions, (session) => `<article class="v34-object-row" data-testid="screen-session-row"><div><strong>${escapeHtml(session.title)}</strong><span>${meta([statusLabel(session.status), session.scope, session.summary])}</span></div><div class="v34-row-actions">${graphButton(session.id)}${noteButton(session.noteId)}</div></article>`, `<div class="empty-inline">Подготовь permission gate перед демонстрацией Screen Companion.</div>`),
    `</aside>`,
    `</div>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("screen", "Screen Companion", "Контекст экрана включается только через явное разрешение и оставляет проверяемый след.", body, { testId: "workspace-screen", kicker: "Разрешения" });
}

export function renderTwin(ctx) {
  const snapshots = sortRecent(live(ctx.personalTwinSnapshots));
  const body = [
    `<div class="v34-workspace v34-twin-workspace" data-testid="twin-workspace">`,
    `<section class="v34-overview">`,
    miniStat("снимки", String(snapshots.length), "red"),
    miniStat("заметки", String((ctx.notes || []).length), "blue"),
    miniStat("источники", String((ctx.sources || []).length), "teal"),
    miniStat("audit", String((ctx.auditLog || []).length), "amber"),
    `</section>`,
    `<div class="v34-panel">`,
    `<header><h3>Personal Twin / recovery memory</h3>${button("create-twin-snapshot", "Создать снимок", { kind: "primary", testId: "create-twin-snapshot" })}</header>`,
    `<p class="v34-boundary">Это локальный recovery-слепок контекста, а не внешняя копия личности. Он помогает понять, что уже есть в базе и что можно восстановить.</p>`,
    safeList(snapshots, (snapshot) => `<article class="v34-object-row" data-testid="twin-snapshot-row"><div><strong>${escapeHtml(snapshot.title)}</strong><span>${meta([statusLabel(snapshot.status), snapshot.summary])}</span></div><div class="v34-row-actions">${graphButton(snapshot.id)}${noteButton(snapshot.noteId)}</div></article>`, `<div class="empty-inline">Создай первый локальный снимок памяти и восстановления.</div>`),
    `</div>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("twin", "Personal Twin", "Снимки памяти, восстановления и контекста, которые остаются в локальном репозитории.", body, { testId: "workspace-twin", kicker: "Recovery" });
}

export const ARTIFACT_OS_ARCHITECTURE_VERSION = "v34-platform-primitives-1";
export const ARTIFACT_SCHEMA_VERSION = 4;

// Object Contract v4 (Seven Contracts, contract 1 "Object"): every record in every
// non-exempt collection carries these fields so any artifact can be inspected, scoped
// and traced the same way regardless of which collection it lives in. createdAt/updatedAt
// are the project's existing camelCase fields (kept as-is, not duplicated as created_at/
// updated_at) to match surrounding code style; the rest are new camelCase additions.
export const OBJECT_CONTRACT_V4_FIELDS = Object.freeze([
  "id", "type", "title", "owner", "sourceRefs", "artifactRefs", "relations",
  "lifecycleState", "privacyScope", "accessContour", "provenance", "confidence",
  "receipts", "createdAt", "updatedAt", "version"
]);

// auditLog/control/environment are not artifact instances: auditLog is an append-only
// event log with its own event shape, control/environment are singleton runtime-state
// records (one per vault), not individually-owned objects. Object Contract v4 applies to
// the other 44 collections only.
export const OBJECT_CONTRACT_EXEMPT_COLLECTIONS = Object.freeze(["auditLog", "control", "environment"]);

export function applyObjectContractV4(record, type) {
  const target = record && typeof record === "object" ? record : {};
  target.type = String(target.type || type || "artifact");
  target.title = String(target.title || target.name || "Untitled");
  target.owner = String(target.owner || "local-owner");
  target.sourceRefs = Array.isArray(target.sourceRefs) ? target.sourceRefs : (target.sourceId ? [String(target.sourceId)] : []);
  target.artifactRefs = Array.isArray(target.artifactRefs) ? target.artifactRefs : (target.noteId ? [String(target.noteId)] : []);
  target.relations = Array.isArray(target.relations) ? target.relations : [];
  target.lifecycleState = String(target.lifecycleState || (target.deleted ? "archived" : "active"));
  target.privacyScope = String(target.privacyScope || "private");
  target.accessContour = String(target.accessContour || "owner-only");
  target.provenance = target.provenance && typeof target.provenance === "object"
    ? target.provenance
    : { method: "manual", capturedAt: target.createdAt || new Date().toISOString() };
  target.confidence = Number.isFinite(Number(target.confidence)) ? Number(target.confidence) : 1;
  target.receipts = Array.isArray(target.receipts) ? target.receipts : [];
  target.version = Number.isFinite(Number(target.version)) && Number(target.version) > 0 ? Number(target.version) : 1;
  target.createdAt = String(target.createdAt || new Date().toISOString());
  target.updatedAt = String(target.updatedAt || target.createdAt);
  return target;
}

export function validateObjectContractV4(record) {
  const missing = OBJECT_CONTRACT_V4_FIELDS.filter((field) => !(record && Object.prototype.hasOwnProperty.call(record, field)));
  return { ok: missing.length === 0, missing };
}

export function applyObjectContractToState(state) {
  if (!state || typeof state !== "object") return state;
  for (const collection of ARTIFACT_COLLECTIONS) {
    if (OBJECT_CONTRACT_EXEMPT_COLLECTIONS.includes(collection.key)) continue;
    const bucket = state[collection.key];
    if (!bucket || typeof bucket !== "object") continue;
    for (const record of Object.values(bucket)) {
      applyObjectContractV4(record, collection.ownerType);
    }
  }
  return state;
}

// System Factory typed fields (P3.1): a system's entities carry typed fields so
// Builder validates data instead of storing free-form strings. relation fields point
// at another entity name within the same or another systemDefinition.
export const SYSTEM_FIELD_TYPES = Object.freeze(["text", "number", "date", "select", "relation"]);

export function normalizeSystemField(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    name: String(source.name || "Поле").trim() || "Поле",
    type: SYSTEM_FIELD_TYPES.includes(source.type) ? source.type : "text",
    options: Array.isArray(source.options) ? source.options.map((option) => String(option).trim()).filter(Boolean) : [],
    required: Boolean(source.required)
  };
}

export function normalizeSystemEntity(input) {
  if (typeof input === "string") return { name: input.trim() || "Сущность", fields: [] };
  const source = input && typeof input === "object" ? input : {};
  return {
    name: String(source.name || "Сущность").trim() || "Сущность",
    fields: Array.isArray(source.fields) ? source.fields.map(normalizeSystemField) : []
  };
}

export function validateSystemFieldValue(field, rawValue) {
  const value = rawValue === undefined || rawValue === null ? "" : rawValue;
  if (field.required && String(value).trim() === "") {
    return { ok: false, value: "", error: `Поле "${field.name}" обязательно` };
  }
  if (String(value).trim() === "") return { ok: true, value: "" };
  if (field.type === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return { ok: false, value: "", error: `Поле "${field.name}" должно быть числом` };
    return { ok: true, value: parsed };
  }
  if (field.type === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return { ok: false, value: "", error: `Поле "${field.name}" должно быть датой YYYY-MM-DD` };
    return { ok: true, value: String(value) };
  }
  if (field.type === "select") {
    if (field.options.length && !field.options.includes(String(value))) return { ok: false, value: "", error: `Поле "${field.name}": значение не входит в список вариантов` };
    return { ok: true, value: String(value) };
  }
  return { ok: true, value: String(value) };
}

// System Factory triggers (P3.3): declarative, not code - a trigger just names a
// condition (on-create/on-field-change/daily) and an action type. Firing always
// produces a dry-run proposal first (see app.js fireSystemTriggerDryRun); nothing
// applies without the owner confirming the proposal, same as every other proposal.
export const SYSTEM_TRIGGER_KINDS = Object.freeze(["on-create", "on-field-change", "daily"]);

export function normalizeSystemTrigger(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    id: String(source.id || ""),
    kind: SYSTEM_TRIGGER_KINDS.includes(source.kind) ? source.kind : "on-create",
    entityName: String(source.entityName || "").trim(),
    fieldName: String(source.fieldName || "").trim(),
    actionType: String(source.actionType || "task").trim() || "task",
    lastFiredDay: String(source.lastFiredDay || "")
  };
}

export function validateSystemRecordFields(entity, rawValues = {}) {
  const errors = [];
  const values = {};
  for (const field of entity.fields) {
    const result = validateSystemFieldValue(field, rawValues[field.name]);
    if (!result.ok) errors.push(result.error);
    else values[field.name] = result.value;
  }
  return { ok: errors.length === 0, values, errors };
}

export const ARTIFACT_COLLECTIONS = Object.freeze([
  { key: "folders", ownerType: "space", primarySurface: "library", projection: "vault tree", graph: true, audit: true },
  { key: "notes", ownerType: "artifact", primarySurface: "library", projection: "markdown note", graph: true, audit: true },
  { key: "sources", ownerType: "source", primarySurface: "capture", projection: "source artifact", graph: true, audit: true },
  { key: "tasks", ownerType: "task", primarySurface: "today", projection: "today item", graph: true, audit: true },
  { key: "planBlocks", ownerType: "calendar-block", primarySurface: "calendar", projection: "time block", graph: true, audit: true },
  { key: "reminders", ownerType: "reminder", primarySurface: "today", projection: "reminder row", graph: true, audit: true },
  { key: "financeAccounts", ownerType: "finance-account", primarySurface: "finance", projection: "balance card", graph: true, audit: true },
  { key: "financeTransactions", ownerType: "finance-transaction", primarySurface: "finance", projection: "transaction row", graph: true, audit: true },
  { key: "budgets", ownerType: "budget", primarySurface: "finance", projection: "budget envelope", graph: true, audit: true },
  { key: "subscriptions", ownerType: "subscription", primarySurface: "finance", projection: "bill row", graph: true, audit: true },
  { key: "habits", ownerType: "habit", primarySurface: "habits", projection: "check-in row", graph: true, audit: true },
  { key: "goals", ownerType: "goal", primarySurface: "goals", projection: "goal progress", graph: true, audit: true },
  { key: "insights", ownerType: "insight", primarySurface: "library", projection: "knowledge insight", graph: true, audit: true },
  { key: "claims", ownerType: "knowledge-card", primarySurface: "library", projection: "claim card", graph: true, audit: true },
  { key: "questions", ownerType: "question", primarySurface: "library", projection: "learning question", graph: true, audit: true },
  { key: "reviewItems", ownerType: "review-item", primarySurface: "library", projection: "review queue", graph: true, audit: true },
  { key: "readingItems", ownerType: "reading-item", primarySurface: "reader", projection: "reading progress", graph: true, audit: true },
  { key: "highlights", ownerType: "highlight", primarySurface: "reader", projection: "highlight card", graph: true, audit: true },
  { key: "transcriptSegments", ownerType: "transcript", primarySurface: "player", projection: "transcript segment", graph: true, audit: true },
  { key: "audioCheckpoints", ownerType: "audio-checkpoint", primarySurface: "player", projection: "checkpoint", graph: true, audit: true },
  { key: "playerNotes", ownerType: "player-note", primarySurface: "player", projection: "audio note", graph: true, audit: true },
  { key: "proposals", ownerType: "proposal", primarySurface: "capture", projection: "approval card", graph: true, audit: true },
  { key: "chatMessages", ownerType: "chat-message", primarySurface: "chat", projection: "artifact chat", graph: true, audit: true },
  { key: "agentRuns", ownerType: "agent-run", primarySurface: "agents", projection: "dry-run record", graph: true, audit: true },
  { key: "flowRuns", ownerType: "flow-run", primarySurface: "flows", projection: "automation run", graph: true, audit: true },
  { key: "flows", ownerType: "flow-definition", primarySurface: "flows", projection: "trigger-condition-action", graph: true, audit: true },
  { key: "providerRuns", ownerType: "provider-run", primarySurface: "providers", projection: "provider receipt", graph: false, audit: true },
  { key: "providers", ownerType: "provider-state", primarySurface: "providers", projection: "provider passport", graph: false, audit: true },
  { key: "savedSearches", ownerType: "saved-search", primarySurface: "library", projection: "search lens", graph: true, audit: true },
  { key: "channels", ownerType: "event-channel", primarySurface: "feed", projection: "life event lane", graph: true, audit: true },
  { key: "systemDefinitions", ownerType: "system-definition", primarySurface: "systems", projection: "system contract", graph: true, audit: true },
  { key: "systemRecords", ownerType: "system-record", primarySurface: "systems", projection: "custom system object", graph: true, audit: true },
  { key: "projects", ownerType: "project", primarySurface: "projects", projection: "work/project hub", graph: true, audit: true },
  { key: "projectItems", ownerType: "project-item", primarySurface: "projects", projection: "project action/decision", graph: true, audit: true },
  { key: "modelProfiles", ownerType: "model-profile", primarySurface: "models", projection: "model route passport", graph: true, audit: true },
  { key: "smartHomeDevices", ownerType: "smart-home-device", primarySurface: "smart-home", projection: "device row", graph: true, audit: true },
  { key: "smartHomeEvents", ownerType: "smart-home-event", primarySurface: "smart-home", projection: "device event", graph: true, audit: true },
  { key: "marketplacePacks", ownerType: "marketplace-pack", primarySurface: "marketplace", projection: "installable pack", graph: true, audit: true },
  { key: "installedPacks", ownerType: "installed-pack", primarySurface: "marketplace", projection: "local package receipt", graph: true, audit: true },
  { key: "designProfiles", ownerType: "design-profile", primarySurface: "design", projection: "render mode/theme", graph: true, audit: true },
  { key: "customDatabases", ownerType: "database-definition", primarySurface: "databases", projection: "relational system", graph: true, audit: true },
  { key: "databaseRows", ownerType: "database-row", primarySurface: "databases", projection: "record row", graph: true, audit: true },
  { key: "screenCompanionSessions", ownerType: "screen-companion-session", primarySurface: "screen", projection: "permission-gated screen receipt", graph: true, audit: true },
  { key: "personalTwinSnapshots", ownerType: "personal-twin-snapshot", primarySurface: "twin", projection: "recovery memory snapshot", graph: true, audit: true },
  { key: "auditLog", ownerType: "audit-event", primarySurface: "control", projection: "human receipt", graph: false, audit: true },
  { key: "control", ownerType: "control-state", primarySurface: "control", projection: "export/recover map", graph: false, audit: true },
  { key: "environment", ownerType: "environment-state", primarySurface: "providers", projection: "local runtime", graph: false, audit: true }
]);

export const WORKSPACE_CONTRACTS = Object.freeze([
  { surface: "inbox", job: "daily command center", primaryAction: "capture", collections: ["sources", "tasks", "financeTransactions", "habits", "goals", "proposals"] },
  { surface: "capture", job: "inbox review", primaryAction: "analyze", collections: ["sources", "proposals", "auditLog"] },
  { surface: "today", job: "execute calmly", primaryAction: "complete-next", collections: ["tasks", "planBlocks", "reminders", "habits"] },
  { surface: "calendar", job: "plan time", primaryAction: "schedule", collections: ["planBlocks", "tasks", "reminders"] },
  { surface: "finance", job: "understand money", primaryAction: "review-transaction", collections: ["financeAccounts", "financeTransactions", "budgets", "subscriptions"] },
  { surface: "habits", job: "track rhythm", primaryAction: "check-in", collections: ["habits", "goals"] },
  { surface: "goals", job: "move life direction", primaryAction: "choose-next-step", collections: ["goals", "tasks", "habits", "financeTransactions"] },
  { surface: "library", job: "second brain", primaryAction: "write-note", collections: ["notes", "claims", "questions", "reviewItems", "savedSearches"] },
  { surface: "reader", job: "read and extract", primaryAction: "highlight", collections: ["readingItems", "highlights", "sources"] },
  { surface: "player", job: "listen and transcribe", primaryAction: "save-transcript", collections: ["sources", "transcriptSegments", "audioCheckpoints", "playerNotes"] },
  { surface: "chat", job: "artifact conversation", primaryAction: "send-message", collections: ["chatMessages", "proposals", "providerRuns"] },
  { surface: "agents", job: "agent dry-run", primaryAction: "run-dry-run", collections: ["agentRuns", "flowRuns", "proposals"] },
  { surface: "flows", job: "automation dry-run", primaryAction: "run-flow", collections: ["flows", "flowRuns", "proposals"] },
  { surface: "feed", job: "show life event stream", primaryAction: "inspect-event", collections: ["channels", "auditLog", "sources", "proposals", "providerRuns"] },
  { surface: "systems", job: "create any personal system", primaryAction: "create-system", collections: ["systemDefinitions", "systemRecords", "installedPacks"] },
  { surface: "builder", job: "define system primitives", primaryAction: "materialize-system-contract", collections: ["systemDefinitions", "systemRecords", "flows", "agentRuns"] },
  { surface: "projects", job: "operate work/projects", primaryAction: "add-project-item", collections: ["projects", "projectItems", "tasks", "planBlocks", "notes"] },
  { surface: "models", job: "route local and owner-key AI", primaryAction: "verify-model-route", collections: ["modelProfiles", "providers", "providerRuns"] },
  { surface: "smart-home", job: "track local home devices safely", primaryAction: "record-device-event", collections: ["smartHomeDevices", "smartHomeEvents", "providers"] },
  { surface: "marketplace", job: "install local system packs", primaryAction: "install-pack", collections: ["marketplacePacks", "installedPacks", "systemDefinitions"] },
  { surface: "design", job: "choose render modes and themes", primaryAction: "save-design-profile", collections: ["designProfiles", "systemDefinitions"] },
  { surface: "databases", job: "build relational personal systems", primaryAction: "add-database-row", collections: ["customDatabases", "databaseRows", "systemDefinitions"] },
  { surface: "screen", job: "prepare permission-gated screen companion", primaryAction: "prepare-screen-session", collections: ["screenCompanionSessions", "providers", "providerRuns"] },
  { surface: "twin", job: "recover context and personal memory", primaryAction: "create-twin-snapshot", collections: ["personalTwinSnapshots", "auditLog", "notes", "sources"] },
  { surface: "graph", job: "explain relationships", primaryAction: "inspect-node", collections: ["notes", "sources", "tasks", "financeTransactions", "habits", "goals"] },
  { surface: "control", job: "trust and recover", primaryAction: "export-or-recover", collections: ["auditLog", "control", "providerRuns"] },
  { surface: "providers", job: "connect safely", primaryAction: "probe-provider", collections: ["providers", "providerRuns", "environment"] }
]);

export const MODULE_BOUNDARIES = Object.freeze([
  { key: "storage-kernel", file: "app.js", owns: ["LocalRepository", "ReactiveStore", "normalizeState"], proves: ["state adapters", "schema docs"] },
  { key: "architecture-contract", file: "artifact-os-architecture.mjs", owns: ["collections", "workspaces", "event bus", "module boundaries"], proves: ["code splitting", "module boundaries", "schema docs"] },
  { key: "capture-analyzer", file: "app.js", owns: ["analyzeArtifactInput", "analyzeSourceArtifact"], proves: ["input -> Artifact -> proposals"] },
  { key: "projection-renderers", file: "app.js", owns: ["workspace renderers", "Data Control", "Graph"], proves: ["workspace lenses"] },
  { key: "v34-platform-primitives", file: "app.js", owns: ["channels", "systems", "projects", "models", "smart-home", "marketplace"], proves: ["system builder", "event feed", "local pack install"] },
  { key: "v34-workspace-renderers", file: "ui/v34-platform.js", owns: ["feed", "systems", "builder", "models", "smart-home", "marketplace", "design", "databases", "screen", "twin"], proves: ["no route shell", "owner-visible controls"] },
  { key: "provider-boundaries", file: "app.js", owns: ["Ollama", "PWA", "STT/OCR gates"], proves: ["honest provider gates"] },
  { key: "journey-tests", file: "output/playwright", owns: ["market-owner", "final journeys", "owner rescue"], proves: ["visual/e2e proof"] }
]);

export const STATE_ADAPTERS = Object.freeze([
  { key: "indexeddb-chunked", storage: "IndexedDB", boundary: "LocalRepository.save/load", fallback: "localStorage chunks" },
  { key: "localstorage-fallback", storage: "localStorage", boundary: "FALLBACK_PREFIX chunks", fallback: "Data Control export" },
  { key: "service-worker-shell", storage: "Cache API", boundary: "service-worker.js", fallback: "network navigation" },
  { key: "provider-passport", storage: "repository state", boundary: "providers/providerRuns", fallback: "honest blocked state" },
  { key: "v34-local-pack-registry", storage: "repository state", boundary: "marketplacePacks/installedPacks", fallback: "systemDefinitions without external code" },
  { key: "screen-permission-gate", storage: "repository state", boundary: "screenCompanionSessions/providerRuns", fallback: "manual source import" },
  { key: "test-harness", storage: "window.__lifeosKnowledgeBase", boundary: "read-only snapshots + explicit test commits", fallback: "audits fail closed" }
]);

export const ARCHITECTURE_INVARIANTS = Object.freeze([
  "one ReactiveStore instance owns mutable state",
  "all workspace routes read the shared Artifact repository",
  "mutations go through repository commits or audited test helpers",
  "every accepted proposal writes audit/control evidence",
  "provider actions are explicit and never fake readiness",
  "architecture events are persisted in Data Control",
  "v34 systems are built from shared primitives, not route-only pages",
  "screen and smart-home capabilities stay permission-gated until the owner explicitly connects them"
]);

export function architectureCollectionKeys() {
  return ARTIFACT_COLLECTIONS.map((collection) => collection.key);
}

export function architectureWorkspaceKeys() {
  return WORKSPACE_CONTRACTS.map((workspace) => workspace.surface);
}

export function countArchitectureCollection(state, key) {
  const value = state ? state[key] : null;
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

export function normalizeArchitectureEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.slice(-80).map((event) => ({
    id: String(event.id || ""),
    type: String(event.type || "architecture.event"),
    summary: String(event.summary || ""),
    activeSurface: String(event.activeSurface || ""),
    activeArtifactId: String(event.activeArtifactId || ""),
    revision: Number.isFinite(Number(event.revision)) ? Number(event.revision) : 0,
    createdAt: String(event.createdAt || "")
  }));
}

export function recordArchitectureEvent(state, type, summary, details = {}) {
  if (!state || typeof state !== "object") return null;
  state.control = state.control && typeof state.control === "object" ? state.control : {};
  const events = normalizeArchitectureEvents(state.control.architectureEvents);
  const event = {
    id: "arch_" + String(Date.now()) + "_" + String(events.length + 1),
    type: String(type || "architecture.event"),
    summary: String(summary || ""),
    activeSurface: String(details.activeSurface || state.activeSurface || ""),
    activeArtifactId: String(details.activeArtifactId || state.activeNoteId || ""),
    revision: Number.isFinite(Number(details.revision)) ? Number(details.revision) : 0,
    createdAt: String(details.createdAt || new Date().toISOString())
  };
  state.control.architectureEvents = events.concat(event).slice(-80);
  return event;
}

// Renderer Registry (Presentation Runtime, P2.1): every artifact type can be projected
// into any of these 4 render modes, plus a graph node (declared per-collection already
// via ARTIFACT_COLLECTIONS[].graph). M0 proof types are the 3 concrete types the plan
// requires to be demonstrated end-to-end: note, agent_report (from agentRuns) and
// import_receipt (from installedPacks - already the collection whose own projection is
// "local package receipt").
export const RENDERER_MODES = Object.freeze(["feed-bubble", "card", "table-row", "timeline"]);

export const RENDERER_REGISTRY = Object.freeze(
  ARTIFACT_COLLECTIONS.reduce((registry, collection) => {
    registry[collection.ownerType] = { modes: RENDERER_MODES, graphNode: Boolean(collection.graph) };
    return registry;
  }, {})
);

export const M0_PROOF_TYPES = Object.freeze(["artifact", "agent-run", "installed-pack"]);

export const VIEW_PRESET_DENSITIES = Object.freeze(["compact", "normal", "comfortable"]);
export const VIEW_PRESET_GROUPINGS = Object.freeze(["none", "day", "type", "status"]);

export function defaultViewPreset() {
  return { renderer: "card", density: "normal", grouping: "none" };
}

export function normalizeViewPreset(preset) {
  const base = defaultViewPreset();
  const input = preset && typeof preset === "object" ? preset : {};
  return {
    renderer: RENDERER_MODES.includes(input.renderer) ? input.renderer : base.renderer,
    density: VIEW_PRESET_DENSITIES.includes(input.density) ? input.density : base.density,
    grouping: VIEW_PRESET_GROUPINGS.includes(input.grouping) ? input.grouping : base.grouping
  };
}

// Projects any artifact record (regardless of collection) into the shape every renderer
// mode needs, so ui/components/shared.js's 4 render functions don't need per-type branches.
export function presentArtifact(record, type) {
  const source = record && typeof record === "object" ? record : {};
  return {
    id: String(source.id || ""),
    type: String(source.type || type || "artifact"),
    title: String(source.title || source.name || "Untitled"),
    summary: String(source.summary || source.text || source.body || source.reason || ""),
    status: String(source.status || source.lifecycleState || "active"),
    createdAt: String(source.createdAt || ""),
    updatedAt: String(source.updatedAt || source.createdAt || "")
  };
}

export function validateArchitectureState(state) {
  const problems = [];
  if (!state || typeof state !== "object") problems.push("state missing");
  if (state && Number(state.schemaVersion) !== ARTIFACT_SCHEMA_VERSION) problems.push("schemaVersion mismatch");
  if (state && !architectureWorkspaceKeys().includes(state.activeSurface || "inbox")) problems.push("activeSurface not declared in workspace contracts");
  if (state) {
    for (const key of architectureCollectionKeys()) {
      if (!(key in state)) problems.push("missing state collection: " + key);
    }
  }
  return {
    ok: problems.length === 0,
    problems,
    schemaVersion: state ? state.schemaVersion : 0,
    architectureVersion: ARTIFACT_OS_ARCHITECTURE_VERSION
  };
}

export function buildArchitectureSnapshot(state = {}) {
  const control = state.control && typeof state.control === "object" ? state.control : {};
  const events = normalizeArchitectureEvents(control.architectureEvents);
  const validation = validateArchitectureState(state);
  return {
    architectureVersion: ARTIFACT_OS_ARCHITECTURE_VERSION,
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    validation,
    collections: ARTIFACT_COLLECTIONS.map((collection) => ({
      ...collection,
      count: countArchitectureCollection(state, collection.key)
    })),
    workspaces: WORKSPACE_CONTRACTS.map((workspace) => ({ ...workspace })),
    modules: MODULE_BOUNDARIES.map((module) => ({ ...module })),
    stateAdapters: STATE_ADAPTERS.map((adapter) => ({ ...adapter })),
    invariants: ARCHITECTURE_INVARIANTS.slice(),
    eventBus: {
      persisted: true,
      count: events.length,
      lastEvent: events[events.length - 1] || null
    }
  };
}

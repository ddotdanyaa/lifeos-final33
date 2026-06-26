export const ARTIFACT_OS_ARCHITECTURE_VERSION = "v33-artifact-os-boundary-1";
export const ARTIFACT_SCHEMA_VERSION = 2;

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
  { surface: "graph", job: "explain relationships", primaryAction: "inspect-node", collections: ["notes", "sources", "tasks", "financeTransactions", "habits", "goals"] },
  { surface: "control", job: "trust and recover", primaryAction: "export-or-recover", collections: ["auditLog", "control", "providerRuns"] },
  { surface: "providers", job: "connect safely", primaryAction: "probe-provider", collections: ["providers", "providerRuns", "environment"] }
]);

export const MODULE_BOUNDARIES = Object.freeze([
  { key: "storage-kernel", file: "app.js", owns: ["LocalRepository", "ReactiveStore", "normalizeState"], proves: ["state adapters", "schema docs"] },
  { key: "architecture-contract", file: "artifact-os-architecture.mjs", owns: ["collections", "workspaces", "event bus", "module boundaries"], proves: ["code splitting", "module boundaries", "schema docs"] },
  { key: "capture-analyzer", file: "app.js", owns: ["analyzeArtifactInput", "analyzeSourceArtifact"], proves: ["input -> Artifact -> proposals"] },
  { key: "projection-renderers", file: "app.js", owns: ["workspace renderers", "Data Control", "Graph"], proves: ["workspace lenses"] },
  { key: "provider-boundaries", file: "app.js", owns: ["Ollama", "PWA", "STT/OCR gates"], proves: ["honest provider gates"] },
  { key: "journey-tests", file: "output/playwright", owns: ["market-owner", "final journeys", "owner rescue"], proves: ["visual/e2e proof"] }
]);

export const STATE_ADAPTERS = Object.freeze([
  { key: "indexeddb-chunked", storage: "IndexedDB", boundary: "LocalRepository.save/load", fallback: "localStorage chunks" },
  { key: "localstorage-fallback", storage: "localStorage", boundary: "FALLBACK_PREFIX chunks", fallback: "Data Control export" },
  { key: "service-worker-shell", storage: "Cache API", boundary: "service-worker.js", fallback: "network navigation" },
  { key: "provider-passport", storage: "repository state", boundary: "providers/providerRuns", fallback: "honest blocked state" },
  { key: "test-harness", storage: "window.__lifeosKnowledgeBase", boundary: "read-only snapshots + explicit test commits", fallback: "audits fail closed" }
]);

export const ARCHITECTURE_INVARIANTS = Object.freeze([
  "one ReactiveStore instance owns mutable state",
  "all workspace routes read the shared Artifact repository",
  "mutations go through repository commits or audited test helpers",
  "every accepted proposal writes audit/control evidence",
  "provider actions are explicit and never fake readiness",
  "architecture events are persisted in Data Control"
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

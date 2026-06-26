import { existsSync, readFileSync } from "node:fs";
import {
  ARTIFACT_COLLECTIONS,
  ARTIFACT_OS_ARCHITECTURE_VERSION,
  MODULE_BOUNDARIES,
  STATE_ADAPTERS,
  WORKSPACE_CONTRACTS,
  buildArchitectureSnapshot,
  validateArchitectureState
} from "../artifact-os-architecture.mjs";

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

const requiredFiles = [
  "artifact-os-architecture.mjs",
  "docs/architecture/ARTIFACT_OS_ARCHITECTURE_CONTRACT.md",
  "app.js",
  "service-worker.js",
  "package.json"
];

const missingFiles = requiredFiles.filter((path) => !existsSync(path));
if (missingFiles.length) fail("Missing architecture contract files", { missingFiles });

const app = readFileSync("app.js", "utf8");
const sw = readFileSync("service-worker.js", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const requiredWorkspaces = ["inbox", "capture", "today", "calendar", "finance", "habits", "goals", "library", "reader", "player", "chat", "agents", "flows", "graph", "control", "providers"];
const requiredCollections = ["notes", "sources", "tasks", "planBlocks", "financeTransactions", "habits", "goals", "chatMessages", "agentRuns", "flowRuns", "providerRuns", "savedSearches", "auditLog", "control", "environment"];
const requiredModules = ["architecture-contract", "storage-kernel", "capture-analyzer", "projection-renderers", "provider-boundaries", "journey-tests"];
const requiredAdapters = ["indexeddb-chunked", "localstorage-fallback", "service-worker-shell", "provider-passport", "test-harness"];

const problems = [];
if (ARTIFACT_OS_ARCHITECTURE_VERSION !== "v33-artifact-os-boundary-1") problems.push("unexpected architecture version");
for (const key of requiredWorkspaces) {
  if (!WORKSPACE_CONTRACTS.some((workspace) => workspace.surface === key)) problems.push("missing workspace contract: " + key);
}
for (const key of requiredCollections) {
  if (!ARTIFACT_COLLECTIONS.some((collection) => collection.key === key)) problems.push("missing collection contract: " + key);
}
for (const key of requiredModules) {
  if (!MODULE_BOUNDARIES.some((module) => module.key === key)) problems.push("missing module boundary: " + key);
}
for (const key of requiredAdapters) {
  if (!STATE_ADAPTERS.some((adapter) => adapter.key === key)) problems.push("missing state adapter: " + key);
}
if (!pkg.scripts || pkg.scripts["audit:architecture"] !== "node tools/audit-architecture-contract.mjs") problems.push("package script audit:architecture missing");
if (!app.includes("from \"./artifact-os-architecture.mjs\"")) problems.push("app.js does not import architecture contract");
if (!app.includes("recordArchitectureEvent(next, \"repository.commit\"")) problems.push("ReactiveStore.commit does not record architecture events");
if (!app.includes("buildArchitectureSnapshot(state)")) problems.push("Data Control does not build architecture snapshot");
if (!app.includes("data-testid=\\\"architecture-contract\\\"")) problems.push("Data Control architecture panel missing");
if (!app.includes("getArchitectureSnapshot()")) problems.push("test harness architecture snapshot missing");
if (!sw.includes("/artifact-os-architecture.mjs")) problems.push("service worker shell cache misses architecture module");

const fakeState = {
  schemaVersion: 2,
  activeSurface: "inbox",
  control: {
    architectureEvents: [
      { id: "arch_test", type: "repository.commit", summary: "audit", revision: 1, activeSurface: "inbox", activeArtifactId: "note_test", createdAt: "2026-06-26T00:00:00.000Z" }
    ]
  },
  environment: {},
  auditLog: []
};
for (const collection of ARTIFACT_COLLECTIONS) {
  if (!(collection.key in fakeState)) fakeState[collection.key] = collection.key === "auditLog" ? [] : {};
}
const validation = validateArchitectureState(fakeState);
const snapshot = buildArchitectureSnapshot(fakeState);
if (!validation.ok) problems.push("fake architecture state failed validation: " + validation.problems.join("; "));
if (snapshot.eventBus.count !== 1) problems.push("architecture event bus snapshot did not preserve event count");
if (snapshot.collections.length < 30) problems.push("architecture snapshot has too few collections");
if (snapshot.workspaces.length < requiredWorkspaces.length) problems.push("architecture snapshot has too few workspaces");

if (problems.length) fail("Architecture contract audit failed", { problems });

console.log(JSON.stringify({
  ok: true,
  architectureVersion: ARTIFACT_OS_ARCHITECTURE_VERSION,
  collections: ARTIFACT_COLLECTIONS.length,
  workspaces: WORKSPACE_CONTRACTS.length,
  modules: MODULE_BOUNDARIES.length,
  stateAdapters: STATE_ADAPTERS.length,
  eventBus: "persisted-control-architectureEvents"
}, null, 2));

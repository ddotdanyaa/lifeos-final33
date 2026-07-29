import { readFile } from "node:fs/promises";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const files = {
  html: await readFile("index.html", "utf8"),
  js: await readFile("app.js", "utf8"),
  css: await readFile("styles.css", "utf8"),
  chat: await readFile("ui/chat.js", "utf8"),
  v34: await readFile("ui/v34-platform.js", "utf8")
};

const required = [
  "class KnowledgeRepository",
  "indexedDB.open",
  "CompressionStream",
  "DecompressionStream",
  "chunkString",
  "AUTO_SAVE_MS = 1500",
  "const WIKI_LINK_PATTERN = /\\[\\[(.*?)\\]\\]/g",
  "function extractWikiLinks",
  "function replaceWikiLinksForRename",
  "function rebuildIndexes",
  "function createNoteFromGhost",
  "function mapGraph",
  "function runForceLayout",
  "function applyForceTick",
  "function fileToSourcePayload",
  "function addImportedSource",
  "function saveSourceTranscript",
  "function addTask",
  "function addGoal",
  "function addPlanBlock",
  "function captureTextArtifact",
  "function runCaptureFlow",
  "function buildArtifactWorkspace",
  "function renderReceiptPanel",
  "function applyProposal",
  "function renderCaptureCockpit",
  "function renderCommandCenter",
  "function renderArtifactPipeline",
  "function analyzeSourceArtifact",
  "function renderArtifactAnalysisPanel",
  "function renderConnectedAppNetwork",
  "function renderCalendarPanel",
  "function renderDataControlPanel",
  "function buildLocalChatAnswer",
  "function visibleChatMessages",
  "function chatLocalEngineSummary",
  "function classifyOllamaFetchError",
  "async function testOllamaGeneration",
  "function scrollChatThreadToLatest",
  "event.target.id === \"chat-input\"",
  "<textarea id=\"chat-input\"",
  "data-testid=\"chat-mode\"",
  "data-testid=\"local-model-status\"",
  "testId: \"test-ollama-generation\"",
  "\"chat-message\", state.chatMessages",
  "[\"chat messages\", visibleChatMessages(state).length]",
  "function ensureV34Platform",
  "function createSystemDefinition",
  "function installMarketplacePack",
  "function createProject",
  "function addModelProfile",
  "function prepareScreenCompanionSession",
  "function createPersonalTwinSnapshot",
  "renderFeed",
  "renderSystems",
  "renderModelHub",
  "renderSmartHome",
  "systems-workbench",
  "marketplace-workspace",
  "screen-workspace",
  "async function refreshEnvironmentStatus",
  "async function probeOllama",
  "addEventListener(\"wheel\"",
  "data-testid=\\\"global-search\\\"",
  "data-testid=\\\"note-body\\\"",
  "data-testid=\\\"graph-canvas\\\"",
  "data-testid=\\\"file-import\\\"",
  "data-testid=\\\"audio-import\\\"",
  "data-testid=\\\"today-panel\\\"",
  "data-testid=\\\"ollama-status\\\"",
  "data-testid=\\\"capture-cockpit\\\"",
  "data-testid=\\\"command-center\\\"",
  "data-testid=\\\"mega-dropzone\\\"",
  "data-testid=\\\"artifact-pipeline\\\"",
  "data-testid=\\\"analysis-panel\\\"",
  "data-testid=\\\"app-network\\\"",
  "data-testid=\\\"auto-build-active\\\"",
  "data-testid=\\\"receipt-panel\\\"",
  "data-testid=\\\"proposal-panel\\\"",
  "data-testid=\\\"calendar-panel\\\"",
  "data-testid=\\\"chat-panel\\\"",
  "data-testid=\\\"agent-panel\\\"",
  "data-testid=\\\"player-panel\\\"",
  "data-testid=\\\"data-control-panel\\\"",
  "data-testid=\\\"network-status\\\"",
  "window.__lifeosKnowledgeBase"
];

const forbidden = [
  "TO" + "DO",
  "Implement edit logic here",
  "coming " + "soon",
  "proof " + "dashboard",
  "fake " + "receipt",
  "place" + "holder panel",
  "place" + "holder content",
  "place" + "holder card"
];

// П7: код больше не весь в app.js — чистые слои вынесены в core/*.mjs. Маркеры ищем и там.
// Проверка осталась прежней («такая функция обязана существовать»), изменилось только место, где
// она живёт. Ослаблением это не является: ослаблением было бы убрать маркер.
const coreFiles = existsSync("core")
  ? readdirSync("core").filter((name) => name.endsWith(".mjs")).map((name) => readFileSync(join("core", name), "utf8"))
  : [];
const joined = Object.values(files).concat(coreFiles).join("\n");
const missing = required.filter((item) => !joined.includes(item));
const blocked = forbidden.filter((item) => joined.toLowerCase().includes(item.toLowerCase()));

if (missing.length || blocked.length) {
  console.error(JSON.stringify({ ok: false, missing, blocked }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checked: Object.keys(files),
  required: required.length,
  stack: "Pure Vanilla JS + HTML5 + CSS3",
  storage: "IndexedDB with gzip payload chunking and localStorage fallback"
}, null, 2));

import { readFile } from "node:fs/promises";

const files = {
  html: await readFile("index.html", "utf8"),
  js: await readFile("app.js", "utf8"),
  css: await readFile("styles.css", "utf8")
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
  "place" + "holder"
];

const joined = files.html + "\n" + files.js + "\n" + files.css;
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

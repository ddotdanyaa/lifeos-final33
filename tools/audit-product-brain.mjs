import { existsSync, readFileSync, statSync } from "node:fs";

const requiredFiles = [
  "docs/product_brain/PRODUCT_BRAIN_OVERVIEW.md",
  "docs/product_brain/PRODUCT_KNOWLEDGE_GRAPH.json",
  "docs/product_brain/PRODUCT_DECISIONS.md",
  "docs/product_brain/PRODUCT_UX_DEBT_LEDGER.csv",
  "docs/product_brain/PRODUCT_BUG_LEDGER.csv",
  "docs/product_brain/PRODUCT_JOURNEY_LEDGER.csv",
  "docs/product_brain/PRODUCT_EVIDENCE_INDEX.md",
  "docs/product_brain/PRODUCT_MATURITY_SCORECARD.md",
  "docs/qc/PRODUCT_BRAIN_AUDIT.md",
  "docs/qc/PRODUCT_BRAIN_COMPLETION_MAP.csv",
  "docs/qc/PRODUCT_BRAIN_GAP_QUEUE.json",
  "docs/qc/PRODUCT_BRAIN_JOURNEY_MATRIX.csv"
];

const requiredScreenshots = [
  "output/playwright/product-brain-graph.png",
  "output/playwright/product-brain-control.png",
  "output/playwright/product-brain-chat.png",
  "output/playwright/product-brain-library.png"
];

function assert(condition, message, details = {}) {
  checks.push({ ok: Boolean(condition), message, details });
}

function fileSize(path) {
  return existsSync(path) ? statSync(path).size : 0;
}

const checks = [];
const app = readFileSync("app.js", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const graph = JSON.parse(readFileSync("docs/product_brain/PRODUCT_KNOWLEDGE_GRAPH.json", "utf8"));
const queue = JSON.parse(readFileSync("docs/qc/PRODUCT_BRAIN_GAP_QUEUE.json", "utf8"));

for (const file of requiredFiles) {
  assert(existsSync(file) && fileSize(file) > 80, "required Product Brain file exists: " + file, { bytes: fileSize(file) });
}

for (const shot of requiredScreenshots) {
  assert(existsSync(shot) && fileSize(shot) > 1000, "required Product Brain screenshot exists: " + shot, { bytes: fileSize(shot) });
}

assert(Boolean(pkg.scripts && pkg.scripts["audit:product-brain"]), "package script audit:product-brain exists");
assert(Boolean(pkg.scripts && pkg.scripts["e2e:product-brain"]), "package script e2e:product-brain exists");
assert(app.includes("PRODUCT_BRAIN_NODE_SPECS"), "runtime Product Brain node specs exist");
assert(app.includes("PRODUCT_BRAIN_ROOT_ID"), "runtime Product Brain root id exists");
assert(app.includes("systemType: \"product_brain\""), "runtime notes are marked as product_brain");
assert(app.includes("graph-filter-productBrain"), "Graph has Product Brain filter");
assert(app.includes("renderProductBrainControlCard"), "Control has Product Brain development-state card");
assert(app.includes("renderProductBrainLibraryCard"), "Library has Product Brain card");
assert(app.includes("renderProductBrainChatContext"), "Chat has Product Brain context");
assert(app.includes("answerProductBrainQuestion"), "Chat has deterministic Product Brain answers");
assert(app.includes("product-brain-complaint-ux-debt"), "Product Brain edge reasons exist");
assert(Array.isArray(graph.nodes) && graph.nodes.length >= 17, "knowledge graph has required nodes", { nodes: graph.nodes.length });
assert(Array.isArray(graph.edges) && graph.edges.length >= 15, "knowledge graph has required edges", { edges: graph.edges.length });
assert(queue.some((item) => item.id === "P_GITHUB_RELEASE_RETRY" && item.status === "done"), "gap queue records GitHub release retry as done");
assert(queue.some((item) => item.id === "P_OWNER_FINAL_REVALIDATION" && item.status === "done"), "gap queue records owner final revalidation as done");
assert(queue.some((item) => item.id === "P_EXTERNAL_PROVIDER_SETUP" && item.status === "open"), "gap queue keeps external provider setup open");

const failed = checks.filter((check) => !check.ok);
const summary = {
  ok: failed.length === 0,
  checks: checks.length,
  requiredFiles: requiredFiles.length,
  requiredScreenshots: requiredScreenshots.length,
  graphNodes: graph.nodes.length,
  graphEdges: graph.edges.length,
  failed
};

console.log(JSON.stringify(summary, null, 2));
if (failed.length) process.exit(1);

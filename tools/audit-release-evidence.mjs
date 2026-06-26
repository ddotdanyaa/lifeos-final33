import { existsSync, readFileSync, statSync } from "node:fs";

const requiredScripts = [
  "verify",
  "e2e",
  "e2e:owner",
  "e2e:fixtures",
  "e2e:visual",
  "audit:no-hardcoded-sample",
  "audit:buttons",
  "audit:ledger",
  "audit:workspace-links"
];

const requiredScreenshots = [
  "output/playwright/owner-home.png",
  "output/playwright/owner-analysis.png",
  "output/playwright/owner-after-apply.png",
  "output/playwright/owner-calendar.png",
  "output/playwright/owner-finance.png",
  "output/playwright/owner-habits-goals.png",
  "output/playwright/owner-knowledge-insights.png",
  "output/playwright/owner-player-transcript.png",
  "output/playwright/owner-ollama.png",
  "output/playwright/owner-chat-agents-flow.png",
  "output/playwright/owner-big-graph.png",
  "output/playwright/owner-control.png",
  "output/playwright/owner-mobile.png",
  "output/playwright/owner-large-vault.png"
];

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const missingScripts = requiredScripts.filter((script) => !pkg.scripts || !pkg.scripts[script]);
if (missingScripts.length) fail("Missing required npm scripts", { missingScripts });

const fixturePath = "output/playwright/fixtures/owner-input-fixtures.json";
if (!existsSync(fixturePath)) fail("Missing fixture matrix", { fixturePath });
const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));
if (!Array.isArray(fixtures) || fixtures.length < 120) fail("Fixture matrix must contain at least 120 fixtures", { count: Array.isArray(fixtures) ? fixtures.length : 0 });

const missingScreenshots = requiredScreenshots.filter((path) => !existsSync(path) || statSync(path).size < 1000);
if (missingScreenshots.length) fail("Missing or empty required screenshots", { missingScreenshots });

const queue = JSON.parse(readFileSync("docs/ops/NONSTOP_OWNER_RESCUE_QUEUE.json", "utf8"));
const openQueue = queue.filter((item) => item.id !== "P000" && item.status !== "done");
if (openQueue.length) fail("Owner queue still has non-done packages", { openQueue: openQueue.map((item) => ({ id: item.id, status: item.status })) });

const ledgerText = readFileSync("docs/qc/NONSTOP_OWNER_WEAKNESS_LEDGER.csv", "utf8");
const lines = ledgerText.trimEnd().split(/\r?\n/);
const header = parseCsvLine(lines[0]);
const statusIndex = header.indexOf("resolution_status");
const idIndex = header.indexOf("id");
const openLedger = lines.slice(1)
  .map(parseCsvLine)
  .filter((cells) => ["OPEN", "IN_PROGRESS"].includes(cells[statusIndex]))
  .map((cells) => cells[idIndex]);
if (openLedger.length) fail("Ledger still has open rows", { openLedger: openLedger.slice(0, 30), openCount: openLedger.length });

console.log(JSON.stringify({
  ok: true,
  requiredScripts: requiredScripts.length,
  fixtureCount: fixtures.length,
  screenshots: requiredScreenshots.length,
  ledgerRows: lines.length - 1
}, null, 2));

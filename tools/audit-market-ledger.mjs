import { readFileSync, existsSync } from "node:fs";

const STATUS_LEDGER = "docs/qc/MARKET_RESEARCH_LEDGER_STATUS.csv";
const REQUIRED_FILES = [
  "docs/qc/LIFEOS_MARKET_RESEARCH_8000_UX_FUNCTION_LEDGER.csv",
  "docs/qc/LIFEOS_300_BREAKTHROUGH_UX_IDEAS.csv",
  "docs/qc/MARKET_RESEARCH_LEDGER_STATUS.csv",
  "docs/qc/MARKET_RESEARCH_EXECUTION_REPORT.md",
  "docs/ops/MARKET_RESEARCH_RESCUE_STATE.md",
  "docs/research/LIFEOS_MARKET_RESEARCH_REALTIME.md"
];

const MARKET_STATUSES = new Set([
  "NOT_STARTED",
  "DUPLICATE_WITH_PROOF",
  "FIXED_WITH_CODE_AND_TEST",
  "FIXED_BY_DESIGN_SYSTEM_RULE",
  "FIXED_BY_HONEST_PROVIDER_GATE",
  "BLOCKED_OWNER_CREDENTIAL",
  "DEFERRED_WITH_REASON",
  "REJECTED_AS_BAD_IDEA_WITH_REASON"
]);

const BREAKTHROUGH_STATUSES = new Set([
  "BUILT_NOW",
  "ADOPTED_AS_DESIGN_RULE",
  "BACKLOG_WITH_PACKAGE",
  "REJECTED_WITH_REASON"
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

const missingFiles = REQUIRED_FILES.filter((file) => !existsSync(file));
if (missingFiles.length) {
  console.error(JSON.stringify({ ok: false, missingFiles }, null, 2));
  process.exit(1);
}

const rows = parseCsv(readFileSync(STATUS_LEDGER, "utf8"));
const rRows = rows.filter((row) => row.ledger === "R8000");
const bRows = rows.filter((row) => row.ledger === "B300");
const invalid = rows.filter((row) => {
  if (row.ledger === "R8000") return !MARKET_STATUSES.has(row.status);
  if (row.ledger === "B300") return !BREAKTHROUGH_STATUSES.has(row.status);
  return true;
});
const missingR = [];
for (let index = 1; index <= 8000; index += 1) {
  const id = "R" + String(index).padStart(4, "0");
  if (!rRows.some((row) => row.id === id)) missingR.push(id);
}
const missingB = [];
for (let index = 1; index <= 300; index += 1) {
  const id = "B" + String(index).padStart(3, "0");
  if (!bRows.some((row) => row.id === id)) missingB.push(id);
}
const notStartedR = rRows.filter((row) => row.status === "NOT_STARTED");

if (rows.length !== 8300 || rRows.length !== 8000 || bRows.length !== 300 || invalid.length || missingR.length || missingB.length || notStartedR.length) {
  console.error(JSON.stringify({
    ok: false,
    rows: rows.length,
    rRows: rRows.length,
    bRows: bRows.length,
    invalid: invalid.slice(0, 5),
    missingR: missingR.slice(0, 10),
    missingB: missingB.slice(0, 10),
    notStartedR: notStartedR.slice(0, 10).map((row) => row.id)
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  rows: rows.length,
  rRows: rRows.length,
  bRows: bRows.length,
  rFixed: rRows.filter((row) => row.status.startsWith("FIXED_")).length,
  rDeferred: rRows.filter((row) => row.status === "DEFERRED_WITH_REASON").length,
  rBlockedOwnerCredential: rRows.filter((row) => row.status === "BLOCKED_OWNER_CREDENTIAL").length,
  rNotStarted: notStartedR.length,
  bTop30Rules: bRows.filter((row) => /^B0(0[1-9]|[12]\d|30)$/.test(row.id) && row.status === "ADOPTED_AS_DESIGN_RULE").length
}, null, 2));

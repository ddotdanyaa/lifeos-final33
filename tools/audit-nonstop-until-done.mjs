import { existsSync, readFileSync, statSync } from "node:fs";

const requiredFiles = [
  "docs/ops/NONSTOP_UNTIL_DONE_LIVE_STATE.md",
  "docs/qc/NONSTOP_UNTIL_DONE_REPORT.md",
  "docs/qc/NONSTOP_UNTIL_DONE_QUEUE.json",
  "docs/qc/NONSTOP_UNTIL_DONE_LEDGER.csv",
  "output/playwright/fixtures/owner-input-fixtures.json"
];

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

const missingFiles = requiredFiles.filter((path) => !existsSync(path) || statSync(path).size < 10);
if (missingFiles.length) fail("Missing nonstop-until-done files", { missingFiles });

const liveState = readFileSync("docs/ops/NONSTOP_UNTIL_DONE_LIVE_STATE.md", "utf8");
const report = readFileSync("docs/qc/NONSTOP_UNTIL_DONE_REPORT.md", "utf8");
const queue = JSON.parse(readFileSync("docs/qc/NONSTOP_UNTIL_DONE_QUEUE.json", "utf8"));
const ledger = readFileSync("docs/qc/NONSTOP_UNTIL_DONE_LEDGER.csv", "utf8").trim().split(/\r?\n/);
const fixtures = JSON.parse(readFileSync("output/playwright/fixtures/owner-input-fixtures.json", "utf8"));
const liveContinuation = liveState.includes("status: CONTINUATION_REQUIRED");
const reportContinuation = report.includes("status: CONTINUATION_REQUIRED");
const liveBlockedExternal = liveState.includes("status: BLOCKED_EXTERNAL_CREDENTIAL_ONLY");
const reportBlockedExternal = report.includes("status: BLOCKED_EXTERNAL_CREDENTIAL_ONLY");
const ledgerHasOpen = ledger.some((line) => line.includes(",OPEN,"));

const problems = [];
if (!liveContinuation && !liveBlockedExternal) problems.push("live state must be CONTINUATION_REQUIRED or BLOCKED_EXTERNAL_CREDENTIAL_ONLY");
if (!reportContinuation && !reportBlockedExternal) problems.push("report must be CONTINUATION_REQUIRED or BLOCKED_EXTERNAL_CREDENTIAL_ONLY");
if (ledgerHasOpen && (!liveContinuation || !reportContinuation)) problems.push("open local gates require CONTINUATION_REQUIRED state");
if (!ledgerHasOpen && (!liveBlockedExternal || !reportBlockedExternal)) problems.push("closed local gates with external blockers require BLOCKED_EXTERNAL_CREDENTIAL_ONLY state");
if (!queue.some((item) => item.id === "P01" && item.status === "done")) problems.push("P01 queue item is not done");
const p19 = queue.find((item) => item.id === "P19");
if (!p19 || !["next", "done"].includes(p19.status)) problems.push("P19 queue item must be next or done");
if (p19 && p19.status === "done") {
  for (let index = 1; index <= 24; index += 1) {
    const id = `J${String(index).padStart(2, "0")}`;
    if (!existsSync(`docs/qc/JOURNEY_${id}_REPORT.md`)) problems.push(`missing journey report ${id}`);
    for (const side of ["before", "after"]) {
      const path = `output/playwright/journeys/${id.toLowerCase()}-${side}.png`;
      if (!existsSync(path) || statSync(path).size < 1000) problems.push(`missing journey screenshot ${path}`);
    }
  }
  if (!existsSync("output/playwright/final/final-home.png")) problems.push("missing final screenshot set");
}
if (ledger.length < 2) problems.push("nonstop ledger has no rows");
if (!ledger.some((line) => line.includes(",BLOCKED_EXTERNAL_CREDENTIAL_ONLY,"))) problems.push("nonstop ledger should record external credential gates");
if (!Array.isArray(fixtures) || fixtures.length < 120) problems.push("fixture matrix below 120");

if (problems.length) fail("Nonstop until done audit failed", { problems });

console.log(JSON.stringify({
  ok: true,
  requiredFiles: requiredFiles.length,
  queueItems: queue.length,
  ledgerRows: ledger.length - 1,
  fixtures: fixtures.length,
  status: ledgerHasOpen ? "CONTINUATION_REQUIRED" : "BLOCKED_EXTERNAL_CREDENTIAL_ONLY"
}, null, 2));

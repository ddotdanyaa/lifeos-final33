import { existsSync, readFileSync } from "node:fs";

const gatesPath = "docs/qc/FINAL_OPEN_GATES.csv";
const requiredEvidence = [
  "output/playwright/final/final-performance-large-vault.png",
  "docs/qc/JOURNEY_J23_REPORT.md"
];
const PERF_BUDGET_REPORT_PATH = "docs/qc/PERF_BUDGET_REPORT.json";

const problems = [];
if (!existsSync(gatesPath)) problems.push(`${gatesPath} missing`);
if (!existsSync("docs/qc/JOURNEY_J23_REPORT.md")) problems.push("J23 report missing");

let gates = "";
if (!problems.length) {
  gates = readFileSync(gatesPath, "utf8");
  const hasFinalScreenshot = existsSync(requiredEvidence[0]);
  const hasOpenGate = gates.includes("P17_LARGE_VAULT_EXACT_SCALE,LOCAL,OPEN");
  if (!hasFinalScreenshot) problems.push("performance screenshot missing");
  if (hasOpenGate) problems.push("P17 large-vault gate is still open");
  const report = readFileSync("docs/qc/JOURNEY_J23_REPORT.md", "utf8");
  if (!report.includes("Exact mixed large vault") && !report.includes("large vault")) problems.push("J23 report does not describe exact large-vault behavior");
}

// --- Perf Budgets (P10.3): boot and interaction times are real measured numbers checked
// against a real threshold (output/playwright/perf-budgets.spec.mjs writes this report),
// never just a screenshot existing ---
let perfBudgetReport = null;
if (!existsSync(PERF_BUDGET_REPORT_PATH)) {
  problems.push(`${PERF_BUDGET_REPORT_PATH} missing - run perf-budgets.spec.mjs first`);
} else {
  perfBudgetReport = JSON.parse(readFileSync(PERF_BUDGET_REPORT_PATH, "utf8"));
  for (const field of ["measuredAt", "bootMs", "bootBudgetMs", "interactionMs", "interactionBudgetMs"]) {
    if (typeof perfBudgetReport[field] === "undefined") problems.push(`${PERF_BUDGET_REPORT_PATH} missing field: ${field}`);
  }
  if (typeof perfBudgetReport.bootMs === "number" && perfBudgetReport.bootMs >= perfBudgetReport.bootBudgetMs) {
    problems.push(`boot time ${perfBudgetReport.bootMs}ms exceeds budget ${perfBudgetReport.bootBudgetMs}ms`);
  }
  if (typeof perfBudgetReport.interactionMs === "number" && perfBudgetReport.interactionMs >= perfBudgetReport.interactionBudgetMs) {
    problems.push(`interaction time ${perfBudgetReport.interactionMs}ms exceeds budget ${perfBudgetReport.interactionBudgetMs}ms`);
  }
}

if (problems.length) {
  console.error(JSON.stringify({ ok: false, problems }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  finalScreenshot: existsSync(requiredEvidence[0]),
  openGate: false,
  bootMs: perfBudgetReport.bootMs,
  bootBudgetMs: perfBudgetReport.bootBudgetMs,
  interactionMs: Math.round(perfBudgetReport.interactionMs * 100) / 100,
  interactionBudgetMs: perfBudgetReport.interactionBudgetMs
}, null, 2));

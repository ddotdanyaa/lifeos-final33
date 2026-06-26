import { existsSync, readFileSync } from "node:fs";

const gatesPath = "docs/qc/FINAL_OPEN_GATES.csv";
const requiredEvidence = [
  "output/playwright/final/final-performance-large-vault.png",
  "docs/qc/JOURNEY_J23_REPORT.md"
];

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

if (problems.length) {
  console.error(JSON.stringify({ ok: false, problems }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  finalScreenshot: existsSync(requiredEvidence[0]),
  openGate: false
}, null, 2));

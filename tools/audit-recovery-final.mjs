import { existsSync, readFileSync } from "node:fs";

const gatesPath = "docs/qc/FINAL_OPEN_GATES.csv";
const reportPath = "docs/qc/JOURNEY_J24_REPORT.md";
const screenshotPath = "output/playwright/final/final-recovery-flow.png";

const problems = [];
if (!existsSync(gatesPath)) problems.push(`${gatesPath} missing`);
if (!existsSync(reportPath)) problems.push(`${reportPath} missing`);

let gates = "";
if (!problems.length) {
  gates = readFileSync(gatesPath, "utf8");
  const report = readFileSync(reportPath, "utf8");
  const hasCorruptionGate = gates.includes("P24_CORRUPT_RECORD_FIXTURE,LOCAL,OPEN");
  if (!existsSync(screenshotPath)) problems.push("recovery screenshot missing");
  if (hasCorruptionGate) problems.push("P24 corrupt-record gate is still open");
  if (!/rollback|restore|corrupt|corruption|recovered|восстанов/i.test(report)) problems.push("J24 report does not describe recovery/corruption boundary");
}

if (problems.length) {
  console.error(JSON.stringify({ ok: false, problems }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  finalScreenshot: existsSync(screenshotPath),
  openGate: false
}, null, 2));

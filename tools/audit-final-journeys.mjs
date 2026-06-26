import { existsSync, readFileSync, statSync } from "node:fs";

const journeyIds = Array.from({ length: 24 }, (_, index) => `J${String(index + 1).padStart(2, "0")}`);
const finalScreenshots = [
  "final-home.png",
  "final-capture-analysis.png",
  "final-after-apply.png",
  "final-today.png",
  "final-calendar-day.png",
  "final-calendar-week.png",
  "final-finance.png",
  "final-screenshot-expense.png",
  "final-habits-goals-wheel.png",
  "final-library.png",
  "final-reader.png",
  "final-player-transcript.png",
  "final-chat-local-ai.png",
  "final-agents-flows.png",
  "final-big-graph.png",
  "final-control.png",
  "final-providers.png",
  "final-performance-large-vault.png",
  "final-recovery-flow.png",
  "final-mobile-home.png",
  "final-mobile-capture.png"
];

function fileSize(path) {
  return existsSync(path) ? statSync(path).size : 0;
}

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

const missingReports = [];
const badReports = [];
const missingScreenshots = [];

for (const id of journeyIds) {
  const reportPath = `docs/qc/JOURNEY_${id}_REPORT.md`;
  if (!existsSync(reportPath) || fileSize(reportPath) < 200) {
    missingReports.push(reportPath);
  } else {
    const report = readFileSync(reportPath, "utf8");
    if (!/status: PASS/.test(report) || /status: FAIL/.test(report)) badReports.push(reportPath);
    if (!report.includes("## Repository Objects Created") || !report.includes("## Graph Edges") || !report.includes("## Data Control Events")) {
      badReports.push(reportPath);
    }
  }

  for (const side of ["before", "after"]) {
    const screenshotPath = `output/playwright/journeys/${id.toLowerCase()}-${side}.png`;
    if (fileSize(screenshotPath) < 1000) missingScreenshots.push(screenshotPath);
  }
}

for (const name of finalScreenshots) {
  const screenshotPath = `output/playwright/final/${name}`;
  if (fileSize(screenshotPath) < 1000) missingScreenshots.push(screenshotPath);
}

if (missingReports.length || badReports.length || missingScreenshots.length) {
  fail("Final journey evidence is incomplete", { missingReports, badReports, missingScreenshots });
}

console.log(JSON.stringify({
  ok: true,
  journeyReports: journeyIds.length,
  journeyScreenshots: journeyIds.length * 2,
  finalScreenshots: finalScreenshots.length
}, null, 2));

import { existsSync, readFileSync } from "node:fs";

const auditPath = "docs/qc/FINAL_UI_HUMAN_AUDIT.md";
const openGatesPath = "docs/qc/FINAL_OPEN_GATES.csv";
const requiredWorkspaces = [
  "Home",
  "Capture",
  "Today",
  "Calendar",
  "Finance",
  "Habits / Goals",
  "Library",
  "Reader",
  "Player",
  "Chat",
  "Agents / Flows",
  "Graph",
  "Control",
  "Providers",
  "Mobile"
];

const problems = [];
if (!existsSync(auditPath)) problems.push(`${auditPath} missing`);
if (!existsSync(openGatesPath)) problems.push(`${openGatesPath} missing`);

let body = "";
let gates = "";
if (!problems.length) {
  body = readFileSync(auditPath, "utf8");
  gates = readFileSync(openGatesPath, "utf8");
  for (const workspace of requiredWorkspaces) {
    if (!body.includes(`| ${workspace} |`)) problems.push(`workspace score missing: ${workspace}`);
  }
  if (body.includes("STATUS: DONE_ALL") && /,LOCAL,OPEN,/.test(gates)) problems.push("DONE_ALL claimed while local gates remain open");
  if (!body.includes("STATUS: CONTINUATION_REQUIRED") && /,LOCAL,OPEN,/.test(gates)) problems.push("open local gates require CONTINUATION_REQUIRED");
  if (!body.includes("F01") || !body.includes("F25")) problems.push("F01-F25 audit coverage missing");
}

if (problems.length) {
  console.error(JSON.stringify({ ok: false, problems }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  audit: auditPath,
  workspaces: requiredWorkspaces.length,
  status: /,LOCAL,OPEN,/.test(gates) ? "CONTINUATION_REQUIRED" : "LOCAL_UX_GATES_CLOSED"
}, null, 2));

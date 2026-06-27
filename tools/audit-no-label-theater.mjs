import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");

function functionBody(name) {
  const start = app.indexOf(`function ${name}`);
  if (start === -1) throw new Error(`Missing ${name}`);
  const brace = app.indexOf("{", start);
  let depth = 0;
  for (let index = brace; index < app.length; index += 1) {
    const char = app[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return app.slice(brace + 1, index);
  }
  throw new Error(`Could not parse ${name}`);
}

const primaryUi = [
  functionBody("renderHumanChatHome"),
  functionBody("renderHumanUnderstanding"),
  functionBody("renderHumanNavRail"),
  functionBody("renderChatWorkspace")
].join("\n");

const banned = [
  "Product Brain",
  "UX Debt",
  "Bug Ledger",
  "Release Map",
  "Provider Gates Map",
  "Maturity Scorecard",
  "LITE_SNAPSHOT",
  "needs-owner-credentials",
  "blocked_external",
  "blocked_external_credential",
  "audit passed",
  "schema version",
  "architecture event bus",
  "control architecture contract"
];

const found = banned.filter((term) => primaryUi.includes(term));
if (found.length) {
  console.error("Primary UI still contains label-theater terms:", found.join(", "));
  process.exit(1);
}

if (!/return renderHumanChatHome\(state\);/.test(functionBody("renderOwnerHome"))) {
  console.error("Home does not route through renderHumanChatHome.");
  process.exit(1);
}

if (/renderProductBrainChatContext\(state\)/.test(functionBody("renderChatWorkspace"))) {
  console.error("Chat still renders Product Brain context in primary UI.");
  process.exit(1);
}

console.log("audit:no-label-theater passed");

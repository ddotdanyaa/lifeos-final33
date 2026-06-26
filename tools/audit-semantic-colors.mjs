import { readFileSync } from "node:fs";

const css = readFileSync("styles.css", "utf8");

const tokens = [
  "--color-capture",
  "--color-inbox",
  "--color-task",
  "--color-calendar",
  "--color-finance",
  "--color-habit",
  "--color-goal",
  "--color-knowledge",
  "--color-reader",
  "--color-media",
  "--color-ai",
  "--color-agent",
  "--color-control"
];

const usage = [
  ".surface-capture",
  ".surface-calendar",
  ".surface-finance",
  ".surface-habits",
  ".surface-goals",
  ".surface-library",
  ".surface-reader",
  ".surface-player",
  ".surface-chat",
  ".surface-agents",
  ".surface-graph",
  ".surface-control",
  ".surface-providers"
];

const missingTokens = tokens.filter((token) => !css.includes(token));
const missingUsage = usage.filter((selector) => !css.includes(selector));

if (missingTokens.length || missingUsage.length) {
  console.error(JSON.stringify({ ok: false, missingTokens, missingUsage }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, tokens: tokens.length, usage: usage.length }, null, 2));

import { readFileSync } from "node:fs";

const shell = readFileSync("ui/shell.js", "utf8");
const home = readFileSync("ui/home.js", "utf8");
const assistant = readFileSync("ui/components/AssistantInput.js", "utf8");
const answer = readFileSync("ui/components/HumanAnswerCard.js", "utf8");

const primaryNav = shell.match(/const primaryNav = \[([\s\S]*?)\];/)?.[1] || "";
const navItems = [...primaryNav.matchAll(/\["[a-z-]+",/g)].length;
if (navItems !== 9) {
  console.error(`Expected exactly 9 primary navigation items, found ${navItems}.`);
  process.exit(1);
}

const quickButtons = ["quick-task", "quick-expense", "capture-import", "capture-audio", "capture-book"].filter((id) => assistant.includes(id));
if (quickButtons.length !== 5) {
  console.error(`Expected 5 quick actions, found ${quickButtons.length}.`);
  process.exit(1);
}

const forbidden = [
  "renderGraph",
  "renderControl",
  "renderProviders",
  "Product Brain",
  "ledger",
  "evidence",
  "Release Map",
  "Provider Gates"
];
const found = forbidden.filter((term) => home.includes(term) || assistant.includes(term) || answer.includes(term));
if (found.length) {
  console.error("Home first viewport contains heavy/internal surfaces:", found.join(", "));
  process.exit(1);
}

const primaryButtons = [...answer.matchAll(/kind: "primary"/g)].length + [...assistant.matchAll(/kind: "primary"/g)].length;
if (primaryButtons > 1) {
  console.error(`Home answer/composer has too many primary CTAs in source: ${primaryButtons}.`);
  process.exit(1);
}

if (!home.includes("assistant-home-v2") || !assistant.includes("mega-dropzone") || !answer.includes("lifeos-understanding")) {
  console.error("Home is not routed through the assistant-first shell.");
  process.exit(1);
}

console.log("audit:home-complexity passed");

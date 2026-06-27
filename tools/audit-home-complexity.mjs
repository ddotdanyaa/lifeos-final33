import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");

function body(name) {
  const start = app.indexOf(`function ${name}`);
  if (start === -1) throw new Error(`Missing ${name}`);
  const brace = app.indexOf("{", start);
  let depth = 0;
  for (let index = brace; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(brace + 1, index);
  }
  throw new Error(`Could not parse ${name}`);
}

const nav = body("primaryOwnerSurfaces");
const navItems = [...nav.matchAll(/\["[a-z-]+",/g)].length;
if (navItems !== 9) {
  console.error(`Expected exactly 9 primary navigation items, found ${navItems}.`);
  process.exit(1);
}

const home = body("renderHumanChatHome");
const quickActions = ["quick-task", "quick-expense", "capture-import", "capture-audio", "capture-book"].filter((id) => home.includes(id));
if (quickActions.length !== 5) {
  console.error(`Expected 5 quick actions, found ${quickActions.length}.`);
  process.exit(1);
}

const forbidden = ["renderProposalPanel", "renderGraphWorkbench", "renderDataControlPanel", "renderProviderPanel", "renderProductBrain"];
const found = forbidden.filter((term) => home.includes(term));
if (found.length) {
  console.error("Home first viewport calls heavy/internal surfaces:", found.join(", "));
  process.exit(1);
}

const primaryButtons = [...home.matchAll(/class=\\"primary\\"/g)].length + [...body("renderHumanUnderstanding").matchAll(/class=\\"primary\\"/g)].length;
if (primaryButtons > 2) {
  console.error(`Home has too many primary CTAs in source: ${primaryButtons}.`);
  process.exit(1);
}

console.log("audit:home-complexity passed");

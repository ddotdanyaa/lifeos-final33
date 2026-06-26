import { readFileSync } from "node:fs";

const fixtures = JSON.parse(readFileSync("output/playwright/fixtures/owner-input-fixtures.json", "utf8"));
const app = readFileSync("app.js", "utf8");
const classes = new Set();
const proposalTypes = new Set();
const requiredClasses = [
  "simple_task",
  "dated_task",
  "timed_task",
  "recurring_task",
  "reminder",
  "expense",
  "income",
  "balance",
  "subscription",
  "transfer_savings",
  "habit",
  "goal",
  "idea",
  "project",
  "research_question",
  "book",
  "audio",
  "email",
  "home",
  "health",
  "travel",
  "typo_heavy_ru",
  "english_russian_mix",
  "uncertain_ambiguous"
];

for (const fixture of fixtures) {
  for (const item of fixture.expectedClasses || []) classes.add(item);
  for (const item of fixture.minimumProposalTypes || []) proposalTypes.add(item);
}

const problems = [];
const missingRequiredClasses = requiredClasses.filter((fixtureClass) => !fixtures.some((fixture) => fixture.class === fixtureClass));
if (fixtures.length < 150) problems.push("fixture count below 150");
if (classes.size < 20) problems.push("expected class diversity below 20");
if (proposalTypes.size < 8) problems.push("proposal type diversity below 8");
if (missingRequiredClasses.length) problems.push("missing required fixture classes: " + missingRequiredClasses.join(", "));
if (fixtures.some((fixture) => fixture.shouldMutateBeforeApply !== false)) problems.push("fixture allows silent mutation");
if (!app.includes("function analyzeArtifactInput")) problems.push("runtime analyzer missing");
if (!app.includes("PROPOSAL_GROUPS")) problems.push("proposal groups missing");
if (!app.includes("applyAllProposals")) problems.push("apply all missing");

if (problems.length) {
  console.error(JSON.stringify({ ok: false, problems, count: fixtures.length, classes: classes.size, proposalTypes: proposalTypes.size, missingRequiredClasses }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  fixtures: fixtures.length,
  expectedClassCount: classes.size,
  proposalTypeCount: proposalTypes.size,
  requiredClassCount: requiredClasses.length,
  estimatedClassCoverage: ">=90% gate ready for browser verification",
  minimumFixtureFloor: 150
}, null, 2));

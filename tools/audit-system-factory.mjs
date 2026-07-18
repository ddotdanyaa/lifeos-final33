import { readFileSync } from "node:fs";
import {
  SYSTEM_FIELD_TYPES,
  SYSTEM_TRIGGER_KINDS,
  normalizeSystemEntity,
  normalizeSystemField,
  normalizeSystemTrigger,
  validateSystemRecordFields
} from "../artifact-os-architecture.mjs";

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

const problems = [];

if (SYSTEM_FIELD_TYPES.length !== 5) problems.push("expected 5 SYSTEM_FIELD_TYPES (text/number/date/select/relation)");
if (SYSTEM_TRIGGER_KINDS.length !== 3) problems.push("expected 3 SYSTEM_TRIGGER_KINDS (on-create/on-field-change/daily)");

// --- Completeness formula: a demo system built purely from primitives has every
// layer non-empty (entities, typed fields, views/actions declared by app.js's
// createSystemDefinition, triggers) - this is what "раскладывается по формуле
// полноты" means: nothing is a stub once the Factory primitives are exercised.
const demoEntity = normalizeSystemEntity({
  name: "Демо-сущность",
  fields: [
    normalizeSystemField({ name: "Статус", type: "select", options: ["open", "done"], required: true }),
    normalizeSystemField({ name: "Срок", type: "date" })
  ]
});
if (demoEntity.fields.length !== 2) problems.push("demo entity must carry both typed fields");

const validRecord = validateSystemRecordFields(demoEntity, { "Статус": "open", "Срок": "2026-08-01" });
if (!validRecord.ok) problems.push("demo entity valid record unexpectedly rejected: " + validRecord.errors.join("; "));

const invalidRecord = validateSystemRecordFields(demoEntity, { "Статус": "not-an-option" });
if (invalidRecord.ok) problems.push("demo entity should reject a select value outside its options");

const demoTrigger = normalizeSystemTrigger({ kind: "on-field-change", entityName: demoEntity.name, fieldName: "Статус", actionType: "task" });
if (demoTrigger.kind !== "on-field-change" || demoTrigger.fieldName !== "Статус") problems.push("trigger normalization dropped kind/fieldName");

// --- Wiring: app.js actually defines and calls the trigger pipeline, not just declares it ---
const app = readFileSync("app.js", "utf8");
const requiredSymbols = ["function addSystemTrigger", "function fireSystemTriggerDryRun", "function evaluateSystemTriggers", "function evaluateDailySystemTriggers"];
for (const symbol of requiredSymbols) {
  if (!app.includes(symbol)) problems.push("app.js missing: " + symbol);
}
if (!app.includes("evaluateSystemTriggers(state, systemId, entity.name, { kind: \"create\"")) problems.push("createSystemRecord does not fire on-create triggers");
if (!app.includes("evaluateSystemTriggers(state, record.systemId, entity.name, { kind: \"update\"")) problems.push("updateSystemRecord does not fire on-field-change triggers");
if (!app.includes("evaluateDailySystemTriggers(state)")) problems.push("normalizeState does not evaluate daily triggers");
if (!app.includes("\"add-system-trigger\"")) problems.push("app.js does not handle the add-system-trigger action");

// --- Triggers always dry-run through the existing proposal system, never apply directly ---
if (!app.includes("mutationMode: \"proposal-only\"")) problems.push("fireSystemTriggerDryRun does not mark itself proposal-only");
if (!app.includes("addProposal(state, trigger.actionType")) problems.push("fireSystemTriggerDryRun does not create a proposal");

if (problems.length) fail("System Factory completeness audit failed", { problems });

console.log(JSON.stringify({
  ok: true,
  fieldTypes: SYSTEM_FIELD_TYPES.length,
  triggerKinds: SYSTEM_TRIGGER_KINDS.length,
  completeness: "entities+fields+triggers all exercised and pass validation",
  dryRunOnly: true
}, null, 2));

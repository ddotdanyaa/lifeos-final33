import { readFileSync } from "node:fs";
import {
  ARTIFACT_COLLECTIONS,
  ARTIFACT_SCHEMA_VERSION,
  OBJECT_CONTRACT_V4_FIELDS,
  OBJECT_CONTRACT_EXEMPT_COLLECTIONS,
  applyObjectContractV4,
  applyObjectContractToState,
  validateObjectContractV4
} from "../artifact-os-architecture.mjs";

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

const app = readFileSync("app.js", "utf8");
const problems = [];

// --- Object contract: schema version bump ---
if (ARTIFACT_SCHEMA_VERSION !== 4) problems.push("ARTIFACT_SCHEMA_VERSION expected 4 (Object Contract v4)");
if (OBJECT_CONTRACT_V4_FIELDS.length !== 16) problems.push("Object Contract v4 must declare exactly 16 fields");

// --- Object contract: fresh record gets every field ---
const freshNote = applyObjectContractV4({ id: "note_test", createdAt: "2026-07-18T00:00:00.000Z" }, "artifact");
const validation = validateObjectContractV4(freshNote);
if (!validation.ok) problems.push("fresh record missing Object Contract fields: " + validation.missing.join(", "));

// --- Object contract: migration is idempotent (no drift on repeated application) ---
const once = applyObjectContractV4({ id: "note_test", createdAt: "2026-07-18T00:00:00.000Z", version: 3, owner: "someone" }, "artifact");
const twice = applyObjectContractV4({ ...once }, "artifact");
if (once.version !== twice.version) problems.push("Object Contract migration is not idempotent: version drifted");
if (once.owner !== twice.owner) problems.push("Object Contract migration is not idempotent: owner drifted");
if (JSON.stringify(once) !== JSON.stringify(twice)) problems.push("Object Contract migration is not idempotent: record drifted on re-apply");

// --- Object contract: whole-state pass covers every non-exempt collection ---
const fakeState = {};
for (const collection of ARTIFACT_COLLECTIONS) {
  fakeState[collection.key] = OBJECT_CONTRACT_EXEMPT_COLLECTIONS.includes(collection.key)
    ? (collection.key === "auditLog" ? [] : {})
    : { [`${collection.key}_1`]: { id: `${collection.key}_1`, createdAt: "2026-07-18T00:00:00.000Z" } };
}
applyObjectContractToState(fakeState);
for (const collection of ARTIFACT_COLLECTIONS) {
  if (OBJECT_CONTRACT_EXEMPT_COLLECTIONS.includes(collection.key)) continue;
  const record = fakeState[collection.key][`${collection.key}_1`];
  const result = validateObjectContractV4(record);
  if (!result.ok) problems.push(`collection ${collection.key} missing Object Contract fields: ${result.missing.join(", ")}`);
  if (record.type !== collection.ownerType) problems.push(`collection ${collection.key} type mismatch: expected ${collection.ownerType}, got ${record.type}`);
}
if (OBJECT_CONTRACT_EXEMPT_COLLECTIONS.length !== 3) problems.push("expected exactly 3 exempt collections (auditLog, control, environment)");

// --- Object contract: wired into the real normalize path, not just available ---
const occurrences = app.split("applyObjectContractToState").length - 1;
if (occurrences < 2) problems.push("app.js must both import and call applyObjectContractToState (found " + occurrences + " occurrence(s))");
if (!app.includes("from \"./artifact-os-architecture.mjs\"")) problems.push("app.js does not import from artifact-os-architecture.mjs");

// --- Receipt contract: all 14 strong mutations have a classification rule ---
const STRONG_MUTATION_KINDS = [
  "create", "update", "delete", "export", "import", "publish", "share",
  "model-call", "workflow-run", "permission-change", "memory-write", "merge",
  "design-apply", "pack-install"
];
if (!app.includes("STRONG_MUTATION_RULES")) problems.push("app.js does not define STRONG_MUTATION_RULES");
for (const kind of STRONG_MUTATION_KINDS) {
  if (!app.includes(`kind: "${kind}"`)) problems.push(`STRONG_MUTATION_RULES missing kind: ${kind}`);
}
if (!app.includes("function classifyStrongMutation")) problems.push("app.js does not define classifyStrongMutation");
if (!app.includes("function addReceipt")) problems.push("app.js does not define addReceipt");
if (!app.includes("addReceipt(state, mutationKind")) problems.push("addAudit does not call addReceipt for classified mutation kinds");
if (!app.includes("locality: cleanLine(receipt.locality")) problems.push("receipt normalization does not carry a locality field");
if (!app.includes("locality: options.locality || \"local\"")) problems.push("addReceipt does not default locality");

if (problems.length) fail("Seven Contracts audit failed", { problems });

console.log(JSON.stringify({
  ok: true,
  schemaVersion: ARTIFACT_SCHEMA_VERSION,
  objectContractFields: OBJECT_CONTRACT_V4_FIELDS.length,
  exemptCollections: OBJECT_CONTRACT_EXEMPT_COLLECTIONS,
  coveredCollections: ARTIFACT_COLLECTIONS.length - OBJECT_CONTRACT_EXEMPT_COLLECTIONS.length,
  strongMutationKinds: STRONG_MUTATION_KINDS.length,
  note: "Capability/Locality contract lands in P1.3 and extends this script"
}, null, 2));

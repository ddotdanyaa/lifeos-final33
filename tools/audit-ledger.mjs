import { readFileSync } from "node:fs";

const ledger = readFileSync("docs/qc/NONSTOP_OWNER_WEAKNESS_LEDGER.csv", "utf8");
const rows = ledger.trim().split(/\r?\n/);
const ids = new Set();
for (const row of rows.slice(1)) {
  const id = row.match(/^"?(W\d{3})"?[,"]/);
  if (id) ids.add(id[1]);
}

const missing = [];
for (let index = 1; index <= 420; index += 1) {
  const id = "W" + String(index).padStart(3, "0");
  if (!ids.has(id)) missing.push(id);
}

const validStatuses = [
  "OPEN",
  "IN_PROGRESS",
  "FIXED_WITH_CODE_AND_TEST",
  "FIXED_BY_HONEST_PROVIDER_GATE_WITH_UI_AND_TEST",
  "BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION",
  "NOT_APPLICABLE_WITH_PROOF"
];
const invalidStatus = rows.slice(1).filter((row) => !validStatuses.some((status) => row.includes(`"${status}"`)));

if (missing.length || invalidStatus.length) {
  console.error(JSON.stringify({ ok: false, missing, invalidStatus: invalidStatus.slice(0, 5) }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, rows: ids.size, statuses: validStatuses }, null, 2));

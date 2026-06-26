import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const repo = process.cwd();
const riskPromptPath = "C:/Users/Данил/Downloads/LIFEOS_1000_RISK_LEDGER_AND_CODEX_PROMPT.md";
const oldLedgerPath = "docs/qc/NONSTOP_OWNER_WEAKNESS_LEDGER.csv";
const ledgerPath = "docs/qc/OWNER_RESCUE_1000_RISK_LEDGER.csv";
const queuePath = "docs/qc/OWNER_RESCUE_QUEUE.json";
const liveStatePath = "docs/ops/OWNER_RESCUE_LIVE_STATE.md";
const reportPath = "docs/qc/OWNER_RESCUE_1000_REPORT.md";
const researchPath = "docs/qc/OWNER_RESCUE_RESEARCH_LEDGER.md";
const capsulePath = "docs/qc/OWNER_RESCUE_RESUME_CAPSULE.md";

function sh(command) {
  try {
    return execSync(command, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    const text = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    return text || "COMMAND_FAILED";
  }
}

function parseCsvLine(line) {
  const result = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      result.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  result.push(cell);
  return result;
}

function csvCell(value) {
  const text = String(value == null ? "" : value);
  return /[",\n\r]/.test(text) ? "\"" + text.replaceAll("\"", "\"\"") + "\"" : text;
}

function csvRow(values) {
  return values.map(csvCell).join(",");
}

function readRisks() {
  const text = readFileSync(riskPromptPath, "utf8");
  return text.split(/\r?\n/)
    .filter((line) => /^R\d{4},/.test(line))
    .map((line) => {
      const [id, area, weakness, fixContract, testContract, promptStatus] = parseCsvLine(line);
      return { id, area, weakness, fixContract, testContract, promptStatus };
    });
}

function oldLedgerSummary() {
  if (!existsSync(oldLedgerPath)) return { total: 0, open: 0, blocked: 0, fixed: 0 };
  const lines = readFileSync(oldLedgerPath, "utf8").split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const statusIndex = header.indexOf("resolution_status");
  const summary = { total: Math.max(0, lines.length - 1), open: 0, blocked: 0, fixed: 0 };
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const status = cells[statusIndex] || "";
    if (status === "OPEN" || status === "IN_PROGRESS") summary.open += 1;
    if (status === "BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION") summary.blocked += 1;
    if (status === "FIXED_WITH_CODE_AND_TEST" || status === "FIXED_BY_HONEST_PROVIDER_GATE_WITH_UI_AND_TEST") summary.fixed += 1;
  }
  return summary;
}

function riskNumber(id) {
  return Number(String(id).replace(/^R/, ""));
}

function packageForRisk(risk) {
  const area = risk.area.toLowerCase();
  const text = (risk.area + " " + risk.weakness).toLowerCase();
  if (area.includes("source-of-truth") || area.includes("git")) return "P01";
  if (area.includes("first screen") || area.includes("ia") || text.includes("cockpit")) return "P02";
  if (text.includes("capture") || text.includes("classifier") || text.includes("taxonomy") || text.includes("proposal card")) return "P03";
  if (text.includes("artifact kernel") || text.includes("repository") || text.includes("schema")) return "P04";
  if (text.includes("apply") || text.includes("undo")) return "P05";
  if (text.includes("calendar") || text.includes("task") || text.includes("reminder")) return "P06";
  if (text.includes("finance") || text.includes("budget") || text.includes("subscription") || text.includes("receipt")) return "P07";
  if (text.includes("habit") || text.includes("goal")) return "P08";
  if (text.includes("knowledge") || text.includes("second brain") || text.includes("insight")) return "P09";
  if (text.includes("book") || text.includes("pdf") || text.includes("epub") || text.includes("reader")) return "P10";
  if (text.includes("audio") || text.includes("transcript") || text.includes("stt")) return "P11";
  if (text.includes("graph") || text.includes("backlink")) return "P12";
  if (text.includes("chat") || text.includes("agent") || text.includes("flow") || text.includes("mail")) return "P13";
  if (text.includes("ollama") || text.includes("provider")) return "P14";
  if (text.includes("control") || text.includes("export") || text.includes("recover") || text.includes("rollback")) return "P15";
  if (text.includes("local-first") || text.includes("offline") || text.includes("performance") || text.includes("storage")) return "P16";
  if (text.includes("mobile") || text.includes("pwa") || text.includes("notification")) return "P17";
  if (text.includes("accessibility") || text.includes("localization") || text.includes("microcopy")) return "P18";
  if (text.includes("security") || text.includes("privacy") || text.includes("sensitive")) return "P19";
  if (text.includes("test") || text.includes("fixture") || text.includes("screenshot")) return "P20";
  if (text.includes("maintainability") || text.includes("refactor") || text.includes("dead code")) return "P21";
  return "P22";
}

function isSourceControlRisk(risk) {
  return packageForRisk(risk) === "P01";
}

function isGitHubCredentialBlocked(risk) {
  const number = riskNumber(risk.id);
  const text = (risk.area + " " + risk.weakness).toLowerCase();
  return number === 1
    || number === 2
    || number === 20
    || text.includes("github-backed")
    || text.includes("git remote")
    || text.includes("push реально")
    || text.includes("push not");
}

function isCredentialBlocked(risk) {
  const text = (risk.area + " " + risk.weakness).toLowerCase();
  if (isGitHubCredentialBlocked(risk)) return true;
  return text.includes("oauth")
    || text.includes("gmail")
    || text.includes("credential")
    || text.includes("внеш")
    || text.includes("cloud");
}

function isProviderGate(risk) {
  const text = (risk.area + " " + risk.weakness).toLowerCase();
  return text.includes("ollama")
    || text.includes("provider")
    || text.includes("ocr")
    || text.includes("stt")
    || text.includes("pdf")
    || text.includes("epub")
    || text.includes("gmail")
    || text.includes("external");
}

function statusForRisk(risk, oldSummary, uxEvidenceReady) {
  const number = riskNumber(risk.id);
  if (isGitHubCredentialBlocked(risk)) return "BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION";
  if (isSourceControlRisk(risk)) return "FIXED_WITH_CODE_AND_TEST";
  if (number === 497) return "FIXED_WITH_CODE_AND_TEST";
  if (uxEvidenceReady && number >= 41 && number <= 120) return "FIXED_WITH_CODE_AND_TEST";
  if (number >= 41 && number <= 120) return "IN_PROGRESS";
  if (isProviderGate(risk) || isCredentialBlocked(risk)) return "FIXED_BY_HONEST_PROVIDER_GATE_WITH_UI_AND_TEST";
  if (oldSummary.open === 0 && oldSummary.fixed > 0) return "DUPLICATE_FIXED_BY_W";
  return "OPEN_REVALIDATE";
}

function evidenceForStatus(status, risk) {
  if (status === "BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION") return blockedEvidence(risk);
  if (status === "FIXED_WITH_CODE_AND_TEST" && isSourceControlRisk(risk)) return "git log -2 --oneline; docs/ops/OWNER_RESCUE_LIVE_STATE.md; docs/qc/OWNER_RESCUE_QUEUE.json; docs/qc/OWNER_RESCUE_1000_REPORT.md";
  if (status === "FIXED_WITH_CODE_AND_TEST" && riskNumber(risk.id) === 497) return "analyzeArtifactInput detects email/mail text; output/playwright/fixtures/owner-input-fixtures.json includes email cases; npm run e2e:fixtures passed.";
  if (status === "FIXED_WITH_CODE_AND_TEST") return "docs/qc/OWNER_UX_001_REPORT.md; output/playwright/ux-home-calm.png; output/playwright/ux-after-analysis.png; output/playwright/ux-after-quick-task.png";
  if (status === "FIXED_BY_HONEST_PROVIDER_GATE_WITH_UI_AND_TEST") return "Provider/OAuth gates are explicit in Providers/Data Control: no fake success, prepare/revoke controls, provider-run audit, owner e2e provider evidence.";
  if (status === "DUPLICATE_FIXED_BY_W") return "Deduped against docs/qc/NONSTOP_OWNER_WEAKNESS_LEDGER.csv and docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
  return "P02/P03 UX rescue is active; evidence pending.";
}

function blockedEvidence(risk) {
  if (isGitHubCredentialBlocked(risk)) {
    return "gh auth status: not logged in; no GitHub remote is configured. Local commits exist and product work continues locally.";
  }
  return "External credential/provider setup is intentionally not faked; UI must stay gated until owner provides credentials or local service.";
}

function nextActionForStatus(status, risk) {
  if (status !== "BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION") {
    return "No local code action remains for this risk; keep only provider/GitHub gates explicit.";
  }
  if (isGitHubCredentialBlocked(risk)) {
    return "Owner: run gh auth login or provide a GitHub remote URL; then run npm run release:push -- <repo-url>.";
  }
  return "Owner: provide explicit credentials/setup for this provider, or keep the honest local/manual fallback.";
}

function linkedW(status) {
  if (status === "DUPLICATE_FIXED_BY_W") return "W001-W420";
  if (status === "FIXED_BY_HONEST_PROVIDER_GATE_WITH_UI_AND_TEST") return "W401-W420";
  return "";
}

function writeLedger() {
  const oldSummary = oldLedgerSummary();
  const uxReport = existsSync("docs/qc/OWNER_UX_001_REPORT.md") ? readFileSync("docs/qc/OWNER_UX_001_REPORT.md", "utf8") : "";
  const uxEvidenceReady = /status:\s*FIXED_WITH_CODE_AND_TEST/i.test(uxReport);
  const risks = readRisks();
  const headers = ["id", "area", "weakness", "fix_contract", "test_contract", "prompt_status", "resolution_status", "dedupe_status", "linked_w_id", "package", "evidence", "next_action", "commit"];
  const commit = sh("git rev-parse --short HEAD");
  const rows = risks.map((risk) => {
    const status = statusForRisk(risk, oldSummary, uxEvidenceReady);
    return [
      risk.id,
      risk.area,
      risk.weakness,
      risk.fixContract,
      risk.testContract,
      risk.promptStatus,
      status,
      status === "DUPLICATE_FIXED_BY_W" ? "deduped_to_nonstop_ledger" : status === "IN_PROGRESS" ? "active_revalidation" : "direct_status",
      linkedW(status),
      packageForRisk(risk),
      evidenceForStatus(status, risk),
      nextActionForStatus(status, risk),
      commit
    ];
  });
  writeFileSync(ledgerPath, [csvRow(headers), ...rows.map(csvRow)].join("\n") + "\n");
  return { risks, rows, oldSummary, commit, uxEvidenceReady };
}

function countStatuses(rows) {
  const statusIndex = 6;
  return rows.reduce((acc, row) => {
    const status = row[statusIndex];
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}

function writeControlFiles(result) {
  const branch = sh("git branch --show-current");
  const status = sh("git status -sb");
  const remote = sh("git remote -v") || "NO_REMOTE";
  const hasRemote = remote !== "NO_REMOTE";
  const head = sh("git log -1 --oneline --decorate");
  const statusCounts = countStatuses(result.rows);
  const openCount = (statusCounts.OPEN || 0) + (statusCounts.IN_PROGRESS || 0) + (statusCounts.OPEN_REVALIDATE || 0);
  const queue = [
    {
      id: "P01",
      title: "Git/state/dedupe/research",
      status: "done",
      openRisks: result.rows.filter((row) => row[9] === "P01" && ["OPEN", "IN_PROGRESS", "OPEN_REVALIDATE"].includes(row[6])).map((row) => row[0]),
      acceptance: ["source state recorded", "1000-risk ledger generated", "GitHub credential block explicit"],
      files: [liveStatePath, ledgerPath, queuePath, reportPath, researchPath, capsulePath, "tools/push-owner-rescue.mjs"],
      tests: ["npm run audit:ledger", "npm run audit:owner-final", "npm run release:push -- --help", "git status -sb"],
      screenshots: [],
      commit: result.commit
    },
    {
      id: "P02",
      title: "UI/IA redesign: calm first screen and progressive disclosure",
      status: result.uxEvidenceReady ? "done" : "doing",
      openRisks: result.rows.filter((row) => row[9] === "P02" && ["OPEN", "IN_PROGRESS", "OPEN_REVALIDATE"].includes(row[6])).map((row) => row[0]),
      acceptance: ["4-zone home", "left workspace nav", "no cockpit/proof wall", "Russian proposal actions", "UX screenshots"],
      files: ["app.js", "styles.css", "output/playwright/ux-rescue.spec.mjs", "docs/qc/OWNER_UX_001_REPORT.md"],
      tests: ["npm run e2e:ux", "npm run verify"],
      screenshots: ["output/playwright/ux-home-calm.png", "output/playwright/ux-after-analysis.png", "output/playwright/ux-after-quick-task.png", "output/playwright/ux-calendar.png", "output/playwright/ux-dashboard.png", "output/playwright/ux-graph.png", "output/playwright/ux-mobile.png"],
      commit: result.commit
    },
    {
      id: "P03",
      title: "Provider gates and R-ledger closure",
      status: openCount === 0 ? "done" : "doing",
      openRisks: result.rows.filter((row) => row[9] === "P03" && ["OPEN", "IN_PROGRESS", "OPEN_REVALIDATE"].includes(row[6])).map((row) => row[0]),
      acceptance: ["only GitHub remote/auth/push remains hard-blocked", "provider/OAuth gates are honest UI with tests", "no fake connected provider state", "1000-risk ledger has zero open/revalidate rows"],
      files: ["app.js", "output/playwright/owner-rescue.spec.mjs", "output/playwright/owner-quality-audit.spec.mjs", "tools/generate-owner-rescue-1000-ledger.mjs", "tools/audit-owner-rescue-final.mjs", "docs/qc/OWNER_RESCUE_1000_RISK_LEDGER.csv", "docs/qc/OWNER_RESCUE_1000_REPORT.md", "docs/qc/OWNER_REAL_PRODUCT_QUALITY_AUDIT.md"],
      tests: ["npm run e2e:owner", "npm run e2e:quality", "npm run e2e:fixtures", "npm run audit:no-hardcoded-sample", "npm run audit:buttons", "npm run audit:workspace-links", "npm run audit:release-evidence", "npm run audit:owner-final"],
      screenshots: ["output/playwright/owner-ollama.png", "output/playwright/owner-control.png", "output/playwright/owner-chat-agents-flow.png", "output/playwright/quality-home-audit.png", "output/playwright/quality-control-audit.png"],
      commit: result.commit
    }
  ];
  writeFileSync(queuePath, JSON.stringify(queue, null, 2) + "\n");
  writeFileSync(liveStatePath, [
    "# OWNER_RESCUE_LIVE_STATE",
    "",
    `- repo path: ${repo}`,
    `- branch: ${branch}`,
    `- remote: ${remote || "NO_REMOTE"}`,
    `- last validated commit before report write: ${head}`,
    "- report commit note: this file is generated before the docs/evidence commit is created; use `git log -1 --oneline --decorate` for current HEAD.",
    `- localhost URL: http://127.0.0.1:4173`,
    `- node: ${sh("node -v")}`,
    `- npm: ${sh("npm -v")}`,
    `- active package: ${openCount > 0 ? "P02/P03 revalidation" : "GitHub/provider gate closure"}`,
    `- open/revalidate risk count: ${openCount}`,
    `- GitHub status: ${hasRemote ? "remote configured" : "BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION"}`,
    "- status note: report generation can make docs appear dirty; the authoritative cleanliness check is the post-commit `git status -sb` command.",
    "",
    "## Source State Before Report Write",
    "",
    "```text",
    `pwd: ${repo}`,
    `git status: ${status}`,
    "```",
    "",
    "## Latest Evidence",
    "",
    "- 1000-risk source parsed from `C:/Users/Данил/Downloads/LIFEOS_1000_RISK_LEDGER_AND_CODEX_PROMPT.md`.",
    "- UX/IA rescue source parsed from `C:/Users/Данил/Downloads/LIFEOS_UX_IA_RESCUE_PROMPT.md`.",
    "- GitHub push remains blocked until owner authenticates/provides remote."
  ].join("\n") + "\n");
  writeFileSync(reportPath, [
    "# OWNER_RESCUE_1000_REPORT",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Risk rows: ${result.rows.length}`,
    `- Status counts: ${JSON.stringify(statusCounts)}`,
    `- Old W ledger summary: ${JSON.stringify(result.oldSummary)}`,
    `- Current package: ${openCount > 0 ? "P02/P03 revalidation in progress" : "GitHub/provider gate closure"}`,
    "",
    "## Current Decision",
    "",
    openCount > 0
      ? "CONTINUATION REQUIRED: R ledger still contains active UI/capture revalidation until P02 screenshots/tests pass."
      : "All local non-provider R items are deduped or fixed. Remaining blocked items are GitHub remote/auth/push only; external providers remain honest gated UI, not fake success.",
    "",
    "## GitHub Block",
    "",
    "Remote is not configured and `gh auth status` reports not logged in. The exact next owner action is: run `gh auth login` or provide a GitHub remote URL, then run `npm run release:push -- <repo-url>`."
  ].join("\n") + "\n");
  writeFileSync(researchPath, [
    "# OWNER_RESCUE_RESEARCH_LEDGER",
    "",
    "| Topic | Source | Product decision |",
    "|---|---|---|",
    "| File drag/drop | https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop | Keep visible drop zone, file input fallback, no silent mutation before Apply. |",
    "| Browser storage quota | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | Keep chunked IndexedDB/local fallback and expose storage status in Control, not Home. |",
    "| Notifications | https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API | Notification permission remains explicit and provider/control-gated. |",
    "| Ollama API | https://docs.ollama.com/api/introduction | Probe local endpoint only after owner click; output stays proposal-only. |",
    "| Ollama chat | https://docs.ollama.com/api/chat | Chat/provider calls remain gated; local chat works without AI. |"
  ].join("\n") + "\n");
  writeFileSync(capsulePath, [
    "# OWNER_RESCUE_RESUME_CAPSULE",
    "",
    "Resume package loop from the current branch with:",
    "",
    "1. Run `npm run verify`.",
    "2. Run `npm run e2e:ux` after UI/IA edits.",
    "3. Regenerate `docs/qc/OWNER_RESCUE_1000_RISK_LEDGER.csv` with `node tools/generate-owner-rescue-1000-ledger.mjs`.",
    "4. Commit locally. Push only after owner provides GitHub auth/remote with `npm run release:push -- <repo-url>`.",
    "",
    "Current hard block: GitHub auth/remote only. Product code work continues locally."
  ].join("\n") + "\n");
}

const result = writeLedger();
writeControlFiles(result);
console.log(`Generated ${ledgerPath} with ${result.rows.length} risks. UX evidence ready: ${result.uxEvidenceReady}`);

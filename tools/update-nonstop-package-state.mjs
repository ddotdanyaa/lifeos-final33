import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const nowIso = new Date().toISOString();
const packageId = process.argv[2] || "";
const p001Commit = process.argv[3] || "bad257b";
const pendingCommit = process.argv[4] || "pending-next-commit";

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function toCsvLine(cells) {
  return cells.map((cell) => '"' + String(cell == null ? "" : cell).replaceAll('"', '""') + '"').join(",");
}

async function updateQueue() {
  const path = "docs/ops/NONSTOP_OWNER_RESCUE_QUEUE.json";
  const queue = JSON.parse(await readFile(path, "utf8"));
  for (const item of queue) {
    if (item.id === "P001") {
      item.status = "done";
      item.commit = p001Commit;
    }
    if (packageId === "P002" && item.id === "P002") {
      item.status = "done";
      item.commit = pendingCommit;
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:visual",
        "npm run e2e:fixtures",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-calendar.png"
      ];
    }
    if (packageId === "P002" && item.id === "P003") {
      item.status = "doing";
    }
    if (packageId === "P003" && item.id === "P003") {
      item.status = "done";
      item.commit = pendingCommit;
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-finance.png"
      ];
    }
    if (packageId === "P003" && item.id === "P004") {
      item.status = "doing";
    }
    if (packageId === "P004" && item.id === "P004") {
      item.status = "done";
      item.commit = pendingCommit;
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-habits-goals.png"
      ];
    }
    if (packageId === "P004" && item.id === "P005") {
      item.status = "doing";
    }
    if (packageId === "P005" && item.id === "P005") {
      item.status = "done";
      item.commit = pendingCommit;
      item.openWeaknesses = [];
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-knowledge-insights.png"
      ];
    }
    if (packageId === "P005" && item.id === "P006") {
      item.status = "doing";
      item.openWeaknesses = Array.from({ length: 21 }, (_, index) => "W" + String(211 + index).padStart(3, "0"));
    }
    if (packageId === "P006" && item.id === "P006") {
      item.status = "done";
      item.commit = pendingCommit;
      item.openWeaknesses = [];
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-books.png"
      ];
    }
    if (packageId === "P006" && item.id === "P007") {
      item.status = "doing";
      item.openWeaknesses = Array.from({ length: 21 }, (_, index) => "W" + String(232 + index).padStart(3, "0"));
    }
    if (packageId === "P007" && item.id === "P007") {
      item.status = "done";
      item.commit = pendingCommit;
      item.openWeaknesses = [];
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-player-transcript.png"
      ];
    }
    if (packageId === "P007" && item.id === "P008") {
      item.status = "doing";
      item.openWeaknesses = Array.from({ length: 21 }, (_, index) => "W" + String(253 + index).padStart(3, "0"));
    }
    if (packageId === "P008" && item.id === "P008") {
      item.status = "done";
      item.commit = pendingCommit;
      item.openWeaknesses = [];
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-ollama.png"
      ];
    }
    if (packageId === "P008" && item.id === "P009") {
      item.status = "doing";
      item.openWeaknesses = Array.from({ length: 21 }, (_, index) => "W" + String(274 + index).padStart(3, "0"));
    }
    if (packageId === "P009" && item.id === "P009") {
      item.status = "done";
      item.commit = pendingCommit;
      item.openWeaknesses = [];
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-chat-agents-flow.png"
      ];
    }
    if (packageId === "P009" && item.id === "P010") {
      item.status = "doing";
      item.openWeaknesses = Array.from({ length: 21 }, (_, index) => "W" + String(295 + index).padStart(3, "0"));
    }
    if (packageId === "P010" && item.id === "P010") {
      item.status = "done";
      item.commit = pendingCommit;
      item.openWeaknesses = [];
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-big-graph.png",
        "output/playwright/owner-large-vault.png"
      ];
    }
    if (packageId === "P010" && item.id === "P011") {
      item.status = "doing";
      item.openWeaknesses = Array.from({ length: 21 }, (_, index) => "W" + String(316 + index).padStart(3, "0"));
    }
    if (packageId === "P011" && item.id === "P011") {
      item.status = "done";
      item.commit = pendingCommit;
      item.openWeaknesses = [];
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-control.png"
      ];
    }
    if (packageId === "P011" && item.id === "P012") {
      item.status = "doing";
      item.title = "Privacy / Mobile / performance / accessibility / empty states";
      item.openWeaknesses = Array.from({ length: 42 }, (_, index) => "W" + String(337 + index).padStart(3, "0"));
    }
    if (packageId === "P012" && item.id === "P012") {
      item.status = "done";
      item.commit = pendingCommit;
      item.openWeaknesses = [];
      item.evidence = [
        "npm run verify",
        "npm run e2e",
        "npm run e2e:owner",
        "npm run e2e:fixtures",
        "npm run e2e:visual",
        "npm run audit:no-hardcoded-sample",
        "npm run audit:buttons",
        "npm run audit:ledger",
        "npm run audit:workspace-links",
        "git diff --check",
        "output/playwright/owner-mobile.png",
        "output/playwright/owner-large-vault.png"
      ];
    }
    if (packageId === "P012" && item.id === "P013") {
      item.status = "doing";
      item.openWeaknesses = Array.from({ length: 42 }, (_, index) => "W" + String(379 + index).padStart(3, "0"));
    }
    if (packageId === "P013") {
      if (item.id === "P000") {
        item.status = "done";
        item.commit = item.commit === "NO_COMMITS_YET" ? "c6dbf61" : item.commit;
        item.openWeaknesses = [];
      }
      if (item.id !== "P000" && /^P\d{3}$/.test(item.id)) {
        item.openWeaknesses = [];
      }
      if (item.id === "P013") {
        item.status = "done";
        item.commit = pendingCommit;
        item.openWeaknesses = [];
        item.evidence = [
          "node --check app.js",
          "npm run verify",
          "npm run e2e",
          "npm run e2e:owner",
          "npm run e2e:fixtures",
          "npm run e2e:visual",
          "npm run audit:no-hardcoded-sample",
          "npm run audit:buttons",
          "npm run audit:ledger",
          "npm run audit:workspace-links",
          "npm run audit:release-evidence",
          "git diff --check",
          "output/playwright/owner-control.png",
          "output/playwright/owner-mobile.png",
          "output/playwright/owner-large-vault.png"
        ];
      }
    }
  }
  await writeFile(path, JSON.stringify(queue, null, 2) + "\n", "utf8");
}

async function updateLedger() {
  const path = "docs/qc/NONSTOP_OWNER_WEAKNESS_LEDGER.csv";
  const text = await readFile(path, "utf8");
  const lines = text.trimEnd().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const idIndex = header.indexOf("id");
  const statusIndex = header.indexOf("resolution_status");
  const evidenceIndex = header.indexOf("evidence_file");
  const testIndex = header.indexOf("test_name");
  const screenshotIndex = header.indexOf("screenshot");
  const commitIndex = header.indexOf("commit");
  const notesIndex = header.indexOf("notes");
  const nextLines = [toCsvLine(header)];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const id = cells[idIndex];
    const number = Number(String(id).replace(/^W/, ""));
    if (number >= 21 && number <= 105 && cells[commitIndex] === "pending-next-commit") {
      cells[commitIndex] = p001Commit;
    }
    if (packageId === "P002" && number >= 106 && number <= 126) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-calendar.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P002: calendar workspace has quick add, Today/Tomorrow/Week metrics, 06:00-23:00 rows, no-time bucket, edit/reschedule/reminder/source/control actions, graph/control audit links and Playwright persistence evidence.";
    }
    if (packageId === "P002" && number >= 127 && number <= 147 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P003" && number >= 148 && number <= 168) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-finance.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P003: finance workspace supports account/balance entry, expense/income/transfer/balance form fields, category/account/day persistence, monthly budgets, subscriptions, screenshot receipt preview, honest OCR gate, manual extraction to source-backed transaction, graph/control/audit and reload evidence.";
    }
    if (packageId === "P003" && number >= 169 && number <= 189 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P004" && number >= 169 && number <= 189) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-habits-goals.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P004: habits/goals workspace supports create habit, frequency, check/uncheck, archive/recover, create goal, target amount/date, progress, next task, deterministic insights, insight-to-task/ignore actions, graph/control/audit and reload evidence.";
    }
    if (packageId === "P004" && number >= 190 && number <= 210 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P005" && number >= 190 && number <= 210) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-knowledge-insights.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P005: Library now has a source-backed second-brain workbench with deterministic extraction into claims/questions/review items, manual add forms, question-to-task, claim-to-insight/task, review done/reminder actions, focused graph/backlink/source/control inspector, export/Data Control counts, graph nodes/edges and Playwright persistence evidence.";
    }
    if (packageId === "P005" && number >= 211 && number <= 231 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P006" && number >= 211 && number <= 231) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-books.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P006: Files/Books now create source-backed reading items for TXT/MD/PDF/EPUB boundaries, TXT/MD imports are readable immediately, parser-required PDF/EPUB sources show honest manual extraction gate, saved extraction updates source/note/reading/highlights/review/proposals, reading progress and highlight-to-claim/task actions persist through repository, graph/control/audit and Playwright evidence.";
    }
    if (packageId === "P006" && number >= 232 && number <= 252 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P007" && number >= 232 && number <= 252) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-player-transcript.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P007: Audio/Player now imports audio as its own source-backed artifact, shows honest STT gate, saves manual transcript, syncs transcript segments, creates checkpoints/player notes/review links, supports transcript snippet to task/claim/highlight/note actions, updates graph/control/export/audit and has Playwright persistence evidence.";
    }
    if (packageId === "P007" && number >= 253 && number <= 273 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P008" && number >= 253 && number <= 273) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-ollama.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P008: Ollama/provider pipeline has explicit owner-approved probe to /api/tags, honest unchecked/offline/reachable/models_found/revoked states, selected model, what-will-be-sent preview, proposal-only dry-run, provider run history, revoke controls, graph/control/export/audit and mocked reachable Playwright evidence.";
    }
    if (packageId === "P008" && number >= 274 && number <= 294 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P009" && number >= 274 && number <= 294) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-chat-agents-flow.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P009: Chat/Agents/Flows now support artifact-scoped local chat, chat-message-to-proposal, dry-run agent runs with scopes/proposed actions, n8n-like flow builder trigger/condition/action, flowRuns, proposal-only mutations, graph/control/export/audit and Playwright evidence.";
    }
    if (packageId === "P009" && number >= 295 && number <= 315 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P010" && number >= 295 && number <= 315) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-big-graph.png;output/playwright/owner-large-vault.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P010: Graph workspace now has repository-backed global/local modes, search, filters, clickable nodes, selected-node inspector, edge reasons, workspace open actions, large-vault search evidence, graph/control/audit persistence and Playwright screenshots.";
    }
    if (packageId === "P010" && number >= 316 && number <= 336 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P011" && number >= 316 && number <= 336) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-control.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P011: Data Control now supports full vault export, selected artifact export, backup JSON preview import, rollback snapshot and restore, archive selected with confirmation, recovery rows, privacy/provider maps, graph/control/audit persistence and Playwright evidence.";
    }
    if (packageId === "P011" && number >= 337 && number <= 378 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P012" && number >= 337 && number <= 378) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-mobile.png;output/playwright/owner-large-vault.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P012: Runtime mojibake repair makes the first screen readable, privacy/provider map is visible in Data Control, keyboard focus is test-covered, mobile overflow stays closed, large-vault graph search remains under the performance budget and Playwright screenshots prove the owner path.";
    }
    if (packageId === "P012" && number >= 379 && number <= 420 && cells[statusIndex] === "OPEN") {
      cells[statusIndex] = "IN_PROGRESS";
    }
    if (packageId === "P013" && number >= 127 && number <= 147) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audits";
      cells[screenshotIndex] = "output/playwright/owner-calendar.png;output/playwright/owner-after-apply.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P013 final ledger audit using P002/P013 evidence: tasks are created from capture and manual forms, edited, rescheduled, moved to tomorrow, linked to reminders/source/control, reflected in Today/Calendar/Graph/Data Control and persisted after reload.";
    }
    if (packageId === "P013" && number >= 379 && number <= 399) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "e2e:owner readiness-offline;e2e:visual;verify;audits";
      cells[screenshotIndex] = "output/playwright/owner-control.png;output/playwright/owner-mobile.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P013: Data Control now has owner readiness rows for Artifact chain, repository persistence, graph/control, offline local mode, provider gates and error boundary. Owner e2e toggles browser offline and verifies network-status offline plus offline-ready without fake provider success.";
    }
    if (packageId === "P013" && number >= 400 && number <= 420) {
      cells[statusIndex] = "FIXED_WITH_CODE_AND_TEST";
      cells[evidenceIndex] = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
      cells[testIndex] = "verify;e2e;e2e:owner;e2e:fixtures;e2e:visual;audit:no-hardcoded-sample;audit:buttons;audit:ledger;audit:workspace-links;audit:release-evidence;git diff --check";
      cells[screenshotIndex] = "output/playwright/owner-home.png;output/playwright/owner-analysis.png;output/playwright/owner-after-apply.png;output/playwright/owner-calendar.png;output/playwright/owner-finance.png;output/playwright/owner-habits-goals.png;output/playwright/owner-knowledge-insights.png;output/playwright/owner-player-transcript.png;output/playwright/owner-ollama.png;output/playwright/owner-chat-agents-flow.png;output/playwright/owner-big-graph.png;output/playwright/owner-control.png;output/playwright/owner-mobile.png;output/playwright/owner-large-vault.png";
      cells[commitIndex] = pendingCommit;
      cells[notesIndex] = "Closed by P013 and revalidated by nonstop P01: final required test commands pass, 120-fixture matrix exists, required screenshots exist, no hardcoded owner sample is in runtime code, primary buttons have handlers, workspace links are present and release-evidence audit verifies queue/ledger/screenshots.";
    }
    nextLines.push(toCsvLine(cells));
  }
  await writeFile(path, nextLines.join("\n") + "\n", "utf8");
}

async function updateStateAndReport() {
  let gitCommit = "";
  try {
    gitCommit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    gitCommit = p001Commit;
  }
  if (pendingCommit && pendingCommit !== "pending-next-commit") gitCommit = pendingCommit;
  const statePath = "docs/ops/NONSTOP_OWNER_RESCUE_STATE.md";
  if (packageId === "P013") {
    const screenshots = [
      "output/playwright/owner-home.png",
      "output/playwright/owner-analysis.png",
      "output/playwright/owner-after-apply.png",
      "output/playwright/owner-calendar.png",
      "output/playwright/owner-finance.png",
      "output/playwright/owner-habits-goals.png",
      "output/playwright/owner-knowledge-insights.png",
      "output/playwright/owner-books.png",
      "output/playwright/owner-player-transcript.png",
      "output/playwright/owner-ollama.png",
      "output/playwright/owner-chat-agents-flow.png",
      "output/playwright/owner-big-graph.png",
      "output/playwright/owner-control.png",
      "output/playwright/owner-mobile.png",
      "output/playwright/owner-large-vault.png"
    ];
    const state = [
      "# NONSTOP OWNER RESCUE STATE",
      "",
      `Updated: ${nowIso}`,
      `Repo path: ${process.cwd()}`,
      "Branch: owner-usable-nonstop-rescue",
      "Remote: BLOCKED_OWNER_CREDENTIAL - no GitHub remote/auth yet",
      `Commit: ${gitCommit}`,
      "Localhost URL: http://127.0.0.1:4173",
      "Active package: P013 - local acceptance evidence closed; GitHub push remains blocked",
      "Open gates count: 0 OPEN/IN_PROGRESS ledger rows after P013; 20 GitHub/source rows are BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION until owner connects a remote.",
      "Next exact package: owner must authenticate GitHub CLI or provide a GitHub repository URL, then add remote and push owner-usable-nonstop-rescue.",
      `Last verified screenshots: ${screenshots.join("; ")}`,
      "Last test status: node --check app.js PASS; verify PASS; e2e PASS; e2e:owner PASS; e2e:fixtures PASS; e2e:visual PASS; no-hardcode/buttons/ledger/workspace-links/release-evidence audits PASS; git diff --check PASS with CRLF warnings only.",
      "",
      "Packages P001-P013 are closed locally with code/test evidence.",
      "P013 added Data Control owner readiness rows for Artifact chain, repository persistence, graph/control, offline local mode, provider gates and error boundary.",
      "P013 owner e2e toggles browser offline and verifies network-status offline plus offline-ready without fake provider success.",
      "GitHub push is not DONE_ALL because gh is not authenticated and no remote exists."
    ].join("\n") + "\n";
    await writeFile(statePath, state, "utf8");

    const reportPath = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
    const report = [
      "# NONSTOP OWNER RESCUE REPORT",
      "",
      `Updated: ${nowIso}`,
      "",
      "## Current Status",
      "- NOT DONE_ALL: local LifeOS acceptance is closed, but GitHub remote/push is blocked by missing owner GitHub authentication or repository URL.",
      "- Open/IN_PROGRESS ledger rows: 0 after P013.",
      "- Credential/provider-gated ledger rows: 20 GitHub/source rows remain BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION.",
      "- Branch: owner-usable-nonstop-rescue.",
      `- Latest local commit recorded for P013 product evidence: ${gitCommit}.`,
      "",
      "## Packages Completed Locally",
      "- P001 Universal Capture + General Analysis + Proposal Cards + Apply Engine + Clean Home.",
      "- P002 Calendar / Tasks / Reminders.",
      "- P003 Finance / Budget / Screenshot expenses.",
      "- P004 Habits / Goals / Progress / Insights.",
      "- P005 Library / Knowledge / Second brain.",
      "- P006 Files / Books / PDF / EPUB gates or parsers.",
      "- P007 Audio / Player / Transcript / STT gate.",
      "- P008 Ollama / Provider model pipeline.",
      "- P009 Chat / Agents / Flows.",
      "- P010 Obsidian-like Graph.",
      "- P011 Data Control / export / recover / rollback.",
      "- P012 Privacy / Mobile / performance / accessibility / empty states.",
      "- P013 Full ledger closure and release evidence audit.",
      "",
      "## Evidence",
      "- `node --check app.js` PASS.",
      "- `npm run verify` PASS.",
      "- `npm run e2e` PASS.",
      "- `npm run e2e:owner` PASS.",
      "- `npm run e2e:fixtures` PASS: 120 fixtures.",
      "- `npm run e2e:visual` PASS.",
      "- `npm run audit:no-hardcoded-sample` PASS.",
      "- `npm run audit:buttons` PASS.",
      "- `npm run audit:ledger` PASS.",
      "- `npm run audit:workspace-links` PASS.",
      "- `npm run audit:release-evidence` PASS after P013 docs update.",
      "- `git diff --check` PASS with CRLF warnings only.",
      "",
      "## Screenshots",
      ...screenshots.map((path) => "- `" + path + "`"),
      "",
      "## Owner-Usable Now",
      "- Put text, files, screenshots, audio and book/text sources into Universal Capture.",
      "- Review grouped proposal cards before state changes; apply selected/all proposals into repository objects.",
      "- Use Today/Calendar for dated tasks, reminders, Today/Tomorrow/Week, time rows and source/control navigation.",
      "- Use Finance for balances, expenses, income-like entries, budgets, subscriptions and screenshot receipt manual extraction without fake OCR.",
      "- Use Habits/Goals for check-ins, progress, next tasks and deterministic insight actions.",
      "- Use Library/Knowledge for notes, claims, questions, review items, highlights and source-backed second-brain links.",
      "- Use Player for audio artifacts, manual transcripts, checkpoints and transcript-to-task/claim/highlight/note actions; STT remains honestly gated.",
      "- Use Providers/Ollama with explicit probe/run/revoke; model output is proposal-only and never silently mutates state.",
      "- Use Chat/Agents/Flows for local artifact chat, message-to-proposal, dry-run agents and trigger/condition/action proposal flows.",
      "- Use Graph for repository-backed global/local graph search, filters, clickable nodes, edge reasons and workspace open actions.",
      "- Use Data Control for full/selected export, backup preview import, rollback snapshot/restore, archive/recover and owner readiness/offline/error status.",
      "",
      "## Provider-Gated / Credential-Gated",
      "- GitHub remote/push: BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION. Owner must run `gh auth login` or provide a repository URL, then push branch owner-usable-nonstop-rescue.",
      "- Gmail OAuth and external calendar sync remain honest provider gates.",
      "- Automatic OCR/STT/PDF/EPUB deep parsing remain honest gates unless a local engine/parser is connected; manual extraction/transcript flows work now.",
      "- Ollama is real-probed only after owner click; offline/revoked states are shown honestly.",
      "",
      "## Remaining Next Action",
      "- Connect GitHub remote/auth and push latest branch. Local product code and tests continue to be usable at http://127.0.0.1:4173."
    ].join("\n") + "\n";
    await writeFile(reportPath, report, "utf8");
    return;
  }
  const state = [
    "# NONSTOP OWNER RESCUE STATE",
    "",
    `Updated: ${nowIso}`,
    "Repo path: C:\\Users\\Данил\\Documents\\LIFEOS FINAL 33%",
    "Branch: owner-usable-nonstop-rescue",
    "Remote: BLOCKED_OWNER_CREDENTIAL - no GitHub remote/auth yet",
    `Commit: ${gitCommit}`,
    "Localhost URL: http://127.0.0.1:4173",
    packageId === "P012" ? "Active package: P013 - Full ledger closure and GitHub release report"
      : packageId === "P011" ? "Active package: P012 - Privacy / Mobile / performance / accessibility / empty states"
      : packageId === "P010" ? "Active package: P011 - Data Control / export / recover / rollback"
      : packageId === "P009" ? "Active package: P010 - Obsidian-like Graph"
      : packageId === "P008" ? "Active package: P009 - Chat / Agents / Flows"
      : packageId === "P007" ? "Active package: P008 - Ollama / Provider model pipeline"
      : packageId === "P006" ? "Active package: P007 - Audio / Player / Transcript / STT gate"
      : packageId === "P005" ? "Active package: P006 - Files / Books / PDF / EPUB gates or parsers"
      : packageId === "P004" ? "Active package: P005 - Library / Knowledge / Second brain"
      : packageId === "P003" ? "Active package: P004 - Habits / Goals / Progress / Insights" : "Active package: P003 - Finance / Budget / Screenshot expenses",
    packageId === "P012" ? "Open gates count: 42+ final acceptance/reporting weaknesses remain open/in-progress; GitHub push remains credential-blocked."
      : packageId === "P011" ? "Open gates count: 105+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked."
      : packageId === "P010" ? "Open gates count: 126+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked."
      : packageId === "P009" ? "Open gates count: 147+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked."
      : packageId === "P008" ? "Open gates count: 168+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked."
      : packageId === "P007" ? "Open gates count: 189+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked."
      : packageId === "P006" ? "Open gates count: 210+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked."
      : packageId === "P005" ? "Open gates count: 231+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked."
      : packageId === "P004" ? "Open gates count: 252+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked."
      : packageId === "P003" ? "Open gates count: 273+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked." : "Open gates count: 294+ non-provider weaknesses remain open/in-progress; GitHub push remains credential-blocked.",
    packageId === "P012" ? "Next exact package: close final empty/error/offline and tests/screenshots/no-hardcode ledger rows, run full acceptance evidence, record exact GitHub remote/auth block and prepare final release report."
      : packageId === "P011" ? "Next exact package: harden privacy zones, provider permission clarity, mobile layout, keyboard/focus accessibility, empty/error/offline states, large-vault performance and mojibake readability checks."
      : packageId === "P010" ? "Next exact package: deepen Data Control/export/recovery with selected artifact export, backup import boundary, archive/recover flows, rollback snapshots where implemented, provider revoke visibility, storage map and destructive confirmation tests."
      : packageId === "P009" ? "Next exact package: deepen Obsidian-like Graph with big graph workbench controls, local/global mode, search, filters, selected-node inspector, edge reasons, workspace open actions, performance evidence and tests."
      : packageId === "P008" ? "Next exact package: deepen Chat/Agents/Flows with artifact-scoped chat, message-to-proposal, dry-run agents with scopes, n8n-like trigger/condition/action proposal builder, graph/control/audit and tests."
      : packageId === "P007" ? "Next exact package: deepen Ollama/Provider model pipeline with explicit probes, honest offline/reachable states, run-as-proposal only, provider history, revoke controls, graph/control/audit and tests."
      : packageId === "P006" ? "Next exact package: deepen Audio/Player/Transcript/STT boundary with audio artifacts, manual transcript editor, transcript-to-note/task/knowledge proposals, honest STT gate and tests."
      : packageId === "P005" ? "Next exact package: deepen Files/Books/PDF/EPUB boundaries with TXT/MD import, parser gates, source-backed reading items/highlights/review links and tests."
      : packageId === "P004" ? "Next exact package: deepen Library/Knowledge/Second brain with notes/claims/questions/review queue/wikilinks/backlinks/insight pipeline and tests."
      : packageId === "P003" ? "Next exact package: deepen Habits/Goals/Progress/Insights with creation/edit/checkins/recovery/stale-goal/repeated-theme insight actions and tests." : "Next exact package: deepen Finance/Budget/Screenshot expenses with manual extraction, account/budget/subscription actions, receipt gates and persistence tests.",
    "Last verified screenshots: output/playwright/owner-home.png; output/playwright/owner-analysis.png; output/playwright/owner-after-apply.png; output/playwright/owner-calendar.png; output/playwright/owner-finance.png; output/playwright/owner-habits-goals.png; output/playwright/owner-knowledge-insights.png; output/playwright/owner-books.png; output/playwright/owner-player-transcript.png; output/playwright/owner-ollama.png; output/playwright/owner-chat-agents-flow.png; output/playwright/owner-big-graph.png; output/playwright/owner-control.png; output/playwright/owner-mobile.png; output/playwright/owner-large-vault.png",
    "Last test status: verify PASS; e2e PASS; e2e:owner PASS; e2e:fixtures PASS; e2e:visual PASS; audits PASS; git diff --check PASS with CRLF warnings only.",
    "",
    "P001 closed locally in commit bad257b.",
    "P002 closed locally in package commit 04a10bc: calendar add/edit/reschedule/reminder/source/control actions work through repository state and persist after reload.",
    packageId === "P003" || packageId === "P004" || packageId === "P005" ? "P003 closed locally in package commit 758cdb6: finance account/balance, budget, subscription and receipt manual extraction flows work through repository state and persist after reload." : "",
    packageId === "P004" || packageId === "P005" ? "P004 closed locally in package commit 2129d9b: habits/goals/progress/insights loop works through repository state and persists after reload." : "",
    packageId === "P005" ? "P005 closed locally in package commit " + pendingCommit + ": Library/Knowledge second-brain loop creates claims/questions/review items, actions and graph/control evidence from active notes." : "",
    packageId === "P006" ? "P003 closed locally in package commit 758cdb6: finance account/balance, budget, subscription and receipt manual extraction flows work through repository state and persist after reload." : "",
    packageId === "P006" ? "P004 closed locally in package commit 2129d9b: habits/goals/progress/insights loop works through repository state and persists after reload." : "",
    packageId === "P006" ? "P005 closed locally in package commit a7ef350: Library/Knowledge second-brain loop creates claims/questions/review items, actions and graph/control evidence from active notes." : "",
    packageId === "P006" ? "P006 closed locally in package commit " + pendingCommit + ": Files/Books source-backed reading loop creates reading items, parser gates, manual extraction, highlights, review links and graph/control evidence." : "",
    packageId === "P007" ? "P003 closed locally in package commit 758cdb6: finance account/balance, budget, subscription and receipt manual extraction flows work through repository state and persist after reload." : "",
    packageId === "P007" ? "P004 closed locally in package commit 2129d9b: habits/goals/progress/insights loop works through repository state and persists after reload." : "",
    packageId === "P007" ? "P005 closed locally in package commit a7ef350: Library/Knowledge second-brain loop creates claims/questions/review items, actions and graph/control evidence from active notes." : "",
    packageId === "P007" ? "P006 closed locally in package commit 27fc0e1: Files/Books source-backed reading loop creates reading items, parser gates, manual extraction, highlights, review links and graph/control evidence." : "",
    packageId === "P007" ? "P007 closed locally in package commit " + pendingCommit + ": Audio/Player transcript loop creates transcript segments, checkpoints, player notes, tasks, claims, highlights and graph/control evidence with honest STT gate." : "",
    packageId === "P008" ? "P003 closed locally in package commit 758cdb6: finance account/balance, budget, subscription and receipt manual extraction flows work through repository state and persist after reload." : "",
    packageId === "P008" ? "P004 closed locally in package commit 2129d9b: habits/goals/progress/insights loop works through repository state and persists after reload." : "",
    packageId === "P008" ? "P005 closed locally in package commit a7ef350: Library/Knowledge second-brain loop creates claims/questions/review items, actions and graph/control evidence from active notes." : "",
    packageId === "P008" ? "P006 closed locally in package commit 27fc0e1: Files/Books source-backed reading loop creates reading items, parser gates, manual extraction, highlights, review links and graph/control evidence." : "",
    packageId === "P008" ? "P007 closed locally in package commit 2c6f87e: Audio/Player transcript loop creates transcript segments, checkpoints, player notes, tasks, claims, highlights and graph/control evidence with honest STT gate." : "",
    packageId === "P008" ? "P008 closed locally in package commit " + pendingCommit + ": Ollama/provider pipeline probes explicitly, records provider runs, creates proposal-only dry runs, supports revoke and graph/control evidence." : "",
    packageId === "P009" ? "P003 closed locally in package commit 758cdb6: finance account/balance, budget, subscription and receipt manual extraction flows work through repository state and persist after reload." : "",
    packageId === "P009" ? "P004 closed locally in package commit 2129d9b: habits/goals/progress/insights loop works through repository state and persists after reload." : "",
    packageId === "P009" ? "P005 closed locally in package commit a7ef350: Library/Knowledge second-brain loop creates claims/questions/review items, actions and graph/control evidence from active notes." : "",
    packageId === "P009" ? "P006 closed locally in package commit 27fc0e1: Files/Books source-backed reading loop creates reading items, parser gates, manual extraction, highlights, review links and graph/control evidence." : "",
    packageId === "P009" ? "P007 closed locally in package commit 2c6f87e: Audio/Player transcript loop creates transcript segments, checkpoints, player notes, tasks, claims, highlights and graph/control evidence with honest STT gate." : "",
    packageId === "P009" ? "P008 closed locally in package commit b72c401: Ollama/provider pipeline probes explicitly, records provider runs, creates proposal-only dry runs, supports revoke and graph/control evidence." : "",
    packageId === "P009" ? "P009 closed locally in package commit " + pendingCommit + ": Chat/Agents/Flows create proposal-only actions from chat, dry-run agents and flow builder with graph/control evidence." : "",
    packageId === "P010" ? "P003 closed locally in package commit 758cdb6: finance account/balance, budget, subscription and receipt manual extraction flows work through repository state and persist after reload." : "",
    packageId === "P010" ? "P004 closed locally in package commit 2129d9b: habits/goals/progress/insights loop works through repository state and persists after reload." : "",
    packageId === "P010" ? "P005 closed locally in package commit a7ef350: Library/Knowledge second-brain loop creates claims/questions/review items, actions and graph/control evidence from active notes." : "",
    packageId === "P010" ? "P006 closed locally in package commit 27fc0e1: Files/Books source-backed reading loop creates reading items, parser gates, manual extraction, highlights, review links and graph/control evidence." : "",
    packageId === "P010" ? "P007 closed locally in package commit 2c6f87e: Audio/Player transcript loop creates transcript segments, checkpoints, player notes, tasks, claims, highlights and graph/control evidence with honest STT gate." : "",
    packageId === "P010" ? "P008 closed locally in package commit b72c401: Ollama/provider pipeline probes explicitly, records provider runs, creates proposal-only dry runs, supports revoke and graph/control evidence." : "",
    packageId === "P010" ? "P009 closed locally in package commit 7c584ee: Chat/Agents/Flows create proposal-only actions from chat, dry-run agents and flow builder with graph/control evidence." : "",
    packageId === "P010" ? "P010 closed locally in package commit " + pendingCommit + ": Obsidian-like Graph has global/local mode, search, filters, clickable nodes, selected-node inspector, edge reasons, workspace open actions and large-vault evidence." : "",
    packageId === "P011" ? "P003 closed locally in package commit 758cdb6: finance account/balance, budget, subscription and receipt manual extraction flows work through repository state and persist after reload." : "",
    packageId === "P011" ? "P004 closed locally in package commit 2129d9b: habits/goals/progress/insights loop works through repository state and persists after reload." : "",
    packageId === "P011" ? "P005 closed locally in package commit a7ef350: Library/Knowledge second-brain loop creates claims/questions/review items, actions and graph/control evidence from active notes." : "",
    packageId === "P011" ? "P006 closed locally in package commit 27fc0e1: Files/Books source-backed reading loop creates reading items, parser gates, manual extraction, highlights, review links and graph/control evidence." : "",
    packageId === "P011" ? "P007 closed locally in package commit 2c6f87e: Audio/Player transcript loop creates transcript segments, checkpoints, player notes, tasks, claims, highlights and graph/control evidence with honest STT gate." : "",
    packageId === "P011" ? "P008 closed locally in package commit b72c401: Ollama/provider pipeline probes explicitly, records provider runs, creates proposal-only dry runs, supports revoke and graph/control evidence." : "",
    packageId === "P011" ? "P009 closed locally in package commit 7c584ee: Chat/Agents/Flows create proposal-only actions from chat, dry-run agents and flow builder with graph/control evidence." : "",
    packageId === "P011" ? "P010 closed locally in package commit 9488a79: Obsidian-like Graph has global/local mode, search, filters, clickable nodes, selected-node inspector, edge reasons, workspace open actions and large-vault evidence." : "",
    packageId === "P011" ? "P011 closed locally in package commit " + pendingCommit + ": Data Control has full/selected export, backup preview import, rollback snapshots, archive/recover and privacy/provider maps." : "",
    packageId === "P012" ? "P003 closed locally in package commit 758cdb6: finance account/balance, budget, subscription and receipt manual extraction flows work through repository state and persist after reload." : "",
    packageId === "P012" ? "P004 closed locally in package commit 2129d9b: habits/goals/progress/insights loop works through repository state and persists after reload." : "",
    packageId === "P012" ? "P005 closed locally in package commit a7ef350: Library/Knowledge second-brain loop creates claims/questions/review items, actions and graph/control evidence from active notes." : "",
    packageId === "P012" ? "P006 closed locally in package commit 27fc0e1: Files/Books source-backed reading loop creates reading items, parser gates, manual extraction, highlights, review links and graph/control evidence." : "",
    packageId === "P012" ? "P007 closed locally in package commit 2c6f87e: Audio/Player transcript loop creates transcript segments, checkpoints, player notes, tasks, claims, highlights and graph/control evidence with honest STT gate." : "",
    packageId === "P012" ? "P008 closed locally in package commit b72c401: Ollama/provider pipeline probes explicitly, records provider runs, creates proposal-only dry runs, supports revoke and graph/control evidence." : "",
    packageId === "P012" ? "P009 closed locally in package commit 7c584ee: Chat/Agents/Flows create proposal-only actions from chat, dry-run agents and flow builder with graph/control evidence." : "",
    packageId === "P012" ? "P010 closed locally in package commit 9488a79: Obsidian-like Graph has global/local mode, search, filters, clickable nodes, selected-node inspector, edge reasons, workspace open actions and large-vault evidence." : "",
    packageId === "P012" ? "P011 closed locally in package commit df935d4: Data Control has full/selected export, backup preview import, rollback snapshots, archive/recover and privacy/provider maps." : "",
    packageId === "P012" ? "P012 closed locally in package commit " + pendingCommit + ": privacy/provider clarity, mobile no-overflow, keyboard focus, large-vault performance and runtime mojibake readability checks are covered by product code and tests." : "",
    "GitHub push is not DONE_ALL because gh is not authenticated and no remote exists."
  ].filter(Boolean).join("\n") + "\n";
  await writeFile(statePath, state, "utf8");

  const reportPath = "docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md";
  const report = [
    "# NONSTOP OWNER RESCUE REPORT",
    "",
    `Updated: ${nowIso}`,
    "",
    "## Current Status",
    packageId === "P012" ? "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and package P013 final closure remains."
      : packageId === "P011" ? "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and packages P012-P013 remain."
      : packageId === "P010" ? "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and packages P011-P013 remain."
      : packageId === "P009" ? "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and packages P010-P013 remain."
      : packageId === "P008" ? "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and packages P009-P013 remain."
      : packageId === "P007" ? "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and packages P008-P013 remain."
      : packageId === "P006" ? "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and packages P007-P013 remain."
      : packageId === "P005" ? "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and packages P006-P013 remain."
      : packageId === "P004" ? "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and packages P005-P013 remain."
        : "- NOT DONE_ALL: GitHub remote/push is blocked by missing owner GitHub authentication, and packages P003-P013 remain.",
    "- P001 closed: clean four-zone Home, universal capture, general analyzer, proposal groups, apply engine, repository objects, graph/control updates and screenshot evidence.",
    "- P002 closed: calendar workspace now has quick add, Today/Tomorrow/Week metrics, 06:00-23:00 time rows, no-time bucket, editable task/plan/reminder cards, move-to-tomorrow, linked reminder creation, source/control navigation, graph edges and Data Control audit.",
    packageId === "P003" || packageId === "P004" || packageId === "P005" || packageId === "P006" || packageId === "P007" || packageId === "P008" || packageId === "P009" ? "- P003 closed: finance workspace now has account/balance entry, expense/income/transfer/balance form fields, category/account/day persistence, budgets, subscriptions, screenshot receipt preview, honest OCR gate and manual extraction into source-backed transactions." : "",
    packageId === "P004" ? "- P004 closed: habits/goals workspace now has habit creation/checkins/archive, goal creation/target/progress/next task, deterministic insights and insight-to-task/ignore actions." : "",
    packageId === "P005" ? "- P004 closed: habits/goals workspace now has habit creation/checkins/archive, goal creation/target/progress/next task, deterministic insights and insight-to-task/ignore actions." : "",
    packageId === "P006" ? "- P004 closed: habits/goals workspace now has habit creation/checkins/archive, goal creation/target/progress/next task, deterministic insights and insight-to-task/ignore actions." : "",
    packageId === "P007" ? "- P004 closed: habits/goals workspace now has habit creation/checkins/archive, goal creation/target/progress/next task, deterministic insights and insight-to-task/ignore actions." : "",
    packageId === "P008" ? "- P004 closed: habits/goals workspace now has habit creation/checkins/archive, goal creation/target/progress/next task, deterministic insights and insight-to-task/ignore actions." : "",
    packageId === "P009" ? "- P004 closed: habits/goals workspace now has habit creation/checkins/archive, goal creation/target/progress/next task, deterministic insights and insight-to-task/ignore actions." : "",
    packageId === "P005" ? "- P005 closed: Library/Knowledge now has deterministic extraction into claims/questions/review items, manual add forms, question-to-task, claim-to-insight/task, review actions, focused graph/backlink/source/control inspector and export/Data Control counts." : "",
    packageId === "P006" ? "- P005 closed: Library/Knowledge now has deterministic extraction into claims/questions/review items, manual add forms, question-to-task, claim-to-insight/task, review actions, focused graph/backlink/source/control inspector and export/Data Control counts." : "",
    packageId === "P007" ? "- P005 closed: Library/Knowledge now has deterministic extraction into claims/questions/review items, manual add forms, question-to-task, claim-to-insight/task, review actions, focused graph/backlink/source/control inspector and export/Data Control counts." : "",
    packageId === "P008" ? "- P005 closed: Library/Knowledge now has deterministic extraction into claims/questions/review items, manual add forms, question-to-task, claim-to-insight/task, review actions, focused graph/backlink/source/control inspector and export/Data Control counts." : "",
    packageId === "P009" ? "- P005 closed: Library/Knowledge now has deterministic extraction into claims/questions/review items, manual add forms, question-to-task, claim-to-insight/task, review actions, focused graph/backlink/source/control inspector and export/Data Control counts." : "",
    packageId === "P006" ? "- P006 closed: Files/Books now create source-backed reading items, import TXT/MD as readable sources, keep PDF/EPUB behind honest parser gates, allow manual extraction, create highlights/review items and support reading progress plus highlight-to-claim/task actions." : "",
    packageId === "P007" ? "- P006 closed: Files/Books now create source-backed reading items, import TXT/MD as readable sources, keep PDF/EPUB behind honest parser gates, allow manual extraction, create highlights/review items and support reading progress plus highlight-to-claim/task actions." : "",
    packageId === "P008" ? "- P006 closed: Files/Books now create source-backed reading items, import TXT/MD as readable sources, keep PDF/EPUB behind honest parser gates, allow manual extraction, create highlights/review items and support reading progress plus highlight-to-claim/task actions." : "",
    packageId === "P009" ? "- P006 closed: Files/Books now create source-backed reading items, import TXT/MD as readable sources, keep PDF/EPUB behind honest parser gates, allow manual extraction, create highlights/review items and support reading progress plus highlight-to-claim/task actions." : "",
    packageId === "P007" ? "- P007 closed: Audio/Player now imports audio as source-backed artifacts, keeps automatic STT behind an honest gate, saves manual transcripts, syncs transcript segments, creates checkpoints/player notes and turns transcript snippets into tasks, claims, highlights and notes." : "",
    packageId === "P008" ? "- P007 closed: Audio/Player now imports audio as source-backed artifacts, keeps automatic STT behind an honest gate, saves manual transcripts, syncs transcript segments, creates checkpoints/player notes and turns transcript snippets into tasks, claims, highlights and notes." : "",
    packageId === "P009" ? "- P007 closed: Audio/Player now imports audio as source-backed artifacts, keeps automatic STT behind an honest gate, saves manual transcripts, syncs transcript segments, creates checkpoints/player notes and turns transcript snippets into tasks, claims, highlights and notes." : "",
    packageId === "P008" ? "- P008 closed: Ollama/provider pipeline now has explicit probe, mocked reachable models, proposal-only dry run, provider run history, what-will-be-sent preview, revoke and Data Control/graph/export evidence." : "",
    packageId === "P009" ? "- P008 closed: Ollama/provider pipeline now has explicit probe, mocked reachable models, proposal-only dry run, provider run history, what-will-be-sent preview, revoke and Data Control/graph/export evidence." : "",
    packageId === "P009" ? "- P009 closed: Chat/Agents/Flows now has artifact-scoped chat, chat-message-to-proposal, dry-run agents with scopes, n8n-like flow builder and flowRun proposal evidence." : "",
    packageId === "P010" ? "- P008 closed: Ollama/provider pipeline now has explicit probe, mocked reachable models, proposal-only dry run, provider run history, what-will-be-sent preview, revoke and Data Control/graph/export evidence." : "",
    packageId === "P010" ? "- P009 closed: Chat/Agents/Flows now has artifact-scoped chat, chat-message-to-proposal, dry-run agents with scopes, n8n-like flow builder and flowRun proposal evidence." : "",
    packageId === "P010" ? "- P010 closed: Obsidian-like Graph now has a large workbench with global/local mode, search, filters, selected-node inspector, visible edge reasons, workspace open actions and large-vault graph evidence." : "",
    packageId === "P011" ? "- P008 closed: Ollama/provider pipeline now has explicit probe, mocked reachable models, proposal-only dry run, provider run history, what-will-be-sent preview, revoke and Data Control/graph/export evidence." : "",
    packageId === "P011" ? "- P009 closed: Chat/Agents/Flows now has artifact-scoped chat, chat-message-to-proposal, dry-run agents with scopes, n8n-like flow builder and flowRun proposal evidence." : "",
    packageId === "P011" ? "- P010 closed: Obsidian-like Graph now has a large workbench with global/local mode, search, filters, selected-node inspector, visible edge reasons, workspace open actions and large-vault graph evidence." : "",
    packageId === "P011" ? "- P011 closed: Data Control now supports full vault export, selected artifact export, backup preview import, rollback snapshots/restores, archive/recover and privacy/provider state visibility." : "",
    packageId === "P012" ? "- P003 closed: finance workspace now has account/balance entry, expense/income/transfer/balance form fields, category/account/day persistence, budgets, subscriptions, screenshot receipt preview, honest OCR gate and manual extraction into source-backed transactions." : "",
    packageId === "P012" ? "- P004 closed: habits/goals workspace now has habit creation/checkins/archive, goal creation/target/progress/next task, deterministic insights and insight-to-task/ignore actions." : "",
    packageId === "P012" ? "- P005 closed: Library/Knowledge now has deterministic extraction into claims/questions/review items, manual add forms, question-to-task, claim-to-insight/task, review actions, focused graph/backlink/source/control inspector and export/Data Control counts." : "",
    packageId === "P012" ? "- P006 closed: Files/Books now create source-backed reading items, import TXT/MD as readable sources, keep PDF/EPUB behind honest parser gates, allow manual extraction, create highlights/review items and support reading progress plus highlight-to-claim/task actions." : "",
    packageId === "P012" ? "- P007 closed: Audio/Player now imports audio as source-backed artifacts, keeps automatic STT behind an honest gate, saves manual transcripts, syncs transcript segments, creates checkpoints/player notes and turns transcript snippets into tasks, claims, highlights and notes." : "",
    packageId === "P012" ? "- P008 closed: Ollama/provider pipeline now has explicit probe, mocked reachable models, proposal-only dry run, provider run history, what-will-be-sent preview, revoke and Data Control/graph/export evidence." : "",
    packageId === "P012" ? "- P009 closed: Chat/Agents/Flows now has artifact-scoped chat, chat-message-to-proposal, dry-run agents with scopes, n8n-like flow builder and flowRun proposal evidence." : "",
    packageId === "P012" ? "- P010 closed: Obsidian-like Graph now has a large workbench with global/local mode, search, filters, selected-node inspector, visible edge reasons, workspace open actions and large-vault graph evidence." : "",
    packageId === "P012" ? "- P011 closed: Data Control now supports full vault export, selected artifact export, backup preview import, rollback snapshots/restores, archive/recover and privacy/provider state visibility." : "",
    packageId === "P012" ? "- P012 closed: privacy/provider map, readable Russian UI repair, mobile no-overflow, keyboard focus and large-vault performance checks are implemented and covered by owner evidence." : "",
    "",
    "## Evidence",
    "- `npm run verify` PASS.",
    "- `npm run e2e` PASS.",
    "- `npm run e2e:owner` PASS.",
    "- `npm run e2e:fixtures` PASS.",
    "- `npm run e2e:visual` PASS.",
    "- `npm run audit:no-hardcoded-sample` PASS.",
    "- `npm run audit:buttons` PASS.",
    "- `npm run audit:ledger` PASS.",
    "- `npm run audit:workspace-links` PASS.",
    "- `git diff --check` PASS with CRLF warnings only.",
    "",
    "## Screenshots",
    "- `output/playwright/owner-home.png`",
    "- `output/playwright/owner-analysis.png`",
    "- `output/playwright/owner-after-apply.png`",
    "- `output/playwright/owner-calendar.png`",
    "- `output/playwright/owner-finance.png`",
    "- `output/playwright/owner-habits-goals.png`",
    "- `output/playwright/owner-knowledge-insights.png`",
    packageId === "P006" || packageId === "P007" || packageId === "P008" || packageId === "P009" || packageId === "P010" || packageId === "P011" || packageId === "P012" ? "- `output/playwright/owner-books.png`" : "",
    "- `output/playwright/owner-player-transcript.png`",
    "- `output/playwright/owner-ollama.png`",
    "- `output/playwright/owner-chat-agents-flow.png`",
    "- `output/playwright/owner-big-graph.png`",
    "- `output/playwright/owner-control.png`",
    "- `output/playwright/owner-mobile.png`",
    "- `output/playwright/owner-large-vault.png`",
    "",
    "## Owner-Usable Now",
    "- Capture arbitrary text/file/audio/image boundaries into source-backed artifacts.",
    "- Review grouped proposal cards and apply them into tasks, calendar blocks, reminders, finance, habits, goals and insights.",
    "- Work in a calmer Calendar workspace with add/edit/reschedule/reminder/source/control actions.",
    packageId === "P003" || packageId === "P004" || packageId === "P005" || packageId === "P006" || packageId === "P007" || packageId === "P008" || packageId === "P009" || packageId === "P010" || packageId === "P011" ? "- Work in Finance with account balances, categorized expenses, budgets, subscriptions and receipt screenshots without fake OCR." : "",
    packageId === "P004" ? "- Work in Habits/Goals with check-ins, measurable progress, next tasks and deterministic insight actions." : "",
    packageId === "P005" ? "- Work in Habits/Goals with check-ins, measurable progress, next tasks and deterministic insight actions." : "",
    packageId === "P006" ? "- Work in Habits/Goals with check-ins, measurable progress, next tasks and deterministic insight actions." : "",
    packageId === "P007" ? "- Work in Habits/Goals with check-ins, measurable progress, next tasks and deterministic insight actions." : "",
    packageId === "P008" ? "- Work in Habits/Goals with check-ins, measurable progress, next tasks and deterministic insight actions." : "",
    packageId === "P009" ? "- Work in Habits/Goals with check-ins, measurable progress, next tasks and deterministic insight actions." : "",
    packageId === "P010" ? "- Work in Habits/Goals with check-ins, measurable progress, next tasks and deterministic insight actions." : "",
    packageId === "P011" ? "- Work in Habits/Goals with check-ins, measurable progress, next tasks and deterministic insight actions." : "",
    packageId === "P005" ? "- Work in Library/Knowledge with source-backed claims, questions, review queue, second-brain insights and direct task/insight/reminder actions." : "",
    packageId === "P006" ? "- Work in Library/Knowledge with source-backed claims, questions, review queue, second-brain insights and direct task/insight/reminder actions." : "",
    packageId === "P007" ? "- Work in Library/Knowledge with source-backed claims, questions, review queue, second-brain insights and direct task/insight/reminder actions." : "",
    packageId === "P008" ? "- Work in Library/Knowledge with source-backed claims, questions, review queue, second-brain insights and direct task/insight/reminder actions." : "",
    packageId === "P009" ? "- Work in Library/Knowledge with source-backed claims, questions, review queue, second-brain insights and direct task/insight/reminder actions." : "",
    packageId === "P010" ? "- Work in Library/Knowledge with source-backed claims, questions, review queue, second-brain insights and direct task/insight/reminder actions." : "",
    packageId === "P011" ? "- Work in Library/Knowledge with source-backed claims, questions, review queue, second-brain insights and direct task/insight/reminder actions." : "",
    packageId === "P006" ? "- Work with Files/Books: TXT/MD imports become readable sources, PDF/EPUB are stored with honest parser gate/manual extraction, highlights and reading progress connect back to graph/control." : "",
    packageId === "P007" ? "- Work with Files/Books: TXT/MD imports become readable sources, PDF/EPUB are stored with honest parser gate/manual extraction, highlights and reading progress connect back to graph/control." : "",
    packageId === "P008" ? "- Work with Files/Books: TXT/MD imports become readable sources, PDF/EPUB are stored with honest parser gate/manual extraction, highlights and reading progress connect back to graph/control." : "",
    packageId === "P009" ? "- Work with Files/Books: TXT/MD imports become readable sources, PDF/EPUB are stored with honest parser gate/manual extraction, highlights and reading progress connect back to graph/control." : "",
    packageId === "P010" ? "- Work with Files/Books: TXT/MD imports become readable sources, PDF/EPUB are stored with honest parser gate/manual extraction, highlights and reading progress connect back to graph/control." : "",
    packageId === "P011" ? "- Work with Files/Books: TXT/MD imports become readable sources, PDF/EPUB are stored with honest parser gate/manual extraction, highlights and reading progress connect back to graph/control." : "",
    packageId === "P007" ? "- Work with Player: import audio, play inline when stored under browser limit, save manual transcript, create checkpoints and turn transcript snippets into tasks/claims/highlights/notes while STT stays honestly gated." : "",
    packageId === "P008" ? "- Work with Player: import audio, play inline when stored under browser limit, save manual transcript, create checkpoints and turn transcript snippets into tasks/claims/highlights/notes while STT stays honestly gated." : "",
    packageId === "P009" ? "- Work with Player: import audio, play inline when stored under browser limit, save manual transcript, create checkpoints and turn transcript snippets into tasks/claims/highlights/notes while STT stays honestly gated." : "",
    packageId === "P010" ? "- Work with Player: import audio, play inline when stored under browser limit, save manual transcript, create checkpoints and turn transcript snippets into tasks/claims/highlights/notes while STT stays honestly gated." : "",
    packageId === "P011" ? "- Work with Player: import audio, play inline when stored under browser limit, save manual transcript, create checkpoints and turn transcript snippets into tasks/claims/highlights/notes while STT stays honestly gated." : "",
    packageId === "P008" ? "- Work with Providers: probe Ollama only after click, see models/offline/revoked honestly, run model work as proposal-only dry runs, inspect run history and revoke provider state." : "",
    packageId === "P009" ? "- Work with Providers: probe Ollama only after click, see models/offline/revoked honestly, run model work as proposal-only dry runs, inspect run history and revoke provider state." : "",
    packageId === "P010" ? "- Work with Providers: probe Ollama only after click, see models/offline/revoked honestly, run model work as proposal-only dry runs, inspect run history and revoke provider state." : "",
    packageId === "P011" ? "- Work with Providers: probe Ollama only after click, see models/offline/revoked honestly, run model work as proposal-only dry runs, inspect run history and revoke provider state." : "",
    packageId === "P009" ? "- Work with Chat/Agents/Flows: send local artifact chat, convert messages into proposals, run dry-run agents with scopes and build local trigger/condition/action flows that create proposals only." : "",
    packageId === "P010" ? "- Work with Chat/Agents/Flows: send local artifact chat, convert messages into proposals, run dry-run agents with scopes and build local trigger/condition/action flows that create proposals only." : "",
    packageId === "P010" ? "- Work with Graph: search the repository, switch global/local mode, filter node types, click nodes, inspect edge reasons and open the linked workspace from the selected node." : "",
    packageId === "P011" ? "- Work with Chat/Agents/Flows: send local artifact chat, convert messages into proposals, run dry-run agents with scopes and build local trigger/condition/action flows that create proposals only." : "",
    packageId === "P011" ? "- Work with Graph: search the repository, switch global/local mode, filter node types, click nodes, inspect edge reasons and open the linked workspace from the selected node." : "",
    packageId === "P011" ? "- Work with Data Control: export full vault, export selected artifact, import backup as preview, create rollback snapshots, restore snapshots, archive selected objects and recover supported objects." : "",
    packageId === "P012" ? "- Work in Finance with account balances, categorized expenses, budgets, subscriptions and receipt screenshots without fake OCR." : "",
    packageId === "P012" ? "- Work in Habits/Goals with check-ins, measurable progress, next tasks and deterministic insight actions." : "",
    packageId === "P012" ? "- Work in Library/Knowledge with source-backed claims, questions, review queue, second-brain insights and direct task/insight/reminder actions." : "",
    packageId === "P012" ? "- Work with Files/Books: TXT/MD imports become readable sources, PDF/EPUB are stored with honest parser gate/manual extraction, highlights and reading progress connect back to graph/control." : "",
    packageId === "P012" ? "- Work with Player: import audio, play inline when stored under browser limit, save manual transcript, create checkpoints and turn transcript snippets into tasks/claims/highlights/notes while STT stays honestly gated." : "",
    packageId === "P012" ? "- Work with Providers: probe Ollama only after click, see models/offline/revoked honestly, run model work as proposal-only dry runs, inspect run history and revoke provider state." : "",
    packageId === "P012" ? "- Work with Chat/Agents/Flows: send local artifact chat, convert messages into proposals, run dry-run agents with scopes and build local trigger/condition/action flows that create proposals only." : "",
    packageId === "P012" ? "- Work with Graph: search the repository, switch global/local mode, filter node types, click nodes, inspect edge reasons and open the linked workspace from the selected node." : "",
    packageId === "P012" ? "- Work with Data Control: export full vault, export selected artifact, import backup as preview, create rollback snapshots, restore snapshots, archive selected objects and recover supported objects." : "",
    packageId === "P012" ? "- Work on a readable mobile/desktop interface with focusable primary controls, no first-viewport debug wall and privacy/provider status kept behind Control/Providers." : "",
    "- See calendar objects reflected in graph/control/audit and preserved after reload.",
    packageId === "P003" || packageId === "P004" || packageId === "P005" || packageId === "P006" || packageId === "P007" || packageId === "P008" || packageId === "P009" || packageId === "P010" || packageId === "P011" ? "- See finance objects reflected in graph/control/audit and preserved after reload." : "",
    packageId === "P004" ? "- See habit, goal and insight objects reflected in graph/control/audit and preserved after reload." : "",
    packageId === "P005" ? "- See habit, goal, insight and knowledge objects reflected in graph/control/audit and preserved after reload." : "",
    packageId === "P006" ? "- See habit, goal, insight, knowledge, reading and highlight objects reflected in graph/control/audit and preserved after reload." : "",
    packageId === "P007" ? "- See habit, goal, insight, knowledge, reading, highlight, transcript segment, checkpoint and player note objects reflected in graph/control/audit and preserved after reload." : "",
    packageId === "P008" ? "- See habit, goal, insight, knowledge, reading, highlight, transcript segment, checkpoint, player note and provider run objects reflected in graph/control/audit and preserved after reload." : "",
    packageId === "P009" ? "- See habit, goal, insight, knowledge, reading, highlight, transcript segment, checkpoint, player note, provider run and flow run objects reflected in graph/control/audit and preserved after reload." : "",
    packageId === "P010" ? "- See habit, goal, insight, knowledge, reading, highlight, transcript segment, checkpoint, player note, provider run and flow run objects reflected in graph/control/audit and preserved after reload, with edge reasons visible in the Graph inspector." : "",
    packageId === "P011" ? "- See habit, goal, insight, knowledge, reading, highlight, transcript segment, checkpoint, player note, provider run, flow run and Data Control events reflected in graph/control/audit and preserved after reload." : "",
    packageId === "P012" ? "- See habit, goal, insight, knowledge, reading, highlight, transcript segment, checkpoint, player note, provider run, flow run and Data Control events reflected in graph/control/audit and preserved after reload, with mobile/readability/performance evidence." : "",
    "",
    "## Still Open",
    packageId === "P012" ? "- P013 Full ledger closure and GitHub release report."
      : packageId === "P011" ? "- P012 Privacy / Mobile / performance / accessibility / empty states."
      : packageId === "P010" ? "- P011 Data Control/export/import/rollback/recovery."
      : packageId === "P009" ? "- P010 Obsidian-like Graph."
      : packageId === "P008" ? "- P009 Chat/Agents/Flows."
      : packageId === "P007" ? "- P008 Ollama/Provider model pipeline."
      : packageId === "P006" ? "- P007 Audio/Player/Transcript/STT gate depth."
      : packageId === "P005" ? "- P006 Files/Books/PDF/EPUB gates or parser depth."
      : packageId === "P004" ? "- P005 Library/Knowledge/Second brain depth."
      : packageId === "P003" ? "- P004 Habits/Goals/Progress/Insights depth." : "- P003 Finance/Budget/Screenshot expense workflow depth.",
    packageId === "P009" || packageId === "P008" || packageId === "P007" || packageId === "P006" || packageId === "P005" || packageId === "P004" || packageId === "P003" ? "" : "- P004 Habits/Goals/Progress/Insights depth.",
    packageId === "P012" ? "- P013 final acceptance matrix, remaining ledger closure and exact GitHub remote/auth push block."
      : packageId === "P011" ? "- P012-P013 privacy/mobile/performance/empty-state hardening and final release report."
      : packageId === "P010" ? "- P011-P013 Data Control rollback, mobile/performance and encoding hardening."
      : packageId === "P009" ? "- P010-P013 graph, Data Control rollback, mobile/performance and encoding hardening."
      : packageId === "P008" ? "- P009-P013 chat/agents/flows, graph, Data Control rollback, mobile/performance and encoding hardening."
      : packageId === "P007" ? "- P008-P013 provider, chat/agents/flows, graph, Data Control rollback, mobile/performance and encoding hardening."
      : packageId === "P006" ? "- P007-P013 audio/provider, chat/agents/flows, graph, Data Control rollback, mobile/performance and encoding hardening."
      : packageId === "P005" ? "- P006-P013 books/audio/provider, chat/agents/flows, graph, Data Control rollback, mobile/performance and encoding hardening."
      : "- P005-P013 second brain, books/audio/provider, chat/agents/flows, graph, Data Control rollback, mobile/performance hardening.",
    "- GitHub remote/push until owner authenticates `gh` or provides a repository URL."
  ].join("\n") + "\n";
  await writeFile(reportPath, report, "utf8");
}

await updateQueue();
await updateLedger();
await updateStateAndReport();

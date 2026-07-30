import { existsSync, readFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";

// Ствол один. Решение владельца 2026-07-30: «пусть лучше одна будет, все, что делается, сразу
// в одну добавляется. И тестировка тоже вся в одной ветке».
const TRUNK_BRANCH = "owner-usable-nonstop-rescue";
const REQUIRED_SCRIPTS = [
  "verify",
  "e2e",
  "e2e:owner",
  "e2e:quality",
  "e2e:ux",
  "e2e:fixtures",
  "e2e:visual",
  "audit:no-hardcoded-sample",
  "audit:buttons",
  "audit:ledger",
  "audit:release-evidence",
  "audit:workspace-links",
  "release:push"
];
const REQUIRED_FILES = [
  "app.js",
  "styles.css",
  "index.html",
  "smoke.mjs",
  "tools/push-owner-rescue.mjs",
  "tools/generate-owner-rescue-1000-ledger.mjs",
  "docs/ops/OWNER_RESCUE_LIVE_STATE.md",
  "docs/qc/OWNER_RESCUE_1000_RISK_LEDGER.csv",
  "docs/qc/OWNER_RESCUE_1000_REPORT.md",
  "docs/qc/OWNER_RESCUE_QUEUE.json",
  "docs/qc/OWNER_UX_001_REPORT.md",
  "docs/qc/OWNER_REAL_PRODUCT_QUALITY_AUDIT.md",
  "docs/qc/PRODUCT_BRAIN_GAP_QUEUE.json",
  "docs/ops/GITHUB_RELEASE_STATE.md",
  "output/playwright/fixtures/owner-input-fixtures.json"
];
const REQUIRED_SCREENSHOTS = [
  "output/playwright/owner-home.png",
  "output/playwright/owner-analysis.png",
  "output/playwright/owner-after-apply.png",
  "output/playwright/owner-calendar.png",
  "output/playwright/owner-finance.png",
  "output/playwright/owner-habits-goals.png",
  "output/playwright/owner-knowledge-insights.png",
  "output/playwright/owner-player-transcript.png",
  "output/playwright/owner-ollama.png",
  "output/playwright/owner-chat-agents-flow.png",
  "output/playwright/owner-big-graph.png",
  "output/playwright/owner-control.png",
  "output/playwright/owner-mobile.png",
  "output/playwright/owner-large-vault.png",
  "output/playwright/ux-home-calm.png",
  "output/playwright/ux-after-analysis.png",
  "output/playwright/ux-after-quick-task.png",
  "output/playwright/ux-calendar.png",
  "output/playwright/ux-dashboard.png",
  "output/playwright/ux-graph.png",
  "output/playwright/ux-mobile.png",
  "output/playwright/quality-home-audit.png",
  "output/playwright/quality-calendar-audit.png",
  "output/playwright/quality-finance-audit.png",
  "output/playwright/quality-graph-audit.png",
  "output/playwright/quality-control-audit.png"
];

function sh(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function trySh(command) {
  try {
    return { ok: true, output: sh(command) };
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    return { ok: false, output };
  }
}

function parseCsvLine(line) {
  const cells = [];
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
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function readCsv(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(header.map((key, index) => [key, cells[index] || ""]));
  });
}

function assert(condition, message, details = {}) {
  checks.push({ ok: Boolean(condition), message, details });
}

function fileSize(path) {
  return existsSync(path) ? statSync(path).size : 0;
}

const checks = [];
const branch = sh("git branch --show-current");
const status = sh("git status --porcelain");
const remote = trySh("git remote -v");
const ghStatus = trySh("gh auth status");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const ledger = readCsv("docs/qc/OWNER_RESCUE_1000_RISK_LEDGER.csv");
const fixtures = JSON.parse(readFileSync("output/playwright/fixtures/owner-input-fixtures.json", "utf8"));
const productBrainQueue = JSON.parse(readFileSync("docs/qc/PRODUCT_BRAIN_GAP_QUEUE.json", "utf8"));
const releaseState = readFileSync("docs/ops/GITHUB_RELEASE_STATE.md", "utf8");
const remoteBranch = trySh("git ls-remote --heads origin owner-usable-nonstop-rescue");
const blockedRows = ledger.filter((row) => row.resolution_status === "BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION");
const blockedIds = blockedRows.map((row) => row.id).sort();
const networkRetryRows = ledger.filter((row) => row.resolution_status === "BLOCKED_EXTERNAL_NETWORK_RETRY_WITH_PROOF");
const openRows = ledger.filter((row) => ["OPEN", "IN_PROGRESS", "OPEN_REVALIDATE"].includes(row.resolution_status));
const providerRows = ledger.filter((row) => row.resolution_status === "FIXED_BY_HONEST_PROVIDER_GATE_WITH_UI_AND_TEST");
const fixedRows = ledger.filter((row) => row.resolution_status === "FIXED_WITH_CODE_AND_TEST");
const dedupedRows = ledger.filter((row) => row.resolution_status === "DUPLICATE_FIXED_BY_W");

// ЗАМЕНЕНО 2026-07-30. Здесь стояло сравнение ИМЕНИ ветки со «owner-usable-nonstop-rescue».
// Имя ветки — не свойство продукта: проверка была красной на любой другой ветке и не поймала
// ни одного дефекта ни разу. Владелец: «если проверки легкие и тупые, зачем их оставлять? Лучше
// наоборот тогда менять на сложные проверки... Но только без фанатизма».
// Ловим настоящую беду вместо имени: работа идёт от УСТАРЕВШЕГО ствола. Если в стволе есть
// коммиты, которых нет в HEAD, значит правки лежат на старом коде и поедут в конфликт — ровно
// это случилось в этой сессии, когда в ствол пришли 14 коммитов облачной сессии. Цена проверки —
// два вызова git, без сети.
const trunkTip = trySh("git rev-parse --verify refs/remotes/origin/" + TRUNK_BRANCH).ok
  ? sh("git rev-parse refs/remotes/origin/" + TRUNK_BRANCH)
  : (trySh("git rev-parse --verify refs/heads/" + TRUNK_BRANCH).ok ? sh("git rev-parse refs/heads/" + TRUNK_BRANCH) : "");
assert(Boolean(trunkTip), "single trunk branch exists: " + TRUNK_BRANCH, { trunkTip: trunkTip || "missing" });
assert(branch !== "HEAD" && branch !== "", "HEAD is on a named branch, not detached", { branch });
if (trunkTip) {
  const containsTrunk = trySh("git merge-base --is-ancestor " + trunkTip + " HEAD").ok;
  assert(containsTrunk, "HEAD contains every commit already in the trunk (work is not based on a stale trunk)", {
    branch,
    trunk: TRUNK_BRANCH,
    missingFromHead: containsTrunk ? 0 : Number(trySh("git rev-list --count HEAD.." + trunkTip).output || 0)
  });
}
assert(status === "", "working tree is clean", { status: status || "clean" });
assert(ledger.length === 1000, "1000-risk ledger has exactly 1000 rows", { rows: ledger.length });
assert(openRows.length === 0, "1000-risk ledger has zero open/in-progress/revalidate rows", { openRows: openRows.length });
assert(blockedIds.length === 0, "GitHub credential blocks are closed after owner auth", { blockedIds });
assert(networkRetryRows.length === 0, "GitHub HTTP upload retry rows are closed after lite snapshot push", { networkRetryRows: networkRetryRows.map((row) => row.id) });
assert(fixedRows.length > 0, "ledger contains code/test fixed rows", { fixedRows: fixedRows.length });
assert(providerRows.length > 0, "ledger contains honest provider-gate rows", { providerRows: providerRows.length });
assert(dedupedRows.length > 0, "ledger contains deduped rows against W ledger", { dedupedRows: dedupedRows.length });
assert(fixtures.length >= 120, "fixture matrix has at least 120 fixtures", { fixtures: fixtures.length });

for (const script of REQUIRED_SCRIPTS) {
  assert(Boolean(packageJson.scripts && packageJson.scripts[script]), "package script exists: " + script);
}

for (const path of REQUIRED_FILES) {
  assert(existsSync(path), "required file exists: " + path);
}

for (const path of REQUIRED_SCREENSHOTS) {
  assert(fileSize(path) > 1024, "screenshot exists and is non-empty: " + path, { bytes: fileSize(path) });
}

assert(remote.output.includes("https://github.com/ddotdanyaa/lifeos-final33.git"), "GitHub origin remote is configured", { remote: remote.output || "NO_REMOTE" });
assert(ghStatus.ok && ghStatus.output.includes("ddotdanyaa"), "GitHub CLI is authenticated as owner", { ghStatus: ghStatus.output || "not authenticated" });
assert(productBrainQueue.some((item) => item.id === "P_GITHUB_RELEASE_RETRY" && item.status === "done"), "Product Brain queue records completed GitHub release retry", { queue: productBrainQueue.map((item) => ({ id: item.id, status: item.status })) });
assert(productBrainQueue.some((item) => item.id === "P_OWNER_FINAL_REVALIDATION" && item.status === "done"), "Product Brain queue records final revalidation as done", { queue: productBrainQueue.map((item) => ({ id: item.id, status: item.status })) });
assert(productBrainQueue.some((item) => item.id === "P_EXTERNAL_PROVIDER_SETUP" && item.status === "done"), "Product Brain queue records external provider setup as done", { queue: productBrainQueue.map((item) => ({ id: item.id, status: item.status })) });
assert(productBrainQueue.some((item) => item.id === "P_OWNER_PROVIDER_CONNECTIONS_EXTERNAL" && item.status === "blocked_external_credential_only"), "Product Brain queue records only owner/provider connections as external gate", { queue: productBrainQueue.map((item) => ({ id: item.id, status: item.status })) });
assert(releaseState.includes("LITE_SNAPSHOT_PUSHED_WITH_OMITTED_EVIDENCE"), "GitHub release state records lite snapshot caveat");
assert(remoteBranch.ok && remoteBranch.output.includes("refs/heads/owner-usable-nonstop-rescue"), "GitHub remote branch is verified by ls-remote", { remoteBranch: remoteBranch.output || remoteBranch });

const failed = checks.filter((check) => !check.ok);
const summary = {
  ok: failed.length === 0,
  branch,
  clean: status === "",
  ledgerRows: ledger.length,
  blockedIds,
  openRows: openRows.length,
  fixedRows: fixedRows.length,
  providerGateRows: providerRows.length,
  dedupedRows: dedupedRows.length,
  fixtures: fixtures.length,
  screenshots: REQUIRED_SCREENSHOTS.length,
  requiredScripts: REQUIRED_SCRIPTS.length,
  githubGate: "LITE_SNAPSHOT_PUSHED_WITH_OMITTED_EVIDENCE",
  failed: failed.map((check) => ({ message: check.message, details: check.details }))
};

console.log(JSON.stringify(summary, null, 2));

if (failed.length) {
  process.exit(1);
}

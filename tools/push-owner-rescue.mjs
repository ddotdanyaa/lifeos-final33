import { readFile } from "node:fs/promises";
import { existsSync, statSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";

const EXPECTED_BRANCH = "owner-usable-nonstop-rescue";
const GIT_PUSH_TIMEOUT_MS = 10 * 60 * 1000;
const API_RETRY_LIMIT = 5;
const API_MAX_BLOB_BYTES = Number(process.env.LIFEOS_RELEASE_API_MAX_BLOB_BYTES || 1 * 1024 * 1024);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function usage() {
  return [
    "Usage:",
    "  npm run release:push -- <github-remote-url>",
    "",
    "Examples:",
    "  npm run release:push -- https://github.com/OWNER/REPO.git",
    "  npm run release:push -- git@github.com:OWNER/REPO.git",
    "",
    "Or set LIFEOS_GITHUB_REMOTE and run:",
    "  npm run release:push",
    "",
    "The script checks that the working tree is clean, adds origin only when missing,",
    "never force-pushes, and publishes owner-usable-nonstop-rescue.",
    "",
    "For an empty GitHub repository with large local history, it uses the GitHub",
    "Git Data API to upload a one-commit snapshot of the current tracked tree.",
    "",
    "Use --api-snapshot to force the API snapshot path after a bootstrap retry.",
    "Use --lite-git-snapshot to push a small fast-forward Git snapshot that",
    "omits oversized ledgers and screenshot binaries into a manifest."
  ].join("\n");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: options.timeout || 0,
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });
  if (result.status !== 0) {
    const stderr = String(result.stderr || "").trim();
    const stdout = String(result.stdout || "").trim();
    const detail = [stdout, stderr].filter(Boolean).join("\n");
    throw new Error(detail || command + " failed with exit code " + result.status);
  }
  return String(result.stdout || "").trim();
}

function capture(command, args) {
  return run(command, args, { capture: true });
}

function tryCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: options.timeout || 0,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    ok: result.status === 0,
    timedOut: Boolean(result.error && result.error.code === "ETIMEDOUT"),
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim()
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertSafeRemote(url) {
  if (!url) return;
  if (/[\r\n]/.test(url)) fail("Remote URL must be a single line.");
  if (!/^(https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?|git@github\.com:[^/\s]+\/[^/\s]+(?:\.git)?)$/.test(url)) {
    fail("Remote URL must be a GitHub HTTPS or SSH repo URL.\n\n" + usage());
  }
}

function parseGitHubRemote(url) {
  const httpsMatch = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(url || "");
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2], protocol: "https" };
  const sshMatch = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(url || "");
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2], protocol: "ssh" };
  return null;
}

function trackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: process.cwd(),
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) throw new Error(String(result.stderr || "git ls-files failed"));
  return String(result.stdout || "", "utf8").split("\0").filter(Boolean);
}

function trackedIndexEntries() {
  const result = spawnSync("git", ["ls-files", "-s", "-z"], {
    cwd: process.cwd(),
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) throw new Error(String(result.stderr || "git ls-files -s failed"));
  return String(result.stdout || "", "utf8").split("\0").filter(Boolean).map((record) => {
    const match = /^(\d+)\s+([0-9a-f]{40})\s+\d+\t(.+)$/.exec(record);
    if (!match) throw new Error("Cannot parse git index record: " + record);
    return { mode: match[1], sha: match[2], path: match[3] };
  });
}

function runGitWithIndex(args, indexPath, options = {}) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    env: Object.assign({}, process.env, { GIT_INDEX_FILE: indexPath }),
    encoding: "utf8",
    input: options.input,
    timeout: options.timeout || 0,
    stdio: options.capture || options.input ? ["pipe", "pipe", "pipe"] : "inherit"
  });
  if (result.status !== 0) {
    const detail = [String(result.stdout || "").trim(), String(result.stderr || "").trim()].filter(Boolean).join("\n");
    throw new Error(detail || "git " + args.join(" ") + " failed");
  }
  return String(result.stdout || "").trim();
}

function omitFromLiteSnapshot(entry) {
  const bytes = statSync(entry.path).size;
  const isPngEvidence = entry.path.startsWith("output/playwright/") && entry.path.endsWith(".png");
  const keepProductBrainEvidence = entry.path.startsWith("output/playwright/product-brain-") && entry.path.endsWith(".png");
  if (bytes > API_MAX_BLOB_BYTES) return { omit: true, bytes, reason: "larger than lite Git snapshot threshold" };
  if (isPngEvidence && !keepProductBrainEvidence) return { omit: true, bytes, reason: "screenshot evidence kept locally to keep GitHub snapshot small" };
  return { omit: false, bytes, reason: "" };
}

function writeLiteGitSnapshot({ repoRoot, branch, parentSha, sourceCommit }) {
  const indexPath = repoRoot.replaceAll("\\", "/") + "/.git/lifeos-release-lite.index";
  if (existsSync(indexPath)) unlinkSync(indexPath);
  runGitWithIndex(["read-tree", "--empty"], indexPath);

  const omitted = [];
  let included = 0;
  for (const entry of trackedIndexEntries()) {
    const decision = omitFromLiteSnapshot(entry);
    if (decision.omit) {
      omitted.push({ path: entry.path, bytes: decision.bytes, reason: decision.reason });
      continue;
    }
    runGitWithIndex(["update-index", "--add", "--cacheinfo", entry.mode, entry.sha, entry.path], indexPath);
    included += 1;
  }

  if (omitted.length) {
    const manifest = [
      "# GitHub Release Snapshot Omitted Files",
      "",
      "This branch is a code-first LifeOS release snapshot. The local workspace keeps the omitted large evidence files.",
      "They are excluded here so GitHub can receive the branch without the historical 1.51 GiB pack or oversized binary evidence upload.",
      "",
      "| path | bytes | reason |",
      "| --- | ---: | --- |",
      ...omitted.map((item) => "| `" + item.path + "` | " + item.bytes + " | " + item.reason + " |"),
      ""
    ].join("\n");
    const manifestSha = runGitWithIndex(["hash-object", "-w", "--stdin"], indexPath, {
      capture: true,
      input: manifest
    });
    runGitWithIndex(["update-index", "--add", "--cacheinfo", "100644", manifestSha, "docs/ops/GITHUB_RELEASE_OMITTED_FILES.md"], indexPath);
  }

  const tree = runGitWithIndex(["write-tree"], indexPath, { capture: true });
  const commit = capture("git", ["commit-tree", tree, "-p", parentSha, "-m", "release: LifeOS product code snapshot", "-m", "Source local commit: " + sourceCommit]);
  run("git", ["update-ref", "refs/heads/codex/release-lite", commit]);
  console.log("Lite snapshot included files: " + included);
  console.log("Lite snapshot omitted files: " + omitted.length);
  console.log("Lite snapshot commit: " + commit);
  return commit;
}

async function githubJson(url, token, method, body) {
  let lastError = null;
  for (let attempt = 1; attempt <= API_RETRY_LIMIT; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          "User-Agent": "lifeos-release-push"
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const text = await response.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = { message: text };
      }
      if (response.ok) return payload;
      const error = new Error(method + " " + url + " failed: HTTP " + response.status + " " + (payload.message || text));
      error.status = response.status;
      error.payload = payload;
      if (![401, 408, 429, 500, 502, 503, 504].includes(response.status) || attempt === API_RETRY_LIMIT) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (attempt === API_RETRY_LIMIT || (error.status && ![401, 408, 429, 500, 502, 503, 504].includes(error.status))) throw error;
    }
    const waitMs = Math.min(30000, 1000 * 2 ** (attempt - 1));
    console.log("GitHub API retry " + attempt + "/" + API_RETRY_LIMIT + " after " + (lastError.message || lastError));
    await sleep(waitMs);
  }
  throw lastError;
}

async function getBranchHead(apiRoot, token, branch) {
  try {
    const ref = await githubJson(apiRoot + "/git/ref/heads/" + encodeURIComponent(branch), token, "GET");
    return ref && ref.object ? ref.object.sha : "";
  } catch (error) {
    if (error.status === 404 || error.status === 409) return "";
    throw error;
  }
}

async function bootstrapEmptyRepository(apiRoot, token, branch) {
  const marker = "LifeOS release bootstrap for " + branch + "\n";
  console.log("Repository is empty; creating bootstrap commit on " + branch + ".");
  const result = await githubJson(apiRoot + "/contents/.lifeos-release-root", token, "PUT", {
    message: "chore: initialize LifeOS release branch",
    content: Buffer.from(marker, "utf8").toString("base64"),
    branch
  });
  return result && result.commit ? result.commit.sha : "";
}

async function pushSnapshotViaApi({ owner, repo, branch, originUrl, sourceCommit }) {
  const token = capture("gh", ["auth", "token"]);
  const apiRoot = "https://api.github.com/repos/" + owner + "/" + repo;
  let parentSha = await getBranchHead(apiRoot, token, branch);
  let createdBranch = Boolean(parentSha);
  if (!parentSha) {
    parentSha = await bootstrapEmptyRepository(apiRoot, token, branch);
    createdBranch = true;
  }
  const files = trackedFiles();
  const entries = [];
  const omitted = [];
  console.log("API snapshot upload: " + files.length + " tracked files.");
  console.log("API max blob size: " + API_MAX_BLOB_BYTES + " bytes.");

  for (let index = 0; index < files.length; index += 1) {
    const path = files[index].replaceAll("\\", "/");
    const bytes = await readFile(files[index]);
    if (bytes.length > API_MAX_BLOB_BYTES) {
      omitted.push({ path, bytes: bytes.length, reason: "larger than API snapshot blob limit" });
      console.log("Omitted large release evidence: " + path + " (" + bytes.length + " bytes)");
      continue;
    }
    let blob = null;
    try {
      blob = await githubJson(apiRoot + "/git/blobs", token, "POST", {
        content: bytes.toString("base64"),
        encoding: "base64"
      });
    } catch (error) {
      error.message = "Failed while uploading " + (index + 1) + "/" + files.length + " " + path + " (" + bytes.length + " bytes): " + error.message;
      throw error;
    }
    entries.push({
      path,
      mode: "100644",
      type: "blob",
      sha: blob.sha
    });
    if ((index + 1) % 25 === 0 || index + 1 === files.length) {
      console.log("Uploaded blobs: " + (index + 1) + "/" + files.length);
    }
  }

  if (omitted.length) {
    const manifest = [
      "# GitHub Release Snapshot Omitted Large Files",
      "",
      "The local LifeOS workspace contains these files, but this API snapshot omitted them because GitHub rejected large blob JSON uploads in this environment.",
      "The product code, tests, reports, and smaller screenshot evidence are still included in the branch.",
      "",
      "| path | bytes | reason |",
      "| --- | ---: | --- |",
      ...omitted.map((item) => "| `" + item.path + "` | " + item.bytes + " | " + item.reason + " |"),
      ""
    ].join("\n");
    const manifestBlob = await githubJson(apiRoot + "/git/blobs", token, "POST", {
      content: Buffer.from(manifest, "utf8").toString("base64"),
      encoding: "base64"
    });
    entries.push({
      path: "docs/ops/GITHUB_RELEASE_OMITTED_LARGE_FILES.md",
      mode: "100644",
      type: "blob",
      sha: manifestBlob.sha
    });
  }

  const tree = await githubJson(apiRoot + "/git/trees", token, "POST", { tree: entries });
  const commit = await githubJson(apiRoot + "/git/commits", token, "POST", {
    message: "release: LifeOS product snapshot\n\nSource local commit: " + sourceCommit,
    tree: tree.sha,
    parents: parentSha ? [parentSha] : []
  });
  if (createdBranch) {
    await githubJson(apiRoot + "/git/refs/heads/" + encodeURIComponent(branch), token, "PATCH", { sha: commit.sha });
  } else {
    await githubJson(apiRoot + "/git/refs", token, "POST", {
      ref: "refs/heads/" + branch,
      sha: commit.sha
    });
  }
  await githubJson(apiRoot, token, "PATCH", { default_branch: branch }).catch((error) => {
    console.error("Default branch update warning: " + error.message);
  });

  const branchUrl = originUrl.replace(/\.git$/, "") + "/tree/" + branch;
  console.log("Pushed snapshot branch: " + branchUrl);
  console.log("Remote commit: " + commit.sha);
  return { branchUrl, sha: commit.sha };
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const remoteArg = process.argv[2] || process.env.LIFEOS_GITHUB_REMOTE || "";
  const forceApiSnapshot = process.argv.includes("--api-snapshot") || process.env.LIFEOS_RELEASE_MODE === "api-snapshot";
  const liteGitSnapshot = process.argv.includes("--lite-git-snapshot") || process.env.LIFEOS_RELEASE_MODE === "lite-git-snapshot";
  assertSafeRemote(remoteArg);

  const repoRoot = capture("git", ["rev-parse", "--show-toplevel"]);
  const branch = capture("git", ["branch", "--show-current"]);
  if (branch !== EXPECTED_BRANCH) {
    fail("Expected branch " + EXPECTED_BRANCH + " but current branch is " + branch + ".");
  }

  const dirty = capture("git", ["status", "--porcelain"]);
  if (dirty) {
    fail("Working tree must be clean before publishing.\n\n" + dirty);
  }

  let originUrl = tryCapture("git", ["config", "--get", "remote.origin.url"]).stdout;
  if (!originUrl) {
    if (!remoteArg) {
      fail("No origin remote is configured and no remote URL was provided.\n\n" + usage());
    }
    run("git", ["remote", "add", "origin", remoteArg]);
    originUrl = remoteArg;
  } else if (remoteArg && originUrl !== remoteArg) {
    fail("Existing origin differs from provided remote.\nExisting: " + originUrl + "\nProvided: " + remoteArg);
  }

  const ghStatus = tryCapture("gh", ["auth", "status"]);
  if (!ghStatus.ok && originUrl.startsWith("https://github.com/")) {
    fail("GitHub CLI is not authenticated for HTTPS remote.\nRun `gh auth login` first, or use an SSH remote that is already configured.");
  }

  console.log("Repository: " + repoRoot);
  console.log("Branch: " + branch);
  console.log("Origin: " + originUrl);

  const remoteBranch = tryCapture("git", ["ls-remote", "--heads", "origin", branch], { timeout: 60000 });
  if (liteGitSnapshot) {
    let parentSha = remoteBranch.stdout ? remoteBranch.stdout.split(/\s+/)[0] : "";
    const parsed = parseGitHubRemote(originUrl);
    if (!parentSha && parsed && ghStatus.ok) {
      const token = capture("gh", ["auth", "token"]);
      parentSha = await bootstrapEmptyRepository("https://api.github.com/repos/" + parsed.owner + "/" + parsed.repo, token, branch);
    }
    if (!parentSha) fail("Lite snapshot needs an existing remote parent or GitHub API bootstrap.");
    run("git", ["fetch", "--depth=1", "origin", branch], { timeout: GIT_PUSH_TIMEOUT_MS });
    const sourceCommit = capture("git", ["rev-parse", "HEAD"]);
    writeLiteGitSnapshot({ repoRoot, branch, parentSha, sourceCommit });
    run("git", ["push", "-u", "origin", "refs/heads/codex/release-lite:refs/heads/" + branch], { timeout: GIT_PUSH_TIMEOUT_MS });
    console.log("Pushed lite snapshot to " + originUrl.replace(/\.git$/, "") + "/tree/" + branch);
    return;
  }
  if (remoteBranch.stdout && !forceApiSnapshot) {
    run("git", ["push", "-u", "origin", branch], { timeout: GIT_PUSH_TIMEOUT_MS });
    console.log("Pushed " + branch + " to " + originUrl + ".");
    return;
  }

  const parsed = parseGitHubRemote(originUrl);
  if (parsed && ghStatus.ok) {
    const sourceCommit = capture("git", ["rev-parse", "HEAD"]);
    await pushSnapshotViaApi({
      owner: parsed.owner,
      repo: parsed.repo,
      branch,
      originUrl,
      sourceCommit
    });
    return;
  }

  run("git", ["push", "-u", "origin", branch], { timeout: GIT_PUSH_TIMEOUT_MS });
  console.log("Pushed " + branch + " to " + originUrl + ".");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

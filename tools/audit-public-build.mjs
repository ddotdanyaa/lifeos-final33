import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve("public-demo");

if (!existsSync(root)) {
  console.error("public-demo/ does not exist. Run npm run build:public.");
  process.exit(1);
}

const required = ["index.html", "app.js", "styles.css"];
const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error("Public build missing files:", missing.join(", "));
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(root);
const forbiddenPaths = [/output[\\/]/i, /docs[\\/]qc/i, /Downloads/i, /CodexHome/i, /Данил[\\/]Downloads/i, /\.local\./i];
const badPath = files.find((file) => forbiddenPaths.some((pattern) => pattern.test(file)));
if (badPath) {
  console.error("Public build contains private/evidence path:", badPath);
  process.exit(1);
}

const index = readFileSync(join(root, "index.html"), "utf8");
if (!index.includes("LIFEOS_PUBLIC_DEMO")) {
  console.error("Public demo index does not set LIFEOS_PUBLIC_DEMO.");
  process.exit(1);
}

const searchable = files.filter((file) => /\.(html|js|css|md|json|webmanifest)$/i.test(file)).map((file) => readFileSync(file, "utf8")).join("\n");
const forbiddenContent = [/C:\\Users\\/i, /output\/playwright/i, /private-user-images/i, /codex-clipboard/i];
const badContent = forbiddenContent.find((pattern) => pattern.test(searchable));
if (badContent) {
  console.error("Public build contains private content pattern:", badContent);
  process.exit(1);
}

console.log("audit:public-build passed");

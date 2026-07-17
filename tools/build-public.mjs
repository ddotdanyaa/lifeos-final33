import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(".");
const outDir = resolve("public-demo");

if (!outDir.startsWith(root)) {
  throw new Error("Refusing to write public demo outside repository.");
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await mkdir(resolve(outDir, "assets"), { recursive: true });

async function copyDir(from, to) {
  if (!existsSync(from)) return;
  await mkdir(to, { recursive: true });
  const entries = await readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const source = resolve(from, entry.name);
    const target = resolve(to, entry.name);
    if (entry.isDirectory()) {
      await copyDir(source, target);
    } else if (entry.isFile()) {
      await copyFile(source, target);
    }
  }
}

const index = await readFile("index.html", "utf8");
const publicIndex = index
  .replace("<title>LifeOS v34 Personal OS</title>", "<title>LifeOS v34 Public Demo</title>")
  .replace("<script src=\"./app.js\" type=\"module\"></script>", "<script>window.LIFEOS_PUBLIC_DEMO = true;</script>\n    <script src=\"./app.js\" type=\"module\"></script>");

await writeFile(resolve(outDir, "index.html"), publicIndex, "utf8");

const appSource = await readFile("app.js", "utf8");
const publicApp = appSource
  .replaceAll("output/playwright", "public-demo-evidence")
  .replaceAll("docs/qc/JOURNEY_J01_REPORT.md..J24", "journey reports")
  .replaceAll("docs/ops/GITHUB_RELEASE_OMITTED_FILES.md", "release manifest")
  .replaceAll("C:\\Users\\Данил", "local-owner-home")
  .replaceAll("C:/Users/Данил", "local-owner-home");
await writeFile(resolve(outDir, "app.js"), publicApp, "utf8");

const files = [
  ["artifact-os-architecture.mjs", "artifact-os-architecture.mjs"],
  ["styles.css", "styles.css"],
  ["manifest.webmanifest", "manifest.webmanifest"],
  ["assets/lifeos-icon.svg", "assets/lifeos-icon.svg"]
];

for (const [from, to] of files) {
  if (!existsSync(resolve(root, from))) continue;
  await mkdir(dirname(resolve(outDir, to)), { recursive: true });
  await copyFile(resolve(root, from), resolve(outDir, to));
}

await copyDir(resolve(root, "ui"), resolve(outDir, "ui"));

await writeFile(resolve(outDir, "README.md"), [
  "# LifeOS v34 Public Demo",
  "",
  "Чистая статическая сборка для GitHub Pages.",
  "В сборку не копируются локальные отчеты, evidence screenshots или приватные файлы.",
  ""
].join("\n"), "utf8");

console.log("Public demo built at public-demo/");

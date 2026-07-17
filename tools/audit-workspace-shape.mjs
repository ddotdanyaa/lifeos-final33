import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    if (stat.isFile() && full.endsWith(".js")) files.push(full);
  }
  return files;
}

const app = readFileSync("app.js", "utf8");
const ui = walk("ui").map((file) => readFileSync(file, "utf8")).join("\n");

if (!app.includes('renderNewShell(buildNewShellContext')) {
  console.error("Visible product shell is not routed through renderNewShell.");
  process.exit(1);
}

const required = [
  "assistant-home-v2",
  "today-layout",
  "calendar-grid",
  "finance-dashboard",
  "habits-wheel",
  "library-layout",
  "reader-surface",
  "player-surface",
  "chat-thread",
  "flow-canvas",
  "graph-canvas",
  "control-human-layout",
  "providers-layout",
  "feed-workspace",
  "systems-workbench",
  "builder-workspace",
  "projects-workspace",
  "models-workspace",
  "smart-home-workspace",
  "marketplace-workspace",
  "design-workspace",
  "databases-workspace",
  "screen-workspace",
  "twin-workspace"
];

const missing = required.filter((needle) => !ui.includes(needle));
if (missing.length) {
  console.error("Missing workspace shape markers:", missing.join(", "));
  process.exit(1);
}

const reusedOldShell = [
  "renderSurfaceWorkspace(surface, hero, body)",
  "workspace-card-grid",
  "cockpit",
  "right-rail"
].filter((needle) => ui.includes(needle));

if (reusedOldShell.length) {
  console.error("New UI shell still uses cockpit/card-grid markers:", reusedOldShell.join(", "));
  process.exit(1);
}

console.log("audit:workspace-shape passed");

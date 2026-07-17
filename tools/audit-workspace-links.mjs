import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const app = readFileSync("app.js", "utf8");
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

const ui = walk("ui").map((file) => readFileSync(file, "utf8")).join("\n");
const code = app + "\n" + ui;
const requiredSurfaces = ["inbox", "library", "today", "calendar", "finance", "habits", "goals", "chat", "agents", "flows", "player", "feed", "systems", "builder", "projects", "models", "smart-home", "marketplace", "design", "databases", "screen", "twin", "graph", "control", "providers"];
const missingLinks = requiredSurfaces.filter((surface) => !code.includes(`data-id="${surface}"`) && !code.includes(`data-id=\\"${surface}\\"`) && !code.includes(`case "${surface}"`) && !code.includes(`state.activeSurface === "${surface}"`));
const missingRenderers = ["renderFinancePanel", "renderHabitsGoalsPanel", "renderCalendarWorkbench", "renderProposalPanelV2", "renderOwnerHome", "renderFeed", "renderSystems", "renderModelHub", "renderSmartHome", "renderMarketplace", "renderDatabases", "renderScreenCompanion", "renderTwin"].filter((name) => !code.includes(`function ${name}`));

if (missingLinks.length || missingRenderers.length) {
  console.error(JSON.stringify({ ok: false, missingLinks, missingRenderers }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, requiredSurfaces, renderers: missingRenderers.length === 0 }, null, 2));

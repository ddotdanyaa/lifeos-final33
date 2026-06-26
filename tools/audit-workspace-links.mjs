import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");
const requiredSurfaces = ["inbox", "library", "today", "calendar", "finance", "habits", "goals", "chat", "agents", "flows", "player", "graph", "control", "providers"];
const missingLinks = requiredSurfaces.filter((surface) => !app.includes(`data-id=\\"${surface}\\"`) && !app.includes(`state.activeSurface === "${surface}"`));
const missingRenderers = ["renderFinancePanel", "renderHabitsGoalsPanel", "renderCalendarWorkbench", "renderProposalPanelV2", "renderOwnerHome"].filter((name) => !app.includes(`function ${name}`));

if (missingLinks.length || missingRenderers.length) {
  console.error(JSON.stringify({ ok: false, missingLinks, missingRenderers }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, requiredSurfaces, renderers: missingRenderers.length === 0 }, null, 2));

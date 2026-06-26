import { readFileSync } from "node:fs";

const js = readFileSync("app.js", "utf8");
const css = readFileSync("styles.css", "utf8");

const surfaces = [
  "inbox",
  "capture",
  "today",
  "calendar",
  "finance",
  "habits",
  "goals",
  "library",
  "reader",
  "player",
  "chat",
  "agents",
  "flows",
  "graph",
  "control",
  "providers"
];

const missingSurfaceIds = surfaces.filter((surface) => {
  const routeTuple = `[\"${surface}\"`;
  return !js.includes(`data-id=\\\"${surface}\\\"`)
    && !js.includes(`data-id=\"${surface}\"`)
    && !js.includes(`surface-${surface}`)
    && !js.includes(routeTuple)
    && !js.includes(`activeSurface === \"${surface}\"`);
});
const missingCss = surfaces.filter((surface) => !css.includes(`.surface-${surface}`) && !["inbox"].includes(surface));
const routeSpecific = [
  "renderInboxReviewWorkspace",
  "renderCalendarWorkbench",
  "renderFinancePanel",
  "renderHabitsGoalsPanel",
  "renderReaderWorkspace",
  "renderPlayerPanel",
  "renderChatWorkspace",
  "renderAgentsWorkspace",
  "renderGraphWorkbench",
  "renderDataControlPanel",
  "renderProviderPanelV2"
].filter((token) => !js.includes(token));

if (missingSurfaceIds.length || missingCss.length || routeSpecific.length) {
  console.error(JSON.stringify({ ok: false, missingSurfaceIds, missingCss, routeSpecific }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, surfaces: surfaces.length, routeSpecific: 11 }, null, 2));

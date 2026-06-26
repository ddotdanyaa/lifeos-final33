import { readFileSync } from "node:fs";

const js = readFileSync("app.js", "utf8");
const css = readFileSync("styles.css", "utf8");

const required = [
  "homeActions = state.activeSurface === \"inbox\"",
  "state.activeSurface === \"inbox\" ? renderHomeQuickRibbon(state) : renderAppRibbon(state)",
  "owner-home-calm",
  "home-next-action",
  "owner-next-zone",
  "owner-money-zone",
  "active-artifact-card",
  ".surface-inbox .command-pane"
];

const joined = js + "\n" + css;
const missing = required.filter((item) => !joined.includes(item));
const homeStart = js.indexOf("function renderOwnerHome");
const homeEnd = js.indexOf("function renderCommandCenterV5", homeStart);
const homeBody = homeStart >= 0 && homeEnd > homeStart ? js.slice(homeStart, homeEnd) : "";
const blocked = [
  "renderGraphWorkbench(state)",
  "renderProviderPanelV2(state)",
  "renderDataControlPanel(state)"
].filter((item) => homeBody.includes(item));

if (missing.length || blocked.length) {
  console.error(JSON.stringify({ ok: false, missing, blocked }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checked: "no cockpit first screen", zones: 4 }, null, 2));

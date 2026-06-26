import { readFileSync } from "node:fs";

const css = readFileSync("styles.css", "utf8");
const js = readFileSync("app.js", "utf8");

const requiredCss = [
  ".workspace-hero",
  ".workspace-hero h2",
  ".workspace-metrics",
  ".owner-home",
  ".owner-capture h2",
  ".contextual-inspector",
  ".graph-workbench",
  ".source-review-card"
];

const requiredJs = [
  "renderWorkspaceHero",
  "renderSurfaceWorkspace",
  "renderInboxReviewWorkspace",
  "renderTodayWorkspace",
  "renderChatWorkspace",
  "renderAgentsWorkspace"
];

const missingCss = requiredCss.filter((item) => !css.includes(item));
const missingJs = requiredJs.filter((item) => !js.includes(item));
const forbidden = [
  /font-size:\s*(?:[0-9.]+)vw/i,
  /letter-spacing:\s*-\d/i
].filter((pattern) => pattern.test(css)).map(String);

if (missingCss.length || missingJs.length || forbidden.length) {
  console.error(JSON.stringify({ ok: false, missingCss, missingJs, forbidden }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checked: "visual hierarchy", cssRules: requiredCss.length, jsRules: requiredJs.length }, null, 2));

import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");
const css = readFileSync("styles.css", "utf8");

const required = {
  "calendar-grid": app,
  "finance-dashboard": app,
  "reader-surface": app,
  "player-surface": app,
  "chat-thread": app,
  "flow-canvas": app,
  "graph-canvas": app,
  "human-home": css,
  "human-response": css
};

const missing = Object.entries(required).filter(([needle, haystack]) => !haystack.includes(needle)).map(([needle]) => needle);
if (missing.length) {
  console.error("Missing workspace shape markers:", missing.join(", "));
  process.exit(1);
}

if (!/renderSurfaceWorkspace\(surface, hero, body\)/.test(app) || !/shapeClass/.test(app)) {
  console.error("renderSurfaceWorkspace does not apply workspace shape classes.");
  process.exit(1);
}

console.log("audit:workspace-shape passed");

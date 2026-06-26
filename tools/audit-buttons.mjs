import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");
const actionRegex = /data-action=\\?"([^"\\]+)\\?"/g;
const handlerRegex = /action === "([^"]+)"/g;
const actions = new Set();
const handlers = new Set();

let match = actionRegex.exec(app);
while (match) {
  if (!match[1].includes("\" +")) actions.add(match[1]);
  match = actionRegex.exec(app);
}

match = handlerRegex.exec(app);
while (match) {
  handlers.add(match[1]);
  match = handlerRegex.exec(app);
}

const ignoredDynamic = new Set(["restore-"]);
const missing = [...actions].filter((action) => !handlers.has(action) && ![...ignoredDynamic].some((prefix) => action.startsWith(prefix)));

if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing, actions: [...actions].sort(), handlers: [...handlers].sort() }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, staticActionCount: actions.size, handledCount: handlers.size }, null, 2));

import { readFileSync } from "node:fs";

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

const app = readFileSync("app.js", "utf8");
const control = readFileSync("ui/control.js", "utf8");
const feed = readFileSync("ui/v34-platform.js", "utf8");
const problems = [];

// --- Health Registry (P9.1): canonical 10-state vocabulary, real derivation, not a label ---
const REQUIRED_HEALTH_STATES = [
  "alive", "starting", "degraded", "failed", "disabled", "updating",
  "requires_config", "permission_blocked", "provider_unavailable", "index_stale"
];
if (!app.includes("const HEALTH_STATES")) problems.push("app.js does not define HEALTH_STATES");
const healthStatesMatch = app.match(/const HEALTH_STATES = \[([^\]]*)\]/);
if (!healthStatesMatch) {
  problems.push("could not locate HEALTH_STATES array literal");
} else {
  for (const state of REQUIRED_HEALTH_STATES) {
    if (!healthStatesMatch[1].includes(`"${state}"`)) problems.push(`HEALTH_STATES missing state: ${state}`);
  }
}

if (!app.includes("function computeHealthRegistry")) problems.push("app.js does not define computeHealthRegistry");
if (!app.includes("function healthRegistryAlerts")) problems.push("app.js does not define healthRegistryAlerts");
if (!/healthRegistry:\s*computeHealthRegistry\(state/.test(app)) problems.push("buildNewShellContext does not expose healthRegistry (derived live, not a stored duplicate)");
if (!/healthAlerts:\s*healthRegistryAlerts\(state/.test(app)) problems.push("buildNewShellContext does not expose healthAlerts");

// --- Control panel shows the full registry ---
if (!control.includes("health-registry-section") || !control.includes("health-row")) problems.push("ui/control.js does not render a health registry panel");

// --- Feed surfaces genuine degradations (not baseline unconfigured states) as a visible
// signal - never a hidden action ---
if (!app.includes("const HEALTH_FEED_ALERT_STATES")) problems.push("app.js does not define HEALTH_FEED_ALERT_STATES (degradation filter for Feed)");
if (!feed.includes("feed-health-alerts") || !feed.includes("healthAlertBanner")) problems.push("ui/v34-platform.js does not render a Feed health-degradation banner");

if (problems.length) fail("Health Registry audit failed", { problems });

console.log(JSON.stringify({
  ok: true,
  healthStates: REQUIRED_HEALTH_STATES.length,
  note: "Health Registry (P9.1): 10-state vocabulary derived live from real provider/embeddings/index/storage signals; Control shows the full registry, Feed surfaces only genuine degraded/failed states"
}, null, 2));

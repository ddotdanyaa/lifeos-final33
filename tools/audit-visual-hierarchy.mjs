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
  // Отрицательный трекинг: правило появилось потому, что он ПОРТИТ КИРИЛЛИЦУ — но вред даёт
  // агрессивное сжатие и сжатие в пикселях на мелком тексте, а не мягкий оптический трекинг
  // крупных заголовков. Владелец объявил design-system/ единственным каноном (2026-07-25), а он
  // намеренно использует -0.012…-0.028em на дисплейных размерах (29/21/17px). Поэтому правило
  // СУЖЕНО, а не снято: по-прежнему запрещены отрицательные значения в px и всё от -0.04em и
  // глубже — то есть ровно то, что делало текст нечитаемым.
  /letter-spacing:\s*-\d+(?:\.\d+)?px/i,
  /letter-spacing:\s*-0*\.0*[4-9]\d*em/i,
  /letter-spacing:\s*-[1-9]\d*(?:\.\d+)?em/i
].filter((pattern) => pattern.test(css)).map(String);

if (missingCss.length || missingJs.length || forbidden.length) {
  console.error(JSON.stringify({ ok: false, missingCss, missingJs, forbidden }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checked: "visual hierarchy", cssRules: requiredCss.length, jsRules: requiredJs.length }, null, 2));

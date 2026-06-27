import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");

function body(name) {
  const start = app.indexOf(`function ${name}`);
  if (start === -1) throw new Error(`Missing ${name}`);
  const brace = app.indexOf("{", start);
  let depth = 0;
  for (let index = brace; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(brace + 1, index);
  }
  throw new Error(`Could not parse ${name}`);
}

const primary = [body("renderHumanChatHome"), body("renderHumanUnderstanding"), body("renderHumanNavRail")].join("\n");

const requiredRussian = [
  "Что добавить в LifeOS?",
  "Напиши, скажи, скинь файл",
  "LifeOS понял",
  "Главное действие",
  "Дополнительно",
  "Задача",
  "Расход",
  "Файл / скрин",
  "Аудио",
  "Книга"
];

const missing = requiredRussian.filter((text) => !primary.includes(text));
if (missing.length) {
  console.error("Missing Russian primary labels:", missing.join(", "));
  process.exit(1);
}

const forbiddenEnglishStatus = /\b(ready|offline|ok|needs-data|provider gate|blocked external)\b/i;
if (forbiddenEnglishStatus.test(primary)) {
  console.error("Primary UI contains English/internal status wording.");
  process.exit(1);
}

console.log("audit:primary-ui-language passed");

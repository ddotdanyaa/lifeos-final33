import { readFileSync } from "node:fs";

const productionFiles = ["app.js", "styles.css", "smoke.mjs", "package.json"];
const forbidden = [
  "Завтра в 14:00 зал, купить протеин 2500 ₽, каждый день вода 2л, до 1 июля накопить 30000, напомни вечером",
  "Завтра в 14:00 зал"
];

const hits = [];
for (const file of productionFiles) {
  const body = readFileSync(file, "utf8");
  for (const sample of forbidden) {
    if (body.includes(sample)) hits.push({ file, sample });
  }
}

if (hits.length) {
  console.error(JSON.stringify({ ok: false, hits }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checked: productionFiles, rule: "owner sample is allowed only in docs/fixtures/tests" }, null, 2));

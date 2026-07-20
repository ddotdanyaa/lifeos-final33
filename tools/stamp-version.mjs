import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

// Срез 1 плана v1.4 (2026-07-20): владелец не раз смотрел на СТАРУЮ версию приложения из-за
// service-worker-кэша и не мог понять, применилась ли работа (задокументированный случай:
// протухший CSS из кэша "chat-hardfix-v4" во время V0.5-редизайна). Этот скрипт закрывает
// ловушку навсегда: (1) видимый хеш сборки в шапке UI отвечает на вопрос "на что я смотрю",
// (2) имя SW-кэша привязывается к тому же хешу, поэтому новая сборка гарантированно
// инвалидирует старый кэш при activate. Запускать перед каждым коммитом: npm run stamp.

const sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const stamp = sha + " · " + new Date().toISOString().slice(0, 16).replace("T", " ");

const indexPath = "index.html";
let indexHtml = readFileSync(indexPath, "utf8");
const metaTag = `<meta name="build-version" content="${stamp}" />`;
if (indexHtml.includes('name="build-version"')) {
  indexHtml = indexHtml.replace(/<meta name="build-version"[^>]*\/>/, metaTag);
} else {
  indexHtml = indexHtml.replace('<meta name="theme-color"', metaTag + "\n    <meta name=\"theme-color\"");
}
writeFileSync(indexPath, indexHtml);

const swPath = "service-worker.js";
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(/const LIFEOS_CACHE = "[^"]+";/, `const LIFEOS_CACHE = "lifeos-v34-${sha}";`);
writeFileSync(swPath, sw);

console.log("Stamped build-version:", stamp);

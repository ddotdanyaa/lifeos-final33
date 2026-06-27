import { execFileSync } from "node:child_process";

function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: options.stdio || "pipe", encoding: "utf8" }).trim();
}

run("npm", ["run", "build:public"], { stdio: "inherit" });

try {
  run("gh", ["auth", "status"], { stdio: "inherit" });
} catch {
  console.error("GitHub CLI не авторизован. Запусти: gh auth login --web");
  process.exit(1);
}

const branch = run("git", ["branch", "--show-current"]) || "owner-usable-nonstop-rescue";
const remote = run("git", ["remote", "get-url", "origin"]);
if (!/github\.com[:/]/i.test(remote)) {
  console.error("origin не похож на GitHub remote: " + remote);
  process.exit(1);
}

try {
  run("gh", ["api", "repos/ddotdanyaa/lifeos-final33/pages", "-X", "POST", "-f", "build_type=workflow"], { stdio: "inherit" });
} catch {
  console.log("GitHub Pages уже может быть включен или API вернул существующую настройку. Продолжаю.");
}

try {
  run("gh", ["workflow", "run", "pages.yml", "--ref", branch], { stdio: "inherit" });
  console.log("Pages workflow запущен для ветки " + branch);
} catch {
  console.log("Workflow пока не запущен. После push ветки GitHub Actions Pages подхватит .github/workflows/pages.yml.");
}

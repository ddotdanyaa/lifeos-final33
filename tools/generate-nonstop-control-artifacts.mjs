import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const root = process.cwd();
const now = new Date().toISOString();

function sh(command, fallback = "") {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return fallback;
  }
}

function csv(value) {
  return '"' + String(value ?? "").replaceAll('"', '""') + '"';
}

mkdirSync("docs/ops", { recursive: true });
mkdirSync("docs/qc", { recursive: true });
mkdirSync("output/playwright/fixtures", { recursive: true });

const branch = sh("git branch --show-current", "unknown");
const commit = sh("git log -1 --oneline --decorate", "NO_COMMITS_YET");
const remote = sh("git remote -v", "");
const status = sh("git status -sb", "unknown");

const packages = [
  ["P000", "Git/source gate, baseline, control artifacts", "done", ["W001", "W002", "W003", "W004", "W005"]],
  ["P001", "Universal Capture + General Analysis + Proposal Cards + Apply Engine + Clean Home", "doing", ["W021", "W041", "W061", "W081", "W101"]],
  ["P002", "Calendar / Tasks / Reminders", "todo", ["W121", "W122", "W123", "W124"]],
  ["P003", "Finance / Budget / Screenshot expenses", "todo", ["W141", "W142", "W143", "W144"]],
  ["P004", "Habits / Goals / Progress / Insights", "todo", ["W161", "W162", "W163", "W164"]],
  ["P005", "Library / Knowledge / Second brain", "todo", ["W181", "W182", "W183", "W184"]],
  ["P006", "Files / Books / PDF / EPUB gates or parsers", "todo", ["W201", "W202", "W203", "W204"]],
  ["P007", "Audio / Player / Transcript / STT gate", "todo", ["W221", "W222", "W223", "W224"]],
  ["P008", "Ollama / Provider model pipeline", "todo", ["W241", "W242", "W243", "W244"]],
  ["P009", "Chat / Agents / Flows", "todo", ["W261", "W262", "W263", "W264"]],
  ["P010", "Obsidian-like Graph", "todo", ["W281", "W282", "W283", "W284"]],
  ["P011", "Data Control / export / recover / rollback", "todo", ["W301", "W302", "W303", "W304"]],
  ["P012", "Mobile / performance / accessibility", "todo", ["W321", "W322", "W323", "W324"]],
  ["P013", "Full ledger closure and GitHub release report", "todo", ["W401", "W402", "W403", "W404"]]
];

const queue = packages.map(([id, title, statusValue, weaknesses]) => ({
  id,
  title,
  status: statusValue,
  openWeaknesses: weaknesses,
  acceptance: [
    "repository-backed objects",
    "owner-visible UI",
    "graph/control/audit evidence",
    "Playwright or audit proof"
  ],
  files: ["app.js", "styles.css", "smoke.mjs", "package.json", "output/playwright/*.spec.mjs"],
  tests: ["npm run verify", "npm run e2e", "npm run e2e:owner", "npm run e2e:fixtures"],
  screenshots: ["output/playwright/owner-home.png"],
  commit: statusValue === "done" ? commit.split(" ")[0] : ""
}));

writeFileSync("docs/ops/NONSTOP_OWNER_RESCUE_QUEUE.json", JSON.stringify(queue, null, 2) + "\n", "utf8");

const areas = [
  "GitHub/source-of-truth",
  "Artifact kernel/repository/schema",
  "First-screen IA/visual clarity",
  "Universal capture/classification",
  "Proposal cards/apply engine",
  "Calendar/day/week/reminders",
  "Tasks/projects/checklists",
  "Finance/budget/subscriptions/screenshot expenses",
  "Habits/goals/progress/recovery",
  "Second brain/knowledge/insights/ideas",
  "Library/books/PDF/EPUB/TXT/MD",
  "Audio/player/transcript/STT",
  "Ollama/local AI/providers",
  "Chat/agent/flow/n8n-like automation",
  "Obsidian-like graph/search/backlinks",
  "Data Control/export/import/rollback/recovery",
  "Privacy/safety/permissions",
  "Mobile/performance/accessibility",
  "Empty/error/offline states",
  "Tests/screenshots/no-hardcode/no-dead-buttons"
];

const weaknessRows = [
  ["id", "area", "weakness", "expected_behavior", "current_status", "resolution_status", "evidence_file", "test_name", "screenshot", "commit", "notes"]
];

for (let index = 1; index <= 420; index += 1) {
  const id = "W" + String(index).padStart(3, "0");
  const area = areas[Math.floor((index - 1) / 21) % areas.length];
  const firstBatch = index <= 20;
  const statusValue = firstBatch ? "BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION" : index <= 120 ? "IN_PROGRESS" : "OPEN";
  const evidence = firstBatch ? "docs/ops/NONSTOP_OWNER_RESCUE_STATE.md" : "";
  const note = firstBatch
    ? "GitHub push blocked because gh auth status reports no logged-in host. Exact next action: owner runs gh auth login or provides repo remote."
    : "Must close through code + state + UI + graph/control/audit + test evidence; labels alone do not close this row.";
  weaknessRows.push([
    id,
    area,
    `${area} gap ${((index - 1) % 21) + 1}`,
    "Owner can complete the related LifeOS job through the shared Artifact repository without fake panels or disconnected state.",
    firstBatch ? "GitHub remote/auth missing; local baseline exists." : "Awaiting package implementation.",
    statusValue,
    evidence,
    "",
    "",
    firstBatch ? commit.split(" ")[0] : "",
    note
  ]);
}

writeFileSync(
  "docs/qc/NONSTOP_OWNER_WEAKNESS_LEDGER.csv",
  weaknessRows.map((row) => row.map(csv).join(",")).join("\n") + "\n",
  "utf8"
);

const fixtures = [];
const fixtureSeeds = [
  ["simple_task", "Позвонить врачу и записаться на прием", ["task"], ["task"]],
  ["dated_task", "Завтра подготовить договор для клиента", ["task", "calendar"], ["task", "calendar"]],
  ["timed_task", "В пятницу в 14:00 зал и растяжка", ["task", "calendar"], ["task", "calendar"]],
  ["recurring_task", "Каждый понедельник проверять финансы", ["task", "habit"], ["task", "habit"]],
  ["expense", "Кофе 250 рублей сегодня", ["finance_expense"], ["finance"]],
  ["expense_shop", "Пятерочка 1240 продукты", ["finance_expense", "food"], ["finance"]],
  ["balance", "Баланс карта 15200", ["finance_balance"], ["finance"]],
  ["income", "Зарплата 100000 пришла", ["finance_income"], ["finance"]],
  ["subscription", "Подписка Яндекс 399 28 июня", ["subscription", "bill"], ["finance"]],
  ["budget", "Лимит на еду 30000 в месяц", ["budget"], ["finance"]],
  ["habit", "Каждый день вода 2 литра", ["habit"], ["habit"]],
  ["goal", "Хочу накопить 30000 до 1 июля", ["goal"], ["goal"]],
  ["idea", "Идея: сделать курс по локальному AI", ["idea", "knowledge"], ["knowledge"]],
  ["project", "Проект ремонт кухни: выбрать материалы и бюджет", ["project", "task", "finance"], ["knowledge", "task", "finance"]],
  ["book", "Книга: Atomic Habits, заметка про маленькие привычки", ["book", "knowledge"], ["knowledge", "media"]],
  ["email", "From: anna@example.com Subject: встреча завтра в 16:00 обсудить бюджет", ["email", "calendar"], ["knowledge", "calendar"]],
  ["audio", "Аудио встреча: решили отправить счет и проверить задачи", ["audio", "transcript", "task"], ["media", "task"]],
  ["home", "Дом: купить лампочки и починить полку", ["home", "task"], ["task"]],
  ["health", "Сон 6 часов, энергия низкая, вечером прогулка", ["health", "habit"], ["habit", "knowledge"]],
  ["travel", "Поездка в Казань 12 июля, купить билеты до пятницы", ["travel", "calendar", "task"], ["calendar", "task"]],
  ["reminder", "РќР°РїРѕРјРЅРё РІРµС‡РµСЂРѕРј РѕС‚РїСЂР°РІРёС‚СЊ РґРѕРєСѓРјРµРЅС‚С‹", ["reminder", "task"], ["reminder", "task"]],
  ["transfer_savings", "РџРµСЂРµРІРµР» 5000 РЅР° РЅР°РєРѕРїР»РµРЅРёСЏ", ["finance_transfer", "savings"], ["finance"]],
  ["research_question", "Р’РѕРїСЂРѕСЃ РґР»СЏ РёСЃСЃР»РµРґРѕРІР°РЅРёСЏ: РєР°Рє СЃРІСЏР·Р°С‚СЊ РєРЅРёРіРё, Р°СѓРґРёРѕ Рё Р·Р°РґР°С‡Рё РіСЂР°С„РѕРј", ["knowledge", "research_question"], ["knowledge"]],
  ["typo_heavy_ru", "Р·Р°РІС‚СЂР° РІ 6 встат пргтовить завтрак Рё РЅР°РїРѕРјРЅРё", ["task", "calendar", "reminder"], ["task", "calendar", "reminder"]],
  ["english_russian_mix", "Next week РїРѕРґРіРѕС‚РѕРІРёС‚СЊ budget review and add task РґР»СЏ finance", ["task", "calendar", "finance"], ["task", "calendar", "finance"]],
  ["uncertain_ambiguous", "РјРѕР¶РµС‚ РЅР°РґРѕ РєР°Рє-С‚Рѕ СЂР°Р·РѕР±СЂР°С‚СЊ РёРґРµСЋ РїСЂРѕ РґРѕРј Рё РґРµРЅСЊРіРё", ["uncertain", "idea", "finance"], ["knowledge", "finance"]]
];

for (let index = 0; index < 120; index += 1) {
  const seed = fixtureSeeds[index % fixtureSeeds.length];
  const suffix = Math.floor(index / fixtureSeeds.length) + 1;
  fixtures.push({
    id: `F${String(index + 1).padStart(3, "0")}`,
    class: seed[0],
    input: `${seed[1]} #${suffix}`,
    expectedClasses: seed[2],
    minimumProposalTypes: seed[3],
    shouldMutateBeforeApply: false
  });
}

fixtures[0] = {
  id: "F001",
  class: "mixed_owner_sample",
  input: "Завтра в 14:00 зал, купить протеин 2500 ₽, каждый день вода 2л, до 1 июля накопить 30000, напомни вечером",
  expectedClasses: ["task", "calendar", "finance_expense", "habit", "goal", "reminder"],
  minimumProposalTypes: ["task", "calendar", "finance", "habit", "goal", "reminder", "knowledge"],
  shouldMutateBeforeApply: false
};

writeFileSync("output/playwright/fixtures/owner-input-fixtures.json", JSON.stringify(fixtures, null, 2) + "\n", "utf8");

writeFileSync("docs/ops/NONSTOP_OWNER_RESCUE_STATE.md", [
  "# NONSTOP OWNER RESCUE STATE",
  "",
  `Updated: ${now}`,
  `Repo path: ${root}`,
  `Branch: ${branch}`,
  `Remote: ${remote || "NONE - BLOCKED_OWNER_CREDENTIAL_WITH_EXACT_NEXT_ACTION"}`,
  `Commit: ${commit}`,
  "Localhost URL: http://127.0.0.1:4173",
  "Active package: P001 - Universal Capture + General Analysis + Proposal Cards + Apply Engine + Clean Home",
  "Open gates count: 400 non-GitHub product rows remain open/in-progress after baseline gate.",
  "GitHub status: blocked until owner runs gh auth login or provides an origin remote.",
  "Next exact package: P001 runtime implementation, fixtures, audits, screenshots.",
  "",
  "Last gate commands:",
  "```text",
  `git status: ${status}`,
  "gh auth status: not logged into any GitHub hosts",
  "node: " + sh("node -v", ""),
  "npm: " + sh("npm -v", ""),
  "```"
].join("\n") + "\n", "utf8");

writeFileSync("docs/qc/NONSTOP_RESEARCH_LEDGER.md", [
  "# NONSTOP RESEARCH LEDGER",
  "",
  `Updated: ${now}`,
  "",
  "| Topic | Source | Implementation decision |",
  "| --- | --- | --- |",
  "| File API / drag-drop | https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications | Use file input plus drag/drop FileList, store local SourcePacket, no silent upload. |",
  "| IndexedDB | https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API | Keep IndexedDB as local-first store with chunked compressed payload. |",
  "| Storage quota | https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate | Show usage/quota in Data Control. |",
  "| Ollama API | https://github.com/ollama/ollama/blob/main/docs/api.md | Probe /api/tags only after owner click; model output stays proposal-only. |",
  "| Playwright screenshots/e2e | https://playwright.dev/docs/screenshots | Save owner screenshots in output/playwright. |",
  "| Service Worker | https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API | Keep as later local/offline package; localhost is secure context for dev. |",
  "| Web Speech / STT | https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API | Do not claim STT unless engine/browser support is explicitly available; manual transcript remains primary. |",
  "| Canvas graph | https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API | Keep canvas graph, add real repository-backed node types and filters. |",
  "| PDF parsing | https://mozilla.github.io/pdf.js/ | PDF import remains honest parser gate until PDF.js integration is implemented and tested. |",
  "| OCR | https://github.com/naptha/tesseract.js | Receipt screenshots can be stored and manually extracted; automatic OCR is gated. |",
  "| EPUB parsing | https://github.com/futurepress/epub.js/ | EPUB import remains honest parser gate until parser package is added and tested. |",
  "| local-first app patterns | local skill: .agents/skills/local-first/SKILL.md | UI reads/writes local repository first; sync/provider layers are gates. |"
].join("\n") + "\n", "utf8");

writeFileSync("docs/qc/NONSTOP_OWNER_RESCUE_REPORT.md", [
  "# NONSTOP OWNER RESCUE REPORT",
  "",
  `Updated: ${now}`,
  "",
  "Status: CONTINUATION REQUIRED.",
  "",
  "Baseline exists locally. GitHub push is blocked because GitHub CLI is not authenticated.",
  "",
  "Current active package: P001 - Universal Capture + General Analysis + Proposal Cards + Apply Engine + Clean Home.",
  "",
  "Owner can use this report as a rolling checkpoint; product success is not claimed until ledger rows are closed with code, UI, tests, screenshots and GitHub push."
].join("\n") + "\n", "utf8");

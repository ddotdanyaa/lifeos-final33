// П6 · МЁРТВЫЙ КОД — граф достижимости, а не глазами.
//
// Зачем инструмент, а не разовая перепись: мёртвая функция не выглядит мёртвой. Она выглядит
// как обычный код, и хуже того — её читают. Урок из PROGRESS.md: целый слой render-функций в
// `app.js` никогда не вызывался, настоящий UI строится в `ui/*.js`, и агент правил разметку,
// которой на экране не было. Такое находит только машина и только регулярно.
//
// Как считается достижимость (честно, с признанием границ):
//   1. Собираем все объявления верхнего уровня: `function f(){}`, `async function f(){}`,
//      `const f = (…) => {…}`, `const f = function(){}`.
//   2. Точками входа считаем ЛЮБОЕ упоминание имени вне тела какой-либо функции: строчка
//      `boot()`, объект моста `window.__lifeosKnowledgeBase`, привязка обработчиков, экспорт.
//   3. Ребро A→B, если имя B встречается в теле A как отдельный идентификатор.
//   4. Обход в ширину от точек входа. Всё, до чего не дошли, — кандидаты на удаление.
//
// Граница метода названа прямо: динамический вызов по строке (`obj[name]()`) граф не видит.
// Поэтому в отчёте — «кандидаты», и перед удалением каждый проверяется поиском по репозиторию.
// Ослаблять аудит ради зелёного нельзя (И-8): если кандидат живой, удаляется не он, а ошибка
// в разборе — и это правится здесь, в инструменте.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const TARGETS = ["app.js"];
const BASELINE_PATH = "docs/qc/dead-code-baseline.json";

// Имена, которые вызываются не по имени: их держит рантайм браузера или строковый диспетчер.
const RUNTIME_ENTRY_NAMES = new Set(["boot", "render", "main"]);

function findDeclarations(source) {
  const declarations = [];
  const lines = source.split("\n");
  let offset = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fnMatch = line.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
    const constMatch = line.match(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*\(|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/);
    const name = fnMatch ? fnMatch[1] : (constMatch ? constMatch[1] : "");
    if (!name) {
      offset += line.length + 1;
      continue;
    }
    // Конец объявления — по балансу скобок от первой открывающей.
    const start = offset;
    const bodyStart = source.indexOf("{", start);
    if (bodyStart < 0) {
      offset += line.length + 1;
      continue;
    }
    let depth = 0;
    let end = bodyStart;
    let inString = "";
    let inComment = "";
    for (let position = bodyStart; position < source.length; position += 1) {
      const char = source[position];
      const next = source[position + 1];
      const prev = source[position - 1];
      if (inComment === "line") {
        if (char === "\n") inComment = "";
        continue;
      }
      if (inComment === "block") {
        if (char === "*" && next === "/") { inComment = ""; position += 1; }
        continue;
      }
      if (inString) {
        if (char === "\\") { position += 1; continue; }
        if (char === inString) inString = "";
        continue;
      }
      if (char === "/" && next === "/") { inComment = "line"; position += 1; continue; }
      if (char === "/" && next === "*") { inComment = "block"; position += 1; continue; }
      if (char === "\"" || char === "'" || char === "`") { inString = char; continue; }
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) { end = position + 1; break; }
      }
      if (char === "\n" && depth === 0 && position > bodyStart && prev === ";") { end = position; break; }
    }
    declarations.push({
      name,
      start,
      end,
      line: index + 1,
      lines: source.slice(start, end).split("\n").length,
      body: source.slice(bodyStart, end)
    });
    // Продолжаем со строки, следующей за концом объявления.
    const consumed = source.slice(0, end).split("\n").length;
    while (index + 1 < consumed) index += 1;
    offset = source.slice(0, end).length;
    if (source[offset] === "\n") offset += 1;
  }
  return declarations;
}

function identifiersIn(text) {
  const found = new Set();
  for (const match of String(text).matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)/g)) found.add(match[1]);
  return found;
}

const report = [];
for (const target of TARGETS) {
  const source = readFileSync(target, "utf8");
  const declarations = findDeclarations(source);
  const byName = new Map(declarations.map((item) => [item.name, item]));

  // Код верхнего уровня — всё, что не попало ни в одно объявление. Имя, упомянутое там,
  // достижимо по определению: его держит либо рантайм, либо мост для спек.
  let topLevel = "";
  let cursor = 0;
  for (const declaration of declarations.slice().sort((a, b) => a.start - b.start)) {
    if (declaration.start > cursor) topLevel += source.slice(cursor, declaration.start);
    cursor = Math.max(cursor, declaration.end);
  }
  topLevel += source.slice(cursor);

  const entries = new Set();
  for (const name of identifiersIn(topLevel)) if (byName.has(name)) entries.add(name);
  for (const name of RUNTIME_ENTRY_NAMES) if (byName.has(name)) entries.add(name);

  const reached = new Set();
  const queue = Array.from(entries);
  while (queue.length) {
    const name = queue.shift();
    if (reached.has(name)) continue;
    reached.add(name);
    const declaration = byName.get(name);
    if (!declaration) continue;
    for (const identifier of identifiersIn(declaration.body)) {
      if (byName.has(identifier) && !reached.has(identifier)) queue.push(identifier);
    }
  }

  const unreachable = declarations
    .filter((item) => !reached.has(item.name))
    .sort((a, b) => b.lines - a.lines);

  // Находка замера 2026-07-28, важнее самих чисел: часть мёртвых функций ЗАКРЕПЛЕНА гейтами.
  // `smoke.mjs` проверяет наличие 86 строк-маркеров в `app.js`, и некоторые из них указывают на
  // render-функции, которые никогда не вызываются. Гейт зелёный — а экрана нет: смок говорит
  // «интерфейс на месте», проверяя функцию, которую браузер не исполняет ни разу. Такое нельзя
  // ни удалить молча (упадёт verify), ни оставить молча (гейт врёт). Разделяем и называем.
  const guards = ["smoke.mjs"].concat(
    (existsSync("tools") ? readFileSync("tools/audit-no-cockpit-first-screen.mjs", "utf8") : "") ? ["tools"] : []
  );
  // Гейты читаем ВСЕ, а не выборочно. Список из четырёх аудитов был написан по памяти, и на
  // удалении выяснилось, чего он стоит: `audit-architecture-contract`, `audit-workspace-links`
  // и `audit-product-brain` тоже требуют конкретных функций — и три из них уехали в «свободные»,
  // а потом упали красным. Правило простое: файл в `tools/` называется аудитом — значит он гейт,
  // и его требования обязательны, даже если мы про него забыли.
  const guardText = [
    existsSync("smoke.mjs") ? readFileSync("smoke.mjs", "utf8") : "",
    ...(existsSync("tools")
      ? readdirSync("tools")
        .filter((name) => /^audit-.*\.mjs$/.test(name) && name !== "audit-dead-code.mjs")
        .map((name) => readFileSync("tools/" + name, "utf8"))
      : [])
  ].join("\n");
  // Проверять одно только ИМЯ функции недостаточно, и это выяснилось удалением: `smoke.mjs`
  // требует не только «function renderCalendarPanel», но и строки ВНУТРИ тел — например
  // `data-testid="global-search"`. Удалив такую функцию, я снял 12 маркеров сразу, хотя по
  // именам она числилась свободной. Поэтому мёртвая функция свободна только когда ни имя, ни
  // один требуемый гейтом фрагмент не исчезнет вместе с ней.
  const guardStrings = [...guardText.matchAll(/"((?:[^"\\]|\\.){6,})"/g)]
    .map((match) => match[1].replace(/\\"/g, "\""))
    .filter((value) => value.length >= 8);
  const pinned = [];
  const free = [];
  for (const item of unreachable) {
    const declaration = declarations.find((row) => row.name === item.name);
    const body = declaration ? declaration.body : "";
    const namePinned = new RegExp("(?<![\\w$])" + item.name + "(?![\\w$])").test(guardText);
    // Фрагмент, который гейт требует и который БОЛЬШЕ НИГДЕ в файле не встречается: удалив эту
    // функцию, мы унесём его с собой и молча погасим проверку.
    const contentPinned = !namePinned && guardStrings.some((needle) => {
      if (!body.includes(needle)) return false;
      return source.indexOf(needle) === source.lastIndexOf(needle);
    });
    ((namePinned || contentPinned) ? pinned : free).push({ name: item.name, line: item.line, lines: item.lines });
  }

  report.push({
    file: target,
    total: declarations.length,
    reachable: reached.size,
    guards: guards.length,
    // Удалять можно только это: код, который не вызывается и ничем не удерживается.
    unreachable: free,
    // А это — решение владельца: удаление тянет за собой правку гейта (П25 запрещает трогать
    // smoke.mjs и аудиты внутри пакета), поэтому пакет их не касается и называет вслух.
    pinnedByGates: pinned,
    deadLines: free.reduce((sum, item) => sum + item.lines, 0),
    pinnedLines: pinned.reduce((sum, item) => sum + item.lines, 0)
  });
}

const totalDead = report.reduce((sum, row) => sum + row.unreachable.length, 0);
const totalDeadLines = report.reduce((sum, row) => sum + row.deadLines, 0);

if (process.argv.includes("--write-baseline")) {
  writeFileSync(BASELINE_PATH, JSON.stringify({ measuredAt: new Date().toISOString().slice(0, 10), report }, null, 2) + "\n", "utf8");
  console.log("Baseline written to " + BASELINE_PATH + ": " + totalDead + " unreachable / " + totalDeadLines + " lines");
  process.exit(0);
}

console.log(JSON.stringify({
  audit: "dead-code",
  totalFunctions: report.reduce((sum, row) => sum + row.total, 0),
  unreachable: totalDead,
  unreachableLines: totalDeadLines,
  files: report
}, null, 2));

// Планка — прошлый замер. Аудит красный, когда мёртвого кода стало БОЛЬШЕ: удаление
// подтверждается снижением планки (`--write-baseline`), а не правкой порога руками.
const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")) : null;
const baselineDead = baseline ? baseline.report.reduce((sum, row) => sum + row.unreachable.length, 0) : Infinity;
if (totalDead > baselineDead) {
  console.error("Недостижимых функций стало больше: " + totalDead + " против " + baselineDead + " в замере от " + baseline.measuredAt);
  process.exit(1);
}
console.log("audit:dead-code passed");

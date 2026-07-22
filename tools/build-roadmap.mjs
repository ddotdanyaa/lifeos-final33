// Карта развития LifeOS одним графом связей: что закрыто, что следующее, что осталось,
// и как срезы зависят друг от друга. Владелец хочет ВИДЕТЬ прогресс проекта, а не читать
// леджеры. Данные ниже — источник истины (сверены с PROGRESS.md и docs/*_PLAN.md); закрыл
// срез → поменял status на "done" и пересобрал: `node tools/build-roadmap.mjs`. Вывод —
// самодостаточный docs/roadmap.html (без внешних зависимостей), отдаётся локальным сервером
// по /docs/roadmap.html. Не продуктовая поверхность (LifeOS ≠ dashboard), а dev-карта.

import { writeFileSync } from "node:fs";

// Фазы = колонки слева направо (хронология развития).
const phases = [
  { id: "v10", title: "Фундамент v1.0" },
  { id: "v11", title: "Ускорение v1.1" },
  { id: "v12", title: "Ежедневное v1.2" },
  { id: "v14", title: "Полная сборка v1.4" },
  { id: "now", title: "Сейчас — финансы-автосистема" },
  { id: "donor", title: "Донор-поток → ванильный код" }
];

// status: done | next | todo. deps = рёбра-зависимости (эта нода строится ПОВЕРХ тех).
const nodes = [
  // v1.0 / v1.1 — свёрнуты в вехи (полностью закрыты)
  { id: "v10", phase: "v10", label: "v1.0 · 33 пакета", status: "done",
    desc: "Artifact Core, storage kernel (IndexedDB+gzip), 47 коллекций, 27 workspace-линз, schema v3, базовые поверхности. Полностью закрыт." },
  { id: "v11", phase: "v11", label: "v1.1 · Acceleration", status: "done", deps: ["v10"],
    desc: "Пакет ускорения поверх v1.0. Закрыт." },

  // v1.2 Daily Use — U0→U6
  { id: "u0", phase: "v12", label: "U0 Дизайн-система", status: "done", deps: ["v11"],
    desc: "Токены --text/--space/--radius, единый визуальный слой." },
  { id: "u1", phase: "v12", label: "U1 Today / Home", status: "done", deps: ["u0"],
    desc: "«Мой день», спокойный capture-first первый экран." },
  { id: "u2", phase: "v12", label: "U2 Money Fast", status: "done", deps: ["u1"],
    desc: "Быстрый ввод расхода текстом через analyzeArtifactInput." },
  { id: "u4", phase: "v12", label: "U4 Chat Actions", status: "done", deps: ["u2"],
    desc: "Предложения из чата → реальные действия с чеком." },
  { id: "u3", phase: "v12", label: "U3 Voice Loop", status: "done", deps: ["u4"],
    desc: "Голос → расшифровка → знание/задача." },
  { id: "u5", phase: "v12", label: "U5 Reader", status: "done", deps: ["u3"],
    desc: "PDF/EPUB постранично (pdfjs-dist)." },
  { id: "u6", phase: "v12", label: "U6 Evening Summary", status: "done", deps: ["u5"],
    desc: "Вечерняя сводка дня — первый донорский пакет." },

  // v1.4 FULL_BUILD — срезы 1..14
  { id: "s1",  phase: "v14", label: "1 · Аудит + план", status: "done", deps: ["u6"],
    desc: "Аудит кода → план переиспользования." },
  { id: "s2",  phase: "v14", label: "2 · Artifact Core + capture", status: "done", deps: ["s1"] },
  { id: "s3",  phase: "v14", label: "3 · Финансы + проекции", status: "done", deps: ["s2"] },
  { id: "s4",  phase: "v14", label: "4 · Дашборд + утро", status: "done", deps: ["s3"] },
  { id: "s5",  phase: "v14", label: "5 · Чат на данных", status: "done", deps: ["s4"] },
  { id: "s6",  phase: "v14", label: "6 · Whisper голос", status: "done", deps: ["s5"] },
  { id: "s7",  phase: "v14", label: "7 · Граф (Obsidian-уровень)", status: "done", deps: ["s6"] },
  { id: "s8",  phase: "v14", label: "8 · Память + поиск", status: "done", deps: ["s7"] },
  { id: "s9",  phase: "v14", label: "9 · Timeline", status: "done", deps: ["s8"] },
  { id: "s10", phase: "v14", label: "10 · Entity Resolution", status: "done", deps: ["s9"] },
  { id: "s11", phase: "v14", label: "11 · Insight Engine", status: "done", deps: ["s10"] },
  { id: "s12", phase: "v14", label: "12 · User Model + Explain", status: "done", deps: ["s11"] },
  { id: "s13", phase: "v14", label: "13 · Agent Center", status: "done", deps: ["s12"] },
  { id: "s14", phase: "v14", label: "14 · Adaptive Dashboard", status: "done", deps: ["s13"] },

  // Сейчас — финансы-автосистема F1..F7 (порядок F1→F2→F5→F3→F4→F6→F7)
  { id: "f1", phase: "now", label: "F1 Банк-коннект (честный гейт)", status: "done", deps: ["s14"],
    desc: "providers.bank — статус not-connected, честно требует OAuth, ничего не имитирует." },
  { id: "f2", phase: "now", label: "F2 Автосбор из выписки CSV/OFX", status: "done", deps: ["f1", "s3"],
    desc: "Парсер CSV/OFX → каждая строка = предложение → подтверждение = транзакция + чек. Дедуп при повторном импорте." },
  { id: "f5", phase: "now", label: "F5 Визуализация (chart.js)", status: "next", deps: ["f2", "s4"],
    desc: "СЛЕДУЮЩИЙ. Cash-flow по дням, доход/час, прогресс к цели. Движок chat.js уже одобрен." },
  { id: "f3", phase: "now", label: "F3 Интеллект дохода", status: "todo", deps: ["f5"],
    desc: "Доход/час по сменам и дням; «стоит ли ехать на работу»." },
  { id: "f4", phase: "now", label: "F4 Движок финцелей", status: "todo", deps: ["f3"],
    desc: "Цель «заработать X к дате» → прогресс + прогноз." },
  { id: "f6", phase: "now", label: "F6 Финансовые инсайты", status: "todo", deps: ["f4", "s11"],
    desc: "Повторяющиеся траты, аномалии — поверх Insight Engine (срез 11)." },
  { id: "f7", phase: "now", label: "F7 Связи финансов в графе", status: "todo", deps: ["f6", "s7"],
    desc: "Смена↔доход↔место↔часы↔цель↔человек как рёбра графа (срез 7)." },

  // Донор-поток → ванильный код: проверенные доноры (лицензия+стек в OSS_DONOR_AUDIT.md),
  // концепции переносим в наш vanilla-код кусками. НЕ копия кода (Python/ClojureScript/AGPL).
  { id: "r_hay", phase: "donor", label: "R · RAG-конвейер (идея Haystack)", status: "todo", deps: ["s5", "s8"],
    desc: "Инспектируемый pipeline: запрос → поиск (minisearch/embeddings) → реранк → контекст → локальный ответ с цитатами назад на артефакт. Донор — Haystack (Apache-2.0, но Python → только идея; движки поиска уже установлены)." },
  { id: "i_graphiti", phase: "donor", label: "I · Темпоральный граф (идея Graphiti)", status: "todo", deps: ["s7", "f7"],
    desc: "Рёбра несут время-валидности + трассировку к эпизоду-источнику; противоречащий факт ИНВАЛИДИРУЕТ ребро, не стирает историю (совпадает с нашей философией чеков). Донор — Graphiti (Apache-2.0, но Python+Neo4j → только идея; реализуем как проекцию над нашим графом, не БД)." },
  { id: "base_logseq", phase: "donor", label: "База · outliner / block-refs (идея Logseq)", status: "todo", deps: ["s8"],
    desc: "Блоки-outliner, block-references ((id)), daily journal, page-properties. Донор — Logseq (AGPL-3.0 → ТОЛЬКО идеи, ни строки кода), поверх установленного @toast-ui/editor." },
  { id: "m_mem", phase: "donor", label: "M · Память фактов (идея Mem0/Cognee)", status: "todo", deps: ["s8"],
    desc: "Персональная память: факт хранится с источником и историей (add/search/update/invalidate), пересекается с философией чеков LifeOS. Доноры — Mem0/Cognee (Apache, но Python/TS → только идея)." },
  { id: "flows_lg", phase: "donor", label: "Агенты как граф состояний (идея LangGraph)", status: "todo", deps: ["s13"],
    desc: "Сценарии/агенты как граф состояний с чекпоинтами и human-in-the-loop. Донор — LangGraph (MIT, но Python → только идея), поверх готового Agent Center (срез 13)." },
  { id: "donor_more", phase: "donor", label: "Пачки Q / V (каталог 160+)", status: "todo", deps: ["r_hay", "i_graphiti", "m_mem"],
    desc: "Запросы (Q), визуал (V) — потоком из DONOR_FUNCTION_CATALOG (160+ функций), каждая пачка = вертикальный артефактный слой." },

  // Инфраструктура этой сессии (закрыта 22.07) — отдельный кластер устойчивости
  { id: "x_alac", phase: "now", label: "ALAC-аудио фикс", status: "done", deps: ["s6"],
    desc: "m4a/ALAC (iPhone Voice Memos) декодируется через локальный ffmpeg-fallback." },
  { id: "x_boot", phase: "now", label: "Фикс пустой страницы (.gitignore)", status: "done",
    desc: "vendor/ → /vendor/: перестал глотать ui/vendor/, из-за чего весь UI не грузился." },
  { id: "x_sw", phase: "now", label: "Авто-reload service worker", status: "done",
    desc: "Открытая вкладка перезагружается ровно раз при активации нового SW." },
  { id: "x_tool", phase: "now", label: "graphify + skills (инструменты агента)", status: "done", deps: ["s7"],
    desc: "graphify: граф кода (1565 узлов) для экономии токенов. 22 скилла mattpocock. НЕ продуктовая фича — инструмент разработки." }
];

const statusMeta = {
  done: { color: "#3fb68b", icon: "✓", label: "закрыто" },
  next: { color: "#e0a54f", icon: "▶", label: "следующий" },
  todo: { color: "#6b7683", icon: "·", label: "осталось" }
};

const doneCount = nodes.filter((n) => n.status === "done").length;
const total = nodes.length;
const pct = Math.round((doneCount / total) * 100);

const DATA = { phases, nodes, edges: nodes.flatMap((n) => (n.deps || []).map((d) => ({ from: d, to: n.id }))), statusMeta };

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>LifeOS — карта развития</title>
<style>
  :root {
    --bg: #0d1117; --panel: #161b22; --panel-2: #1c232c; --line: #2a323d;
    --text: #e6edf3; --muted: #8b98a5; --accent: #4f7bd9;
    --done: #3fb68b; --next: #e0a54f; --todo: #6b7683;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text);
    font: 14px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { padding: 22px 28px 14px; border-bottom: 1px solid var(--line); }
  h1 { margin: 0 0 4px; font-size: 20px; font-weight: 650; letter-spacing: -0.01em; }
  .sub { color: var(--muted); font-size: 13px; }
  .progress-row { display: flex; align-items: center; gap: 16px; margin-top: 14px; }
  .bar { flex: 1; height: 8px; background: var(--panel-2); border-radius: 99px; overflow: hidden; max-width: 520px; }
  .bar > i { display: block; height: 100%; width: ${pct}%; background: linear-gradient(90deg, var(--done), #57c9a0); }
  .pct { font-size: 13px; color: var(--muted); white-space: nowrap; }
  .pct b { color: var(--text); font-weight: 650; }
  .controls { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
  .controls button { background: var(--panel); color: var(--muted); border: 1px solid var(--line);
    padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12.5px; transition: .15s; }
  .controls button:hover { color: var(--text); border-color: #3a4552; }
  .controls button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .legend { display: flex; gap: 16px; margin-top: 12px; font-size: 12.5px; color: var(--muted); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .dot { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
  .wrap { position: relative; height: calc(100% - 210px); overflow: auto; }
  svg { display: block; }
  .node rect { transition: opacity .15s; }
  .node text { pointer-events: none; }
  .node { cursor: pointer; }
  .node.dim { opacity: .18; }
  .edge { fill: none; stroke: var(--line); stroke-width: 1.4; transition: opacity .15s; }
  .edge.dep { stroke-dasharray: 4 4; stroke: #3a4657; }
  .edge.dim { opacity: .08; }
  .edge.hot { stroke: var(--accent); stroke-width: 2; opacity: 1; }
  .col-title { fill: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: .02em; }
  .col-count { fill: #5b6673; font-size: 11px; }
  .drawer { position: fixed; top: 0; right: 0; width: 340px; height: 100%; background: var(--panel);
    border-left: 1px solid var(--line); padding: 24px; transform: translateX(102%); transition: .22s;
    overflow-y: auto; box-shadow: -20px 0 40px rgba(0,0,0,.35); }
  .drawer.open { transform: translateX(0); }
  .drawer .close { position: absolute; top: 16px; right: 18px; color: var(--muted); cursor: pointer;
    font-size: 20px; background: none; border: none; }
  .drawer .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 12px;
    font-weight: 600; margin-bottom: 12px; }
  .drawer h2 { font-size: 17px; margin: 8px 0 6px; }
  .drawer p { color: var(--muted); font-size: 13.5px; }
  .drawer .deps { margin-top: 16px; font-size: 12.5px; color: var(--muted); }
  .drawer .deps b { color: var(--text); display: block; margin-bottom: 6px; font-weight: 600; }
  .drawer .deps a { color: var(--accent); cursor: pointer; display: block; padding: 3px 0; }
</style>
</head>
<body>
<header>
  <h1>LifeOS — карта развития</h1>
  <div class="sub">Один граф связей: что закрыто, что следующее, что осталось. Пересобирается: <code>node tools/build-roadmap.mjs</code></div>
  <div class="progress-row">
    <div class="bar"><i></i></div>
    <div class="pct"><b>${doneCount} из ${total}</b> закрыто · ${pct}%</div>
  </div>
  <div class="controls">
    <button data-filter="all" class="active">Всё</button>
    <button data-filter="done">Закрыто</button>
    <button data-filter="open">Осталось</button>
  </div>
  <div class="legend">
    <span><i class="dot" style="background:var(--done)"></i> закрыто</span>
    <span><i class="dot" style="background:var(--next)"></i> следующий</span>
    <span><i class="dot" style="background:var(--todo)"></i> осталось</span>
    <span style="color:#5b6673">— сплошная: очередь · пунктир: зависимость</span>
  </div>
</header>
<div class="wrap"><svg id="canvas"></svg></div>
<aside class="drawer" id="drawer">
  <button class="close" id="drawerClose">×</button>
  <div id="drawerBody"></div>
</aside>
<script>
const DATA = ${JSON.stringify(DATA)};
const NW = 210, NH = 44, VGAP = 16, COLGAP = 288, TOP = 44, LEFT = 34;
const svg = document.getElementById("canvas");
const SVGNS = "http://www.w3.org/2000/svg";

// раскладка: колонка на фазу, ноды стопкой
const phaseIndex = {}; DATA.phases.forEach((p, i) => phaseIndex[p.id] = i);
const perPhase = {}; DATA.phases.forEach((p) => perPhase[p.id] = []);
DATA.nodes.forEach((n) => perPhase[n.phase].push(n));
const pos = {};
DATA.phases.forEach((p, ci) => {
  perPhase[p.id].forEach((n, ri) => {
    pos[n.id] = { x: LEFT + ci * COLGAP, y: TOP + 34 + ri * (NH + VGAP) };
  });
});
const maxRows = Math.max(...DATA.phases.map((p) => perPhase[p.id].length));
const W = LEFT + DATA.phases.length * COLGAP;
const H = TOP + 34 + maxRows * (NH + VGAP) + 40;
svg.setAttribute("viewBox", "0 0 " + W + " " + H);
svg.setAttribute("width", W); svg.setAttribute("height", H);

function el(tag, attrs, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

// заголовки колонок
DATA.phases.forEach((p, ci) => {
  const x = LEFT + ci * COLGAP;
  const t = el("text", { x, y: TOP, class: "col-title" }, svg); t.textContent = p.title;
  const done = perPhase[p.id].filter((n) => n.status === "done").length;
  const c = el("text", { x, y: TOP + 16, class: "col-count" }, svg);
  c.textContent = done + "/" + perPhase[p.id].length + " закрыто";
});

// рёбра (за нодами)
const edgeEls = [];
DATA.edges.forEach((e) => {
  const a = pos[e.from], b = pos[e.to];
  if (!a || !b) return;
  const sameCol = DATA.nodes.find((n) => n.id === e.from).phase === DATA.nodes.find((n) => n.id === e.to).phase;
  let d;
  if (sameCol) {
    const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y;
    d = "M" + x1 + "," + y1 + " C" + x1 + "," + (y1 + 10) + " " + x2 + "," + (y2 - 10) + " " + x2 + "," + y2;
  } else {
    const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2;
    const mx = (x1 + x2) / 2;
    d = "M" + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2;
  }
  const isDep = !sameCol;
  const path = el("path", { d, class: "edge" + (isDep ? " dep" : "") }, svg);
  edgeEls.push({ el: path, from: e.from, to: e.to });
});

// ноды
const nodeEls = {};
DATA.nodes.forEach((n) => {
  const p = pos[n.id]; const meta = DATA.statusMeta[n.status];
  const g = el("g", { class: "node", "data-id": n.id }, svg);
  el("rect", { x: p.x, y: p.y, width: NW, height: NH, rx: 9,
    fill: n.status === "done" ? "rgba(63,182,139,.10)" : n.status === "next" ? "rgba(224,165,79,.12)" : "rgba(107,118,131,.07)",
    stroke: meta.color, "stroke-width": n.status === "next" ? 2 : 1.2 }, g);
  el("rect", { x: p.x, y: p.y, width: 4, height: NH, rx: 2, fill: meta.color }, g);
  const ic = el("text", { x: p.x + 16, y: p.y + NH / 2 + 5, fill: meta.color, "font-size": 13, "font-weight": 700 }, g);
  ic.textContent = meta.icon;
  const label = el("text", { x: p.x + 30, y: p.y + NH / 2 + 5, fill: "#e6edf3", "font-size": 12.5 }, g);
  const txt = n.label.length > 26 ? n.label.slice(0, 25) + "…" : n.label;
  label.textContent = txt;
  g.addEventListener("click", () => openDrawer(n.id));
  g.addEventListener("mouseenter", () => highlight(n.id));
  g.addEventListener("mouseleave", clearHighlight);
  nodeEls[n.id] = g;
});

function highlight(id) {
  edgeEls.forEach((e) => {
    if (e.from === id || e.to === id) e.el.classList.add("hot");
    else e.el.classList.add("dim");
  });
}
function clearHighlight() {
  edgeEls.forEach((e) => e.el.classList.remove("hot", "dim"));
}

// детальная панель
const drawer = document.getElementById("drawer");
const drawerBody = document.getElementById("drawerBody");
document.getElementById("drawerClose").onclick = () => drawer.classList.remove("open");
function openDrawer(id) {
  const n = DATA.nodes.find((x) => x.id === id); const meta = DATA.statusMeta[n.status];
  const deps = (n.deps || []).map((d) => { const dn = DATA.nodes.find((x) => x.id === d); return dn ? '<a data-goto="' + dn.id + '">' + dn.label + "</a>" : ""; }).join("");
  drawerBody.innerHTML =
    '<span class="badge" style="background:' + meta.color + '22;color:' + meta.color + '">' + meta.icon + " " + meta.label + "</span>" +
    "<h2>" + n.label + "</h2>" +
    "<p>" + (n.desc || "Описание появится по мере проработки.") + "</p>" +
    (deps ? '<div class="deps"><b>Строится поверх:</b>' + deps + "</div>" : "");
  drawer.classList.add("open");
  drawerBody.querySelectorAll("[data-goto]").forEach((a) => a.onclick = () => openDrawer(a.dataset.goto));
}

// фильтр
document.querySelectorAll(".controls button").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".controls button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    DATA.nodes.forEach((n) => {
      const show = f === "all" || (f === "done" && n.status === "done") || (f === "open" && n.status !== "done");
      nodeEls[n.id].classList.toggle("dim", !show);
    });
    edgeEls.forEach((e) => {
      const nf = DATA.nodes.find((n) => n.id === e.from), nt = DATA.nodes.find((n) => n.id === e.to);
      const vis = (id) => f === "all" || (f === "done" && id.status === "done") || (f === "open" && id.status !== "done");
      e.el.classList.toggle("dim", !(vis(nf) && vis(nt)));
    });
  };
});
</script>
</body>
</html>`;

writeFileSync("docs/roadmap.html", html);
console.log("Roadmap built: docs/roadmap.html — " + doneCount + "/" + total + " done (" + pct + "%)");

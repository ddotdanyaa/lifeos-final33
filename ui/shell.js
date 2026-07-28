import { renderAgentsFlows } from "./agents-flows.js";
import { renderAssistantHome } from "./home.js";
import { renderCalendar } from "./calendar.js";
import { renderChat } from "./chat.js";
import { renderControl } from "./control.js";
import { renderDayDigest } from "./digest.js";
import { renderFinance } from "./finance.js";
import { renderGraph } from "./graph.js";
import { renderHabitsGoals } from "./habits-goals.js";
import { renderLibrary } from "./library.js";
import { renderObject } from "./object.js";
import { renderPlayer } from "./player.js";
import { renderProviders } from "./providers.js";
import { renderReader } from "./reader.js";
import { renderToday } from "./today.js";
import {
  renderDatabases,
  renderDesignStudio,
  renderFeed,
  renderMarketplace,
  renderModelHub,
  renderProjects,
  renderScreenCompanion,
  renderSmartHome,
  renderSystems,
  renderTwin
} from "./v34-platform.js";
import { button, escapeHtml } from "./components/shared.js";

const primaryNav = [
  ["inbox", "Дом"],
  ["today", "Сегодня"],
  ["calendar", "Календарь"],
  ["finance", "Деньги"],
  ["feed", "Лента"],
  ["systems", "Системы"],
  ["library", "База"],
  ["graph", "Граф"],
  ["control", "Контроль"]
];

// Вторичное меню разделено по ЧЕСТНОСТИ, а не по алфавиту: сверху то, что работает и куда
// владелец ходит каждый день; ниже — черновики, у которых есть экран, но нет наполнения.
// Список черновиков не выдуман: он взят из docs/design/LIFEOS_DESIGN_CANON.md §9, где
// зафиксирован по итогам собственного UX-аудита владельца. Смешивать их с рабочими пунктами
// нельзя: именно это и создаёт ощущение, что «сайт перегружен мусором» — с виду одинаковые
// строки, а половина ведёт в пустую комнату.
const secondaryNav = [
  ["capture", "Входящие"],
  ["chat", "Чат"],
  ["reader", "Чтение"],
  ["player", "Аудио"],
  // «Цели» и «Привычки» рисовали ОДИН И ТОТ ЖЕ экран (проверено обходом: 1097 знаков и 6 кнопок
  // у обоих). Канон §9 велит объединить — два пункта в меню на один экран это не выбор, а шум.
  ["goals", "Цели и привычки"],
  ["agents", "Сценарии"],
  ["providers", "Подключения"]
];

// Экраны-каркасы: заголовок, описание и пара кнопок без работающего сценария за ними. Держим их
// доступными (они не сломаны, они не дописаны) и подписываем прямо — «в разработке».
const draftNav = [
  ["projects", "Проекты"],
  ["models", "Модели"],
  ["smart-home", "Умный дом"],
  ["marketplace", "Паки"],
  ["builder", "Конструктор"],
  ["design", "Дизайн"],
  ["databases", "Таблицы"],
  ["screen", "Экран"],
  ["twin", "Двойник"]
];

export const DRAFT_SURFACES = new Set(draftNav.map((row) => row[0]));

function navButton(ctx, row, testPrefix = "surface") {
  const [id, label] = row;
  const active = ctx.activeSurface === id || (id === "inbox" && ctx.activeSurface === "capture") ? " active" : "";
  return `<button class="nav-item${active}" data-action="set-surface" data-id="${escapeHtml(id)}" data-testid="${escapeHtml(testPrefix)}-${escapeHtml(id)}">${escapeHtml(label)}</button>`;
}

function renderNav(ctx) {
  return [
    `<aside class="lifeos-nav-v2">`,
    `<div class="nav-brand"><strong>LifeOS</strong><span>локально</span></div>`,
    // V3-DESIGN (канон design-system/Home.dc.html): поиск живёт в боковой панели с бейджем ⌘K.
    // Открывает уже существующую палитру команд — не новый механизм.
    `<button class="nav-search-v3" data-action="open-command-palette" data-testid="nav-search-v3">Поиск<span>⌘K</span></button>`,
    `<nav data-testid="home-workspace-rail">${primaryNav.map((row) => navButton(ctx, row)).join("")}</nav>`,
    // Раскрытие «Ещё» держится состоянием, а не браузером: родной <details> теряет открытость на
    // каждой перерисовке, а она случается после любого действия — меню закрывалось под рукой.
    `<details class="nav-more" data-testid="app-ribbon"${ctx.navMoreOpen ? " open" : ""}><summary data-action="toggle-nav-more">Ещё</summary><div>${secondaryNav.map((row) => navButton(ctx, row)).join("")}`
      + `<p class="nav-group-label" data-testid="nav-draft-label">🚧 В разработке</p>`
      + draftNav.map((row) => navButton(ctx, row)).join("")
      + `</div></details>`,
    button("open-command-palette", "Команды", { kind: "ghost", testId: "open-command-palette" }),
    // V3-DESIGN: блок владельца внизу панели — «всё локально» как постоянное напоминание границы (§7).
    `<div class="nav-owner-v3" data-testid="nav-owner-v3"><span class="nav-owner-dot"></span><div><strong>Данил</strong><em>всё локально</em></div></div>`,
    `</aside>`
  ].join("");
}

function renderMobileNav(ctx) {
  const items = [["inbox", "Дом"], ["feed", "Лента"], ["today", "Сегодня"], ["systems", "Системы"], ["capture", "Ввод"]];
  const remainingPrimary = primaryNav.filter(([id]) => !items.some(([itemId]) => itemId === id));
  const mobileMoreItems = remainingPrimary.concat(secondaryNav, draftNav);
  return [
    `<nav class="mobile-bottom-nav">${items.map((row) => navButton(ctx, row, "mobile-surface")).join("")}</nav>`,
    `<details class="mobile-more-nav" data-testid="mobile-more-nav"><summary>Ещё</summary><div>${mobileMoreItems.map((row) => navButton(ctx, row, "mobile-more")).join("")}</div></details>`
  ].join("");
}

// Поток (канон design-system/Universal Capture.dc.html): сырые объекты дня по времени суток.
// Каждая строка — вид слева, суть по центру, время справа. Разбор — существующим механизмом
// предложений (§7), поэтому кнопка ведёт к нему, а не имитирует новый пайплайн.
function renderDayStream(ctx) {
  const stream = ctx.dayStream || {};
  const groups = stream.groups || [];
  return [
    `<section class="day-stream" data-testid="inbox-review-board">`,
    `<p class="canon-eyebrow">Сегодняшний поток</p>`,
    `<h2 class="day-stream-headline" data-testid="day-stream-headline">${escapeHtml(stream.headline || "")}<span>${escapeHtml(stream.subline || "")}</span></h2>`,
    stream.summary ? `<p class="day-stream-summary" data-testid="day-stream-summary">${escapeHtml(stream.summary)}</p>` : "",
    stream.openProposals
      ? `<p class="day-stream-pending" data-testid="day-stream-pending">${stream.openProposals} ${stream.openProposals === 1 ? "предложение ждёт" : "предложений ждут"} твоего решения — они появляются на Доме после разбора.</p>`
      : "",
    groups.map((group) => [
      `<div class="stream-group" data-testid="stream-group">`,
      `<p class="canon-eyebrow stream-group-head">${escapeHtml(group.label)} <em>${group.items.length} ${group.items.length === 1 ? "объект" : "объекта"}</em></p>`,
      `<ul class="stream-list">`,
      group.items.map((item) => [
        `<li class="stream-row" data-testid="stream-row">`,
        `<span class="stream-kind">${escapeHtml(item.kind)}</span>`,
        `<span class="stream-body"><strong>${escapeHtml(item.title)}</strong>${item.meta ? `<em>${escapeHtml(item.meta)}</em>` : ""}</span>`,
        `<span class="stream-time">${escapeHtml(item.time)}</span>`,
        `</li>`
      ].join("")).join(""),
      `</ul>`,
      `</div>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

function renderSurface(ctx) {
  switch (ctx.activeSurface) {
    case "feed":
      return renderFeed(ctx);
    case "today":
      return renderToday(ctx);
    case "calendar":
      return renderCalendar(ctx);
    case "finance":
      return renderFinance(ctx);
    case "habits":
    case "goals":
      return renderHabitsGoals(ctx);
    case "library":
      return renderLibrary(ctx);
    case "reader":
    case "books":
      return renderReader(ctx);
    case "player":
    case "voice":
      return renderPlayer(ctx);
    case "chat":
      return renderChat(ctx);
    case "agents":
    case "flows":
      return renderAgentsFlows(ctx);
    case "systems":
      return renderSystems(ctx);
    case "builder":
      return renderSystems(ctx, "builder");
    case "projects":
      return renderProjects(ctx);
    case "models":
      return renderModelHub(ctx);
    case "smart-home":
      return renderSmartHome(ctx);
    case "marketplace":
      return renderMarketplace(ctx);
    case "design":
      return renderDesignStudio(ctx);
    case "databases":
      return renderDatabases(ctx);
    case "screen":
      return renderScreenCompanion(ctx);
    case "twin":
      return renderTwin(ctx);
    case "graph":
      return renderGraph(ctx);
    // Объект — не пункт меню, а место, куда «проваливается» карточка с любого экрана.
    case "object":
      return renderObject(ctx);
    case "control":
      return renderControl(ctx);
    case "providers":
      return renderProviders(ctx);
    case "capture":
      return `<section class="workspace-v2 capture-workspace" data-testid="workspace-capture">${renderAssistantHome(ctx)}${renderDayStream(ctx)}${renderDayDigest(ctx)}</section>`;
    case "inbox":
    default:
      return renderAssistantHome(ctx);
  }
}

export function renderNewShell(ctx) {
  return [
    `<div class="lifeos-shell-v2 surface-${escapeHtml(ctx.activeSurface || "inbox")}">`,
    `<input id="file-import" data-testid="file-import" type="file" multiple hidden>`,
    `<input id="audio-import" data-testid="audio-import" type="file" accept="audio/*" multiple hidden>`,
    `<input id="backup-import" data-testid="backup-import" type="file" accept="application/json,.json" hidden>`,
    `<input id="obsidian-vault-import" data-testid="obsidian-vault-import" type="file" webkitdirectory multiple hidden>`,
    `<header class="lifeos-public-header lifeos-header-v3">`,
    // V3-DESIGN (канон design-system/Home.dc.html): верх — линзы жизни над одной моделью, а не
    // рекламный заголовок. Переключение меняет ранжирование фокуса, данные те же (закон №1).
    `<div class="space-tabs-v3" data-testid="space-tabs">`,
    (ctx.lifeSpaces || []).map((space) => `<button class="space-tab-v3${space.active ? " active" : ""}" data-action="set-space" data-id="${escapeHtml(space.id)}" data-testid="space-tab-${escapeHtml(space.id)}">${escapeHtml(space.label)}</button>`).join(""),
    `<span class="space-tabs-note">одна модель данных · ${(ctx.lifeSpaces || []).length} представления</span>`,
    `</div>`,
    `<label class="global-search-v2"><span>Найти</span><input id="global-search" data-testid="global-search" value="${escapeHtml(ctx.searchQuery || "")}" autocomplete="off" aria-label="Поиск"></label>`,
    `<div class="header-actions-v2">`,
    `<button class="top-capture-v2" data-action="set-surface" data-id="capture" data-testid="top-capture">Ввод</button>`,
    `<button class="top-capture-v2 top-control-v2" data-action="set-surface" data-id="control" data-testid="top-control">Контроль</button>`,
    ctx.activeSurface && ctx.activeSurface !== "inbox" && ctx.activeSurface !== "library" ? `<button class="top-capture-v2 top-new-note-v2" data-action="new-note" data-testid="new-note">Заметка</button>` : "",
    `<button class="top-capture-v2 top-theme-toggle-v2" data-action="toggle-theme" data-testid="theme-toggle" data-raw-theme="${escapeHtml(ctx.theme || "system")}" title="Сменить тему">Тема: ${escapeHtml(ctx.theme === "dark" ? "тёмная" : ctx.theme === "light" ? "светлая" : "системная")}</button>`,
    `<span id="save-status" class="save-status-v2" role="status" aria-live="polite">сохранено</span>`,
    `<span class="build-version-v2" data-testid="build-version" title="Хеш сборки: если он не совпадает с последним коммитом, ты смотришь на закэшированную старую версию">${escapeHtml((typeof document !== "undefined" && document.querySelector('meta[name="build-version"]')?.content) || "dev")}</span>`,
    `</div>`,
    `</header>`,
    `<div class="lifeos-frame-v2">`,
    renderNav(ctx),
    `<main class="lifeos-main-v2">${renderSurface(ctx)}</main>`,
    `</div>`,
    renderMobileNav(ctx),
    ctx.commandPaletteHtml || "",
    `</div>`
  ].join("");
}

import { renderAgentsFlows } from "./agents-flows.js";
import { renderAssistantHome } from "./home.js";
import { renderCalendar } from "./calendar.js";
import { renderChat } from "./chat.js";
import { renderControl } from "./control.js";
import { renderFinance } from "./finance.js";
import { renderGraph } from "./graph.js";
import { renderHabitsGoals } from "./habits-goals.js";
import { renderLibrary } from "./library.js";
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

const secondaryNav = [
  ["capture", "Входящие"],
  ["projects", "Проекты"],
  ["chat", "Чат"],
  ["agents", "Сценарии"],
  ["models", "Модели"],
  ["smart-home", "Умный дом"],
  ["marketplace", "Паки"],
  ["builder", "Конструктор"],
  ["design", "Дизайн"],
  ["databases", "Таблицы"],
  ["screen", "Экран"],
  ["twin", "Двойник"],
  ["goals", "Цели"],
  ["habits", "Привычки"],
  ["reader", "Чтение"],
  ["player", "Аудио"],
  ["providers", "Подключения"]
];

function navButton(ctx, row, testPrefix = "surface") {
  const [id, label] = row;
  const active = ctx.activeSurface === id || (id === "inbox" && ctx.activeSurface === "capture") ? " active" : "";
  return `<button class="nav-item${active}" data-action="set-surface" data-id="${escapeHtml(id)}" data-testid="${escapeHtml(testPrefix)}-${escapeHtml(id)}">${escapeHtml(label)}</button>`;
}

function renderNav(ctx) {
  return [
    `<aside class="lifeos-nav-v2">`,
    `<div class="nav-brand"><strong>LifeOS</strong><span>локально</span></div>`,
    `<nav data-testid="home-workspace-rail">${primaryNav.map((row) => navButton(ctx, row)).join("")}</nav>`,
    `<details class="nav-more" data-testid="app-ribbon"><summary>Ещё</summary><div>${secondaryNav.map((row) => navButton(ctx, row)).join("")}</div></details>`,
    button("open-command-palette", "Команды", { kind: "ghost", testId: "open-command-palette" }),
    `</aside>`
  ].join("");
}

function renderMobileNav(ctx) {
  const items = [["inbox", "Дом"], ["feed", "Лента"], ["today", "Сегодня"], ["systems", "Системы"], ["capture", "Ввод"]];
  const remainingPrimary = primaryNav.filter(([id]) => !items.some(([itemId]) => itemId === id));
  const mobileMoreItems = remainingPrimary.concat(secondaryNav);
  return [
    `<nav class="mobile-bottom-nav">${items.map((row) => navButton(ctx, row, "mobile-surface")).join("")}</nav>`,
    `<details class="mobile-more-nav" data-testid="mobile-more-nav"><summary>Ещё</summary><div>${mobileMoreItems.map((row) => navButton(ctx, row, "mobile-more")).join("")}</div></details>`
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
    case "control":
      return renderControl(ctx);
    case "providers":
      return renderProviders(ctx);
    case "capture":
      return `<section class="workspace-v2 capture-workspace" data-testid="workspace-capture">${renderAssistantHome(ctx)}<div class="inbox-review-board" data-testid="inbox-review-board"><h2>Вечерний разбор</h2><p>Новые источники и голосовые заметки собираются здесь перед применением.</p></div></section>`;
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
    `<header class="lifeos-public-header">`,
    `<div><strong>LifeOS v34</strong><span>Локальная персональная ОС для жизни, данных, знаний и действий</span></div>`,
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

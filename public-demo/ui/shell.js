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
import { button, escapeHtml } from "./components/shared.js";

const primaryNav = [
  ["inbox", "Дом"],
  ["today", "Сегодня"],
  ["capture", "Входящие"],
  ["calendar", "Календарь"],
  ["finance", "Деньги"],
  ["library", "База"],
  ["chat", "Чат"],
  ["graph", "Граф"],
  ["control", "Контроль"]
];

const secondaryNav = [
  ["goals", "Цели"],
  ["habits", "Привычки"],
  ["reader", "Чтение"],
  ["player", "Аудио"],
  ["agents", "Сценарии"],
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
  const items = [["inbox", "Дом"], ["today", "Сегодня"], ["finance", "Деньги"], ["chat", "Чат"], ["capture", "Ввод"]];
  return [
    `<nav class="mobile-bottom-nav">${items.map((row) => navButton(ctx, row, "mobile-surface")).join("")}</nav>`,
    `<details class="mobile-more-nav" data-testid="mobile-more-nav"><summary>Ещё</summary><div>${secondaryNav.map((row) => navButton(ctx, row)).join("")}</div></details>`
  ].join("");
}

function renderSurface(ctx) {
  switch (ctx.activeSurface) {
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
    `<header class="lifeos-public-header">`,
    `<div><strong>LifeOS</strong><span>Локальная ОС для дня, знаний и контроля</span></div>`,
    `<label class="global-search-v2"><span>Найти</span><input id="global-search" data-testid="global-search" value="${escapeHtml(ctx.searchQuery || "")}" autocomplete="off" aria-label="Поиск"></label>`,
    `<button class="top-capture-v2" data-action="set-surface" data-id="capture" data-testid="top-capture">Ввод</button>`,
    `<span id="save-status" class="save-status-v2" role="status" aria-live="polite">сохранено</span>`,
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

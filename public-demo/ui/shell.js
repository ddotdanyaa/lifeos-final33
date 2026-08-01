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
import { searchOwnerData, countFound } from "../core/owner-search.mjs";
import { LIVENESS, LIVENESS_DATE } from "./liveness-map.js";

// Меню названо словами ВЛАДЕЛЬЦА, а не частями движка. «База», «Граф», «Контроль» — это имена
// подсистем: так думает разработчик, а не человек, который надиктовал мысль и хочет понять, что
// с ней стало. Он думает «мои записи», «с чем это связано», «что изменилось».
//
// Идентификаторы не тронуты: меняются подписи, а не маршруты. Экран тот же, имя человеческое.
const primaryNav = [
  ["inbox", "Дом"],
  ["today", "Сегодня"],
  ["calendar", "Календарь"],
  ["finance", "Деньги"],
  ["feed", "Лента"],
  ["systems", "Системы"],
  ["library", "Записи"],
  ["graph", "Связи"],
  ["control", "Что изменилось"]
];

// Экраны-каркасы: заголовок, описание и пара кнопок без работающего сценария за ними. Держим их
// доступными (они не сломаны, они не дописаны) и подписываем прямо — «в разработке».
// Список не выдуман: он взят из docs/design/LIFEOS_DESIGN_CANON.md §9, где зафиксирован по
// итогам UX-аудита владельца. Раскладку по кластерам см. ниже (navClusters, П32): каркас живёт
// в своей группе со своей подписью, а не отдельной кучей «в разработке».
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

// П32 · УПЛОТНЕНИЕ. Шестнадцать пунктов подряд — это не меню, а список: владелец каждый раз
// перечитывает его целиком, потому что глазу не за что зацепиться. Разбиваем на четыре
// кластера ПО ДЕЛУ, а не по алфавиту, и раскрытым держим максимум один: открылся новый —
// закрылся прежний. Девять главных пунктов не трогаем (audit-workspace-shape, CLAUDE.md §6).
//
// Каркасы («в разработке») не выносим отдельной кучей: каждый живёт в СВОЁМ кластере со своей
// подписью. Иначе владелец видит группу «в разработке» и не знает, чего в ней искать.
const navClusters = [
  {
    id: "capture",
    label: "Ввод и разбор",
    hint: "куда всё попадает",
    items: [["capture", "Входящие", true], ["player", "Аудио", true], ["reader", "Чтение", true], ["screen", "Экран", false]]
  },
  {
    id: "doing",
    label: "Дела",
    hint: "что делаю и к чему иду",
    items: [["goals", "Цели и привычки", true], ["projects", "Проекты", false]]
  },
  {
    id: "ai",
    label: "ИИ",
    hint: "кто помогает",
    items: [["chat", "Чат", true], ["agents", "Сценарии", true], ["providers", "Подключения", true], ["models", "Модели", false], ["twin", "Двойник", false]]
  },
  {
    id: "workshop",
    label: "Мастерская",
    hint: "чем настраиваю систему",
    items: [["marketplace", "Паки", false], ["builder", "Конструктор", false], ["databases", "Таблицы", false], ["design", "Дизайн", false], ["smart-home", "Умный дом", false]]
  }
];

function navButton(ctx, row, testPrefix = "surface") {
  const [id, label] = row;
  const active = ctx.activeSurface === id || (id === "inbox" && ctx.activeSurface === "capture") ? " active" : "";
  // Первая версия пометки жила только во вторичном меню — и это была ошибка ровно наоборот:
  // девять главных пунктов владелец открывает каждый день, и именно про «Деньги» и «Связи» он
  // говорил «нажимаешь — ничего не работает». Честность нужна прежде всего там, куда он ходит.
  return `<button class="nav-item${active}" data-action="set-surface" data-id="${escapeHtml(id)}" data-testid="${escapeHtml(testPrefix)}-${escapeHtml(id)}">${escapeHtml(label)}${livenessMark(id)}</button>`;
}

// Кластер раскрыт ровно один. Какой — либо тот, что владелец открыл сам, либо тот, в котором
// лежит текущий экран: провалился в «Аудио» — открыт «Ввод и разбор», и видно, где ты.
// Одна строка меню. Каркас признаётся прямо в ней, а не ссылается в отдельную группу: владелец
// видит, куда идёт, не отходя от того, что искал.
// Пометка «в разработке» ставилась РУКОЙ — флагом `isReady` в списке разделов. Рука устаревает
// молча: экран чинится, флаг остаётся, или наоборот — экран ломается, а флаг всё ещё обещает.
// Владелец 2026-07-30: «нажимаешь — ничего не работает, никуда не проваливаешься». Беда не в том,
// что часть кнопок мертва, а в том, что это не видно ЗАРАНЕЕ: один мёртвый экран отравляет доверие
// ко всем двадцати шести.
//
// Теперь рядом с рукой стоит ИЗМЕРЕНИЕ: `tools/audit-liveness.mjs` открывает каждый экран, жмёт
// каждый контрол и считает, после скольких из них ничего не изменилось. Число попадает сюда через
// сгенерированный `ui/liveness-map.js`. Рука может ошибиться, прогон — нет.
function livenessMark(id) {
  const row = LIVENESS[id];
  if (!row || !row.dead) return "";
  return `<span class="nav-item-draft" title="Перепись ${LIVENESS_DATE}: из ${row.checked} кнопок этого экрана ${row.dead} не делают ничего">${row.dead} не работает</span>`;
}

function navItem(ctx, [id, label, isReady], testPrefix) {
  const active = ctx.activeSurface === id ? " active" : "";
  const measured = livenessMark(id);
  // Рука важнее числа ровно в одну сторону: если раздел объявлен каркасом, он каркас, даже если
  // его немногочисленные кнопки живые. Обратное неверно — измерение не заглушается флагом.
  const draftMark = isReady ? measured : `<span class="nav-item-draft">в разработке</span>`;
  return `<button class="nav-item${active}${isReady && !measured ? "" : " draft"}" data-action="set-surface" data-id="${escapeHtml(id)}" data-testid="${escapeHtml(testPrefix || "surface")}-${escapeHtml(id)}">${escapeHtml(label)}${draftMark}</button>`;
}

// П34 · СВОРАЧИВАНИЕ ПО ДАННЫМ. Какой кластер раскрыть по умолчанию — вопрос вкуса ровно до тех
// пор, пока нет данных. Они есть: У0 считает, сколько раз владелец открывал каждый раздел
// (`surfaceUsage`). Раскрываем тот, куда он ходит, а не тот, который кто-то счёл главным.
//
// Порог намеренно низкий, но не нулевой: один случайный заход не должен переставлять меню под
// рукой. Данных не хватило — остаётся прежний порядок, а не выдуманное предпочтение.
const USAGE_MIN_OPENS = 3;

function mostUsedClusterId(ctx) {
  const usage = ctx.surfaceUsage || {};
  let best = null;
  for (const cluster of navClusters) {
    const opens = cluster.items
      .filter((row) => row[2])
      .reduce((sum, row) => sum + Number((usage[row[0]] || {}).opens || 0), 0);
    if (opens < USAGE_MIN_OPENS) continue;
    if (!best || opens > best.opens) best = { id: cluster.id, opens };
  }
  return best ? best.id : "";
}

// Кластер раскрыт ровно один. Порядок решения: что владелец открыл руками → где лежит текущий
// экран → куда он ходит чаще всего по данным. Вкуса в этой цепочке нет нигде.
function activeClusterId(ctx) {
  const chosen = ctx.navClusterOpen || "";
  if (chosen && navClusters.some((cluster) => cluster.id === chosen)) return chosen;
  const holder = navClusters.find((cluster) => cluster.items.some(([id]) => id === ctx.activeSurface));
  if (holder) return holder.id;
  return mostUsedClusterId(ctx);
}

// Префикс обязателен: боковое и мобильное меню рисуют ОДНИ И ТЕ ЖЕ группы, и без него на
// странице оказывается по два элемента с одним data-testid — спека перестаёт понимать, о каком
// из них речь, и падает не по делу.
// `alwaysShowDrafts` — для мобильного листа «Ещё». Он и так открывается намеренно и
// прокручивается целиком: прятать там каркасы не за что, а прятали — и до них переставало
// хватать одного касания.
// Боль владельца 2026-07-30: «поиск сверху „найти“ — зачем он? Написал „граф“ — ничего не находит.
// „30“ напишу — тоже не находит». Диагноз оказался хуже жалобы: `searchQuery` писался в состояние
// и рисовался обратно в поле, и больше его не читал НИКТО. Строка «Найти» была украшением.
//
// Теперь она отвечает: под шапкой появляется ответ, сгруппированный разделами владельца, и каждая
// строка открывает найденное. Действие `open-object` уже существует, второго пути не заводим.
// Поиск делает вендоренный Fuse.js (Apache-2.0) — см. `core/owner-search.mjs`.
function renderSearchResults(ctx) {
  const query = String(ctx.searchQuery || "").trim();
  if (query.length < 2) return "";
  const groups = searchOwnerData(query, ctx);
  if (!groups.length) {
    // Пункт 6 чек-листа результатов поиска (checklist.design): «пустая выдача без пути назад —
    // тупик, всегда давай выход». Первая версия этого блока говорила только «ничего не нашлось» —
    // то есть была ровно тем тупиком. Теперь выход есть: сбросить запрос или отдать его в разбор
    // как новую мысль. Второе важнее: чаще всего владелец ищет то, чего он ещё не записывал.
    return [
      `<div class="capture-attachments" data-testid="search-results-empty">`,
      `<span class="capture-attachments-title">По запросу «${escapeHtml(query)}» ничего не нашлось${query.length > 12 ? " — попробуй короче, одним словом" : ""}</span>`,
      // Кнопка ровно одна, и это осознанно. Первая версия правки добавляла ещё «Сбросить поиск»
      // с действием `clear-search` — обработчика такого действия в продукте НЕТ (проверено
      // поиском по `app.js`), и кнопка была бы мёртвой. Мёртвая кнопка в починке мёртвых кнопок —
      // это худшее, что можно сделать. Выход даётся один, но настоящий: уйти на экран захвата и
      // записать то, что искал, — чаще всего владелец ищет то, чего ещё не записывал.
      button("set-surface", "Записать это как мысль", { id: "capture", kind: "primary", testId: "search-to-capture" }),
      `</div>`
    ].join("");
  }
  return [
    `<div class="capture-attachments" data-testid="search-results">`,
    `<span class="capture-attachments-title">Нашлось ${countFound(groups)} по запросу «${escapeHtml(query)}»</span>`,
    groups.map((group) => group.rows.map((row) => [
      `<button class="capture-attachment" data-action="open-object" data-id="${escapeHtml(row.id)}" data-testid="search-result">`,
      `<strong>${escapeHtml(row.title)}</strong>`,
      // Сценарий 6: дата и причина рядом с находкой. Владелец узнаёт свою запись по времени, а
      // доверяет ответу — по объяснению, почему она вообще сюда попала. Без даты «Мысль про
      // граф» неотличима от такой же мысли месячной давности; без причины поиск остаётся
      // чёрным ящиком, который иногда угадывает.
      `<span>${escapeHtml(group.label)}${row.when ? " · " + escapeHtml(row.when) : ""}${row.why ? " · нашёл " + escapeHtml(row.why) : ""}</span>`,
      `</button>`
    ].join("")).join("")).join(""),
    `</div>`
  ].join("");
}

function renderNavClusters(ctx, testPrefix = "", alwaysShowDrafts = false) {
  const openId = activeClusterId(ctx);
  const mark = testPrefix ? testPrefix + "-" : "";
  return navClusters.map((cluster) => {
    const open = cluster.id === openId;
    const workingCount = cluster.items.filter((row) => row[2]).length;
    const drafts = cluster.items.filter((row) => !row[2]);
    return [
      `<div class="nav-cluster${open ? " open" : ""}" data-testid="${escapeHtml(mark)}nav-cluster-${escapeHtml(cluster.id)}">`,
      `<button class="nav-cluster-head" data-action="toggle-nav-cluster" data-id="${escapeHtml(cluster.id)}" data-testid="${escapeHtml(mark)}nav-cluster-head-${escapeHtml(cluster.id)}">`,
      `<span>${escapeHtml(cluster.label)}</span>`,
      // Счётчик показывает РАБОЧИЕ разделы: свёрнутый кластер не должен прятать факт, что за
      // ним что-то есть, и не должен обещать больше, чем в нём работает. Ноль рабочих — это не
      // «ноль», это «вся группа ещё строится», и сказать так честнее.
      workingCount ? `<em>${workingCount}</em>` : `<em class="nav-cluster-draft">в разработке</em>`,
      `</button>`,
      `<div class="nav-cluster-body">`,
      `<p class="nav-cluster-hint">${escapeHtml(cluster.hint)}</p>`,
      // Рабочие разделы видны СРАЗУ. Прятать их за раскрытие нельзя: до раздела, который
      // работает, должен быть один клик, а не два, — иначе уплотнение меню оплачено тем, что
      // до всего стало дальше.
      cluster.items.filter((row) => row[2]).map((row) => navItem(ctx, row, testPrefix)).join(""),
      // А каркасы прячутся за одну строку с честным числом. Они не исчезли и не соврали о себе:
      // «+5 в разработке» — это ровно то, что за ней лежит.
      drafts.length
        ? ((open || alwaysShowDrafts)
          ? `<div class="nav-cluster-drafts">${drafts.map((row) => navItem(ctx, row, testPrefix)).join("")}</div>`
          : `<button class="nav-cluster-drafts-toggle" data-action="toggle-nav-cluster" data-id="${escapeHtml(cluster.id)}" data-testid="${escapeHtml(mark)}nav-cluster-drafts-${escapeHtml(cluster.id)}">+${drafts.length} в разработке</button>`)
        : "",
      `</div>`,
      `</div>`
    ].join("");
  }).join("");
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
    `<details class="nav-more" data-testid="app-ribbon"${ctx.navMoreOpen ? " open" : ""}><summary data-action="toggle-nav-more">Ещё</summary><div>`
      + renderNavClusters(ctx)
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
  // П32: на телефоне «Ещё» показывало ПОЛНЫЙ плоский список третий раз подряд — после нижней
  // панели и после боковой. Теперь та же структура, что и на большом экране: оставшиеся главные
  // пункты, затем кластеры. Один список, одна логика, никакого третьего перечисления.
  return [
    `<nav class="mobile-bottom-nav">${items.map((row) => navButton(ctx, row, "mobile-surface")).join("")}</nav>`,
    `<details class="mobile-more-nav" data-testid="mobile-more-nav"><summary>Ещё</summary><div>`
      + remainingPrimary.map((row) => navButton(ctx, row, "mobile-more")).join("")
      + renderNavClusters(ctx, "mobile-more", true)
      + `</div></details>`
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
    // `data-active-surface` читает перепись живого (`tools/audit-liveness.mjs`), чтобы понять,
    // увёл ли клик на другой экран. Атрибута НЕ СУЩЕСТВОВАЛО нигде в коде — прибор всегда получал
    // пустую строку, поэтому не замечал переходов и после навигационного клика не возвращался
    // назад, молча пропуская остаток экрана. Найдено агентом при разборе «нажал — не провалился»:
    // из-за этого шесть экранов дали 13 контролов вместо тридцати с лишним.
    //
    // Имя экрана и так закодировано в классе `surface-…`, но разбирать класс — значит завязывать
    // измерение на оформление. Отдельный атрибут делает намерение явным и переживает смену CSS.
    `<div class="lifeos-shell-v2 surface-${escapeHtml(ctx.activeSurface || "inbox")}" data-active-surface="${escapeHtml(ctx.activeSurface || "inbox")}">`,
    // О-1: вторая вкладка. Полоса стоит над всем и не убирается: пока она видна, ничего из
    // набранного здесь не сохраняется. Раньше защиты не было вовсе — вкладки затирали друг друга
    // молча, и «успешная» запись означала потерянный день. Молчать об этом дороже, чем мешать.
    ctx.tabReadOnly
      ? `<div class="tab-readonly-banner" role="alert" data-testid="tab-readonly-banner">LifeOS уже открыт в другой вкладке — записываю только там. Здесь можно смотреть и искать, но набранное не сохранится. Закрой ту вкладку или продолжай в ней.</div>`
      : "",
    `<input id="file-import" data-testid="file-import" type="file" multiple hidden>`,
    `<input id="audio-import" data-testid="audio-import" type="file" accept="audio/*" multiple hidden>`,
    `<input id="backup-import" data-testid="backup-import" type="file" accept="application/json,.json" hidden>`,
    `<input id="obsidian-vault-import" data-testid="obsidian-vault-import" type="file" webkitdirectory multiple hidden>`,
    `<header class="lifeos-public-header lifeos-header-v3">`,
    // V3-DESIGN (канон design-system/Home.dc.html): верх — линзы жизни над одной моделью, а не
    // рекламный заголовок. Переключение меняет ранжирование фокуса, данные те же (закон №1).
    `<div class="space-tabs-v3" data-testid="space-tabs">`,
    (ctx.lifeSpaces || []).map((space) => `<button class="space-tab-v3${space.active ? " active" : ""}" data-action="set-space" data-id="${escapeHtml(space.id)}" data-testid="space-tab-${escapeHtml(space.id)}">${escapeHtml(space.label)}</button>`).join(""),
    // «одна модель данных · 4 представления» — фраза о том, как устроен движок. Владельцу она
    // ничего не говорит, а место в самой заметной строке экрана занимала и обрезалась на
    // полуслове. Убрана: линзы и так подписаны словами, за которые он их нажимает.
    `</div>`,
    `<label class="global-search-v2"><span>Найти</span><input id="global-search" data-testid="global-search" value="${escapeHtml(ctx.searchQuery || "")}" autocomplete="off" aria-label="Поиск"></label>`,
    `<div class="header-actions-v2">`,
    // Здесь стояли «Ввод» и «Что изменилось» — оба ДУБЛИРОВАЛИ навигацию, а не дополняли её.
    // «Что изменилось» — дословно девятый пункт главного меню, тем же словом; «Ввод» — экран
    // `capture`, до которого ведут и кластер «Ввод и разбор», и нижняя панель телефона. Две
    // одинаковые кнопки в двух местах экрана — это не быстрый доступ, а вопрос «а эти две
    // разные?». Убраны вместе с переводом четырёх спек на настоящую навигацию.
    //
    // Проверено, что сценарий не пострадал (§3: ухудшать путь ради чистоты запрещено):
    // на большом экране `surface-control` виден в рейле всегда, на телефоне — `mobile-more-control`
    // в «Ещё», а `capture` на телефоне лежит прямо в нижней панели.
    ctx.activeSurface && ctx.activeSurface !== "inbox" && ctx.activeSurface !== "library" ? `<button class="top-capture-v2 top-new-note-v2" data-action="new-note" data-testid="new-note">Заметка</button>` : "",
    `<button class="top-capture-v2 top-theme-toggle-v2" data-action="toggle-theme" data-testid="theme-toggle" data-raw-theme="${escapeHtml(ctx.theme || "system")}" title="Сменить тему">Тема: ${escapeHtml(ctx.theme === "dark" ? "тёмная" : ctx.theme === "light" ? "светлая" : "системная")}</button>`,
    `<span id="save-status" class="save-status-v2" role="status" aria-live="polite" data-testid="build-version" title="Сборка: ${escapeHtml((typeof document !== "undefined" && document.querySelector('meta[name="build-version"]')?.content) || "dev")}">сохранено</span>`,
    // Хеш сборки нужен ровно в одном случае — когда владелец подозревает старый кэш. Это
    // отладка, а не постоянная часть экрана: живёт в подсказке к статусу сохранения.
    ``,
    `</div>`,
    `</header>`,
    renderSearchResults(ctx),
    `<div class="lifeos-frame-v2">`,
    renderNav(ctx),
    `<main class="lifeos-main-v2">${renderSurface(ctx)}</main>`,
    `</div>`,
    renderMobileNav(ctx),
    ctx.commandPaletteHtml || "",
    `</div>`
  ].join("");
}

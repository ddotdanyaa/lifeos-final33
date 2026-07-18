import {
  ARTIFACT_SCHEMA_VERSION,
  RENDERER_MODES,
  applyObjectContractToState,
  buildArchitectureSnapshot,
  normalizeSystemEntity,
  normalizeSystemField,
  normalizeSystemTrigger,
  normalizeViewPreset,
  recordArchitectureEvent,
  validateArchitectureState,
  validateSystemRecordFields
} from "./artifact-os-architecture.mjs";
import { renderNewShell } from "./ui/shell.js";

const DB_NAME = "lifeos-v33-local-knowledge-base";
const DB_VERSION = 5;
const STORE_NAME = "kv";
const META_KEY = "state:meta";
const CHUNK_PREFIX = "state:chunk:";
const FALLBACK_PREFIX = "lifeos.v33.knowledge.";
const CHUNK_SIZE = 120000;
const AUTO_SAVE_MS = 1500;
const SOURCE_NOTE_TEXT_LIMIT = 60000;
const INLINE_MEDIA_LIMIT = 8 * 1024 * 1024;
const UI_REVISION = "lifeos-v34-chat-hardfix-v4";
const PRODUCT_BRAIN_VERSION = "2026-07-09-v34-platform-primitives";
const PRODUCT_BRAIN_FOLDER_ID = "folder-product-brain";
const PRODUCT_BRAIN_ROOT_ID = "note-product-brain-root";
const WIKI_LINK_PATTERN = /\[\[(.*?)\]\]/g;
const PROPOSAL_GROUPS = [
  ["knowledge", "Смысл / Knowledge"],
  ["actions", "Действия"],
  ["calendar", "Календарь / Время"],
  ["money", "Деньги"],
  ["habits", "Привычки / Рутины"],
  ["goals", "Цели / Проекты"],
  ["media", "Файлы / Медиа"],
  ["automation", "Чат / Агент / Flow"],
  ["control", "Граф / Контроль"]
];

const PRODUCT_BRAIN_NODE_SPECS = [
  {
    id: PRODUCT_BRAIN_ROOT_ID,
    key: "root",
    title: "LifeOS Product Brain",
    status: "NEXT",
    kind: "central",
    body: [
      "# LifeOS Product Brain",
      "",
      "Центральная рабочая память разработки LifeOS. Это реальный артефакт в Library, Graph, Control и Chat.",
      "",
      "Связанные узлы: [[Product Vision]], [[Artifact OS Contract]], [[Current Build State]], [[Owner Complaints]], [[UX Debt]], [[Bug Ledger]], [[Journey Map]], [[Feature Completeness Map]], [[Research Map]], [[Design System Map]], [[GitHub Release Map]], [[Provider Gates Map]], [[Performance Large Vault]], [[Recovery Migration]], [[Graph Quality]], [[Chat First Home]].",
      "",
      "Текущий package: P_EXTERNAL_PROVIDER_SETUP.",
      "Следующий package: P_OWNER_PROVIDER_CONNECTIONS_EXTERNAL, потому что паспорта провайдеров, пути настройки, локальные замены и gated e2e уже реализованы; реальные подключения требуют данных владельца, разрешений или локальных движков.",
      "Контракт: source -> Artifact -> projections -> repository -> graph/backlinks -> receipt/audit -> Data Control -> owner-visible result -> proof."
    ].join("\n")
  },
  {
    id: "note-product-brain-vision",
    key: "vision",
    title: "Product Vision",
    status: "DONE",
    kind: "vision",
    body: "# Product Vision\n\nLifeOS v34 строится как локальная персональная OS: life feed, capture, second brain, планирование, деньги, системы, проекты, local AI/model routes, agents/flows, graph, marketplace, databases, screen permission gates, smart home gates, recovery twin и Data Control.\n\nСм. [[Artifact OS Contract]], [[Feature Completeness Map]], [[Journey Map]]."
  },
  {
    id: "note-product-brain-contract",
    key: "contract",
    title: "Artifact OS Contract",
    status: "DONE",
    kind: "contract",
    body: "# Artifact OS Contract\n\nКаждая серьезная функция обязана пройти цепочку: input/source -> Artifact -> projections -> repository persistence -> graph/backlinks -> receipt/audit -> Data Control -> owner-visible workspace result -> smoke/e2e/visual proof.\n\nЗапрещено: labels only, static cards, fake graph nodes, fake provider success, disconnected route stores, silent mutation, screenshots-only proof.\n\nЭтот контракт превращает [[Owner Complaints]] в [[UX Debt]], а [[Bug Ledger]] в regression proof."
  },
  {
    id: "note-product-brain-current-build",
    key: "current-build",
    title: "Current Build State",
    status: "DONE",
    kind: "state",
    body: "# Current Build State\n\nЛокально работает: Home capture, Life Feed, proposals/apply, Today, Calendar, Finance, Habits/Goals/Wheel, Library, Reader gates, Player transcript, Chat notes, Agents/Flows dry-runs, Systems, Builder, Projects, Model Hub, Smart Home manual map, Marketplace local packs, Design Studio, Databases, Screen Companion permission gate, Personal Twin snapshots, Graph, Control, Providers, recovery, PWA passport and architecture audits.\n\nv34-примитивы добавлены в shared state: channels, systemDefinitions, projects, modelProfiles, smartHomeDevices, marketplacePacks, designProfiles, customDatabases, screenCompanionSessions and personalTwinSnapshots.\n\nПаспорта провайдеров покрывают Ollama, Model Hub, почту, локальный/внешний календарь, OCR, STT, PDF, EPUB, уведомления, PWA, потоки, плеер, Screen Companion, Smart Home и Marketplace: статус, настройка, локальная замена, граница данных и история запусков видны владельцу.\n\nGated честно: реальные подключения Ollama/Gmail/внешнего календаря/OCR/STT/PDF/EPUB/уведомлений/экрана/умного дома требуют данных владельца, разрешений, локального hub или локальных движков.\n\nСм. [[GitHub Release Map]], [[Provider Gates Map]], [[Journey Map]]."
  },
  {
    id: "note-product-brain-owner-complaints",
    key: "owner-complaints",
    title: "Owner Complaints",
    status: "DONE",
    kind: "complaints",
    body: "# Owner Complaints\n\n- непонятный первый экран;\n- cockpit и слишком много панелей;\n- одинаковые страницы;\n- чат не чувствуется главным рабочим двигателем;\n- graph недостаточно Obsidian-like;\n- agents/flows недостаточно n8n-like;\n- финансы, привычки и цели выглядели формами, не dashboard;\n- календарь был dense;\n- GitHub не видел изменения;\n- today at 23:00 парсился неверно;\n- система делала пример, а не общий движок.\n\nЭти жалобы связаны с [[UX Debt]] и [[Bug Ledger]]."
  },
  {
    id: "note-product-brain-ux-debt",
    key: "ux-debt",
    title: "UX Debt",
    status: "DONE",
    kind: "ux",
    body: "# UX Debt\n\nЗакрытые локальные UX-долги: Home остается capture-first и не возвращается в cockpit; Graph показывает Product Brain filter и edge reasons; Chat отвечает по Product Brain без Ollama; Control показывает состояние разработки; release state честно показывает lite snapshot и omitted evidence manifest; workspace scorecard поднят до 9+ после P_WORKSPACE_9PLUS_VISUAL_POLISH.\n\nДоказательство закрытия: [[Journey Map]], product-brain screenshots, audit:product-brain, audit:no-cockpit-first-screen, audit:human-ux-final."
  },
  {
    id: "note-product-brain-bug-ledger",
    key: "bug-ledger",
    title: "Bug Ledger",
    status: "DONE",
    kind: "bugs",
    body: "# Bug Ledger\n\nКлассы багов: parser bugs, storage bugs, duplicate proposals, dead buttons, layout overlap, right rail clutter, stale tests, GitHub no remote, auth not logged in, slow GitHub push HTTP 408, oversized release evidence upload.\n\nRegression proof: [[Journey Map]], [[GitHub Release Map]], audit:buttons, audit:no-hardcoded-sample, audit:product-brain."
  },
  {
    id: "note-product-brain-journeys",
    key: "journeys",
    title: "Journey Map",
    status: "DONE",
    kind: "journeys",
    body: "# Journey Map\n\nJ01-J24 повторно пройдены после Product Brain self-check: clean first open, fast task, mixed capture, messy capture, finance, receipt, dashboard, habits, goals/wheel, knowledge, library, reader, player, voice review, Ollama gate, chat offline, agents, flows, graph, control, providers, mobile, large vault, recovery.\n\nEvidence: public-demo-evidence/final, public-demo-evidence/journeys, journey reports, public-demo-evidence/product-brain-graph.png, product-brain-control.png, product-brain-chat.png, product-brain-library.png.\n\nСвязано с [[Feature Completeness Map]], [[Graph Quality]], [[Recovery Migration]]."
  },
  {
    id: "note-product-brain-features",
    key: "features",
    title: "Feature Completeness Map",
    status: "DONE",
    kind: "features",
    body: "# Feature Completeness Map\n\nWorkspaces: Home, Feed, Capture, Today, Calendar, Finance, Habits, Goals, Library, Reader, Player, Chat, Agents, Flow, Systems, Builder, Projects, Models, Smart Home, Marketplace, Design, Databases, Screen, Twin, Graph, Control, Providers, Product Brain.\n\nГотовность требует отдельный job, distinct layout, shared artifact repository, graph/control evidence, reload persistence, screenshot, UX score >= 9 и no dead buttons.\n\nv34-добавления должны быть рабочими поверхностями: формы создают объекты, кнопки пишут audit/provider evidence, объекты видны в graph/control/export.\n\nСм. [[Design System Map]], [[Journey Map]], [[Control]]."
  },
  {
    id: "note-product-brain-research",
    key: "research",
    title: "Research Map",
    status: "DONE",
    kind: "research",
    body: "# Research Map\n\nИсточники: Obsidian graph/backlinks/local graph, Notion pages/databases/relations, task capture apps/Things capture, Calendar planning, Readwise Reader highlights, n8n executions, Linear workflow, YNAB envelopes, habit trackers, Ollama API, MDN File API, IndexedDB, Service Worker/Notifications, NN/g progressive disclosure and usability heuristics.\n\nResearch source -> design rule связан с [[Design System Map]]."
  },
  {
    id: "note-product-brain-design",
    key: "design",
    title: "Design System Map",
    status: "DONE",
    kind: "design",
    body: "# Design System Map\n\nПравила: semantic color by object type, strong hierarchy, максимум 4 зоны Home, inspector только для контекста, readable controls, Russian-first action labels, mobile capture-first, no cockpit.\n\nЗакрывает часть [[Owner Complaints]] и [[UX Debt]]."
  },
  {
    id: "note-product-brain-github",
    key: "github",
    title: "GitHub Release Map",
    status: "DONE",
    kind: "release",
    body: "# GitHub Release Map\n\nAccount: ddotdanyaa.\nRepo: https://github.com/ddotdanyaa/lifeos-final33.\nBranch: owner-usable-nonstop-rescue.\nAuth: logged in through GitHub CLI.\nRemote: origin configured.\nPush: lite Git snapshot published and verified by git ls-remote. Full-history push stayed impractical because local pack history is 1.51 GiB; oversized evidence files are listed in release manifest on the remote branch.\n\nNext exact action: keep provider setup honest and optionally publish a separate evidence archive if the owner wants the full screenshot wall outside Git.\n\nСвязано с [[Bug Ledger]]."
  },
  {
    id: "note-product-brain-providers",
    key: "providers",
    title: "Provider Gates Map",
    status: "GATED",
    kind: "providers",
    body: "# Provider Gates Map\n\nOllama: явная localhost-проверка; офлайн-состояние честное; результат становится только proposal.\nGmail/внешний календарь: нужны данные владельца; вставка письма и локальный календарь работают сейчас.\nOCR: источник-чек и ручное извлечение работают; движок gated.\nSTT: ручной transcript работает; движок gated.\nPDF/EPUB: источник сохраняется; TXT/MD разбираются сейчас; для неподдержанных форматов есть честный parser gate.\nNotifications/PWA: показаны разрешение и возможности браузера.\n\nКаждый provider passport показывает статус, настройку, локальную замену, границу данных, доступы, отключение/проверку/подготовку и историю запусков. Fake ready запрещен.\n\nProvider gate -> setup action виден в Control/Providers."
  },
  {
    id: "note-product-brain-performance",
    key: "performance",
    title: "Performance Large Vault",
    status: "DONE",
    kind: "performance",
    body: "# Performance Large Vault\n\nLarge vault seed and graph degradation exist. Canvas limits nodes/links while search/filter/inspector remain available.\n\nEvidence connects to [[Journey Map]] J23 and [[Graph Quality]]."
  },
  {
    id: "note-product-brain-recovery",
    key: "recovery",
    title: "Recovery Migration",
    status: "DONE",
    kind: "recovery",
    body: "# Recovery Migration\n\nSchema normalization, corrupt record isolation, backup preview, export selected/all, archive/recover and rollback snapshots are represented in Data Control.\n\nEvidence connects to [[Journey Map]] J20/J24 and [[Control]]."
  },
  {
    id: "note-product-brain-graph-quality",
    key: "graph-quality",
    title: "Graph Quality",
    status: "DONE",
    kind: "graph",
    body: "# Graph Quality\n\nGraph must be Obsidian-like enough: global/local, zoom/pan, filters, clickable nodes, inspector, edge reasons, search, open linked workspace.\n\nProduct Brain adds a dedicated graph filter and edge reasons.\n\nEvidence: [[Journey Map]] J19 and public-demo-evidence/product-brain-graph.png."
  },
  {
    id: "note-product-brain-chat-home",
    key: "chat-home",
    title: "Chat First Home",
    status: "DONE",
    kind: "chat",
    body: "# Chat First Home\n\nHome remains capture-first. Chat is artifact-bound and answers Product Brain questions without Ollama.\n\nSupported questions: что осталось доделать, почему не готово, следующий пакет, UX-долги, календарь evidence.\n\nRelated: [[LifeOS Product Brain]], [[Current Build State]], [[UX Debt]], [[GitHub Release Map]]."
  }
];
const PRODUCT_BRAIN_LINK_SPECS = [
  ["root", "vision", "product-brain-root-vision"],
  ["root", "contract", "product-brain-root-contract"],
  ["root", "current-build", "product-brain-root-state"],
  ["root", "owner-complaints", "product-brain-root-complaints"],
  ["owner-complaints", "ux-debt", "product-brain-complaint-ux-debt"],
  ["ux-debt", "features", "product-brain-ux-debt-feature-map"],
  ["bug-ledger", "journeys", "product-brain-bug-regression-test"],
  ["journeys", "features", "product-brain-journey-evidence"],
  ["research", "design", "product-brain-research-design-rule"],
  ["providers", "features", "product-brain-provider-setup-action"],
  ["github", "bug-ledger", "product-brain-release-bug"],
  ["graph-quality", "journeys", "product-brain-graph-evidence"],
  ["chat-home", "current-build", "product-brain-chat-state"],
  ["recovery", "journeys", "product-brain-recovery-evidence"],
  ["performance", "graph-quality", "product-brain-performance-graph"]
];

const app = document.querySelector("#app");
let repository = null;
let store = null;
let graphEngine = null;
let bootError = null;
let deferredInstallPrompt = null;

function now() {
  return new Date().toISOString();
}

function todayKey() {
  return now().slice(0, 10);
}

function dateKeyFromOffset(offsetDays) {
  const date = new Date(todayKey() + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function normalizeTime(value) {
  const match = String(value || "").trim().match(/^([01]?\d|2[0-3]):?([0-5]\d)$/);
  if (!match) return "";
  return match[1].padStart(2, "0") + ":" + match[2];
}

function addMinutesToTime(value, minutes) {
  const clean = normalizeTime(value);
  if (!clean) return "";
  const parts = clean.split(":").map(Number);
  const total = parts[0] * 60 + parts[1] + minutes;
  const dayMinutes = ((total % 1440) + 1440) % 1440;
  return String(Math.floor(dayMinutes / 60)).padStart(2, "0") + ":" + String(dayMinutes % 60).padStart(2, "0");
}

function timeToMinutes(value) {
  const clean = normalizeTime(value);
  if (!clean) return 24 * 60 + 1;
  const parts = clean.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

function normalizeRuText(value) {
  return repairMojibake(String(value || "")).toLocaleLowerCase("ru-RU");
}

function hasRuWordSafe(text, word) {
  return new RegExp("(^|[^0-9a-zа-яё])" + word + "(?=$|[^0-9a-zа-яё])", "iu").test(text);
}

function parseDateFromTextHumanSafe(text) {
  const lower = normalizeRuText(text);
  if (hasRuWord(lower, "послезавтра")) return dateKeyFromOffset(2);
  if (hasRuWord(lower, "завтра")) return dateKeyFromOffset(1);
  if (hasRuWord(lower, "сегодня")) return todayKey();
  const throughDays = lower.match(/через\s+(\d{1,2})\s+(?:день|дня|дней|д)/u);
  if (throughDays) return dateKeyFromOffset(Number(throughDays[1]));
  if (/\btomorrow\b/.test(lower)) return dateKeyFromOffset(1);
  if (/\btoday\b/.test(lower)) return todayKey();
  const iso = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const dotted = lower.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if (dotted) {
    const currentYear = new Date(todayKey() + "T00:00:00").getUTCFullYear();
    const year = dotted[3] ? Number(dotted[3].length === 2 ? "20" + dotted[3] : dotted[3]) : currentYear;
    return String(year).padStart(4, "0") + "-" + String(Number(dotted[2])).padStart(2, "0") + "-" + String(Number(dotted[1])).padStart(2, "0");
  }
  const weekdays = [
    ["воскресенье", "sunday"],
    ["понедельник", "monday"],
    ["вторник", "tuesday"],
    ["среда", "wednesday"],
    ["четверг", "thursday"],
    ["пятница", "friday"],
    ["суббота", "saturday"]
  ];
  const today = new Date(todayKey() + "T00:00:00");
  for (let index = 0; index < weekdays.length; index += 1) {
    if (!weekdays[index].some((word) => lower.includes(word))) continue;
    const offset = (index - today.getUTCDay() + 7) % 7 || 7;
    return dateKeyFromOffset(offset);
  }
  return "";
}

function hasRuWord(text, word) {
  return new RegExp("(^|[^0-9a-z\\u0430-\\u044f\\u0451])" + word + "(?=$|[^0-9a-z\\u0430-\\u044f\\u0451])", "iu").test(text);
}

function parseDateFromTextHuman(text) {
  const lower = normalizeRuText(text);
  if (hasRuWordSafe(lower, "\u043f\u043e\u0441\u043b\u0435\u0437\u0430\u0432\u0442\u0440\u0430")) return dateKeyFromOffset(2);
  if (hasRuWordSafe(lower, "\u0437\u0430\u0432\u0442\u0440\u0430")) return dateKeyFromOffset(1);
  if (hasRuWordSafe(lower, "\u0441\u0435\u0433\u043e\u0434\u043d\u044f")) return todayKey();
  const throughDays = lower.match(/\u0447\u0435\u0440\u0435\u0437\s+(\d{1,2})\s+(?:\u0434\u0435\u043d\u044c|\u0434\u043d\u044f|\u0434\u043d\u0435\u0439|\u0434)/u);
  if (throughDays) return dateKeyFromOffset(Number(throughDays[1]));
  if (/\btomorrow\b/.test(lower)) return dateKeyFromOffset(1);
  if (/\btoday\b/.test(lower)) return todayKey();
  const iso = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const dotted = lower.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if (dotted) {
    const currentYear = new Date(todayKey() + "T00:00:00").getUTCFullYear();
    const year = dotted[3] ? Number(dotted[3].length === 2 ? "20" + dotted[3] : dotted[3]) : currentYear;
    return String(year).padStart(4, "0") + "-" + String(Number(dotted[2])).padStart(2, "0") + "-" + String(Number(dotted[1])).padStart(2, "0");
  }
  const weekdays = [
    ["\u0432\u043e\u0441\u043a\u0440\u0435\u0441\u0435\u043d\u044c\u0435", "sunday"],
    ["\u043f\u043e\u043d\u0435\u0434\u0435\u043b\u044c\u043d\u0438\u043a", "monday"],
    ["\u0432\u0442\u043e\u0440\u043d\u0438\u043a", "tuesday"],
    ["\u0441\u0440\u0435\u0434\u0430", "wednesday"],
    ["\u0447\u0435\u0442\u0432\u0435\u0440\u0433", "thursday"],
    ["\u043f\u044f\u0442\u043d\u0438\u0446\u0430", "friday"],
    ["\u0441\u0443\u0431\u0431\u043e\u0442\u0430", "saturday"]
  ];
  const today = new Date(todayKey() + "T00:00:00");
  for (let index = 0; index < weekdays.length; index += 1) {
    if (!weekdays[index].some((word) => lower.includes(word))) continue;
    const offset = (index - today.getUTCDay() + 7) % 7 || 7;
    return dateKeyFromOffset(offset);
  }
  return "";
}

function parseDateFromText(text) {
  return parseDateFromTextHumanSafe(text);
  const source = String(text || "");
  const lower = source.toLocaleLowerCase();
  const semanticLower = repairMojibake(source).toLocaleLowerCase();
  const hasDateTerm = (value, term) => new RegExp("(^|[^0-9a-zа-яё])" + term + "(?=$|[^0-9a-zа-яё])", "i").test(value);
  if (hasDateTerm(semanticLower, "послезавтра")) return dateKeyFromOffset(2);
  if (hasDateTerm(semanticLower, "завтра")) return dateKeyFromOffset(1);
  if (hasDateTerm(semanticLower, "сегодня")) return todayKey();
  const semanticThroughDays = semanticLower.match(/через\s+(\d{1,2})\s+д/);
  if (semanticThroughDays) return dateKeyFromOffset(Number(semanticThroughDays[1]));
  if (hasDateTerm(lower, "послезавтра")) return dateKeyFromOffset(2);
  if (hasDateTerm(lower, "завтра")) return dateKeyFromOffset(1);
  if (hasDateTerm(lower, "сегодня")) return todayKey();
  const throughDays = lower.match(/через\s+(\d{1,2})\s+д/);
  if (throughDays) return dateKeyFromOffset(Number(throughDays[1]));
  if (/\b(tomorrow|завтра)\b/.test(lower)) return dateKeyFromOffset(1);
  if (/\b(today|сегодня)\b/.test(lower)) return todayKey();
  const iso = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const dotted = lower.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if (dotted) {
    const currentYear = new Date(todayKey() + "T00:00:00").getUTCFullYear();
    const year = dotted[3] ? Number(dotted[3].length === 2 ? "20" + dotted[3] : dotted[3]) : currentYear;
    const day = String(Number(dotted[1])).padStart(2, "0");
    const month = String(Number(dotted[2])).padStart(2, "0");
    return String(year).padStart(4, "0") + "-" + month + "-" + day;
  }
  const weekDays = [
    ["sunday", "воскресенье"],
    ["monday", "понедельник"],
    ["tuesday", "вторник"],
    ["wednesday", "среда"],
    ["thursday", "четверг"],
    ["friday", "пятница"],
    ["saturday", "суббота"]
  ];
  const today = new Date(todayKey() + "T00:00:00");
  for (let index = 0; index < weekDays.length; index += 1) {
    if (!weekDays[index].some((word) => lower.includes(word))) continue;
    const current = today.getUTCDay();
    const target = index;
    const offset = (target - current + 7) % 7 || 7;
    return dateKeyFromOffset(offset);
  }
  const semanticWeekDays = [
    ["sunday", "воскресенье"],
    ["monday", "понедельник"],
    ["tuesday", "вторник"],
    ["wednesday", "среда"],
    ["thursday", "четверг"],
    ["friday", "пятница"],
    ["saturday", "суббота"]
  ];
  for (let index = 0; index < semanticWeekDays.length; index += 1) {
    if (!semanticWeekDays[index].some((word) => semanticLower.includes(word))) continue;
    const current = today.getUTCDay();
    const target = index;
    const offset = (target - current + 7) % 7 || 7;
    return dateKeyFromOffset(offset);
  }
  return "";
}

function parseTimeFromTextHuman(text) {
  const source = String(text || "");
  const lower = normalizeRuText(source);
  const makeTime = (hour, minute = 0) => {
    const cleanHour = ((Number(hour) % 24) + 24) % 24;
    const startTime = String(cleanHour).padStart(2, "0") + ":" + String(Number(minute || 0)).padStart(2, "0");
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  };
  const ambiguous = (hour, reason, options, suggestedTime) => ({
    startTime: "",
    endTime: "",
    ambiguousTime: true,
    timeOptions: options || [String(hour).padStart(2, "0") + ":00", String((hour % 12) + 12).padStart(2, "0") + ":00"],
    suggestedTime: suggestedTime || "",
    ambiguityReason: reason
  });
  const range = lower.match(/(?:^|[^\d])([01]?\d|2[0-3])[:.](\d{2})\s*[-–]\s*([01]?\d|2[0-3])[:.](\d{2})(?:[^\d]|$)/u);
  if (range) return { startTime: range[1].padStart(2, "0") + ":" + range[2], endTime: range[3].padStart(2, "0") + ":" + range[4] };
  const clock = lower.match(/(?:^|[^\d])([01]?\d|2[0-3])[:.](\d{2})(?:[^\d]|$)/u);
  if (clock) return makeTime(Number(clock[1]), Number(clock[2]));
  if (/\b(вечером|к вечеру|вечерний слот)\b/u.test(lower)) {
    return ambiguous(20, "Сказано только «вечером»: LifeOS предлагает 20:00, но ждёт подтверждения.", ["19:00", "20:00", "21:00"], "20:00");
  }
  if (/\b(утром|с утра)\b/u.test(lower)) return makeTime(9, 0);
  if (/\b(днем|днём|после обеда)\b/u.test(lower)) return makeTime(14, 0);
  const marked = lower.match(/(?:^|\s)(?:в|к|at)\s+([01]?\d|2[0-3])\s*(утра|дня|вечера|ночи|am|pm)(?=$|\s|[,.;:!?])/u);
  if (marked) {
    let hour = Number(marked[1]);
    const marker = marked[2];
    if ((marker === "вечера" || marker === "дня" || marker === "pm") && hour < 12) hour += 12;
    if (marker === "ночи" && hour >= 5 && hour < 12) hour += 12;
    if ((marker === "утра" || marker === "am") && hour === 12) hour = 0;
    return makeTime(hour, 0);
  }
  const wordMap = {
    один: 1,
    два: 2,
    три: 3,
    четыре: 4,
    пять: 5,
    шесть: 6,
    семь: 7,
    восемь: 8,
    девять: 9,
    десять: 10,
    одиннадцать: 11,
    двенадцать: 12
  };
  const wordHour = lower.match(/\b(?:в|к)\s+(один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать)(?:\s+(утра|дня|вечера|ночи))?\b/u);
  if (wordHour) {
    let hour = wordMap[wordHour[1]] || 0;
    const marker = wordHour[2] || "";
    if (!marker) return ambiguous(hour, "Время словами без части суток: нужно уточнить утро или вечер.");
    if ((marker === "вечера" || marker === "дня") && hour < 12) hour += 12;
    if (marker === "ночи" && hour >= 5 && hour < 12) hour += 12;
    if (marker === "утра" && hour === 12) hour = 0;
    return makeTime(hour, 0);
  }
  const plainHour = lower.match(/(?:^|\s)(?:в|к|at)\s+([01]?\d|2[0-3])(?=$|\s|[,.;:!?])/u);
  if (plainHour) {
    const hour = Number(plainHour[1]);
    if (hour > 12) return makeTime(hour, 0);
    const morningContext = /(встать|подъ[её]м|завтрак|утро|утром|зарядк|morning|breakfast)/u.test(lower);
    if (morningContext || (hour >= 1 && hour <= 7)) return makeTime(hour, 0);
    return ambiguous(hour, "Время без части суток: уточните 11:00 или 23:00 перед созданием.");
  }
  return { startTime: "", endTime: "" };
}

function parseTimeFromTextHumanSafe(text) {
  const lower = normalizeRuText(text);
  const makeTime = (hour, minute = 0) => {
    const cleanHour = ((Number(hour) % 24) + 24) % 24;
    const startTime = String(cleanHour).padStart(2, "0") + ":" + String(Number(minute || 0)).padStart(2, "0");
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  };
  const ambiguous = (hour, reason, options, suggestedTime) => ({
    startTime: "",
    endTime: "",
    ambiguousTime: true,
    timeOptions: options || [String(hour).padStart(2, "0") + ":00", String((hour % 12) + 12).padStart(2, "0") + ":00"],
    suggestedTime: suggestedTime || "",
    ambiguityReason: reason
  });
  const range = lower.match(/(?:^|[^\d])([01]?\d|2[0-3])[:.](\d{2})\s*[-–]\s*([01]?\d|2[0-3])[:.](\d{2})(?:[^\d]|$)/u);
  if (range) return { startTime: range[1].padStart(2, "0") + ":" + range[2], endTime: range[3].padStart(2, "0") + ":" + range[4] };
  const clock = lower.match(/(?:^|[^\d])([01]?\d|2[0-3])[:.](\d{2})(?:[^\d]|$)/u);
  if (clock) return makeTime(Number(clock[1]), Number(clock[2]));
  if (lower.includes("\u0432\u0435\u0447\u0435\u0440\u043e\u043c") || lower.includes("\u043a \u0432\u0435\u0447\u0435\u0440\u0443") || lower.includes("\u0432\u0435\u0447\u0435\u0440\u043d\u0438\u0439 \u0441\u043b\u043e\u0442")) {
    return ambiguous(20, "Сказано только «вечером»: предлагаю 20:00, но лучше подтвердить точное время.", ["19:00", "20:00", "21:00"], "20:00");
  }
  if (lower.includes("\u0443\u0442\u0440\u043e\u043c") || lower.includes("\u0441 \u0443\u0442\u0440\u0430")) return makeTime(9, 0);
  if (lower.includes("\u0434\u043d\u0435\u043c") || lower.includes("\u0434\u043d\u0451\u043c") || lower.includes("\u043f\u043e\u0441\u043b\u0435 \u043e\u0431\u0435\u0434\u0430")) return makeTime(14, 0);
  const marked = lower.match(/(?:^|\s)(?:\u0432|\u043a|at)\s+([01]?\d|2[0-3])\s*(\u0443\u0442\u0440\u0430|\u0434\u043d\u044f|\u0432\u0435\u0447\u0435\u0440\u0430|\u043d\u043e\u0447\u0438|am|pm)(?=$|\s|[,.;:!?])/u);
  if (marked) {
    let hour = Number(marked[1]);
    const marker = marked[2];
    if ((marker === "\u0432\u0435\u0447\u0435\u0440\u0430" || marker === "\u0434\u043d\u044f" || marker === "pm") && hour < 12) hour += 12;
    if (marker === "\u043d\u043e\u0447\u0438" && hour >= 5 && hour < 12) hour += 12;
    if ((marker === "\u0443\u0442\u0440\u0430" || marker === "am") && hour === 12) hour = 0;
    return makeTime(hour, 0);
  }
  const plainHour = lower.match(/(?:^|\s)(?:\u0432|\u043a|at)\s+([01]?\d|2[0-3])(?=$|\s|[,.;:!?])/u);
  if (plainHour) {
    const hour = Number(plainHour[1]);
    if (hour > 12) return makeTime(hour, 0);
    const morningContext = /(\u0432\u0441\u0442\u0430\u0442\u044c|\u043f\u043e\u0434\u044a[\u0435\u0451]\u043c|\u0437\u0430\u0432\u0442\u0440\u0430\u043a|\u0443\u0442\u0440\u043e|\u0443\u0442\u0440\u043e\u043c|\u0437\u0430\u0440\u044f\u0434\u043a|morning|breakfast)/u.test(lower);
    if (morningContext || (hour >= 1 && hour <= 7)) return makeTime(hour, 0);
    return ambiguous(hour, "Время без части суток: уточните 11:00 или 23:00 перед созданием.");
  }
  return { startTime: "", endTime: "" };
}

function parseTimeFromText(text) {
  return parseTimeFromTextHumanSafe(text);
  const source = String(text || "");
  const lower = source.toLocaleLowerCase();
  const semanticLower = repairMojibake(source).toLocaleLowerCase();
  const ambiguous = (hour, reason, suggestedTime) => ({
    startTime: "",
    endTime: "",
    ambiguousTime: true,
    timeOptions: [String(hour).padStart(2, "0") + ":00", String((hour % 12) + 12).padStart(2, "0") + ":00"],
    suggestedTime: suggestedTime || "",
    ambiguityReason: reason
  });
  const contextualMorning = ["встать", "подъем", "подъём", "завтрак", "утро", "утром", "с утра", "зарядк", "morning", "breakfast"].some((token) => semanticLower.includes(token));
  function hourWithMarker(hour, marker) {
    let value = Number(hour);
    const cleanMarker = String(marker || "").toLocaleLowerCase();
    if ((cleanMarker === "pm" || cleanMarker === "дня" || cleanMarker === "вечера") && value < 12) value += 12;
    if (cleanMarker === "ночи" && value >= 5 && value < 12) value += 12;
    if ((cleanMarker === "am" || cleanMarker === "утра") && value === 12) value = 0;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  const naturalMarkedHour = semanticLower.match(/(?:^|\s)(?:в|к|at)\s+([01]?\d|2[0-3])\s*(am|pm|утра|дня|вечера|ночи)(?=$|\s|[,.;:!?])/);
  if (naturalMarkedHour) return hourWithMarker(Number(naturalMarkedHour[1]), naturalMarkedHour[2]);
  const naturalHour = semanticLower.match(/(?:^|\s)(?:в|к|at)\s+([01]?\d|2[0-3])\b/);
  if (naturalHour) {
    const hour = Number(naturalHour[1]);
    if (hour > 12) return hourWithMarker(hour, "");
    if (hour >= 1 && hour <= 7) return hourWithMarker(hour, "утра");
    if (contextualMorning) return hourWithMarker(hour, "утра");
    return ambiguous(hour, "Время без части суток: нужно выбрать утро или вечер перед календарным блоком.");
  }
  if (semanticLower.includes("утром") || semanticLower.includes("с утра")) return { startTime: "09:00", endTime: "09:45" };
  if (semanticLower.includes("днем") || semanticLower.includes("днём") || semanticLower.includes("после обеда")) return { startTime: "14:00", endTime: "14:45" };
  if (semanticLower.includes("вечером") || semanticLower.includes("к вечеру")) return { startTime: "", endTime: "", ambiguousTime: true, timeOptions: ["19:00", "20:00", "21:00"], suggestedTime: "20:00", ambiguityReason: "Сказано только «вечером»; LifeOS предлагает 20:00, но ждет подтверждения владельца." };
  const semanticWordHour = semanticLower.match(/\bв\s+(один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать)(?:\s+(дня|вечера|утра))?\b/);
  if (semanticWordHour) {
    const hourMap = { один: 1, два: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12 };
    let value = hourMap[semanticWordHour[1]] || 0;
    if (!semanticWordHour[2] && value <= 12 && !contextualMorning) return ambiguous(value, "Время словами без части суток: нужно уточнение владельца.");
    if (!semanticWordHour[2] && contextualMorning) semanticWordHour[2] = "утра";
    if ((semanticWordHour[2] === "дня" || semanticWordHour[2] === "вечера") && value < 12) value += 12;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  const semanticHour = semanticLower.match(/(?:\bat\s+|в\s+)([01]?\d|2[0-3])(?:\s*(am|pm|дня|вечера|утра))?\b/);
  if (semanticHour) {
    let value = Number(semanticHour[1]);
    if ((semanticHour[2] === "pm" || semanticHour[2] === "дня" || semanticHour[2] === "вечера") && value < 12) value += 12;
    if ((semanticHour[2] === "am" || semanticHour[2] === "утра") && value === 12) value = 0;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  if (/\b(утром|с утра)\b/.test(lower)) return { startTime: "09:00", endTime: "09:45" };
  if (/\b(днем|после обеда)\b/.test(lower)) return { startTime: "14:00", endTime: "14:45" };
  if (/\b(вечером|к вечеру)\b/.test(lower)) return { startTime: "19:00", endTime: "19:45" };
  const wordHour = lower.match(/\bв\s+(один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать)(?:\s+(дня|вечера|утра))?\b/);
  if (wordHour) {
    const hourMap = { один: 1, два: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12 };
    let value = hourMap[wordHour[1]] || 0;
    if ((wordHour[2] === "дня" || wordHour[2] === "вечера") && value < 12) value += 12;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  const range = source.match(/(?:^|\D)([01]?\d|2[0-3])[:.](\d{2})\s*[-–]\s*([01]?\d|2[0-3])[:.](\d{2})(?:\D|$)/);
  if (range) {
    return {
      startTime: range[1].padStart(2, "0") + ":" + range[2],
      endTime: range[3].padStart(2, "0") + ":" + range[4]
    };
  }
  const clock = source.match(/(?:^|\D)([01]?\d|2[0-3])[:.](\d{2})(?:\D|$)/);
  if (clock) {
    const startTime = clock[1].padStart(2, "0") + ":" + clock[2];
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  const hour = source.toLocaleLowerCase().match(/(?:\bat\s+|в\s+)([01]?\d|2[0-3])(?:\s*(am|pm))?\b/);
  if (hour) {
    let value = Number(hour[1]);
    if (hour[2] === "pm" && value < 12) value += 12;
    if (hour[2] === "am" && value === 12) value = 0;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  return { startTime: "", endTime: "" };
}

function parseTaskSchedule(title, fallbackHint, overrides) {
  const options = overrides && typeof overrides === "object" ? overrides : {};
  const combined = [title, fallbackHint].filter(Boolean).join(" ");
  const parsedTime = parseTimeFromText(combined);
  const startTime = normalizeTime(options.startTime || parsedTime.startTime || "");
  const endTime = normalizeTime(options.endTime || parsedTime.endTime || (startTime ? addMinutesToTime(startTime, 45) : ""));
  return {
    day: cleanLine(options.day || parseDateFromText(combined) || todayKey()),
    startTime,
    endTime,
    dateHint: cleanLine(fallbackHint || "")
  };
}

function formatDayLabel(dayKey) {
  const date = new Date(dayKey + "T00:00:00");
  const week = new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date);
  return week + " " + dayKey.slice(5);
}

function formatSchedule(item) {
  if (!item || !item.startTime) return "В любое время";
  return item.endTime ? item.startTime + "-" + item.endTime : item.startTime;
}

function makeId(prefix) {
  const cryptoId = globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : "";
  const token = cryptoId ? cryptoId.replaceAll("-", "").slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return prefix + "_" + token;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const CP1251_EXTRA_BYTES = {
  0x0402: 0x80,
  0x0403: 0x81,
  0x201A: 0x82,
  0x0453: 0x83,
  0x201E: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x20AC: 0x88,
  0x2030: 0x89,
  0x0409: 0x8A,
  0x2039: 0x8B,
  0x040A: 0x8C,
  0x040C: 0x8D,
  0x040B: 0x8E,
  0x040F: 0x8F,
  0x0452: 0x90,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201C: 0x93,
  0x201D: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x2122: 0x99,
  0x0459: 0x9A,
  0x203A: 0x9B,
  0x045A: 0x9C,
  0x045C: 0x9D,
  0x045B: 0x9E,
  0x045F: 0x9F,
  0x00A0: 0xA0,
  0x040E: 0xA1,
  0x045E: 0xA2,
  0x0408: 0xA3,
  0x00A4: 0xA4,
  0x0490: 0xA5,
  0x00A6: 0xA6,
  0x00A7: 0xA7,
  0x0401: 0xA8,
  0x00A9: 0xA9,
  0x0404: 0xAA,
  0x00AB: 0xAB,
  0x00AC: 0xAC,
  0x00AD: 0xAD,
  0x00AE: 0xAE,
  0x0407: 0xAF,
  0x00B0: 0xB0,
  0x00B1: 0xB1,
  0x0406: 0xB2,
  0x0456: 0xB3,
  0x0491: 0xB4,
  0x00B5: 0xB5,
  0x00B6: 0xB6,
  0x00B7: 0xB7,
  0x0451: 0xB8,
  0x2116: 0xB9,
  0x0454: 0xBA,
  0x00BB: 0xBB,
  0x0458: 0xBC,
  0x0405: 0xBD,
  0x0455: 0xBE,
  0x0457: 0xBF
};

function cp1251ByteForCodePoint(codePoint) {
  if (codePoint >= 0x0410 && codePoint <= 0x044F) return 0xC0 + codePoint - 0x0410;
  if (Object.prototype.hasOwnProperty.call(CP1251_EXTRA_BYTES, codePoint)) return CP1251_EXTRA_BYTES[codePoint];
  if (codePoint >= 0 && codePoint <= 0x7F) return codePoint;
  return -1;
}

function decodeMojibakeRun(run) {
  const bytes = [];
  for (const char of run) {
    const code = char.codePointAt(0);
    const byte = cp1251ByteForCodePoint(code);
    if (byte < 0) return run;
    bytes.push(byte);
  }
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
  if (!decoded || decoded.includes("\uFFFD")) return run;
  const decodedCyrillic = (decoded.match(/[А-Яа-яЁё]/g) || []).length;
  const sourceSignals = (run.match(/[РС]/g) || []).length + (run.match(/[в]/g) || []).length;
  return decodedCyrillic >= 1 && sourceSignals >= 1 ? decoded : run;
}

function repairMojibake(value) {
  const text = String(value == null ? "" : value);
  if (!/[РС]|\bв[А-Яа-яЁёЂ-џ]/.test(text)) return text;
  return text.replace(/[РС][А-Яа-яЁёЂ-џ№«»°·]+|в[А-Яа-яЁёЂ-џ№«»°·]+/g, decodeMojibakeRun);
}

function escapeHtml(value) {
  return repairMojibake(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanLine(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function shorten(value, maxLength) {
  const clean = cleanLine(value);
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "...";
}

function normalizeTitle(value) {
  return cleanLine(value).toLocaleLowerCase();
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function ghostIdForTitle(title) {
  return "ghost_" + hashString(normalizeTitle(title));
}

function chunkString(value, size) {
  const chunks = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks.length ? chunks : [""];
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    const slice = bytes.subarray(index, index + 8192);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function compressText(text) {
  if ("CompressionStream" in window) {
    try {
      return await withTimeout(async () => {
        const stream = new CompressionStream("gzip");
        const writer = stream.writable.getWriter();
        await writer.write(new TextEncoder().encode(text));
        await writer.close();
        const buffer = await new Response(stream.readable).arrayBuffer();
        return {
          encoding: "gzip-base64",
          payload: bytesToBase64(new Uint8Array(buffer))
        };
      }, 1800);
    } catch (error) {
      console.warn("CompressionStream fallback", error);
    }
  }
  return {
    encoding: "json",
    payload: text
  };
}

async function decompressText(encoding, payload) {
  if (encoding === "gzip-base64" && "DecompressionStream" in window) {
    try {
      return await withTimeout(async () => {
        const bytes = base64ToBytes(payload);
        const stream = new DecompressionStream("gzip");
        const writer = stream.writable.getWriter();
        await writer.write(bytes);
        await writer.close();
        return new Response(stream.readable).text();
      }, 1800);
    } catch (error) {
      console.warn("DecompressionStream fallback", error);
    }
  }
  return payload;
}

function withTimeout(factory, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("stream timeout")), timeoutMs);
    factory().then((value) => {
      clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class KnowledgeRepository {
  constructor() {
    this.db = null;
    this.storageMode = "IndexedDB";
    this.lastPayloadBytes = 0;
    this.lastChunkCount = 0;
    this.lastEncoding = "json";
  }

  async init() {
    if (!("indexedDB" in window)) {
      this.storageMode = "localStorage fallback";
      return;
    }
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
      });
    } catch (error) {
      this.db = null;
      this.storageMode = "localStorage fallback";
      console.warn(error);
    }
  }

  async load() {
    if (this.db) {
      const meta = await this.readRecord(META_KEY);
      if (meta && Number.isFinite(meta.chunkCount)) {
        const parts = [];
        for (let index = 0; index < meta.chunkCount; index += 1) {
          const chunk = await this.readRecord(CHUNK_PREFIX + String(index).padStart(5, "0"));
          if (!chunk) throw new Error("Missing repository chunk " + index);
          parts.push(chunk.payload);
        }
        const payload = parts.join("");
        const text = await decompressText(meta.encoding, payload);
        this.lastPayloadBytes = meta.payloadLength || payload.length;
        this.lastChunkCount = meta.chunkCount;
        this.lastEncoding = meta.encoding;
        return normalizeState(JSON.parse(text));
      }
    }

    const fallbackMeta = localStorage.getItem(FALLBACK_PREFIX + META_KEY);
    if (fallbackMeta) {
      const meta = JSON.parse(fallbackMeta);
      const parts = [];
      for (let index = 0; index < meta.chunkCount; index += 1) {
        const key = FALLBACK_PREFIX + CHUNK_PREFIX + String(index).padStart(5, "0");
        const chunk = localStorage.getItem(key);
        if (chunk == null) throw new Error("Missing fallback chunk " + index);
        parts.push(chunk);
      }
      const payload = parts.join("");
      const text = await decompressText(meta.encoding, payload);
      this.lastPayloadBytes = meta.payloadLength || payload.length;
      this.lastChunkCount = meta.chunkCount;
      this.lastEncoding = meta.encoding;
      return normalizeState(JSON.parse(text));
    }

    return normalizeState(createInitialState());
  }

  async readRecord(id) {
    return idbRequest(this.db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id));
  }

  async save(state) {
    const clean = normalizeState(state);
    clean.lastSavedAt = now();
    const text = JSON.stringify(clean);
    const compressed = await compressText(text);
    const chunks = chunkString(compressed.payload, CHUNK_SIZE);
    const meta = {
      id: META_KEY,
      schemaVersion: clean.schemaVersion,
      encoding: compressed.encoding,
      chunkCount: chunks.length,
      rawLength: text.length,
      payloadLength: compressed.payload.length,
      updatedAt: clean.lastSavedAt
    };

    this.lastPayloadBytes = compressed.payload.length;
    this.lastChunkCount = chunks.length;
    this.lastEncoding = compressed.encoding;

    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORE_NAME, "readwrite");
        const objectStore = tx.objectStore(STORE_NAME);
        const keyRequest = objectStore.getAllKeys();
        keyRequest.onsuccess = () => {
          const keys = keyRequest.result || [];
          for (const key of keys) {
            if (key === META_KEY || String(key).startsWith(CHUNK_PREFIX)) {
              objectStore.delete(key);
            }
          }
          objectStore.put(meta);
          for (let index = 0; index < chunks.length; index += 1) {
            objectStore.put({
              id: CHUNK_PREFIX + String(index).padStart(5, "0"),
              index,
              payload: chunks[index]
            });
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Repository transaction aborted"));
      });
      return clean;
    }

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(FALLBACK_PREFIX)) localStorage.removeItem(key);
    }
    localStorage.setItem(FALLBACK_PREFIX + META_KEY, JSON.stringify(meta));
    for (let index = 0; index < chunks.length; index += 1) {
      localStorage.setItem(FALLBACK_PREFIX + CHUNK_PREFIX + String(index).padStart(5, "0"), chunks[index]);
    }
    return clean;
  }

  close() {
    if (this.db && typeof this.db.close === "function") {
      this.db.close();
    }
    this.db = null;
  }
}

function createInitialState() {
  const rootId = makeId("folder");
  const projectsId = makeId("folder");
  const archiveId = makeId("folder");
  const createdAt = now();
  const state = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    uiRevision: UI_REVISION,
    activeNoteId: "",
    activeFolderId: rootId,
    activeSurface: "inbox",
    searchQuery: "",
    commandPaletteOpen: false,
    commandPaletteQuery: "",
    savedSearches: {},
    captureDraft: "",
    commandMessage: "Локальное хранилище готово",
    lastSavedAt: "",
    folders: {},
    notes: {},
    sources: {},
    tasks: {},
    goals: {},
    reminders: {},
    habits: {},
    financeAccounts: {},
    financeTransactions: {},
    budgets: {},
    subscriptions: {},
    insights: {},
    claims: {},
    questions: {},
    reviewItems: {},
    readingItems: {},
    highlights: {},
    transcriptSegments: {},
    audioCheckpoints: {},
    playerNotes: {},
    planBlocks: {},
    proposals: {},
    chatMessages: {},
    agentRuns: {},
    providerRuns: {},
    flowRuns: {},
    flows: {},
    channels: {},
    systemDefinitions: {},
    systemRecords: {},
    projects: {},
    projectItems: {},
    modelProfiles: {},
    smartHomeDevices: {},
    smartHomeEvents: {},
    marketplacePacks: {},
    installedPacks: {},
    designProfiles: {},
    designStudio: {
      activeProfileId: "design-calm-os",
      renderMode: "dashboard",
      updatedAt: createdAt
    },
    customDatabases: {},
    databaseRows: {},
    screenCompanionSessions: {},
    personalTwinSnapshots: {},
    providers: {
      ollama: { status: "unchecked", label: "Ollama", endpoint: "http://127.0.0.1:11434", lastCheckedAt: "", lastProbeAt: "", lastError: "", scopes: ["active-artifact-analysis"], revokedAt: "" },
      mail: { status: "not-connected", label: "Почта", lastCheckedAt: "" },
      calendar: { status: "local-only", label: "Календарь", lastCheckedAt: "" },
      calendarSync: { status: "not-connected", label: "Внешний календарь", lastCheckedAt: "", scopes: ["calendar-read", "calendar-write"], requiredAction: "Нужны OAuth-данные владельца для синхронизации внешнего календаря; локальный календарь уже работает." },
      automation: { status: "local-only", label: "Потоки", lastCheckedAt: "" },
      player: { status: "local-only", label: "Плеер", lastCheckedAt: "" },
      pwa: { status: "unchecked", label: "PWA / офлайн-оболочка", endpoint: "/service-worker.js", lastCheckedAt: "", scopes: ["offline-shell", "install-boundary"], requiredAction: "LifeOS регистрирует локальный service worker, если браузер это поддерживает; install prompt контролирует браузер." },
      stt: { status: "not-configured", label: "STT", lastCheckedAt: "", scopes: ["audio-transcript"], requiredAction: "Подключи локальный STT-движок или browser speech; ручная расшифровка уже работает." },
      ocr: { status: "not-configured", label: "OCR", lastCheckedAt: "", scopes: ["receipt-image-text"], requiredAction: "Подключи локальный OCR-движок; ручное извлечение данных из чека уже работает." },
      pdf: { status: "parser-required", label: "PDF-парсер", lastCheckedAt: "", scopes: ["book-source-parse"], requiredAction: "Установи PDF-парсер перед извлечением текста; хранение источника и честный gate уже работают." },
      epub: { status: "parser-required", label: "EPUB-парсер", lastCheckedAt: "", scopes: ["book-source-parse"], requiredAction: "Установи EPUB-парсер перед извлечением текста; TXT/MD reader уже работает." },
      notifications: { status: "permission-required", label: "Уведомления", lastCheckedAt: "", scopes: ["browser-permission"], requiredAction: "Разрешение браузерных уведомлений запрашивается только явно; напоминания видны в Today/Calendar." },
      models: { status: "local-only", label: "Model Hub", lastCheckedAt: "", scopes: ["model-routes", "proposal-mode"], requiredAction: "Model Hub хранит маршруты и границы данных локально; внешний запуск требует явного действия владельца." },
      screen: { status: "permission-required", label: "Screen Companion", lastCheckedAt: "", scopes: ["screen-capture", "active-window-context"], requiredAction: "Чтение экрана включается только явным разрешением владельца; до этого работает ручной импорт скрина/текста." },
      smartHome: { status: "not-connected", label: "Умный дом", lastCheckedAt: "", scopes: ["home-events", "device-control"], requiredAction: "Home Assistant или другой локальный hub подключается адаптером; локальная карта устройств и события работают вручную." },
      marketplace: { status: "local-only", label: "Marketplace систем", lastCheckedAt: "", scopes: ["local-pack-install"], requiredAction: "Паки устанавливаются как локальные system definitions без запуска чужого кода." }
    },
    ollama: {
      endpoint: "http://127.0.0.1:11434",
      status: "unchecked",
      models: [],
      selectedModel: "",
      lastError: "",
      lastCheckedAt: "",
      lastProbeAt: "",
      lastGenerationStatus: "",
      lastGenerationSample: "",
      lastLatencyMs: 0,
      scopes: ["active-artifact-analysis"],
      revokedAt: ""
    },
    backlinks: {},
    ghosts: {},
    graphView: {
      panX: 0,
      panY: 0,
      zoom: 1,
      selectedNodeId: "",
      mode: "global",
      searchQuery: ""
    },
    control: {
      lastExportSummary: "",
      lastImportSummary: "",
      receipts: [],
      rollbackSnapshots: [],
      corruptRecords: [],
      architectureEvents: [],
      privacyZones: {
        local: "active",
        providers: "gated",
        privateMedia: "manual"
      }
    },
    graphFilters: {
      notes: true,
      productBrain: false,
      sources: true,
      goals: true,
      tasks: true,
      money: true,
      habits: true,
      insights: true,
      knowledge: true,
      systems: true,
      channels: true,
      models: true,
      home: true,
      ghosts: true
    },
    environment: {
      online: true,
      persisted: false,
      storageUsage: 0,
      storageQuota: 0,
      manifestHref: "",
      serviceWorkerSupported: false,
      serviceWorkerStatus: "unchecked",
      serviceWorkerScope: "",
      serviceWorkerUpdatedAt: "",
      installPromptStatus: "not-seen",
      displayMode: "browser",
      pwaLastError: "",
      updatedAt: ""
    },
    auditLog: []
  };
  state.folders[rootId] = {
    id: rootId,
    name: "Vault",
    parentId: "",
    order: 1,
    createdAt,
    updatedAt: createdAt
  };
  state.folders[projectsId] = {
    id: projectsId,
    name: "Projects",
    parentId: rootId,
    order: 2,
    createdAt,
    updatedAt: createdAt
  };
  state.folders[archiveId] = {
    id: archiveId,
    name: "Archive",
    parentId: rootId,
    order: 3,
    createdAt,
    updatedAt: createdAt
  };
  return state;
}

function productBrainSpecByKey(key) {
  return PRODUCT_BRAIN_NODE_SPECS.find((spec) => spec.key === key) || null;
}

function productBrainNoteIdByKey(key) {
  const spec = productBrainSpecByKey(key);
  return spec ? spec.id : "";
}

function productBrainNotes(state) {
  return Object.values(state.notes || {}).filter((note) => !note.deleted && note.systemType === "product_brain");
}

function ensureProductBrainFolder(state) {
  if (state.folders[PRODUCT_BRAIN_FOLDER_ID]) return PRODUCT_BRAIN_FOLDER_ID;
  const existing = Object.values(state.folders || {}).find((folder) => normalizeTitle(folder.name) === normalizeTitle("Product Brain"));
  if (existing) return existing.id;
  const rootFolder = Object.values(state.folders || {}).sort((a, b) => (a.order || 0) - (b.order || 0))[0] || null;
  const createdAt = now();
  state.folders[PRODUCT_BRAIN_FOLDER_ID] = {
    id: PRODUCT_BRAIN_FOLDER_ID,
    name: "Product Brain",
    parentId: rootFolder ? rootFolder.id : "",
    order: Object.values(state.folders || {}).length + 1,
    createdAt,
    updatedAt: createdAt
  };
  return PRODUCT_BRAIN_FOLDER_ID;
}

function ensureProductBrain(state) {
  const previous = state.control && state.control.productBrain ? state.control.productBrain.version : "";
  const folderId = ensureProductBrainFolder(state);
  const createdAt = now();
  for (const spec of PRODUCT_BRAIN_NODE_SPECS) {
    const existing = state.notes[spec.id];
    const body = String(spec.body || "# " + spec.title + "\n");
    if (!existing || existing.deleted) {
      state.notes[spec.id] = {
        id: spec.id,
        title: spec.title,
        folderId,
        body,
        tags: ["product-brain", spec.kind],
        links: [],
        deleted: false,
        systemType: "product_brain",
        productBrainKey: spec.key,
        productBrainKind: spec.kind,
        productBrainStatus: spec.status,
        createdAt,
        updatedAt: createdAt
      };
    } else if (previous !== PRODUCT_BRAIN_VERSION || existing.systemType !== "product_brain") {
      existing.title = spec.title;
      existing.folderId = folderId;
      existing.body = body;
      existing.tags = Array.from(new Set([...(Array.isArray(existing.tags) ? existing.tags : []), "product-brain", spec.kind]));
      existing.deleted = false;
      existing.systemType = "product_brain";
      existing.productBrainKey = spec.key;
      existing.productBrainKind = spec.kind;
      existing.productBrainStatus = spec.status;
      existing.updatedAt = createdAt;
    }
  }
  state.control.productBrain = Object.assign({}, state.control.productBrain || {}, {
    version: PRODUCT_BRAIN_VERSION,
    rootNoteId: PRODUCT_BRAIN_ROOT_ID,
    currentPackage: "P_EXTERNAL_PROVIDER_SETUP",
    nextPackage: "P_OWNER_PROVIDER_CONNECTIONS_EXTERNAL",
    githubReleaseStatus: "LITE_SNAPSHOT_PUSHED_WITH_OMITTED_EVIDENCE",
    localStatus: "DONE",
    externalStatus: "GATED",
    updatedAt: createdAt
  });
  if (!state.activeNoteId) state.activeNoteId = PRODUCT_BRAIN_ROOT_ID;
  if (previous !== PRODUCT_BRAIN_VERSION) {
    addAudit(state, "product_brain.seed", "Product Brain artifact graph updated to " + PRODUCT_BRAIN_VERSION, PRODUCT_BRAIN_ROOT_ID);
  }
}

function productBrainStatusSummary(state) {
  const notes = productBrainNotes(state);
  const counts = { DONE: 0, PARTIAL: 0, BROKEN: 0, GATED: 0, NEXT: 0 };
  for (const note of notes) {
    const status = note.productBrainStatus || "PARTIAL";
    counts[status] = (counts[status] || 0) + 1;
  }
  return {
    version: state.control && state.control.productBrain ? state.control.productBrain.version : "",
    rootNoteId: PRODUCT_BRAIN_ROOT_ID,
    currentPackage: state.control && state.control.productBrain ? state.control.productBrain.currentPackage : "P_PRODUCT_BRAIN_001",
    nextPackage: state.control && state.control.productBrain ? state.control.productBrain.nextPackage : "P_EXTERNAL_PROVIDER_SETUP",
    githubReleaseStatus: state.control && state.control.productBrain ? state.control.productBrain.githubReleaseStatus : "LITE_SNAPSHOT_PUSHED_WITH_OMITTED_EVIDENCE",
    counts,
    noteCount: notes.length
  };
}

const V34_PLATFORM_VERSION = "v34-platform-primitives-2026-07-09";

const V34_DEFAULT_CHANNELS = [
  {
    id: "channel-life-feed",
    title: "Личная лента",
    kind: "life-feed",
    view: "timeline",
    description: "Поток источников, решений, действий, подключений и системных изменений."
  },
  {
    id: "channel-today-focus",
    title: "Фокус дня",
    kind: "today",
    view: "dashboard",
    description: "Задачи, планы, привычки и напоминания, которые требуют внимания сейчас."
  },
  {
    id: "channel-security-control",
    title: "Приватность и контроль",
    kind: "security",
    view: "audit",
    description: "Provider gates, exports, rollback snapshots, screen permissions and package receipts."
  },
  {
    id: "channel-systems-builder",
    title: "Системы и конструктор",
    kind: "systems",
    view: "kanban",
    description: "Пользовательские системы, database schemas, marketplace packs and workflows."
  }
];

const V34_MARKETPLACE_PACKS = [
  {
    id: "pack-crm-lite",
    title: "CRM / клиенты",
    kind: "crm",
    description: "Локальная система клиентов: entities, сделки, follow-ups, заметки и graph links.",
    entities: ["Контакт", "Сделка", "Follow-up"],
    fields: ["имя", "статус", "следующий шаг", "связанный проект"],
    views: ["таблица", "timeline", "карточки"],
    actions: ["добавить клиента", "создать follow-up", "экспорт"]
  },
  {
    id: "pack-learning-hub",
    title: "Учебный центр",
    kind: "learning",
    description: "Курсы, книги, лекции, транскрипты, цитаты, повторение и проекты.",
    entities: ["Курс", "Урок", "Конспект", "Повторение"],
    fields: ["источник", "прогресс", "следующее повторение", "проект"],
    views: ["reader", "граф", "повторение"],
    actions: ["добавить источник", "вытащить цитаты", "создать задачу"]
  },
  {
    id: "pack-smart-home-dashboard",
    title: "Smart-home dashboard",
    kind: "smart-home",
    description: "Комнаты, устройства, события и сценарии без скрытого управления устройствами.",
    entities: ["Комната", "Устройство", "Событие", "Сценарий"],
    fields: ["комната", "статус", "последнее событие", "разрешение"],
    views: ["dashboard", "timeline", "safety"],
    actions: ["записать событие", "подготовить адаптер", "экспорт"]
  },
  {
    id: "pack-project-cockpit",
    title: "Проектный cockpit",
    kind: "project",
    description: "Проекты, решения, задачи, документы, риски и agent dry-runs в одной системе.",
    entities: ["Проект", "Решение", "Риск", "Задача"],
    fields: ["статус", "дедлайн", "owner", "следующий шаг"],
    views: ["dashboard", "таблица", "graph"],
    actions: ["добавить проект", "создать решение", "запустить agent dry-run"]
  }
];

const V34_DESIGN_PROFILES = [
  {
    id: "design-calm-os",
    title: "Calm OS",
    mode: "dashboard",
    accent: "#0f766e",
    description: "Спокойная операционная панель для жизни и контроля."
  },
  {
    id: "design-graph-first",
    title: "Graph-first",
    mode: "graph",
    accent: "#4f46e5",
    description: "Фокус на связях, инспекторе и причинности."
  },
  {
    id: "design-feed-first",
    title: "Feed-first",
    mode: "timeline",
    accent: "#b45309",
    description: "Поток событий как главный вход, похожий на личный интернет."
  }
];

const V34_MODEL_PROFILES = [
  {
    id: "model-ollama-local",
    title: "Ollama local",
    kind: "local-llm",
    endpoint: "http://127.0.0.1:11434",
    status: "unchecked",
    boundary: "Активный артефакт отправляется только после явного запуска."
  },
  {
    id: "model-owner-api-key",
    title: "Свои API-ключи",
    kind: "owner-key",
    endpoint: "",
    status: "needs-owner-credentials",
    boundary: "Ключ не хранится демонстрационно; подключение требует явного ввода владельца."
  }
];

function ensureMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function ensureV34ArtifactNote(state, key, title, body, tags) {
  const existing = Object.values(state.notes || {}).find((note) => !note.deleted && note.systemType === "v34_platform" && note.v34Key === key);
  const nowValue = now();
  if (existing) {
    existing.title = title;
    existing.body = body;
    existing.tags = Array.from(new Set([...(Array.isArray(existing.tags) ? existing.tags : []), ...(tags || []), "v34"]));
    existing.updatedAt = nowValue;
    return existing.id;
  }
  const noteId = createNote(state, title, state.activeFolderId, body);
  if (state.notes[noteId]) {
    state.notes[noteId].systemType = "v34_platform";
    state.notes[noteId].v34Key = key;
    state.notes[noteId].tags = Array.from(new Set([...(state.notes[noteId].tags || []), ...(tags || []), "v34"]));
  }
  return noteId;
}

function ensureV34Platform(state) {
  const createdAt = now();
  state.channels = ensureMap(state.channels);
  state.systemDefinitions = ensureMap(state.systemDefinitions);
  state.systemRecords = ensureMap(state.systemRecords);
  state.projects = ensureMap(state.projects);
  state.projectItems = ensureMap(state.projectItems);
  state.modelProfiles = ensureMap(state.modelProfiles);
  state.smartHomeDevices = ensureMap(state.smartHomeDevices);
  state.smartHomeEvents = ensureMap(state.smartHomeEvents);
  state.marketplacePacks = ensureMap(state.marketplacePacks);
  state.installedPacks = ensureMap(state.installedPacks);
  state.designProfiles = ensureMap(state.designProfiles);
  state.designStudio = Object.assign({ activeProfileId: "design-calm-os", renderMode: "dashboard", updatedAt: createdAt }, state.designStudio || {});
  state.customDatabases = ensureMap(state.customDatabases);
  state.databaseRows = ensureMap(state.databaseRows);
  state.screenCompanionSessions = ensureMap(state.screenCompanionSessions);
  state.personalTwinSnapshots = ensureMap(state.personalTwinSnapshots);

  for (const spec of V34_DEFAULT_CHANNELS) {
    const current = state.channels[spec.id] || {};
    const noteId = current.noteId || ensureV34ArtifactNote(state, "channel:" + spec.id, spec.title, [
      "# " + spec.title,
      "",
      spec.description,
      "",
      "Channel type: " + spec.kind,
      "Default view: " + spec.view
    ].join("\n"), ["channel", spec.kind]);
    state.channels[spec.id] = Object.assign({}, current, spec, {
      noteId,
      status: current.status || "active",
      deleted: Boolean(current.deleted),
      createdAt: current.createdAt || createdAt,
      updatedAt: current.updatedAt || createdAt
    });
  }

  const coreSystemId = "system-personal-os-core";
  if (!state.systemDefinitions[coreSystemId]) {
    const noteId = ensureV34ArtifactNote(state, "system:" + coreSystemId, "LifeOS personal OS core", [
      "# LifeOS personal OS core",
      "",
      "Core v34 system built from primitives: sources, artifacts, events, channels, views, actions, workflows, agents, rights, adapters, export and rollback.",
      "",
      "[[Artifact OS Contract]]"
    ].join("\n"), ["system", "platform"]);
    state.systemDefinitions[coreSystemId] = {
      id: coreSystemId,
      title: "LifeOS personal OS core",
      kind: "platform",
      entities: ["Источник", "Артефакт", "Событие", "Канал", "Отображение", "Действие"],
      fields: ["source", "status", "rights", "history", "links"],
      views: ["feed", "dashboard", "graph", "control"],
      actions: ["capture", "search", "export", "rollback"],
      workflows: ["input-to-artifact-to-action"],
      policies: ["local-first", "approval-before-mutation", "provider-gated"],
      adapters: ["files", "ollama", "pwa"],
      health: "ok",
      status: "active",
      noteId,
      installedPackId: "",
      deleted: false,
      createdAt,
      updatedAt: createdAt
    };
  }

  for (const pack of V34_MARKETPLACE_PACKS) {
    const current = state.marketplacePacks[pack.id] || {};
    const noteId = current.noteId || ensureV34ArtifactNote(state, "pack:" + pack.id, pack.title, [
      "# " + pack.title,
      "",
      pack.description,
      "",
      "Entities: " + pack.entities.join(", "),
      "Fields: " + pack.fields.join(", "),
      "Views: " + pack.views.join(", "),
      "Actions: " + pack.actions.join(", "),
      "",
      "Install mode: local system definition, no vendor code execution."
    ].join("\n"), ["marketplace", pack.kind]);
    state.marketplacePacks[pack.id] = Object.assign({}, current, pack, {
      noteId,
      status: current.status || "available",
      installMode: "local-definition",
      deleted: Boolean(current.deleted),
      createdAt: current.createdAt || createdAt,
      updatedAt: current.updatedAt || createdAt
    });
  }

  for (const profile of V34_DESIGN_PROFILES) {
    const current = state.designProfiles[profile.id] || {};
    state.designProfiles[profile.id] = Object.assign({}, current, profile, {
      status: current.status || (profile.id === state.designStudio.activeProfileId ? "active" : "available"),
      deleted: Boolean(current.deleted),
      createdAt: current.createdAt || createdAt,
      updatedAt: current.updatedAt || createdAt
    });
  }

  for (const profile of V34_MODEL_PROFILES) {
    const current = state.modelProfiles[profile.id] || {};
    const noteId = current.noteId || ensureV34ArtifactNote(state, "model:" + profile.id, profile.title, [
      "# " + profile.title,
      "",
      "Model route kind: " + profile.kind,
      "Endpoint: " + (profile.endpoint || "owner-provided"),
      "",
      profile.boundary
    ].join("\n"), ["model", profile.kind]);
    state.modelProfiles[profile.id] = Object.assign({}, current, profile, {
      noteId,
      deleted: Boolean(current.deleted),
      createdAt: current.createdAt || createdAt,
      updatedAt: current.updatedAt || createdAt
    });
  }

  const providerDefaults = {
    models: { status: "local-only", label: "Model Hub", scopes: ["model-routes", "proposal-mode"], requiredAction: "Model Hub хранит маршруты и границы данных локально; внешний запуск требует явного действия владельца." },
    screen: { status: "permission-required", label: "Screen Companion", scopes: ["screen-capture", "active-window-context"], requiredAction: "Чтение экрана включается только явным разрешением владельца; до этого работает ручной импорт скрина/текста." },
    smartHome: { status: "not-connected", label: "Умный дом", scopes: ["home-events", "device-control"], requiredAction: "Home Assistant или другой локальный hub подключается адаптером; локальная карта устройств и события работают вручную." },
    marketplace: { status: "local-only", label: "Marketplace систем", scopes: ["local-pack-install"], requiredAction: "Паки устанавливаются как локальные system definitions без запуска чужого кода." }
  };
  for (const [key, provider] of Object.entries(providerDefaults)) {
    state.providers[key] = Object.assign({}, provider, state.providers[key] || {});
  }

  if (!state.control.v34Platform || state.control.v34Platform.version !== V34_PLATFORM_VERSION) {
    state.control.v34Platform = {
      version: V34_PLATFORM_VERSION,
      primitives: ["sources", "artifacts", "events", "channels", "views", "actions", "workflows", "agents", "rights", "adapters", "marketplace"],
      updatedAt: createdAt
    };
    addAudit(state, "v34.platform.seed", "LifeOS v34 platform primitives seeded", state.activeNoteId);
  }
}

function createSystemDefinition(state, options) {
  const data = options && typeof options === "object" ? options : {};
  const title = cleanLine(data.title || "Новая система");
  if (!title) return "";
  const id = makeId("system");
  const createdAt = now();
  const entities = Array.isArray(data.entities) && data.entities.length ? data.entities.map(cleanLine).filter(Boolean) : ["Сущность", "Событие", "Действие"];
  const fields = Array.isArray(data.fields) && data.fields.length ? data.fields.map(cleanLine).filter(Boolean) : ["статус", "источник", "следующий шаг"];
  const views = Array.isArray(data.views) && data.views.length ? data.views.map(cleanLine).filter(Boolean) : ["dashboard", "table", "timeline", "graph"];
  const actions = Array.isArray(data.actions) && data.actions.length ? data.actions.map(cleanLine).filter(Boolean) : ["добавить запись", "создать задачу", "экспорт"];
  const noteId = ensureV34ArtifactNote(state, "system:" + id, title, [
    "# " + title,
    "",
    "Система построена внутри LifeOS v34 primitives.",
    "",
    "Entities: " + entities.join(", "),
    "Fields: " + fields.join(", "),
    "Views: " + views.join(", "),
    "Actions: " + actions.join(", "),
    "Policies: local-first, approval-before-mutation, exportable."
  ].join("\n"), ["system", cleanLine(data.kind || "custom")]);
  state.systemDefinitions[id] = {
    id,
    title,
    kind: cleanLine(data.kind || "custom"),
    entities,
    fields,
    views,
    actions,
    workflows: Array.isArray(data.workflows) ? data.workflows.map(cleanLine).filter(Boolean) : [],
    policies: ["local-first", "approval-before-mutation", "exportable"].concat(Array.isArray(data.policies) ? data.policies.map(cleanLine).filter(Boolean) : []),
    adapters: Array.isArray(data.adapters) ? data.adapters.map(cleanLine).filter(Boolean) : [],
    health: "ok",
    status: "active",
    noteId,
    installedPackId: cleanLine(data.installedPackId || ""),
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "system.create", "System definition created: " + title, noteId);
  return id;
}

function addSystemEntityField(state, systemId, entityName, fieldInput) {
  const system = state.systemDefinitions[systemId];
  if (!system || system.deleted) return { ok: false, errors: ["Система не найдена"] };
  const entity = system.entities.find((item) => item.name === entityName);
  if (!entity) return { ok: false, errors: ["Сущность не найдена"] };
  const field = normalizeSystemField(fieldInput);
  if (!field.name) return { ok: false, errors: ["Укажи название поля"] };
  const existingIndex = entity.fields.findIndex((item) => item.name === field.name);
  if (existingIndex >= 0) entity.fields[existingIndex] = field;
  else entity.fields.push(field);
  system.updatedAt = now();
  addAudit(state, "system.field.update", "Поле \"" + field.name + "\" (" + field.type + ") для " + entity.name + " в " + system.title, system.noteId);
  return { ok: true, errors: [] };
}

function createSystemRecord(state, systemId, entityName, rawValues) {
  const system = state.systemDefinitions[systemId];
  if (!system || system.deleted) return { ok: false, id: "", errors: ["Система не найдена"] };
  const entity = system.entities.find((item) => item.name === entityName);
  if (!entity) return { ok: false, id: "", errors: ["Сущность не найдена"] };
  const validation = validateSystemRecordFields(entity, rawValues || {});
  if (!validation.ok) return { ok: false, id: "", errors: validation.errors };
  const id = makeId("sysrecord");
  const createdAt = now();
  const title = cleanLine(rawValues && rawValues.title ? rawValues.title : entity.name + " " + shorten(id, 6));
  const noteId = ensureV34ArtifactNote(state, "sysrecord:" + id, title, [
    "# " + title,
    "",
    "Запись сущности \"" + entity.name + "\" системы " + system.title + ".",
    "",
    Object.entries(validation.values).map(([key, value]) => key + ": " + value).join("\n")
  ].join("\n"), ["system-record", cleanLine(system.kind || "custom")]);
  state.systemRecords[id] = {
    id,
    title,
    systemId,
    entityName: entity.name,
    fields: validation.values,
    noteId,
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "system.record.create", "Запись создана: " + title + " (" + entity.name + ")", noteId);
  evaluateSystemTriggers(state, systemId, entity.name, { kind: "create", recordId: id });
  return { ok: true, id, errors: [] };
}

function updateSystemRecord(state, recordId, rawValues) {
  const record = state.systemRecords[recordId];
  if (!record || record.deleted) return { ok: false, errors: ["Запись не найдена"] };
  const system = state.systemDefinitions[record.systemId];
  const entity = system ? system.entities.find((item) => item.name === record.entityName) : null;
  if (!entity) return { ok: false, errors: ["Сущность не найдена"] };
  const previousFields = Object.assign({}, record.fields);
  const merged = Object.assign({}, record.fields, rawValues);
  const validation = validateSystemRecordFields(entity, merged);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  record.fields = validation.values;
  if (rawValues.title) record.title = cleanLine(rawValues.title);
  record.updatedAt = now();
  addAudit(state, "system.record.update", "Запись обновлена: " + record.title, record.noteId);
  for (const field of entity.fields) {
    if (String(previousFields[field.name] ?? "") !== String(validation.values[field.name] ?? "")) {
      evaluateSystemTriggers(state, record.systemId, entity.name, { kind: "update", recordId: record.id }, field.name);
    }
  }
  return { ok: true, errors: [] };
}

function toggleSystemRecordState(state, recordId) {
  const record = state.systemRecords[recordId];
  if (!record) return;
  record.lifecycleState = record.lifecycleState === "archived" ? "active" : "archived";
  record.updatedAt = now();
  addAudit(state, "system.record.toggle", "Статус записи изменен: " + record.title + " -> " + record.lifecycleState, record.noteId);
}

// System Factory date projection (P3.2): any typed date-field value on a systemRecord
// surfaces as a read-only schedule entry in Today/Calendar, without becoming a task.
function systemRecordDateEntries(state) {
  const entries = [];
  for (const record of Object.values(state.systemRecords || {})) {
    if (record.deleted) continue;
    const system = state.systemDefinitions[record.systemId];
    const entity = system ? system.entities.find((item) => item.name === record.entityName) : null;
    if (!entity) continue;
    for (const field of entity.fields) {
      if (field.type !== "date") continue;
      const value = record.fields[field.name];
      if (!value) continue;
      entries.push({
        id: record.id + ":" + field.name,
        recordId: record.id,
        title: record.title,
        day: value,
        fieldName: field.name,
        systemTitle: system.title
      });
    }
  }
  return entries.sort((a, b) => a.day.localeCompare(b.day));
}

function addSystemTrigger(state, systemId, triggerInput) {
  const system = state.systemDefinitions[systemId];
  if (!system || system.deleted) return { ok: false, errors: ["Система не найдена"] };
  const entity = system.entities.find((item) => item.name === triggerInput.entityName);
  if (!entity) return { ok: false, errors: ["Сущность не найдена"] };
  if (triggerInput.kind === "on-field-change" && !entity.fields.some((field) => field.name === triggerInput.fieldName)) {
    return { ok: false, errors: ["Поле не найдено в сущности"] };
  }
  const trigger = Object.assign(normalizeSystemTrigger(triggerInput), { id: makeId("trigger") });
  system.triggers.push(trigger);
  system.updatedAt = now();
  addAudit(state, "system.trigger.update", "Триггер добавлен: " + trigger.kind + " для " + trigger.entityName + " в " + system.title, system.noteId);
  return { ok: true, errors: [] };
}

// Every trigger fires as a dry-run proposal only - apply happens through the existing
// proposal-apply flow (proposal.apply), never automatically. Matches runFlowBuilderDryRun's
// established pattern (flow + proposal + flowRun), generalized to any system trigger.
function fireSystemTriggerDryRun(state, system, trigger, record) {
  let flow = Object.values(state.flows || {}).find((item) => item.systemTriggerId === trigger.id);
  const createdAt = now();
  if (!flow) {
    const flowId = makeId("flow");
    flow = { id: flowId, systemTriggerId: trigger.id, name: "Триггер: " + system.title + " / " + trigger.kind, steps: [], status: "ready", runCount: 0, createdAt, updatedAt: createdAt };
    state.flows[flowId] = flow;
  }
  flow.steps = [
    { kind: "trigger", value: trigger.kind + " (" + trigger.entityName + (trigger.fieldName ? "." + trigger.fieldName : "") + ")" },
    { kind: "condition", value: record ? "record " + record.id : "daily check" },
    { kind: "proposal_action", value: trigger.actionType }
  ];
  flow.runCount += 1;
  flow.status = "dry-run";
  flow.updatedAt = now();
  const contextTitle = record ? record.title : system.title;
  const proposalId = addProposal(state, trigger.actionType, "Триггер \"" + trigger.kind + "\" системы " + system.title + ": " + trigger.actionType + " для " + shorten(contextTitle, 56), "", record ? record.noteId : system.noteId, {
    reason: "System Factory триггер создал предложение. Применение требует подтверждения владельца.",
    fields: { systemId: system.id, triggerId: trigger.id, kind: trigger.kind, recordId: record ? record.id : "", mutationMode: "proposal-only" }
  });
  const runId = makeId("flowrun");
  state.flowRuns[runId] = {
    id: runId,
    flowId: flow.id,
    status: "proposal_created",
    sourceId: "",
    noteId: record ? record.noteId : system.noteId,
    summary: "Триггер \"" + trigger.kind + "\" создал предложение: " + trigger.actionType + " для " + contextTitle,
    proposalIds: proposalId ? [proposalId] : [],
    createdAt: now(),
    updatedAt: now()
  };
  addAudit(state, "flow.dry-run", "Триггер \"" + trigger.kind + "\" системы " + system.title + " создал предложение", record ? record.noteId : system.noteId);
  return runId;
}

function evaluateSystemTriggers(state, systemId, entityName, event, changedFieldName) {
  const system = state.systemDefinitions[systemId];
  if (!system) return;
  const record = event.recordId ? state.systemRecords[event.recordId] : null;
  for (const trigger of system.triggers) {
    if (trigger.entityName !== entityName) continue;
    if (trigger.kind === "on-create" && event.kind === "create") fireSystemTriggerDryRun(state, system, trigger, record);
    if (trigger.kind === "on-field-change" && event.kind === "update" && trigger.fieldName === changedFieldName) fireSystemTriggerDryRun(state, system, trigger, record);
  }
}

function evaluateDailySystemTriggers(state) {
  const today = todayKey();
  for (const system of Object.values(state.systemDefinitions || {})) {
    if (system.deleted) continue;
    for (const trigger of system.triggers) {
      if (trigger.kind !== "daily" || trigger.lastFiredDay === today) continue;
      trigger.lastFiredDay = today;
      fireSystemTriggerDryRun(state, system, trigger, null);
    }
  }
}

function installMarketplacePack(state, packId) {
  const pack = state.marketplacePacks[packId];
  if (!pack || pack.deleted) return "";
  const existing = Object.values(state.installedPacks || {}).find((item) => item.packId === packId && !item.deleted);
  if (existing) return existing.systemId || "";
  const installId = makeId("install");
  const systemId = createSystemDefinition(state, {
    title: pack.title,
    kind: pack.kind,
    entities: pack.entities,
    fields: pack.fields,
    views: pack.views,
    actions: pack.actions,
    installedPackId: installId,
    adapters: ["local-definition"]
  });
  const createdAt = now();
  state.installedPacks[installId] = {
    id: installId,
    packId,
    title: pack.title,
    systemId,
    noteId: state.systemDefinitions[systemId] ? state.systemDefinitions[systemId].noteId : pack.noteId,
    status: "installed",
    installMode: "local-definition",
    vendorCodeExecuted: false,
    createdAt,
    updatedAt: createdAt,
    deleted: false
  };
  recordProviderRun(state, "marketplace", "install", "installed", "Installed local system pack without vendor code: " + pack.title, { packId, systemId });
  addAudit(state, "marketplace.install", "Installed local system pack: " + pack.title, state.installedPacks[installId].noteId);
  return systemId;
}

function createProject(state, title) {
  const cleanTitle = cleanLine(title || "Новый проект");
  if (!cleanTitle) return "";
  const id = makeId("project");
  const createdAt = now();
  const noteId = ensureV34ArtifactNote(state, "project:" + id, cleanTitle, [
    "# " + cleanTitle,
    "",
    "Project hub: задачи, решения, документы, риски и артефакты в одной связанной системе."
  ].join("\n"), ["project"]);
  state.projects[id] = {
    id,
    title: cleanTitle,
    status: "active",
    noteId,
    nextAction: "Добавить первое решение или задачу",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "project.create", "Project created: " + cleanTitle, noteId);
  return id;
}

function addProjectItem(state, projectId, text, kind) {
  const project = state.projects[projectId] || Object.values(state.projects || {}).find((item) => !item.deleted);
  const title = cleanLine(text || "Новый пункт проекта");
  if (!project || !title) return "";
  const id = makeId("projectitem");
  const createdAt = now();
  state.projectItems[id] = {
    id,
    projectId: project.id,
    title,
    kind: cleanLine(kind || "decision"),
    status: "open",
    noteId: project.noteId,
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "project.item", "Project item added: " + title, project.noteId);
  return id;
}

function createCustomDatabase(state, title) {
  const cleanTitle = cleanLine(title || "Новая база");
  if (!cleanTitle) return "";
  const id = makeId("database");
  const createdAt = now();
  const noteId = ensureV34ArtifactNote(state, "database:" + id, cleanTitle, [
    "# " + cleanTitle,
    "",
    "Custom database built from LifeOS primitives: entities, fields, rows, views, graph and export."
  ].join("\n"), ["database"]);
  state.customDatabases[id] = {
    id,
    title: cleanTitle,
    fields: ["Название", "Статус", "Источник", "Следующий шаг"],
    views: ["table", "cards", "timeline", "graph"],
    noteId,
    status: "active",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "database.create", "Database created: " + cleanTitle, noteId);
  return id;
}

function addDatabaseRow(state, databaseId, title, status) {
  const database = state.customDatabases[databaseId] || Object.values(state.customDatabases || {}).find((item) => !item.deleted);
  const cleanTitle = cleanLine(title || "Новая запись");
  if (!database || !cleanTitle) return "";
  const id = makeId("dbrow");
  const createdAt = now();
  state.databaseRows[id] = {
    id,
    databaseId: database.id,
    title: cleanTitle,
    status: cleanLine(status || "open"),
    fields: {
      "Название": cleanTitle,
      "Статус": cleanLine(status || "open")
    },
    noteId: database.noteId,
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "database.row", "Database row added: " + cleanTitle, database.noteId);
  return id;
}

function saveDesignProfile(state, profileId, renderMode) {
  const id = state.designProfiles[profileId] ? profileId : "design-calm-os";
  const mode = cleanLine(renderMode || (state.designProfiles[id] ? state.designProfiles[id].mode : "dashboard"));
  state.designStudio.activeProfileId = id;
  state.designStudio.renderMode = mode;
  state.designStudio.updatedAt = now();
  for (const profile of Object.values(state.designProfiles || {})) {
    profile.status = profile.id === id ? "active" : "available";
    profile.updatedAt = now();
  }
  addAudit(state, "design.profile", "Design profile selected: " + id + " / " + mode, state.activeNoteId);
}

function addModelProfile(state, title, endpoint, kind) {
  const cleanTitle = cleanLine(title || "Новая модель");
  if (!cleanTitle) return "";
  const id = makeId("model");
  const createdAt = now();
  const noteId = ensureV34ArtifactNote(state, "model:" + id, cleanTitle, [
    "# " + cleanTitle,
    "",
    "Owner-controlled model route.",
    "Kind: " + cleanLine(kind || "owner-key"),
    "Endpoint: " + cleanLine(endpoint || "owner-provided"),
    "",
    "No private artifact leaves LifeOS without explicit owner action."
  ].join("\n"), ["model", cleanLine(kind || "owner-key")]);
  state.modelProfiles[id] = {
    id,
    title: cleanTitle,
    kind: cleanLine(kind || "owner-key"),
    endpoint: cleanLine(endpoint || ""),
    status: endpoint ? "unchecked" : "needs-owner-credentials",
    boundary: "Explicit owner run only; proposal mode before mutation.",
    noteId,
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "model.profile", "Model profile added: " + cleanTitle, noteId);
  return id;
}

function verifyModelRoute(state, modelId) {
  const model = state.modelProfiles[modelId] || Object.values(state.modelProfiles || {}).find((item) => !item.deleted);
  if (!model) return "";
  model.status = model.endpoint ? "unchecked" : "needs-owner-credentials";
  model.updatedAt = now();
  recordProviderRun(state, "models", "route-check", model.status, "Model route checked without sending private data: " + model.title, { modelId: model.id, endpoint: model.endpoint || "" });
  addAudit(state, "model.route", "Model route checked: " + model.title + " / " + model.status, model.noteId || state.activeNoteId);
  return model.id;
}

function addSmartHomeDevice(state, title, room) {
  const cleanTitle = cleanLine(title || "Устройство");
  if (!cleanTitle) return "";
  const id = makeId("device");
  const createdAt = now();
  const noteId = ensureV34ArtifactNote(state, "device:" + id, cleanTitle, [
    "# " + cleanTitle,
    "",
    "Smart-home device artifact. Control is gated until owner connects a local hub."
  ].join("\n"), ["smart-home"]);
  state.smartHomeDevices[id] = {
    id,
    title: cleanTitle,
    room: cleanLine(room || "Дом"),
    status: "manual",
    provider: "manual",
    noteId,
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "home.device", "Smart-home device added: " + cleanTitle, noteId);
  return id;
}

function recordSmartHomeEvent(state, deviceId, text) {
  const device = state.smartHomeDevices[deviceId] || Object.values(state.smartHomeDevices || {}).find((item) => !item.deleted);
  if (!device) return "";
  const id = makeId("homeevent");
  const createdAt = now();
  const title = cleanLine(text || "Ручное событие устройства");
  state.smartHomeEvents[id] = {
    id,
    deviceId: device.id,
    title,
    status: "recorded",
    noteId: device.noteId,
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "home.event", "Smart-home event recorded: " + title, device.noteId);
  return id;
}

function prepareScreenCompanionSession(state) {
  const id = makeId("screen");
  const createdAt = now();
  state.screenCompanionSessions[id] = {
    id,
    title: "Screen Companion permission gate",
    status: "permission-required",
    scope: "screen-capture",
    summary: "LifeOS will not read the screen until the owner explicitly grants browser permission.",
    noteId: state.activeNoteId,
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  state.providers.screen = Object.assign({}, state.providers.screen || {}, {
    status: "permission-required",
    label: "Screen Companion",
    lastCheckedAt: createdAt,
    scopes: ["screen-capture", "active-window-context"],
    requiredAction: "Grant browser screen permission explicitly; otherwise use manual screenshot import."
  });
  recordProviderRun(state, "screen", "prepare", "permission-required", "Screen Companion prepared without reading the screen", { sessionId: id });
  addAudit(state, "screen.prepare", "Screen Companion permission gate prepared", state.activeNoteId);
  return id;
}

function createPersonalTwinSnapshot(state) {
  const id = makeId("twin");
  const createdAt = now();
  const summary = [
    Object.values(state.notes || {}).filter((item) => !item.deleted).length + " notes",
    Object.values(state.sources || {}).filter((item) => !item.deleted).length + " sources",
    Object.values(state.tasks || {}).filter((item) => !item.deleted).length + " tasks",
    Object.values(state.systemDefinitions || {}).filter((item) => !item.deleted).length + " systems",
    state.auditLog.length + " audit events"
  ].join(" / ");
  const noteId = ensureV34ArtifactNote(state, "twin:" + id, "Personal Twin snapshot", [
    "# Personal Twin snapshot",
    "",
    "Recovery-oriented memory snapshot.",
    "",
    summary,
    "",
    "This is a local summary artifact, not an external identity clone."
  ].join("\n"), ["twin", "recovery"]);
  state.personalTwinSnapshots[id] = {
    id,
    title: "Personal Twin snapshot",
    summary,
    noteId,
    status: "local-snapshot",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "twin.snapshot", "Personal Twin snapshot created: " + summary, noteId);
  return id;
}

function productBrainEdgeReason(key) {
  const reasons = {
    "product-brain-root-vision": "Product Brain раскрывает продуктовую цель",
    "product-brain-root-contract": "Product Brain закрепляет Artifact OS contract",
    "product-brain-root-state": "Product Brain хранит текущее состояние разработки",
    "product-brain-root-complaints": "Product Brain хранит жалобы владельца",
    "product-brain-complaint-ux-debt": "Жалоба владельца превращена в UX debt",
    "product-brain-ux-debt-feature-map": "UX debt связан с workspace completeness",
    "product-brain-bug-regression-test": "Bug связан с regression/e2e proof",
    "product-brain-journey-evidence": "Journey связан со screenshot/test evidence",
    "product-brain-research-design-rule": "Research source принят как design rule",
    "product-brain-provider-setup-action": "Provider gate связан с setup action",
    "product-brain-release-bug": "GitHub release issue отражен в bug ledger",
    "product-brain-graph-evidence": "Graph quality проверяется owner journey",
    "product-brain-chat-state": "Chat answers читают Current Build State",
    "product-brain-recovery-evidence": "Recovery проверяется journey/evidence",
    "product-brain-performance-graph": "Large vault proof влияет на Graph quality"
  };
  return reasons[String(key || "")] || "";
}

function normalizeState(input) {
  const base = input && typeof input === "object" ? input : createInitialState();
  const state = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    uiRevision: base.uiRevision || "",
    activeNoteId: base.activeNoteId || "",
    activeFolderId: base.activeFolderId || "",
    activeSurface: base.activeSurface || "inbox",
    searchQuery: base.searchQuery || "",
    commandPaletteOpen: Boolean(base.commandPaletteOpen),
    commandPaletteQuery: cleanLine(base.commandPaletteQuery || ""),
    savedSearches: base.savedSearches && typeof base.savedSearches === "object" ? base.savedSearches : {},
    captureDraft: String(base.captureDraft || ""),
    commandMessage: base.commandMessage || "Локальное хранилище готово",
    lastSavedAt: base.lastSavedAt || "",
    folders: base.folders || {},
    notes: base.notes || {},
    sources: base.sources || {},
    tasks: base.tasks || {},
    goals: base.goals || {},
    reminders: base.reminders || {},
    habits: base.habits || {},
    financeAccounts: base.financeAccounts || {},
    financeTransactions: base.financeTransactions || {},
    budgets: base.budgets || {},
    subscriptions: base.subscriptions || {},
    insights: base.insights || {},
    claims: base.claims || {},
    questions: base.questions || {},
    reviewItems: base.reviewItems || {},
    readingItems: base.readingItems || {},
    highlights: base.highlights || {},
    transcriptSegments: base.transcriptSegments || {},
    audioCheckpoints: base.audioCheckpoints || {},
    playerNotes: base.playerNotes || {},
    planBlocks: base.planBlocks || {},
    proposals: base.proposals || {},
    chatMessages: base.chatMessages || {},
    agentRuns: base.agentRuns || {},
    providerRuns: base.providerRuns || {},
    flowRuns: base.flowRuns || {},
    flows: base.flows || {},
    channels: base.channels || {},
    systemDefinitions: base.systemDefinitions || {},
    systemRecords: base.systemRecords || {},
    projects: base.projects || {},
    projectItems: base.projectItems || {},
    modelProfiles: base.modelProfiles || {},
    smartHomeDevices: base.smartHomeDevices || {},
    smartHomeEvents: base.smartHomeEvents || {},
    marketplacePacks: base.marketplacePacks || {},
    installedPacks: base.installedPacks || {},
    designProfiles: base.designProfiles || {},
    designStudio: Object.assign({
      activeProfileId: "design-calm-os",
      renderMode: "dashboard",
      viewPresets: {},
      updatedAt: ""
    }, base.designStudio || {}),
    customDatabases: base.customDatabases || {},
    databaseRows: base.databaseRows || {},
    screenCompanionSessions: base.screenCompanionSessions || {},
    personalTwinSnapshots: base.personalTwinSnapshots || {},
    providers: Object.assign({
      ollama: { status: "unchecked", label: "Ollama", endpoint: "http://127.0.0.1:11434", lastCheckedAt: "", lastProbeAt: "", lastError: "", scopes: ["active-artifact-analysis"], revokedAt: "" },
      mail: { status: "not-connected", label: "Почта", lastCheckedAt: "" },
      calendar: { status: "local-only", label: "Календарь", lastCheckedAt: "" },
      calendarSync: { status: "not-connected", label: "Внешний календарь", lastCheckedAt: "", scopes: ["calendar-read", "calendar-write"], requiredAction: "Нужны OAuth-данные владельца для синхронизации внешнего календаря; локальный календарь уже работает." },
      automation: { status: "local-only", label: "Потоки", lastCheckedAt: "" },
      player: { status: "local-only", label: "Плеер", lastCheckedAt: "" },
      pwa: { status: "unchecked", label: "PWA / офлайн-оболочка", endpoint: "/service-worker.js", lastCheckedAt: "", scopes: ["offline-shell", "install-boundary"], requiredAction: "LifeOS регистрирует локальный service worker, если браузер это поддерживает; install prompt контролирует браузер." },
      stt: { status: "not-configured", label: "STT", lastCheckedAt: "", scopes: ["audio-transcript"], requiredAction: "Подключи локальный STT-движок или browser speech; ручная расшифровка уже работает." },
      ocr: { status: "not-configured", label: "OCR", lastCheckedAt: "", scopes: ["receipt-image-text"], requiredAction: "Подключи локальный OCR-движок; ручное извлечение данных из чека уже работает." },
      pdf: { status: "parser-required", label: "PDF-парсер", lastCheckedAt: "", scopes: ["book-source-parse"], requiredAction: "Установи PDF-парсер перед извлечением текста; хранение источника и честный gate уже работают." },
      epub: { status: "parser-required", label: "EPUB-парсер", lastCheckedAt: "", scopes: ["book-source-parse"], requiredAction: "Установи EPUB-парсер перед извлечением текста; TXT/MD reader уже работает." },
      notifications: { status: "permission-required", label: "Уведомления", lastCheckedAt: "", scopes: ["browser-permission"], requiredAction: "Разрешение браузерных уведомлений запрашивается только явно; напоминания видны в Today/Calendar." },
      models: { status: "local-only", label: "Model Hub", lastCheckedAt: "", scopes: ["model-routes", "proposal-mode"], requiredAction: "Model Hub хранит маршруты и границы данных локально; внешний запуск требует явного действия владельца." },
      screen: { status: "permission-required", label: "Screen Companion", lastCheckedAt: "", scopes: ["screen-capture", "active-window-context"], requiredAction: "Чтение экрана включается только явным разрешением владельца; до этого работает ручной импорт скрина/текста." },
      smartHome: { status: "not-connected", label: "Умный дом", lastCheckedAt: "", scopes: ["home-events", "device-control"], requiredAction: "Home Assistant или другой локальный hub подключается адаптером; локальная карта устройств и события работают вручную." },
      marketplace: { status: "local-only", label: "Marketplace систем", lastCheckedAt: "", scopes: ["local-pack-install"], requiredAction: "Паки устанавливаются как локальные system definitions без запуска чужого кода." }
    }, base.providers || {}),
    ollama: Object.assign({
      endpoint: "http://127.0.0.1:11434",
      status: "unchecked",
      models: [],
      selectedModel: "",
      lastError: "",
      lastCheckedAt: "",
      lastProbeAt: "",
      lastGenerationStatus: "",
      lastGenerationSample: "",
      lastLatencyMs: 0,
      scopes: ["active-artifact-analysis"],
      revokedAt: ""
    }, base.ollama || {}),
    backlinks: {},
    ghosts: {},
    graphView: Object.assign({ panX: 0, panY: 0, zoom: 1, selectedNodeId: "", mode: "global", searchQuery: "" }, base.graphView || {}),
    control: Object.assign({
      lastExportSummary: "",
      lastImportSummary: "",
      receipts: [],
      rollbackSnapshots: [],
      corruptRecords: [],
      architectureEvents: [],
      capabilities: {},
      privacyZones: {
        local: "active",
        providers: "gated",
        privateMedia: "manual"
      }
    }, base.control || {}),
    graphFilters: Object.assign({ notes: true, productBrain: false, sources: true, goals: true, tasks: true, money: true, habits: true, insights: true, knowledge: true, chat: true, systems: true, channels: true, models: true, home: true, ghosts: true }, base.graphFilters || {}),
    environment: Object.assign({
      online: true,
      persisted: false,
      storageUsage: 0,
      storageQuota: 0,
      manifestHref: "",
      serviceWorkerSupported: false,
      serviceWorkerStatus: "unchecked",
      serviceWorkerScope: "",
      serviceWorkerUpdatedAt: "",
      installPromptStatus: "not-seen",
      displayMode: "browser",
      pwaLastError: "",
      updatedAt: ""
    }, base.environment || {}),
    auditLog: Array.isArray(base.auditLog) ? base.auditLog.slice(-300) : []
  };
  state.control.rollbackSnapshots = Array.isArray(state.control.rollbackSnapshots) ? state.control.rollbackSnapshots.slice(0, 6) : [];
  state.control.corruptRecords = Array.isArray(state.control.corruptRecords) ? state.control.corruptRecords.slice(0, 20).map((record) => ({
    id: cleanLine(record.id || makeId("corrupt")),
    kind: cleanLine(record.kind || "unknown"),
    title: cleanLine(record.title || "Corrupt record"),
    reason: cleanLine(record.reason || "Record failed validation and was isolated."),
    raw: String(record.raw || ""),
    status: record.status === "recovered" ? "recovered" : "isolated",
    recoveredNoteId: cleanLine(record.recoveredNoteId || ""),
    createdAt: record.createdAt || now(),
    updatedAt: record.updatedAt || record.createdAt || now()
  })) : [];
  state.control.receipts = Array.isArray(state.control.receipts) ? state.control.receipts.slice(-160).map((receipt) => ({
    id: cleanLine(receipt.id || makeId("receipt")),
    kind: cleanLine(receipt.kind || "receipt"),
    objectId: cleanLine(receipt.objectId || ""),
    summary: cleanLine(receipt.summary || ""),
    surface: cleanLine(receipt.surface || ""),
    noteId: cleanLine(receipt.noteId || ""),
    sourceId: cleanLine(receipt.sourceId || ""),
    locality: cleanLine(receipt.locality || "local"),
    createdAt: receipt.createdAt || now()
  })) : [];
  state.control.architectureEvents = Array.isArray(state.control.architectureEvents) ? state.control.architectureEvents.slice(-80).map((event) => ({
    id: cleanLine(event.id || makeId("arch")),
    type: cleanLine(event.type || "architecture.event"),
    summary: cleanLine(event.summary || ""),
    activeSurface: cleanLine(event.activeSurface || ""),
    activeArtifactId: cleanLine(event.activeArtifactId || ""),
    revision: Number.isFinite(Number(event.revision)) ? Number(event.revision) : 0,
    createdAt: event.createdAt || now()
  })) : [];
  state.control.privacyZones = Object.assign({
    local: "active",
    providers: "gated",
    privateMedia: "manual"
  }, state.control.privacyZones || {});
  state.control.capabilities = state.control.capabilities && typeof state.control.capabilities === "object" ? state.control.capabilities : {};
  for (const grant of Object.values(state.control.capabilities)) {
    grant.id = cleanLine(grant.id || makeId("capability"));
    grant.resource = cleanLine(grant.resource || "provider");
    grant.action = cleanLine(grant.action || "run");
    grant.scope = cleanLine(grant.scope || "provider-action");
    grant.locality = cleanLine(grant.locality || "local");
    grant.approval = cleanLine(grant.approval || "explicit-user-action");
    grant.budget = grant.budget && typeof grant.budget === "object" ? grant.budget : { limit: 0, spent: 0, unit: "unmetered-local" };
    grant.grantedAt = grant.grantedAt || now();
    grant.revokedAt = String(grant.revokedAt || "");
  }
  state.designStudio.viewPresets = state.designStudio.viewPresets && typeof state.designStudio.viewPresets === "object" ? state.designStudio.viewPresets : {};
  for (const surface of Object.keys(state.designStudio.viewPresets)) {
    state.designStudio.viewPresets[surface] = normalizeViewPreset(state.designStudio.viewPresets[surface]);
  }
  state.control.inspectorRenderer = RENDERER_MODES.includes(state.control.inspectorRenderer) ? state.control.inspectorRenderer : "card";
  for (const system of Object.values(state.systemDefinitions || {})) {
    system.entities = Array.isArray(system.entities) ? system.entities.map(normalizeSystemEntity) : [];
    system.triggers = Array.isArray(system.triggers) ? system.triggers.map((trigger) => Object.assign(normalizeSystemTrigger(trigger), { id: trigger.id || makeId("trigger") })) : [];
  }
  evaluateDailySystemTriggers(state);
  for (const record of Object.values(state.systemRecords || {})) {
    record.title = cleanLine(record.title || record.entityName || "Запись");
    record.systemId = cleanLine(record.systemId || "");
    record.entityName = cleanLine(record.entityName || "");
    record.fields = record.fields && typeof record.fields === "object" ? record.fields : {};
    record.deleted = Boolean(record.deleted);
    record.createdAt = record.createdAt || now();
    record.updatedAt = record.updatedAt || record.createdAt;
  }
  if (!state.control.devGraphFilterMigrated) {
    state.graphFilters.productBrain = false;
    state.control.devGraphFilterMigrated = true;
  }
  const folderValues = Object.values(state.folders);
  if (!folderValues.length) {
    const seeded = createInitialState();
    return normalizeState(seeded);
  }
  const activeFolderExists = Boolean(state.folders[state.activeFolderId]);
  if (!activeFolderExists) state.activeFolderId = folderValues[0].id;
  const liveNotes = Object.values(state.notes).filter((note) => !note.deleted);
  const activeNoteExists = state.activeNoteId && state.notes[state.activeNoteId] && !state.notes[state.activeNoteId].deleted;
  if (!activeNoteExists) state.activeNoteId = liveNotes.length ? liveNotes[0].id : "";
  for (const note of Object.values(state.notes)) {
    note.title = cleanLine(note.title || "Untitled");
    note.body = String(note.body || "");
    note.folderId = state.folders[note.folderId] ? note.folderId : state.activeFolderId;
    note.tags = Array.isArray(note.tags) ? note.tags : [];
    note.links = Array.isArray(note.links) ? note.links : [];
    note.deleted = Boolean(note.deleted);
    note.createdAt = note.createdAt || now();
    note.updatedAt = note.updatedAt || note.createdAt;
  }
  for (const search of Object.values(state.savedSearches || {})) {
    search.id = cleanLine(search.id || makeId("search"));
    search.title = cleanLine(search.title || ("Поиск: " + shorten(search.query || "", 42)));
    search.query = cleanLine(search.query || "");
    search.surface = cleanLine(search.surface || "library");
    search.resultCount = Number.isFinite(Number(search.resultCount)) ? Number(search.resultCount) : 0;
    search.noteId = state.notes[search.noteId] && !state.notes[search.noteId].deleted ? search.noteId : "";
    search.deleted = Boolean(search.deleted);
    search.createdAt = search.createdAt || now();
    search.updatedAt = search.updatedAt || search.createdAt;
  }
  for (const source of Object.values(state.sources)) {
    source.name = cleanLine(source.name || "Imported source");
    source.kind = cleanLine(source.kind || "file");
    source.mime = cleanLine(source.mime || "");
    source.size = Number.isFinite(Number(source.size)) ? Number(source.size) : 0;
    source.text = String(source.text || "");
    source.dataUrl = String(source.dataUrl || "");
    source.noteId = state.notes[source.noteId] && !state.notes[source.noteId].deleted ? source.noteId : "";
    source.transcriptText = String(source.transcriptText || "");
    source.transcriptStatus = cleanLine(source.transcriptStatus || "");
    source.status = cleanLine(source.status || "stored");
    source.parserStatus = cleanLine(source.parserStatus || source.status || "stored");
    source.analysis = normalizeArtifactAnalysis(source.analysis, source);
    source.deleted = Boolean(source.deleted);
    source.createdAt = source.createdAt || now();
    source.updatedAt = source.updatedAt || source.createdAt;
  }
  for (const segment of Object.values(state.transcriptSegments || {})) {
    segment.sourceId = state.sources[segment.sourceId] && !state.sources[segment.sourceId].deleted ? segment.sourceId : "";
    segment.noteId = state.notes[segment.noteId] && !state.notes[segment.noteId].deleted ? segment.noteId : "";
    segment.index = Number.isFinite(Number(segment.index)) ? Number(segment.index) : 0;
    segment.timecode = cleanLine(segment.timecode || "");
    segment.text = String(segment.text || "");
    segment.status = segment.status === "archived" ? "archived" : "open";
    segment.deleted = Boolean(segment.deleted);
    segment.createdAt = segment.createdAt || now();
    segment.updatedAt = segment.updatedAt || segment.createdAt;
  }
  for (const checkpoint of Object.values(state.audioCheckpoints || {})) {
    checkpoint.title = cleanLine(checkpoint.title || "Audio checkpoint");
    checkpoint.sourceId = state.sources[checkpoint.sourceId] && !state.sources[checkpoint.sourceId].deleted ? checkpoint.sourceId : "";
    checkpoint.noteId = state.notes[checkpoint.noteId] && !state.notes[checkpoint.noteId].deleted ? checkpoint.noteId : "";
    checkpoint.timecode = cleanLine(checkpoint.timecode || "");
    checkpoint.note = String(checkpoint.note || "");
    checkpoint.status = checkpoint.status === "done" ? "done" : "open";
    checkpoint.deleted = Boolean(checkpoint.deleted);
    checkpoint.createdAt = checkpoint.createdAt || now();
    checkpoint.updatedAt = checkpoint.updatedAt || checkpoint.createdAt;
  }
  for (const playerNote of Object.values(state.playerNotes || {})) {
    playerNote.title = cleanLine(playerNote.title || "Player note");
    playerNote.text = String(playerNote.text || "");
    playerNote.sourceId = state.sources[playerNote.sourceId] && !state.sources[playerNote.sourceId].deleted ? playerNote.sourceId : "";
    playerNote.noteId = state.notes[playerNote.noteId] && !state.notes[playerNote.noteId].deleted ? playerNote.noteId : "";
    playerNote.segmentId = state.transcriptSegments[playerNote.segmentId] && !state.transcriptSegments[playerNote.segmentId].deleted ? playerNote.segmentId : "";
    playerNote.status = playerNote.status === "archived" ? "archived" : "open";
    playerNote.deleted = Boolean(playerNote.deleted);
    playerNote.createdAt = playerNote.createdAt || now();
    playerNote.updatedAt = playerNote.updatedAt || playerNote.createdAt;
  }
  for (const goal of Object.values(state.goals)) {
    goal.title = cleanLine(goal.title || "Untitled goal");
    goal.noteId = state.notes[goal.noteId] && !state.notes[goal.noteId].deleted ? goal.noteId : "";
    goal.sourceId = state.sources[goal.sourceId] && !state.sources[goal.sourceId].deleted ? goal.sourceId : "";
    goal.targetAmount = Number.isFinite(Number(goal.targetAmount)) ? Number(goal.targetAmount) : 0;
    goal.targetDate = cleanLine(goal.targetDate || "");
    goal.progress = Number.isFinite(Number(goal.progress)) ? Number(goal.progress) : 0;
    goal.status = goal.status === "done" ? "done" : "active";
    goal.deleted = Boolean(goal.deleted);
    goal.createdAt = goal.createdAt || now();
    goal.updatedAt = goal.updatedAt || goal.createdAt;
  }
  for (const reminder of Object.values(state.reminders)) {
    reminder.title = cleanLine(reminder.title || "Reminder");
    reminder.noteId = state.notes[reminder.noteId] && !state.notes[reminder.noteId].deleted ? reminder.noteId : "";
    reminder.sourceId = state.sources[reminder.sourceId] && !state.sources[reminder.sourceId].deleted ? reminder.sourceId : "";
    reminder.day = cleanLine(reminder.day || todayKey());
    reminder.time = normalizeTime(reminder.time || "");
    reminder.status = reminder.status === "done" ? "done" : "open";
    reminder.deleted = Boolean(reminder.deleted);
    reminder.createdAt = reminder.createdAt || now();
    reminder.updatedAt = reminder.updatedAt || reminder.createdAt;
  }
  for (const habit of Object.values(state.habits)) {
    habit.title = cleanLine(habit.title || "Habit");
    habit.noteId = state.notes[habit.noteId] && !state.notes[habit.noteId].deleted ? habit.noteId : "";
    habit.sourceId = state.sources[habit.sourceId] && !state.sources[habit.sourceId].deleted ? habit.sourceId : "";
    habit.frequency = cleanLine(habit.frequency || "daily");
    habit.checkins = habit.checkins && typeof habit.checkins === "object" ? habit.checkins : {};
    habit.status = habit.status === "paused" ? "paused" : "active";
    habit.deleted = Boolean(habit.deleted);
    habit.createdAt = habit.createdAt || now();
    habit.updatedAt = habit.updatedAt || habit.createdAt;
  }
  for (const account of Object.values(state.financeAccounts)) {
    account.name = cleanLine(account.name || "Account");
    account.balance = Number.isFinite(Number(account.balance)) ? Number(account.balance) : 0;
    account.currency = cleanLine(account.currency || "RUB");
    account.deleted = Boolean(account.deleted);
    account.createdAt = account.createdAt || now();
    account.updatedAt = account.updatedAt || account.createdAt;
  }
  for (const tx of Object.values(state.financeTransactions)) {
    tx.title = cleanLine(tx.title || "Transaction");
    tx.amount = Number.isFinite(Number(tx.amount)) ? Number(tx.amount) : 0;
    tx.kind = ["expense", "income", "transfer", "debt"].includes(tx.kind) ? tx.kind : "expense";
    tx.category = cleanLine(tx.category || "Разное");
    tx.accountId = state.financeAccounts[tx.accountId] ? tx.accountId : "";
    tx.day = cleanLine(tx.day || todayKey());
    tx.noteId = state.notes[tx.noteId] && !state.notes[tx.noteId].deleted ? tx.noteId : "";
    tx.sourceId = state.sources[tx.sourceId] && !state.sources[tx.sourceId].deleted ? tx.sourceId : "";
    tx.deleted = Boolean(tx.deleted);
    tx.createdAt = tx.createdAt || now();
    tx.updatedAt = tx.updatedAt || tx.createdAt;
  }
  for (const budget of Object.values(state.budgets)) {
    budget.category = cleanLine(budget.category || "Разное");
    budget.limit = Number.isFinite(Number(budget.limit)) ? Number(budget.limit) : 0;
    budget.period = cleanLine(budget.period || "month");
    budget.noteId = state.notes[budget.noteId] && !state.notes[budget.noteId].deleted ? budget.noteId : "";
    budget.sourceId = state.sources[budget.sourceId] && !state.sources[budget.sourceId].deleted ? budget.sourceId : "";
    budget.deleted = Boolean(budget.deleted);
    budget.createdAt = budget.createdAt || now();
    budget.updatedAt = budget.updatedAt || budget.createdAt;
  }
  for (const subscription of Object.values(state.subscriptions)) {
    subscription.title = cleanLine(subscription.title || "Subscription");
    subscription.amount = Number.isFinite(Number(subscription.amount)) ? Number(subscription.amount) : 0;
    subscription.category = cleanLine(subscription.category || "Подписки");
    subscription.day = cleanLine(subscription.day || todayKey());
    subscription.status = subscription.status === "inactive" ? "inactive" : "active";
    subscription.noteId = state.notes[subscription.noteId] && !state.notes[subscription.noteId].deleted ? subscription.noteId : "";
    subscription.sourceId = state.sources[subscription.sourceId] && !state.sources[subscription.sourceId].deleted ? subscription.sourceId : "";
    subscription.deleted = Boolean(subscription.deleted);
    subscription.createdAt = subscription.createdAt || now();
    subscription.updatedAt = subscription.updatedAt || subscription.createdAt;
  }
  for (const insight of Object.values(state.insights)) {
    insight.title = cleanLine(insight.title || "Insight");
    insight.reason = String(insight.reason || "");
    insight.status = insight.status === "ignored" || insight.status === "applied" ? insight.status : "open";
    insight.noteId = state.notes[insight.noteId] && !state.notes[insight.noteId].deleted ? insight.noteId : "";
    insight.sourceId = state.sources[insight.sourceId] && !state.sources[insight.sourceId].deleted ? insight.sourceId : "";
    insight.createdAt = insight.createdAt || now();
    insight.updatedAt = insight.updatedAt || insight.createdAt;
  }
  for (const claim of Object.values(state.claims)) {
    claim.title = cleanLine(claim.title || "Claim");
    claim.body = String(claim.body || "");
    claim.quote = String(claim.quote || "");
    claim.noteId = state.notes[claim.noteId] && !state.notes[claim.noteId].deleted ? claim.noteId : "";
    claim.sourceId = state.sources[claim.sourceId] && !state.sources[claim.sourceId].deleted ? claim.sourceId : "";
    claim.status = claim.status === "archived" ? "archived" : "open";
    claim.deleted = Boolean(claim.deleted);
    claim.createdAt = claim.createdAt || now();
    claim.updatedAt = claim.updatedAt || claim.createdAt;
  }
  for (const question of Object.values(state.questions)) {
    question.title = cleanLine(question.title || "Question");
    question.body = String(question.body || "");
    question.quote = String(question.quote || "");
    question.noteId = state.notes[question.noteId] && !state.notes[question.noteId].deleted ? question.noteId : "";
    question.sourceId = state.sources[question.sourceId] && !state.sources[question.sourceId].deleted ? question.sourceId : "";
    question.status = question.status === "ignored" || question.status === "applied" ? question.status : "open";
    question.deleted = Boolean(question.deleted);
    question.createdAt = question.createdAt || now();
    question.updatedAt = question.updatedAt || question.createdAt;
  }
  for (const reviewItem of Object.values(state.reviewItems)) {
    reviewItem.title = cleanLine(reviewItem.title || "Review item");
    reviewItem.noteId = state.notes[reviewItem.noteId] && !state.notes[reviewItem.noteId].deleted ? reviewItem.noteId : "";
    reviewItem.sourceId = state.sources[reviewItem.sourceId] && !state.sources[reviewItem.sourceId].deleted ? reviewItem.sourceId : "";
    reviewItem.day = cleanLine(reviewItem.day || dateKeyFromOffset(7));
    reviewItem.status = reviewItem.status === "done" ? "done" : "open";
    reviewItem.deleted = Boolean(reviewItem.deleted);
    reviewItem.createdAt = reviewItem.createdAt || now();
    reviewItem.updatedAt = reviewItem.updatedAt || reviewItem.createdAt;
  }
  for (const readingItem of Object.values(state.readingItems)) {
    readingItem.title = cleanLine(readingItem.title || "Reading item");
    readingItem.sourceId = state.sources[readingItem.sourceId] && !state.sources[readingItem.sourceId].deleted ? readingItem.sourceId : "";
    readingItem.noteId = state.notes[readingItem.noteId] && !state.notes[readingItem.noteId].deleted ? readingItem.noteId : "";
    readingItem.kind = cleanLine(readingItem.kind || "book");
    readingItem.status = ["queued", "reading", "done", "gated"].includes(readingItem.status) ? readingItem.status : "queued";
    readingItem.progress = Number.isFinite(Number(readingItem.progress)) ? Math.max(0, Math.min(100, Number(readingItem.progress))) : 0;
    readingItem.parserStatus = cleanLine(readingItem.parserStatus || "");
    readingItem.deleted = Boolean(readingItem.deleted);
    readingItem.createdAt = readingItem.createdAt || now();
    readingItem.updatedAt = readingItem.updatedAt || readingItem.createdAt;
  }
  for (const highlight of Object.values(state.highlights)) {
    highlight.title = cleanLine(highlight.title || "Highlight");
    highlight.text = String(highlight.text || "");
    highlight.sourceId = state.sources[highlight.sourceId] && !state.sources[highlight.sourceId].deleted ? highlight.sourceId : "";
    highlight.noteId = state.notes[highlight.noteId] && !state.notes[highlight.noteId].deleted ? highlight.noteId : "";
    highlight.readingItemId = state.readingItems[highlight.readingItemId] && !state.readingItems[highlight.readingItemId].deleted ? highlight.readingItemId : "";
    highlight.status = highlight.status === "archived" ? "archived" : "open";
    highlight.deleted = Boolean(highlight.deleted);
    highlight.createdAt = highlight.createdAt || now();
    highlight.updatedAt = highlight.updatedAt || highlight.createdAt;
  }
  for (const task of Object.values(state.tasks)) {
    task.title = cleanLine(task.title || "Untitled task");
    task.noteId = state.notes[task.noteId] && !state.notes[task.noteId].deleted ? task.noteId : "";
    task.sourceId = state.sources[task.sourceId] && !state.sources[task.sourceId].deleted ? task.sourceId : "";
    task.goalId = state.goals[task.goalId] ? task.goalId : "";
    task.day = cleanLine(task.day || todayKey());
    task.startTime = normalizeTime(task.startTime || "");
    task.endTime = normalizeTime(task.endTime || "");
    task.dateHint = cleanLine(task.dateHint || "");
    task.status = task.status === "done" ? "done" : "open";
    task.deleted = Boolean(task.deleted);
    task.createdAt = task.createdAt || now();
    task.updatedAt = task.updatedAt || task.createdAt;
  }
  for (const block of Object.values(state.planBlocks)) {
    block.title = cleanLine(block.title || "Plan block");
    block.noteId = state.notes[block.noteId] && !state.notes[block.noteId].deleted ? block.noteId : "";
    block.sourceId = state.sources[block.sourceId] ? block.sourceId : "";
    block.day = cleanLine(block.day || todayKey());
    block.startTime = normalizeTime(block.startTime || "");
    block.endTime = normalizeTime(block.endTime || "");
    block.dateHint = cleanLine(block.dateHint || "");
    block.status = cleanLine(block.status || "planned");
    block.deleted = Boolean(block.deleted);
    block.createdAt = block.createdAt || now();
    block.updatedAt = block.updatedAt || block.createdAt;
  }
  for (const proposal of Object.values(state.proposals)) {
    proposal.title = cleanLine(proposal.title || "Suggested action");
    proposal.type = cleanLine(proposal.type || "task");
    proposal.group = cleanLine(proposal.group || groupForProposalType(proposal.type));
    proposal.destination = cleanLine(proposal.destination || destinationForProposalType(proposal.type));
    proposal.reason = cleanLine(proposal.reason || "Найдено в источнике");
    proposal.quote = cleanLine(proposal.quote || "");
    proposal.confidence = Number.isFinite(Number(proposal.confidence)) ? Math.max(0, Math.min(1, Number(proposal.confidence))) : 0.7;
    proposal.fields = proposal.fields && typeof proposal.fields === "object" ? proposal.fields : {};
    proposal.appliedObjectId = cleanLine(proposal.appliedObjectId || "");
    proposal.noteId = state.notes[proposal.noteId] && !state.notes[proposal.noteId].deleted ? proposal.noteId : "";
    proposal.sourceId = state.sources[proposal.sourceId] && !state.sources[proposal.sourceId].deleted ? proposal.sourceId : "";
    proposal.status = proposal.status === "applied" || proposal.status === "dismissed" ? proposal.status : "open";
    proposal.createdAt = proposal.createdAt || now();
    proposal.updatedAt = proposal.updatedAt || proposal.createdAt;
  }
  for (const message of Object.values(state.chatMessages)) {
    message.role = message.role === "assistant" ? "assistant" : "owner";
    message.text = String(message.text || "");
    message.noteId = state.notes[message.noteId] && !state.notes[message.noteId].deleted ? message.noteId : "";
    message.sourceId = state.sources[message.sourceId] && !state.sources[message.sourceId].deleted ? message.sourceId : "";
    message.entityType = cleanLine(message.entityType || "chat-message");
    message.artifactKind = cleanLine(message.artifactKind || "chat");
    message.searchText = cleanLine(message.searchText || [message.role, message.text].join(" "));
    message.receiptId = cleanLine(message.receiptId || "");
    message.deleted = Boolean(message.deleted) || (message.role === "assistant" && isLegacyChatStubText(message.text || message.content || ""));
    message.createdAt = message.createdAt || now();
  }
  for (const run of Object.values(state.agentRuns)) {
    run.name = cleanLine(run.name || "Local agent");
    run.status = cleanLine(run.status || "ready");
    run.sourceId = state.sources[run.sourceId] && !state.sources[run.sourceId].deleted ? run.sourceId : "";
    run.noteId = state.notes[run.noteId] && !state.notes[run.noteId].deleted ? run.noteId : "";
    run.summary = String(run.summary || "");
    run.scopes = Array.isArray(run.scopes) ? run.scopes.map(cleanLine).filter(Boolean) : [];
    run.proposedActions = Array.isArray(run.proposedActions) ? run.proposedActions : [];
    run.createdAt = run.createdAt || now();
    run.updatedAt = run.updatedAt || run.createdAt;
  }
  for (const run of Object.values(state.providerRuns || {})) {
    run.providerId = cleanLine(run.providerId || "provider");
    run.kind = cleanLine(run.kind || "probe");
    run.status = cleanLine(run.status || "recorded");
    run.sourceId = state.sources[run.sourceId] && !state.sources[run.sourceId].deleted ? run.sourceId : "";
    run.noteId = state.notes[run.noteId] && !state.notes[run.noteId].deleted ? run.noteId : "";
    run.summary = String(run.summary || "");
    run.details = run.details && typeof run.details === "object" ? run.details : {};
    run.createdAt = run.createdAt || now();
    run.updatedAt = run.updatedAt || run.createdAt;
  }
  for (const flow of Object.values(state.flows)) {
    flow.name = cleanLine(flow.name || "Local flow");
    flow.steps = Array.isArray(flow.steps) ? flow.steps : [];
    flow.status = cleanLine(flow.status || "ready");
    flow.runCount = Number.isFinite(Number(flow.runCount)) ? Number(flow.runCount) : 0;
    flow.createdAt = flow.createdAt || now();
    flow.updatedAt = flow.updatedAt || flow.createdAt;
  }
  for (const run of Object.values(state.flowRuns || {})) {
    run.flowId = state.flows[run.flowId] ? run.flowId : "";
    run.status = cleanLine(run.status || "dry-run");
    run.sourceId = state.sources[run.sourceId] && !state.sources[run.sourceId].deleted ? run.sourceId : "";
    run.noteId = state.notes[run.noteId] && !state.notes[run.noteId].deleted ? run.noteId : "";
    run.summary = String(run.summary || "");
    run.proposalIds = Array.isArray(run.proposalIds) ? run.proposalIds.filter((proposalId) => state.proposals[proposalId]) : [];
    run.createdAt = run.createdAt || now();
    run.updatedAt = run.updatedAt || run.createdAt;
  }
  const providerRussianMeta = {
    mail: { label: "Почта", requiredAction: "" },
    calendar: { label: "Календарь", requiredAction: "" },
    calendarSync: { label: "Внешний календарь", requiredAction: "Нужны OAuth-данные владельца для синхронизации внешнего календаря; локальный календарь уже работает." },
    automation: { label: "Потоки", requiredAction: "" },
    player: { label: "Плеер", requiredAction: "" },
    pwa: { label: "PWA / офлайн-оболочка", requiredAction: "LifeOS регистрирует локальный service worker, если браузер это поддерживает; install prompt контролирует браузер." },
    stt: { label: "STT", requiredAction: "Подключи локальный STT-движок или browser speech; ручная расшифровка уже работает." },
    ocr: { label: "OCR", requiredAction: "Подключи локальный OCR-движок; ручное извлечение данных из чека уже работает." },
    pdf: { label: "PDF-парсер", requiredAction: "Установи PDF-парсер перед извлечением текста; хранение источника и честный gate уже работают." },
    epub: { label: "EPUB-парсер", requiredAction: "Установи EPUB-парсер перед извлечением текста; TXT/MD reader уже работает." },
    notifications: { label: "Уведомления", requiredAction: "Разрешение браузерных уведомлений запрашивается только явно; напоминания видны в Today/Calendar." },
    models: { label: "Model Hub", requiredAction: "Model Hub хранит маршруты и границы данных локально; внешний запуск требует явного действия владельца." },
    screen: { label: "Screen Companion", requiredAction: "Чтение экрана включается только явным разрешением владельца; до этого работает ручной импорт скрина/текста." },
    smartHome: { label: "Умный дом", requiredAction: "Home Assistant или другой локальный hub подключается адаптером; локальная карта устройств и события работают вручную." },
    marketplace: { label: "Marketplace систем", requiredAction: "Паки устанавливаются как локальные system definitions без запуска чужого кода." }
  };
  for (const [providerKey, provider] of Object.entries(state.providers)) {
    provider.status = cleanLine(provider.status || "not-connected");
    provider.label = cleanLine(provider.label || "Provider");
    provider.endpoint = cleanLine(provider.endpoint || "");
    provider.lastProbeAt = String(provider.lastProbeAt || provider.lastCheckedAt || "");
    provider.lastError = String(provider.lastError || "");
    provider.scopes = Array.isArray(provider.scopes) ? provider.scopes.map(cleanLine).filter(Boolean) : [];
    provider.revokedAt = String(provider.revokedAt || "");
    provider.requiredAction = String(provider.requiredAction || "");
    provider.lastCheckedAt = String(provider.lastCheckedAt || "");
    if (providerRussianMeta[providerKey]) {
      provider.label = providerRussianMeta[providerKey].label;
      if (providerRussianMeta[providerKey].requiredAction) {
        provider.requiredAction = providerRussianMeta[providerKey].requiredAction;
      }
    }
  }
  ensureProductBrain(state);
  ensureV34Platform(state);
  for (const key of Object.keys(state.graphFilters)) {
    state.graphFilters[key] = state.graphFilters[key] !== false;
  }
  state.environment.online = state.environment.online !== false;
  state.environment.persisted = Boolean(state.environment.persisted);
  state.environment.storageUsage = Number.isFinite(Number(state.environment.storageUsage)) ? Number(state.environment.storageUsage) : 0;
  state.environment.storageQuota = Number.isFinite(Number(state.environment.storageQuota)) ? Number(state.environment.storageQuota) : 0;
  state.environment.manifestHref = String(state.environment.manifestHref || "");
  state.environment.serviceWorkerSupported = Boolean(state.environment.serviceWorkerSupported);
  state.environment.serviceWorkerStatus = cleanLine(state.environment.serviceWorkerStatus || "unchecked");
  state.environment.serviceWorkerScope = String(state.environment.serviceWorkerScope || "");
  state.environment.serviceWorkerUpdatedAt = String(state.environment.serviceWorkerUpdatedAt || "");
  state.environment.installPromptStatus = cleanLine(state.environment.installPromptStatus || "not-seen");
  state.environment.displayMode = cleanLine(state.environment.displayMode || "browser");
  state.environment.pwaLastError = String(state.environment.pwaLastError || "");
  state.environment.updatedAt = String(state.environment.updatedAt || "");
  if (!/^https?:\/\//.test(state.ollama.endpoint || "")) state.ollama.endpoint = "http://127.0.0.1:11434";
  if (!Array.isArray(state.ollama.models)) state.ollama.models = [];
  state.ollama.status = cleanLine(state.ollama.status || "unchecked");
  state.ollama.selectedModel = cleanLine(state.ollama.selectedModel || state.ollama.models[0] || "");
  state.ollama.lastError = String(state.ollama.lastError || "");
  state.ollama.lastCheckedAt = String(state.ollama.lastCheckedAt || "");
  state.ollama.lastProbeAt = String(state.ollama.lastProbeAt || state.ollama.lastCheckedAt || "");
  state.ollama.lastGenerationStatus = cleanLine(state.ollama.lastGenerationStatus || "");
  state.ollama.lastGenerationSample = String(state.ollama.lastGenerationSample || "");
  state.ollama.lastLatencyMs = Number.isFinite(Number(state.ollama.lastLatencyMs)) ? Number(state.ollama.lastLatencyMs) : 0;
  state.ollama.scopes = Array.isArray(state.ollama.scopes) ? state.ollama.scopes.map(cleanLine).filter(Boolean) : ["active-artifact-analysis"];
  state.ollama.revokedAt = String(state.ollama.revokedAt || "");
  if (state.uiRevision !== UI_REVISION) {
    state.activeSurface = "inbox";
    state.uiRevision = UI_REVISION;
  }
  applyObjectContractToState(state);
  rebuildIndexes(state);
  return state;
}

// The 14 strong mutations (Seven Contracts, "Receipt" contract): every audit event whose
// type matches one of these rules also gets a receipt in state.control.receipts, in
// addition to the existing auditLog entry. Ordered list, first match wins, since some
// types (e.g. twin.snapshot) are more precisely a memory-write than a generic create.
const STRONG_MUTATION_RULES = [
  { kind: "memory-write", test: (type) => type.startsWith("knowledge.extract") || type.startsWith("insight.refresh") || type.startsWith("chat.product_brain") || type.startsWith("twin.snapshot") },
  { kind: "merge", test: (type) => type.startsWith("ghost.materialize") },
  { kind: "design-apply", test: (type) => type.startsWith("design.profile") },
  { kind: "pack-install", test: (type) => type.startsWith("marketplace.install") },
  { kind: "permission-change", test: (type) => type.startsWith("provider.prepare") || type.startsWith("screen.prepare") || type.startsWith("capability.") || type.endsWith(".revoke") },
  { kind: "model-call", test: (type) => type.startsWith("ollama.") || type.startsWith("model.route") || type.startsWith("provider.run") },
  { kind: "workflow-run", test: (type) => type.startsWith("flow.") || type.startsWith("agent.run") },
  { kind: "export", test: (type) => type.startsWith("vault.export") || type.startsWith("control.export") },
  { kind: "import", test: (type) => type.startsWith("source.import") || type.startsWith("control.backup.import") },
  { kind: "publish", test: (type) => type.endsWith(".publish") },
  { kind: "share", test: (type) => type.endsWith(".share") },
  { kind: "delete", test: (type) => type.endsWith(".delete") || type.endsWith(".archive") },
  { kind: "update", test: (type) => type.endsWith(".update") || type.endsWith(".toggle") || type.endsWith(".progress") || type.endsWith(".rename") || type.endsWith(".move") || type.endsWith(".reschedule") || type.endsWith(".check") },
  { kind: "create", test: (type) => type.endsWith(".create") || type.endsWith(".device") || type.endsWith(".row") || type.endsWith(".item") || type.endsWith(".account") || type.endsWith(".transaction") || type.endsWith(".budget") || type.endsWith(".subscription") }
];

function classifyStrongMutation(type) {
  const rule = STRONG_MUTATION_RULES.find((entry) => entry.test(type));
  return rule ? rule.kind : "";
}

function addReceipt(state, kind, objectId, summary, options = {}) {
  state.control.receipts.push({
    id: makeId("receipt"),
    kind,
    objectId: objectId || "",
    summary,
    surface: options.surface || state.activeSurface || "",
    noteId: options.noteId || "",
    sourceId: options.sourceId || "",
    locality: options.locality || "local",
    createdAt: now()
  });
  state.control.receipts = state.control.receipts.slice(-160);
}

function addAudit(state, type, summary, noteId) {
  state.auditLog.push({
    id: makeId("audit"),
    type,
    summary,
    noteId: noteId || "",
    createdAt: now()
  });
  state.auditLog = state.auditLog.slice(-300);
  state.commandMessage = summary;
  const mutationKind = classifyStrongMutation(type);
  if (mutationKind) addReceipt(state, mutationKind, noteId || "", summary, { noteId: noteId || "" });
}

function parseWikiInner(inner) {
  const parts = String(inner).split("|");
  const targetTitle = cleanLine(parts[0]);
  const alias = parts.length > 1 ? cleanLine(parts.slice(1).join("|")) : "";
  return {
    targetTitle,
    alias,
    normalized: normalizeTitle(targetTitle)
  };
}

function extractWikiLinks(body) {
  const links = [];
  const seen = new Set();
  const text = String(body || "");
  const pattern = new RegExp(WIKI_LINK_PATTERN.source, "g");
  let match = pattern.exec(text);
  while (match) {
    const parsed = parseWikiInner(match[1]);
    if (parsed.targetTitle) {
      const key = parsed.normalized + "|" + parsed.alias;
      if (!seen.has(key)) {
        seen.add(key);
        links.push({
          targetTitle: parsed.targetTitle,
          alias: parsed.alias,
          normalized: parsed.normalized,
          start: match.index,
          end: match.index + match[0].length,
          raw: match[0]
        });
      }
    }
    match = pattern.exec(text);
  }
  return links;
}

function notesByNormalizedTitle(state) {
  const lookup = {};
  for (const note of Object.values(state.notes)) {
    if (!note.deleted) lookup[normalizeTitle(note.title)] = note.id;
  }
  return lookup;
}

function rebuildIndexes(state) {
  state.graphProjectionStamp = Number(state.graphProjectionStamp || 0) + 1;
  graphProjectionCache.delete(state);
  const titleLookup = notesByNormalizedTitle(state);
  const backlinks = {};
  const ghosts = {};
  for (const note of Object.values(state.notes)) {
    if (note.deleted) {
      note.links = [];
      continue;
    }
    const parsedLinks = extractWikiLinks(note.body);
    const resolved = [];
    for (const link of parsedLinks) {
      const targetId = titleLookup[link.normalized] || "";
      if (targetId) {
        if (!backlinks[targetId]) backlinks[targetId] = [];
        if (!backlinks[targetId].includes(note.id)) backlinks[targetId].push(note.id);
        resolved.push({
          targetTitle: link.targetTitle,
          alias: link.alias,
          targetId,
          ghostId: "",
          status: "resolved"
        });
      } else {
        const ghostId = ghostIdForTitle(link.targetTitle);
        if (!ghosts[ghostId]) {
          ghosts[ghostId] = {
            id: ghostId,
            title: link.targetTitle,
            normalized: link.normalized,
            inboundNoteIds: [],
            createdAt: now(),
            updatedAt: now()
          };
        }
        if (!ghosts[ghostId].inboundNoteIds.includes(note.id)) ghosts[ghostId].inboundNoteIds.push(note.id);
        resolved.push({
          targetTitle: link.targetTitle,
          alias: link.alias,
          targetId: "",
          ghostId,
          status: "ghost"
        });
      }
    }
    note.links = resolved;
  }
  state.backlinks = backlinks;
  state.ghosts = ghosts;
  return state;
}

function replaceWikiLinksForRename(body, oldTitle, newTitle) {
  const oldNormalized = normalizeTitle(oldTitle);
  const pattern = new RegExp(WIKI_LINK_PATTERN.source, "g");
  const text = String(body || "");
  let output = "";
  let cursor = 0;
  let match = pattern.exec(text);
  while (match) {
    const parsed = parseWikiInner(match[1]);
    output += text.slice(cursor, match.index);
    if (parsed.normalized === oldNormalized) {
      const alias = parsed.alias ? "|" + parsed.alias : "";
      output += "[[" + newTitle + alias + "]]";
    } else {
      output += match[0];
    }
    cursor = match.index + match[0].length;
    match = pattern.exec(text);
  }
  return output + text.slice(cursor);
}

function renderMarkdown(body, state) {
  const titleLookup = notesByNormalizedTitle(state);
  const text = escapeHtml(body || "");
  return text
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\[\[(.*?)\]\]/g, (full, inner) => {
      const parsed = parseWikiInner(inner);
      const label = parsed.alias || parsed.targetTitle;
      const targetId = titleLookup[parsed.normalized] || "";
      const ghostId = targetId ? "" : ghostIdForTitle(parsed.targetTitle);
      const action = targetId ? "open-note" : "create-from-ghost";
      const id = targetId || ghostId;
      const kind = targetId ? "wiki resolved" : "wiki ghost";
      return "<button class=\"" + kind + "\" data-action=\"" + action + "\" data-id=\"" + escapeHtml(id) + "\">[[" + escapeHtml(label) + "]]</button>";
    })
    .replace(/\n/g, "<br>");
}

function buildFolderTree(state) {
  const folders = Object.values(state.folders).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name);
  });
  const childrenByParent = {};
  for (const folder of folders) {
    const parent = folder.parentId || "root";
    if (!childrenByParent[parent]) childrenByParent[parent] = [];
    childrenByParent[parent].push(folder);
  }
  const notes = Object.values(state.notes).filter((note) => !note.deleted);
  function countNotes(folderId, visited) {
    if (visited.has(folderId)) return 0;
    visited.add(folderId);
    let count = notes.filter((note) => note.folderId === folderId).length;
    const children = childrenByParent[folderId] || [];
    for (const child of children) count += countNotes(child.id, visited);
    return count;
  }
  function makeNode(folder, depth, visited) {
    if (visited.has(folder.id)) {
      return {
        id: folder.id,
        name: folder.name,
        depth,
        noteCount: notes.filter((note) => note.folderId === folder.id).length,
        children: []
      };
    }
    visited.add(folder.id);
    const childFolders = childrenByParent[folder.id] || [];
    return {
      id: folder.id,
      name: folder.name,
      depth,
      noteCount: countNotes(folder.id, new Set()),
      children: childFolders.map((child) => makeNode(child, depth + 1, new Set(visited)))
    };
  }
  const roots = childrenByParent.root || folders.filter((folder) => !state.folders[folder.parentId]);
  return roots.map((folder) => makeNode(folder, 0, new Set()));
}

function flattenFolderTree(nodes) {
  const output = [];
  function walk(list) {
    for (const node of list) {
      output.push(node);
      walk(node.children);
    }
  }
  walk(nodes);
  return output;
}

function searchNotes(state, query) {
  const liveNotes = Object.values(state.notes).filter((note) => !note.deleted);
  const clean = normalizeTitle(query || "");
  if (!clean) {
    return liveNotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const terms = clean.split(" ").filter(Boolean);
  const scored = [];
  for (const note of liveNotes) {
    const title = normalizeTitle(note.title);
    const body = normalizeTitle(note.body);
    const links = note.links.map((link) => normalizeTitle(link.targetTitle)).join(" ");
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 8;
      if (body.includes(term)) score += 2;
      if (links.includes(term)) score += 4;
    }
    if (score > 0) scored.push({ note, score });
  }
  const scoreByNoteId = new Map(scored.map((entry) => [entry.note.id, entry.score]));
  function addArtifactScore(noteId, text, weight) {
    const note = state.notes[noteId];
    if (!note || note.deleted) return;
    const haystack = normalizeTitle(text);
    let score = scoreByNoteId.get(noteId) || 0;
    for (const term of terms) {
      if (haystack.includes(term)) score += weight;
    }
    if (score > 0 && !scoreByNoteId.has(noteId)) scored.push({ note, score });
    if (score > 0) scoreByNoteId.set(noteId, score);
  }
  for (const source of Object.values(state.sources || {}).filter((item) => !item.deleted)) {
    addArtifactScore(source.noteId, [source.name, source.kind, source.text, source.transcriptText, source.status].join(" "), 5);
  }
  for (const task of Object.values(state.tasks || {}).filter((item) => !item.deleted)) {
    addArtifactScore(task.noteId, [task.title, task.day, task.status].join(" "), 4);
  }
  for (const goal of Object.values(state.goals || {}).filter((item) => !item.deleted)) {
    addArtifactScore(goal.noteId, [goal.title, goal.status].join(" "), 4);
  }
  for (const block of Object.values(state.planBlocks || {}).filter((item) => !item.deleted)) {
    addArtifactScore(block.noteId, [block.title, block.day, block.status].join(" "), 4);
  }
  for (const message of visibleChatMessages(state)) {
    addArtifactScore(message.noteId, [message.role, message.text || message.content || ""].join(" "), 3);
  }
  for (const entry of scored) {
    entry.score = scoreByNoteId.get(entry.note.id) || entry.score;
  }
  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.note.updatedAt.localeCompare(a.note.updatedAt);
  });
  return scored.map((entry) => entry.note);
}

function savedSearchList(state) {
  return Object.values(state.savedSearches || {})
    .filter((search) => !search.deleted && search.query)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function commandPaletteItems(state) {
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length;
  const todayTasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done" && task.day === todayKey()).length;
  const monthSpend = Object.values(state.financeTransactions || {})
    .filter((tx) => !tx.deleted && tx.kind === "expense" && String(tx.day || "").slice(0, 7) === todayKey().slice(0, 7))
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
  const activeNote = getActiveNote(state);
  const items = [
    { id: "surface:inbox", group: "Рабочие места", title: "Дом", hint: "4 зоны: вход, день, деньги, активный артефакт", shortcut: "G H" },
    { id: "surface:capture", group: "Рабочие места", title: "Вход", hint: "Разобрать источники и вечернюю очередь", shortcut: "G I" },
    { id: "surface:today", group: "Рабочие места", title: "Сегодня", hint: todayTasks ? todayTasks + " задач на сегодня" : "Спокойный список без лишнего шума", shortcut: "G T" },
    { id: "surface:calendar", group: "Рабочие места", title: "Календарь", hint: "Неделя, блоки времени и перегруз", shortcut: "G C" },
    { id: "surface:finance", group: "Рабочие места", title: "Финансы", hint: monthSpend ? "Расходы месяца: " + Math.round(monthSpend) + " ₽" : "Баланс, бюджеты, подписки, чеки", shortcut: "G F" },
    { id: "surface:habits", group: "Рабочие места", title: "Привычки", hint: "Чекины, ритм и восстановление", shortcut: "G B" },
    { id: "surface:goals", group: "Рабочие места", title: "Цели и баланс", hint: "Домены жизни, прогресс и следующий шаг", shortcut: "G O" },
    { id: "surface:library", group: "Рабочие места", title: "База знаний", hint: "Заметки, ссылки, обратные связи и знания", shortcut: "G L" },
    { id: "surface:reader", group: "Рабочие места", title: "Чтение", hint: "Прогресс, цитаты и честные ограничения форматов", shortcut: "G R" },
    { id: "surface:player", group: "Рабочие места", title: "Голос", hint: "Аудио, расшифровка и предложения", shortcut: "G P" },
    { id: "surface:chat", group: "Рабочие места", title: "Чат", hint: "Чат привязан к активному артефакту", shortcut: "G A" },
    { id: "surface:agents", group: "Рабочие места", title: "Агенты и сценарии", hint: "Проверка, согласование и история запусков", shortcut: "G W" },
    { id: "surface:graph", group: "Рабочие места", title: "Большой граф", hint: "Общий и локальный граф, фильтры, инспектор, причины связей", shortcut: "G G" },
    { id: "surface:control", group: "Рабочие места", title: "Контроль данных", hint: "Аудит, экспорт, архив и откат", shortcut: "G X" },
    { id: "surface:providers", group: "Рабочие места", title: "Подключения", hint: "Ollama, OCR, STT, парсеры и честные статусы", shortcut: "G V" },
    { id: "surface:feed", group: "LifeOS v34", title: "Лента", hint: "Поток источников, действий, системных событий и проверок", shortcut: "G E" },
    { id: "surface:systems", group: "LifeOS v34", title: "Системы", hint: "Личные системы как артефакты, граф и экспорт", shortcut: "G S" },
    { id: "surface:builder", group: "LifeOS v34", title: "Builder", hint: "Сборка систем из source, artifact, event, channel, view, action", shortcut: "G U" },
    { id: "surface:projects", group: "LifeOS v34", title: "Проекты", hint: "Проектные решения, риски, задачи и документы", shortcut: "G J" },
    { id: "surface:models", group: "LifeOS v34", title: "Model Hub", hint: "Маршруты локальных и owner-key моделей без скрытой отправки", shortcut: "G M" },
    { id: "surface:smart-home", group: "LifeOS v34", title: "Умный дом", hint: "Устройства и события с явным подключением hub", shortcut: "G D" },
    { id: "surface:marketplace", group: "LifeOS v34", title: "Marketplace", hint: "Локальные паки систем без запуска чужого кода", shortcut: "G P" },
    { id: "surface:design", group: "LifeOS v34", title: "Design Studio", hint: "Профили отображения отдельно от данных", shortcut: "G Y" },
    { id: "surface:databases", group: "LifeOS v34", title: "Базы", hint: "Реляционные личные системы, строки, виды и граф", shortcut: "G B" },
    { id: "surface:screen", group: "LifeOS v34", title: "Screen Companion", hint: "Permission gate для контекста экрана", shortcut: "G N" },
    { id: "surface:twin", group: "LifeOS v34", title: "Personal Twin", hint: "Локальные снимки памяти и восстановления", shortcut: "G R" },
    { id: "quick:task", group: "Быстрое действие", title: "Новая задача из захвата", hint: "Откроет capture-first шаблон задачи", shortcut: "N T" },
    { id: "quick:expense", group: "Быстрое действие", title: "Новый расход", hint: "Откроет шаблон расхода и финансы", shortcut: "N F" },
    { id: "quick:habit", group: "Быстрое действие", title: "Новая привычка", hint: "Откроет шаблон привычки", shortcut: "N H" },
    { id: "action:capture", group: "Быстрое действие", title: "Разобрать текущий ввод", hint: "Создаст источник и предложения без скрытых изменений", shortcut: "Enter" },
    { id: "action:apply-safe", group: "Быстрое действие", title: "Принять безопасные предложения", hint: openProposals ? openProposals + " открытых предложений" : "Откроет очередь предложений", shortcut: "A A" },
    { id: "action:graph-active", group: "Связи", title: "Показать связи активного артефакта", hint: activeNote ? activeNote.title : "Выбери артефакт в базе", shortcut: "G ." },
    { id: "action:control-active", group: "Связи", title: "Контроль активного артефакта", hint: activeNote ? "След изменений: " + activeNote.title : "Откроет контроль данных", shortcut: "C ." },
    { id: "action:save-search", group: "Поиск", title: "Сохранить текущий поиск", hint: state.searchQuery || state.commandPaletteQuery ? (state.searchQuery || state.commandPaletteQuery) : "Сначала введи запрос", shortcut: "S S" }
  ];
  return items;
}

function saveCurrentSearch(state) {
  const query = cleanLine(state.searchQuery || state.commandPaletteQuery || "");
  if (!query) {
    state.commandMessage = "Введите запрос, чтобы сохранить поиск";
    addAudit(state, "search.save.empty", "Saved search was not created because query is empty", state.activeNoteId);
    return "";
  }
  const existing = savedSearchList(state).find((item) => normalizeTitle(item.query) === normalizeTitle(query));
  const resultCount = searchNotes(state, query).length;
  const updatedAt = now();
  if (existing) {
    existing.resultCount = resultCount;
    existing.surface = state.activeSurface || existing.surface || "library";
    existing.noteId = state.activeNoteId || existing.noteId || "";
    existing.updatedAt = updatedAt;
    state.graphView.selectedNodeId = existing.id;
    addAudit(state, "search.save", "Обновлен сохраненный поиск: " + query + " / " + resultCount + " совпадений", existing.noteId || state.activeNoteId);
    return existing.id;
  }
  const id = makeId("search");
  state.savedSearches[id] = {
    id,
    title: "Поиск: " + shorten(query, 48),
    query,
    surface: state.activeSurface || "library",
    resultCount,
    noteId: state.activeNoteId || "",
    deleted: false,
    createdAt: updatedAt,
    updatedAt
  };
  state.graphView.selectedNodeId = id;
  addAudit(state, "search.save", "Сохранен поиск: " + query + " / " + resultCount + " совпадений", state.activeNoteId);
  return id;
}

function runSavedSearch(state, id) {
  const search = state.savedSearches[id];
  if (!search || search.deleted) return;
  const resultCount = searchNotes(state, search.query).length;
  search.resultCount = resultCount;
  search.updatedAt = now();
  state.searchQuery = search.query;
  state.commandPaletteQuery = search.query;
  state.commandPaletteOpen = false;
  state.activeSurface = search.surface || "library";
  state.graphView.searchQuery = search.query;
  state.graphView.selectedNodeId = search.id;
  addAudit(state, "search.run", "Запущен сохраненный поиск: " + search.query + " / " + resultCount + " совпадений", search.noteId || state.activeNoteId);
}

function deleteSavedSearch(state, id) {
  const search = state.savedSearches[id];
  if (!search || search.deleted) return;
  search.deleted = true;
  search.updatedAt = now();
  if (state.graphView.selectedNodeId === id) state.graphView.selectedNodeId = state.activeNoteId || "";
  addAudit(state, "search.delete", "Удален сохраненный поиск: " + search.query, search.noteId || state.activeNoteId);
}

function runCommandPaletteCommand(state, id) {
  if (!id) return;
  if (id.startsWith("surface:")) {
    state.activeSurface = id.slice("surface:".length) || "inbox";
    state.commandPaletteOpen = false;
    addAudit(state, "command.run", "Команда открыла рабочее место: " + state.activeSurface, state.activeNoteId);
    return;
  }
  if (id === "quick:task") {
    state.captureDraft = "Задача: ";
    state.activeSurface = "capture";
    state.commandPaletteOpen = false;
    addAudit(state, "command.run", "Команда открыла быстрый ввод задачи", state.activeNoteId);
    return;
  }
  if (id === "quick:expense") {
    state.captureDraft = "Расход: ";
    state.activeSurface = "capture";
    state.commandPaletteOpen = false;
    addAudit(state, "command.run", "Команда открыла быстрый ввод расхода", state.activeNoteId);
    return;
  }
  if (id === "quick:habit") {
    state.captureDraft = "Каждый день ";
    state.activeSurface = "capture";
    state.commandPaletteOpen = false;
    addAudit(state, "command.run", "Команда открыла быстрый ввод привычки", state.activeNoteId);
    return;
  }
  if (id === "action:capture") {
    if (cleanLine(state.captureDraft)) {
      captureTextArtifact(state, state.captureDraft);
    } else {
      state.activeSurface = "capture";
      state.commandMessage = "Введите текст в Universal Capture, затем разберите его";
      addAudit(state, "command.run", "Команда открыла Universal Capture без silent mutation", state.activeNoteId);
    }
    state.commandPaletteOpen = false;
    return;
  }
  if (id === "action:apply-safe") {
    const before = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length;
    applyAllProposals(state);
    if (!before) state.activeSurface = "capture";
    state.commandPaletteOpen = false;
    addAudit(state, "command.run", before ? "Команда приняла безопасные предложения: " + before : "Команда открыла очередь предложений", state.activeNoteId);
    return;
  }
  if (id === "action:graph-active") {
    state.graphView.selectedNodeId = state.activeNoteId || state.graphView.selectedNodeId || "";
    state.graphView.mode = "local";
    state.activeSurface = "graph";
    state.commandPaletteOpen = false;
    addAudit(state, "command.run", "Команда показала локальный граф активного артефакта", state.activeNoteId);
    return;
  }
  if (id === "action:control-active") {
    state.graphView.selectedNodeId = state.activeNoteId || state.graphView.selectedNodeId || "";
    state.activeSurface = "control";
    state.commandPaletteOpen = false;
    addAudit(state, "command.run", "Команда открыла Data Control активного артефакта", state.activeNoteId);
    return;
  }
  if (id === "action:save-search") {
    saveCurrentSearch(state);
    state.commandPaletteOpen = true;
  }
}

function getActiveNote(state) {
  return state.activeNoteId && state.notes[state.activeNoteId] && !state.notes[state.activeNoteId].deleted ? state.notes[state.activeNoteId] : null;
}

function incomingBacklinks(state, noteId) {
  const ids = state.backlinks[noteId] || [];
  return ids.map((id) => state.notes[id]).filter(Boolean).filter((note) => !note.deleted);
}

function outgoingLinks(state, note) {
  if (!note) return [];
  return note.links || [];
}

function createNote(state, title, folderId, body) {
  const id = makeId("note");
  const createdAt = now();
  state.notes[id] = {
    id,
    title: cleanLine(title || "Untitled"),
    folderId: state.folders[folderId] ? folderId : state.activeFolderId,
    body: String(body || "# " + cleanLine(title || "Untitled") + "\n"),
    tags: [],
    links: [],
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  state.activeNoteId = id;
  state.activeFolderId = state.notes[id].folderId;
  addAudit(state, "note.create", "Note created: " + state.notes[id].title, id);
  rebuildIndexes(state);
  return id;
}

function createFolder(state, name) {
  const id = makeId("folder");
  const createdAt = now();
  const order = Object.values(state.folders).length + 1;
  state.folders[id] = {
    id,
    name: cleanLine(name || "New folder"),
    parentId: state.activeFolderId || "",
    order,
    createdAt,
    updatedAt: createdAt
  };
  state.activeFolderId = id;
  addAudit(state, "folder.create", "Folder created: " + state.folders[id].name, "");
  return id;
}

function extensionForName(name) {
  const match = String(name || "").toLocaleLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function stripExtension(name) {
  return cleanLine(String(name || "Imported source").replace(/\.[^.]+$/, "")) || "Imported source";
}

function canReadSourceAsText(name, mime) {
  const ext = extensionForName(name);
  if (String(mime || "").startsWith("text/")) return true;
  return ["md", "markdown", "txt", "csv", "json", "html", "xml", "log"].includes(ext);
}

function parserStatusForSource(name, kind, readableText) {
  const ext = extensionForName(name);
  if (readableText) return "text-ready";
  if (kind === "audio") return "manual-transcript-required";
  if (ext === "pdf") return "pdf-parser-required";
  if (ext === "epub") return "epub-parser-required";
  if (kind === "book") return "book-parser-required";
  return "binary-stored";
}

function inferSourceKind(name, mime, forcedKind) {
  if (forcedKind === "audio") return "audio";
  const ext = extensionForName(name);
  const mediaType = String(mime || "").toLocaleLowerCase();
  if (mediaType.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "flac", "aac", "webm"].includes(ext)) return "audio";
  if (mediaType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) return "image";
  if (["epub", "pdf", "mobi", "azw3"].includes(ext)) return "book";
  if (["md", "markdown", "txt"].includes(ext)) return "book";
  return "file";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function uniqueCleanItems(items, limit) {
  const seen = new Set();
  const result = [];
  for (const item of items || []) {
    const value = cleanLine(item);
    if (!value) continue;
    const key = normalizeTitle(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function inferArtifactType(source) {
  const text = String(source.text || source.transcriptText || "");
  const name = String(source.name || "");
  const ext = extensionForName(name);
  const lower = (name + " " + text.slice(0, 1200)).toLocaleLowerCase();
  if (source.kind === "audio") return "аудио";
  if (["pdf", "epub", "mobi", "azw3"].includes(ext)) return "книга";
  if (/\b(from|to|subject|gmail|mail)\b|@/.test(lower) || /письм|почт|тема:|кому:|от:/.test(lower)) return "письмо";
  if (/chapter|глава|страница|book|книга|конспект/.test(lower)) return "книга";
  if (/meeting|созвон|транскрипт|transcript|обсудили|решили/.test(lower)) return "транскрипт";
  if (/цель|goal|okr|проект|план/.test(lower)) return "проект";
  return source.kind === "text" ? "текст" : source.kind || "файл";
}

function extractActionLines(text) {
  const lines = String(text || "").split(/\r?\n/);
  return uniqueCleanItems(lines.filter((line) => {
    const value = cleanLine(line).toLocaleLowerCase();
    return /(^[-*]\s*\[?\s?]?\s*)?(task|action|нужно|надо|сделать|важно|проверить|создать|подготовить|купить|написать|позвонить|исправить|добавить)/.test(value);
  }).map((line) => line.replace(/^[-*]\s*\[?\s?]?\s*/, "")), 5);
}

function extractDateHints(text) {
  const source = String(text || "");
  const matches = source.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b|\b(today|tomorrow|сегодня|завтра|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\b/gi) || [];
  return uniqueCleanItems(matches, 5);
}

function extractActionLinesV5(text) {
  const lines = String(text || "").split(/\r?\n/);
  const actionPattern = /(^[-*]\s*\[?\s?]?\s*)?(task|action|t[o]do|need|нужно|надо|сделать|важно|проверить|создать|подготовить|купить|написать|позвонить|исправить|добавить|встреча|созвон|запланировать|разобрать|прочитать|послушать|отправить|ответить|назначить|обсудить|решить|РЅСѓР¶РЅРѕ|РЅР°РґРѕ|СЃРґРµлать|РІР°Р¶РЅРѕ|РїСЂРѕРІРµСЂРёС‚СЊ|СЃРѕР·Рґать|РїРѕРґРіРѕС‚РѕРІРёС‚СЊ|РєСѓРїРёС‚СЊ|РЅР°РїРёСЃР°С‚СЊ|РїРѕР·РІРѕРЅРёС‚СЊ|РёСЃРїСЂР°РІРёС‚СЊ|РґРѕР±Р°РІРёС‚СЊ)/;
  return uniqueCleanItems(lines.filter((line) => actionPattern.test(cleanLine(line).toLocaleLowerCase())).map((line) => line.replace(/^[-*]\s*\[?\s?]?\s*/, "")), 5);
}

function extractDateHintsV5(text) {
  const source = String(text || "");
  const matches = source.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b|\b\d{1,2}[:.]\d{2}(?:\s*[-–]\s*\d{1,2}[:.]\d{2})?\b|\b(today|tomorrow|сегодня|завтра|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье|Р·Р°РІС‚СЂР°|СЃРµРіРѕРґРЅСЏ|РїРѕРЅРµРґРµР»СЊРЅРёРє|РІС‚РѕСЂРЅРёРє|СЃСЂРµРґа|С‡РµС‚РІРµСЂРі|РїСЏС‚РЅРёС†Р°|СЃСѓР±Р±РѕС‚Р°|РІРѕСЃРєСЂРµСЃРµРЅСЊРµ)\b/gi) || [];
  return uniqueCleanItems(matches, 5);
}

function extractUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s)\]]+/gi) || [];
  return uniqueCleanItems(matches, 5);
}

function extractEmails(text) {
  const matches = String(text || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return uniqueCleanItems(matches, 5);
}

function extractHeadings(text) {
  const lines = String(text || "").split(/\r?\n/);
  return uniqueCleanItems(lines.filter((line) => /^#{1,4}\s+/.test(line)).map((line) => line.replace(/^#{1,4}\s+/, "")), 5);
}

function proposalGroupLabel(groupKey) {
  const row = PROPOSAL_GROUPS.find((item) => item[0] === groupKey);
  return row ? row[1] : "Действия";
}

function groupForProposalType(type) {
  const key = String(type || "");
  if (["note", "knowledge", "insight", "claim", "question", "review"].includes(key)) return "knowledge";
  if (["task", "project"].includes(key)) return "actions";
  if (["calendar", "reminder"].includes(key)) return "calendar";
  if (["finance", "finance_expense", "finance_income", "balance", "budget", "subscription", "bill", "debt"].includes(key)) return "money";
  if (["habit", "routine"].includes(key)) return "habits";
  if (["goal", "money_goal"].includes(key)) return "goals";
  if (["media", "book", "audio", "transcript", "parser"].includes(key)) return "media";
  if (["chat", "agent", "flow", "mail"].includes(key)) return "automation";
  return "control";
}

function destinationForProposalType(type) {
  const key = String(type || "");
  if (["finance", "finance_expense", "finance_income", "balance", "budget", "subscription", "bill", "debt"].includes(key)) return "Финансы";
  if (["habit", "routine"].includes(key)) return "Привычки";
  if (["goal", "money_goal"].includes(key)) return "Цели";
  if (["calendar", "reminder"].includes(key)) return "Календарь";
  if (["task", "project"].includes(key)) return "Сегодня";
  if (["media", "book", "audio", "transcript", "parser"].includes(key)) return "Плеер / Библиотека";
  if (["chat", "agent", "flow", "mail"].includes(key)) return "Чат / Агенты / Flow";
  if (["note", "knowledge", "insight", "claim", "question", "review"].includes(key)) return "Библиотека";
  return "Граф / Контроль";
}

function sourceQuote(text, pattern) {
  const source = String(text || "");
  if (!source) return "";
  if (pattern) {
    const match = source.match(pattern);
    if (match) return shorten(cleanLine(match[0]), 140);
  }
  return shorten(cleanLine(source), 140);
}

function extractMoneyEntities(text) {
  const humanMatches = extractMoneyEntitiesHuman(text);
  if (humanMatches.length) return humanMatches;
  const source = String(text || "");
  const matches = [];
  const moneyPattern = /(?:^|[^\d])(\d{2,9})(?:\s*)(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)/gi;
  let match = moneyPattern.exec(source);
  while (match) {
    matches.push({ amount: Number(match[1]), currency: "RUB", raw: cleanLine(match[0]) });
    match = moneyPattern.exec(source);
  }
  const fallback = source.match(/\b(\d{3,9})\b/);
  if (!matches.length && fallback && /(купить|оплатить|потратил|списал|списалось|стоил|цена|баланс|зарплата|лимит|подписка|долг|expense|income|budget|subscription)/i.test(source)) {
    matches.push({ amount: Number(fallback[1]), currency: "RUB", raw: fallback[1] });
  }
  return matches.slice(0, 6);
}

function extractFirstAmount(text) {
  const money = extractMoneyEntities(text);
  return money.length ? money[0].amount : 0;
}

function extractMoneyEntitiesHuman(text) {
  const source = repairMojibake(String(text || ""));
  const lower = normalizeRuText(source);
  const hasMoneyContext = /(пят[её]рочк|перекр[её]сток|магнит|продукт|еда|кофе|расход|потрат|купил|купить|оплат|баланс|карта|сч[её]т|зарплат|доход|подписк|бюджет|лимит|перев[её]л|накоплен|руб|₽|expense|income|budget|subscription)/iu.test(lower);
  if (!hasMoneyContext) return [];
  const matches = [];
  const seen = new Set();
  const pattern = /(^|[^\d])(\d{2,9})(?:\s*)(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)?/giu;
  let match = pattern.exec(source);
  while (match) {
    const amount = Number(match[2]);
    if (Number.isFinite(amount) && amount > 0 && !seen.has(match.index + ":" + amount)) {
      seen.add(match.index + ":" + amount);
      matches.push({ amount, currency: "RUB", raw: cleanLine(match[0]) || String(amount) });
    }
    match = pattern.exec(source);
  }
  return matches.slice(0, 6);
}

function extractBalanceAmount(text) {
  const source = repairMojibake(String(text || ""));
  const balanceMatch = source.match(/(?:баланс|остаток|на\s+карте|карта|сч[её]т)[^\d]{0,40}(\d{3,9})/iu);
  return balanceMatch ? Number(balanceMatch[1]) : 0;
}

function extractMerchantHuman(text) {
  const lower = normalizeRuText(text);
  const known = [
    [/пят[её]рочк/u, "Пятёрочка"],
    [/перекр[её]сток/u, "Перекрёсток"],
    [/магнит/u, "Магнит"],
    [/яндекс/u, "Яндекс"],
    [/ozon/u, "Ozon"],
    [/wildberries/u, "Wildberries"],
    [/кофе/u, "Кофе"],
    [/аптек/u, "Аптека"],
    [/такси/u, "Такси"],
    [/метро/u, "Метро"],
    [/протеин/u, "Протеин"],
    [/зал|gym/u, "Зал"]
  ];
  const row = known.find((item) => item[0].test(lower));
  return row ? row[1] : "";
}

function extractGoalAmount(text) {
  const source = String(text || "");
  const goalMatch = source.match(/(?:накопить|цель|хочу|target|goal)[^\d]{0,80}(\d{3,9})/i);
  if (goalMatch) return Number(goalMatch[1]);
  const numbers = [...source.matchAll(/\b(\d{3,9})\b/g)].map((match) => Number(match[1]));
  return numbers.length ? numbers[numbers.length - 1] : 0;
}

function extractMerchant(text) {
  const humanMerchant = extractMerchantHuman(text);
  if (humanMerchant) return humanMerchant;
  const source = cleanLine(text);
  const known = source.match(/\b(пятерочка|перекресток|яндекс|ozon|wildberries|кофе|аптека|такси|метро|протеин|gym|зал)\b/i);
  if (known) return known[1];
  return shorten(source.replace(/\d{2,9}\s*(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)?/gi, "").replace(/\b(купить|оплатить|потратил|списалось|баланс|зарплата|лимит|подписка)\b/gi, ""), 48) || "Расход";
}

function inferFinanceCategory(text) {
  const humanLower = normalizeRuText(text);
  if (/продукт|еда|кофе|пят[её]рочк|перекр[её]сток|магнит|grocery|food|meal|ужин|обед|завтрак/u.test(humanLower)) return "Еда";
  if (/такси|метро|билет|дорог|travel|поезд/u.test(humanLower)) return "Транспорт";
  if (/протеин|зал|gym|спорт/u.test(humanLower)) return "Спорт";
  if (/подписк|яндекс|netflix|spotify|icloud/u.test(humanLower)) return "Подписки";
  if (/дом|лампоч|ремонт|полк/u.test(humanLower)) return "Дом";
  const lower = String(text || "").toLocaleLowerCase();
  if (/продукт|еда|кофе|пятерочка|перекресток|grocery|food|meal|ужин|обед/.test(lower)) return "Еда";
  if (/такси|метро|билет|дорога|travel|поезд/.test(lower)) return "Транспорт";
  if (/протеин|зал|gym|спорт/.test(lower)) return "Спорт";
  if (/подписк|яндекс|netflix|spotify|icloud/.test(lower)) return "Подписки";
  if (/дом|лампоч|ремонт|полк/.test(lower)) return "Дом";
  return "Разное";
}

function stripOwnerActionTitle(text) {
  const source = repairMojibake(String(text || ""));
  return cleanLine(source
    .replace(/\b(сегодня|завтра|послезавтра)\b/giu, " ")
    .replace(/\bчерез\s+\d{1,2}\s+(?:день|дня|дней|д)\b/giu, " ")
    .replace(/\b(?:в|к|at)\s+\d{1,2}(?::\d{2})?\s*(?:утра|дня|вечера|ночи|am|pm)?\b/giu, " ")
    .replace(/\b(?:утром|вечером|днем|днём|к вечеру|после обеда)\b/giu, " ")
    .replace(/\b(?:нужно|надо|пожалуйста|напомни|задача|t[o]do|task|цель|хочу|привычка|каждый день|ежедневно)\b/giu, " ")
    .replace(/\b(?:сегодня|завтра|послезавтра)\b/giu, " ")
    .replace(/\b(?:в|к)\s*(?:утра|дня|вечера|ночи)\b/giu, " ")
    .replace(/\b(?:утра|дня|вечера|ночи)\b/giu, " ")
    .replace(/\d{1,2}[:.]\d{2}/g, " ")
    .replace(/\d{2,9}\s*(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)?/giu, " ")
    .replace(/[,.!?]+/g, " ")
    .replace(/\s+/g, " "));
}

function stripOwnerActionTitleUnicode(text) {
  const source = repairMojibake(String(text || ""));
  return cleanLine(source
    .replace(/(^|[\s,.;:!?])(?:\u0441\u0435\u0433\u043e\u0434\u043d\u044f|\u0437\u0430\u0432\u0442\u0440\u0430|\u043f\u043e\u0441\u043b\u0435\u0437\u0430\u0432\u0442\u0440\u0430)(?=$|[\s,.;:!?])/giu, " ")
    .replace(/(^|[\s,.;:!?])\u0447\u0435\u0440\u0435\u0437\s+\d{1,2}\s+(?:\u0434\u0435\u043d\u044c|\u0434\u043d\u044f|\u0434\u043d\u0435\u0439|\u0434)(?=$|[\s,.;:!?])/giu, " ")
    .replace(/(^|[\s,.;:!?])(?:\u0432|\u043a|at)\s+\d{1,2}(?::\d{2})?\s*(?:\u0443\u0442\u0440\u0430|\u0434\u043d\u044f|\u0432\u0435\u0447\u0435\u0440\u0430|\u043d\u043e\u0447\u0438|am|pm)?(?=$|[\s,.;:!?])/giu, " ")
    .replace(/(^|[\s,.;:!?])(?:\u0443\u0442\u0440\u043e\u043c|\u0432\u0435\u0447\u0435\u0440\u043e\u043c|\u0434\u043d\u0435\u043c|\u0434\u043d\u0451\u043c|\u043a\s+\u0432\u0435\u0447\u0435\u0440\u0443|\u043f\u043e\u0441\u043b\u0435\s+\u043e\u0431\u0435\u0434\u0430)(?=$|[\s,.;:!?])/giu, " ")
    .replace(/(^|[\s,.;:!?])(?:\u0432|\u043a)\s*(?:\u0443\u0442\u0440\u0430|\u0434\u043d\u044f|\u0432\u0435\u0447\u0435\u0440\u0430|\u043d\u043e\u0447\u0438)(?=$|[\s,.;:!?])/giu, " ")
    .replace(/(^|[\s,.;:!?])(?:\u0443\u0442\u0440\u0430|\u0434\u043d\u044f|\u0432\u0435\u0447\u0435\u0440\u0430|\u043d\u043e\u0447\u0438)(?=$|[\s,.;:!?])/giu, " ")
    .replace(/(^|[\s,.;:!?])(?:\u043d\u0443\u0436\u043d\u043e|\u043d\u0430\u0434\u043e|\u043f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430|\u043d\u0430\u043f\u043e\u043c\u043d\u0438|\u0437\u0430\u0434\u0430\u0447\u0430|t[o]do|task|\u0446\u0435\u043b\u044c|\u0445\u043e\u0447\u0443|\u043f\u0440\u0438\u0432\u044b\u0447\u043a\u0430|\u043a\u0430\u0436\u0434\u044b\u0439\s+\u0434\u0435\u043d\u044c|\u0435\u0436\u0435\u0434\u043d\u0435\u0432\u043d\u043e)(?=$|[\s,.;:!?])/giu, " ")
    .replace(/\d{1,2}[:.]\d{2}/g, " ")
    .replace(/\d{2,9}\s*(\u20bd|\u0440\u0443\u0431(?:\.|\u043b\u0435\u0439|\u043b\u044f|\u043b\u044c)?|\u0440\b|rub\b)?/giu, " ")
    .replace(/[,.!?]+/g, " ")
    .replace(/\s+/g, " "));
}

function stripCommandNoise(text) {
  return cleanLine(String(text || "")
    .replace(/\b(нужно|надо|сделать|купить|оплатить|напомни|задача|task|t[o]do|цель|хочу|привычка|каждый день|ежедневно)\b/gi, "")
    .replace(/\d{1,2}[:.]\d{2}/g, "")
    .replace(/\d{2,9}\s*(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)?/gi, "")
    .replace(/\s+/g, " "));
}

function draft(id, type, title, group, reason, quote, fields, confidence) {
  return {
    draftId: id,
    type,
    title: cleanLine(title),
    group: group || groupForProposalType(type),
    destination: destinationForProposalType(type),
    reason: cleanLine(reason || "Найдено в источнике"),
    quote: cleanLine(quote || ""),
    fields: fields && typeof fields === "object" ? fields : {},
    confidence: Number.isFinite(Number(confidence)) ? Math.max(0, Math.min(1, Number(confidence))) : 0.72
  };
}

function addDraftOnce(drafts, item) {
  if (!item || !item.title) return;
  const key = normalizeTitle(item.type + " " + item.title + " " + JSON.stringify(item.fields || {}));
  if (drafts.some((draftItem) => normalizeTitle(draftItem.type + " " + draftItem.title + " " + JSON.stringify(draftItem.fields || {})) === key)) return;
  drafts.push(item);
}

function hasAnyText(lower, words) {
  return words.some((word) => {
    const token = String(word || "").toLocaleLowerCase();
    const repairedToken = repairMojibake(token).toLocaleLowerCase();
    return lower.includes(token) || lower.includes(repairedToken);
  });
}

function analyzeArtifactInput(input, fileMeta) {
  const rawText = typeof input === "string" ? input : String(input && input.text ? input.text : "");
  const meta = fileMeta && typeof fileMeta === "object" ? fileMeta : {};
  const text = repairMojibake(rawText).trim();
  const lower = text.toLocaleLowerCase();
  const detectedClasses = [];
  const drafts = [];
  const entities = {
    dates: extractDateHintsV5(text),
    time: parseTimeFromText(text),
    money: extractMoneyEntities(text),
    links: extractUrls(text),
    emails: extractEmails(text),
    wikiLinks: extractWikiLinks(text).map((link) => link.targetTitle),
    headings: extractHeadings(text),
    file: meta.name ? { name: meta.name, kind: meta.kind || "", mime: meta.mime || "" } : null
  };
  const day = parseDateFromText(text);
  const time = parseTimeFromText(text);
  const amount = extractFirstAmount(text);
  const balanceAmount = extractBalanceAmount(text) || (entities.money.length > 1 ? entities.money[entities.money.length - 1].amount : amount);
  const quote = sourceQuote(text);
  const timeNeedsChoice = Boolean(time.ambiguousTime);
  const timeChoiceFields = timeNeedsChoice ? {
    timeAmbiguous: true,
    needsOwnerChoice: "Уточнить время перед созданием календарного блока",
    timeOptions: time.timeOptions || [],
    suggestedTime: time.suggestedTime || "",
    ambiguityReason: time.ambiguityReason || "Время требует подтверждения владельца."
  } : {};
  const hasDateOrTime = Boolean(day || time.startTime || timeNeedsChoice || /\b(сегодня|завтра|послезавтра|вечером|утром|днем|понедельник|пятниц|до\s+\d{1,2})\b/i.test(lower));
  const isRecurring = hasAnyText(lower, ["каждый день", "ежедневно", "еженедельно", "по будням", "каждый понедельник", "каждую неделю", "daily", "weekly"]);
  const isTask = hasAnyText(lower, ["нужно", "надо", "сделать", "купить", "позвонить", "написать", "проверить", "подготовить", "отправить", "записаться", "выбрать", "починить", "оплатить"]) || /\b(task|t[o]do)\b/i.test(lower);
  const isExpense = amount > 0 && (hasAnyText(lower, ["купить", "оплатить", "потратил", "потратила", "списалось", "кофе", "продукт", "пятерочка", "протеин", "такси", "аптека", "расход"]) || /\bexpense\b/i.test(lower));
  const isIncome = amount > 0 && (hasAnyText(lower, ["зарплата", "доход", "пришла", "получил"]) || /\b(income|salary)\b/i.test(lower));
  const isBalance = amount > 0 && (hasAnyText(lower, ["баланс", "остаток", "карта", "счет"]) || /\baccount\b/i.test(lower));
  const isSubscription = amount > 0 && (hasAnyText(lower, ["подписка", "ежемесячно", "каждый месяц", "счет"]) || /\b(subscription|bill)\b/i.test(lower));
  const isBudget = amount > 0 && (hasAnyText(lower, ["бюджет", "лимит"]) || /\b(limit|budget)\b/i.test(lower));
  const isHabit = isRecurring || hasAnyText(lower, ["привычка", "вода", "сон", "тренировка", "читать", "медитация", "routine", "habit"]);
  const isGoal = hasAnyText(lower, ["цель", "хочу", "накопить", "достичь"]) || /до\s+\d{1,2}\s+[а-я]+|\b(goal|target)\b/i.test(lower);
  const isProject = hasAnyText(lower, ["проект"]) || /\bproject\b/i.test(lower);
  const isIdea = hasAnyText(lower, ["идея"]) || /\bidea\b/i.test(lower);
  const isEmail = hasAnyText(lower, ["from:", "to:", "subject:", "тема:", "кому:", "от:"]) || entities.emails.length > 0;
  const isBook = hasAnyText(lower, ["книга", "глава", "конспект", "исследование"]) || /\b(chapter|highlight|article|research)\b/i.test(lower) || meta.kind === "book";
  const isAudio = hasAnyText(lower, ["аудио", "транскрипт", "созвон"]) || /\b(transcript|meeting)\b/i.test(lower) || meta.kind === "audio";
  const isImage = meta.kind === "image" || /\.(png|jpe?g|webp|gif|bmp)$/i.test(meta.name || "");
  const isHealth = hasAnyText(lower, ["сон", "энергия", "настроение", "здоровье"]) || /\b(health|sleep|mood)\b/i.test(lower);
  const isHome = hasAnyText(lower, ["дом", "полка", "лампочки", "уборка", "ремонт"]) || /\b(home|household)\b/i.test(lower);
  const isTravel = hasAnyText(lower, ["поездка", "билет", "отель", "самолет", "поезд"]) || /\b(travel|trip)\b/i.test(lower);
  const isFood = hasAnyText(lower, ["еда", "продукты", "ужин", "обед", "завтрак"]) || /\b(grocery|meal)\b/i.test(lower);

  function mark(value) {
    if (!detectedClasses.includes(value)) detectedClasses.push(value);
  }

  mark("note/source");
  if (isTask) mark("task");
  if (hasDateOrTime) mark("calendar/time/date");
  if (hasAnyText(lower, ["напомни", "напоминание"]) || /\b(remind|reminder)\b/i.test(lower)) mark("reminder");
  if (isExpense) mark("finance expense");
  if (isIncome) mark("finance income");
  if (isBalance) mark("balance/account");
  if (isSubscription) mark("subscription/bill");
  if (isBudget) mark("budget");
  if (isHabit) mark("habit");
  if (isGoal) mark("goal");
  if (isProject) mark("project");
  if (isIdea) mark("idea");
  if (isBook) mark("book/article/research");
  if (isAudio) mark("audio/transcript");
  if (isImage) mark("screenshot/image/receipt");
  if (isEmail) mark("email/mail text");
  if (isHealth) mark("health/energy/sleep");
  if (isHome) mark("home/family");
  if (isTravel) mark("food/travel");
  if (isFood) mark("food/travel");
  if (detectedClasses.length <= 1) mark("unclear/mixed");

  addDraftOnce(drafts, draft("knowledge-summary", "knowledge", "Сохранить источник в библиотеку", "knowledge", "Любой ввод становится source-backed заметкой", quote, {
    summary: shorten(text || meta.name || "Пустой источник", 180),
    tags: detectedClasses.slice(0, 6)
  }, 0.95));

  const actionTitle = stripOwnerActionTitleUnicode(text) || stripOwnerActionTitle(text) || stripCommandNoise(text) || shorten(text, 64) || "Следующий шаг";
  if (isTask || isExpense || hasDateOrTime || isHome || isTravel || isFood || isProject || isIdea) {
    const actionReason = isProject || isIdea
      ? "Идея или проект требует owner-visible следующего шага"
      : "Найден глагол действия или предмет покупки/дела";
    addDraftOnce(drafts, draft("task-main", "task", actionTitle, "actions", actionReason, sourceQuote(text, /(нужно|надо|сделать|купить|позвонить|написать|проверить|подготовить|отправить|починить|оплатить|проект|идея)[^,.!?]*/i), {
      title: actionTitle,
      day: day || todayKey(),
      startTime: time.startTime,
      endTime: time.endTime,
      priority: hasDateOrTime ? "scheduled" : "normal",
      ...timeChoiceFields
    }, 0.82));
  }
  if (hasDateOrTime) {
    addDraftOnce(drafts, draft("calendar-main", "calendar", actionTitle, "calendar", "Найдена дата или время", sourceQuote(text, /\b(сегодня|завтра|послезавтра|вечером|утром|днем|\d{1,2}[:.]\d{2}|в\s+\d{1,2})[^,.!?]*/i), {
      title: actionTitle,
      day: day || todayKey(),
      startTime: time.startTime || "",
      endTime: time.endTime || "",
      ...timeChoiceFields
    }, 0.84));
  }
  if (hasAnyText(lower, ["напомни", "напоминание"]) || /\b(remind|reminder)\b/i.test(lower)) {
    addDraftOnce(drafts, draft("reminder-main", "reminder", "Напомнить: " + actionTitle, "calendar", "Найден запрос на напоминание", sourceQuote(text, /(напомни|remind)[^,.!?]*/i), {
      title: actionTitle,
      day: day || todayKey(),
      time: time.startTime || "",
      ...timeChoiceFields
    }, 0.86));
  }
  if (isExpense) {
    addDraftOnce(drafts, draft("finance-expense", "finance_expense", extractMerchant(text), "money", "Найдена сумма и сигнал расхода", sourceQuote(text, /\d{2,9}\s*(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)?/i), {
      title: extractMerchant(text),
      amount,
      category: inferFinanceCategory(text),
      day: day || todayKey()
    }, 0.86));
  }
  if (isIncome) {
    addDraftOnce(drafts, draft("finance-income", "finance_income", "Доход", "money", "Найдена сумма и сигнал дохода", quote, {
      title: "Доход",
      amount,
      category: "Доход",
      day: day || todayKey()
    }, 0.84));
  }
  if (isBalance) {
    addDraftOnce(drafts, draft("finance-balance", "balance", "Баланс счета", "money", "Найдена сумма и сигнал баланса", quote, {
      accountName: /карта/i.test(lower) ? "Карта" : "Основной счет",
      balance: balanceAmount
    }, 0.84));
  }
  if (isSubscription) {
    addDraftOnce(drafts, draft("finance-subscription", "subscription", extractMerchant(text), "money", "Найдена регулярная оплата или счет", quote, {
      title: extractMerchant(text),
      amount,
      day: day || todayKey(),
      category: inferFinanceCategory(text)
    }, 0.82));
  }
  if (isBudget) {
    addDraftOnce(drafts, draft("finance-budget", "budget", inferFinanceCategory(text), "money", "Найден лимит или бюджет", quote, {
      category: inferFinanceCategory(text),
      limit: amount,
      period: "month"
    }, 0.82));
  }
  if (isHabit) {
    addDraftOnce(drafts, draft("habit-main", "habit", stripCommandNoise(text) || "Ежедневная привычка", "habits", "Найдена повторяемость или сигнал привычки", sourceQuote(text, /(каждый день|ежедневно|привычка|вода|сон|тренировка)[^,.!?]*/i), {
      title: stripCommandNoise(text) || "Ежедневная привычка",
      frequency: isRecurring ? "daily" : "manual"
    }, 0.84));
  }
  if (isGoal) {
    addDraftOnce(drafts, draft("goal-main", "goal", stripCommandNoise(text) || "Цель", "goals", "Найдено желание, целевое значение или срок", quote, {
      title: stripCommandNoise(text) || "Цель",
      targetAmount: extractGoalAmount(text),
      targetDate: day || ""
    }, 0.84));
  }
  if (isBook || entities.headings.length || entities.wikiLinks.length || /\b(идея|исследование|решение|вопрос|decision|research)\b/i.test(lower)) {
    addDraftOnce(drafts, draft("insight-main", "insight", "Смысловой вывод из источника", "knowledge", "Источник похож на идею, книгу, исследование или заметку", quote, {
      reason: "Добавить в очередь осмысления и связать с графом",
      tags: detectedClasses.slice(0, 6)
    }, 0.78));
  }
  if (isAudio || meta.kind === "audio") {
    addDraftOnce(drafts, draft("media-transcript", "transcript", "Добавить ручную расшифровку", "media", "Аудио требует ручного transcript или STT gate", quote, {
      parserStatus: "manual-transcript-required"
    }, 0.9));
  }
  if (isImage) {
    addDraftOnce(drafts, draft("media-image-expense", "finance_expense", "Заполнить расход по скрину вручную", "money", "Скрин сохранен; OCR не заявлен без движка", quote, {
      title: "Расход по скрину",
      amount: 0,
      category: "Разное",
      day: todayKey(),
      parserStatus: "ocr-manual-required"
    }, 0.68));
  }
  if (meta.kind === "book" || /\.(pdf|epub)$/i.test(meta.name || "")) {
    addDraftOnce(drafts, draft("media-parser", "parser", "Разобрать книгу локальным парсером", "media", "Файл книги сохранен, парсер должен быть честно подключен", quote, {
      parserStatus: /\.pdf$/i.test(meta.name || "") ? "pdf-parser-required" : "epub-parser-required"
    }, 0.72));
  }
  addDraftOnce(drafts, draft("automation-context", "chat", "Открыть контекст в чате", "automation", "Чат привязывается к активному артефакту", quote, {
    mode: "local"
  }, 0.74));
  addDraftOnce(drafts, draft("control-graph", "control", "Записать связи и контроль", "control", "Каждый ввод должен быть видим в графе и журнале", quote, {
    nodes: drafts.length + 1,
    control: "audit"
  }, 0.96));

  const confidence = drafts.length ? Math.min(0.96, 0.5 + drafts.length * 0.05) : 0.35;
  return {
    artifact: {
      title: shorten(cleanLine((meta.name || text.split(/\r?\n/)[0] || "Входящий источник")), 80),
      inputType: meta.kind || "text",
      sourceName: meta.name || "manual-capture"
    },
    detectedClasses,
    entities,
    confidence,
    uncertainties: [
      ...(detectedClasses.includes("unclear/mixed") ? ["Нужно уточнить тип: задача, заметка, расход, цель или привычка."] : []),
      ...(timeNeedsChoice ? [time.ambiguityReason || "Нужно уточнить время перед планированием."] : [])
    ],
    reason: "Классификация построена по датам, суммам, повторяемости, глаголам действия и source metadata.",
    drafts,
    graphPlan: drafts.map((item) => ({ from: "source", to: item.type, reason: item.reason, confidence: item.confidence })),
    controlPlan: drafts.map((item) => ({ action: "proposal", objectType: item.type, destination: item.destination })),
    suggestedNextQuestions: detectedClasses.includes("unclear/mixed") ? ["Это скорее задача, заметка, расход или цель?"] : []
  };
}

function analyzeSourceArtifact(source) {
  const text = String(source.text || source.transcriptText || "");
  const typed = analyzeArtifactInput(text, {
    name: source.name || "",
    kind: source.kind || "",
    mime: source.mime || ""
  });
  const type = inferArtifactType(source);
  const wikiLinks = extractWikiLinks(text).map((link) => link.targetTitle);
  const actionLines = extractActionLinesV5(text);
  const dateHints = extractDateHintsV5(text);
  const urls = extractUrls(text);
  const emails = extractEmails(text);
  const headings = extractHeadings(text);
  const wordCount = text ? cleanLine(text).split(/\s+/).filter(Boolean).length : 0;
  const firstText = cleanLine(text.split(/\r?\n/).find((line) => cleanLine(line).length > 20) || text);
  const summary = text
    ? shorten(firstText || stripExtension(source.name), 180)
    : source.kind === "audio"
      ? "Аудио сохранено локально. Добавь транскрипт, чтобы подключить его к заметкам, графу, задачам и агентам."
      : "Файл сохранен локально. Для полного разбора нужен локальный парсер или ручной текст.";
  const apps = [
    "Inbox",
    source.noteId || text ? "Library" : "Library: ждет текста",
    actionLines.length || dateHints.length ? "Today" : "Today: предложения",
    "Chat",
    "Agents",
    "Graph",
    source.kind === "audio" ? "Player" : "",
    source.kind === "book" || type === "книга" ? "Book" : "",
    emails.length ? "Gmail boundary" : "",
    "Control"
  ].filter(Boolean);
  return {
    type,
    summary,
    wordCount,
    detectedClasses: typed.detectedClasses,
    confidence: typed.confidence,
    reason: typed.reason,
    uncertainties: typed.uncertainties,
    drafts: typed.drafts,
    graphPlan: typed.graphPlan,
    controlPlan: typed.controlPlan,
    suggestedNextQuestions: typed.suggestedNextQuestions,
    entities: typed.entities,
    actionLines,
    dateHints,
    urls,
    emails,
    headings,
    wikiLinks: uniqueCleanItems(wikiLinks, 8),
    apps,
    updatedAt: now()
  };
}

function normalizeArtifactAnalysis(input, source) {
  const fallback = analyzeSourceArtifact(source || {});
  const base = input && typeof input === "object" ? input : {};
  return {
    type: cleanLine(base.type || fallback.type),
    summary: cleanLine(base.summary || fallback.summary),
    wordCount: Number.isFinite(Number(base.wordCount)) ? Number(base.wordCount) : fallback.wordCount,
    detectedClasses: uniqueCleanItems(Array.isArray(base.detectedClasses) ? base.detectedClasses : fallback.detectedClasses, 24),
    confidence: Number.isFinite(Number(base.confidence)) ? Math.max(0, Math.min(1, Number(base.confidence))) : fallback.confidence,
    reason: cleanLine(base.reason || fallback.reason),
    uncertainties: uniqueCleanItems(Array.isArray(base.uncertainties) ? base.uncertainties : fallback.uncertainties, 8),
    drafts: Array.isArray(base.drafts) ? base.drafts.map((item, index) => {
      const normalized = item && typeof item === "object" ? item : {};
      return draft(
        cleanLine(normalized.draftId || "draft-" + index),
        cleanLine(normalized.type || "knowledge"),
        cleanLine(normalized.title || "Разобрать источник"),
        cleanLine(normalized.group || groupForProposalType(normalized.type)),
        cleanLine(normalized.reason || "Найдено в источнике"),
        cleanLine(normalized.quote || ""),
        normalized.fields && typeof normalized.fields === "object" ? normalized.fields : {},
        Number.isFinite(Number(normalized.confidence)) ? Number(normalized.confidence) : 0.7
      );
    }) : fallback.drafts,
    graphPlan: Array.isArray(base.graphPlan) ? base.graphPlan : fallback.graphPlan,
    controlPlan: Array.isArray(base.controlPlan) ? base.controlPlan : fallback.controlPlan,
    suggestedNextQuestions: uniqueCleanItems(Array.isArray(base.suggestedNextQuestions) ? base.suggestedNextQuestions : fallback.suggestedNextQuestions, 5),
    entities: base.entities && typeof base.entities === "object" ? base.entities : fallback.entities,
    actionLines: uniqueCleanItems(Array.isArray(base.actionLines) ? base.actionLines : fallback.actionLines, 5),
    dateHints: uniqueCleanItems(Array.isArray(base.dateHints) ? base.dateHints : fallback.dateHints, 5),
    urls: uniqueCleanItems(Array.isArray(base.urls) ? base.urls : fallback.urls, 5),
    emails: uniqueCleanItems(Array.isArray(base.emails) ? base.emails : fallback.emails, 5),
    headings: uniqueCleanItems(Array.isArray(base.headings) ? base.headings : fallback.headings, 5),
    wikiLinks: uniqueCleanItems(Array.isArray(base.wikiLinks) ? base.wikiLinks : fallback.wikiLinks, 8),
    apps: uniqueCleanItems(Array.isArray(base.apps) ? base.apps : fallback.apps, 10),
    updatedAt: base.updatedAt || fallback.updatedAt
  };
}

async function fileToSourcePayload(file, forcedKind) {
  const kind = inferSourceKind(file.name, file.type, forcedKind);
  const readableText = kind !== "audio" && canReadSourceAsText(file.name, file.type);
  const text = readableText ? await file.text() : "";
  const dataUrl = !readableText && file.size <= INLINE_MEDIA_LIMIT ? await readFileAsDataUrl(file) : "";
  const parserStatus = parserStatusForSource(file.name, kind, readableText);
  return {
    name: cleanLine(file.name || "imported-source"),
    kind,
    mime: cleanLine(file.type || ""),
    size: Number(file.size || 0),
    text,
    dataUrl,
    parserStatus,
    status: readableText ? "text-ready" : kind === "audio" ? "audio-stored" : parserStatus
  };
}

function createSourceNoteBody(source) {
  const title = stripExtension(source.name);
  const text = String(source.text || "");
  const analysis = normalizeArtifactAnalysis(source.analysis, source);
  const bodyText = text.length > SOURCE_NOTE_TEXT_LIMIT
    ? text.slice(0, SOURCE_NOTE_TEXT_LIMIT) + "\n\nSource text continues in the local repository: " + text.length + " characters."
    : text;
  return [
    "# " + title,
    "",
    "Source artifact: " + source.name,
    "Kind: " + source.kind,
    "Repository status: " + source.status,
    "Detected type: " + analysis.type,
    "Summary: " + analysis.summary,
    "",
    analysis.actionLines.length ? "Suggested actions:\n" + analysis.actionLines.map((line) => "- [ ] " + line).join("\n") : "",
    analysis.dateHints.length ? "Dates: " + analysis.dateHints.join(", ") : "",
    analysis.wikiLinks.length ? "Links: " + analysis.wikiLinks.map((link) => "[[" + link + "]]").join(", ") : "",
    "",
    bodyText || "Binary artifact stored in the local repository. Add a transcript or extracted text to connect it into the graph."
  ].join("\n");
}

function addImportedSource(state, payload) {
  const id = makeId("source");
  const createdAt = now();
  const source = {
    id,
    name: cleanLine(payload.name || "imported-source"),
    kind: cleanLine(payload.kind || "file"),
    mime: cleanLine(payload.mime || ""),
    size: Number(payload.size || 0),
    text: String(payload.text || ""),
    dataUrl: String(payload.dataUrl || ""),
    noteId: "",
    transcriptText: "",
    transcriptStatus: payload.kind === "audio" ? "needs-owner-transcript" : "",
    status: cleanLine(payload.status || "stored"),
    parserStatus: cleanLine(payload.parserStatus || payload.status || "stored"),
    analysis: {},
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  source.analysis = analyzeSourceArtifact(source);
  if (source.text) {
    const noteId = createNote(state, stripExtension(source.name), state.activeFolderId, createSourceNoteBody(source));
    source.noteId = noteId;
    addAudit(state, "source.project", "Source projected into note: " + source.name, noteId);
  } else if (source.kind === "audio") {
    const noteId = createNote(state, stripExtension(source.name), state.activeFolderId, createSourceNoteBody(source));
    source.noteId = noteId;
    addAudit(state, "source.project.audio", "Audio source projected with manual transcript gate: " + source.name, noteId);
  } else if (isBookSource(source)) {
    const noteId = createNote(state, stripExtension(source.name), state.activeFolderId, createSourceNoteBody(source));
    source.noteId = noteId;
    addAudit(state, "source.project.gated", "Book source projected with parser gate: " + source.name, noteId);
  } else if (state.activeNoteId) {
    source.noteId = state.activeNoteId;
  }
  state.sources[id] = source;
  if (isBookSource(source)) {
    ensureReadingItemForSource(state, id);
    extractHighlightsFromSource(state, id);
  }
  addAudit(state, "source.import", "Source imported: " + source.name + " (" + source.kind + ")", source.noteId);
  rebuildIndexes(state);
  return id;
}

function addProposal(state, type, title, sourceId, noteId, details) {
  const extra = details && typeof details === "object" ? details : {};
  const cleanTitle = cleanLine(title || extra.title);
  if (!cleanTitle) return "";
  const existing = Object.values(state.proposals || {}).find((proposal) => {
    return proposal.status === "open"
      && normalizeTitle(proposal.title) === normalizeTitle(cleanTitle)
      && normalizeTitle(proposal.type) === normalizeTitle(type || extra.type || "task")
      && (proposal.sourceId || "") === (sourceId || "")
      && (proposal.noteId || "") === (noteId || "");
  });
  if (existing) return existing.id;
  const id = makeId("proposal");
  const createdAt = now();
  state.proposals[id] = {
    id,
    type: cleanLine(type || "task"),
    title: cleanTitle,
    group: cleanLine(extra.group || groupForProposalType(type || "task")),
    destination: cleanLine(extra.destination || destinationForProposalType(type || "task")),
    reason: cleanLine(extra.reason || "Найдено в источнике"),
    quote: cleanLine(extra.quote || ""),
    confidence: Number.isFinite(Number(extra.confidence)) ? Math.max(0, Math.min(1, Number(extra.confidence))) : 0.72,
    fields: extra.fields && typeof extra.fields === "object" ? clone(extra.fields) : {},
    appliedObjectId: "",
    sourceId: sourceId || "",
    noteId: noteId || "",
    status: "open",
    createdAt,
    updatedAt: createdAt
  };
  return id;
}

function createActionProposalsForSource(state, sourceId) {
  const source = state.sources[sourceId];
  if (!source || source.deleted) return [];
  const title = stripExtension(source.name);
  source.analysis = normalizeArtifactAnalysis(source.analysis, source);
  const analysis = source.analysis;
  const proposals = [];
  for (const item of analysis.drafts || []) {
    proposals.push(addProposal(state, item.type, item.title, source.id, source.noteId, item));
  }
  const draftTypes = new Set((analysis.drafts || []).map((item) => item.type));
  const directTypes = new Set(["task", "calendar", "reminder", "finance_expense", "finance_income", "balance", "budget", "subscription", "bill", "habit", "routine", "goal", "money_goal", "insight", "parser", "transcript"]);
  const hasDirectProjection = (analysis.drafts || []).some((item) => directTypes.has(item.type));
  const hasTaskDraft = draftTypes.has("task");
  const hasCalendarDraft = draftTypes.has("calendar") || draftTypes.has("reminder");
  if (!hasDirectProjection) {
    proposals.push(addProposal(state, "plan", "Разобрать " + title + " сегодня", source.id, source.noteId));
    proposals.push(addProposal(state, "task", "Вытащить задачи из " + title, source.id, source.noteId));
  }
  for (const line of analysis.actionLines.slice(0, 3)) {
    if (hasTaskDraft) continue;
    proposals.push(addProposal(state, "task", "Сделать: " + line, source.id, source.noteId));
  }
  if (analysis.dateHints.length && !hasCalendarDraft) {
    proposals.push(addProposal(state, "plan", "Поставить в календарь: " + analysis.dateHints.join(", "), source.id, source.noteId));
  }
  if (analysis.urls.length || analysis.emails.length) {
    proposals.push(addProposal(state, "mail", "Проверить ссылки и контакты из " + title, source.id, source.noteId));
  }
  if (source.kind === "audio") proposals.push(addProposal(state, "transcript", "Добавить транскрипт для " + title, source.id, source.noteId));
  if (analysis.type === "книга") {
    proposals.push(addProposal(state, "book", "Собрать оглавление и главы для " + title, source.id, source.noteId));
  }
  if (source.parserStatus && source.parserStatus.includes("parser-required")) {
    proposals.push(addProposal(state, "parser", "Подключить локальный парсер для " + title, source.id, source.noteId));
  }
  const hasOnlySimpleDirectProjection = hasDirectProjection
    && (analysis.drafts || []).filter((item) => directTypes.has(item.type)).length <= 2
    && analysis.actionLines.length <= 1
    && !analysis.urls.length
    && !analysis.emails.length;
  if (!hasOnlySimpleDirectProjection) proposals.push(addProposal(state, "agent", "Запустить локального организатора для " + title, source.id, source.noteId));
  return proposals.filter(Boolean);
}

function captureTextArtifact(state, text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return "";
  const firstLine = cleanLine(cleanText.split(/\r?\n/).find(Boolean) || "Inbox capture");
  const sourceId = addImportedSource(state, {
    name: shorten(firstLine, 48) + ".md",
    kind: "text",
    mime: "text/markdown",
    size: cleanText.length,
    text: cleanText,
    dataUrl: "",
    parserStatus: "text-ready",
    status: "text-ready"
  });
  createActionProposalsForSource(state, sourceId);
  state.captureDraft = "";
  addChatMessage(state, "owner", cleanText, sourceId, state.sources[sourceId] ? state.sources[sourceId].noteId : "");
  addChatMessage(state, "assistant", "Артефакт связан с Библиотекой, Графом и предложениями на Сегодня.", sourceId, state.sources[sourceId] ? state.sources[sourceId].noteId : "");
  addAudit(state, "inbox.capture", "Inbox text captured as artifact", state.sources[sourceId] ? state.sources[sourceId].noteId : "");
  return sourceId;
}

function applySourceProposals(state, sourceId, acceptedTypes) {
  const allowed = Array.isArray(acceptedTypes) && acceptedTypes.length ? new Set(acceptedTypes) : null;
  const ids = Object.values(state.proposals || {})
    .filter((proposal) => proposal.status === "open" && (!sourceId || proposal.sourceId === sourceId))
    .filter((proposal) => !allowed || allowed.has(proposal.type) || allowed.has(proposal.group || groupForProposalType(proposal.type)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((proposal) => proposal.id);
  for (const proposalId of ids) applyProposal(state, proposalId);
  return ids.length;
}

function quickTaskFromCapture(state, text) {
  const cleanText = repairMojibake(String(text || "")).replace(/^задача\s*:\s*/i, "").trim();
  if (!cleanText) {
    state.captureDraft = "Задача: ";
    addAudit(state, "capture.template", "Quick task template opened", state.activeNoteId);
    return "";
  }
  const sourceId = captureTextArtifact(state, cleanText);
  const accepted = applySourceProposals(state, sourceId, ["task", "calendar", "plan", "reminder", "actions", "calendar"]);
  if (!accepted) {
    const source = state.sources[sourceId];
    addTask(state, cleanText, {
      day: parseDateFromText(cleanText) || todayKey(),
      startTime: parseTimeFromText(cleanText).startTime,
      sourceId,
      noteId: source ? source.noteId : state.activeNoteId
    });
  }
  const schedule = parseTaskSchedule(cleanText, "", {});
  const when = schedule.day === dateKeyFromOffset(1) ? "на завтра" : schedule.day === todayKey() ? "на сегодня" : schedule.day;
  state.commandMessage = "Готово: задача создана " + when + (schedule.startTime ? " " + schedule.startTime : "");
  addChatMessage(state, "assistant", state.commandMessage, sourceId, state.sources[sourceId] ? state.sources[sourceId].noteId : state.activeNoteId);
  rebuildIndexes(state);
  return sourceId;
}

function addControlReceipt(state, kind, objectId, summary, options) {
  state.control = state.control && typeof state.control === "object" ? state.control : {};
  const receipt = {
    id: makeId("receipt"),
    kind: cleanLine(kind || "receipt"),
    objectId: cleanLine(objectId || ""),
    summary: cleanLine(summary || ""),
    surface: cleanLine((options && options.surface) || state.activeSurface || ""),
    noteId: cleanLine((options && options.noteId) || ""),
    sourceId: cleanLine((options && options.sourceId) || ""),
    createdAt: now()
  };
  state.control.receipts = [receipt].concat(Array.isArray(state.control.receipts) ? state.control.receipts : []).slice(0, 160);
  return receipt.id;
}

function addChatMessage(state, role, text, sourceId, noteId) {
  const id = makeId("message");
  const createdAt = now();
  const cleanRole = role === "assistant" ? "assistant" : "owner";
  const cleanText = String(text || "");
  const resolvedNoteId = noteId || state.activeNoteId || "";
  const resolvedSourceId = sourceId || "";
  const receiptId = addControlReceipt(state, "chat.message", id, cleanRole + ": " + shorten(cleanText, 110), {
    noteId: resolvedNoteId,
    sourceId: resolvedSourceId,
    surface: "chat"
  });
  state.chatMessages[id] = {
    id,
    role: cleanRole,
    text: cleanText,
    entityType: "chat-message",
    artifactKind: "chat",
    searchText: [cleanRole, cleanText].join(" "),
    sourceId: resolvedSourceId,
    noteId: resolvedNoteId,
    proposalId: "",
    receiptId,
    deleted: false,
    createdAt
  };
  addAudit(state, cleanRole === "owner" ? "chat.input.artifact" : "chat.answer.artifact", cleanRole + " chat artifact recorded: " + shorten(cleanText, 120), resolvedNoteId);
  state.graphProjectionStamp = Number(state.graphProjectionStamp || 0) + 1;
  return id;
}

function chatMessageToProposal(state, messageId, type) {
  const message = state.chatMessages[messageId];
  if (!message || !cleanLine(message.text)) return "";
  const cleanType = cleanLine(type || "task");
  const proposalId = addProposal(state, cleanType, (cleanType === "plan" ? "Запланировать из чата: " : "Сделать из чата: ") + shorten(message.text, 72), message.sourceId || "", message.noteId || state.activeNoteId || "", {
    reason: "Created from artifact-scoped local chat message",
    quote: message.text,
    fields: {
      chatMessageId: message.id,
      source: "local-chat",
      mutationMode: "proposal-only"
    }
  });
  message.proposalId = proposalId;
  addAudit(state, "chat.proposal", "Chat message became proposal: " + shorten(message.text, 90), message.noteId || state.activeNoteId);
  return proposalId;
}

function latestOwnerChatMessage(state) {
  return Object.values(state.chatMessages || {}).filter((message) => message.role === "owner").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}

function isLegacyChatStubText(text) {
  const value = normalizeRuText(repairMojibake(String(text || ""))).toLocaleLowerCase();
  return [
    value.includes("сообщение привязано к активному артефакту") && (value.includes("flow") || value.includes("agent")),
    value.includes("артефакт связан с библиотекой") && value.includes("графом"),
    value.startsWith("я понял") && value.includes("мой локальный вывод"),
    value.startsWith("я понял") && value.includes("без твоего подтверждения"),
    value.includes("прямого факта по этому вопросу") && value.includes("запрос по базе")
  ].some(Boolean);
}

function visibleChatMessages(state) {
  return Object.values(state.chatMessages || {})
    .filter((message) => !message.deleted && !(message.role === "assistant" && isLegacyChatStubText(message.text || message.content || "")))
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

function activeChatContext(state) {
  const note = getActiveNote(state);
  const source = humanVisibleSource(state) || latestSource(state);
  const selected = graphNodeObject(state, state.graphView && state.graphView.selectedNodeId ? state.graphView.selectedNodeId : "");
  const selectedTitle = selected ? graphNodeTitle(selected.kind, selected.object, selected.object ? selected.object.id : "") : "";
  const sourceText = source ? cleanLine(source.text || source.transcriptText || source.name || "") : "";
  const noteText = note ? cleanLine(note.body || note.title || "") : "";
  const title = selectedTitle || (source ? source.name : "") || (note ? note.title : "") || "активный контекст";
  const text = sourceText || noteText || title;
  return {
    note,
    source,
    selected,
    title: repairMojibake(title),
    text: repairMojibake(shorten(text, 420))
  };
}

function localChatSearchLines(state, query) {
  const cleanQuery = cleanLine(query).replace(/^(найди|поиск|искать|search)\s*/i, "").trim();
  if (!cleanQuery) return [];
  return searchNotes(state, cleanQuery)
    .filter((note) => note.systemType !== "product_brain")
    .slice(0, 3)
    .map((note) => note.title);
}

function chatHasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function chatContextSentence(context) {
  const title = shorten(context.title || "активный контекст", 96);
  const text = context.text && context.text !== context.title ? shorten(context.text, 260) : "";
  return text ? "В фокусе «" + title + "»: " + text + "." : "В фокусе «" + title + "».";
}

function chatLocalEngineSummaryLegacy(state) {
  const status = state.ollama && state.ollama.status ? state.ollama.status : "unchecked";
  if (status === "models_found") return "Ollama найдена, но чат всё равно не отправляет данные наружу без явного действия.";
  if (status === "reachable") return "Ollama доступна, модель выбирается отдельно; локальный чат уже работает без неё.";
  return "Ollama сейчас не нужна для этого ответа: он собран локально из состояния LifeOS в браузере.";
}

function buildLocalChatAnswerLegacy(state, text) {
  const raw = cleanLine(repairMojibake(text));
  if (!raw) return "Напиши сообщение, и я отвечу по текущему контексту LifeOS.";
  const q = normalizeRuText(raw).toLocaleLowerCase();
  const context = activeChatContext(state);
  const openTasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done");
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open");
  const systemsCount = Object.values(state.systemDefinitions || {}).filter((item) => !item.deleted).length;
  const databasesCount = Object.values(state.customDatabases || {}).filter((item) => !item.deleted).length;
  const modelsCount = Object.values(state.modelProfiles || {}).filter((item) => !item.deleted).length;
  const contextLine = chatContextSentence(context);
  const found = localChatSearchLines(state, raw).filter(Boolean);

  if (/\b(привет|hello|hi|здравствуй|здарова)\b/i.test(q)) {
    return "Привет. Я на месте: сообщение сохранено в локальном чате и ответ строится прямо внутри LifeOS. " + contextLine;
  }

  if (chatHasAny(q, ["enter", "энтер", "клавиш", "отправить нужно", "только кнопкой", "shift+enter"])) {
    return "Enter должен отправлять сообщение, Shift+Enter оставляет перенос строки. Если после обновления страницы это не так, значит открыт старый кэш сборки, а не текущий код. Я не меняю данные молча: сообщение сохраняется, ответ добавляется, затем чат прокручивается к последнему сообщению.";
  }

  if (chatHasAny(q, ["шаблон", "заглушк", "будешь отвечать", "только шаблон", "не рабоч", "нерабоч", "тупо", "не отвеч", "ответишь", "ответь", "чат работает"])) {
    return [
      "Да, буду отвечать на вопросы, а не повторять одну фразу.",
      "Текущий режим честный: это локальный контекстный движок, не свободный LLM, поэтому я распознаю намерение, беру активный артефакт, задачи, предложения, системы, граф и отвечаю по тому, что реально есть в хранилище.",
      chatLocalEngineSummary(state),
      contextLine
    ].join(" ");
  }

  if (chatHasAny(q, ["локально", "желез", "компьютер", "браузер", "за счет", "за сч", "работаеш", "работаешь", "ollama", "оллама", "модель", "ai", "ии"])) {
    return [
      "Сейчас ответ работает локально: браузер читает состояние LifeOS из IndexedDB/localStorage и строит ответ без отправки твоих данных во внешний сервис.",
      chatLocalEngineSummary(state),
      "Когда Ollama будет реально поднята и проверена, её можно использовать как отдельный локальный LLM-слой, но отсутствие Ollama больше не должно превращать чат в мёртвую заглушку."
    ].join(" ");
  }

  if (chatHasAny(q, ["что умеешь", "что можешь", "как работает", "функц", "возможн", "сценар"])) {
    return [
      "Могу объяснить активный артефакт, найти связанные заметки, предложить следующий шаг, посчитать открытые задачи/предложения, связать сообщение с графом и превратить твоё сообщение в задачу или план через явную кнопку.",
      "Сейчас в системе: открытых задач " + openTasks.length + ", открытых предложений " + openProposals.length + ", систем " + systemsCount + ", баз " + databasesCount + ".",
      "Никаких скрытых действий: сначала ответ или предложение, потом твоё подтверждение."
    ].join(" ");
  }

  if (chatHasAny(q, ["что это", "что за", "контекст", "артефакт", "ввод", "связано"])) {
    return contextLine + " В LifeOS это не просто поле ввода: сообщение хранится локально, получает связь с активным артефактом и может стать задачей, планом или предложением, но без твоего явного действия я ничего не меняю.";
  }

  if (chatHasAny(q, ["что делать", "дальше", "следующ", "план", "next", "порядок"])) {
    const next = [];
    if (openProposals.length) next.push("разобрать " + openProposals.length + " открытых предложений во Входящих");
    if (openTasks.length) next.push("закрыть или запланировать " + openTasks.length + " открытых задач");
    if (context.source) next.push("превратить активный источник в задачу или календарный блок");
    if (!next.length) next.push("захватить новый источник или создать систему под текущий процесс");
    return contextLine + " Следующий практичный порядок: " + next.slice(0, 3).join("; ") + ". Быстрый путь: кнопка «Сделать задачей» рядом с твоим сообщением или раздел «Входящие» для применения предложений.";
  }

  if (chatHasAny(q, ["задач", "напомин", "календар"])) {
    return "По текущему контексту можно создать задачу или календарный шаг. Я не создаю его молча: нажми «Сделать задачей» у своего сообщения, либо перейди во «Входящие» и примени предложение. Открытых задач сейчас: " + openTasks.length + ".";
  }

  if (chatHasAny(q, ["найди", "поиск", "искать", "search"])) {
    return found.length
      ? "Нашёл в локальной базе: " + found.join("; ") + ". Открой «База» или «Граф», чтобы перейти к связанным артефактам."
      : "В локальной базе по этому запросу явных совпадений не нашёл. Можно сохранить запрос через «Команды» или добавить источник во «Входящие».";
  }

  if (chatHasAny(q, ["деньг", "финанс", "расход", "баланс"])) {
    const summary = financeSummary(state);
    return "По финансам сейчас: баланс " + Math.round(summary.balance || 0).toLocaleString("ru-RU") + " ₽, расходы сегодня " + Math.round(summary.todaySpend || 0).toLocaleString("ru-RU") + " ₽. Для записи расхода открой «Деньги» или введи во «Входящие»: Расход: название сумма.";
  }

  if (chatHasAny(q, ["систем", "v34", "маркет", "пак", "баз"])) {
    return "В v34 уже есть " + systemsCount + " систем, " + databasesCount + " баз и " + modelsCount + " маршрутов моделей. Системы и базы создаются как локальные артефакты: они видны в Графе, Контроле и экспорте. Marketplace ставит только local-definition пакеты без запуска чужого кода.";
  }

  if (found.length) {
    return "Похоже, это связано с локальными артефактами: " + found.join("; ") + ". " + contextLine + " Я бы сначала открыл связь в «Графе», а действие оформил как предложение, чтобы ничего не поменять без подтверждения.";
  }

  return "Прямого факта по этому вопросу в локальном контексте не вижу. " + contextLine + " Могу безопасно сделать следующее: оставить это как сообщение, превратить в задачу/план через кнопку рядом с сообщением или использовать текст как запрос по Базе и Графу. Данные сам не меняю.";
}

function chatSurfaceLabel(surface) {
  const labels = {
    inbox: "Дом",
    capture: "Ввод",
    feed: "Лента",
    today: "Сегодня",
    calendar: "Календарь",
    finance: "Деньги",
    habits: "Привычки",
    goals: "Цели",
    library: "База",
    reader: "Чтение",
    player: "Аудио",
    chat: "Чат",
    agents: "Сценарии",
    flows: "Flow",
    systems: "Системы",
    builder: "Builder",
    projects: "Проекты",
    models: "Model Hub",
    "smart-home": "Умный дом",
    marketplace: "Marketplace",
    design: "Дизайн",
    databases: "Базы данных",
    screen: "Экран",
    twin: "Twin",
    graph: "Граф",
    control: "Data Control",
    providers: "Подключения"
  };
  return labels[String(surface || "")] || String(surface || "текущий экран");
}

function chatOllamaStatusLine(state) {
  const ollama = state.ollama || {};
  const status = cleanLine(ollama.status || "unchecked");
  const endpoint = cleanLine(ollama.endpoint || "http://127.0.0.1:11434");
  const models = Array.isArray(ollama.models) ? ollama.models.filter(Boolean) : [];
  const selectedModel = cleanLine(ollama.selectedModel || models[0] || "");
  const checkedAt = cleanLine(ollama.lastProbeAt || ollama.lastCheckedAt || "");
  const generationStatus = cleanLine(ollama.lastGenerationStatus || "not-run");
  const latency = Number(ollama.lastLatencyMs || 0);
  const error = cleanLine(ollama.lastError || "");
  const statusText = status === "models_found"
    ? "модели найдены, генерация отдельно не подтверждена"
    : status === "reachable"
      ? "endpoint доступен, но модель не выбрана"
      : status === "generation_ok"
        ? "тест генерации прошёл"
        : status === "degraded"
          ? "probe был, но тест генерации не прошёл"
          : status === "blocked_by_browser_or_cors"
            ? "браузерный запрос заблокирован или CORS не разрешён"
            : status === "offline"
              ? "endpoint не отвечает"
              : status === "revoked"
                ? "отключено владельцем"
                : "ещё не проверено";
  return [
    "Ollama provider: status=" + status + " (" + statusText + ")",
    "endpoint=" + endpoint,
    selectedModel ? "model=" + selectedModel : "model=не выбрана",
    models.length ? "models=" + models.length : "models=0",
    "generation=" + generationStatus,
    "connected=" + (generationStatus === "generation_ok" ? "true" : "false"),
    checkedAt ? "lastProbe=" + checkedAt : "probe=ещё не запускался",
    latency ? "latency=" + latency + "ms" : "",
    error ? "lastError=" + shorten(error, 140) : "",
    "fallback=Local Rules"
  ].filter(Boolean).join(", ") + ".";
}

function chatLocalEngineSummary(state) {
  return chatOllamaStatusLine(state);
}

function chatRuntimeSnapshot(state, context) {
  const surface = chatSurfaceLabel(state.activeSurface || "inbox");
  const openTasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done").length;
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length;
  const systemsCount = Object.values(state.systemDefinitions || {}).filter((item) => !item.deleted).length;
  const databasesCount = Object.values(state.customDatabases || {}).filter((item) => !item.deleted).length;
  const modelsCount = Object.values(state.modelProfiles || {}).filter((item) => !item.deleted).length;
  const channelsCount = Object.values(state.channels || {}).filter((item) => !item.deleted).length;
  const graph = mapGraph(state);
  const events = (state.auditLog || []).slice(-3).map((event) => auditTypeLabel(event.type) + ": " + shorten(event.summary || event.type || "", 60));
  return {
    surface,
    openTasks,
    openProposals,
    systemsCount,
    databasesCount,
    modelsCount,
    channelsCount,
    graphNodes: graph.nodes.length,
    graphLinks: graph.links.length,
    contextLine: chatContextSentence(context),
    dataLine: "Экран: " + surface + "; задач=" + openTasks + "; предложений=" + openProposals + "; систем=" + systemsCount + "; баз=" + databasesCount + "; моделей=" + modelsCount + "; каналов=" + channelsCount + "; граф=" + graph.nodes.length + "/" + graph.links.length + ".",
    eventLine: events.length ? "Последние следы: " + events.join("; ") + "." : "Следы появятся в audit после действий владельца."
  };
}

function buildLocalChatAnswer(state, text) {
  const raw = cleanLine(repairMojibake(text));
  if (!raw) return "Напиши сообщение, и я отвечу по текущему локальному контексту LifeOS.";
  const q = normalizeRuText(raw).toLocaleLowerCase();
  const context = activeChatContext(state);
  const runtime = chatRuntimeSnapshot(state, context);
  const found = localChatSearchLines(state, raw).filter(Boolean);
  const ollamaLine = chatOllamaStatusLine(state);
  const irritated = chatHasAny(q, ["нихрена", "нихуя", "бесит", "тупо", "тупой", "не работает", "нерабоч", "шаблон", "заглушк", "дублирован", "не отвечает"]);

  if (chatHasAny(q, ["привет", "hello", "hi", "здравствуй", "здарова", "добрый день"])) {
    return "Привет. Я отвечаю не шаблоном, а по локальному состоянию LifeOS: " + runtime.dataLine + " " + runtime.contextLine;
  }

  if (chatHasAny(q, ["enter", "энтер", "клавиш", "shift+enter", "только кнопкой", "отправить нужно", "отправляется"])) {
    return "В чате ожидаемое поведение такое: Enter отправляет сообщение, Shift+Enter оставляет перенос строки, пустое сообщение не отправляется, после отправки поле очищается и лента прокручивается вниз. Если видишь другое, это уже баг интерфейса или старый кэш сборки, а не задуманный режим.";
  }

  if (irritated || chatHasAny(q, ["ты будешь отвечать", "только шаблоны", "почему чат", "чат не работает", "это ввод что ли"])) {
    return [
      "Да, это должен быть рабочий чат, а не поле, которое просто привязывает текст.",
      "Сейчас я работаю как локальный intent-движок: читаю активный артефакт, задачи, предложения, системы, граф, Data Control и статус провайдера, потом отвечаю по этому состоянию.",
      runtime.dataLine,
      ollamaLine,
      "Сообщение сохраняется как chat message, рядом можно явно сделать задачу; без твоего действия я не меняю задачи, календарь или данные."
    ].join(" ");
  }

  if (chatHasAny(q, ["что с ollama", "оллама", "ollama", "локальная модель", "подключить модель", "как подключить локальную модель", "модель подключена"])) {
    return [
      ollamaLine,
      "Подключение считается настоящим только после явной проверки /api/tags и, отдельно, теста генерации /api/generate.",
      "Если endpoint не отвечает или браузер блокирует запрос, интерфейс обязан показывать failed/degraded, а ответы продолжают работать через Local Rules."
    ].join(" ");
  }

  if (chatHasAny(q, ["ты работаешь", "почему не отвечает", "как ты работаешь", "локально", "за счет железа", "за счёт железа", "браузер"])) {
    return [
      "Сейчас отвечаю локально в браузере: состояние LifeOS берётся из локального хранилища, а ответ собирается правилами Local Rules.",
      "Это не внешний облачный чат и не скрытая отправка данных.",
      ollamaLine,
      runtime.contextLine
    ].join(" ");
  }

  if (chatHasAny(q, ["что такое lifeos", "что это за lifeos", "объясни lifeos", "для чего lifeos"])) {
    return [
      "LifeOS здесь устроен как локальная операционная система для личных артефактов: ввод, заметки, задачи, календарь, финансы, база знаний, системы, проекты, модели, граф и Data Control живут в одном состоянии.",
      "Главный принцип: сначала локальный артефакт и след, потом явное действие владельца, потом receipt/audit, графовая связь и возможность контроля или экспорта.",
      runtime.dataLine
    ].join(" ");
  }

  if (chatHasAny(q, ["что есть в v34", "v34", "покажи системы", "системы", "model hub", "модельный хаб", "маркет", "marketplace"])) {
    return [
      "В v34 видны рабочие поверхности: Системы, База, Граф, Data Control, Model Hub, Marketplace, Проекты, Базы данных, Экран/Twin и локальные подключения.",
      "По текущему состоянию: систем " + runtime.systemsCount + ", баз " + runtime.databasesCount + ", маршрутов моделей " + runtime.modelsCount + ", каналов " + runtime.channelsCount + ".",
      "Артефакты и действия должны проходить через локальное состояние, графовые связи, audit/receipts и экспорт, а не через декоративные заглушки."
    ].join(" ");
  }

  if (chatHasAny(q, ["объясни граф", "граф", "связи", "graph", "узлы", "ребра", "рёбра"])) {
    return [
      "Граф показывает реальные связи между артефактами: источники, заметки, задачи, предложения, провайдер-прогоны, системы и чат-сообщения.",
      "Сейчас в проекции " + runtime.graphNodes + " узлов и " + runtime.graphLinks + " связей.",
      "Через граф можно проверить, откуда появилось действие и с чем оно связано, вместо того чтобы верить тексту на экране."
    ].join(" ");
  }

  if (chatHasAny(q, ["data control", "контроль", "дата контрол", "экспорт", "удалить", "восстановить", "rollback", "данные"])) {
    return [
      "Data Control нужен для честного управления данными: увидеть типы объектов, выбранный артефакт, провайдеры, следы, экспорт, восстановление и rollback-снимки.",
      "Чат-сообщения теперь входят в локальные данные, экспорт и графовую проекцию, поэтому их можно проверить как обычный след системы.",
      runtime.eventLine
    ].join(" ");
  }

  if (chatHasAny(q, ["что можно сделать с текущим экраном", "текущий экран", "что делать на этом экране", "что доступно здесь"])) {
    return [
      "Сейчас открыт экран " + runtime.surface + ".",
      runtime.contextLine,
      "Практические действия: спросить по активному артефакту, найти связанные заметки, открыть Граф/Data Control, превратить своё сообщение в задачу через кнопку рядом с сообщением или проверить Ollama отдельной кнопкой."
    ].join(" ");
  }

  if (chatHasAny(q, ["это задача или ввод", "задача или ввод", "просто ввод", "сделай задачу", "создай задачу", "напоминание", "календарь"])) {
    return [
      "Само сообщение в чате сначала является вводом и локальным артефактом.",
      "Задачей оно становится только после явного действия: кнопка рядом с твоим сообщением создаёт proposal/task-flow, а затем это видно во Входящих, Графе и Data Control.",
      "Открытых задач сейчас: " + runtime.openTasks + "; открытых предложений: " + runtime.openProposals + "."
    ].join(" ");
  }

  if (chatHasAny(q, ["что делать дальше", "дальше", "следующий шаг", "план", "порядок"])) {
    const next = [];
    if (runtime.openProposals) next.push("разобрать открытые предложения во Входящих");
    if (runtime.openTasks) next.push("закрыть, перенести или связать открытые задачи");
    if (context.source) next.push("превратить активный источник в задачу или календарный блок");
    if (!next.length) next.push("добавить новый источник во Входящие или открыть Граф для проверки связей");
    return runtime.contextLine + " Следующий практический порядок: " + next.slice(0, 3).join("; ") + ".";
  }

  if (chatHasAny(q, ["найди", "поиск", "искать", "search"])) {
    return found.length
      ? "Нашёл в локальной базе: " + found.join("; ") + ". Открой Базу или Граф, чтобы перейти к связанным артефактам."
      : "По этому запросу в локальной базе явных совпадений не вижу. Можно оставить запрос в чате как след, создать задачу на разбор или добавить источник во Входящие.";
  }

  if (chatHasAny(q, ["деньг", "финанс", "расход", "баланс"])) {
    const summary = financeSummary(state);
    return "По финансам сейчас: баланс " + Math.round(summary.balance || 0).toLocaleString("ru-RU") + " руб., расходы сегодня " + Math.round(summary.todaySpend || 0).toLocaleString("ru-RU") + " руб. Для записи расхода открой Деньги или добавь источник во Входящие.";
  }

  if (chatHasAny(q, ["что это", "что за", "контекст", "артефакт", "связано"])) {
    return runtime.contextLine + " Это локальный артефактный контекст: сообщение хранится в чате, связывается с активной заметкой/источником и может стать задачей или планом только после явного действия.";
  }

  if (found.length) {
    return "Похоже, это связано с локальными артефактами: " + found.join("; ") + ". " + runtime.contextLine + " Без подтверждения я ничего не меняю: можно открыть связь в Графе или сделать из сообщения задачу.";
  }

  return [
    "Я не нашёл точного совпадения в заметках по этому тексту, поэтому опираюсь на текущие локальные следы.",
    runtime.contextLine,
    runtime.dataLine,
    "Могу продолжить по одному из проверяемых направлений: поиск по Базе, связь в Графе, статус Ollama или Data Control для этого сообщения."
  ].join(" ");
}

function answerProductBrainQuestion(state, text) {
  const q = normalizeTitle(repairMojibake(String(text || "")));
  const productIntent = q.includes("product brain") || q.includes("продукт") || q.includes("разработ") || q.includes("додел") || q.includes("готов") || q.includes("ux") || q.includes("календар") || q.includes("доказател") || q.includes("пакет");
  if (!productIntent) return "";
  const summary = productBrainStatusSummary(state);
  if (q.includes("что осталось") || q.includes("додел") || q.includes("осталось")) {
    return summary.nextPackage + " / локально закрыто: Product Brain, GitHub lite snapshot и final owner audits прошли. Остались только внешние provider gates и вопрос отдельного архива для omitted evidence.";
  }
  if (q.includes("почему") || q.includes("не готов")) {
    return "Не называю систему DONE_ALL автоматически: GitHub ветка подтверждена как lite snapshot, но 135 больших evidence файлов вынесены в remote manifest, а внешние движки Ollama/Gmail/OCR/STT/PDF/EPUB остаются gated честно, с fallback без фейкового успеха.";
  }
  if (q.includes("след") || q.includes("пакет") || q.includes("важн")) {
    return "Следующий самый важный пакет: " + summary.nextPackage + ". Цель: подключить или честно оставить gated Ollama/Gmail/calendar/OCR/STT/PDF/EPUB/Notifications и при необходимости вынести omitted evidence в отдельный архив.";
  }
  if (q.includes("ux")) {
    return "Главные UX-долги из Product Brain: не допустить возврата cockpit Home, сохранить distinct workspaces, держать Graph с Product Brain filter/edge reasons, сделать Chat понятным контекстным двигателем, показывать development state в Control.";
  }
  if (q.includes("календар") || q.includes("доказател")) {
    return "Доказательства календаря: e2e:calendar использует market-owner spec; screenshots: public-demo-evidence/market-calendar-week.png и public-demo-evidence/final/final-calendar-week.png; graph/control evidence создается через task/plan/reminder edges и audit events.";
  }
  return "Product Brain: " + summary.noteCount + " узлов, DONE " + (summary.counts.DONE || 0) + ", PARTIAL " + (summary.counts.PARTIAL || 0) + ", GATED " + (summary.counts.GATED || 0) + ". Текущий пакет: " + summary.currentPackage + ". Следующий: " + summary.nextPackage + ".";
}

function runLocalAgent(state, sourceId, noteId) {
  const source = state.sources[sourceId] || null;
  const note = state.notes[noteId] || (source && source.noteId ? state.notes[source.noteId] : null);
  const title = source ? stripExtension(source.name) : note ? note.title : "Active artifact";
  const analysis = source ? normalizeArtifactAnalysis(source.analysis, source) : null;
  const summary = analysis
    ? analysis.summary + (analysis.actionLines.length ? " Действия: " + analysis.actionLines.slice(0, 2).join("; ") : "")
    : note ? shorten(note.body, 180) : "No active artifact selected.";
  const id = makeId("agent");
  const createdAt = now();
  state.agentRuns[id] = {
    id,
    name: "Local organizer",
    status: "dry-run",
    sourceId: source ? source.id : "",
    noteId: note ? note.id : "",
    summary,
    scopes: ["read-active-artifact", "create-proposals"],
    proposedActions: ["task-proposal", "plan-proposal"],
    createdAt,
    updatedAt: createdAt
  };
  addProposal(state, "task", "Сделать следующий шаг по " + title, source ? source.id : "", note ? note.id : "");
  addProposal(state, "plan", "Запланировать обзор " + title, source ? source.id : "", note ? note.id : "");
  addChatMessage(state, "assistant", "Локальный организатор подготовил действия для " + title + ".", source ? source.id : "", note ? note.id : "");
  addAudit(state, "agent.run", "Local organizer completed: " + title, note ? note.id : "");
  return id;
}

function addReminder(state, title, options) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const schedule = parseTaskSchedule(cleanTitle, options ? options.dateHint : "", options || {});
  const id = makeId("reminder");
  const createdAt = now();
  state.reminders[id] = {
    id,
    title: cleanTitle,
    noteId: options && options.noteId ? options.noteId : state.activeNoteId || "",
    sourceId: options && options.sourceId ? options.sourceId : "",
    day: options && options.day ? cleanLine(options.day) : schedule.day,
    time: normalizeTime(options && options.time ? options.time : schedule.startTime),
    status: "open",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "reminder.create", "Reminder created: " + cleanTitle, state.reminders[id].noteId);
  return id;
}

function addHabit(state, title, options) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const id = makeId("habit");
  const createdAt = now();
  state.habits[id] = {
    id,
    title: cleanTitle,
    frequency: cleanLine(options && options.frequency ? options.frequency : "daily"),
    checkins: {},
    noteId: options && options.noteId ? options.noteId : state.activeNoteId || "",
    sourceId: options && options.sourceId ? options.sourceId : "",
    status: "active",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "habit.create", "Habit created: " + cleanTitle, state.habits[id].noteId);
  return id;
}

function toggleHabit(state, habitId, day) {
  const habit = state.habits[habitId];
  if (!habit) return;
  const key = day || todayKey();
  habit.checkins = habit.checkins && typeof habit.checkins === "object" ? habit.checkins : {};
  if (habit.checkins[key]) {
    delete habit.checkins[key];
  } else {
    habit.checkins[key] = now();
  }
  habit.updatedAt = now();
  addAudit(state, "habit.check", "Habit check toggled: " + habit.title, habit.noteId);
}

function archiveHabit(state, habitId) {
  const habit = state.habits[habitId];
  if (!habit || habit.deleted) return;
  habit.deleted = true;
  habit.updatedAt = now();
  addAudit(state, "habit.archive", "Habit archived: " + habit.title, habit.noteId);
}

function restoreHabit(state, habitId) {
  const habit = state.habits[habitId];
  if (!habit || !habit.deleted) return;
  habit.deleted = false;
  habit.updatedAt = now();
  addAudit(state, "habit.restore", "Habit restored: " + habit.title, habit.noteId);
}

function ensureFinanceAccount(state, name, balance) {
  const cleanName = cleanLine(name || "Основной счет");
  const existing = Object.values(state.financeAccounts || {}).find((account) => !account.deleted && normalizeTitle(account.name) === normalizeTitle(cleanName));
  if (existing) {
    if (Number.isFinite(Number(balance))) existing.balance = Number(balance);
    existing.updatedAt = now();
    return existing.id;
  }
  const id = makeId("account");
  const createdAt = now();
  state.financeAccounts[id] = {
    id,
    name: cleanName,
    balance: Number.isFinite(Number(balance)) ? Number(balance) : 0,
    currency: "RUB",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "finance.account", "Finance account set: " + cleanName, state.activeNoteId);
  return id;
}

function addFinanceTransaction(state, title, amount, kind, options) {
  const cleanTitle = cleanLine(title);
  const value = Math.abs(Number(amount || 0));
  if (!cleanTitle || !value) return "";
  const accountId = ensureFinanceAccount(state, options && options.accountName ? options.accountName : "Основной счет");
  const id = makeId("tx");
  const createdAt = now();
  const txKind = ["expense", "income", "transfer", "debt"].includes(kind) ? kind : "expense";
  state.financeTransactions[id] = {
    id,
    title: cleanTitle,
    amount: value,
    kind: txKind,
    category: cleanLine(options && options.category ? options.category : "Разное"),
    accountId,
    day: cleanLine(options && options.day ? options.day : todayKey()),
    noteId: options && options.noteId ? options.noteId : state.activeNoteId || "",
    sourceId: options && options.sourceId ? options.sourceId : "",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  const account = state.financeAccounts[accountId];
  if (account) account.balance += txKind === "income" ? value : -value;
  addAudit(state, "finance.transaction", "Finance " + txKind + ": " + cleanTitle + " " + value + " RUB", state.financeTransactions[id].noteId);
  return id;
}

function addBudget(state, category, limit, options) {
  const cleanCategory = cleanLine(category || "Разное");
  const value = Math.abs(Number(limit || 0));
  if (!cleanCategory || !value) return "";
  const id = makeId("budget");
  const createdAt = now();
  state.budgets[id] = {
    id,
    category: cleanCategory,
    limit: value,
    period: cleanLine(options && options.period ? options.period : "month"),
    noteId: options && options.noteId ? options.noteId : state.activeNoteId || "",
    sourceId: options && options.sourceId ? options.sourceId : "",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "finance.budget", "Budget set: " + cleanCategory + " " + value, state.activeNoteId);
  return id;
}

function addSubscription(state, title, amount, options) {
  const cleanTitle = cleanLine(title);
  const value = Math.abs(Number(amount || 0));
  if (!cleanTitle || !value) return "";
  const id = makeId("sub");
  const createdAt = now();
  state.subscriptions[id] = {
    id,
    title: cleanTitle,
    amount: value,
    category: cleanLine(options && options.category ? options.category : "Подписки"),
    day: cleanLine(options && options.day ? options.day : todayKey()),
    sourceId: options && options.sourceId ? options.sourceId : "",
    noteId: options && options.noteId ? options.noteId : state.activeNoteId || "",
    status: "active",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "finance.subscription", "Subscription added: " + cleanTitle + " " + value, state.subscriptions[id].noteId);
  return id;
}

function addInsight(state, title, reason, options) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const id = makeId("insight");
  const createdAt = now();
  state.insights[id] = {
    id,
    title: cleanTitle,
    reason: String(reason || ""),
    sourceId: options && options.sourceId ? options.sourceId : "",
    noteId: options && options.noteId ? options.noteId : state.activeNoteId || "",
    status: "open",
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "insight.create", "Insight created: " + cleanTitle, state.insights[id].noteId);
  return id;
}

function sourceForNote(state, noteId) {
  return Object.values(state.sources || {})
    .filter((source) => !source.deleted && source.noteId === noteId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
}

function addClaim(state, title, body, options) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const opts = options && typeof options === "object" ? options : {};
  const id = makeId("claim");
  const createdAt = now();
  state.claims[id] = {
    id,
    title: cleanTitle,
    body: String(body || ""),
    quote: String(opts.quote || ""),
    sourceId: opts.sourceId && state.sources[opts.sourceId] && !state.sources[opts.sourceId].deleted ? opts.sourceId : "",
    noteId: opts.noteId && state.notes[opts.noteId] && !state.notes[opts.noteId].deleted ? opts.noteId : state.activeNoteId || "",
    status: "open",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "claim.create", "Claim created: " + cleanTitle, state.claims[id].noteId);
  return id;
}

function addQuestion(state, title, body, options) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const opts = options && typeof options === "object" ? options : {};
  const id = makeId("question");
  const createdAt = now();
  state.questions[id] = {
    id,
    title: cleanTitle,
    body: String(body || ""),
    quote: String(opts.quote || ""),
    sourceId: opts.sourceId && state.sources[opts.sourceId] && !state.sources[opts.sourceId].deleted ? opts.sourceId : "",
    noteId: opts.noteId && state.notes[opts.noteId] && !state.notes[opts.noteId].deleted ? opts.noteId : state.activeNoteId || "",
    status: "open",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "question.create", "Question created: " + cleanTitle, state.questions[id].noteId);
  return id;
}

function addReviewItem(state, title, options) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const opts = options && typeof options === "object" ? options : {};
  const id = makeId("review");
  const createdAt = now();
  state.reviewItems[id] = {
    id,
    title: cleanTitle,
    sourceId: opts.sourceId && state.sources[opts.sourceId] && !state.sources[opts.sourceId].deleted ? opts.sourceId : "",
    noteId: opts.noteId && state.notes[opts.noteId] && !state.notes[opts.noteId].deleted ? opts.noteId : state.activeNoteId || "",
    day: cleanLine(opts.day || dateKeyFromOffset(7)),
    status: "open",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "review.create", "Review item created: " + cleanTitle, state.reviewItems[id].noteId);
  return id;
}

function isBookSource(source) {
  if (!source || source.deleted) return false;
  const ext = extensionForName(source.name);
  return source.kind === "book" || ["pdf", "epub", "mobi", "azw3", "md", "markdown", "txt"].includes(ext);
}

function ensureReadingItemForSource(state, sourceId) {
  const source = state.sources[sourceId];
  if (!isBookSource(source)) return "";
  const existing = Object.values(state.readingItems || {}).find((item) => !item.deleted && item.sourceId === sourceId);
  const status = source.text || source.transcriptText ? "reading" : source.parserStatus && source.parserStatus.includes("parser-required") ? "gated" : "queued";
  if (existing) {
    existing.title = stripExtension(source.name);
    existing.noteId = source.noteId || existing.noteId || "";
    existing.kind = source.kind || existing.kind || "book";
    existing.status = status === "reading" && existing.status === "done" ? "done" : status;
    existing.parserStatus = source.parserStatus || existing.parserStatus || "";
    existing.updatedAt = now();
    return existing.id;
  }
  const id = makeId("reading");
  const createdAt = now();
  state.readingItems[id] = {
    id,
    title: stripExtension(source.name),
    sourceId,
    noteId: source.noteId || "",
    kind: source.kind || "book",
    status,
    progress: 0,
    parserStatus: source.parserStatus || "",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "reading.create", "Reading item created: " + state.readingItems[id].title, source.noteId || state.activeNoteId);
  return id;
}

function addHighlight(state, title, text, options) {
  const cleanText = cleanLine(text || title);
  if (!cleanText) return "";
  const opts = options && typeof options === "object" ? options : {};
  const sourceId = opts.sourceId && state.sources[opts.sourceId] ? opts.sourceId : "";
  const readingItemId = opts.readingItemId || (sourceId ? ensureReadingItemForSource(state, sourceId) : "");
  const noteId = opts.noteId && state.notes[opts.noteId] && !state.notes[opts.noteId].deleted ? opts.noteId : sourceId && state.sources[sourceId] ? state.sources[sourceId].noteId : state.activeNoteId || "";
  const id = makeId("highlight");
  const createdAt = now();
  state.highlights[id] = {
    id,
    title: cleanLine(title || shorten(cleanText, 72)),
    text: cleanText,
    sourceId,
    noteId,
    readingItemId,
    status: "open",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addReviewItemOnce(state, "Повторить highlight: " + shorten(cleanText, 54), { sourceId, noteId, day: dateKeyFromOffset(7) });
  addAudit(state, "highlight.create", "Highlight created: " + shorten(cleanText, 90), noteId);
  return id;
}

function extractHighlightsFromSource(state, sourceId) {
  const source = state.sources[sourceId];
  if (!source || source.deleted) return [];
  const text = [source.text, source.transcriptText].filter(Boolean).join("\n");
  const readingItemId = ensureReadingItemForSource(state, sourceId);
  const lines = uniqueCleanItems(String(text || "").split(/\r?\n/).map((line) => cleanKnowledgeSentence(line)).filter((line) => line.length >= 32), 8);
  const candidates = lines.length ? lines : extractKnowledgeSentences(text).slice(0, 6);
  const ids = [];
  for (const line of candidates.slice(0, 4)) {
    const existing = Object.values(state.highlights || {}).find((highlight) => {
      return !highlight.deleted && highlight.sourceId === sourceId && normalizeTitle(highlight.text) === normalizeTitle(line);
    });
    if (existing) {
      ids.push(existing.id);
    } else {
      ids.push(addHighlight(state, "Highlight: " + shorten(line, 68), line, {
        sourceId,
        noteId: source.noteId,
        readingItemId
      }));
    }
  }
  if (ids.length) addAudit(state, "highlight.extract", "Highlights extracted from " + source.name + ": " + ids.length, source.noteId);
  return ids.filter(Boolean);
}

function saveManualSourceExtraction(state, sourceId, extractedText) {
  const source = state.sources[sourceId];
  const cleanText = String(extractedText || "").trim();
  if (!source || source.deleted || !cleanText) return "";
  source.text = cleanText;
  source.status = "manual-text-ready";
  source.parserStatus = "manual-extraction-ready";
  source.updatedAt = now();
  source.analysis = analyzeSourceArtifact(source);
  if (!source.noteId || !state.notes[source.noteId] || state.notes[source.noteId].deleted) {
    const noteId = createNote(state, stripExtension(source.name), state.activeFolderId, createSourceNoteBody(source));
    source.noteId = noteId;
  } else {
    const note = state.notes[source.noteId];
    note.title = stripExtension(source.name);
    note.body = createSourceNoteBody(source);
    note.updatedAt = now();
  }
  const readingItemId = ensureReadingItemForSource(state, source.id);
  extractHighlightsFromSource(state, source.id);
  addReviewItemOnce(state, "Вернуться к книге: " + stripExtension(source.name), {
    sourceId: source.id,
    noteId: source.noteId,
    day: dateKeyFromOffset(7)
  });
  createActionProposalsForSource(state, source.id);
  ensureInsight(state, "Источник стал читаемым: " + source.name, "Manual extraction approved by owner. Reading item, highlights, review and graph/control links are now backed by the source.", { sourceId: source.id, noteId: source.noteId });
  addAudit(state, "source.extract.manual", "Manual extraction saved for " + source.name, source.noteId);
  rebuildIndexes(state);
  return readingItemId;
}

function updateReadingProgress(state, readingItemId, progress) {
  const item = state.readingItems[readingItemId];
  const value = Number(progress || 0);
  if (!item || item.deleted || !Number.isFinite(value)) return;
  item.progress = Math.max(0, Math.min(100, value));
  item.status = item.progress >= 100 ? "done" : item.progress > 0 ? "reading" : item.status;
  item.updatedAt = now();
  addAudit(state, "reading.progress", "Reading progress " + item.progress + "%: " + item.title, item.noteId);
}

function turnHighlightIntoClaim(state, highlightId) {
  const highlight = state.highlights[highlightId];
  if (!highlight || highlight.deleted) return "";
  const claimId = addClaim(state, "Вывод из highlight: " + shorten(highlight.text, 60), highlight.text, {
    sourceId: highlight.sourceId,
    noteId: highlight.noteId,
    quote: highlight.text
  });
  highlight.status = "archived";
  highlight.updatedAt = now();
  addAudit(state, "highlight.claim", "Highlight turned into claim: " + shorten(highlight.text, 90), highlight.noteId);
  return claimId;
}

function turnHighlightIntoTask(state, highlightId) {
  const highlight = state.highlights[highlightId];
  if (!highlight || highlight.deleted) return "";
  const taskId = addTask(state, "Разобрать highlight: " + shorten(highlight.text, 70), {
    day: todayKey(),
    noteId: highlight.noteId,
    sourceId: highlight.sourceId
  });
  highlight.updatedAt = now();
  addAudit(state, "highlight.task", "Highlight turned into task: " + shorten(highlight.text, 90), highlight.noteId);
  return taskId;
}

function addClaimOnce(state, title, body, options) {
  const opts = options && typeof options === "object" ? options : {};
  const noteId = opts.noteId || state.activeNoteId || "";
  const sourceId = opts.sourceId || "";
  const existing = Object.values(state.claims || {}).find((claim) => {
    return !claim.deleted && normalizeTitle(claim.title) === normalizeTitle(title) && (claim.noteId || "") === noteId && (claim.sourceId || "") === sourceId;
  });
  return existing ? existing.id : addClaim(state, title, body, opts);
}

function addQuestionOnce(state, title, body, options) {
  const opts = options && typeof options === "object" ? options : {};
  const noteId = opts.noteId || state.activeNoteId || "";
  const sourceId = opts.sourceId || "";
  const existing = Object.values(state.questions || {}).find((question) => {
    return !question.deleted && normalizeTitle(question.title) === normalizeTitle(title) && (question.noteId || "") === noteId && (question.sourceId || "") === sourceId;
  });
  return existing ? existing.id : addQuestion(state, title, body, opts);
}

function addReviewItemOnce(state, title, options) {
  const opts = options && typeof options === "object" ? options : {};
  const noteId = opts.noteId || state.activeNoteId || "";
  const day = opts.day || dateKeyFromOffset(7);
  const existing = Object.values(state.reviewItems || {}).find((reviewItem) => {
    return !reviewItem.deleted && normalizeTitle(reviewItem.title) === normalizeTitle(title) && (reviewItem.noteId || "") === noteId && reviewItem.day === day;
  });
  return existing ? existing.id : addReviewItem(state, title, Object.assign({}, opts, { day }));
}

function cleanKnowledgeSentence(value) {
  return cleanLine(String(value || "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*]\s*(?:\[[ x]\]\s*)?/i, "")
    .replace(/^>\s*/, "")
    .replace(/\s+/g, " "));
}

function extractKnowledgeSentences(text) {
  const sentences = String(text || "").replace(/\r/g, "").match(/[^.!?\n]+[.!?]?/g) || [];
  return uniqueCleanItems(sentences.map(cleanKnowledgeSentence).filter((line) => {
    if (line.length < 24) return false;
    if (/^(source artifact|transcript mode|#)/i.test(line)) return false;
    return true;
  }), 16);
}

function extractKnowledgeQuestions(text, noteTitle) {
  const sentences = extractKnowledgeSentences(text);
  const direct = sentences.filter((line) => /\?$|^(как|что|почему|зачем|когда|where|how|why|what)\b/i.test(line));
  if (direct.length) return direct.slice(0, 4);
  const title = cleanLine(noteTitle || "активный артефакт");
  return ["Что проверить в теме: " + title + "?"];
}

function extractKnowledgeFromNote(state, noteId) {
  const note = noteId && state.notes[noteId] && !state.notes[noteId].deleted ? state.notes[noteId] : getActiveNote(state);
  if (!note) return { claims: 0, questions: 0, reviews: 0 };
  const source = sourceForNote(state, note.id);
  const sourceText = source ? [source.text, source.transcriptText].filter(Boolean).join("\n") : "";
  const body = [note.body, sourceText].filter(Boolean).join("\n");
  const sentences = extractKnowledgeSentences(body);
  const claimCandidates = sentences.filter((line) => !/\?$/.test(line)).slice(0, 4);
  const questionCandidates = extractKnowledgeQuestions(body, note.title).slice(0, 3);
  let claimCount = 0;
  let questionCount = 0;
  const sourceId = source ? source.id : "";
  for (const line of claimCandidates) {
    const title = "Вывод: " + shorten(line, 76);
    const id = addClaimOnce(state, title, line, { noteId: note.id, sourceId, quote: line });
    if (id) claimCount += 1;
  }
  for (const line of questionCandidates) {
    const title = line.endsWith("?") ? line : line + "?";
    const id = addQuestionOnce(state, title, "Нужно проверить по источнику: " + note.title, { noteId: note.id, sourceId, quote: line });
    if (id) questionCount += 1;
  }
  const reviewTitle = "Повторить и связать: " + note.title;
  const reviewId = addReviewItemOnce(state, reviewTitle, { noteId: note.id, sourceId, day: dateKeyFromOffset(7) });
  const reviewCount = reviewId ? 1 : 0;
  if (claimCount || questionCount) {
    ensureInsight(state, "Смысловая карта выросла: " + note.title, "LifeOS выделил claims/questions/review и связал их с исходной заметкой, графом и контролем.", { sourceId, noteId: note.id });
  }
  addAudit(state, "knowledge.extract", "Knowledge extracted from " + note.title + ": " + claimCount + " claims, " + questionCount + " questions", note.id);
  return { claims: claimCount, questions: questionCount, reviews: reviewCount };
}

function turnQuestionIntoTask(state, questionId) {
  const question = state.questions[questionId];
  if (!question || question.deleted || question.status === "ignored") return "";
  const taskId = addTask(state, "Разобрать вопрос: " + question.title, {
    day: todayKey(),
    noteId: question.noteId,
    sourceId: question.sourceId
  });
  question.status = "applied";
  question.updatedAt = now();
  addAudit(state, "question.apply", "Question turned into task: " + question.title, question.noteId);
  return taskId;
}

function ignoreQuestion(state, questionId) {
  const question = state.questions[questionId];
  if (!question || question.deleted) return;
  question.status = "ignored";
  question.updatedAt = now();
  addAudit(state, "question.ignore", "Question ignored: " + question.title, question.noteId);
}

function turnClaimIntoInsight(state, claimId) {
  const claim = state.claims[claimId];
  if (!claim || claim.deleted || claim.status === "archived") return "";
  const insightId = ensureInsight(state, claim.title, claim.body || claim.quote || "Claim promoted to insight.", {
    sourceId: claim.sourceId,
    noteId: claim.noteId
  });
  claim.status = "archived";
  claim.updatedAt = now();
  addAudit(state, "claim.apply", "Claim promoted to insight: " + claim.title, claim.noteId);
  return insightId;
}

function turnClaimIntoTask(state, claimId) {
  const claim = state.claims[claimId];
  if (!claim || claim.deleted) return "";
  const taskId = addTask(state, "Проверить вывод: " + claim.title, {
    day: todayKey(),
    noteId: claim.noteId,
    sourceId: claim.sourceId
  });
  claim.updatedAt = now();
  addAudit(state, "claim.task", "Claim turned into task: " + claim.title, claim.noteId);
  return taskId;
}

function toggleReviewItem(state, reviewId) {
  const reviewItem = state.reviewItems[reviewId];
  if (!reviewItem || reviewItem.deleted) return;
  reviewItem.status = reviewItem.status === "done" ? "open" : "done";
  reviewItem.updatedAt = now();
  addAudit(state, "review.toggle", "Review item " + reviewItem.status + ": " + reviewItem.title, reviewItem.noteId);
}

function addReminderForReviewItem(state, reviewId) {
  const reviewItem = state.reviewItems[reviewId];
  if (!reviewItem || reviewItem.deleted) return "";
  const reminderId = addReminder(state, "Повторить: " + reviewItem.title, {
    day: reviewItem.day,
    time: "09:00",
    sourceId: reviewItem.sourceId,
    noteId: reviewItem.noteId
  });
  addAudit(state, "review.reminder", "Reminder linked to review: " + reviewItem.title, reviewItem.noteId);
  return reminderId;
}

function applyProposal(state, proposalId) {
  const proposal = state.proposals[proposalId];
  if (!proposal || proposal.status !== "open") return;
  const source = proposal.sourceId && state.sources[proposal.sourceId] ? state.sources[proposal.sourceId] : null;
  const analysis = source ? normalizeArtifactAnalysis(source.analysis, source) : null;
  const fields = proposal.fields && typeof proposal.fields === "object" ? proposal.fields : {};
  if (proposalNeedsOwnerChoice(proposal)) {
    proposal.fields = Object.assign({}, fields, {
      blockedReason: fields.ambiguityReason || fields.needsOwnerChoice || "Нужно уточнение владельца перед применением."
    });
    proposal.updatedAt = now();
    addAudit(state, "proposal.needs-owner-choice", "Proposal needs owner choice: " + proposal.title, proposal.noteId);
    return;
  }
  const schedule = {
    dateHint: analysis && analysis.dateHints.length ? analysis.dateHints[0] : "",
    day: fields.day || "",
    startTime: fields.startTime || fields.time || "",
    endTime: fields.endTime || "",
    sourceId: proposal.sourceId || "",
    noteId: proposal.noteId || ""
  };
  let objectId = "";
  if (proposal.type === "task" || proposal.type === "project" || proposal.type === "mail") {
    objectId = addTask(state, fields.title || proposal.title, schedule);
  } else if (proposal.type === "calendar" || proposal.type === "plan" || proposal.type === "book") {
    objectId = addPlanBlock(state, fields.title || proposal.title, schedule);
  } else if (proposal.type === "reminder") {
    objectId = addReminder(state, fields.title || proposal.title, {
      day: fields.day || schedule.day,
      time: fields.time || schedule.startTime,
      sourceId: proposal.sourceId,
      noteId: proposal.noteId
    });
  } else if (proposal.type === "finance_expense" || proposal.type === "finance") {
    if (Number(fields.amount || 0) > 0) {
      objectId = addFinanceTransaction(state, fields.title || proposal.title, fields.amount, "expense", {
        category: fields.category,
        day: fields.day || todayKey(),
        sourceId: proposal.sourceId,
        noteId: proposal.noteId
      });
    } else {
      objectId = addTask(state, "Заполнить расход вручную: " + (fields.title || proposal.title), schedule);
    }
  } else if (proposal.type === "finance_income") {
    objectId = addFinanceTransaction(state, fields.title || proposal.title, fields.amount, "income", {
      category: fields.category || "Доход",
      day: fields.day || todayKey(),
      sourceId: proposal.sourceId,
      noteId: proposal.noteId
    });
  } else if (proposal.type === "balance") {
    objectId = ensureFinanceAccount(state, fields.accountName || proposal.title, fields.balance || fields.amount || 0);
  } else if (proposal.type === "budget") {
    objectId = addBudget(state, fields.category || proposal.title, fields.limit || fields.amount, {
      period: fields.period || "month",
      sourceId: proposal.sourceId,
      noteId: proposal.noteId
    });
  } else if (proposal.type === "subscription" || proposal.type === "bill") {
    objectId = addSubscription(state, fields.title || proposal.title, fields.amount, {
      category: fields.category,
      day: fields.day || todayKey(),
      sourceId: proposal.sourceId,
      noteId: proposal.noteId
    });
  } else if (proposal.type === "habit" || proposal.type === "routine") {
    objectId = addHabit(state, fields.title || proposal.title, {
      frequency: fields.frequency || "daily",
      sourceId: proposal.sourceId,
      noteId: proposal.noteId
    });
  } else if (proposal.type === "goal" || proposal.type === "money_goal") {
    objectId = addGoal(state, fields.title || proposal.title, {
      targetAmount: fields.targetAmount || fields.amount || 0,
      targetDate: fields.targetDate || fields.day || "",
      sourceId: proposal.sourceId,
      noteId: proposal.noteId
    });
  } else if (proposal.type === "claim") {
    objectId = addClaim(state, fields.title || proposal.title, fields.body || proposal.reason, {
      sourceId: proposal.sourceId,
      noteId: proposal.noteId,
      quote: proposal.quote
    });
  } else if (proposal.type === "question") {
    objectId = addQuestion(state, fields.title || proposal.title, fields.body || proposal.reason, {
      sourceId: proposal.sourceId,
      noteId: proposal.noteId,
      quote: proposal.quote
    });
  } else if (proposal.type === "review") {
    objectId = addReviewItem(state, fields.title || proposal.title, {
      sourceId: proposal.sourceId,
      noteId: proposal.noteId,
      day: fields.day || dateKeyFromOffset(7)
    });
  } else if (proposal.type === "insight" || proposal.type === "knowledge" || proposal.type === "note") {
    objectId = addInsight(state, proposal.title, fields.reason || proposal.reason, {
      sourceId: proposal.sourceId,
      noteId: proposal.noteId
    });
  } else if (proposal.type === "transcript" || proposal.type === "parser") {
    objectId = addTask(state, proposal.title, schedule);
  } else if (proposal.type === "agent" || proposal.type === "chat" || proposal.type === "flow") {
    runLocalAgent(state, proposal.sourceId, proposal.noteId);
    objectId = Object.values(state.agentRuns || {}).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id || "";
  } else {
    objectId = addInsight(state, proposal.title, proposal.reason, {
      sourceId: proposal.sourceId,
      noteId: proposal.noteId
    });
  }
  proposal.appliedObjectId = objectId;
  proposal.status = "applied";
  proposal.updatedAt = now();
  addAudit(state, "proposal.apply", "Applied proposal: " + proposal.title, proposal.noteId);
  rebuildIndexes(state);
}

function applyAllProposals(state) {
  const ids = Object.values(state.proposals || {})
    .filter((proposal) => proposal.status === "open")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((proposal) => proposal.id);
  for (const id of ids) applyProposal(state, id);
  addAudit(state, "proposal.apply_all", "Applied " + ids.length + " proposals", state.activeNoteId);
}

function dismissProposal(state, proposalId) {
  const proposal = state.proposals[proposalId];
  if (!proposal || proposal.status !== "open") return;
  proposal.status = "dismissed";
  proposal.updatedAt = now();
  addAudit(state, "proposal.dismiss", "Dismissed proposal: " + proposal.title, proposal.noteId);
}

function latestActionableSource(state) {
  const activeNoteSource = Object.values(state.sources || {}).filter((item) => {
    return !item.deleted && item.noteId && item.noteId === state.activeNoteId;
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (activeNoteSource) return activeNoteSource;
  return Object.values(state.sources || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
}

function buildArtifactWorkspace(state, sourceId) {
  const source = sourceId && state.sources[sourceId] && !state.sources[sourceId].deleted ? state.sources[sourceId] : latestActionableSource(state);
  if (!source) return "";
  source.analysis = normalizeArtifactAnalysis(source.analysis, source);
  const analysis = source.analysis;
  const title = stripExtension(source.name);
  if (source.noteId && state.notes[source.noteId] && !state.notes[source.noteId].deleted) {
    state.activeNoteId = source.noteId;
    state.activeFolderId = state.notes[source.noteId].folderId;
  }
  createActionProposalsForSource(state, source.id);
  const schedule = { dateHint: analysis.dateHints.length ? analysis.dateHints[0] : "" };
  addPlanBlockOnce(state, "Разобрать артефакт: " + title, source.noteId, source.id, schedule);
  addPlanBlockOnce(state, "Проверить граф и backlinks: " + title, source.noteId, source.id, schedule);
  if (analysis.type === "книга") addPlanBlockOnce(state, "Читать и собрать главы: " + title, source.noteId, source.id, schedule);
  if (analysis.dateHints.length) addPlanBlockOnce(state, "Календарь: " + analysis.dateHints.join(", "), source.noteId, source.id, schedule);
  const actionLines = analysis.actionLines.length ? analysis.actionLines : ["Сформулировать следующий шаг по " + title];
  for (const line of actionLines.slice(0, 4)) addTaskOnce(state, line, source.noteId, schedule);
  if (source.kind === "audio" && !source.transcriptText) addTaskOnce(state, "Добавить транскрипт для " + title, source.noteId, schedule);
  if (analysis.urls.length || analysis.emails.length) addTaskOnce(state, "Проверить ссылки и контакты из " + title, source.noteId, schedule);
  const runId = runLocalAgent(state, source.id, source.noteId);
  addChatMessage(state, "assistant", "Собрал рабочую среду для " + title + ": библиотека, план, задачи, чат, агент, граф и контроль связаны.", source.id, source.noteId);
  const flow = Object.values(state.flows || {})[0];
  if (flow) {
    flow.runCount += 1;
    flow.status = "completed";
    flow.lastRunSummary = "Собран артефакт: " + title;
    flow.updatedAt = now();
  }
  addAudit(state, "artifact.build", "Artifact workspace built: " + title, source.noteId);
  rebuildIndexes(state);
  return runId;
}

function runCaptureFlow(state) {
  const flow = Object.values(state.flows)[0];
  const sourceId = state.captureDraft.trim() ? captureTextArtifact(state, state.captureDraft) : "";
  const source = sourceId ? state.sources[sourceId] : Object.values(state.sources).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (source) {
    buildArtifactWorkspace(state, source.id);
  }
  if (flow) flow.updatedAt = now();
  addAudit(state, "flow.run", "Capture flow completed", source ? source.noteId : "");
}

function runFlowBuilderDryRun(state, trigger, condition, actionType) {
  const activeNote = getActiveNote(state);
  const source = Object.values(state.sources || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
  let flow = Object.values(state.flows || {}).find((item) => item.name === "Owner builder flow");
  const createdAt = now();
  if (!flow) {
    const flowId = makeId("flow");
    flow = {
      id: flowId,
      name: "Owner builder flow",
      steps: [],
      status: "ready",
      runCount: 0,
      createdAt,
      updatedAt: createdAt
    };
    state.flows[flowId] = flow;
  }
  flow.steps = [
    { kind: "trigger", value: cleanLine(trigger || "active artifact") },
    { kind: "condition", value: cleanLine(condition || "has new signal") },
    { kind: "proposal_action", value: cleanLine(actionType || "task") }
  ];
  flow.runCount += 1;
  flow.status = "dry-run";
  flow.updatedAt = now();
  const proposalType = cleanLine(actionType || "task");
  const proposalLabel = {
    calendar: "блок календаря",
    budget: "обновление бюджета",
    task: "задача",
    note: "заметка"
  }[proposalType] || proposalType;
  const contextTitle = source
    ? source.name
    : activeNote && activeNote.systemType !== "product_brain"
      ? activeNote.title
      : "активный контекст";
  const proposalId = addProposal(state, proposalType, "Сценарий предложил: " + proposalLabel + " для " + shorten(contextTitle, 56), source ? source.id : "", activeNote ? activeNote.id : "", {
    reason: "Dry-run создал только предложение. Применение требует подтверждения владельца.",
    fields: {
      flowId: flow.id,
      trigger: flow.steps[0].value,
      condition: flow.steps[1].value,
      action: proposalType,
      mutationMode: "proposal-only"
    }
  });
  const runId = makeId("flowrun");
  state.flowRuns[runId] = {
    id: runId,
    flowId: flow.id,
    status: "proposal_created",
    sourceId: source ? source.id : "",
    noteId: activeNote ? activeNote.id : "",
    summary: "Проверка сценария создала предложение: " + proposalLabel + " для " + contextTitle,
    proposalIds: proposalId ? [proposalId] : [],
    createdAt: now(),
    updatedAt: now()
  };
  addAudit(state, "flow.dry-run", "Проверка сценария создала предложение: " + proposalLabel, activeNote ? activeNote.id : "");
  return runId;
}

function transcriptSegmentDrafts(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const lineCandidates = raw.split(/\r?\n/).map((line) => cleanLine(line)).filter(Boolean);
  const chunks = lineCandidates.length > 1
    ? lineCandidates
    : (raw.match(/[^.!?\n]+[.!?]?/g) || [raw]).map((line) => cleanLine(line)).filter((line) => line.length >= 8);
  return chunks.slice(0, 80).map((line, index) => {
    const match = line.match(/^(?:\[(\d{1,2}:\d{2}(?::\d{2})?)\]|(\d{1,2}:\d{2}(?::\d{2})?))\s*[-:–—]?\s*(.+)$/);
    return {
      index,
      timecode: match ? cleanLine(match[1] || match[2] || "") : "",
      text: match ? cleanLine(match[3] || "") : line
    };
  }).filter((segment) => segment.text);
}

function syncTranscriptSegments(state, sourceId, noteId, transcriptText) {
  const source = state.sources[sourceId];
  if (!source) return [];
  for (const segment of Object.values(state.transcriptSegments || {}).filter((item) => item.sourceId === sourceId && !item.deleted)) {
    segment.deleted = true;
    segment.updatedAt = now();
  }
  const ids = [];
  for (const draftSegment of transcriptSegmentDrafts(transcriptText)) {
    const id = makeId("segment");
    const createdAt = now();
    state.transcriptSegments[id] = {
      id,
      sourceId,
      noteId,
      index: draftSegment.index,
      timecode: draftSegment.timecode,
      text: draftSegment.text,
      status: "open",
      deleted: false,
      createdAt,
      updatedAt: createdAt
    };
    ids.push(id);
  }
  addAudit(state, "transcript.segment", "Transcript segments synced: " + ids.length + " for " + source.name, noteId);
  return ids;
}

function transcriptSegmentsForSource(state, sourceId) {
  return Object.values(state.transcriptSegments || {})
    .filter((segment) => !segment.deleted && segment.sourceId === sourceId)
    .sort((a, b) => a.index - b.index);
}

function audioCheckpointsForSource(state, sourceId) {
  return Object.values(state.audioCheckpoints || {})
    .filter((checkpoint) => !checkpoint.deleted && checkpoint.sourceId === sourceId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function playerNotesForSource(state, sourceId) {
  return Object.values(state.playerNotes || {})
    .filter((playerNote) => !playerNote.deleted && playerNote.sourceId === sourceId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function addAudioCheckpoint(state, sourceId, title, timecode, noteText) {
  const source = state.sources[sourceId];
  if (!source || source.deleted) return "";
  const cleanTitle = cleanLine(title || "Checkpoint: " + stripExtension(source.name));
  const id = makeId("checkpoint");
  const createdAt = now();
  state.audioCheckpoints[id] = {
    id,
    title: cleanTitle,
    sourceId,
    noteId: source.noteId || state.activeNoteId || "",
    timecode: cleanLine(timecode || ""),
    note: String(noteText || ""),
    status: "open",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addReviewItemOnce(state, "Вернуться к аудио checkpoint: " + cleanTitle, {
    sourceId,
    noteId: source.noteId || state.activeNoteId || "",
    day: dateKeyFromOffset(3)
  });
  addAudit(state, "audio.checkpoint", "Audio checkpoint created: " + cleanTitle, source.noteId || state.activeNoteId);
  return id;
}

function addPlayerNote(state, sourceId, text, options) {
  const source = state.sources[sourceId];
  const cleanText = cleanLine(text);
  if (!source || source.deleted || !cleanText) return "";
  const opts = options && typeof options === "object" ? options : {};
  const id = makeId("playernote");
  const createdAt = now();
  state.playerNotes[id] = {
    id,
    title: cleanLine(opts.title || "Player note: " + shorten(cleanText, 56)),
    text: cleanText,
    sourceId,
    noteId: source.noteId || state.activeNoteId || "",
    segmentId: opts.segmentId || "",
    status: "open",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "player.note", "Player note created: " + shorten(cleanText, 90), source.noteId || state.activeNoteId);
  return id;
}

function transcriptSnippetForAction(state, sourceId, text) {
  const cleanText = cleanLine(text);
  if (cleanText) return cleanText;
  const firstSegment = transcriptSegmentsForSource(state, sourceId).find((segment) => cleanLine(segment.text));
  if (firstSegment) return firstSegment.text;
  const source = state.sources[sourceId];
  return source ? cleanLine(source.transcriptText).slice(0, 180) : "";
}

function transcriptSnippetToNote(state, sourceId, text) {
  const source = state.sources[sourceId];
  const snippet = transcriptSnippetForAction(state, sourceId, text);
  if (!source || !snippet) return "";
  const title = "Audio note: " + shorten(snippet, 48);
  const noteId = createNote(state, title, state.activeFolderId, ["# " + title, "", "Source audio: " + source.name, "", snippet].join("\n"));
  addPlayerNote(state, sourceId, snippet, { title });
  state.activeNoteId = noteId;
  state.activeSurface = "library";
  addAudit(state, "transcript.note", "Transcript snippet became note: " + title, noteId);
  rebuildIndexes(state);
  return noteId;
}

function transcriptSnippetToTask(state, sourceId, text) {
  const source = state.sources[sourceId];
  const snippet = transcriptSnippetForAction(state, sourceId, text);
  if (!source || !snippet) return "";
  const taskId = addTask(state, "Из аудио: " + shorten(snippet, 74), {
    day: todayKey(),
    sourceId,
    noteId: source.noteId || state.activeNoteId || ""
  });
  addPlayerNote(state, sourceId, snippet, { title: "Task source: " + shorten(snippet, 52) });
  addAudit(state, "transcript.task", "Transcript snippet became task: " + shorten(snippet, 90), source.noteId || state.activeNoteId);
  return taskId;
}

function transcriptSnippetToClaim(state, sourceId, text) {
  const source = state.sources[sourceId];
  const snippet = transcriptSnippetForAction(state, sourceId, text);
  if (!source || !snippet) return "";
  const claimId = addClaim(state, "Вывод из аудио: " + shorten(snippet, 54), snippet, {
    sourceId,
    noteId: source.noteId || state.activeNoteId || "",
    quote: snippet
  });
  addPlayerNote(state, sourceId, snippet, { title: "Claim source: " + shorten(snippet, 52) });
  addAudit(state, "transcript.claim", "Transcript snippet became claim: " + shorten(snippet, 90), source.noteId || state.activeNoteId);
  return claimId;
}

function transcriptSnippetToHighlight(state, sourceId, text) {
  const source = state.sources[sourceId];
  const snippet = transcriptSnippetForAction(state, sourceId, text);
  if (!source || !snippet) return "";
  const highlightId = addHighlight(state, "Audio highlight: " + shorten(snippet, 54), snippet, {
    sourceId,
    noteId: source.noteId || state.activeNoteId || ""
  });
  addPlayerNote(state, sourceId, snippet, { title: "Highlight source: " + shorten(snippet, 52) });
  addAudit(state, "transcript.highlight", "Transcript snippet became highlight: " + shorten(snippet, 90), source.noteId || state.activeNoteId);
  return highlightId;
}

function requestSttGate(state, sourceId) {
  const source = state.sources[sourceId];
  if (!source || source.deleted) return;
  source.transcriptStatus = "stt-provider-gated";
  source.updatedAt = now();
  state.providers.stt = Object.assign({}, state.providers.stt || {}, {
    status: "not-configured",
    label: "STT",
    lastCheckedAt: now(),
    requiredAction: "Подключи локальный STT перед автоматической расшифровкой. Ручная расшифровка уже доступна."
  });
  addAudit(state, "provider.stt.gate", "Показана настройка STT для " + source.name + "; аудио никуда не отправлялось.", source.noteId || state.activeNoteId);
}

function saveSourceTranscript(state, sourceId, transcriptText) {
  const source = state.sources[sourceId];
  if (!source) return "";
  const cleanText = String(transcriptText || "").trim();
  if (!cleanText) return "";
  source.transcriptText = cleanText;
  source.transcriptStatus = "manual-transcript-ready";
  source.status = "transcript-ready";
  source.updatedAt = now();
  source.analysis = analyzeSourceArtifact(source);
  const title = stripExtension(source.name) + " Расшифровка";
  const body = [
    "# " + title,
    "",
    "Источник: " + source.name,
    "Режим: текст введён владельцем локально",
    "",
    cleanText
  ].join("\n");
  const existingNote = source.noteId && state.notes[source.noteId] && !state.notes[source.noteId].deleted && (state.notes[source.noteId].body.includes("Transcript mode:") || state.notes[source.noteId].body.includes("Режим: текст введён владельцем локально"));
  const noteId = existingNote ? source.noteId : createNote(state, title, state.activeFolderId, body);
  if (existingNote) {
    state.notes[noteId].title = title;
    state.notes[noteId].body = body;
    state.notes[noteId].updatedAt = now();
  }
  source.noteId = noteId;
  syncTranscriptSegments(state, source.id, noteId, cleanText);
  extractKnowledgeFromNote(state, noteId);
  extractHighlightsFromSource(state, source.id);
  addAudioCheckpoint(state, source.id, "Расшифровка сохранена", "00:00", "Ручная расшифровка стала текстом в базе.");
  addReviewItemOnce(state, "Повторить аудио: " + stripExtension(source.name), {
    sourceId: source.id,
    noteId,
    day: dateKeyFromOffset(3)
  });
  ensureInsight(state, "Аудио стало знанием: " + stripExtension(source.name), "Расшифровка связана с источником и может создавать заметки, задачи, выводы, цитаты, повторение, связи и контроль.", { sourceId: source.id, noteId });
  createActionProposalsForSource(state, source.id);
  addChatMessage(state, "assistant", "Транскрипт связан с аудио, заметкой, графом и действиями.", source.id, noteId);
  addAudit(state, "transcript.save", "Ручная расшифровка сохранена для " + source.name, noteId);
  rebuildIndexes(state);
  return noteId;
}

function addGoal(state, title, options) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const id = makeId("goal");
  const createdAt = now();
  state.goals[id] = {
    id,
    title: cleanTitle,
    noteId: options && options.noteId ? options.noteId : state.activeNoteId || "",
    sourceId: options && options.sourceId ? options.sourceId : "",
    targetAmount: Number.isFinite(Number(options && options.targetAmount)) ? Number(options.targetAmount) : 0,
    targetDate: cleanLine(options && options.targetDate ? options.targetDate : ""),
    progress: 0,
    status: "active",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "goal.create", "Goal created: " + cleanTitle, state.activeNoteId);
  return id;
}

function toggleGoal(state, goalId) {
  const goal = state.goals[goalId];
  if (!goal) return;
  goal.status = goal.status === "done" ? "active" : "done";
  goal.updatedAt = now();
  addAudit(state, "goal.toggle", "Goal " + goal.status + ": " + goal.title, goal.noteId);
}

function addGoalProgress(state, goalId, amount, note) {
  const goal = state.goals[goalId];
  const value = Number(amount || 0);
  if (!goal || goal.deleted || !Number.isFinite(value) || value <= 0) return;
  goal.progress = Math.max(0, Number(goal.progress || 0) + value);
  if (goal.targetAmount && goal.progress >= goal.targetAmount) goal.status = "done";
  goal.updatedAt = now();
  addAudit(state, "goal.progress", "Goal progress +" + value + ": " + goal.title + (note ? " / " + note : ""), goal.noteId);
}

function addTaskForGoal(state, goalId, title) {
  const goal = state.goals[goalId];
  if (!goal || goal.deleted) return "";
  return addTask(state, title || "Следующий шаг: " + goal.title, {
    day: todayKey(),
    goalId: goal.id,
    noteId: goal.noteId,
    sourceId: goal.sourceId
  });
}

function ensureInsight(state, title, reason, options) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const existing = Object.values(state.insights || {}).find((insight) => {
    return insight.status !== "ignored" && normalizeTitle(insight.title) === normalizeTitle(cleanTitle);
  });
  if (existing) return existing.id;
  return addInsight(state, cleanTitle, reason, options || {});
}

function refreshDeterministicInsights(state) {
  const openGoals = Object.values(state.goals || {}).filter((goal) => !goal.deleted && goal.status === "active");
  const habits = Object.values(state.habits || {}).filter((habit) => !habit.deleted && habit.status === "active");
  const today = todayKey();
  for (const habit of habits.filter((habit) => !(habit.checkins && habit.checkins[today]))) {
    ensureInsight(state, "Привычка ждет отметки: " + habit.title, "Сегодня еще нет check-in. Можно отметить мягко или перенести в рутину.", { sourceId: habit.sourceId, noteId: habit.noteId });
  }
  for (const goal of openGoals) {
    const linkedTasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.goalId === goal.id && task.status !== "done");
    if (!linkedTasks.length) {
      ensureInsight(state, "Цели нужен следующий шаг: " + goal.title, "У активной цели нет открытой задачи. Создай next action, чтобы цель не зависла.", { sourceId: goal.sourceId, noteId: goal.noteId });
    }
    if (goal.targetAmount && Number(goal.progress || 0) === 0) {
      ensureInsight(state, "Цель без прогресса: " + goal.title, "Цель имеет числовой таргет, но прогресс еще не внесен.", { sourceId: goal.sourceId, noteId: goal.noteId });
    }
  }
  const expensesByCategory = {};
  for (const tx of Object.values(state.financeTransactions || {}).filter((item) => !item.deleted && item.kind === "expense")) {
    expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + 1;
  }
  for (const [category, count] of Object.entries(expensesByCategory)) {
    if (count >= 2) ensureInsight(state, "Повторяются расходы: " + category, "Категория встречается " + count + " раза. Можно связать с бюджетом или целью.", {});
  }
  addAudit(state, "insight.refresh", "Deterministic insights refreshed", state.activeNoteId);
}

function ignoreInsight(state, insightId) {
  const insight = state.insights[insightId];
  if (!insight) return;
  insight.status = "ignored";
  insight.updatedAt = now();
  addAudit(state, "insight.ignore", "Insight ignored: " + insight.title, insight.noteId);
}

function turnInsightIntoTask(state, insightId) {
  const insight = state.insights[insightId];
  if (!insight || insight.status === "ignored") return "";
  const taskId = addTask(state, insight.title, {
    day: todayKey(),
    sourceId: insight.sourceId,
    noteId: insight.noteId
  });
  insight.status = "applied";
  insight.updatedAt = now();
  addAudit(state, "insight.apply", "Insight turned into task: " + insight.title, insight.noteId);
  return taskId;
}

function addTask(state, title, scheduleOptions) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const options = scheduleOptions && typeof scheduleOptions === "object" ? scheduleOptions : {};
  const schedule = parseTaskSchedule(cleanTitle, options.dateHint || "", options);
  const noteId = options.noteId && state.notes[options.noteId] && !state.notes[options.noteId].deleted ? options.noteId : state.activeNoteId || "";
  const activeGoal = options.goalId && state.goals[options.goalId] ? state.goals[options.goalId]
    : Object.values(state.goals).find((goal) => !goal.deleted && goal.status === "active" && goal.noteId === noteId)
    || Object.values(state.goals).find((goal) => !goal.deleted && goal.status === "active")
    || null;
  const id = makeId("task");
  const createdAt = now();
  state.tasks[id] = {
    id,
    title: cleanTitle,
    noteId,
    sourceId: options.sourceId && state.sources[options.sourceId] && !state.sources[options.sourceId].deleted ? options.sourceId : "",
    goalId: activeGoal ? activeGoal.id : "",
    day: schedule.day,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    dateHint: schedule.dateHint,
    status: "open",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "task.create", "Task created: " + cleanTitle, noteId);
  return id;
}

function addTaskOnce(state, title, noteId, scheduleOptions) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const schedule = parseTaskSchedule(cleanTitle, scheduleOptions ? scheduleOptions.dateHint : "", scheduleOptions || {});
  const existing = Object.values(state.tasks || {}).find((task) => {
    return !task.deleted && normalizeTitle(task.title) === normalizeTitle(cleanTitle) && (task.noteId || "") === (noteId || state.activeNoteId || "") && task.day === schedule.day && (task.startTime || "") === schedule.startTime;
  });
  if (existing) return existing.id;
  const previousNoteId = state.activeNoteId;
  if (noteId && state.notes[noteId] && !state.notes[noteId].deleted) state.activeNoteId = noteId;
  const id = addTask(state, cleanTitle, Object.assign({}, schedule, {
    noteId,
    sourceId: scheduleOptions && scheduleOptions.sourceId ? scheduleOptions.sourceId : ""
  }));
  state.activeNoteId = previousNoteId;
  return id;
}

function toggleTask(state, taskId) {
  const task = state.tasks[taskId];
  if (!task) return;
  task.status = task.status === "done" ? "open" : "done";
  task.updatedAt = now();
  addAudit(state, "task.toggle", "Task " + task.status + ": " + task.title, task.noteId);
}

function updateTask(state, taskId, updates) {
  const task = state.tasks[taskId];
  if (!task || task.deleted) return;
  const next = updates && typeof updates === "object" ? updates : {};
  const nextTitle = cleanLine(next.title || task.title);
  const nextDay = cleanLine(next.day || task.day || todayKey());
  const nextStart = normalizeTime(next.startTime || task.startTime || "");
  const nextEnd = normalizeTime(next.endTime || task.endTime || (nextStart ? addMinutesToTime(nextStart, 45) : ""));
  task.title = nextTitle || task.title;
  task.day = nextDay;
  task.startTime = nextStart;
  task.endTime = nextEnd;
  task.updatedAt = now();
  addAudit(state, "task.update", "Task updated: " + task.title + " " + task.day + " " + (task.startTime || "no-time"), task.noteId);
}

function moveTaskToTomorrow(state, taskId) {
  const task = state.tasks[taskId];
  if (!task || task.deleted) return;
  updateTask(state, taskId, { day: dateKeyFromOffset(1), startTime: task.startTime, endTime: task.endTime, title: task.title });
  addAudit(state, "task.reschedule", "Task moved to tomorrow: " + task.title, task.noteId);
}

function addReminderForTask(state, taskId) {
  const task = state.tasks[taskId];
  if (!task || task.deleted) return "";
  const reminderId = addReminder(state, "Напомнить: " + task.title, {
    day: task.day || todayKey(),
    time: task.startTime || "09:00",
    sourceId: task.sourceId || "",
    noteId: task.noteId || ""
  });
  addAudit(state, "task.reminder", "Reminder linked to task: " + task.title, task.noteId);
  return reminderId;
}

function addPlanBlock(state, title, scheduleOptions) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const options = scheduleOptions && typeof scheduleOptions === "object" ? scheduleOptions : {};
  const schedule = parseTaskSchedule(cleanTitle, options.dateHint || "", options);
  const noteId = options.noteId && state.notes[options.noteId] && !state.notes[options.noteId].deleted ? options.noteId : state.activeNoteId || "";
  const activeSource = options.sourceId && state.sources[options.sourceId] && !state.sources[options.sourceId].deleted
    ? state.sources[options.sourceId]
    : Object.values(state.sources).find((source) => !source.deleted && source.noteId === noteId) || null;
  const id = makeId("plan");
  const createdAt = now();
  state.planBlocks[id] = {
    id,
    title: cleanTitle,
    noteId,
    sourceId: activeSource ? activeSource.id : "",
    day: schedule.day,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    dateHint: schedule.dateHint,
    status: "planned",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "plan.create", "Today block added: " + cleanTitle, noteId);
  return id;
}

function addPlanBlockOnce(state, title, noteId, sourceId, scheduleOptions) {
  const cleanTitle = cleanLine(title);
  if (!cleanTitle) return "";
  const schedule = parseTaskSchedule(cleanTitle, scheduleOptions ? scheduleOptions.dateHint : "", scheduleOptions || {});
  const existing = Object.values(state.planBlocks || {}).find((block) => {
    return !block.deleted && block.day === schedule.day && normalizeTitle(block.title) === normalizeTitle(cleanTitle) && (block.noteId || "") === (noteId || state.activeNoteId || "") && (block.startTime || "") === schedule.startTime;
  });
  if (existing) return existing.id;
  const previousNoteId = state.activeNoteId;
  if (noteId && state.notes[noteId] && !state.notes[noteId].deleted) state.activeNoteId = noteId;
  const id = addPlanBlock(state, cleanTitle, Object.assign({}, schedule, { noteId, sourceId }));
  if (sourceId && state.planBlocks[id]) state.planBlocks[id].sourceId = sourceId;
  state.activeNoteId = previousNoteId;
  return id;
}

function togglePlanBlock(state, planId) {
  const block = state.planBlocks[planId];
  if (!block) return;
  block.status = block.status === "done" ? "planned" : "done";
  block.updatedAt = now();
  addAudit(state, "plan.toggle", "Plan block " + block.status + ": " + block.title, block.noteId);
}

function updatePlanBlock(state, planId, updates) {
  const block = state.planBlocks[planId];
  if (!block || block.deleted) return;
  const next = updates && typeof updates === "object" ? updates : {};
  block.title = cleanLine(next.title || block.title) || block.title;
  block.day = cleanLine(next.day || block.day || todayKey());
  block.startTime = normalizeTime(next.startTime || block.startTime || "");
  block.endTime = normalizeTime(next.endTime || block.endTime || (block.startTime ? addMinutesToTime(block.startTime, 45) : ""));
  block.updatedAt = now();
  addAudit(state, "plan.update", "Plan block updated: " + block.title + " " + block.day + " " + (block.startTime || "no-time"), block.noteId);
}

function movePlanBlockToTomorrow(state, planId) {
  const block = state.planBlocks[planId];
  if (!block || block.deleted) return;
  updatePlanBlock(state, planId, { day: dateKeyFromOffset(1), startTime: block.startTime, endTime: block.endTime, title: block.title });
  addAudit(state, "plan.reschedule", "Plan block moved to tomorrow: " + block.title, block.noteId);
}

function addReminderForPlanBlock(state, planId) {
  const block = state.planBlocks[planId];
  if (!block || block.deleted) return "";
  const reminderId = addReminder(state, "Напомнить: " + block.title, {
    day: block.day || todayKey(),
    time: block.startTime || "09:00",
    sourceId: block.sourceId || "",
    noteId: block.noteId || ""
  });
  addAudit(state, "plan.reminder", "Reminder linked to plan block: " + block.title, block.noteId);
  return reminderId;
}

function toggleReminder(state, reminderId) {
  const reminder = state.reminders[reminderId];
  if (!reminder || reminder.deleted) return;
  reminder.status = reminder.status === "done" ? "open" : "done";
  reminder.updatedAt = now();
  addAudit(state, "reminder.toggle", "Reminder " + reminder.status + ": " + reminder.title, reminder.noteId);
}

function updateReminder(state, reminderId, updates) {
  const reminder = state.reminders[reminderId];
  if (!reminder || reminder.deleted) return;
  const next = updates && typeof updates === "object" ? updates : {};
  reminder.title = cleanLine(next.title || reminder.title) || reminder.title;
  reminder.day = cleanLine(next.day || reminder.day || todayKey());
  reminder.time = normalizeTime(next.time || reminder.time || "");
  reminder.updatedAt = now();
  addAudit(state, "reminder.update", "Reminder updated: " + reminder.title + " " + reminder.day + " " + (reminder.time || "no-time"), reminder.noteId);
}

function restoreNote(state, noteId) {
  const note = state.notes[noteId];
  if (!note || !note.deleted) return;
  note.deleted = false;
  note.updatedAt = now();
  state.activeNoteId = note.id;
  state.activeFolderId = state.folders[note.folderId] ? note.folderId : state.activeFolderId;
  addAudit(state, "note.restore", "Note restored: " + note.title, note.id);
  rebuildIndexes(state);
}

function archiveSource(state, sourceId) {
  const source = state.sources[sourceId];
  if (!source || source.deleted) return;
  source.deleted = true;
  source.updatedAt = now();
  addAudit(state, "source.archive", "Source archived: " + source.name, source.noteId);
}

function restoreSource(state, sourceId) {
  const source = state.sources[sourceId];
  if (!source || !source.deleted) return;
  source.deleted = false;
  source.updatedAt = now();
  addAudit(state, "source.restore", "Source restored: " + source.name, source.noteId);
}

function archiveTask(state, taskId) {
  const task = state.tasks[taskId];
  if (!task || task.deleted) return;
  task.deleted = true;
  task.updatedAt = now();
  addAudit(state, "task.archive", "Task archived: " + task.title, task.noteId);
}

function restoreTask(state, taskId) {
  const task = state.tasks[taskId];
  if (!task || !task.deleted) return;
  task.deleted = false;
  task.updatedAt = now();
  addAudit(state, "task.restore", "Task restored: " + task.title, task.noteId);
}

function archiveReminder(state, reminderId) {
  const reminder = state.reminders[reminderId];
  if (!reminder || reminder.deleted) return;
  reminder.deleted = true;
  reminder.updatedAt = now();
  addAudit(state, "reminder.archive", "Reminder archived: " + reminder.title, reminder.noteId);
}

function restoreReminder(state, reminderId) {
  const reminder = state.reminders[reminderId];
  if (!reminder || !reminder.deleted) return;
  reminder.deleted = false;
  reminder.updatedAt = now();
  addAudit(state, "reminder.restore", "Reminder restored: " + reminder.title, reminder.noteId);
}

function archiveGoal(state, goalId) {
  const goal = state.goals[goalId];
  if (!goal || goal.deleted) return;
  goal.deleted = true;
  goal.updatedAt = now();
  addAudit(state, "goal.archive", "Goal archived: " + goal.title, goal.noteId);
}

function restoreGoal(state, goalId) {
  const goal = state.goals[goalId];
  if (!goal || !goal.deleted) return;
  goal.deleted = false;
  goal.updatedAt = now();
  addAudit(state, "goal.restore", "Goal restored: " + goal.title, goal.noteId);
}

function archivePlanBlock(state, planId) {
  const block = state.planBlocks[planId];
  if (!block || block.deleted) return;
  block.deleted = true;
  block.updatedAt = now();
  addAudit(state, "plan.archive", "Plan block archived: " + block.title, block.noteId);
}

function restorePlanBlock(state, planId) {
  const block = state.planBlocks[planId];
  if (!block || !block.deleted) return;
  block.deleted = false;
  block.updatedAt = now();
  addAudit(state, "plan.restore", "Plan block restored: " + block.title, block.noteId);
}

function isolateCorruptRecord(state, kind, raw, reason) {
  const id = makeId("corrupt");
  const createdAt = now();
  const record = {
    id,
    kind: cleanLine(kind || "unknown"),
    title: "Isolated corrupt " + cleanLine(kind || "record"),
    reason: cleanLine(reason || "Record failed validation and was isolated before it could corrupt repository state."),
    raw: String(raw || ""),
    status: "isolated",
    recoveredNoteId: "",
    createdAt,
    updatedAt: createdAt
  };
  state.control.corruptRecords = [record].concat(state.control.corruptRecords || []).slice(0, 20);
  state.control.lastImportSummary = "Corrupt record isolated: " + record.kind;
  addAudit(state, "control.corrupt.isolate", record.reason, state.activeNoteId);
  return id;
}

function recoverCorruptRecord(state, recordId) {
  const record = (state.control.corruptRecords || []).find((item) => item.id === recordId);
  if (!record || record.status === "recovered") return "";
  const noteId = createNote(state, "Recovered corrupt " + record.kind, state.activeFolderId, [
    "# Recovered corrupt " + record.kind,
    "",
    "Reason: " + record.reason,
    "",
    "Raw preview:",
    "```text",
    record.raw.slice(0, 1200),
    "```"
  ].join("\n"));
  record.status = "recovered";
  record.recoveredNoteId = noteId;
  record.updatedAt = now();
  state.control.lastImportSummary = "Recovered corrupt record into safe note: " + noteId;
  addAudit(state, "control.corrupt.recover", "Corrupt record recovered as safe note: " + record.kind, noteId);
  rebuildIndexes(state);
  return noteId;
}

async function probeOllama(endpoint) {
  const base = String(endpoint || "").replace(/\/+$/, "");
  const startedAt = Date.now();
  const response = await fetch(base + "/api/tags", { method: "GET" });
  if (!response.ok) throw new Error("Ollama responded with HTTP " + response.status);
  const payload = await response.json();
  const models = Array.isArray(payload.models) ? payload.models.map((model) => cleanLine(model.name || model.model || "")).filter(Boolean) : [];
  return {
    endpoint: base,
    status: models.length ? "models_found" : "reachable",
    models,
    selectedModel: models[0] || "",
    lastError: "",
    lastCheckedAt: now(),
    lastProbeAt: now(),
    lastLatencyMs: Math.max(1, Date.now() - startedAt),
    revokedAt: ""
  };
}

function classifyOllamaFetchError(error) {
  const message = error && error.message ? String(error.message) : String(error || "");
  const normalized = message.toLocaleLowerCase();
  if (normalized.includes("failed to fetch") || normalized.includes("cors") || normalized.includes("blocked")) return "blocked_by_browser_or_cors";
  if (normalized.includes("network") || normalized.includes("connection") || normalized.includes("refused") || normalized.includes("timeout")) return "offline";
  return "error";
}

async function testOllamaGeneration(endpoint, model) {
  const base = String(endpoint || "").replace(/\/+$/, "");
  const selectedModel = cleanLine(model || "");
  if (!selectedModel) throw new Error("No Ollama model selected for /api/generate test.");
  const startedAt = Date.now();
  const response = await fetch(base + "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selectedModel,
      prompt: "LifeOS local provider check. Reply with OK.",
      stream: false,
      options: { num_predict: 16 }
    })
  });
  if (!response.ok) throw new Error("Ollama generation responded with HTTP " + response.status);
  const payload = await response.json();
  return {
    endpoint: base,
    model: selectedModel,
    status: "generation_ok",
    latencyMs: Math.max(1, Date.now() - startedAt),
    sample: cleanLine(payload.response || payload.message || payload.done_reason || "")
  };
}

// Capability Contract (Seven Contracts, "Capability/Locality"): a grant is
// resource+action+scope+locality+approval+budget, per P1.3. Every provider action
// checks/ensures a grant exists before the run is recorded - see recordProviderRun below.
function findActiveCapability(state, resource, action) {
  return Object.values(state.control.capabilities).find((grant) => grant.resource === resource && grant.action === action && !grant.revokedAt) || null;
}

function ensureCapabilityGrant(state, resource, action, options = {}) {
  const existing = findActiveCapability(state, resource, action);
  if (existing) return existing;
  const id = makeId("capability");
  const createdAt = now();
  const grant = {
    id,
    resource: cleanLine(resource || "provider"),
    action: cleanLine(action || "run"),
    scope: cleanLine(options.scope || "provider-action"),
    locality: cleanLine(options.locality || "local"),
    approval: cleanLine(options.approval || "explicit-user-action"),
    budget: options.budget && typeof options.budget === "object" ? options.budget : { limit: 0, spent: 0, unit: "unmetered-local" },
    grantedAt: createdAt,
    revokedAt: ""
  };
  state.control.capabilities[id] = grant;
  addAudit(state, "capability.grant", "Capability granted: " + grant.resource + "/" + grant.action + " (" + grant.locality + ")", state.activeNoteId);
  return grant;
}

function revokeCapability(state, id) {
  const grant = state.control.capabilities[id];
  if (!grant || grant.revokedAt) return;
  grant.revokedAt = now();
  addAudit(state, "capability.revoke", "Capability revoked: " + grant.resource + "/" + grant.action, state.activeNoteId);
}

function recordProviderRun(state, providerId, kind, status, summary, details) {
  ensureCapabilityGrant(state, providerId, kind, { locality: "local" });
  const id = makeId("providerrun");
  const activeNote = getActiveNote(state);
  const source = Object.values(state.sources || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
  const createdAt = now();
  state.providerRuns[id] = {
    id,
    providerId: cleanLine(providerId || "provider"),
    kind: cleanLine(kind || "probe"),
    status: cleanLine(status || "recorded"),
    sourceId: source ? source.id : "",
    noteId: activeNote ? activeNote.id : "",
    summary: String(summary || ""),
    details: details && typeof details === "object" ? details : {},
    createdAt,
    updatedAt: createdAt
  };
  addAudit(state, "provider.run", providerId + " " + kind + ": " + summary, activeNote ? activeNote.id : "");
  return id;
}

function displayModeStatus() {
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return "standalone";
  if (window.navigator && window.navigator.standalone) return "standalone-ios";
  return "browser";
}

function syncPwaProviderState(state, status, details) {
  const env = state.environment || {};
  const nextDetails = details || {};
  state.providers.pwa = Object.assign({}, state.providers.pwa || {}, {
    label: "PWA / Offline shell",
    status: cleanLine(status || env.serviceWorkerStatus || "unchecked"),
    endpoint: "/service-worker.js",
    lastCheckedAt: now(),
    lastProbeAt: env.serviceWorkerUpdatedAt || now(),
    lastError: env.pwaLastError || "",
    scopes: ["offline-shell", "install-boundary", "local-cache"],
    revokedAt: "",
    requiredAction: nextDetails.installPromptStatus === "available"
      ? "Browser install prompt is available after owner action."
      : "Manifest and service worker are local. Browser controls whether an install prompt is exposed."
  });
}

async function refreshPwaStatus(source) {
  if (!store) return;
  const manifest = document.querySelector("link[rel='manifest']");
  const manifestHref = manifest ? manifest.href : "";
  const supported = Boolean(navigator.serviceWorker);
  const displayMode = displayModeStatus();
  let serviceWorkerStatus = supported ? "supported" : "unsupported";
  let serviceWorkerScope = "";
  let pwaLastError = "";
  if (supported) {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");
      await navigator.serviceWorker.ready;
      serviceWorkerStatus = "service-worker-ready";
      serviceWorkerScope = registration.scope || "";
    } catch (error) {
      serviceWorkerStatus = "service-worker-error";
      pwaLastError = error && error.message ? error.message : String(error);
    }
  }
  await store.commit("PWA boundary checked", (state) => {
    state.environment.manifestHref = manifestHref;
    state.environment.serviceWorkerSupported = supported;
    state.environment.serviceWorkerStatus = serviceWorkerStatus;
    state.environment.serviceWorkerScope = serviceWorkerScope;
    state.environment.serviceWorkerUpdatedAt = now();
    state.environment.installPromptStatus = deferredInstallPrompt ? "available" : (state.environment.installPromptStatus || "not-seen");
    state.environment.displayMode = displayMode;
    state.environment.pwaLastError = pwaLastError;
    syncPwaProviderState(state, serviceWorkerStatus, {
      installPromptStatus: state.environment.installPromptStatus
    });
    recordProviderRun(state, "pwa", source || "service-worker-check", serviceWorkerStatus, "PWA shell checked: " + serviceWorkerStatus, {
      manifestHref,
      serviceWorkerScope,
      displayMode,
      installPromptStatus: state.environment.installPromptStatus,
      error: pwaLastError
    });
  });
}

async function requestPwaInstallPrompt() {
  if (!store) return;
  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    await promptEvent.prompt();
    const choice = promptEvent.userChoice ? await promptEvent.userChoice : { outcome: "prompted" };
    await store.commit("PWA install prompt handled", (state) => {
      state.environment.installPromptStatus = choice && choice.outcome ? choice.outcome : "prompted";
      state.environment.displayMode = displayModeStatus();
      syncPwaProviderState(state, "install-prompt-handled", {
        installPromptStatus: state.environment.installPromptStatus
      });
      recordProviderRun(state, "pwa", "install-prompt", state.environment.installPromptStatus, "Browser PWA install prompt handled: " + state.environment.installPromptStatus, {
        outcome: state.environment.installPromptStatus
      });
    });
    return;
  }
  await store.commit("PWA install prompt unavailable", (state) => {
    state.environment.installPromptStatus = "browser-menu-required";
    state.environment.displayMode = displayModeStatus();
    syncPwaProviderState(state, state.environment.serviceWorkerStatus || "service-worker-ready", {
      installPromptStatus: state.environment.installPromptStatus
    });
    recordProviderRun(state, "pwa", "install-prompt", "browser-menu-required", "Browser did not expose beforeinstallprompt; use browser install menu if available.", {
      manifestHref: state.environment.manifestHref,
      serviceWorkerStatus: state.environment.serviceWorkerStatus
    });
  });
}

function syncOllamaProviderState(state) {
  const status = state.ollama.status || "unchecked";
  const generationStatus = state.ollama.lastGenerationStatus || "";
  let requiredAction = "";
  if (status === "generation_ok" || generationStatus === "generation_ok") {
    requiredAction = "Генерация проверена локально. Каждый запуск модели остаётся явным действием владельца.";
  } else if (status === "models_found") {
    requiredAction = "Модели найдены, но генерация ещё не проверена. Нажми Тест генерации перед использованием модели.";
  } else if (status === "reachable") {
    requiredAction = "Endpoint доступен, но моделей нет. Установи модель Ollama и повтори проверку.";
  } else {
    requiredAction = "Запусти Ollama локально на 127.0.0.1:11434, разреши browser-origin при необходимости, затем нажми Проверить и Тест генерации.";
  }
  state.providers.ollama = Object.assign({}, state.providers.ollama || {}, {
    label: "Ollama",
    status,
    endpoint: state.ollama.endpoint,
    lastCheckedAt: state.ollama.lastCheckedAt || "",
    lastProbeAt: state.ollama.lastProbeAt || "",
    lastError: state.ollama.lastError || "",
    scopes: state.ollama.scopes || ["active-artifact-analysis"],
    lastGenerationStatus: generationStatus,
    revokedAt: state.ollama.revokedAt || "",
    requiredAction
  });
}

function revokeProvider(state, providerId) {
  const id = cleanLine(providerId || "");
  const revokedAt = now();
  if (id === "ollama") {
    state.ollama.status = "revoked";
    state.ollama.models = [];
    state.ollama.selectedModel = "";
    state.ollama.revokedAt = revokedAt;
    state.ollama.lastError = "";
    syncOllamaProviderState(state);
  } else if (state.providers[id]) {
    state.providers[id].status = "revoked";
    state.providers[id].revokedAt = revokedAt;
    state.providers[id].lastError = "";
  }
  recordProviderRun(state, id || "provider", "revoke", "revoked", "Provider revoked by owner", { revokedAt });
}

function createOllamaProposalDryRun(state, promptText) {
  const activeNote = getActiveNote(state);
  const source = Object.values(state.sources || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
  const contextTitle = source ? source.name : activeNote ? activeNote.title : "active artifact";
  const prompt = cleanLine(promptText || "Analyze active LifeOS artifact");
  if (state.ollama.status !== "generation_ok" && state.ollama.lastGenerationStatus !== "generation_ok") {
    const summary = "Ollama is " + state.ollama.status + ". Probe/start local Ollama before model analysis.";
    recordProviderRun(state, "ollama", "dry-run", "blocked", summary, { prompt });
    addProposal(state, "provider_connection_request", "Подключить Ollama перед AI-разбором", source ? source.id : "", activeNote ? activeNote.id : "", {
      fields: {
        provider: "ollama",
        status: state.ollama.status,
        prompt,
        scope: "active-artifact-analysis"
      }
    });
    return "";
  }
  const proposalId = addProposal(state, "agent", "Ollama proposal-only analysis: " + shorten(contextTitle, 52), source ? source.id : "", activeNote ? activeNote.id : "", {
    fields: {
      provider: "ollama",
      model: state.ollama.selectedModel || state.ollama.models[0] || "",
      prompt,
      scope: "active-artifact-analysis",
      mutationMode: "proposal-only"
    }
  });
  recordProviderRun(state, "ollama", "proposal-dry-run", "proposal_created", "Ollama run prepared as proposal only for " + contextTitle, { proposalId, prompt });
  return proposalId;
}

function renameNote(state, noteId, newTitle) {
  const note = state.notes[noteId];
  if (!note || note.deleted) return;
  const oldTitle = note.title;
  const cleanTitle = cleanLine(newTitle || oldTitle);
  if (!cleanTitle || normalizeTitle(cleanTitle) === normalizeTitle(oldTitle)) return;
  note.title = cleanTitle;
  note.updatedAt = now();
  for (const other of Object.values(state.notes)) {
    if (!other.deleted && other.id !== noteId) {
      other.body = replaceWikiLinksForRename(other.body, oldTitle, cleanTitle);
      other.updatedAt = now();
    }
  }
  addAudit(state, "note.rename", "Renamed " + oldTitle + " to " + cleanTitle, noteId);
  rebuildIndexes(state);
}

function deleteNote(state, noteId) {
  const note = state.notes[noteId];
  if (!note || note.deleted) return;
  note.deleted = true;
  note.updatedAt = now();
  addAudit(state, "note.delete", "Note deleted: " + note.title, noteId);
  const nextNote = Object.values(state.notes).find((item) => !item.deleted && item.id !== noteId);
  state.activeNoteId = nextNote ? nextNote.id : "";
  rebuildIndexes(state);
}

function createNoteFromGhost(state, ghostId) {
  const ghost = state.ghosts[ghostId];
  if (!ghost) return "";
  const body = "# " + ghost.title + "\n\nCreated from unresolved wikilinks.\n";
  const id = createNote(state, ghost.title, state.activeFolderId, body);
  addAudit(state, "ghost.materialize", "Ghost node materialized: " + ghost.title, id);
  rebuildIndexes(state);
  return id;
}

const graphProjectionCache = new WeakMap();

function graphProjectionKey(state) {
  const view = state.graphView || {};
  const filters = state.graphFilters || {};
  return [
    Number(state.graphProjectionStamp || 0),
    view.mode || "",
    view.searchQuery || "",
    view.selectedNodeId || "",
    Object.keys(filters).sort().map((key) => key + ":" + (filters[key] !== false ? "1" : "0")).join("|")
  ].join("::");
}

function mapGraph(state) {
  if (!state || typeof state !== "object") return { nodes: [], links: [] };
  const key = graphProjectionKey(state);
  const cached = graphProjectionCache.get(state);
  if (cached && cached.key === key) return cached.graph;
  const graph = computeGraphProjection(state);
  graphProjectionCache.set(state, { key, graph });
  return graph;
}

function computeGraphProjection(state) {
  const notes = Object.values(state.notes).filter((note) => !note.deleted);
  const filters = Object.assign({ notes: true, productBrain: false, sources: true, goals: true, tasks: true, money: true, habits: true, insights: true, knowledge: true, chat: true, systems: true, channels: true, models: true, home: true, ghosts: true }, state.graphFilters || {});
  const incoming = {};
  const outgoing = {};
  const nodes = [];
  const links = [];
  for (const note of notes) {
    incoming[note.id] = incoming[note.id] || 0;
    outgoing[note.id] = outgoing[note.id] || 0;
  }
  for (const ghost of Object.values(state.ghosts)) {
    incoming[ghost.id] = incoming[ghost.id] || 0;
  }
  const seenEdges = new Set();
  function addGraphEdge(source, target, label) {
    if (!source || !target) return;
    const edgeId = source + "->" + target + ":" + hashString(label || target);
    if (seenEdges.has(edgeId)) return;
    seenEdges.add(edgeId);
    links.push({ source, target, id: edgeId, label: cleanLine(label || "linked") });
    incoming[target] = (incoming[target] || 0) + 1;
    outgoing[source] = (outgoing[source] || 0) + 1;
  }
  for (const note of notes) {
    for (const link of note.links) {
      const target = link.targetId || link.ghostId;
      if (!target) continue;
      addGraphEdge(note.id, target, link.targetTitle);
    }
  }
  for (const row of PRODUCT_BRAIN_LINK_SPECS) {
    const sourceId = productBrainNoteIdByKey(row[0]);
    const targetId = productBrainNoteIdByKey(row[1]);
    if (sourceId && targetId && state.notes[sourceId] && state.notes[targetId] && !state.notes[sourceId].deleted && !state.notes[targetId].deleted) {
      addGraphEdge(sourceId, targetId, row[2]);
    }
  }
  for (const source of Object.values(state.sources || {}).filter((item) => !item.deleted)) {
    incoming[source.id] = incoming[source.id] || 0;
    outgoing[source.id] = outgoing[source.id] || 0;
    if (source.noteId && state.notes[source.noteId] && !state.notes[source.noteId].deleted) {
      addGraphEdge(source.id, source.noteId, "source-note");
    }
  }
  for (const search of savedSearchList(state)) {
    incoming[search.id] = incoming[search.id] || 0;
    outgoing[search.id] = outgoing[search.id] || 0;
    if (search.noteId && state.notes[search.noteId] && !state.notes[search.noteId].deleted) addGraphEdge(search.id, search.noteId, "saved-search-anchor");
    for (const note of searchNotes(state, search.query).slice(0, 6)) {
      addGraphEdge(search.id, note.id, "saved-search-match");
    }
  }
  for (const segment of Object.values(state.transcriptSegments || {}).filter((item) => !item.deleted)) {
    incoming[segment.id] = incoming[segment.id] || 0;
    outgoing[segment.id] = outgoing[segment.id] || 0;
    if (segment.sourceId && state.sources[segment.sourceId] && !state.sources[segment.sourceId].deleted) addGraphEdge(segment.id, segment.sourceId, "transcript-source");
    if (segment.noteId && state.notes[segment.noteId] && !state.notes[segment.noteId].deleted) addGraphEdge(segment.id, segment.noteId, "transcript-note");
  }
  for (const checkpoint of Object.values(state.audioCheckpoints || {}).filter((item) => !item.deleted)) {
    incoming[checkpoint.id] = incoming[checkpoint.id] || 0;
    outgoing[checkpoint.id] = outgoing[checkpoint.id] || 0;
    if (checkpoint.sourceId && state.sources[checkpoint.sourceId] && !state.sources[checkpoint.sourceId].deleted) addGraphEdge(checkpoint.id, checkpoint.sourceId, "checkpoint-source");
    if (checkpoint.noteId && state.notes[checkpoint.noteId] && !state.notes[checkpoint.noteId].deleted) addGraphEdge(checkpoint.id, checkpoint.noteId, "checkpoint-note");
  }
  for (const playerNote of Object.values(state.playerNotes || {}).filter((item) => !item.deleted)) {
    incoming[playerNote.id] = incoming[playerNote.id] || 0;
    outgoing[playerNote.id] = outgoing[playerNote.id] || 0;
    if (playerNote.sourceId && state.sources[playerNote.sourceId] && !state.sources[playerNote.sourceId].deleted) addGraphEdge(playerNote.id, playerNote.sourceId, "player-note-source");
    if (playerNote.noteId && state.notes[playerNote.noteId] && !state.notes[playerNote.noteId].deleted) addGraphEdge(playerNote.id, playerNote.noteId, "player-note-note");
    if (playerNote.segmentId && state.transcriptSegments[playerNote.segmentId] && !state.transcriptSegments[playerNote.segmentId].deleted) addGraphEdge(playerNote.id, playerNote.segmentId, "player-note-segment");
  }
  for (const goal of Object.values(state.goals || {}).filter((item) => !item.deleted)) {
    incoming[goal.id] = incoming[goal.id] || 0;
    outgoing[goal.id] = outgoing[goal.id] || 0;
    if (goal.noteId && state.notes[goal.noteId] && !state.notes[goal.noteId].deleted) {
      addGraphEdge(goal.id, goal.noteId, "goal-note");
    }
  }
  for (const task of Object.values(state.tasks || {}).filter((item) => !item.deleted)) {
    incoming[task.id] = incoming[task.id] || 0;
    outgoing[task.id] = outgoing[task.id] || 0;
    if (task.goalId && state.goals[task.goalId]) addGraphEdge(task.id, task.goalId, "task-goal");
    if (task.sourceId && state.sources[task.sourceId]) addGraphEdge(task.id, task.sourceId, "task-source");
    if (task.noteId && state.notes[task.noteId] && !state.notes[task.noteId].deleted) {
      addGraphEdge(task.id, task.noteId, "task-note");
    }
  }
  for (const block of Object.values(state.planBlocks || {}).filter((item) => !item.deleted)) {
    incoming[block.id] = incoming[block.id] || 0;
    outgoing[block.id] = outgoing[block.id] || 0;
    if (block.sourceId && state.sources[block.sourceId]) addGraphEdge(block.id, block.sourceId, "plan-source");
    if (block.noteId && state.notes[block.noteId] && !state.notes[block.noteId].deleted) {
      addGraphEdge(block.id, block.noteId, "plan-note");
    }
  }
  for (const reminder of Object.values(state.reminders || {}).filter((item) => !item.deleted)) {
    incoming[reminder.id] = incoming[reminder.id] || 0;
    outgoing[reminder.id] = outgoing[reminder.id] || 0;
    if (reminder.sourceId && state.sources[reminder.sourceId]) addGraphEdge(reminder.id, reminder.sourceId, "reminder-source");
    if (reminder.noteId && state.notes[reminder.noteId] && !state.notes[reminder.noteId].deleted) addGraphEdge(reminder.id, reminder.noteId, "reminder-note");
  }
  for (const habit of Object.values(state.habits || {}).filter((item) => !item.deleted)) {
    incoming[habit.id] = incoming[habit.id] || 0;
    outgoing[habit.id] = outgoing[habit.id] || 0;
    if (habit.sourceId && state.sources[habit.sourceId]) addGraphEdge(habit.id, habit.sourceId, "habit-source");
    if (habit.noteId && state.notes[habit.noteId] && !state.notes[habit.noteId].deleted) addGraphEdge(habit.id, habit.noteId, "habit-note");
  }
  for (const tx of Object.values(state.financeTransactions || {}).filter((item) => !item.deleted)) {
    incoming[tx.id] = incoming[tx.id] || 0;
    outgoing[tx.id] = outgoing[tx.id] || 0;
    if (tx.sourceId && state.sources[tx.sourceId]) addGraphEdge(tx.id, tx.sourceId, "finance-source");
    if (tx.noteId && state.notes[tx.noteId] && !state.notes[tx.noteId].deleted) addGraphEdge(tx.id, tx.noteId, "finance-note");
    if (tx.accountId && state.financeAccounts[tx.accountId]) addGraphEdge(tx.id, tx.accountId, "finance-account");
  }
  for (const account of Object.values(state.financeAccounts || {}).filter((item) => !item.deleted)) {
    incoming[account.id] = incoming[account.id] || 0;
    outgoing[account.id] = outgoing[account.id] || 0;
  }
  for (const subscription of Object.values(state.subscriptions || {}).filter((item) => !item.deleted)) {
    incoming[subscription.id] = incoming[subscription.id] || 0;
    outgoing[subscription.id] = outgoing[subscription.id] || 0;
    if (subscription.sourceId && state.sources[subscription.sourceId]) addGraphEdge(subscription.id, subscription.sourceId, "subscription-source");
    if (subscription.noteId && state.notes[subscription.noteId] && !state.notes[subscription.noteId].deleted) addGraphEdge(subscription.id, subscription.noteId, "subscription-note");
  }
  for (const budget of Object.values(state.budgets || {}).filter((item) => !item.deleted)) {
    incoming[budget.id] = incoming[budget.id] || 0;
    outgoing[budget.id] = outgoing[budget.id] || 0;
    if (budget.sourceId && state.sources[budget.sourceId]) addGraphEdge(budget.id, budget.sourceId, "budget-source");
    if (budget.noteId && state.notes[budget.noteId] && !state.notes[budget.noteId].deleted) addGraphEdge(budget.id, budget.noteId, "budget-note");
  }
  for (const insight of Object.values(state.insights || {}).filter((item) => item.status !== "ignored")) {
    incoming[insight.id] = incoming[insight.id] || 0;
    outgoing[insight.id] = outgoing[insight.id] || 0;
    if (insight.sourceId && state.sources[insight.sourceId]) addGraphEdge(insight.id, insight.sourceId, "insight-source");
    if (insight.noteId && state.notes[insight.noteId] && !state.notes[insight.noteId].deleted) addGraphEdge(insight.id, insight.noteId, "insight-note");
  }
  for (const claim of Object.values(state.claims || {}).filter((item) => !item.deleted)) {
    incoming[claim.id] = incoming[claim.id] || 0;
    outgoing[claim.id] = outgoing[claim.id] || 0;
    if (claim.sourceId && state.sources[claim.sourceId]) addGraphEdge(claim.id, claim.sourceId, "claim-source");
    if (claim.noteId && state.notes[claim.noteId] && !state.notes[claim.noteId].deleted) addGraphEdge(claim.id, claim.noteId, "claim-note");
  }
  for (const question of Object.values(state.questions || {}).filter((item) => !item.deleted && item.status !== "ignored")) {
    incoming[question.id] = incoming[question.id] || 0;
    outgoing[question.id] = outgoing[question.id] || 0;
    if (question.sourceId && state.sources[question.sourceId]) addGraphEdge(question.id, question.sourceId, "question-source");
    if (question.noteId && state.notes[question.noteId] && !state.notes[question.noteId].deleted) addGraphEdge(question.id, question.noteId, "question-note");
  }
  for (const reviewItem of Object.values(state.reviewItems || {}).filter((item) => !item.deleted)) {
    incoming[reviewItem.id] = incoming[reviewItem.id] || 0;
    outgoing[reviewItem.id] = outgoing[reviewItem.id] || 0;
    if (reviewItem.sourceId && state.sources[reviewItem.sourceId]) addGraphEdge(reviewItem.id, reviewItem.sourceId, "review-source");
    if (reviewItem.noteId && state.notes[reviewItem.noteId] && !state.notes[reviewItem.noteId].deleted) addGraphEdge(reviewItem.id, reviewItem.noteId, "review-note");
  }
  for (const readingItem of Object.values(state.readingItems || {}).filter((item) => !item.deleted)) {
    incoming[readingItem.id] = incoming[readingItem.id] || 0;
    outgoing[readingItem.id] = outgoing[readingItem.id] || 0;
    if (readingItem.sourceId && state.sources[readingItem.sourceId]) addGraphEdge(readingItem.id, readingItem.sourceId, "reading-source");
    if (readingItem.noteId && state.notes[readingItem.noteId] && !state.notes[readingItem.noteId].deleted) addGraphEdge(readingItem.id, readingItem.noteId, "reading-note");
  }
  for (const highlight of Object.values(state.highlights || {}).filter((item) => !item.deleted)) {
    incoming[highlight.id] = incoming[highlight.id] || 0;
    outgoing[highlight.id] = outgoing[highlight.id] || 0;
    if (highlight.readingItemId && state.readingItems[highlight.readingItemId]) addGraphEdge(highlight.id, highlight.readingItemId, "highlight-reading");
    if (highlight.sourceId && state.sources[highlight.sourceId]) addGraphEdge(highlight.id, highlight.sourceId, "highlight-source");
    if (highlight.noteId && state.notes[highlight.noteId] && !state.notes[highlight.noteId].deleted) addGraphEdge(highlight.id, highlight.noteId, "highlight-note");
  }
  for (const proposal of Object.values(state.proposals || {}).filter((item) => item.status === "open")) {
    incoming[proposal.id] = incoming[proposal.id] || 0;
    outgoing[proposal.id] = outgoing[proposal.id] || 0;
    if (proposal.sourceId && state.sources[proposal.sourceId] && !state.sources[proposal.sourceId].deleted) addGraphEdge(proposal.id, proposal.sourceId, "proposal-source");
    if (proposal.noteId && state.notes[proposal.noteId] && !state.notes[proposal.noteId].deleted) addGraphEdge(proposal.id, proposal.noteId, "proposal-note");
  }
  for (const message of visibleChatMessages(state)) {
    incoming[message.id] = incoming[message.id] || 0;
    outgoing[message.id] = outgoing[message.id] || 0;
    if (message.noteId && state.notes[message.noteId] && !state.notes[message.noteId].deleted) addGraphEdge(message.id, message.noteId, "chat-note");
    if (message.sourceId && state.sources[message.sourceId] && !state.sources[message.sourceId].deleted) addGraphEdge(message.id, message.sourceId, "chat-source");
    if (message.proposalId && state.proposals[message.proposalId]) addGraphEdge(message.id, message.proposalId, "chat-proposal");
  }
  for (const run of Object.values(state.agentRuns || {})) {
    incoming[run.id] = incoming[run.id] || 0;
    outgoing[run.id] = outgoing[run.id] || 0;
    if (run.sourceId && state.sources[run.sourceId] && !state.sources[run.sourceId].deleted) addGraphEdge(run.id, run.sourceId, "agent-source");
    if (run.noteId && state.notes[run.noteId] && !state.notes[run.noteId].deleted) addGraphEdge(run.id, run.noteId, "agent-note");
  }
  for (const run of Object.values(state.providerRuns || {})) {
    incoming[run.id] = incoming[run.id] || 0;
    outgoing[run.id] = outgoing[run.id] || 0;
    if (run.sourceId && state.sources[run.sourceId] && !state.sources[run.sourceId].deleted) addGraphEdge(run.id, run.sourceId, "provider-source");
    if (run.noteId && state.notes[run.noteId] && !state.notes[run.noteId].deleted) addGraphEdge(run.id, run.noteId, "provider-note");
  }
  for (const run of Object.values(state.flowRuns || {})) {
    incoming[run.id] = incoming[run.id] || 0;
    outgoing[run.id] = outgoing[run.id] || 0;
    if (run.sourceId && state.sources[run.sourceId] && !state.sources[run.sourceId].deleted) addGraphEdge(run.id, run.sourceId, "flow-source");
    if (run.noteId && state.notes[run.noteId] && !state.notes[run.noteId].deleted) addGraphEdge(run.id, run.noteId, "flow-note");
    for (const proposalId of run.proposalIds || []) {
      if (state.proposals[proposalId]) addGraphEdge(run.id, proposalId, "flow-proposal");
    }
  }
  for (const channel of Object.values(state.channels || {}).filter((item) => !item.deleted)) {
    incoming[channel.id] = incoming[channel.id] || 0;
    outgoing[channel.id] = outgoing[channel.id] || 0;
    if (channel.noteId && state.notes[channel.noteId] && !state.notes[channel.noteId].deleted) addGraphEdge(channel.id, channel.noteId, "channel-note");
  }
  for (const system of Object.values(state.systemDefinitions || {}).filter((item) => !item.deleted)) {
    incoming[system.id] = incoming[system.id] || 0;
    outgoing[system.id] = outgoing[system.id] || 0;
    if (system.noteId && state.notes[system.noteId] && !state.notes[system.noteId].deleted) addGraphEdge(system.id, system.noteId, "system-note");
    if (system.installedPackId && state.installedPacks[system.installedPackId]) addGraphEdge(system.id, system.installedPackId, "system-installed-pack");
  }
  for (const record of Object.values(state.systemRecords || {}).filter((item) => !item.deleted)) {
    incoming[record.id] = incoming[record.id] || 0;
    outgoing[record.id] = outgoing[record.id] || 0;
    if (record.systemId && state.systemDefinitions[record.systemId]) addGraphEdge(record.id, record.systemId, "record-system");
    if (record.noteId && state.notes[record.noteId] && !state.notes[record.noteId].deleted) addGraphEdge(record.id, record.noteId, "record-note");
  }
  for (const project of Object.values(state.projects || {}).filter((item) => !item.deleted)) {
    incoming[project.id] = incoming[project.id] || 0;
    outgoing[project.id] = outgoing[project.id] || 0;
    if (project.noteId && state.notes[project.noteId] && !state.notes[project.noteId].deleted) addGraphEdge(project.id, project.noteId, "project-note");
  }
  for (const item of Object.values(state.projectItems || {}).filter((row) => !row.deleted)) {
    incoming[item.id] = incoming[item.id] || 0;
    outgoing[item.id] = outgoing[item.id] || 0;
    if (item.projectId && state.projects[item.projectId]) addGraphEdge(item.id, item.projectId, "project-item-project");
    if (item.noteId && state.notes[item.noteId] && !state.notes[item.noteId].deleted) addGraphEdge(item.id, item.noteId, "project-item-note");
  }
  for (const pack of Object.values(state.marketplacePacks || {}).filter((item) => !item.deleted)) {
    incoming[pack.id] = incoming[pack.id] || 0;
    outgoing[pack.id] = outgoing[pack.id] || 0;
    if (pack.noteId && state.notes[pack.noteId] && !state.notes[pack.noteId].deleted) addGraphEdge(pack.id, pack.noteId, "pack-note");
  }
  for (const install of Object.values(state.installedPacks || {}).filter((item) => !item.deleted)) {
    incoming[install.id] = incoming[install.id] || 0;
    outgoing[install.id] = outgoing[install.id] || 0;
    if (install.packId && state.marketplacePacks[install.packId]) addGraphEdge(install.id, install.packId, "install-pack");
    if (install.systemId && state.systemDefinitions[install.systemId]) addGraphEdge(install.id, install.systemId, "install-system");
    if (install.noteId && state.notes[install.noteId] && !state.notes[install.noteId].deleted) addGraphEdge(install.id, install.noteId, "install-note");
  }
  for (const database of Object.values(state.customDatabases || {}).filter((item) => !item.deleted)) {
    incoming[database.id] = incoming[database.id] || 0;
    outgoing[database.id] = outgoing[database.id] || 0;
    if (database.noteId && state.notes[database.noteId] && !state.notes[database.noteId].deleted) addGraphEdge(database.id, database.noteId, "database-note");
  }
  for (const row of Object.values(state.databaseRows || {}).filter((item) => !item.deleted)) {
    incoming[row.id] = incoming[row.id] || 0;
    outgoing[row.id] = outgoing[row.id] || 0;
    if (row.databaseId && state.customDatabases[row.databaseId]) addGraphEdge(row.id, row.databaseId, "database-row-database");
    if (row.noteId && state.notes[row.noteId] && !state.notes[row.noteId].deleted) addGraphEdge(row.id, row.noteId, "database-row-note");
  }
  for (const model of Object.values(state.modelProfiles || {}).filter((item) => !item.deleted)) {
    incoming[model.id] = incoming[model.id] || 0;
    outgoing[model.id] = outgoing[model.id] || 0;
    if (model.noteId && state.notes[model.noteId] && !state.notes[model.noteId].deleted) addGraphEdge(model.id, model.noteId, "model-note");
  }
  for (const device of Object.values(state.smartHomeDevices || {}).filter((item) => !item.deleted)) {
    incoming[device.id] = incoming[device.id] || 0;
    outgoing[device.id] = outgoing[device.id] || 0;
    if (device.noteId && state.notes[device.noteId] && !state.notes[device.noteId].deleted) addGraphEdge(device.id, device.noteId, "device-note");
  }
  for (const event of Object.values(state.smartHomeEvents || {}).filter((item) => !item.deleted)) {
    incoming[event.id] = incoming[event.id] || 0;
    outgoing[event.id] = outgoing[event.id] || 0;
    if (event.deviceId && state.smartHomeDevices[event.deviceId]) addGraphEdge(event.id, event.deviceId, "home-event-device");
    if (event.noteId && state.notes[event.noteId] && !state.notes[event.noteId].deleted) addGraphEdge(event.id, event.noteId, "home-event-note");
  }
  for (const profile of Object.values(state.designProfiles || {}).filter((item) => !item.deleted)) {
    incoming[profile.id] = incoming[profile.id] || 0;
    outgoing[profile.id] = outgoing[profile.id] || 0;
  }
  for (const session of Object.values(state.screenCompanionSessions || {}).filter((item) => !item.deleted)) {
    incoming[session.id] = incoming[session.id] || 0;
    outgoing[session.id] = outgoing[session.id] || 0;
    if (session.noteId && state.notes[session.noteId] && !state.notes[session.noteId].deleted) addGraphEdge(session.id, session.noteId, "screen-note");
  }
  for (const snapshot of Object.values(state.personalTwinSnapshots || {}).filter((item) => !item.deleted)) {
    incoming[snapshot.id] = incoming[snapshot.id] || 0;
    outgoing[snapshot.id] = outgoing[snapshot.id] || 0;
    if (snapshot.noteId && state.notes[snapshot.noteId] && !state.notes[snapshot.noteId].deleted) addGraphEdge(snapshot.id, snapshot.noteId, "twin-note");
  }
  if (filters.notes) {
    for (const note of notes) {
      if (note.systemType === "product_brain") continue;
      const backWeight = incoming[note.id] || 0;
      const outWeight = outgoing[note.id] || 0;
      nodes.push({
        id: note.id,
        label: note.title,
        val: Math.max(7, Math.round(7 + Math.sqrt(backWeight) * 6 + outWeight * 1.5)),
        type: note.id === state.activeNoteId ? "active-note" : "note",
        folderId: note.folderId
      });
    }
  }
  if (filters.productBrain) {
    for (const note of notes.filter((item) => item.systemType === "product_brain")) {
      const backWeight = incoming[note.id] || 0;
      const outWeight = outgoing[note.id] || 0;
      nodes.push({
        id: note.id,
        label: note.title,
        val: note.id === PRODUCT_BRAIN_ROOT_ID ? 24 : Math.max(9, Math.round(9 + Math.sqrt(backWeight) * 5 + outWeight * 1.5)),
        type: note.id === PRODUCT_BRAIN_ROOT_ID ? "product-brain-root" : "product-brain",
        folderId: note.folderId
      });
    }
  }
  if (filters.ghosts) {
    for (const ghost of Object.values(state.ghosts)) {
      const backWeight = incoming[ghost.id] || 0;
      nodes.push({
        id: ghost.id,
        label: ghost.title,
        val: Math.max(5, Math.round(5 + Math.sqrt(backWeight) * 5)),
        type: "ghost",
        folderId: ""
      });
    }
  }
  if (filters.sources) {
    for (const source of Object.values(state.sources || {}).filter((item) => !item.deleted)) {
      const backWeight = incoming[source.id] || 0;
      const outWeight = outgoing[source.id] || 0;
      nodes.push({
        id: source.id,
        label: source.name,
        val: Math.max(5, Math.round(5 + Math.sqrt(backWeight) * 4 + outWeight * 1.2)),
        type: source.kind === "audio" ? "audio-source" : "source",
        folderId: ""
      });
    }
  }
  if (filters.goals) {
    for (const goal of Object.values(state.goals || {}).filter((item) => !item.deleted)) {
      const backWeight = incoming[goal.id] || 0;
      const outWeight = outgoing[goal.id] || 0;
      nodes.push({
        id: goal.id,
        label: goal.title,
        val: Math.max(6, Math.round(6 + Math.sqrt(backWeight) * 5 + outWeight * 1.4)),
        type: goal.status === "done" ? "goal-done" : "goal",
        folderId: ""
      });
    }
  }
  if (filters.tasks) {
    for (const task of Object.values(state.tasks || {}).filter((item) => !item.deleted)) {
      nodes.push({
        id: task.id,
        label: task.title,
        val: task.status === "done" ? 5 : 7,
        type: task.status === "done" ? "task-done" : "task",
        folderId: ""
      });
    }
    for (const block of Object.values(state.planBlocks || {}).filter((item) => !item.deleted)) {
      nodes.push({
        id: block.id,
        label: block.title,
        val: block.status === "done" ? 5 : 7,
        type: block.status === "done" ? "plan-done" : "plan",
        folderId: ""
      });
    }
    for (const proposal of Object.values(state.proposals || {}).filter((item) => item.status === "open")) {
      nodes.push({
        id: proposal.id,
        label: proposal.title,
        val: 6,
        type: "proposal",
        folderId: ""
      });
    }
    for (const run of Object.values(state.agentRuns || {})) {
      nodes.push({
        id: run.id,
        label: run.name,
        val: 7,
        type: "agent",
        folderId: ""
      });
    }
    for (const run of Object.values(state.providerRuns || {})) {
      nodes.push({
        id: run.id,
        label: run.providerId + " " + run.kind,
        val: run.status === "offline" || run.status === "blocked" ? 5 : 7,
        type: "provider-run",
        folderId: ""
      });
    }
    for (const run of Object.values(state.flowRuns || {})) {
      nodes.push({
        id: run.id,
        label: "flow " + run.status,
        val: 7,
        type: "flow-run",
        folderId: ""
      });
    }
  }
  if (filters.chat) {
    for (const message of visibleChatMessages(state).slice(-40)) {
      nodes.push({
        id: message.id,
        label: (message.role === "assistant" ? "LifeOS: " : "Ты: ") + shorten(message.text || message.content || "", 60),
        val: message.role === "assistant" ? 6 : 7,
        type: message.role === "assistant" ? "chat-assistant" : "chat-owner",
        folderId: ""
      });
    }
  }
  if (filters.money) {
    for (const account of Object.values(state.financeAccounts || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: account.id, label: account.name + " " + Math.round(account.balance), val: 8, type: "finance-account", folderId: "" });
    }
    for (const tx of Object.values(state.financeTransactions || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: tx.id, label: tx.title + " " + Math.round(tx.amount), val: tx.kind === "income" ? 8 : 7, type: tx.kind === "income" ? "finance-income" : "finance-expense", folderId: "" });
    }
    for (const budget of Object.values(state.budgets || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: budget.id, label: "Бюджет " + budget.category, val: 7, type: "budget", folderId: "" });
    }
    for (const subscription of Object.values(state.subscriptions || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: subscription.id, label: subscription.title, val: 7, type: "subscription", folderId: "" });
    }
  }
  if (filters.habits) {
    for (const habit of Object.values(state.habits || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: habit.id, label: habit.title, val: habit.checkins && habit.checkins[todayKey()] ? 8 : 6, type: "habit", folderId: "" });
    }
    for (const reminder of Object.values(state.reminders || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: reminder.id, label: reminder.title, val: reminder.status === "done" ? 5 : 6, type: "reminder", folderId: "" });
    }
  }
  if (filters.insights) {
    for (const insight of Object.values(state.insights || {}).filter((item) => item.status !== "ignored")) {
      nodes.push({ id: insight.id, label: insight.title, val: insight.status === "applied" ? 7 : 6, type: "insight", folderId: "" });
    }
  }
  if (filters.knowledge) {
    for (const claim of Object.values(state.claims || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: claim.id, label: claim.title, val: claim.status === "archived" ? 5 : 7, type: "claim", folderId: "" });
    }
    for (const question of Object.values(state.questions || {}).filter((item) => !item.deleted && item.status !== "ignored")) {
      nodes.push({ id: question.id, label: question.title, val: question.status === "applied" ? 7 : 6, type: "question", folderId: "" });
    }
    for (const reviewItem of Object.values(state.reviewItems || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: reviewItem.id, label: reviewItem.title, val: reviewItem.status === "done" ? 5 : 6, type: "review", folderId: "" });
    }
    for (const readingItem of Object.values(state.readingItems || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: readingItem.id, label: readingItem.title, val: readingItem.status === "gated" ? 6 : 8, type: "reading", folderId: "" });
    }
    for (const highlight of Object.values(state.highlights || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: highlight.id, label: highlight.title, val: highlight.status === "archived" ? 5 : 7, type: "highlight", folderId: "" });
    }
    for (const segment of Object.values(state.transcriptSegments || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: segment.id, label: segment.timecode ? segment.timecode + " " + shorten(segment.text, 38) : shorten(segment.text, 48), val: 5, type: "transcript-segment", folderId: "" });
    }
    for (const checkpoint of Object.values(state.audioCheckpoints || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: checkpoint.id, label: checkpoint.title, val: checkpoint.status === "done" ? 5 : 6, type: "audio-checkpoint", folderId: "" });
    }
    for (const playerNote of Object.values(state.playerNotes || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: playerNote.id, label: playerNote.title, val: playerNote.status === "archived" ? 5 : 6, type: "player-note", folderId: "" });
    }
    for (const search of savedSearchList(state)) {
      nodes.push({ id: search.id, label: search.title, val: Math.max(6, Math.min(12, 6 + Math.round(Math.sqrt(search.resultCount || 0)))), type: "saved-search", folderId: "" });
    }
  }
  if (filters.channels) {
    for (const channel of Object.values(state.channels || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: channel.id, label: channel.title, val: channel.status === "active" ? 8 : 6, type: "channel", folderId: "" });
    }
  }
  if (filters.systems) {
    for (const system of Object.values(state.systemDefinitions || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: system.id, label: system.title, val: system.health === "ok" ? 10 : 7, type: "system", folderId: "" });
    }
    for (const record of Object.values(state.systemRecords || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: record.id, label: record.title, val: 6, type: "system-record", folderId: "" });
    }
    for (const project of Object.values(state.projects || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: project.id, label: project.title, val: project.status === "active" ? 9 : 6, type: "project", folderId: "" });
    }
    for (const item of Object.values(state.projectItems || {}).filter((row) => !row.deleted)) {
      nodes.push({ id: item.id, label: item.title, val: 6, type: "project-item", folderId: "" });
    }
    for (const pack of Object.values(state.marketplacePacks || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: pack.id, label: pack.title, val: pack.status === "available" ? 7 : 6, type: "marketplace-pack", folderId: "" });
    }
    for (const install of Object.values(state.installedPacks || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: install.id, label: install.title, val: install.status === "installed" ? 8 : 6, type: "installed-pack", folderId: "" });
    }
    for (const database of Object.values(state.customDatabases || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: database.id, label: database.title, val: 8, type: "database", folderId: "" });
    }
    for (const row of Object.values(state.databaseRows || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: row.id, label: row.title, val: 5, type: "database-row", folderId: "" });
    }
    for (const profile of Object.values(state.designProfiles || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: profile.id, label: profile.title, val: profile.status === "active" ? 8 : 5, type: "design-profile", folderId: "" });
    }
    for (const snapshot of Object.values(state.personalTwinSnapshots || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: snapshot.id, label: snapshot.title, val: 7, type: "twin-snapshot", folderId: "" });
    }
    for (const session of Object.values(state.screenCompanionSessions || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: session.id, label: session.title, val: 6, type: "screen-session", folderId: "" });
    }
  }
  if (filters.models) {
    for (const model of Object.values(state.modelProfiles || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: model.id, label: model.title, val: model.status === "models_found" || model.status === "reachable" ? 8 : 6, type: "model-profile", folderId: "" });
    }
  }
  if (filters.home) {
    for (const device of Object.values(state.smartHomeDevices || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: device.id, label: device.title, val: device.status === "manual" ? 7 : 8, type: "smart-home-device", folderId: "" });
    }
    for (const event of Object.values(state.smartHomeEvents || {}).filter((item) => !item.deleted)) {
      nodes.push({ id: event.id, label: event.title, val: 5, type: "smart-home-event", folderId: "" });
    }
  }
  nodes.sort((a, b) => a.label.localeCompare(b.label));
  const baseNodeIds = new Set(nodes.map((node) => node.id));
  const baseVisibleLinks = links.filter((link) => baseNodeIds.has(link.source) && baseNodeIds.has(link.target)).sort((a, b) => a.id.localeCompare(b.id));
  let scopedNodes = nodes;
  const graphView = state.graphView || {};
  const selectedNodeId = cleanLine(graphView.selectedNodeId || state.activeNoteId || "");
  if (graphView.mode === "local" && selectedNodeId) {
    const localIds = new Set([selectedNodeId]);
    for (const link of baseVisibleLinks) {
      if (link.source === selectedNodeId || link.target === selectedNodeId) {
        localIds.add(link.source);
        localIds.add(link.target);
      }
    }
    scopedNodes = scopedNodes.filter((node) => localIds.has(node.id));
  }
  const query = normalizeTitle(graphView.searchQuery || "");
  if (query) {
    const scopedNodeIds = new Set(scopedNodes.map((node) => node.id));
    const matchedIds = new Set(scopedNodes.filter((node) => normalizeTitle(node.label + " " + node.type).includes(query)).map((node) => node.id));
    const queryIds = new Set(matchedIds);
    for (const link of baseVisibleLinks) {
      if (!scopedNodeIds.has(link.source) || !scopedNodeIds.has(link.target)) continue;
      if (matchedIds.has(link.source) || matchedIds.has(link.target)) {
        queryIds.add(link.source);
        queryIds.add(link.target);
      }
    }
    scopedNodes = scopedNodes.filter((node) => queryIds.has(node.id));
  }
  const nodeIds = new Set(scopedNodes.map((node) => node.id));
  const visibleLinks = baseVisibleLinks.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));
  return { nodes: scopedNodes, links: visibleLinks };
}

const GRAPH_CANVAS_NODE_LIMIT = 320;
const GRAPH_CANVAS_LINK_LIMIT = 900;

function graphForCanvas(graph, state) {
  const fullNodeCount = graph.nodes.length;
  const fullLinkCount = graph.links.length;
  if (fullNodeCount <= GRAPH_CANVAS_NODE_LIMIT && fullLinkCount <= GRAPH_CANVAS_LINK_LIMIT) {
    return Object.assign({}, graph, {
      limited: false,
      fullNodeCount,
      fullLinkCount,
      canvasNodeCount: fullNodeCount,
      canvasLinkCount: fullLinkCount
    });
  }
  const graphView = state && state.graphView ? state.graphView : {};
  const query = normalizeTitle(graphView.searchQuery || "");
  const selectedId = cleanLine(graphView.selectedNodeId || (state && state.activeNoteId) || "");
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const linksByPriority = graph.links.slice().sort((a, b) => {
    const aSelected = a.source === selectedId || a.target === selectedId ? 1 : 0;
    const bSelected = b.source === selectedId || b.target === selectedId ? 1 : 0;
    if (aSelected !== bSelected) return bSelected - aSelected;
    return a.id.localeCompare(b.id);
  });
  const picked = new Map();
  function pick(node) {
    if (!node || picked.has(node.id) || picked.size >= GRAPH_CANVAS_NODE_LIMIT) return;
    picked.set(node.id, node);
  }
  pick(nodesById.get(selectedId));
  if (query) {
    graph.nodes
      .filter((node) => normalizeTitle(node.label + " " + node.type).includes(query))
      .sort((a, b) => {
        if ((b.val || 0) !== (a.val || 0)) return (b.val || 0) - (a.val || 0);
        return a.label.localeCompare(b.label);
      })
      .slice(0, 120)
      .forEach(pick);
  }
  for (const link of linksByPriority) {
    if (picked.size >= GRAPH_CANVAS_NODE_LIMIT) break;
    if (link.source === selectedId) pick(nodesById.get(link.target));
    if (link.target === selectedId) pick(nodesById.get(link.source));
  }
  graph.nodes
    .slice()
    .sort((a, b) => {
      if ((b.val || 0) !== (a.val || 0)) return (b.val || 0) - (a.val || 0);
      return a.label.localeCompare(b.label);
    })
    .forEach(pick);
  const pickedIds = new Set(picked.keys());
  const canvasLinks = linksByPriority
    .filter((link) => pickedIds.has(link.source) && pickedIds.has(link.target))
    .slice(0, GRAPH_CANVAS_LINK_LIMIT);
  return {
    nodes: Array.from(picked.values()),
    links: canvasLinks,
    limited: true,
    fullNodeCount,
    fullLinkCount,
    canvasNodeCount: picked.size,
    canvasLinkCount: canvasLinks.length
  };
}

function deterministicPoint(id, width, height) {
  const hash = parseInt(hashString(id), 16);
  const angle = (hash % 6283) / 1000;
  const radius = 90 + (hash % 180);
  return {
    x: width / 2 + Math.cos(angle) * radius,
    y: height / 2 + Math.sin(angle) * radius
  };
}

function preparePhysicsNodes(graph, width, height) {
  const nodes = graph.nodes.map((node) => {
    const point = deterministicPoint(node.id, width, height);
    return {
      id: node.id,
      label: node.label,
      val: node.val,
      type: node.type,
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      radius: 8 + node.val,
      fixed: false
    };
  });
  const lookup = new Map(nodes.map((node) => [node.id, node]));
  const links = graph.links.map((link) => {
    return {
      id: link.id,
      source: link.source,
      target: link.target,
      sourceNode: lookup.get(link.source),
      targetNode: lookup.get(link.target)
    };
  }).filter((link) => link.sourceNode && link.targetNode);
  return { nodes, links };
}

function runForceLayout(graph, width, height, iterations) {
  const canvasGraph = graph.limited || graph.nodes.length <= GRAPH_CANVAS_NODE_LIMIT
    ? graph
    : graphForCanvas(graph, null);
  const prepared = preparePhysicsNodes(canvasGraph, width, height);
  const tickLimit = canvasGraph.limited ? Math.min(iterations, 10) : iterations;
  for (let tick = 0; tick < tickLimit; tick += 1) {
    applyForceTick(prepared.nodes, prepared.links, width, height);
  }
  return prepared;
}

function applyForceTick(nodes, links, width, height) {
  const repulsion = 5200;
  const spring = 0.018;
  const desired = 128;
  const centerStrength = 0.006;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distSq = dx * dx + dy * dy;
      if (distSq < 0.01) {
        dx = 0.1 + i * 0.01;
        dy = 0.1 + j * 0.01;
        distSq = dx * dx + dy * dy;
      }
      const dist = Math.sqrt(distSq);
      const force = repulsion / distSq;
      const fx = force * dx / dist;
      const fy = force * dy / dist;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
      const minDist = a.radius + b.radius + 14;
      if (dist < minDist) {
        const push = (minDist - dist) * 0.055;
        const px = push * dx / dist;
        const py = push * dy / dist;
        a.vx -= px;
        a.vy -= py;
        b.vx += px;
        b.vy += py;
      }
    }
  }
  for (const link of links) {
    const a = link.sourceNode;
    const b = link.targetNode;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const force = (dist - desired) * spring;
    const fx = force * dx / dist;
    const fy = force * dy / dist;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }
  for (const node of nodes) {
    node.vx += (width / 2 - node.x) * centerStrength;
    node.vy += (height / 2 - node.y) * centerStrength;
    node.vx *= 0.82;
    node.vy *= 0.82;
    if (!node.fixed) {
      node.x += node.vx;
      node.y += node.vy;
    }
    node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
    node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
  }
}

class GraphCanvas {
  constructor(canvas, graph, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.fullGraph = graph;
    this.graph = graphForCanvas(graph, state);
    this.state = state;
    this.width = 900;
    this.height = 620;
    this.scale = state.graphView.zoom || 1;
    this.panX = state.graphView.panX || 0;
    this.panY = state.graphView.panY || 0;
    this.dragMode = "";
    this.dragNode = null;
    this.pointerX = 0;
    this.pointerY = 0;
    this.frame = 0;
    this.running = true;
    this.layoutTickLimit = this.graph.limited ? 18 : 260;
    this.animationFrameLimit = this.graph.limited ? 42 : 260;
    this.prepared = runForceLayout(this.graph, this.width, this.height, this.graph.limited ? 8 : 80);
    this.resize = this.resize.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.animate = this.animate.bind(this);
    window.addEventListener("resize", this.resize);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);
    this.resize();
    requestAnimationFrame(this.animate);
  }

  destroy() {
    this.running = false;
    window.removeEventListener("resize", this.resize);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerUp);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(320, Math.floor(rect.width * ratio));
    this.canvas.height = Math.max(260, Math.floor(rect.height * ratio));
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = Math.max(320, rect.width);
    this.height = Math.max(260, rect.height);
    this.draw();
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.panX) / this.scale,
      y: (clientY - rect.top - this.panY) / this.scale
    };
  }

  hitNode(point) {
    for (let index = this.prepared.nodes.length - 1; index >= 0; index -= 1) {
      const node = this.prepared.nodes[index];
      const dx = point.x - node.x;
      const dy = point.y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 6) return node;
    }
    return null;
  }

  onWheel(event) {
    event.preventDefault();
    const before = this.screenToWorld(event.clientX, event.clientY);
    const delta = event.deltaY < 0 ? 1.08 : 0.92;
    this.scale = Math.max(0.45, Math.min(2.4, this.scale * delta));
    const rect = this.canvas.getBoundingClientRect();
    this.panX = event.clientX - rect.left - before.x * this.scale;
    this.panY = event.clientY - rect.top - before.y * this.scale;
    this.persistView();
    this.draw();
  }

  onPointerDown(event) {
    const point = this.screenToWorld(event.clientX, event.clientY);
    const node = this.hitNode(point);
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    if (node) {
      this.dragMode = "node";
      this.dragNode = node;
      node.fixed = true;
      selectGraphNodeInState(this.state, node.id);
      render();
      return;
    } else {
      this.dragMode = "pan";
    }
    this.canvas.setPointerCapture(event.pointerId);
  }

  onPointerMove(event) {
    if (!this.dragMode) return;
    if (this.dragMode === "node" && this.dragNode) {
      const point = this.screenToWorld(event.clientX, event.clientY);
      this.dragNode.x = point.x;
      this.dragNode.y = point.y;
      this.dragNode.vx = 0;
      this.dragNode.vy = 0;
    }
    if (this.dragMode === "pan") {
      this.panX += event.clientX - this.pointerX;
      this.panY += event.clientY - this.pointerY;
      this.pointerX = event.clientX;
      this.pointerY = event.clientY;
      this.persistView();
    }
    this.draw();
  }

  onPointerUp(event) {
    if (this.dragNode) this.dragNode.fixed = false;
    this.dragMode = "";
    this.dragNode = null;
    try {
      this.canvas.releasePointerCapture(event.pointerId);
    } catch {
      return;
    }
  }

  persistView() {
    this.state.graphView.panX = this.panX;
    this.state.graphView.panY = this.panY;
    this.state.graphView.zoom = this.scale;
    if (store) store.scheduleSave("Graph view saved");
  }

  animate() {
    if (!this.running) return;
    this.frame += 1;
    if (this.frame < this.layoutTickLimit) applyForceTick(this.prepared.nodes, this.prepared.links, this.width, this.height);
    this.draw();
    if (this.frame < this.animationFrameLimit) requestAnimationFrame(this.animate);
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#0d1318";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = "rgba(134, 164, 185, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);
    for (const link of this.prepared.links) {
      ctx.beginPath();
      ctx.moveTo(link.sourceNode.x, link.sourceNode.y);
      ctx.lineTo(link.targetNode.x, link.targetNode.y);
      ctx.strokeStyle = "rgba(160, 190, 205, 0.34)";
      ctx.lineWidth = 1.45;
      ctx.stroke();
    }
    for (const node of this.prepared.nodes) {
      const selected = this.state.graphView.selectedNodeId === node.id || this.state.activeNoteId === node.id;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = selected ? "#ff6b4a"
        : node.type === "product-brain-root" ? "#38bdf8"
          : node.type === "product-brain" ? "#2563eb"
        : node.type === "ghost" ? "#b9814f"
          : node.type === "source" ? "#1d9bf0"
            : node.type === "audio-source" ? "#c026d3"
              : node.type === "goal" ? "#8b5cf6"
                : node.type === "finance-account" || node.type === "finance-income" || node.type === "finance-expense" || node.type === "budget" || node.type === "subscription" ? "#16a34a"
                  : node.type === "habit" ? "#14b8a6"
                    : node.type === "claim" || node.type === "question" || node.type === "review" || node.type === "reading" || node.type === "highlight" ? "#4f46e5"
                      : node.type === "saved-search" ? "#0369a1"
                        : node.type === "channel" ? "#0f766e"
                          : node.type === "system" || node.type === "system-record" || node.type === "marketplace-pack" || node.type === "installed-pack" || node.type === "database" || node.type === "database-row" || node.type === "design-profile" ? "#7c3aed"
                            : node.type === "model-profile" || node.type === "screen-session" ? "#0891b2"
                              : node.type === "smart-home-device" || node.type === "smart-home-event" ? "#059669"
                                : node.type === "project" || node.type === "project-item" || node.type === "twin-snapshot" ? "#be123c"
                        : node.type === "transcript-segment" || node.type === "audio-checkpoint" || node.type === "player-note" ? "#db2777"
                        : node.type === "chat-owner" || node.type === "chat-assistant" ? "#0f172a"
                        : node.type === "task" || node.type === "plan" || node.type === "proposal" || node.type === "reminder" ? "#f59e0b"
                          : node.type === "agent" || node.type === "provider-run" || node.type === "flow-run" ? "#64748b"
                            : node.type.endsWith("-done") ? "#64748b"
                              : "#2563eb";
      ctx.fill();
      ctx.lineWidth = selected ? 4 : 2;
      ctx.strokeStyle = selected ? "#fff3ed" : "rgba(240, 247, 255, 0.92)";
      ctx.stroke();
      ctx.fillStyle = selected ? "#fff5f0" : "#d8e7f1";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const label = shorten(node.label, this.width < 430 ? 15 : 22);
      const metrics = ctx.measureText(label);
      const labelX = Math.max(metrics.width / 2 + 6, Math.min(this.width - metrics.width / 2 - 6, node.x));
      const labelY = Math.max(4, Math.min(this.height - 18, node.y + node.radius + 7));
      ctx.fillText(label, labelX, labelY);
    }
    ctx.restore();
    if (this.graph.limited) {
      ctx.save();
      ctx.fillStyle = "rgba(13, 19, 24, 0.82)";
      ctx.fillRect(16, 16, Math.min(430, this.width - 32), 46);
      ctx.fillStyle = "#d8e7f1";
      ctx.font = "13px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("Большое хранилище: canvas " + this.graph.canvasNodeCount + "/" + this.graph.fullNodeCount + " узлов, поиск по полному графу", 28, 39);
      ctx.restore();
    }
  }
}

class ReactiveStore {
  constructor(repo) {
    this.repo = repo;
    this.state = createInitialState();
    this.listeners = [];
    this.saveTimer = 0;
    this.saveState = "idle";
    this.writeQueue = Promise.resolve();
    this.stateRevision = 0;
  }

  async hydrate() {
    this.state = await this.repo.load();
    this.state = await this.repo.save(this.state);
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this.state);
  }

  enqueueWrite(task) {
    this.writeQueue = this.writeQueue.then(task, task);
    return this.writeQueue;
  }

  async persistCurrent(revision, afterSave) {
    return this.enqueueWrite(async () => {
      try {
        this.saveState = "saving";
        updateSaveStatus();
        const saved = await this.repo.save(this.state);
        if (revision === this.stateRevision) {
          this.state = saved;
          this.saveState = "saved";
          if (afterSave) afterSave();
          this.emit();
        } else {
          this.saveState = "dirty";
          updateSaveStatus();
        }
      } catch (error) {
        this.saveState = "error";
        bootError = error;
        render();
        throw error;
      }
    });
  }

  async commit(summary, mutator) {
    clearTimeout(this.saveTimer);
    const next = clone(this.state);
    const previousMessage = next.commandMessage;
    mutator(next);
    recordArchitectureEvent(next, "repository.commit", summary, {
      revision: this.stateRevision + 1,
      activeSurface: next.activeSurface,
      activeArtifactId: next.activeNoteId
    });
    const architectureValidation = validateArchitectureState(next);
    if (!architectureValidation.ok) {
      addAudit(next, "architecture.validation.failed", "Architecture contract failed: " + architectureValidation.problems.join("; "), next.activeNoteId);
    }
    rebuildIndexes(next);
    if (next.commandMessage === previousMessage) next.commandMessage = summary;
    this.state = next;
    this.stateRevision += 1;
    const revision = this.stateRevision;
    this.saveState = "saving";
    this.emit();
    return this.persistCurrent(revision);
  }

  updateEditor(noteId, body) {
    const note = this.state.notes[noteId];
    if (!note || note.deleted) return;
    note.body = body;
    note.updatedAt = now();
    rebuildIndexes(this.state);
    this.stateRevision += 1;
    this.emit();
    this.scheduleSave("Auto-saved " + note.title);
    updateLiveMetrics();
  }

  updateSearch(query) {
    this.state.searchQuery = query;
    this.stateRevision += 1;
    this.emit();
    this.scheduleSave("Search state saved");
  }

  updateCommandPaletteQuery(query) {
    this.state.commandPaletteQuery = query;
    this.stateRevision += 1;
    this.emit();
    this.scheduleSave("Command palette query saved");
  }

  scheduleSave(summary) {
    clearTimeout(this.saveTimer);
    this.stateRevision += 1;
    this.saveState = "dirty";
    updateSaveStatus();
    this.saveTimer = setTimeout(() => {
      addAudit(this.state, "note.autosave", summary, this.state.activeNoteId);
      rebuildIndexes(this.state);
      this.stateRevision += 1;
      this.persistCurrent(this.stateRevision, renderSidePanelsOnly).catch(() => {});
    }, AUTO_SAVE_MS);
  }
}

function scrollChatThreadToLatest() {
  const thread = document.querySelector("[data-testid=\"chat-thread\"], .chat-log");
  if (thread) thread.scrollTop = thread.scrollHeight;
}

function render() {
  if (!store) return;
  if (graphEngine) {
    graphEngine.destroy();
    graphEngine = null;
  }
  const state = store.state;
  const activeNote = getActiveNote(state);
  app.innerHTML = renderNewShell(buildNewShellContext(state, activeNote));
  if (state.commandPaletteOpen) {
    const input = document.getElementById("command-palette-query");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
  mountGraph();
  scrollChatThreadToLatest();
  updateSaveStatus();
}

function scheduleProjectionKey(item) {
  const title = cleanLine(item?.title || item?.summary || item?.text || "").toLowerCase();
  const day = item?.day || item?.targetDate || "";
  const time = item?.startTime || item?.time || "";
  return [title, day, time].join("|");
}

function dedupeScheduleProjection(items) {
  const byKey = new Map();
  for (const item of items || []) {
    const key = scheduleProjectionKey(item);
    if (!key.trim()) continue;
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, item);
      continue;
    }
    const merged = Object.assign({}, previous, item, {
      projectionKinds: Array.from(new Set([previous.kind, item.kind, previous.type, item.type].filter(Boolean)))
    });
    byKey.set(key, merged);
  }
  return Array.from(byKey.values()).sort(sortScheduledItems);
}

function lifeFeedEvents(state) {
  const events = [];
  for (const event of (state.auditLog || []).slice(-40)) {
    events.push({
      id: event.id || "audit-" + events.length,
      kind: "audit",
      channel: "audit",
      title: auditTypeLabel(event.type),
      summary: event.summary || "",
      createdAt: event.createdAt || event.at || ""
    });
  }
  for (const message of visibleChatMessages(state).slice(-30)) {
    events.push({
      id: message.id,
      kind: "chat",
      channel: "chat",
      title: message.role === "assistant" ? "Ответ LifeOS" : "Ввод владельца",
      summary: shorten(message.text || message.content || "", 160),
      createdAt: message.createdAt || ""
    });
  }
  for (const source of Object.values(state.sources || {}).filter((item) => !item.deleted).slice(-20)) {
    events.push({
      id: source.id,
      kind: "source",
      channel: "capture",
      title: source.name || "Source",
      summary: [source.kind, source.status, source.parserStatus].filter(Boolean).join(" / "),
      createdAt: source.updatedAt || source.createdAt || ""
    });
  }
  for (const run of Object.values(state.providerRuns || {}).slice(-20)) {
    events.push({
      id: run.id,
      kind: "provider",
      channel: run.providerId || "provider",
      title: (run.providerId || "provider") + " / " + (run.kind || "run"),
      summary: run.summary || run.status || "",
      createdAt: run.updatedAt || run.createdAt || ""
    });
  }
  for (const install of Object.values(state.installedPacks || {}).filter((item) => !item.deleted).slice(-12)) {
    events.push({
      id: install.id,
      kind: "system",
      channel: "marketplace",
      title: install.title || "Installed pack",
      summary: [install.status, install.installMode, install.vendorCodeExecuted ? "vendor code executed" : "no vendor code"].filter(Boolean).join(" / "),
      createdAt: install.updatedAt || install.createdAt || ""
    });
  }
  for (const event of Object.values(state.smartHomeEvents || {}).filter((item) => !item.deleted).slice(-12)) {
    events.push({
      id: event.id,
      kind: "home",
      channel: "smart-home",
      title: event.title || "Home event",
      summary: event.status || "",
      createdAt: event.updatedAt || event.createdAt || ""
    });
  }
  for (const session of Object.values(state.screenCompanionSessions || {}).filter((item) => !item.deleted).slice(-8)) {
    events.push({
      id: session.id,
      kind: "screen",
      channel: "permission",
      title: session.title || "Screen session",
      summary: session.summary || session.status || "",
      createdAt: session.updatedAt || session.createdAt || ""
    });
  }
  for (const snapshot of Object.values(state.personalTwinSnapshots || {}).filter((item) => !item.deleted).slice(-8)) {
    events.push({
      id: snapshot.id,
      kind: "twin",
      channel: "recovery",
      title: snapshot.title || "Twin snapshot",
      summary: snapshot.summary || snapshot.status || "",
      createdAt: snapshot.updatedAt || snapshot.createdAt || ""
    });
  }
  return events
    .filter((event) => event.createdAt || event.summary || event.title)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 80);
}

function buildNewShellContext(state, activeNote) {
  const graph = mapGraph(state);
  const publicActiveNote = activeNote && activeNote.systemType !== "product_brain" ? activeNote : null;
  const selectedId = state.graphView.selectedNodeId || state.activeNoteId || "";
  const selected = graphNodeObject(state, selectedId);
  const selectedEdgeReasons = selectedId
    ? graph.links
      .filter((link) => link.source === selectedId || link.target === selectedId)
      .map((link) => graphEdgeReasonLabel(link.label))
      .filter(Boolean)
    : [];
  const selectedGraph = selected ? {
    id: selectedId,
    kind: selected.kind,
    title: graphNodeTitle(selected.kind, selected.object, selectedId),
    meta: graphNodeMeta(selected.kind, selected.object),
    workspace: graphNodeWorkspace(selected.kind, selected.object),
    edgeReasons: selectedEdgeReasons,
    record: selected.object,
    receipts: (state.control.receipts || []).filter((receipt) => receipt.objectId === selectedId).slice(-20).reverse()
  } : { edgeReasons: selectedEdgeReasons, receipts: [] };
  const sources = Object.values(state.sources || {}).filter((source) => !source.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const tasks = Object.values(state.tasks || {}).filter((task) => !task.deleted).sort(sortScheduledItems);
  const planBlocks = Object.values(state.planBlocks || {}).filter((block) => !block.deleted).sort(sortScheduledItems);
  const reminders = Object.values(state.reminders || {}).filter((reminder) => !reminder.deleted).sort(sortScheduledItems);
  const habits = Object.values(state.habits || {}).filter((habit) => !habit.deleted).map((habit) => Object.assign({}, habit, {
    checkedToday: Boolean(habit.checkins && habit.checkins[todayKey()])
  }));
  const goals = Object.values(state.goals || {}).filter((goal) => !goal.deleted);
  const scheduleItems = dedupeScheduleProjection(tasks.concat(planBlocks, reminders.map((reminder) => Object.assign({}, reminder, {
    startTime: reminder.time,
    kind: "reminder"
  }))));
  const providers = Object.entries(state.providers || {}).map(([key, provider]) => ({ key, provider }));
  if (!providers.some((row) => row.key === "ollama")) {
    providers.unshift({
      key: "ollama",
      provider: {
        label: "Ollama",
        status: state.ollama.status,
        requiredAction: "Локальный чат работает без модели. Для AI-предложений запусти Ollama и нажми проверить."
      }
    });
  }
  return {
    activeSurface: state.activeSurface || "inbox",
    activeNote: publicActiveNote,
    answer: buildHumanCaptureAnswer(state),
    auditLog: state.auditLog || [],
    audioSources: sources.filter((source) => source.kind === "audio"),
    bookSources: sources.filter(isBookSource),
    budgets: Object.values(state.budgets || {}).filter((item) => !item.deleted),
    captureDraft: state.captureDraft || "",
    chatMessages: visibleChatMessages(state),
    claims: Object.values(state.claims || {}).filter((item) => !item.deleted),
    commandMessage: state.commandMessage || "",
    commandPaletteHtml: renderCommandPalette(state),
    control: state.control || {},
    channels: Object.values(state.channels || {}).filter((item) => !item.deleted),
    customDatabases: Object.values(state.customDatabases || {}).filter((item) => !item.deleted),
    databaseRows: Object.values(state.databaseRows || {}).filter((item) => !item.deleted),
    designProfiles: Object.values(state.designProfiles || {}).filter((item) => !item.deleted),
    designStudio: state.designStudio || {},
    environment: state.environment || {},
    financeAccounts: Object.values(state.financeAccounts || {}).filter((item) => !item.deleted),
    financeSummary: financeSummary(state),
    flowRuns: Object.values(state.flowRuns || {}).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
    agentRuns: Object.values(state.agentRuns || {}).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
    feedEvents: lifeFeedEvents(state),
    goals,
    graph,
    graphFilters: Object.assign({}, state.graphFilters || {}),
    graphMode: state.graphView.mode || "global",
    graphSearch: state.graphView.searchQuery || "",
    habits,
    highlights: Object.values(state.highlights || {}).filter((item) => !item.deleted),
    latestSource: humanVisibleSource(state) || latestSource(state),
    lifeDomains: lifeDomainStats(state),
    notes: Object.values(state.notes || {}).filter((note) => !note.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    deletedNotes: Object.values(state.notes || {}).filter((note) => note.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    ollama: state.ollama || {},
    installedPacks: Object.values(state.installedPacks || {}).filter((item) => !item.deleted),
    marketplacePacks: Object.values(state.marketplacePacks || {}).filter((item) => !item.deleted),
    modelProfiles: Object.values(state.modelProfiles || {}).filter((item) => !item.deleted),
    personalTwinSnapshots: Object.values(state.personalTwinSnapshots || {}).filter((item) => !item.deleted),
    planBlocks,
    projectItems: Object.values(state.projectItems || {}).filter((item) => !item.deleted),
    projects: Object.values(state.projects || {}).filter((item) => !item.deleted),
    questions: Object.values(state.questions || {}).filter((item) => !item.deleted),
    reviewItems: Object.values(state.reviewItems || {}).filter((item) => !item.deleted),
    systemRecordSchedule: systemRecordDateEntries(state),
    providers,
    providerRuns: Object.values(state.providerRuns || {}).sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")),
    readingItems: Object.values(state.readingItems || {}).filter((item) => !item.deleted),
    reminders,
    receiptSources: sources.filter((source) => source.kind === "image").slice(0, 6),
    savedSearches: savedSearchList(state),
    scheduleItems,
    searchQuery: state.searchQuery || "",
    selectedGraph,
    screenCompanionSessions: Object.values(state.screenCompanionSessions || {}).filter((item) => !item.deleted),
    smartHomeDevices: Object.values(state.smartHomeDevices || {}).filter((item) => !item.deleted),
    smartHomeEvents: Object.values(state.smartHomeEvents || {}).filter((item) => !item.deleted),
    sources,
    subscriptions: Object.values(state.subscriptions || {}).filter((item) => !item.deleted && item.status !== "archived"),
    systemDefinitions: Object.values(state.systemDefinitions || {}).filter((item) => !item.deleted),
    systemRecords: Object.values(state.systemRecords || {}).filter((item) => !item.deleted),
    tasks,
    transcriptSegments: Object.values(state.transcriptSegments || {}).filter((item) => !item.deleted),
    todayKey: todayKey(),
    tomorrowKey: dateKeyFromOffset(1),
    transactions: Object.values(state.financeTransactions || {}).filter((item) => !item.deleted).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    accounts: Object.values(state.financeAccounts || {}).filter((item) => !item.deleted),
    todaySummary: ownerTodaySummary(state)
  };
}

function renderTopbar(state, activeNote) {
  const noteCount = Object.values(state.notes).filter((note) => !note.deleted).length;
  const sourceCount = Object.values(state.sources || {}).filter((source) => !source.deleted).length;
  const openTaskCount = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done").length;
  const focusLabel = activeNote && activeNote.systemType === "product_brain" ? "новый ввод" : activeNote ? shorten(activeNote.title, 42) : "";
  const homeActions = state.activeSurface === "inbox";
  const topActionButtons = homeActions ? [
    "<button data-action=\"set-surface\" data-id=\"capture\" data-testid=\"top-capture\">Очередь</button>",
    "<button data-action=\"set-surface\" data-id=\"control\" data-testid=\"top-control\">Контроль</button>"
  ].join("") : [
    "<button data-action=\"new-note\" class=\"primary\" data-testid=\"new-note\">Заметка</button>",
    "<button data-action=\"new-folder\" data-testid=\"new-folder\">Папка</button>",
    "<button data-action=\"import-file\" data-testid=\"import-file\">Файл</button>",
    "<button data-action=\"import-audio\" data-testid=\"import-audio\">Аудио</button>",
    "<button data-action=\"export-vault\" data-testid=\"export-vault\">Экспорт</button>"
  ].join("");
  return [
    "<header class=\"topbar surface-" + escapeHtml(state.activeSurface) + "\">",
    "<div class=\"brand\"><div class=\"mark\"></div><div><h1>LifeOS</h1><span>Локальная ОС для дня, знаний и контроля</span></div></div>",
    "<div class=\"global-search\">",
    "<label for=\"global-search\">Найти</label>",
    "<input id=\"global-search\" data-testid=\"global-search\" value=\"" + escapeHtml(state.searchQuery) + "\" autocomplete=\"off\" aria-label=\"Search notes\">",
    "</div>",
    "<div class=\"top-actions\">",
    topActionButtons,
    "<button data-action=\"open-command-palette\" data-testid=\"open-command-palette\" title=\"Ctrl+K\">Команды</button>",
    "<input id=\"file-import\" data-testid=\"file-import\" type=\"file\" multiple hidden>",
    "<input id=\"audio-import\" data-testid=\"audio-import\" type=\"file\" accept=\"audio/*\" multiple hidden>",
    "<input id=\"backup-import\" data-testid=\"backup-import\" type=\"file\" accept=\"application/json,.json\" hidden>",
    "</div>",
    "<div class=\"vault-status\">",
    "<span id=\"save-status\" class=\"status-pill\" role=\"status\" aria-live=\"polite\">готово</span>",
    "<span>База: " + noteCount + "</span>",
    "<span>Входы: " + sourceCount + "</span>",
    "<span>Открыто: " + openTaskCount + "</span>",
    "<span>локально</span>",
    focusLabel ? "<span data-testid=\"active-note-id\">В фокусе: " + escapeHtml(focusLabel) + "</span>" : "<span>Фокус свободен</span>",
    "</div>",
    state.activeSurface === "inbox" ? renderHomeQuickRibbon(state) : renderAppRibbon(state),
    "</header>"
  ].join("");
}

function renderCommandPalette(state) {
  if (!state.commandPaletteOpen) return "";
  const query = cleanLine(state.commandPaletteQuery || state.searchQuery || "");
  const normalizedQuery = normalizeTitle(query);
  const items = commandPaletteItems(state)
    .filter((item) => {
      if (!normalizedQuery) return true;
      return normalizeTitle([item.title, item.hint, item.group, item.shortcut].join(" ")).includes(normalizedQuery);
    })
    .slice(0, 12);
  const saved = savedSearchList(state).slice(0, 8);
  return [
    "<div class=\"command-palette-overlay\" data-testid=\"command-palette\">",
    "<div class=\"command-palette-dialog\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Командная палитра LifeOS\">",
    "<div class=\"command-palette-head\">",
    "<div><span>Artifact OS</span><h2>Команды</h2><p>Один быстрый вход: рабочие места, текущий поиск, связи и безопасные действия.</p></div>",
    "<button data-action=\"close-command-palette\" data-testid=\"close-command-palette\" aria-label=\"Закрыть командную палитру\">Закрыть</button>",
    "</div>",
    "<label class=\"command-palette-search\"><span>Найти команду или поиск: финансы, граф, задача, чтение</span><input id=\"command-palette-query\" data-testid=\"command-palette-query\" autocomplete=\"off\" value=\"" + escapeHtml(query) + "\"></label>",
    "<div class=\"command-palette-body\">",
    "<section>",
    "<div class=\"command-palette-section-title\">Команды</div>",
    items.length ? items.map((item) => [
      "<button class=\"command-palette-row\" data-action=\"run-command\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"command-palette-row\">",
      "<span><strong>" + escapeHtml(item.title) + "</strong><em>" + escapeHtml(item.group + " · " + item.hint) + "</em></span>",
      "<kbd>" + escapeHtml(item.shortcut || "Enter") + "</kbd>",
      "</button>"
    ].join("")).join("") : "<div class=\"empty compact\">Нет команды под этот запрос. Поиск всё равно можно сохранить как рабочий фильтр.</div>",
    "</section>",
    "<section>",
    "<div class=\"command-palette-section-title\">Сохранённые поиски</div>",
    "<button class=\"command-palette-row save-search\" data-action=\"save-current-search\" data-testid=\"save-current-search\">",
    "<span><strong>Сохранить текущий поиск</strong><em>" + escapeHtml(query || "Введите запрос в палитре или глобальном поиске") + "</em></span><kbd>S S</kbd>",
    "</button>",
    saved.length ? saved.map((search) => [
      "<div class=\"saved-search-row\" data-testid=\"saved-search-row\">",
      "<button data-action=\"run-saved-search\" data-id=\"" + escapeHtml(search.id) + "\"><strong>" + escapeHtml(search.title) + "</strong><span>" + escapeHtml(search.query + " · " + search.resultCount + " совпадений") + "</span></button>",
      "<button class=\"mini-button danger\" data-action=\"delete-saved-search\" data-id=\"" + escapeHtml(search.id) + "\" aria-label=\"Удалить сохраненный поиск\">Удалить</button>",
      "</div>"
    ].join("")).join("") : "<div class=\"empty compact\">Сохранённые поиски появятся здесь и в графе как отдельные узлы.</div>",
    "</section>",
    "</div>",
    "<div class=\"command-palette-foot\"><span>Ctrl/Cmd+K открыть</span><span>Esc закрыть</span><span>/ фокус в поиск</span><span>Все изменения пишутся в Контроль</span></div>",
    "</div>",
    "</div>"
  ].join("");
}

function renderHomeQuickRibbon(state) {
  const humanSurfaces = primaryOwnerSurfaces().map((surface) => [surface[0], surface[1]]);
  const extraSurfaces = secondaryOwnerSurfaces();
  return [
    "<nav class=\"app-ribbon home-quick-ribbon human-app-ribbon\" data-testid=\"app-ribbon\">",
    humanSurfaces.map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"surface-button" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"surface-" + surface[0] + "\">" + escapeHtml(surface[1]) + "</button>";
    }).join(""),
    "<details class=\"surface-more\"><summary>Ещё</summary><div>" + extraSurfaces.map((surface) => "<button class=\"surface-button\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"surface-" + surface[0] + "\">" + escapeHtml(surface[1]) + "</button>").join("") + "</div></details>",
    "</nav>"
  ].join("");
  const surfaces = [
    ["inbox", "Дом"],
    ["capture", "Вход"],
    ["today", "Сегодня"],
    ["calendar", "Календарь"],
    ["finance", "Финансы"],
    ["habits", "Привычки"],
    ["goals", "Цели"],
    ["graph", "Связи"]
  ];
  return [
    "<nav class=\"app-ribbon home-quick-ribbon\" data-testid=\"app-ribbon\">",
    surfaces.map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"surface-button" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"surface-" + surface[0] + "\">" + escapeHtml(surface[1]) + "</button>";
    }).join(""),
    "</nav>"
  ].join("");
}

function renderAppRibbon(state) {
  return renderOwnerAppRibbon(state);
  const surfaces = [
    ["inbox", "Вход"],
    ["library", "Библиотека"],
    ["today", "Сегодня"],
    ["chat", "Чат"],
    ["agents", "Агенты"],
    ["graph", "Граф"],
    ["player", "Плеер"],
    ["flows", "Автоматизация"],
    ["mail", "Почта"],
    ["control", "Контроль"]
  ];
  return [
    "<nav class=\"app-ribbon\" data-testid=\"app-ribbon\">",
    surfaces.map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"surface-button" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"surface-" + surface[0] + "\">" + surface[1] + "</button>";
    }).join(""),
    "</nav>"
  ].join("");
}

function renderOwnerAppRibbon(state) {
  const humanSurfaces = primaryOwnerSurfaces().map((surface) => [surface[0], surface[1]]);
  const extraSurfaces = secondaryOwnerSurfaces();
  return [
    "<nav class=\"app-ribbon human-app-ribbon\" data-testid=\"app-ribbon\">",
    humanSurfaces.map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"surface-button" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"surface-" + surface[0] + "\">" + escapeHtml(surface[1]) + "</button>";
    }).join(""),
    "<details class=\"surface-more\"><summary>Ещё</summary><div>" + extraSurfaces.map((surface) => "<button class=\"surface-button\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"surface-" + surface[0] + "\">" + escapeHtml(surface[1]) + "</button>").join("") + "</div></details>",
    "</nav>"
  ].join("");
  const surfaces = [
    ["inbox", "Дом"],
    ["capture", "Вход"],
    ["library", "Библиотека"],
    ["reader", "Reader"],
    ["today", "Сегодня"],
    ["calendar", "Календарь"],
    ["finance", "Финансы"],
    ["habits", "Привычки"],
    ["goals", "Цели"],
    ["chat", "Чат"],
    ["agents", "Агенты"],
    ["flows", "Flow"],
    ["player", "Плеер"],
    ["graph", "Граф"],
    ["mail", "Почта"],
    ["control", "Контроль"],
    ["providers", "Провайдеры"]
  ];
  return [
    "<nav class=\"app-ribbon\" data-testid=\"app-ribbon\">",
    surfaces.map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"surface-button" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"surface-" + surface[0] + "\">" + surface[1] + "</button>";
    }).join(""),
    "</nav>"
  ].join("");
}

function renderSidebar(state) {
  if (state.activeSurface === "inbox") return renderInboxRail(state);
  if (state.activeSurface === "capture") return renderCaptureRail(state);
  const tree = flattenFolderTree(buildFolderTree(state));
  const notes = searchNotes(state, state.searchQuery);
  return [
    "<aside class=\"sidebar\">",
    "<section class=\"rail-section\">",
    "<div class=\"section-title\">Folders</div>",
    "<div class=\"folder-tree\" data-testid=\"folder-tree\">",
    tree.map((folder) => renderFolderRow(state, folder)).join(""),
    "</div>",
    "</section>",
    "<section class=\"rail-section notes-section\">",
    "<div class=\"section-title\">Notes</div>",
    "<div class=\"note-list\" data-testid=\"note-list\">",
    notes.length ? notes.map((note) => renderNoteRow(state, note)).join("") : "<div class=\"empty compact\">No notes match the query.</div>",
    "</div>",
    "</section>",
    "</aside>"
  ].join("");
}

function renderInboxRail(state) {
  return renderHumanNavRail(state);
  const railSource = latestSource(state);
  const railSurfaces = [
    ["inbox", "Дом", "день"],
    ["capture", "Вход", "разбор"],
    ["today", "Сегодня", "день"],
    ["calendar", "Календарь", "неделя"],
    ["finance", "Финансы", "бюджет"],
    ["habits", "Привычки", "ритмы"],
    ["goals", "Цели", "прогресс"],
    ["library", "Библиотека", "знания"],
    ["reader", "Reader", "книги"],
    ["player", "Плеер", "аудио"],
    ["chat", "Чат", "локально"],
    ["agents", "Агенты", "проверка"],
    ["flows", "Flow", "авто"],
    ["graph", "Граф", "связи"],
    ["control", "Контроль", "аудит"],
    ["providers", "Провайдеры", "статус"]
  ];
  const railRecentSources = Object.values(state.sources || {})
    .filter((item) => !item.deleted && item.name !== "daily-capture.md")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const today = ownerTodaySummary(state);
  const money = financeSummary(state);
  return [
    "<aside class=\"sidebar inbox-rail home-workspace-rail\" data-testid=\"home-workspace-rail\">",
    "<section class=\"rail-section rail-primary-nav\">",
    "<div class=\"section-title\">LifeOS</div>",
    "<div class=\"rail-flow\">",
    railSurfaces.map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"flow-step" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"rail-surface-" + surface[0] + "\"><strong>" + escapeHtml(surface[1]) + "</strong><span>" + escapeHtml(surface[2]) + "</span></button>";
    }).join(""),
    "</div>",
    "</section>",
    "<section class=\"rail-section rail-now\">",
    "<div class=\"section-title\">Сейчас</div>",
    railSource && railSource.name !== "daily-capture.md" ? [
      "<button class=\"source-name rail-artifact\" data-action=\"open-source-note\" data-id=\"" + escapeHtml(railSource.id) + "\">" + escapeHtml(railSource.name) + "</button>",
      "<div class=\"rail-meta\">" + escapeHtml([railSource.kind, railSource.status, railSource.parserStatus].filter(Boolean).join(" / ")) + "</div>"
    ].join("") : "<div class=\"empty compact\">Сначала кинь данные в большое поле. Разбор появится рядом с действиями.</div>",
    "</section>",
    "<section class=\"rail-section rail-quick-state\">",
    "<div class=\"section-title\">Коротко</div>",
    "<div class=\"rail-stats compact-stats\">",
    "<div><strong>" + today.todayCount + "</strong><span>сегодня</span></div>",
    "<div><strong>" + today.tomorrowCount + "</strong><span>завтра</span></div>",
    "<div><strong>" + Math.round(money.todaySpend) + "</strong><span>₽ сегодня</span></div>",
    "<div><strong>" + today.habitDone + "/" + today.habitTotal + "</strong><span>привычки</span></div>",
    "</div>",
    "</section>",
    "<section class=\"rail-section rail-recent-sources\">",
    "<div class=\"section-title\">Последние входы</div>",
    railRecentSources.length ? railRecentSources.map((item) => {
      return "<button class=\"rail-source\" data-action=\"open-source-note\" data-id=\"" + escapeHtml(item.id) + "\"><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.kind + " / " + item.status) + "</span></button>";
    }).join("") : "<div class=\"empty compact\">Источники появятся после первого ввода или файла.</div>",
    "</section>",
    "</aside>"
  ].join("");
  const source = latestSource(state);
  const graph = mapGraph(state);
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length;
  const openTasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done").length;
  const recentSources = Object.values(state.sources || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const recentNotes = Object.values(state.notes || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const steps = [
    ["inbox", "1", "Вход"],
    ["library", "2", "База"],
    ["today", "3", "План"],
    ["chat", "4", "Чат"],
    ["agents", "5", "Агент"],
    ["graph", "6", "Граф"],
    ["control", "7", "Контроль"]
  ];
  return [
    "<aside class=\"sidebar inbox-rail\" data-testid=\"inbox-rail\">",
    "<section class=\"rail-section\">",
    "<div class=\"section-title\">Поток артефакта</div>",
    "<div class=\"rail-flow\">",
    steps.map((step) => "<button class=\"flow-step\" data-action=\"set-surface\" data-id=\"" + step[0] + "\"><strong>" + step[1] + "</strong><span>" + step[2] + "</span></button>").join(""),
    "</div>",
    "</section>",
    "<section class=\"rail-section rail-now\">",
    "<div class=\"section-title\">Сейчас в работе</div>",
    source ? [
      "<button class=\"source-name rail-artifact\" data-action=\"open-source-note\" data-id=\"" + escapeHtml(source.id) + "\">" + escapeHtml(source.name) + "</button>",
      "<div class=\"rail-meta\">" + escapeHtml([source.kind, source.status, source.parserStatus].filter(Boolean).join(" / ")) + "</div>"
    ].join("") : "<div class=\"empty compact\">Брось текст, файл, книгу или аудио в центр экрана.</div>",
    "</section>",
    "<section class=\"rail-section\">",
    "<div class=\"section-title\">Живые связи</div>",
    "<div class=\"rail-stats\">",
    "<div><strong>" + graph.nodes.length + "</strong><span>узлов</span></div>",
    "<div><strong>" + graph.links.length + "</strong><span>связей</span></div>",
    "<div><strong>" + openTasks + "</strong><span>задач</span></div>",
    "<div><strong>" + openProposals + "</strong><span>действий</span></div>",
    "</div>",
    "</section>",
    "<section class=\"rail-section\">",
    "<div class=\"section-title\">Последние источники</div>",
    recentSources.length ? recentSources.map((item) => {
      return "<button class=\"rail-source\" data-action=\"open-source-note\" data-id=\"" + escapeHtml(item.id) + "\"><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.kind + " / " + item.status) + "</span></button>";
    }).join("") : "<div class=\"empty compact\">Источники появятся после импорта.</div>",
    "</section>",
    "<section class=\"rail-section\">",
    "<div class=\"section-title\">Быстрый доступ</div>",
    recentNotes.map((item) => "<button class=\"note-row\" data-action=\"open-note\" data-id=\"" + escapeHtml(item.id) + "\"><span class=\"note-title\">" + escapeHtml(item.title) + "</span><span class=\"note-meta\">" + item.links.length + " links</span></button>").join(""),
    "</section>",
    "</aside>"
  ].join("");
}

function renderCaptureRail(state) {
  const sources = Object.values(state.sources || {})
    .filter((item) => !item.deleted && item.name !== "daily-capture.md")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open");
  const readySources = sources.filter((source) => source.status === "captured" || source.status === "text-ready" || source.status === "audio-stored" || source.parserStatus);
  return [
    "<aside class=\"sidebar inbox-rail capture-rail\" data-testid=\"capture-rail\">",
    "<section class=\"rail-section rail-primary-nav\">",
    "<div class=\"section-title\">Вечерний разбор</div>",
    "<div class=\"rail-stats compact-stats\">",
    "<div><strong>" + sources.length + "</strong><span>источников</span></div>",
    "<div><strong>" + openProposals.length + "</strong><span>предложений</span></div>",
    "<div><strong>" + readySources.length + "</strong><span>ждут решения</span></div>",
    "<div><strong>" + state.auditLog.length + "</strong><span>событий</span></div>",
    "</div>",
    "</section>",
    "<section class=\"rail-section\">",
    "<div class=\"section-title\">Маршрут</div>",
    "<div class=\"rail-flow\">",
    [["inbox", "Дом", "итог"], ["capture", "Вход", "очередь"], ["graph", "Граф", "связи"], ["control", "Контроль", "аудит"]].map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"flow-step" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"surface-" + surface[0] + "\"><strong>" + escapeHtml(surface[1]) + "</strong><span>" + escapeHtml(surface[2]) + "</span></button>";
    }).join(""),
    "</div>",
    "</section>",
    "<section class=\"rail-section rail-recent-sources\">",
    "<div class=\"section-title\">Последние источники</div>",
    sources.slice(0, 6).map((item) => "<button class=\"rail-source\" data-action=\"open-source-note\" data-id=\"" + escapeHtml(item.id) + "\"><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml([item.kind, item.status, item.parserStatus].filter(Boolean).join(" / ")) + "</span></button>").join("") || "<div class=\"empty compact\">Очередь появится после текста, файла, скрина, аудио или книги.</div>",
    "</section>",
    "</aside>"
  ].join("");
}

function renderFolderRow(state, folder) {
  const active = state.activeFolderId === folder.id ? " active" : "";
  return [
    "<button class=\"folder-row" + active + "\" data-action=\"select-folder\" data-id=\"" + escapeHtml(folder.id) + "\" style=\"--depth:" + folder.depth + "\">",
    "<span>" + escapeHtml(folder.name) + "</span>",
    "<strong>" + folder.noteCount + "</strong>",
    "</button>"
  ].join("");
}

function renderNoteRow(state, note) {
  const active = state.activeNoteId === note.id ? " active" : "";
  const folder = state.folders[note.folderId];
  return [
    "<button class=\"note-row" + active + "\" data-action=\"open-note\" data-id=\"" + escapeHtml(note.id) + "\" data-testid=\"note-row\">",
    "<span class=\"note-title\">" + escapeHtml(note.title) + "</span>",
    "<span class=\"note-meta\">" + escapeHtml(folder ? folder.name : "Vault") + " · " + note.links.length + " links</span>",
    "</button>"
  ].join("");
}

function latestSource(state) {
  return Object.values(state.sources || {}).filter((source) => !source.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
}

function latestAgentRun(state) {
  return Object.values(state.agentRuns || {}).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
}

function latestChatMessage(state) {
  return Object.values(state.chatMessages || {}).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}

function renderArtifactAnalysisPanelV2(state, source) {
  const analysis = source ? normalizeArtifactAnalysis(source.analysis, source) : null;
  const classes = analysis ? analysis.detectedClasses || [] : [];
  const drafts = analysis ? analysis.drafts || [] : [];
  const rows = analysis ? [
    ["Тип", analysis.type],
    ["Классы", classes.length],
    ["Задачи / drafts", drafts.length],
    ["Confidence", Math.round((analysis.confidence || 0) * 100) + "%"],
    ["Даты", analysis.dateHints.length],
    ["Деньги", analysis.entities && analysis.entities.money ? analysis.entities.money.length : 0]
  ] : [
    ["Тип", "ждет вход"],
    ["Классы", 0],
    ["Задачи / drafts", 0],
    ["Confidence", "0%"],
    ["Даты", 0],
    ["Деньги", 0]
  ];
  return [
    "<section class=\"analysis-panel\" data-testid=\"analysis-panel\">",
    "<div class=\"analysis-copy\">",
    "<div class=\"section-title\">Что LifeOS понял</div>",
    "<strong>" + escapeHtml(analysis ? analysis.summary : "Пока ничего не разобрано. Вставь текст или файл в главный ввод.") + "</strong>",
    analysis ? "<p>" + escapeHtml(analysis.reason) + "</p>" : "",
    "</div>",
    "<div class=\"analysis-stats\">",
    rows.map((row) => "<div><span>" + escapeHtml(row[0]) + "</span><strong>" + escapeHtml(row[1]) + "</strong></div>").join(""),
    "</div>",
    analysis ? "<div class=\"analysis-tags\">" + classes.slice(0, 12).map((item) => "<span>" + escapeHtml(item) + "</span>").join("") + "</div>" : "",
    drafts.length ? "<div class=\"analysis-tags destinations\">" + uniqueCleanItems(drafts.map((item) => item.destination), 8).map((item) => "<span>" + escapeHtml(item) + "</span>").join("") + "</div>" : "",
    "</section>"
  ].join("");
}

function renderArtifactAnalysisPanel(state, source) {
  return renderArtifactAnalysisPanelV2(state, source);
  const analysis = source ? normalizeArtifactAnalysis(source.analysis, source) : null;
  const rows = analysis ? [
    ["Тип", analysis.type],
    ["Слов", analysis.wordCount],
    ["Задач", analysis.actionLines.length],
    ["Дат", analysis.dateHints.length],
    ["Ссылок", analysis.urls.length + analysis.wikiLinks.length],
    ["Контактов", analysis.emails.length]
  ] : [
    ["Тип", "ждет данные"],
    ["Слов", 0],
    ["Задач", 0],
    ["Дат", 0],
    ["Ссылок", 0],
    ["Контактов", 0]
  ];
  return [
    "<section class=\"analysis-panel\" data-testid=\"analysis-panel\">",
    "<div class=\"analysis-copy\">",
    "<div class=\"section-title\">Разбор артефакта</div>",
    "<strong>" + escapeHtml(analysis ? analysis.summary : "Кинь любой материал, и здесь появится локальный разбор без внешних сервисов.") + "</strong>",
    "</div>",
    "<div class=\"analysis-stats\">",
    rows.map((row) => "<div><span>" + escapeHtml(row[0]) + "</span><strong>" + escapeHtml(row[1]) + "</strong></div>").join(""),
    "</div>",
    analysis ? "<div class=\"analysis-lists\">" + renderAnalysisList("Найденные действия", analysis.actionLines) + renderAnalysisList("Даты", analysis.dateHints) + renderAnalysisList("Wiki/главы", analysis.wikiLinks.concat(analysis.headings).slice(0, 5)) + "</div>" : "",
    "</section>"
  ].join("");
}

function renderReceiptPanel(state) {
  const receipts = state.auditLog.slice(-6).reverse();
  return [
    "<section class=\"receipt-panel\" data-testid=\"receipt-panel\">",
    "<div class=\"section-title\">Receipt / audit</div>",
    receipts.length ? receipts.map((row) => {
      return [
        "<div class=\"receipt-row\">",
        "<strong>" + escapeHtml(row.type) + "</strong>",
        "<span>" + escapeHtml(shorten(row.summary, 88)) + "</span>",
        "<em>" + escapeHtml(row.createdAt ? row.createdAt.slice(11, 19) : "") + "</em>",
        "</div>"
      ].join("");
    }).join("") : "<div class=\"empty compact\">Действия появятся после первого изменения.</div>",
    "</section>"
  ].join("");
}

function renderAnalysisList(title, items) {
  const values = uniqueCleanItems(items, 5);
  if (!values.length) return "";
  return [
    "<div class=\"analysis-list\">",
    "<span>" + escapeHtml(title) + "</span>",
    values.map((item) => "<strong>" + escapeHtml(shorten(item, 48)) + "</strong>").join(""),
    "</div>"
  ].join("");
}

function renderConnectedAppNetwork(state, source) {
  const hasSource = Boolean(source);
  const hasNote = Boolean(source && source.noteId);
  const analysis = source ? normalizeArtifactAnalysis(source.analysis, source) : null;
  const audioCount = Object.values(state.sources || {}).filter((item) => !item.deleted && item.kind === "audio").length;
  const runCount = Object.values(state.agentRuns || {}).length;
  const proposalCount = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length;
  const taskCount = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done").length;
  const graph = mapGraph(state);
  const apps = [
    ["Notion", "Library", hasNote ? "заметка есть" : "ждет артефакт", "library", "set-surface", "app-library"],
    ["Obsidian", "Graph", graph.nodes.length + " узлов / " + graph.links.length + " связей", "graph", "set-surface", "app-graph"],
    ["Calendar", "Today", taskCount + " задач", "today", "set-surface", "app-calendar"],
    ["Chat", "Context", Object.values(state.chatMessages || {}).length + " сообщений", "chat", "set-surface", "app-chat"],
    ["Agents", "Multiagent", runCount ? runCount + " запусков" : "готов", "agents", "set-surface", "app-agents"],
    ["n8n", "Flow", proposalCount + " действий", "flows", "set-surface", "app-flow"],
    ["Player", "Audio", audioCount ? audioCount + " аудио" : "ждет аудио", "player", "set-surface", "app-player"],
    ["Book", "Reader", analysis && analysis.type === "книга" ? "книга активна" : "готов к книге", "library", "set-surface", "app-book"],
    ["Gmail", "Mail", state.providers.mail.status === "not-connected" ? "нужно подключение" : state.providers.mail.status, "mail", "set-surface", "app-mail"],
    ["Control", "Data", state.environment.persisted ? "persistent" : "local", "control", "set-surface", "app-control"]
  ];
  return [
    "<section class=\"app-network\" data-testid=\"app-network\">",
    "<div class=\"section-title\">Связанные приложения одного артефакта</div>",
    "<div class=\"app-network-grid\">",
    apps.map((item) => {
      const gated = item[0] === "Gmail" && state.providers.mail.status === "not-connected";
      const action = gated ? "prepare-mail" : item[4];
      const id = gated ? "mail" : item[3];
      return [
        "<button class=\"app-tile" + (gated ? " gated" : hasSource ? " live" : "") + "\" data-action=\"" + action + "\" data-id=\"" + escapeHtml(id) + "\" data-testid=\"" + escapeHtml(item[5]) + "\">",
        "<span>" + escapeHtml(item[0]) + "</span>",
        "<strong>" + escapeHtml(item[1]) + "</strong>",
        "<em>" + escapeHtml(item[2]) + "</em>",
        "</button>"
      ].join("");
    }).join(""),
    "</div>",
    "</section>"
  ].join("");
}

function renderCommandCenter(state, note) {
  const source = latestSource(state);
  const graph = mapGraph(state);
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length;
  const openTasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done").length;
  const run = latestAgentRun(state);
  const message = latestChatMessage(state);
  const sourceMeta = source ? [source.kind, source.status, source.parserStatus, formatBytes(source.size)].filter(Boolean).join(" / ") : "";
  return [
    "<section class=\"command-hero\" data-testid=\"command-center\">",
    "<div class=\"command-drop\" data-testid=\"mega-dropzone\">",
    "<div class=\"command-label\">СЮДА</div>",
    "<div class=\"command-title\">Кинь любой текст, файл, книгу, аудио, письмо или идею</div>",
    "<div class=\"command-subtitle\">LifeOS сохранит источник, сделает артефакт в библиотеке, построит связи и предложит следующие действия.</div>",
    "<div class=\"intake-hint\">Вставь текст в поле ниже или перетащи файл на страницу. Потом нажми Разобрать.</div>",
    "<textarea id=\"capture-input\" data-testid=\"capture-input\" spellcheck=\"true\" aria-label=\"Universal artifact intake\">" + escapeHtml(state.captureDraft || "") + "</textarea>",
    "<div class=\"command-actions\">",
    "<button data-action=\"capture-text\" class=\"primary\" data-testid=\"capture-text\">Разобрать</button>",
    "<button data-action=\"import-file\" data-testid=\"capture-import\">Файл</button>",
    "<button data-action=\"import-audio\" data-testid=\"capture-audio\">Аудио</button>",
    "<button data-action=\"auto-build-active\" data-testid=\"auto-build-active\">Собрать всё</button>",
    "<button data-action=\"run-flow\" data-testid=\"run-flow\">Flow</button>",
    "<button data-action=\"run-agent-active\" data-testid=\"run-agent-active\">Agent</button>",
    "</div>",
    "</div>",
    "<div class=\"artifact-now\" data-testid=\"active-artifact-card\">",
    "<div class=\"section-title\">Активный артефакт</div>",
    source ? "<strong>" + escapeHtml(source.name) + "</strong><span>" + escapeHtml(sourceMeta) + "</span>" : "<strong>Пока пусто</strong><span>Брось данные в большое поле, кнопку Файл или Аудио</span>",
    "<div class=\"artifact-facts\">",
    "<div><span>Библиотека</span><strong>" + (source && source.noteId ? "есть" : "ждет") + "</strong></div>",
    "<div><span>Граф</span><strong>" + graph.nodes.length + " / " + graph.links.length + "</strong></div>",
    "<div><span>Действия</span><strong>" + openProposals + "</strong></div>",
    "<div><span>План</span><strong>" + openTasks + "</strong></div>",
    "</div>",
    "<div class=\"artifact-route\">",
    "<button data-action=\"set-surface\" data-id=\"library\" data-testid=\"route-library\">База</button>",
    "<button data-action=\"set-surface\" data-id=\"today\" data-testid=\"route-today\">Сегодня</button>",
    "<button data-action=\"set-surface\" data-id=\"chat\" data-testid=\"route-chat\">Чат</button>",
    "<button data-action=\"set-surface\" data-id=\"agents\" data-testid=\"route-agents\">Агенты</button>",
    "<button data-action=\"set-surface\" data-id=\"graph\" data-testid=\"route-graph\">Граф</button>",
    "<button data-action=\"set-surface\" data-id=\"control\" data-testid=\"route-control\">Контроль</button>",
    "</div>",
    "</div>",
    "</section>",
    renderArtifactAnalysisPanel(state, source),
    renderArtifactPipeline(state),
    renderConnectedAppNetwork(state, source),
    renderReceiptPanel(state),
    "<section class=\"command-grid\">",
    renderCommandCard("library", "Библиотека", source ? source.name : "0 источников", "Заметка, книга, файл и backlinks", "Открыть", "command-library"),
    renderCommandCard("today", "Сегодня", openTasks + " задач", "Календарь, цели и дневной план", "План", "command-today"),
    renderCommandCard("chat", "Чат", message ? shorten(message.text, 52) : "локальный контекст", "Разговор привязан к артефакту", "Чат", "command-chat"),
    renderCommandCard("agents", "Агенты", run ? run.status : "готовы", "Организатор и flow без внешних ключей", "Агенты", "command-agents"),
    renderCommandCard("graph", "Граф", graph.nodes.length + " узлов", "Карта связей как рабочий экран", "Граф", "command-graph"),
    renderCommandCard("control", "Контроль", openProposals + " действий", "Экспорт, восстановление, аудит", "Контроль", "command-control"),
    "</section>",
    "<section class=\"command-lower\">",
    renderProposalPanel(state),
    renderCalendarPanel(state),
    renderProviderPanelV2(state),
    "</section>"
  ].join("");
}

function renderCommandCard(surface, title, metric, caption, button, testId) {
  return [
    "<article class=\"command-card\" data-testid=\"command-card-" + surface + "\">",
    "<div><strong>" + escapeHtml(title) + "</strong><span>" + escapeHtml(metric) + "</span></div>",
    "<p>" + escapeHtml(caption) + "</p>",
    "<button data-action=\"set-surface\" data-id=\"" + escapeHtml(surface) + "\" data-testid=\"" + escapeHtml(testId) + "\">" + escapeHtml(button) + "</button>",
    "</article>"
  ].join("");
}

function financeSummary(state) {
  const txs = Object.values(state.financeTransactions || {}).filter((tx) => !tx.deleted);
  const accounts = Object.values(state.financeAccounts || {}).filter((account) => !account.deleted);
  const todaySpend = txs.filter((tx) => tx.kind === "expense" && tx.day === todayKey()).reduce((sum, tx) => sum + tx.amount, 0);
  const monthKey = todayKey().slice(0, 7);
  const monthSpend = txs.filter((tx) => tx.kind === "expense" && String(tx.day || "").startsWith(monthKey)).reduce((sum, tx) => sum + tx.amount, 0);
  const budgetLimit = Object.values(state.budgets || {}).filter((budget) => !budget.deleted && budget.period === "month").reduce((sum, budget) => sum + budget.limit, 0);
  return {
    balance: accounts.reduce((sum, account) => sum + account.balance, 0),
    todaySpend,
    monthSpend,
    budgetLeft: budgetLimit ? budgetLimit - monthSpend : 0,
    budgetLimit,
    subscriptions: Object.values(state.subscriptions || {}).filter((item) => !item.deleted && item.status === "active").length
  };
}

function ownerTodaySummary(state) {
  const today = todayKey();
  const tomorrow = dateKeyFromOffset(1);
  const openTasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done");
  const reminders = Object.values(state.reminders || {}).filter((reminder) => !reminder.deleted && reminder.status !== "done");
  const habits = Object.values(state.habits || {}).filter((habit) => !habit.deleted && habit.status === "active");
  const nextItems = openTasks.concat(reminders.map((reminder) => ({
    title: reminder.title,
    day: reminder.day,
    startTime: reminder.time,
    status: reminder.status
  }))).sort(sortScheduledItems);
  return {
    next: nextItems[0] || null,
    todayCount: openTasks.filter((task) => task.day === today).length + reminders.filter((reminder) => reminder.day === today).length,
    tomorrowCount: openTasks.filter((task) => task.day === tomorrow).length + reminders.filter((reminder) => reminder.day === tomorrow).length,
    unscheduled: openTasks.filter((task) => !task.startTime).length,
    habitDone: habits.filter((habit) => habit.checkins && habit.checkins[today]).length,
    habitTotal: habits.length,
    nextReminder: reminders.sort(sortScheduledItems)[0] || null
  };
}

function renderWorkspaceHero(surface, eyebrow, title, subtitle, metrics, actions) {
  const metricRows = (metrics || []).map((item) => {
    return "<div><span>" + escapeHtml(item[0]) + "</span><strong>" + escapeHtml(item[1]) + "</strong></div>";
  }).join("");
  return [
    "<section class=\"workspace-hero workspace-hero-" + escapeHtml(surface) + "\" data-testid=\"workspace-hero-" + escapeHtml(surface) + "\">",
    "<div>",
    "<span class=\"section-title\">" + escapeHtml(eyebrow) + "</span>",
    "<h2>" + escapeHtml(title) + "</h2>",
    "<p>" + escapeHtml(subtitle) + "</p>",
    "</div>",
    metricRows ? "<div class=\"workspace-metrics\">" + metricRows + "</div>" : "",
    actions ? "<div class=\"workspace-actions\">" + actions + "</div>" : "",
    "</section>"
  ].join("");
}

function renderSurfaceWorkspace(surface, hero, body) {
  const shapeClass = {
    calendar: "calendar-grid-shell",
    finance: "finance-dashboard",
    reader: "reader-surface",
    player: "player-surface",
    chat: "chat-thread",
    agents: "flow-canvas",
    flows: "flow-canvas",
    graph: "graph-canvas"
  }[surface] || "";
  return [
    "<div class=\"market-workspace market-" + escapeHtml(surface) + (shapeClass ? " " + shapeClass : "") + "\" data-testid=\"workspace-" + escapeHtml(surface) + "\">",
    hero,
    body,
    "</div>"
  ].join("");
}

function renderInboxReviewWorkspace(state) {
  const sources = Object.values(state.sources || {})
    .filter((item) => !item.deleted && item.name !== "daily-capture.md")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open");
  const media = sources.filter((source) => ["audio", "book", "image"].includes(source.kind)).length;
  const hero = renderWorkspaceHero(
    "capture",
    "Inbox / Capture",
    "Очередь входящих артефактов",
    "Текст, файлы, скрины, чеки, аудио, книги и письма сначала становятся источниками. Дальше LifeOS предлагает действия без тихих изменений.",
    [
      ["Источники", String(sources.length)],
      ["Предложения", String(openProposals.length)],
      ["Медиа", String(media)],
      ["Аудит", String(state.auditLog.length)]
    ],
    "<button data-action=\"import-file\" data-testid=\"capture-import\">Открыть файл</button><button data-action=\"import-audio\" data-testid=\"capture-audio\">Открыть аудио</button><button data-action=\"set-surface\" data-id=\"control\">Контроль</button>"
  );
  const sourceCards = sources.slice(0, 12).map((source) => {
    const proposals = openProposals.filter((proposal) => proposal.sourceId === source.id).length;
    return [
      "<article class=\"source-review-card\" data-testid=\"source-review-card\">",
      "<div><strong>" + escapeHtml(source.name) + "</strong><span>" + escapeHtml([source.kind, source.status, source.parserStatus, formatBytes(source.size)].filter(Boolean).join(" / ")) + "</span></div>",
      "<em>" + proposals + " предложений</em>",
      "<div class=\"source-review-actions\">",
      "<button data-action=\"open-source-note\" data-id=\"" + escapeHtml(source.id) + "\">Открыть источник</button>",
      "<button data-action=\"apply-source-proposals\" data-id=\"" + escapeHtml(source.id) + "\">Принять безопасное</button>",
      "<button data-action=\"focus-graph-node\" data-id=\"" + escapeHtml(source.id) + "\">Показать связи</button>",
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  return renderSurfaceWorkspace("capture", hero, [
    renderCaptureCockpit(state),
    "<section class=\"inbox-review-board\" data-testid=\"inbox-review-board\">",
    "<div class=\"card-head\"><h2>Вечерний обзор</h2><span>Один источник за раз: понять, принять, пропустить или отправить в контроль.</span></div>",
    sourceCards || "<div class=\"empty big\">Пока нет входящих источников.</div>",
    "</section>",
    renderProposalPanelV2(state)
  ].join(""));
}

function renderTodayWorkspace(state, note) {
  const today = ownerTodaySummary(state);
  const hero = renderWorkspaceHero(
    "today",
    "Сегодня",
    "День без рядов тревоги",
    "Сегодня, завтра, без времени, напоминания и привычки собраны вокруг следующего действия.",
    [
      ["Сегодня", String(today.todayCount)],
      ["Завтра", String(today.tomorrowCount)],
      ["Без времени", String(today.unscheduled)],
      ["Привычки", today.habitDone + "/" + today.habitTotal]
    ],
    "<button data-action=\"quick-task\" data-testid=\"quick-task\">Быстрая задача</button><button data-action=\"set-surface\" data-id=\"calendar\">Неделя</button>"
  );
  return renderSurfaceWorkspace("today", hero, [
    "<div class=\"surface-grid today-planning-grid\">",
    renderTodayPanelV5(state, note),
    renderCalendarPanelV5(state),
    renderProposalPanel(state),
    "</div>"
  ].join(""));
}

function renderReaderWorkspace(state, note) {
  const reading = Object.values(state.readingItems || {}).filter((item) => !item.deleted);
  const highlights = Object.values(state.highlights || {}).filter((item) => !item.deleted);
  const gated = reading.filter((item) => item.status === "gated").length;
  const hero = renderWorkspaceHero(
    "reader",
    "Чтение",
    "Чтение как источник знания",
    "Книги, ограничения форматов, прогресс, цитаты и заметки превращаются в карточки знаний с обратной ссылкой на источник.",
    [
      ["В чтении", String(reading.length)],
      ["Цитаты", String(highlights.length)],
      ["Ждут парсер", String(gated)],
      ["Повторение", String(Object.values(state.reviewItems || {}).filter((item) => !item.deleted && item.status !== "done").length)]
    ],
    "<button data-action=\"import-file\" data-testid=\"book-import\">Импорт книги</button><button data-action=\"set-surface\" data-id=\"library\">База знаний</button>"
  );
  return renderSurfaceWorkspace("reader", hero, renderBookWorkbench(state, note));
}

function renderChatWorkspace(state) {
  const messages = Object.values(state.chatMessages || {});
  const localStatus = state.ollama.status || "unchecked";
  const hero = renderWorkspaceHero(
    "chat",
    "Чат с артефактом",
    "Чат привязан к активному артефакту",
    "Можно писать заметки и вопросы без Ollama. Локальная модель, если доступна, только готовит предложения после явного запуска.",
    [
      ["Сообщения", String(messages.length)],
      ["Ollama", humanStatus(localStatus)],
      ["Модели", String((state.ollama.models || []).length)],
      ["Предложения", String(Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length)]
    ],
    "<button data-action=\"ollama-dry-run\" data-testid=\"ollama-dry-run\">Подготовить ответ</button><button data-action=\"set-surface\" data-id=\"providers\">Подключения</button>"
  );
  return renderSurfaceWorkspace("chat", hero, [
    "<div class=\"chat-ai-grid chat-thread\">",
    renderChatPanel(state),
    renderOllamaPanel(state),
    "</div>",
    renderProposalPanel(state)
  ].join(""));
}

function renderProductBrainChatContext(state) {
  const summary = productBrainStatusSummary(state);
  return [
    "<section class=\"product-brain-chat-context\" data-testid=\"product-brain-chat-context\">",
    "<div><span class=\"section-title\">Активный контекст</span><h3>LifeOS Product Brain</h3><p>Локальный ответ по состоянию разработки: без внешней модели, без скрытых изменений, только как подсказка и источник задач.</p></div>",
    "<div class=\"product-brain-state-grid\">",
    "<span>Пакет <strong>" + escapeHtml(summary.currentPackage) + "</strong></span>",
    "<span>Дальше <strong>" + escapeHtml(summary.nextPackage) + "</strong></span>",
    "<span>GitHub <strong>" + escapeHtml(summary.githubReleaseStatus) + "</strong></span>",
    "<span>Узлы <strong>" + summary.noteCount + "</strong></span>",
    "</div>",
    "<div class=\"product-brain-prompts\" data-testid=\"product-brain-prompts\"><span>Спроси:</span><code>что осталось доделать?</code><code>почему это не готово?</code><code>какой следующий пакет?</code><code>какие UX-долги мешают?</code><code>где доказательства, что календарь работает?</code></div>",
    "</section>"
  ].join("");
}

function primaryOwnerSurfaces() {
  return [
    ["inbox", "Дом", "старт"],
    ["today", "Сегодня", "дела"],
    ["capture", "Входящие", "разбор"],
    ["calendar", "Календарь", "время"],
    ["finance", "Деньги", "бюджет"],
    ["library", "База", "знания"],
    ["chat", "Чат", "диалог"],
    ["graph", "Граф", "связи"],
    ["control", "Контроль", "данные"]
  ];
}

function secondaryOwnerSurfaces() {
  return [
    ["reader", "Чтение"],
    ["player", "Аудио"],
    ["habits", "Привычки"],
    ["goals", "Цели"],
    ["agents", "Агенты"],
    ["flows", "Сценарии"],
    ["providers", "Подключения"]
  ];
}

function renderHumanNavRail(state) {
  const primary = primaryOwnerSurfaces();
  const secondary = secondaryOwnerSurfaces();
  return [
    "<aside class=\"sidebar human-nav-rail\" data-testid=\"home-workspace-rail\">",
    "<section class=\"rail-section rail-primary-nav\">",
    "<div class=\"section-title\">LifeOS</div>",
    "<div class=\"rail-flow human-nav-list\">",
    primary.map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"flow-step human-nav-item" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"rail-surface-" + surface[0] + "\"><strong>" + escapeHtml(surface[1]) + "</strong><span>" + escapeHtml(surface[2]) + "</span></button>";
    }).join(""),
    "</div>",
    "</section>",
    "<details class=\"rail-section human-more-nav\"><summary>Ещё</summary>",
    "<div class=\"rail-flow human-nav-list secondary\">",
    secondary.map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"flow-step human-nav-item" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\"><strong>" + escapeHtml(surface[1]) + "</strong></button>";
    }).join(""),
    "</div>",
    "</details>",
    "</aside>"
  ].join("");
}

function humanVisibleSource(state) {
  const source = latestSource(state);
  return source && source.name !== "daily-capture.md" ? source : null;
}

function sourcePlainText(source) {
  if (!source) return "";
  return repairMojibake(source.text || source.transcriptText || source.name || "");
}

function proposalsForHumanSource(state, source) {
  if (!source) return [];
  return Object.values(state.proposals || {})
    .filter((proposal) => proposal.sourceId === source.id && proposal.status === "open")
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function firstProposalOfType(proposals, types) {
  const allowed = new Set(Array.isArray(types) ? types : [types]);
  return proposals.find((proposal) => allowed.has(proposal.type)) || null;
}

function humanDayLabel(day) {
  if (!day) return "";
  if (day === todayKey()) return "сегодня";
  if (day === dateKeyFromOffset(1)) return "завтра";
  if (day === dateKeyFromOffset(2)) return "послезавтра";
  return day;
}

function humanScheduleLine(fields) {
  const day = humanDayLabel(fields.day || fields.targetDate || "");
  if (fields.timeAmbiguous) {
    const options = Array.isArray(fields.timeOptions) && fields.timeOptions.length ? fields.timeOptions.join(" или ") : "11:00 или 23:00";
    return (day ? day + ", " : "") + "нужно уточнить время: " + options;
  }
  const time = fields.startTime || fields.time || fields.suggestedTime || "";
  if (day && time) return day + ", " + time;
  if (day) return day;
  if (time) return time;
  return "без времени";
}

function humanTaskTitleFromText(text, fallback) {
  const ownerTitle = stripOwnerActionTitleUnicode(text) || stripOwnerActionTitle(text);
  if (ownerTitle) return ownerTitle;
  const cleaned = cleanLine(repairMojibake(String(text || ""))
    .replace(/\b(сегодня|завтра|послезавтра)\b/giu, " ")
    .replace(/\bчерез\s+\d+\s+(?:день|дня|дней|д)\b/giu, " ")
    .replace(/\bв\s+\d{1,2}(?::\d{2})?\s*(?:утра|вечера|дня|ночи)?\b/giu, " ")
    .replace(/\b(утром|вечером|днем|днём)\b/giu, " ")
    .replace(/\d{1,2}[:.]\d{2}/g, " ")
    .replace(/\b(задача|надо|нужно|напомни|пожалуйста)\b/giu, " ")
    .replace(/[,.!?]+/g, " ")
    .replace(/\s+/g, " "));
  return cleaned || cleanLine(repairMojibake(fallback || "")) || "задача";
}

function moneyFactTitle(proposal) {
  const fields = proposal && proposal.fields ? proposal.fields : {};
  const amount = Number(fields.amount || fields.balance || 0);
  const category = fields.category ? ", " + repairMojibake(fields.category) : "";
  const title = repairMojibake(fields.title || proposal.title || "запись");
  const day = humanDayLabel(fields.day || todayKey());
  return title + (amount ? ", " + amount + " ₽" : "") + category + (day ? ", " + day : "") + ".";
}

function resultSurfaceForSource(state, source) {
  const sourceId = source && source.id ? source.id : "";
  if (!sourceId) return "library";
  if (Object.values(state.tasks || {}).some((task) => !task.deleted && task.sourceId === sourceId)) return "today";
  if (Object.values(state.planBlocks || {}).some((block) => !block.deleted && block.sourceId === sourceId)) return "calendar";
  if (Object.values(state.financeTransactions || {}).some((tx) => !tx.deleted && tx.sourceId === sourceId)) return "finance";
  if (Object.values(state.habits || {}).some((habit) => !habit.deleted && habit.sourceId === sourceId)) return "habits";
  if (Object.values(state.goals || {}).some((goal) => !goal.deleted && goal.sourceId === sourceId)) return "habits";
  return "library";
}

function resultSurfaceLabel(surface) {
  return {
    today: "Открыть сегодня",
    calendar: "Открыть календарь",
    finance: "Открыть деньги",
    habits: "Открыть привычки и цели",
    library: "Открыть базу"
  }[surface] || "Открыть результат";
}

function buildHumanCaptureAnswer(state) {
  const source = humanVisibleSource(state);
  const proposals = proposalsForHumanSource(state, source);
  const draft = cleanLine(state.captureDraft || "");
  const text = sourcePlainText(source) || draft;
  const lower = normalizeRuText(text);
  const task = firstProposalOfType(proposals, ["task", "calendar", "reminder"]);
  const calendar = firstProposalOfType(proposals, ["calendar", "plan", "reminder"]);
  const expense = firstProposalOfType(proposals, ["finance_expense", "finance"]);
  const balance = firstProposalOfType(proposals, ["balance"]);
  const knowledge = firstProposalOfType(proposals, ["knowledge", "knowledge-summary", "note"]);
  const ideaLike = /идея|второй мозг|проект|knowledge|brain/iu.test(lower);
  const primary = {
    label: draft && !source ? "Разобрать ввод" : "Добавить в LifeOS",
    action: source ? "apply-source-proposals" : "capture-text",
    id: source ? source.id : "",
    disabled: false
  };
  let facts = [];
  let secondary = [];

  if (!source && !draft) {
    return {
      facts: ["Можно написать задачу, расход, мысль, письмо, заметку, чек или файл."],
      primary: { label: "Разобрать ввод", action: "capture-text", id: "", disabled: false },
      secondary: [
        { label: "Задача", action: "quick-task", id: "" },
        { label: "Расход", action: "quick-expense", id: "" },
        { label: "Файл / скрин", action: "import-file", id: "" }
      ]
    };
  }

  if (source && !proposals.length) {
    const surface = resultSurfaceForSource(state, source);
    return {
      facts: ["Готово: предложения приняты. Результат уже появился в нужном рабочем месте."],
      primary: { label: resultSurfaceLabel(surface), action: "set-surface", id: surface, disabled: false },
      secondary: [
        { label: "Изменить", action: "focus-capture", id: "" },
        { label: "Показать связи", action: "focus-graph-node", id: source.id }
      ]
    };
  }

  if (expense && balance) {
    facts = [
      "Расход: " + moneyFactTitle(expense),
      "Баланс: " + repairMojibake((balance.fields && balance.fields.accountName) || "карта") + ", " + Number((balance.fields && balance.fields.balance) || 0) + " ₽."
    ];
    primary.label = "Добавить расход и обновить баланс";
  } else if (ideaLike) {
    facts = ["Это идея / знание / проект."];
    primary.label = "Сохранить идею в базу знаний";
    if (knowledge) {
      primary.action = "apply-proposal";
      primary.id = knowledge.id;
    }
    secondary.push({ label: "Создать проект", action: source ? "apply-source-proposals" : "capture-text", id: source ? source.id : "" });
    secondary.push({ label: "Предложить следующие шаги", action: "run-agent-active", id: "" });
  } else if (task || calendar) {
    const proposal = task || calendar;
    const fields = Object.assign({}, calendar && calendar.fields ? calendar.fields : {}, task && task.fields ? task.fields : {}, proposal.fields || {});
    const title = humanTaskTitleFromText(text, fields.title || proposal.title);
    facts = [
      "Это задача.",
      "Когда: " + humanScheduleLine(fields) + ".",
      "Что сделать: " + title + "."
    ];
    const day = humanDayLabel(fields.day || "");
    const time = fields.startTime || fields.time || fields.suggestedTime || "";
    primary.label = fields.timeAmbiguous
      ? "Уточнить время"
      : "Создать задачу" + (day ? " " + day : "") + (time ? " в " + time : "");
    primary.disabled = Boolean(fields.timeAmbiguous);
  } else if (source) {
    facts = ["Источник сохранён. Можно принять безопасные предложения или открыть его в базе."];
    primary.label = "Принять предложения";
  } else {
    facts = ["Я разберу ввод и покажу действия до любых изменений."];
  }

  secondary = secondary.concat([
    { label: "Изменить", action: "focus-capture", id: "" },
    { label: "Сохранить как заметку", action: source && knowledge ? "apply-proposal" : "capture-text", id: source && knowledge ? knowledge.id : "" },
    { label: "Показать связи", action: source ? "focus-graph-node" : "set-surface", id: source ? source.id : "graph" }
  ]);
  return { facts, primary, secondary };
}

function renderHumanUnderstanding(state) {
  const answer = buildHumanCaptureAnswer(state);
  return [
    "<section class=\"human-response\" data-testid=\"lifeos-understanding\">",
    "<div class=\"human-response-block\" data-testid=\"active-artifact-card\">",
    "<span class=\"section-title\">LifeOS понял</span>",
    "<ul>",
    answer.facts.map((fact) => "<li>" + escapeHtml(fact) + "</li>").join(""),
    "</ul>",
    "</div>",
    "<div class=\"human-response-block main-action\" data-testid=\"owner-review-stage\">",
    "<span class=\"section-title\">Главное действие</span>",
    "<button class=\"primary\" data-action=\"" + escapeHtml(answer.primary.action) + "\" data-id=\"" + escapeHtml(answer.primary.id || "") + "\" data-testid=\"human-primary-action\"" + (answer.primary.disabled ? " disabled title=\"Нужно уточнить время\"" : "") + ">" + escapeHtml(answer.primary.label) + "</button>",
    "</div>",
    "<div class=\"human-response-block secondary-actions\">",
    "<span class=\"section-title\">Дополнительно</span>",
    "<div>",
    answer.secondary.map((item) => "<button data-action=\"" + escapeHtml(item.action) + "\" data-id=\"" + escapeHtml(item.id || "") + "\">" + escapeHtml(item.label) + "</button>").join(""),
    "</div>",
    "</div>",
    "</section>"
  ].join("");
}

function renderHumanChatHome(state) {
  const today = ownerTodaySummary(state);
  const money = financeSummary(state);
  const source = humanVisibleSource(state);
  const next = today.next;
  const nav = primaryOwnerSurfaces();
  return [
    "<section class=\"human-home chat-first-home\" data-testid=\"command-center\">",
    "<nav class=\"human-inline-nav\" data-testid=\"home-workspace-rail\">",
    nav.map((surface) => {
      const active = state.activeSurface === surface[0] ? " active" : "";
      return "<button class=\"human-inline-nav-item" + active + "\" data-action=\"set-surface\" data-id=\"" + surface[0] + "\" data-testid=\"home-nav-" + surface[0] + "\">" + escapeHtml(surface[1]) + "</button>";
    }).join(""),
    "</nav>",
    "<div class=\"human-home-main\">",
    "<section class=\"human-chat-card\" data-testid=\"mega-dropzone\">",
    "<div class=\"section-title\">Дом</div>",
    "<h2>Что добавить в LifeOS?</h2>",
    "<textarea id=\"capture-input\" data-testid=\"capture-input\" spellcheck=\"true\" aria-label=\"Что добавить в LifeOS\" placeholder=\"Напиши, скажи, скинь файл, чек, аудио, книгу, письмо, задачу или мысль…\">" + escapeHtml(state.captureDraft || "") + "</textarea>",
    "<div class=\"human-quick-actions\" data-testid=\"home-quick-actions\">",
    "<button data-action=\"quick-task\" data-testid=\"quick-task\">Задача</button>",
    "<button data-action=\"quick-expense\" data-testid=\"quick-expense\">Расход</button>",
    "<button data-action=\"import-file\" data-testid=\"capture-import\">Файл / скрин</button>",
    "<button data-action=\"import-audio\" data-testid=\"capture-audio\">Аудио</button>",
    "<button data-action=\"import-file\" data-testid=\"capture-book\">Книга</button>",
    "</div>",
    "<div class=\"capture-submit-row\"><button class=\"primary\" data-action=\"capture-text\" data-testid=\"capture-text\">Разобрать</button><button data-action=\"clear-capture\" data-testid=\"clear-capture\">Очистить</button></div>",
    "</section>",
    renderHumanUnderstanding(state),
    "</div>",
    "<aside class=\"human-day-strip\" data-testid=\"human-day-strip\">",
    "<div data-testid=\"owner-next-zone\"><span>Следующее</span><strong>" + escapeHtml(next ? [humanDayLabel(next.day), next.startTime, next.title].filter(Boolean).join(" · ") : "пока свободно") + "</strong></div>",
    "<div><span>Сегодня</span><strong>" + today.todayCount + " дел</strong></div>",
    "<div data-testid=\"owner-money-zone\"><span>Деньги</span><strong>" + Math.round(money.todaySpend) + " ₽ сегодня</strong></div>",
    "<div><span>Привычки</span><strong>" + today.habitDone + "/" + today.habitTotal + "</strong></div>",
    source ? "<button data-action=\"open-source-note\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"home-open-source\">Открыть источник</button>" : "<button data-action=\"set-surface\" data-id=\"today\">Открыть день</button>",
    "</aside>",
    "</section>"
  ].join("");
}

function renderAgentsWorkspace(state) {
  const runs = Object.values(state.agentRuns || {});
  const flowRuns = Object.values(state.flowRuns || {});
  const hero = renderWorkspaceHero(
    "agents",
    "Агенты и сценарии",
    "Песочница автоматизаций перед применением",
    "Сценарии читают активный артефакт, показывают риск и результат заранее, а изменения попадают в систему только после подтверждения.",
    [
      ["Проверки агентов", String(runs.length)],
      ["Проверки сценариев", String(flowRuns.length)],
      ["Открыто", String(Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length)],
      ["Следы", String(state.auditLog.length)]
    ],
    "<button data-action=\"run-agent-active\" data-testid=\"hero-agent-run\">Проверить агента</button><button data-action=\"run-flow\" data-testid=\"hero-flow-run\">Проверить сценарий</button>"
  );
  return renderSurfaceWorkspace("agents", hero, [
    renderAgentPanel(state),
    renderProposalPanel(state)
  ].join(""));
}

function renderOwnerHome(state, note) {
  return renderHumanChatHome(state);
  const source = latestSource(state);
  const graph = mapGraph(state);
  const today = ownerTodaySummary(state);
  const money = financeSummary(state);
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open");
  const sourceMeta = source ? sourceMetaLabel(source) : "";
  const visibleSource = source && source.name !== "daily-capture.md" ? source : null;
  const sourceProposals = visibleSource ? Object.values(state.proposals || {}).filter((proposal) => proposal.sourceId === visibleSource.id) : [];
  const sourceHasAppliedObjects = sourceProposals.some((proposal) => proposal.status === "applied");
  const visibleProposals = visibleSource ? openProposals
    .filter((proposal) => proposal.sourceId === visibleSource.id)
    .filter((proposal) => !sourceHasAppliedObjects || !["automation", "control"].includes(proposal.group || groupForProposalType(proposal.type))) : [];
  const sourceClasses = visibleSource && visibleSource.analysis ? normalizeArtifactAnalysis(visibleSource.analysis, visibleSource).detectedClasses.slice(0, 5) : [];
  const weakDomain = lifeDomainStats(state).slice().sort((a, b) => a.score - b.score || a.title.localeCompare(b.title))[0];
  const stepState = visibleSource ? (visibleProposals.length ? "review" : "created") : "empty";
  const stepClass = (key) => stepState === key ? " active" : "";
  const artifactButtons = visibleSource ? [
    "<button data-action=\"open-source-note\" data-id=\"" + escapeHtml(visibleSource.id) + "\" data-testid=\"home-open-source\">Источник</button>",
    "<button data-action=\"set-surface\" data-id=\"calendar\">Календарь</button>",
    "<button data-action=\"set-surface\" data-id=\"graph\">Связи</button>",
    "<button data-action=\"set-surface\" data-id=\"control\">Контроль</button>"
  ].join("") : "";
  const homeRecommendation = visibleSource && visibleProposals.length ? {
    title: "Проверь предложения активного артефакта",
    detail: visibleProposals.length + " открытых предложений, мутации только после явного Принять.",
    action: "apply-source-proposals",
    id: visibleSource.id,
    button: "Принять безопасное"
  } : today.next ? {
    title: "Открой следующий шаг дня",
    detail: [formatSchedule(today.next), today.next.title].filter(Boolean).join(" · "),
    action: "set-surface",
    id: "today",
    button: "Открыть день"
  } : {
    title: state.captureDraft && cleanLine(state.captureDraft) ? "Разобрать текущий вход" : "Начать с быстрой задачи",
    detail: state.captureDraft && cleanLine(state.captureDraft)
      ? "LifeOS создаст предложения без тихой мутации."
      : "Пустой день лучше начать с одного маленького действия.",
    action: state.captureDraft && cleanLine(state.captureDraft) ? "capture-text" : "quick-task",
    id: "",
    button: state.captureDraft && cleanLine(state.captureDraft) ? "Разобрать вход" : "Быстрая задача"
  };
  return [
    "<section class=\"owner-home owner-home-calm\" data-testid=\"command-center\">",
    "<div class=\"owner-capture\" data-testid=\"mega-dropzone\">",
    "<div class=\"section-title\">Вход LifeOS</div>",
    "<h2>Кинь сюда любой текст, файл, скрин, чек, аудио, книгу, письмо или идею</h2>",
    "<div class=\"home-next-action\" data-testid=\"home-next-action\">",
    "<div><span>Следующий шаг</span><strong>" + escapeHtml(homeRecommendation.title) + "</strong><em>" + escapeHtml(homeRecommendation.detail) + "</em></div>",
    "<button class=\"primary\" data-action=\"" + escapeHtml(homeRecommendation.action) + "\" data-id=\"" + escapeHtml(homeRecommendation.id) + "\" data-testid=\"home-primary-next\">" + escapeHtml(homeRecommendation.button) + "</button>",
    "</div>",
    "<textarea id=\"capture-input\" data-testid=\"capture-input\" spellcheck=\"true\" aria-label=\"Универсальный вход LifeOS\">" + escapeHtml(state.captureDraft || "") + "</textarea>",
    "<div class=\"owner-capture-actions\">",
    "<button data-action=\"capture-text\" class=\"primary\" data-testid=\"capture-text\">Разобрать</button>",
    "<button data-action=\"quick-task\" data-testid=\"quick-task\">Быстрая задача</button>",
    "<button data-action=\"import-file\" data-testid=\"capture-import\">Файл / скрин</button>",
    "<button data-action=\"import-audio\" data-testid=\"capture-audio\">Аудио</button>",
    "<button data-action=\"import-file\" data-testid=\"capture-book\">Книга</button>",
    "<button data-action=\"quick-expense\" data-testid=\"quick-expense\">Расход</button>",
    "<button data-action=\"quick-habit\" data-testid=\"quick-habit\">Привычка</button>",
    "</div>",
    "<div class=\"drop-hint\">До «Принять» ничего не меняется. Файлы остаются локально; OCR/STT/AI включаются только через явный gate.</div>",
    state.commandMessage ? "<div class=\"home-status-strip\" data-testid=\"home-command-message\">" + escapeHtml(state.commandMessage) + "</div>" : "",
    "</div>",
    "<button class=\"owner-zone owner-next\" data-action=\"set-surface\" data-id=\"today\" data-testid=\"owner-next-zone\">",
    "<span>Мой день / дальше</span>",
    "<strong>" + escapeHtml(today.next ? today.next.title : "Нет следующего действия") + "</strong>",
    "<em>" + today.todayCount + " сегодня · " + today.tomorrowCount + " завтра · " + today.unscheduled + " без времени · " + today.habitDone + "/" + today.habitTotal + " привычек</em>",
    today.nextReminder ? "<small>Напоминание: " + escapeHtml(today.nextReminder.title) + "</small>" : "<small>Сегодня можно начать с capture или календаря.</small>",
    "</button>",
    "<button class=\"owner-zone owner-money\" data-action=\"set-surface\" data-id=\"finance\" data-testid=\"owner-money-zone\">",
    "<span>Деньги / привычки / цели</span>",
    "<strong>" + Math.round(money.balance) + " ₽ баланс</strong>",
    "<em>" + Math.round(money.todaySpend) + " ₽ сегодня · " + (money.budgetLimit ? Math.round(money.budgetLeft) + " ₽ осталось" : "бюджет не задан") + " · " + today.habitDone + "/" + today.habitTotal + " привычек · " + Object.values(state.goals || {}).filter((goal) => !goal.deleted).length + " целей</em>",
    "<small>" + escapeHtml(weakDomain ? "Тихий домен: " + weakDomain.title + " · " + weakDomain.nextAction : "Цели связываются с задачами, деньгами, привычками и источниками.") + "</small>",
    "</button>",
    "<div class=\"owner-zone owner-artifact\" data-testid=\"active-artifact-card\">",
    "<div class=\"home-stepper\" data-testid=\"home-review-stepper\">",
    "<span class=\"" + (visibleSource ? "done" : "active") + "\">Понял</span>",
    "<span class=\"" + stepClass("review") + "\">Предлагаю</span>",
    "<span class=\"" + stepClass("created") + "\">Создано</span>",
    "</div>",
    "<div><span>Активный артефакт / Разбор</span><strong>" + escapeHtml(visibleSource ? visibleSource.name : "Пока нет входа") + "</strong></div>",
    "<em>" + escapeHtml(visibleSource ? sourceMeta : "Вставь данные в большое поле. LifeOS покажет смысл, действия, время, деньги, привычки, цели, связи и контроль.") + "</em>",
    sourceClasses.length ? "<div class=\"analysis-tags\">" + sourceClasses.map((item) => "<span>" + escapeHtml(item) + "</span>").join("") + "</div>" : "",
    "<div class=\"artifact-mini-metrics\">",
    "<span>" + visibleProposals.length + " предложений</span>",
    "<span>" + (visibleSource && visibleSource.analysis ? Math.round((visibleSource.analysis.confidence || 0) * 100) : 0) + "% уверенность</span>",
    "<span>Ollama: " + escapeHtml(({ unchecked: "не проверен", offline: "офлайн", reachable: "доступен", models_found: "модели найдены", error: "ошибка", revoked: "отключен" })[state.ollama.status] || state.ollama.status || "не проверен") + "</span>",
    "</div>",
    artifactButtons ? "<div class=\"artifact-action-row\">" + artifactButtons + "</div>" : "",
    "</div>",
    "</section>",
    visibleSource && visibleProposals.length ? "<section class=\"owner-review-stage\" data-testid=\"owner-review-stage\">" + renderArtifactAnalysisPanel(state, visibleSource) + renderProposalPanelV2(state, visibleSource.id) + "</section>" : ""
  ].join("");
  return [
    "<section class=\"owner-home\" data-testid=\"command-center\">",
    "<div class=\"owner-capture\" data-testid=\"mega-dropzone\">",
    "<div class=\"section-title\">Вход</div>",
    "<h2>Кинь сюда любой текст, файл, скрин, чек, аудио, книгу, письмо или идею</h2>",
    "<textarea id=\"capture-input\" data-testid=\"capture-input\" spellcheck=\"true\" aria-label=\"Universal artifact intake\">" + escapeHtml(state.captureDraft || "") + "</textarea>",
    "<div class=\"owner-capture-actions\">",
    "<button data-action=\"capture-text\" class=\"primary\" data-testid=\"capture-text\">Разобрать</button>",
    "<button data-action=\"import-file\" data-testid=\"capture-import\">Файл</button>",
    "<button data-action=\"import-file\" data-testid=\"capture-screenshot\">Скрин расхода</button>",
    "<button data-action=\"import-audio\" data-testid=\"capture-audio\">Аудио</button>",
    "<button data-action=\"import-file\" data-testid=\"capture-book\">Книга</button>",
    "<button data-action=\"quick-expense\" data-testid=\"quick-expense\">Расход</button>",
    "<button data-action=\"quick-task\" data-testid=\"quick-task\">Задача</button>",
    "<button data-action=\"quick-habit\" data-testid=\"quick-habit\">Привычка</button>",
    "<button data-action=\"auto-build-active\" data-testid=\"auto-build-active\">Собрать связи</button>",
    "</div>",
    "<div class=\"drop-hint\">Drag/drop тоже работает. До Apply ничего не меняется.</div>",
    "</div>",
    "<button class=\"owner-zone owner-next\" data-action=\"set-surface\" data-id=\"today\" data-testid=\"owner-next-zone\">",
    "<span>Сегодня / дальше</span>",
    "<strong>" + escapeHtml(today.next ? today.next.title : "План пуст") + "</strong>",
    "<em>" + today.todayCount + " сегодня · " + today.tomorrowCount + " завтра · " + today.habitDone + "/" + today.habitTotal + " привычек</em>",
    "</button>",
    "<button class=\"owner-zone owner-money\" data-action=\"set-surface\" data-id=\"finance\" data-testid=\"owner-money-zone\">",
    "<span>Деньги / бюджет</span>",
    "<strong>" + Math.round(money.balance) + " ₽ баланс</strong>",
    "<em>" + Math.round(money.todaySpend) + " ₽ сегодня · " + (money.budgetLimit ? Math.round(money.budgetLeft) + " ₽ осталось" : "бюджет не задан") + " · " + money.subscriptions + " подписок</em>",
    "</button>",
    "<div class=\"owner-zone owner-artifact\" data-testid=\"active-artifact-card\">",
    "<div><span>Активный артефакт / Разбор</span><strong>" + escapeHtml(source ? source.name : "Пока нет входа") + "</strong></div>",
    "<em>" + escapeHtml(source ? sourceMeta : "Вставь данные слева, потом применяй понятные карточки") + "</em>",
    "<div class=\"artifact-mini-metrics\">",
    "<span>" + graph.nodes.length + " узлов</span>",
    "<span>" + openProposals.length + " draft</span>",
    "<span>" + (source && source.analysis ? Math.round((source.analysis.confidence || 0) * 100) : 0) + "% разбор</span>",
    "</div>",
    "</div>",
    "</section>",
    renderArtifactPipeline(state),
    renderProposalPanelV2(state),
    "<section class=\"owner-secondary-nav\" data-testid=\"owner-secondary-nav\">",
    renderCommandCardV5("library", "Библиотека", source ? source.name : "источников " + Object.values(state.sources || {}).filter((item) => !item.deleted).length, "", "Открыть", "command-library"),
    renderCommandCardV5("calendar", "Календарь", today.todayCount + " сегодня", "", "Неделя", "command-calendar"),
    renderCommandCardV5("finance", "Финансы", Math.round(money.todaySpend) + " ₽ сегодня", "", "Деньги", "command-finance"),
    renderCommandCardV5("habits", "Привычки", today.habitDone + "/" + today.habitTotal, "", "Чек", "command-habits"),
    renderCommandCardV5("goals", "Цели", Object.values(state.goals || {}).filter((goal) => !goal.deleted).length + " активных", "", "Цели", "command-goals"),
    renderCommandCardV5("chat", "Чат", "локально", "", "Чат", "command-chat"),
    renderCommandCardV5("agents", "Агенты", "dry-run", "", "Run", "command-agents"),
    renderCommandCardV5("graph", "Граф", graph.nodes.length + " узлов", "", "Карта", "command-graph"),
    renderCommandCardV5("control", "Контроль", state.auditLog.length + " событий", "", "Audit", "command-control"),
    renderCommandCardV5("providers", "Провайдеры", state.ollama.status, "", "Статус", "command-providers"),
    "</section>",
    "<section class=\"artifact-deck owner-evidence-strip\">",
    renderArtifactAnalysisPanel(state, source),
    renderConnectedAppNetwork(state, source),
    renderReceiptPanel(state),
    "</section>"
  ].join("");
}

function renderCommandCenterV5(state, note) {
  return renderOwnerHome(state, note);
  const source = latestSource(state);
  const graph = mapGraph(state);
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length;
  const openTasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done").length;
  const run = latestAgentRun(state);
  const message = latestChatMessage(state);
  const sourceMeta = source ? [source.kind, source.status, source.parserStatus, formatBytes(source.size)].filter(Boolean).join(" / ") : "";
  return [
    "<section class=\"command-hero\" data-testid=\"command-center\">",
    "<div class=\"command-drop\" data-testid=\"mega-dropzone\">",
    "<div class=\"command-label\">INBOX</div>",
    "<div class=\"command-title\">Кинь данные. Получи задачи, план и связи.</div>",
    "<textarea id=\"capture-input\" data-testid=\"capture-input\" spellcheck=\"true\" aria-label=\"Universal artifact intake\">" + escapeHtml(state.captureDraft || "") + "</textarea>",
    "<div class=\"command-actions\">",
    "<button data-action=\"capture-text\" class=\"primary\" data-testid=\"capture-text\">Разобрать</button>",
    "<button data-action=\"import-file\" data-testid=\"capture-import\">Файл</button>",
    "<button data-action=\"import-audio\" data-testid=\"capture-audio\">Аудио</button>",
    "<button data-action=\"auto-build-active\" data-testid=\"auto-build-active\">Собрать</button>",
    "<button data-action=\"run-flow\" data-testid=\"run-flow\">Flow</button>",
    "<button data-action=\"run-agent-active\" data-testid=\"run-agent-active\">Agent</button>",
    "</div>",
    "</div>",
    "<div class=\"artifact-now\" data-testid=\"active-artifact-card\">",
    "<div class=\"section-title\">Активный артефакт</div>",
    source ? "<strong>" + escapeHtml(source.name) + "</strong><span>" + escapeHtml(sourceMeta) + "</span>" : "<strong>Пусто</strong><span>Вставь текст или импортируй файл</span>",
    "<div class=\"artifact-facts\">",
    "<div><span>Заметка</span><strong>" + (source && source.noteId ? "есть" : "нет") + "</strong></div>",
    "<div><span>Граф</span><strong>" + graph.nodes.length + "/" + graph.links.length + "</strong></div>",
    "<div><span>Действия</span><strong>" + openProposals + "</strong></div>",
    "<div><span>Задачи</span><strong>" + openTasks + "</strong></div>",
    "</div>",
    "<div class=\"artifact-route\">",
    "<button data-action=\"set-surface\" data-id=\"library\" data-testid=\"route-library\">База</button>",
    "<button data-action=\"set-surface\" data-id=\"today\" data-testid=\"route-today\">Сегодня</button>",
    "<button data-action=\"set-surface\" data-id=\"chat\" data-testid=\"route-chat\">Чат</button>",
    "<button data-action=\"set-surface\" data-id=\"agents\" data-testid=\"route-agents\">Агенты</button>",
    "<button data-action=\"set-surface\" data-id=\"graph\" data-testid=\"route-graph\">Граф</button>",
    "<button data-action=\"set-surface\" data-id=\"control\" data-testid=\"route-control\">Контроль</button>",
    "</div>",
    "</div>",
    "</section>",
    renderArtifactPipeline(state),
    "<section class=\"command-grid\">",
    renderCommandCardV5("library", "База", source ? source.name : "0 источников", "", "Открыть", "command-library"),
    renderCommandCardV5("today", "Сегодня", openTasks + " задач", "", "План", "command-today"),
    renderCommandCardV5("chat", "Чат", message ? shorten(message.text, 34) : "контекст", "", "Чат", "command-chat"),
    renderCommandCardV5("agents", "Агенты", run ? run.status : "готовы", "", "Run", "command-agents"),
    renderCommandCardV5("graph", "Граф", graph.nodes.length + " узлов", "", "Карта", "command-graph"),
    renderCommandCardV5("control", "Контроль", openProposals + " действий", "", "Audit", "command-control"),
    "</section>",
    "<section class=\"artifact-deck\">",
    renderArtifactAnalysisPanel(state, source),
    renderConnectedAppNetwork(state, source),
    renderReceiptPanel(state),
    "</section>"
  ].join("");
}

function renderCommandCardV5(surface, title, metric, caption, button, testId) {
  const cardTestId = surface === "control" ? "command-card-control" : testId;
  return [
    "<button class=\"command-card\" data-action=\"set-surface\" data-id=\"" + escapeHtml(surface) + "\" data-testid=\"" + escapeHtml(cardTestId) + "\">",
    "<strong>" + escapeHtml(title) + "</strong>",
    "<span>" + escapeHtml(metric) + "</span>",
    "</button>"
  ].join("");
}

function renderArtifactPipeline(state) {
  const source = latestSource(state);
  const hasSource = Boolean(source);
  const proposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length;
  const steps = [
    ["Вход", hasSource ? "принят" : "ждет"],
    ["Библиотека", source && source.noteId ? "заметка" : "ждет"],
    ["Сегодня", Object.values(state.planBlocks || {}).some((block) => !block.deleted) ? "в плане" : "ждет"],
    ["Чат", Object.values(state.chatMessages || {}).length ? "есть контекст" : "ждет"],
    ["Агенты", Object.values(state.agentRuns || {}).length ? "запущены" : "ждут"],
    ["Граф", mapGraph(state).nodes.length + " узлов"],
    ["Контроль", proposals + " действий"]
  ];
  return [
    "<section class=\"artifact-pipeline\" data-testid=\"artifact-pipeline\">",
    steps.map((step) => "<div><strong>" + escapeHtml(step[0]) + "</strong><span>" + escapeHtml(step[1]) + "</span></div>").join(""),
    "</section>"
  ].join("");
}

function knowledgeObjectsForNote(state, noteId) {
  const claims = Object.values(state.claims || {}).filter((claim) => !claim.deleted && claim.noteId === noteId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const questions = Object.values(state.questions || {}).filter((question) => !question.deleted && question.noteId === noteId && question.status !== "ignored").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const reviewItems = Object.values(state.reviewItems || {}).filter((reviewItem) => !reviewItem.deleted && reviewItem.noteId === noteId).sort((a, b) => a.day.localeCompare(b.day) || b.updatedAt.localeCompare(a.updatedAt));
  const insights = Object.values(state.insights || {}).filter((insight) => insight.noteId === noteId && insight.status !== "ignored").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { claims, questions, reviewItems, insights };
}

function renderClaimRow(claim) {
  return [
    "<article class=\"knowledge-row claim-row\" data-testid=\"claim-row\">",
    "<div class=\"knowledge-row-main\">",
    "<strong>" + escapeHtml(claim.title) + "</strong>",
    claim.body ? "<span>" + escapeHtml(shorten(claim.body, 160)) + "</span>" : "",
    "</div>",
    "<div class=\"knowledge-actions\">",
    "<button data-action=\"claim-to-insight\" data-id=\"" + escapeHtml(claim.id) + "\" data-testid=\"claim-to-insight\">Инсайт</button>",
    "<button data-action=\"claim-to-task\" data-id=\"" + escapeHtml(claim.id) + "\" data-testid=\"claim-to-task\">Создать задачу</button>",
    "<button data-action=\"open-knowledge-control\" data-id=\"" + escapeHtml(claim.id) + "\">Контроль</button>",
    "</div>",
    "</article>"
  ].join("");
}

function renderQuestionRow(question) {
  return [
    "<article class=\"knowledge-row question-row " + escapeHtml(question.status) + "\" data-testid=\"question-row\">",
    "<div class=\"knowledge-row-main\">",
    "<strong>" + escapeHtml(question.title) + "</strong>",
    question.body ? "<span>" + escapeHtml(shorten(question.body, 160)) + "</span>" : "",
    "</div>",
    "<div class=\"knowledge-actions\">",
    "<button data-action=\"question-to-task\" data-id=\"" + escapeHtml(question.id) + "\" data-testid=\"question-to-task\">Создать задачу</button>",
    "<button data-action=\"ignore-question\" data-id=\"" + escapeHtml(question.id) + "\">Пропустить</button>",
    "<button data-action=\"open-knowledge-control\" data-id=\"" + escapeHtml(question.id) + "\">Контроль</button>",
    "</div>",
    "</article>"
  ].join("");
}

function renderReviewRow(reviewItem) {
  const done = reviewItem.status === "done";
  return [
    "<article class=\"knowledge-row review-row " + (done ? "done" : "open") + "\" data-testid=\"review-row\">",
    "<div class=\"knowledge-row-main\">",
    "<strong>" + escapeHtml(reviewItem.title) + "</strong>",
    "<span>" + escapeHtml(reviewItem.day) + " / " + escapeHtml(reviewItem.status) + "</span>",
    "</div>",
    "<div class=\"knowledge-actions\">",
    "<button data-action=\"toggle-review-item\" data-id=\"" + escapeHtml(reviewItem.id) + "\" data-testid=\"toggle-review-item\">" + (done ? "Вернуть" : "Готово") + "</button>",
    "<button data-action=\"review-reminder\" data-id=\"" + escapeHtml(reviewItem.id) + "\" data-testid=\"review-reminder\">Напомнить</button>",
    "<button data-action=\"open-knowledge-control\" data-id=\"" + escapeHtml(reviewItem.id) + "\">Контроль</button>",
    "</div>",
    "</article>"
  ].join("");
}

function renderProductBrainLibraryCard(state, note) {
  return "";
  if (!note || note.systemType !== "product_brain") return "";
  const summary = productBrainStatusSummary(state);
  const related = productBrainNotes(state).filter((item) => item.id !== note.id).slice(0, 8);
  return [
    "<section class=\"product-brain-card\" data-testid=\"product-brain-library-card\">",
    "<div class=\"section-title\">Product Brain</div>",
    "<div class=\"product-brain-state-grid\">",
    "<span>DONE <strong>" + (summary.counts.DONE || 0) + "</strong></span>",
    "<span>PARTIAL <strong>" + (summary.counts.PARTIAL || 0) + "</strong></span>",
    "<span>GATED <strong>" + (summary.counts.GATED || 0) + "</strong></span>",
    "<span>NEXT <strong>" + escapeHtml(summary.nextPackage) + "</strong></span>",
    "</div>",
    "<p>Этот артефакт связывает жалобы владельца, UX debt, journey evidence, GitHub release state, provider gates и следующий пакет разработки.</p>",
    "<div class=\"product-brain-links\">",
    related.map((item) => "<button data-action=\"open-note\" data-id=\"" + escapeHtml(item.id) + "\">" + escapeHtml(item.title) + "</button>").join(""),
    "</div>",
    "<div class=\"knowledge-actions\"><button data-action=\"set-surface\" data-id=\"graph\" data-testid=\"product-brain-open-graph\">Показать связи</button><button data-action=\"set-surface\" data-id=\"control\" data-testid=\"product-brain-open-control\">Контроль</button><button data-action=\"set-surface\" data-id=\"chat\" data-testid=\"product-brain-open-chat\">Спросить в чате</button></div>",
    "</section>"
  ].join("");
}

function renderKnowledgeWorkbench(state, note) {
  if (!note) return "";
  const source = sourceForNote(state, note.id);
  const knowledge = knowledgeObjectsForNote(state, note.id);
  const backlinks = incomingBacklinks(state, note.id).length;
  const outlinks = outgoingLinks(state, note).length;
  const reviewDay = dateKeyFromOffset(7);
  return [
    "<section class=\"knowledge-workbench\" data-testid=\"knowledge-workbench\">",
    "<div class=\"knowledge-head\">",
    "<div>",
    "<span class=\"section-title\">Second Brain</span>",
    "<h2>" + escapeHtml(note.title) + "</h2>",
    "<p>" + escapeHtml(source ? "source-backed: " + source.name : "local note") + "</p>",
    "</div>",
    "<div class=\"knowledge-head-actions\">",
    "<button class=\"primary\" data-action=\"extract-knowledge\" data-id=\"" + escapeHtml(note.id) + "\" data-testid=\"extract-knowledge\">Извлечь смысл</button>",
    "<button data-action=\"open-knowledge-control\" data-id=\"" + escapeHtml(note.id) + "\" data-testid=\"open-knowledge-control\">Связи / Контроль</button>",
    "</div>",
    "</div>",
    "<div class=\"knowledge-metrics\">",
    "<span>выводы <strong>" + knowledge.claims.length + "</strong></span>",
    "<span>вопросы <strong>" + knowledge.questions.length + "</strong></span>",
    "<span>повторение <strong>" + knowledge.reviewItems.filter((item) => item.status !== "done").length + "</strong></span>",
    "<span>обратные <strong>" + backlinks + "</strong></span>",
    "<span>ссылки <strong>" + outlinks + "</strong></span>",
    "</div>",
    renderProductBrainLibraryCard(state, note),
    "<div class=\"knowledge-forms\">",
    "<label>Вывод<input id=\"claim-title\" data-testid=\"claim-title\" autocomplete=\"off\" aria-label=\"Вывод\"></label>",
    "<button data-action=\"add-claim-entry\" data-testid=\"add-claim-entry\">Добавить</button>",
    "<label>Вопрос<input id=\"question-title\" data-testid=\"question-title\" autocomplete=\"off\" aria-label=\"Вопрос\"></label>",
    "<button data-action=\"add-question-entry\" data-testid=\"add-question-entry\">Добавить</button>",
    "<label>Повторение<input id=\"review-title\" data-testid=\"review-title\" autocomplete=\"off\" aria-label=\"Повторение\"></label>",
    "<input id=\"review-day\" data-testid=\"review-day\" type=\"date\" value=\"" + escapeHtml(reviewDay) + "\" aria-label=\"Review date\">",
    "<button data-action=\"add-review-entry\" data-testid=\"add-review-entry\">Добавить</button>",
    "</div>",
    "<div class=\"knowledge-columns\">",
    "<div><h3>Выводы</h3>" + (knowledge.claims.length ? knowledge.claims.map(renderClaimRow).join("") : "<div class=\"empty compact\">Нажми извлечение или добавь вывод вручную.</div>") + "</div>",
    "<div><h3>Вопросы</h3>" + (knowledge.questions.length ? knowledge.questions.map(renderQuestionRow).join("") : "<div class=\"empty compact\">Вопросы станут задачами без потери источника.</div>") + "</div>",
    "<div><h3>Повторение</h3>" + (knowledge.reviewItems.length ? knowledge.reviewItems.map(renderReviewRow).join("") : "<div class=\"empty compact\">Карточка повторения появится после извлечения смысла.</div>") + "</div>",
    "</div>",
    knowledge.insights.length ? "<div class=\"knowledge-insights\"><h3>Инсайты</h3>" + knowledge.insights.slice(0, 4).map((insight) => "<div class=\"insight-row\"><strong>" + escapeHtml(insight.title) + "</strong><span>" + escapeHtml(shorten(insight.reason, 140)) + "</span></div>").join("") + "</div>" : "",
    "</section>"
  ].join("");
}

function highlightsForSource(state, sourceId) {
  return Object.values(state.highlights || {})
    .filter((highlight) => !highlight.deleted && highlight.sourceId === sourceId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function readingItemForSource(state, sourceId) {
  return Object.values(state.readingItems || {}).find((item) => !item.deleted && item.sourceId === sourceId) || null;
}

function renderHighlightRow(highlight) {
  return [
    "<article class=\"knowledge-row highlight-row\" data-testid=\"highlight-row\">",
    "<div class=\"knowledge-row-main\">",
    "<strong>" + escapeHtml(highlight.title) + "</strong>",
    "<span>" + escapeHtml(shorten(highlight.text, 150)) + "</span>",
    "</div>",
    "<div class=\"knowledge-actions\">",
    "<button data-action=\"highlight-to-claim\" data-id=\"" + escapeHtml(highlight.id) + "\" data-testid=\"highlight-to-claim\">Вывод</button>",
    "<button data-action=\"highlight-to-task\" data-id=\"" + escapeHtml(highlight.id) + "\" data-testid=\"highlight-to-task\">Создать задачу</button>",
    "<button data-action=\"open-knowledge-control\" data-id=\"" + escapeHtml(highlight.id) + "\">Контроль</button>",
    "</div>",
    "</article>"
  ].join("");
}

function renderBookSourceCard(state, source) {
  const readingItem = readingItemForSource(state, source.id);
  const highlights = highlightsForSource(state, source.id);
  const gated = source.parserStatus && source.parserStatus.includes("parser-required") && !source.text;
  const extraction = gated ? [
    "<div class=\"book-gate\" data-testid=\"book-parser-gate\">",
    "<div><strong>Формат ждёт парсер</strong><span>" + escapeHtml(humanStatus(source.parserStatus)) + "</span></div>",
    "<p>Автопарсер не включён. Источник сохранён локально; можно вставить извлечённый текст вручную.</p>",
    "<textarea id=\"book-extraction-" + escapeHtml(source.id) + "\" data-testid=\"book-extraction\" aria-label=\"Manual extracted text\" spellcheck=\"true\"></textarea>",
    "<button data-action=\"save-source-extraction\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"save-source-extraction\">Сохранить текст</button>",
    "</div>"
  ].join("") : "";
  const readableTools = source.text ? [
    "<div class=\"book-tools\">",
    "<button data-action=\"extract-highlights\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"extract-highlights\">Найти цитаты</button>",
    "<input id=\"highlight-title-" + escapeHtml(source.id) + "\" data-testid=\"highlight-title\" autocomplete=\"off\" aria-label=\"Текст цитаты\">",
    "<button data-action=\"add-highlight-entry\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"add-highlight-entry\">Добавить цитату</button>",
    "</div>"
  ].join("") : "";
  const progress = readingItem ? [
    "<div class=\"reading-progress\">",
    "<label>Прогресс<input id=\"reading-progress-" + escapeHtml(readingItem.id) + "\" data-testid=\"reading-progress\" type=\"number\" min=\"0\" max=\"100\" value=\"" + escapeHtml(readingItem.progress) + "\" aria-label=\"Прогресс чтения\"></label>",
    "<button data-action=\"update-reading-progress\" data-id=\"" + escapeHtml(readingItem.id) + "\" data-testid=\"update-reading-progress\">Сохранить</button>",
    "</div>"
  ].join("") : "";
  return [
    "<article class=\"book-source-card\" data-testid=\"book-source-card\">",
    "<div class=\"book-source-head\">",
    "<div>",
    "<strong>" + escapeHtml(source.name) + "</strong>",
    "<span>" + escapeHtml(sourceMetaLabel(source)) + "</span>",
    "</div>",
    "<div class=\"knowledge-actions\">",
    "<button data-action=\"open-source-note\" data-id=\"" + escapeHtml(source.id) + "\">Открыть</button>",
    "<button data-action=\"open-knowledge-control\" data-id=\"" + escapeHtml(readingItem ? readingItem.id : source.id) + "\">Контроль</button>",
    "</div>",
    "</div>",
    readingItem ? "<div class=\"knowledge-metrics\"><span>статус <strong>" + escapeHtml(humanStatus(readingItem.status)) + "</strong></span><span>прогресс <strong>" + escapeHtml(readingItem.progress) + "%</strong></span><span>цитаты <strong>" + highlights.length + "</strong></span></div>" : "",
    extraction,
    readableTools,
    progress,
    highlights.length ? "<div class=\"highlight-stack\">" + highlights.slice(0, 5).map(renderHighlightRow).join("") + "</div>" : "<div class=\"empty compact\">Цитаты появятся после импорта текста или ручного извлечения.</div>",
    "</article>"
  ].join("");
}

function renderBookWorkbench(state, note) {
  const sources = Object.values(state.sources || {}).filter(isBookSource).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  return [
    "<section class=\"book-workbench\" data-testid=\"book-workbench\">",
    "<div class=\"knowledge-head\">",
    "<div>",
    "<span class=\"section-title\">Книги и файлы</span>",
    "<h2>Источники для чтения</h2>",
    "<p>TXT/MD читаются сразу. PDF/EPUB хранятся локально и ждут парсер или ручной текст.</p>",
    "</div>",
    "<button data-action=\"import-file\" data-testid=\"book-import\">Импорт</button>",
    "</div>",
    sources.length ? "<div class=\"book-source-grid\">" + sources.map((source) => renderBookSourceCard(state, source)).join("") + "</div>" : "<div class=\"empty compact\">Импортируй TXT, MD, PDF или EPUB, чтобы создать источник чтения.</div>",
    "</section>"
  ].join("");
}

function graphNodeObject(state, nodeId) {
  if (!nodeId) return null;
  const buckets = [
    ["note", state.notes],
    ["ghost", state.ghosts],
    ["source", state.sources],
    ["task", state.tasks],
    ["plan", state.planBlocks],
    ["reminder", state.reminders],
    ["habit", state.habits],
    ["goal", state.goals],
    ["finance-account", state.financeAccounts],
    ["finance", state.financeTransactions],
    ["budget", state.budgets],
    ["subscription", state.subscriptions],
    ["insight", state.insights],
    ["claim", state.claims],
    ["question", state.questions],
    ["review", state.reviewItems],
    ["reading", state.readingItems],
    ["highlight", state.highlights],
    ["transcript-segment", state.transcriptSegments],
    ["audio-checkpoint", state.audioCheckpoints],
    ["player-note", state.playerNotes],
    ["saved-search", state.savedSearches],
    ["chat-message", state.chatMessages],
    ["proposal", state.proposals],
    ["agent", state.agentRuns],
    ["provider-run", state.providerRuns],
    ["flow-run", state.flowRuns],
    ["channel", state.channels],
    ["system", state.systemDefinitions],
    ["system-record", state.systemRecords],
    ["project", state.projects],
    ["project-item", state.projectItems],
    ["model-profile", state.modelProfiles],
    ["smart-home-device", state.smartHomeDevices],
    ["smart-home-event", state.smartHomeEvents],
    ["marketplace-pack", state.marketplacePacks],
    ["installed-pack", state.installedPacks],
    ["design-profile", state.designProfiles],
    ["database", state.customDatabases],
    ["database-row", state.databaseRows],
    ["screen-session", state.screenCompanionSessions],
    ["twin-snapshot", state.personalTwinSnapshots]
  ];
  for (const bucket of buckets) {
    const collection = bucket[1] || {};
    if (collection[nodeId]) return { kind: bucket[0], object: collection[nodeId] };
  }
  return null;
}

function graphNodeWorkspace(kind, object) {
  if (kind === "note" || kind === "ghost" || kind === "claim" || kind === "question" || kind === "review" || kind === "reading" || kind === "highlight") return "library";
  if (kind === "source") return object && object.kind === "audio" ? "player" : "library";
  if (kind === "saved-search") return object && object.surface ? object.surface : "library";
  if (kind === "chat-message") return "chat";
  if (kind === "task" || kind === "plan" || kind === "reminder") return "calendar";
  if (kind === "habit" || kind === "goal" || kind === "insight") return "habits";
  if (kind === "finance-account" || kind === "finance" || kind === "budget" || kind === "subscription") return "finance";
  if (kind === "transcript-segment" || kind === "audio-checkpoint" || kind === "player-note") return "player";
  if (kind === "agent" || kind === "flow-run") return "agents";
  if (kind === "provider-run") return "providers";
  if (kind === "channel") return "feed";
  if (kind === "system" || kind === "system-record") return "systems";
  if (kind === "project" || kind === "project-item") return "projects";
  if (kind === "model-profile") return "models";
  if (kind === "smart-home-device" || kind === "smart-home-event") return "smart-home";
  if (kind === "marketplace-pack" || kind === "installed-pack") return "marketplace";
  if (kind === "design-profile") return "design";
  if (kind === "database" || kind === "database-row") return "databases";
  if (kind === "screen-session") return "screen";
  if (kind === "twin-snapshot") return "twin";
  if (kind === "proposal") return "inbox";
  return "control";
}

function selectGraphNodeInState(state, nodeId) {
  if (!nodeId) return null;
  state.graphView.selectedNodeId = nodeId;
  const resolved = graphNodeObject(state, nodeId);
  if (!resolved) return null;
  const object = resolved.object;
  if (resolved.kind === "note" && object && !object.deleted) {
    state.activeNoteId = object.id;
    if (state.folders[object.folderId]) state.activeFolderId = object.folderId;
    return resolved;
  }
  if (object && object.noteId && state.notes[object.noteId] && !state.notes[object.noteId].deleted) {
    state.activeNoteId = object.noteId;
    if (state.folders[state.notes[object.noteId].folderId]) state.activeFolderId = state.notes[object.noteId].folderId;
    return resolved;
  }
  if (object && object.sourceId && state.sources[object.sourceId]) {
    const source = state.sources[object.sourceId];
    if (source.noteId && state.notes[source.noteId] && !state.notes[source.noteId].deleted) {
      state.activeNoteId = source.noteId;
      if (state.folders[state.notes[source.noteId].folderId]) state.activeFolderId = state.notes[source.noteId].folderId;
    }
  }
  if (resolved.kind === "saved-search") {
    state.searchQuery = object.query || "";
    state.commandPaletteQuery = object.query || "";
    state.graphView.searchQuery = object.query || "";
  }
  return resolved;
}

function openGraphNodeInState(state, nodeId) {
  const resolved = selectGraphNodeInState(state, nodeId);
  if (!resolved) {
    state.activeSurface = "graph";
    return;
  }
  state.activeSurface = graphNodeWorkspace(resolved.kind, resolved.object);
}

function graphNodeTitle(kind, object, fallback) {
  if (!object) return fallback || "Unknown";
  if (object.title) return object.title;
  if (object.name) return object.name;
  if (object.providerId) return object.providerId + " " + object.kind;
  if (object.text) return shorten(object.text, 80);
  return fallback || object.id || kind;
}

function graphNodeMeta(kind, object) {
  if (!object) return "missing";
  if (kind === "note" && object.systemType === "product_brain") return [object.productBrainStatus || "PARTIAL", object.productBrainKind || "node"].join(" / ");
  if (kind === "source") return [object.kind, object.parserStatus || object.status || "", object.mime || ""].filter(Boolean).join(" / ");
  if (kind === "task" || kind === "plan") return [object.day || "no day", object.startTime || "no time", object.status || "open"].join(" / ");
  if (kind === "reminder") return [object.day || "no day", object.time || "no time", object.status || "open"].join(" / ");
  if (kind === "finance") return [object.kind || "transaction", object.category || "", Math.round(Number(object.amount || 0))].filter(Boolean).join(" / ");
  if (kind === "goal") return [object.status || "active", object.targetDate || ""].filter(Boolean).join(" / ");
  if (kind === "habit") return [object.frequency || "daily", object.checkins && object.checkins[todayKey()] ? "checked today" : "open today"].join(" / ");
  if (kind === "saved-search") return ["saved search", object.query || "", (object.resultCount || 0) + " matches"].join(" / ");
  if (kind === "chat-message") return [object.role || "owner", object.createdAt || "", object.proposalId ? "proposal-linked" : ""].filter(Boolean).join(" / ");
  if (kind === "provider-run") return [object.kind || "run", object.status || ""].filter(Boolean).join(" / ");
  if (kind === "flow-run" || kind === "agent") return [object.status || "dry-run", object.updatedAt || object.createdAt || ""].filter(Boolean).join(" / ");
  if (kind === "channel") return [object.kind || "channel", object.view || "", object.status || ""].filter(Boolean).join(" / ");
  if (kind === "system") return [object.kind || "system", object.health || "", (object.entities || []).length + " entities"].filter(Boolean).join(" / ");
  if (kind === "project") return [object.status || "active", object.nextAction || ""].filter(Boolean).join(" / ");
  if (kind === "model-profile") return [object.kind || "model", object.status || "", object.endpoint || "owner-provided"].filter(Boolean).join(" / ");
  if (kind === "smart-home-device") return [object.room || "home", object.status || "manual", object.provider || "manual"].filter(Boolean).join(" / ");
  if (kind === "marketplace-pack" || kind === "installed-pack") return [object.kind || object.installMode || "pack", object.status || ""].filter(Boolean).join(" / ");
  if (kind === "design-profile") return [object.mode || "dashboard", object.status || ""].filter(Boolean).join(" / ");
  if (kind === "database") return [(object.fields || []).length + " fields", (object.views || []).join(", ")].filter(Boolean).join(" / ");
  if (kind === "screen-session") return [object.status || "permission-required", object.scope || "screen"].filter(Boolean).join(" / ");
  if (kind === "twin-snapshot") return [object.status || "local-snapshot", object.summary || ""].filter(Boolean).join(" / ");
  return [object.status || "", object.updatedAt || object.createdAt || ""].filter(Boolean).join(" / ") || kind;
}

function graphEdgeReasonLabel(label) {
  const key = String(label || "linked");
  const productBrainReason = productBrainEdgeReason(key);
  if (productBrainReason) return productBrainReason;
  if (key === "saved-search-anchor") return "Сохраненный поиск привязан к активному артефакту";
  if (key === "saved-search-match") return "Сохраненный поиск нашел этот артефакт по запросу";
  const dictionary = {
    "source-note": "Источник породил заметку в библиотеке",
    "chat-note": "Сообщение чата связано с активным артефактом",
    "chat-source": "Сообщение чата связано с источником",
    "chat-proposal": "Сообщение чата стало предложением действия",
    "task-source": "Задача создана из этого источника",
    "task-note": "Задача привязана к заметке артефакта",
    "task-goal": "Задача двигает связанную цель",
    "plan-source": "Календарный блок создан из источника",
    "plan-note": "Календарный блок привязан к заметке",
    "reminder-source": "Напоминание создано из источника",
    "reminder-note": "Напоминание связано с заметкой",
    "habit-source": "Привычка создана из источника",
    "habit-note": "Привычка связана с заметкой",
    "goal-note": "Цель привязана к заметке",
    "finance-source": "Финансовая запись создана из источника",
    "finance-note": "Финансовая запись связана с заметкой",
    "finance-account": "Транзакция влияет на счет",
    "subscription-source": "Подписка создана из источника",
    "subscription-note": "Подписка связана с заметкой",
    "budget-source": "Бюджет создан из источника",
    "budget-note": "Бюджет связан с заметкой",
    "insight-source": "Инсайт извлечен из источника",
    "insight-note": "Инсайт связан с заметкой",
    "claim-source": "Утверждение подкреплено источником",
    "claim-note": "Утверждение связано с заметкой",
    "question-source": "Вопрос возник из источника",
    "question-note": "Вопрос связан с заметкой",
    "review-source": "Review item создан из источника",
    "review-note": "Review item связан с заметкой",
    "reading-source": "Reading item хранит источник книги/текста",
    "reading-note": "Reading item связан с заметкой",
    "highlight-reading": "Highlight принадлежит reading item",
    "highlight-source": "Highlight подкреплен источником",
    "highlight-note": "Highlight связан с заметкой",
    "proposal-source": "Предложение создано из источника",
    "proposal-note": "Предложение связано с заметкой",
    "agent-source": "Agent dry-run читал источник",
    "agent-note": "Agent dry-run привязан к заметке",
    "flow-source": "Flow dry-run использовал источник",
    "flow-note": "Flow dry-run привязан к заметке",
    "flow-proposal": "Flow dry-run создал proposal",
    "provider-source": "Provider run связан с источником",
    "provider-note": "Provider run связан с заметкой",
    "transcript-source": "Фрагмент transcript относится к аудио-источнику",
    "transcript-note": "Фрагмент transcript связан с заметкой",
    "checkpoint-source": "Checkpoint относится к аудио-источнику",
    "checkpoint-note": "Checkpoint связан с заметкой",
    "player-note-source": "Заметка плеера создана из аудио-источника",
    "player-note-note": "Заметка плеера связана с основной заметкой",
    "player-note-segment": "Заметка плеера основана на фрагменте transcript",
    "channel-note": "Канал описан как артефакт и виден в базе",
    "system-note": "Система имеет контракт-артефакт",
    "system-installed-pack": "Система создана из установленного local pack",
    "record-system": "Запись принадлежит пользовательской системе",
    "record-note": "Запись связана с заметкой артефакта",
    "project-note": "Проект имеет рабочий артефакт",
    "project-item-project": "Пункт принадлежит проекту",
    "project-item-note": "Пункт проекта привязан к артефакту проекта",
    "pack-note": "Marketplace pack описан локальным артефактом",
    "install-pack": "Install receipt связан с исходным pack",
    "install-system": "Install receipt создал system definition",
    "install-note": "Install receipt связан с артефактом системы",
    "database-note": "База данных описана артефактом",
    "database-row-database": "Строка принадлежит пользовательской базе",
    "database-row-note": "Строка связана с артефактом базы",
    "model-note": "Model route имеет прозрачный паспорт",
    "device-note": "Устройство умного дома описано артефактом",
    "home-event-device": "Событие пришло от устройства",
    "home-event-note": "Событие связано с артефактом устройства",
    "screen-note": "Screen session привязан к активному артефакту",
    "twin-note": "Twin snapshot сохранён как локальный recovery artifact"
  };
  return dictionary[key] || ("Явная ссылка или wikilink: " + key);
}

function graphNodeTypeLabel(type) {
  const key = String(type || "");
  if (key.includes("product-brain")) return "Product Brain";
  if (key.includes("source")) return "источник";
  if (key.includes("task")) return "задача";
  if (key.includes("plan") || key.includes("reminder")) return "календарь";
  if (key.includes("finance") || key === "budget" || key === "subscription") return "деньги";
  if (key.includes("habit")) return "привычка";
  if (key.includes("goal")) return "цель";
  if (["claim", "question", "review", "reading", "highlight", "insight"].includes(key)) return "знание";
  if (["channel", "system", "system-record", "project", "project-item", "marketplace-pack", "installed-pack", "database", "database-row", "design-profile", "twin-snapshot"].includes(key)) return "система";
  if (key.includes("model") || key.includes("screen")) return "ИИ / permission gate";
  if (key.includes("smart-home")) return "умный дом";
  if (key.includes("agent") || key.includes("flow") || key.includes("provider")) return "dry-run";
  if (key.includes("audio") || key.includes("transcript") || key.includes("player")) return "медиа";
  if (key === "ghost") return "ghost link";
  return key || "узел";
}

function graphLinkedEdges(graph, nodeId) {
  if (!nodeId) return [];
  return graph.links.filter((link) => link.source === nodeId || link.target === nodeId).slice(0, 12);
}

function graphConnectionSummary(graph, nodeId) {
  const edges = graph.links.filter((link) => link.source === nodeId || link.target === nodeId);
  const incoming = edges.filter((link) => link.target === nodeId).length;
  const outgoing = edges.filter((link) => link.source === nodeId).length;
  const reasonCount = new Set(edges.map((edge) => edge.label || "linked")).size;
  return { edges, incoming, outgoing, reasonCount };
}

function graphSearchReason(node, query) {
  if (!query) return "Вес узла " + String(node.val || 0);
  const hayTitle = normalizeTitle(node.label || "");
  const hayType = normalizeTitle(node.type || "");
  if (hayTitle.includes(query)) return "Совпало название";
  if (hayType.includes(query)) return "Совпал тип";
  return "Связан с найденным узлом";
}

function renderGraphResults(state, graph) {
  const query = normalizeTitle((state.graphView || {}).searchQuery || "");
  const nodes = graph.nodes.slice().sort((a, b) => (b.val || 0) - (a.val || 0)).slice(0, 10);
  if (!nodes.length) return "<div class=\"empty compact\" data-testid=\"graph-empty\">Нет узлов графа под текущие фильтры.</div>";
  return [
    "<div class=\"graph-results\" data-testid=\"graph-results\">",
    nodes.map((node) => [
      "<button class=\"graph-result-row\" data-action=\"focus-graph-node\" data-id=\"" + escapeHtml(node.id) + "\" data-testid=\"graph-result-row\">",
      "<strong>" + escapeHtml(node.label) + "</strong>",
      "<span>" + escapeHtml(graphNodeTypeLabel(node.type)) + " / " + escapeHtml(graphSearchReason(node, query)) + "</span>",
      "</button>"
    ].join("")).join(""),
    "</div>"
  ].join("");
}

function renderGraphInspector(state, graph) {
  const selectedId = state.graphView.selectedNodeId || state.activeNoteId;
  const node = graph.nodes.find((item) => item.id === selectedId) || graph.nodes[0] || null;
  const resolved = graphNodeObject(state, node ? node.id : selectedId);
  const kind = resolved ? resolved.kind : (node ? node.type : "none");
  const object = resolved ? resolved.object : null;
  const title = graphNodeTitle(kind, object, node ? node.label : "No node selected");
  const meta = graphNodeMeta(kind, object);
  const workspace = graphNodeWorkspace(kind, object);
  const edges = graphLinkedEdges(graph, node ? node.id : selectedId);
  const summary = graphConnectionSummary(graph, node ? node.id : selectedId);
  return [
    "<aside class=\"graph-inspector\" data-testid=\"graph-inspector\">",
    "<div class=\"section-title\">Выбранный узел</div>",
    "<div class=\"graph-node-card\">",
    "<strong data-testid=\"graph-selected-title\">" + escapeHtml(title) + "</strong>",
    "<span>" + escapeHtml(kind) + " / " + escapeHtml(meta) + "</span>",
    "<div class=\"graph-node-actions\">",
    "<button data-action=\"open-graph-node\" data-id=\"" + escapeHtml(node ? node.id : selectedId) + "\" data-testid=\"graph-open-node\">Открыть</button>",
    "<button data-action=\"focus-graph-node\" data-id=\"" + escapeHtml(node ? node.id : selectedId) + "\" data-testid=\"graph-focus-local\">Локально</button>",
    "<button data-action=\"set-surface\" data-id=\"control\" data-testid=\"graph-open-control\">Контроль</button>",
    "</div>",
    "<em>Рабочее место: " + escapeHtml(workspace) + "</em>",
    "</div>",
    "<div class=\"graph-connection-summary\" data-testid=\"graph-connection-summary\">",
    "<div><span>Связей</span><strong>" + summary.edges.length + "</strong></div>",
    "<div><span>Входящие</span><strong>" + summary.incoming + "</strong></div>",
    "<div><span>Исходящие</span><strong>" + summary.outgoing + "</strong></div>",
    "<div><span>Причин</span><strong>" + summary.reasonCount + "</strong></div>",
    "</div>",
    "<div class=\"graph-edge-list\" data-testid=\"graph-edge-list\">",
    edges.length ? edges.map((edge) => {
      const currentId = node ? node.id : selectedId;
      const otherId = edge.source === currentId ? edge.target : edge.source;
      const otherNode = graph.nodes.find((item) => item.id === otherId);
      const direction = edge.source === currentId ? "исходит к" : "входит от";
      return [
        "<button class=\"graph-edge-row\" data-action=\"focus-graph-node\" data-id=\"" + escapeHtml(otherId) + "\" data-testid=\"graph-edge-row\">",
        "<span>Причина: " + escapeHtml(graphEdgeReasonLabel(edge.label)) + "</span>",
        "<strong>" + escapeHtml(otherNode ? otherNode.label : otherId) + "</strong>",
        "<em>" + escapeHtml(direction + " / " + graphNodeTypeLabel(otherNode ? otherNode.type : "")) + "</em>",
        "</button>"
      ].join("");
    }).join("") : "<div class=\"empty compact\">У этого узла нет видимых связей под текущие фильтры.</div>",
    "</div>",
    "</aside>"
  ].join("");
}

function renderGraphWorkbench(state) {
  const graph = mapGraph(state);
  const canvasGraph = graphForCanvas(graph, state);
  const mode = state.graphView.mode === "local" ? "local" : "global";
  return [
    "<section class=\"graph-workbench graph-canvas\" data-testid=\"graph-workbench\">",
    "<div class=\"graph-head\" data-testid=\"workspace-hero-graph\">",
    "<div><span class=\"section-title\">Граф</span><h2>Карта артефактов</h2><p>Кликни узел, включи локальный режим, ищи по названию и открывай объект в его рабочем месте.</p></div>",
    "<div class=\"graph-counts\" data-testid=\"graph-counts\">" + graph.nodes.length + " узлов / " + graph.links.length + " связей</div>",
    "</div>",
    canvasGraph.limited ? "<div class=\"graph-large-mode\" data-testid=\"graph-large-vault-mode\"><strong>Режим большого хранилища</strong><span>Canvas показывает " + canvasGraph.canvasNodeCount + " из " + canvasGraph.fullNodeCount + " узлов и " + canvasGraph.canvasLinkCount + " из " + canvasGraph.fullLinkCount + " связей. Поиск, фильтры и инспектор работают по полному графу.</span></div>" : "",
    "<div class=\"graph-toolbar\">",
    "<div class=\"segmented-control\" data-testid=\"graph-mode\">",
    "<button class=\"" + (mode === "global" ? "active" : "") + "\" data-action=\"set-graph-mode\" data-id=\"global\" data-testid=\"graph-mode-global\">Все</button>",
    "<button class=\"" + (mode === "local" ? "active" : "") + "\" data-action=\"set-graph-mode\" data-id=\"local\" data-testid=\"graph-mode-local\">Локально</button>",
    "</div>",
    "<label class=\"graph-search-label\"><span>Поиск</span><input id=\"graph-search\" data-testid=\"graph-search\" autocomplete=\"off\" aria-label=\"Поиск по графу\" value=\"" + escapeHtml(state.graphView.searchQuery || "") + "\"></label>",
    "<button data-action=\"clear-graph-search\" data-testid=\"clear-graph-search\">Сбросить</button>",
    "</div>",
    renderGraphFilters(state),
    "<div class=\"graph-layout\">",
    "<div class=\"graph-canvas-shell\"><canvas id=\"graph-canvas\" data-testid=\"graph-canvas\" aria-label=\"Force directed LifeOS graph\"></canvas></div>",
    "<div class=\"graph-side\">",
    renderGraphInspector(state, graph),
    renderGraphResults(state, graph),
    "</div>",
    "</div>",
    "</section>"
  ].join("");
}

function renderEditor(state, note) {
  if (state.activeSurface === "inbox") {
    return [
      "<main class=\"editor-pane command-pane\">",
      renderCommandCenterV5(state, note),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "capture") {
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderInboxReviewWorkspace(state),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "graph") {
    return [
      "<main class=\"editor-pane surface-pane graph-surface-pane\">",
      renderGraphWorkbench(state),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "graph") {
    const graph = mapGraph(state);
    return [
      "<main class=\"editor-pane\">",
      renderCaptureCockpit(state),
      "<section class=\"graph-workbench\">",
      "<div class=\"card-head\"><h2>Граф</h2><span>карта workspace</span></div>",
      "<div class=\"graph-counts\" data-testid=\"graph-counts\">" + graph.nodes.length + " nodes / " + graph.links.length + " links</div>",
      renderGraphFilters(state),
      "<canvas id=\"graph-canvas\" data-testid=\"graph-canvas\" aria-label=\"Force directed LifeOS graph\"></canvas>",
      "</section>",
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "today") {
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderTodayWorkspace(state, note),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "calendar") {
    const days = calendarDays(state);
    const hero = renderWorkspaceHero(
      "calendar",
      "Календарь",
      "Неделя как план, а не таблица задач",
      "Задачи и напоминания становятся блоками времени: их можно редактировать, переносить и открывать в Контроле.",
      [
        ["Дней", String(days.length)],
        ["Сегодня", String(calendarItemsWithReminders(state, days[0] || { key: todayKey(), tasks: [], plans: [] }).length)],
        ["Без времени", String(Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done" && !task.startTime).length)],
        ["Просрочено", String(Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done" && task.day < todayKey()).length)]
      ],
      "<button data-action=\"quick-task\" data-testid=\"quick-task\">Новая задача</button><button data-action=\"set-surface\" data-id=\"today\">Мой день</button>"
    );
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderSurfaceWorkspace("calendar", hero, renderCalendarWorkbench(state)),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "finance") {
    const summary = financeSummary(state);
    const hero = renderWorkspaceHero(
      "finance",
      "Финансы",
      "Деньги как спокойная рабочая панель",
      "Баланс, бюджеты, транзакции, подписки и скрины чеков связаны с источниками, графом и контролем.",
      [
        ["Баланс", Math.round(summary.balance) + " ₽"],
        ["Сегодня", Math.round(summary.todaySpend) + " ₽"],
        ["Месяц", Math.round(summary.monthSpend) + " ₽"],
        ["Подписки", String(summary.subscriptions)]
      ],
      "<button data-action=\"quick-expense\" data-testid=\"quick-expense\">Быстрый расход</button><button data-action=\"import-file\" data-testid=\"capture-import\">Скрин чека</button>"
    );
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderSurfaceWorkspace("finance", hero, renderFinancePanel(state)),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "habits" || state.activeSurface === "goals") {
    const today = ownerTodaySummary(state);
    const goalCount = Object.values(state.goals || {}).filter((goal) => !goal.deleted).length;
    const hero = renderWorkspaceHero(
      "goals",
      "Привычки, цели и баланс",
      "Ритм, восстановление и следующий шаг",
      "Привычки и цели живут рядом с сегодняшним днём, деньгами, знаниями и колесом баланса, а не как отдельные формы.",
      [
        ["Привычки", today.habitDone + "/" + today.habitTotal],
        ["Цели", String(goalCount)],
        ["Повторение", String(Object.values(state.reviewItems || {}).filter((item) => !item.deleted && item.status !== "done").length)],
        ["Инсайты", String(Object.values(state.insights || {}).filter((item) => item.status === "open").length)]
      ],
      "<button data-action=\"quick-habit\" data-testid=\"quick-habit\">Новая привычка</button><button data-action=\"set-surface\" data-id=\"today\">Сегодня</button>"
    );
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderSurfaceWorkspace("goals", hero, renderHabitsGoalsPanel(state)),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "chat") {
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderChatWorkspace(state),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "agents" || state.activeSurface === "flows") {
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderAgentsWorkspace(state),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "player") {
    const audios = Object.values(state.sources || {}).filter((source) => !source.deleted && source.kind === "audio");
    const hero = renderWorkspaceHero(
      "player",
      "Голос и аудио",
      "Аудио становится знанием",
      "Плеер, ручная расшифровка, закладки и действия из фрагмента создают связанные задачи, выводы и цитаты.",
      [
        ["Аудио", String(audios.length)],
        ["Фрагменты", String(Object.values(state.transcriptSegments || {}).filter((item) => !item.deleted).length)],
        ["Закладки", String(Object.values(state.audioCheckpoints || {}).filter((item) => !item.deleted).length)],
        ["STT", humanStatus((state.providers.stt || {}).status || "not-configured")]
      ],
      "<button data-action=\"import-audio\" data-testid=\"player-import-audio\">Открыть аудио</button><button data-action=\"set-surface\" data-id=\"providers\">Настроить STT</button>"
    );
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderSurfaceWorkspace("player", hero, renderPlayerPanel(state)),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "mail") {
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderCaptureCockpit(state),
      renderProviderPanelV2(state),
      renderChatPanel(state),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "providers") {
    const providerRows = Object.values(state.providers || {});
    const hero = renderWorkspaceHero(
      "providers",
      "Подключения",
      "Паспорт локальных и внешних движков",
      "Каждое подключение показывает статус, локальную замену, границу данных, отключение и историю проверок.",
      [
        ["Подключения", String(providerRows.length)],
        ["Ollama", humanStatus(state.ollama.status || "unchecked")],
        ["Ждут настройки", String(providerRows.filter((provider) => /not-connected|not-configured|needs-owner/.test(provider.status || "")).length)],
        ["Проверки", String(Object.values(state.providerRuns || {}).length)]
      ],
      "<button data-action=\"probe-ollama\" data-testid=\"hero-probe-ollama\">Проба Ollama</button><button data-action=\"set-surface\" data-id=\"control\">Права</button>"
    );
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderSurfaceWorkspace("providers", hero, renderProviderPanelV2(state) + renderPwaPanel(state) + renderOllamaPanel(state)),
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "control") {
    const hero = renderWorkspaceHero(
      "control",
      "Контроль",
      "Данные, аудит и восстановление",
      "Последние изменения, экспорт, архив, откат, хранилище и разрешения подключений собраны в одном месте.",
      [
        ["Следы", String(state.auditLog.length)],
        ["Откаты", String((state.control.rollbackSnapshots || []).length)],
        ["Источники", String(Object.values(state.sources || {}).filter((item) => !item.deleted).length)],
        ["Связи", String(mapGraph(state).links.length)]
      ],
      "<button data-action=\"export-vault\" data-testid=\"export-vault\">Экспорт</button><button data-action=\"create-rollback-snapshot\" data-testid=\"hero-rollback-snapshot\">Снимок отката</button>"
    );
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderSurfaceWorkspace("control", hero, renderDataControlPanel(state)),
      "<section class=\"info-panel\"><div class=\"section-title\">Последние изменения</div>" + renderAudit(state) + "</section>",
      "</main>"
    ].join("");
  }
  if (state.activeSurface === "reader") {
    return [
      "<main class=\"editor-pane surface-pane\">",
      renderReaderWorkspace(state, note),
      "</main>"
    ].join("");
  }
  if (!note) {
    return [
      "<main class=\"editor-pane\">",
      renderCaptureCockpit(state),
      "<div class=\"empty big\">Добавь первый вход, чтобы запустить локальную базу.</div>",
      "</main>"
    ].join("");
  }
  const folderOptions = Object.values(state.folders).sort((a, b) => a.name.localeCompare(b.name)).map((folder) => {
    const selected = folder.id === note.folderId ? " selected" : "";
    return "<option value=\"" + escapeHtml(folder.id) + "\"" + selected + ">" + escapeHtml(folder.name) + "</option>";
  }).join("");
  return [
    "<main class=\"editor-pane surface-pane library-surface-pane\">",
    renderSurfaceWorkspace("library", renderWorkspaceHero(
      "library",
      "База знаний",
      "Заметки с обратными связями",
      "Заметки, пространства, markdown-ссылки, выводы, вопросы, повторение и карточки знаний живут в одном графе.",
      [
        ["Ссылки", String(note.links.length)],
        ["Обратные", String(incomingBacklinks(state, note.id).length)],
        ["Выводы", String(Object.values(state.claims || {}).filter((item) => !item.deleted && item.noteId === note.id).length)],
        ["Повторение", String(Object.values(state.reviewItems || {}).filter((item) => !item.deleted && item.noteId === note.id).length)]
      ],
      "<button data-action=\"extract-knowledge\" data-testid=\"hero-extract-knowledge\">Извлечь знание</button><button data-action=\"set-surface\" data-id=\"reader\">Чтение</button>"
    ), renderKnowledgeWorkbench(state, note) + renderBookWorkbench(state, note)),
    "<div class=\"note-header\">",
    "<div>",
    "<label for=\"note-title\">Название</label>",
    "<input id=\"note-title\" data-testid=\"note-title\" value=\"" + escapeHtml(note.title) + "\" autocomplete=\"off\">",
    "</div>",
    "<div>",
    "<label for=\"note-folder\">Папка</label>",
    "<select id=\"note-folder\" data-testid=\"note-folder\">" + folderOptions + "</select>",
    "</div>",
    "<button data-action=\"delete-note\" class=\"danger\" data-id=\"" + escapeHtml(note.id) + "\" data-testid=\"delete-note\">Удалить</button>",
    "</div>",
    "<div class=\"editor-grid\">",
    "<section class=\"editor-card\">",
    "<div class=\"card-head\"><h2>Редактор</h2><span id=\"live-link-count\">" + note.links.length + " ссылок</span></div>",
    "<textarea id=\"note-body\" data-testid=\"note-body\" spellcheck=\"true\">" + escapeHtml(note.body) + "</textarea>",
    "</section>",
    "<section class=\"preview-card\">",
    "<div class=\"card-head\"><h2>Preview</h2><span>" + incomingBacklinks(state, note.id).length + " backlinks</span></div>",
    "<div id=\"markdown-preview\" class=\"markdown-preview\" data-testid=\"markdown-preview\">" + renderMarkdown(note.body, state) + "</div>",
    "</section>",
    "</div>",
    "</main>"
  ].join("");
}

function renderCaptureCockpit(state) {
  const openProposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").length;
  const providerMail = state.providers && state.providers.mail ? state.providers.mail.status : "not-connected";
  return [
    "<section class=\"capture-cockpit compact-capture\" data-testid=\"capture-cockpit\">",
    "<div class=\"capture-main\">",
    "<div class=\"capture-title\"><strong>Быстрый вход</strong><span>текст / файл / аудио / книга</span></div>",
    "<textarea id=\"capture-input\" data-testid=\"capture-input\" spellcheck=\"true\">" + escapeHtml(state.captureDraft || "") + "</textarea>",
    "<div class=\"capture-actions\">",
    "<button data-action=\"capture-text\" class=\"primary\" data-testid=\"capture-text\">Разобрать</button>",
    "<button data-action=\"run-flow\" data-testid=\"run-flow\">Flow</button>",
    "<button data-action=\"run-agent-active\" data-testid=\"run-agent-active\">Agent</button>",
    "<button data-action=\"clear-capture\" data-testid=\"clear-capture\">Очистить</button>",
    "</div>",
    "</div>",
    "<div class=\"capture-status\">",
    "<button data-action=\"import-file\" data-testid=\"capture-import\">Файл</button>",
    "<div><span>Действия</span><strong data-testid=\"proposal-count\">" + openProposals + "</strong></div>",
    "<div><span>Почта</span><strong>" + escapeHtml(providerMail) + "</strong></div>",
    "<div><span>Экран</span><strong>" + escapeHtml(state.activeSurface) + "</strong></div>",
    "</div>",
    "</section>"
  ].join("");
}

function renderInspector(state, note) {
  if (["inbox", "capture", "graph", "control", "providers"].includes(state.activeSurface)) return "";
  const graph = mapGraph(state);
  const backlinks = note ? incomingBacklinks(state, note.id) : [];
  const outlinks = note ? outgoingLinks(state, note) : [];
  const selectedNode = state.graphView.selectedNodeId;
  const selectedGhost = selectedNode && state.ghosts[selectedNode] ? state.ghosts[selectedNode] : null;
  const activeSource = latestSource(state);
  const selected = selectedNode ? graphNodeObject(state, selectedNode) : null;
  const selectedTitle = selected ? graphNodeTitle(selected.kind, selected.object, selectedNode) : (activeSource ? activeSource.name : note ? note.title : "нет активного объекта");
  const graphPanel = [
    "<section class=\"graph-panel\">",
    "<div class=\"card-head\"><h2>Локальные связи</h2><span data-testid=\"graph-counts\">" + graph.nodes.length + " nodes · " + graph.links.length + " edges</span></div>",
    renderGraphFilters(state),
    "<canvas id=\"graph-canvas\" data-testid=\"graph-canvas\" aria-label=\"Force directed note graph\"></canvas>",
    "</section>"
  ].join("");
  const proposalRows = activeSource
    ? Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open" && proposal.sourceId === activeSource.id).slice(0, 4)
    : [];
  const proposalPanel = proposalRows.length ? [
    "<section class=\"info-panel compact-context-panel\" data-testid=\"context-proposals\">",
    "<div class=\"section-title\">Предложения артефакта</div>",
    proposalRows.map((proposal) => "<div class=\"audit-row\"><strong>" + escapeHtml(proposalGroupLabel(proposal.group || groupForProposalType(proposal.type))) + "</strong><span>" + escapeHtml(shorten(proposal.title, 92)) + "</span></div>").join(""),
    "<button data-action=\"set-surface\" data-id=\"capture\">Разобрать очередь</button>",
    "</section>"
  ].join("") : "";
  const auditTrail = state.auditLog.slice(-4).reverse().map((entry) => {
    return "<div class=\"audit-row\"><strong>" + escapeHtml(entry.type) + "</strong><span>" + escapeHtml(shorten(entry.summary, 98)) + "</span></div>";
  }).join("");
  return [
    "<aside class=\"inspector contextual-inspector\" data-testid=\"context-inspector\">",
    "<section class=\"info-panel active-context-card\" data-testid=\"active-context-card\">",
    "<div class=\"section-title\">Контекст</div>",
    "<strong>" + escapeHtml(selectedTitle) + "</strong>",
    "<span>" + escapeHtml(activeSource ? [activeSource.kind, activeSource.status, activeSource.parserStatus].filter(Boolean).join(" / ") : "workspace projection") + "</span>",
    "<div class=\"context-actions\"><button data-action=\"set-surface\" data-id=\"graph\">Показать связи</button><button data-action=\"set-surface\" data-id=\"control\">Контроль</button></div>",
    "</section>",
    graphPanel,
    proposalPanel,
    "<section class=\"info-panel\" id=\"link-panels\">",
    renderBacklinkPanel(backlinks),
    renderOutlinkPanel(outlinks, state),
    state.activeSurface === "library" ? renderGhostPanel(state, selectedGhost) : "",
    "</section>",
    renderSourcePanel(state, note),
    state.activeSurface === "library" ? renderLibraryControlTrail(state, note) : "",
    "<section class=\"info-panel compact-context-panel\"><div class=\"section-title\">Последние изменения</div>" + (auditTrail || "<div class=\"empty compact\">Пока нет изменений.</div>") + "</section>",
    "</aside>"
  ].join("");
}

function renderBacklinkPanel(backlinks) {
  return [
    "<div class=\"section-title\">Backlinks</div>",
    backlinks.length ? backlinks.map((note) => {
      return "<button class=\"link-row\" data-action=\"open-note\" data-id=\"" + escapeHtml(note.id) + "\">" + escapeHtml(note.title) + "</button>";
    }).join("") : "<div class=\"empty compact\">No incoming links.</div>"
  ].join("");
}

function renderOutlinkPanel(outlinks, state) {
  return [
    "<div class=\"section-title\">Outgoing</div>",
    outlinks.length ? outlinks.map((link) => {
      const id = link.targetId || link.ghostId;
      const action = link.targetId ? "open-note" : "create-from-ghost";
      const kind = link.targetId ? "resolved" : "ghost";
      return "<button class=\"link-row " + kind + "\" data-action=\"" + action + "\" data-id=\"" + escapeHtml(id) + "\">" + escapeHtml(link.targetTitle) + "</button>";
    }).join("") : "<div class=\"empty compact\">No outgoing links.</div>",
  ].join("");
}

function renderGhostPanel(state, selectedGhost) {
  const ghosts = Object.values(state.ghosts).sort((a, b) => b.inboundNoteIds.length - a.inboundNoteIds.length);
  return [
    "<div class=\"section-title\">Ghost nodes</div>",
    selectedGhost ? "<div class=\"ghost-focus\"><strong>" + escapeHtml(selectedGhost.title) + "</strong><span>" + selectedGhost.inboundNoteIds.length + " references</span></div>" : "",
    ghosts.length ? ghosts.map((ghost) => {
      return "<button class=\"link-row ghost\" data-action=\"create-from-ghost\" data-id=\"" + escapeHtml(ghost.id) + "\">" + escapeHtml(ghost.title) + "<span>" + ghost.inboundNoteIds.length + "</span></button>";
    }).join("") : "<div class=\"empty compact\">No broken wikilinks.</div>"
  ].join("");
}

function renderLibraryControlTrail(state, note) {
  const noteId = note ? note.id : "";
  const counts = [
    ["claims", Object.values(state.claims || {}).filter((item) => !item.deleted && item.noteId === noteId).length],
    ["questions", Object.values(state.questions || {}).filter((item) => !item.deleted && item.noteId === noteId).length],
    ["review", Object.values(state.reviewItems || {}).filter((item) => !item.deleted && item.noteId === noteId).length],
    ["sources", Object.values(state.sources || {}).filter((item) => !item.deleted && item.noteId === noteId).length]
  ];
  const trail = state.auditLog.filter((entry) => !noteId || entry.noteId === noteId).slice(-5).reverse();
  return [
    "<section class=\"info-panel workflow-panel library-control-trail\" data-testid=\"library-control-trail\">",
    "<div class=\"section-title\">Control trail</div>",
    "<div class=\"storage-map\">" + counts.map((row) => "<span>" + escapeHtml(row[0]) + " <strong>" + row[1] + "</strong></span>").join("") + "</div>",
    trail.length ? trail.map((entry) => "<div class=\"audit-row\"><strong>" + escapeHtml(entry.type) + "</strong><span>" + escapeHtml(shorten(entry.summary, 110)) + "</span></div>").join("") : "<div class=\"empty compact\">Control trail ждет действий по заметке.</div>",
    "<button data-action=\"set-surface\" data-id=\"control\" data-testid=\"library-open-control\">Открыть контроль</button>",
    "</section>"
  ].join("");
}

function renderProposalPanelV2(state, filterSourceId) {
  const proposals = Object.values(state.proposals || {})
    .filter((proposal) => proposal.status === "open")
    .filter((proposal) => !filterSourceId || proposal.sourceId === filterSourceId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const recommended = chooseRecommendedProposal(proposals);
  const groups = PROPOSAL_GROUPS.map((group) => {
    const rows = proposals.filter((proposal) => (proposal.group || groupForProposalType(proposal.type)) === group[0]);
    return { key: group[0], label: group[1], rows };
  }).filter((group) => group.rows.length);
  const groupsHtml = groups.length ? groups.map((group) => {
    return [
      "<div class=\"proposal-group\" data-testid=\"proposal-group\" data-group=\"" + escapeHtml(group.key) + "\">",
      "<h3>" + escapeHtml(group.label) + "</h3>",
      group.rows.map((proposal) => renderProposalCard(proposal, proposals.length)).join(""),
      "</div>"
    ].join("");
  }).join("") : "";
  return [
    "<section class=\"proposal-workbench\" data-testid=\"proposal-panel\">",
    "<div class=\"proposal-head\">",
    "<div><span class=\"section-title\">Разбор LifeOS</span><strong>" + proposals.length + " предложений</strong></div>",
    "<button data-action=\"" + (filterSourceId ? "apply-source-proposals" : "apply-all-proposals") + "\" data-id=\"" + escapeHtml(filterSourceId || "") + "\" class=\"primary\" data-testid=\"apply-all-proposals\"" + (proposals.length ? "" : " disabled") + ">Принять всё</button>",
    "</div>",
    recommended ? renderRecommendedProposal(recommended) : "",
    groups.length ? (recommended ? "<details class=\"proposal-secondary-details\" data-testid=\"proposal-details\"><summary>Детали разбора и дополнительные предложения</summary>" + groupsHtml + "</details>" : groupsHtml) : "<div class=\"empty compact\">Сначала вставь текст или файл. LifeOS покажет понятные draft-карточки перед изменениями.</div>",
    "</section>"
  ].join("");
}

function renderProposalFieldList(fields) {
  const entries = Object.entries(fields || {}).filter((entry) => entry[1] !== "" && entry[1] !== null && entry[1] !== undefined);
  if (!entries.length) return "";
  return "<dl class=\"proposal-fields\">" + entries.slice(0, 6).map(([key, value]) => {
    return "<div><dt>" + escapeHtml(key) + "</dt><dd>" + escapeHtml(Array.isArray(value) ? value.join(", ") : String(value)) + "</dd></div>";
  }).join("") + "</dl>";
}

function proposalNeedsOwnerChoice(proposal) {
  const fields = proposal && proposal.fields && typeof proposal.fields === "object" ? proposal.fields : {};
  return Boolean(fields.timeAmbiguous || fields.needsOwnerChoice);
}

function proposalApplyLabel(proposal, visibleCount) {
  if (proposalNeedsOwnerChoice(proposal)) return "Уточнить время";
  if (visibleCount === 1 && (proposal.type === "task" || proposal.type === "calendar" || proposal.type === "plan")) {
    const fields = proposal.fields && typeof proposal.fields === "object" ? proposal.fields : {};
    const day = fields.day || "";
    const time = fields.startTime || fields.time || "";
    const dayLabel = day === dateKeyFromOffset(1) ? "на завтра" : day === todayKey() ? "на сегодня" : day ? "на " + day : "";
    return "Создать задачу" + (dayLabel ? " " + dayLabel : "") + (time ? " " + time : "");
  }
  if (proposal.type === "finance_expense") return "Сохранить расход";
  return "Принять";
}

function chooseRecommendedProposal(proposals) {
  const rows = Array.isArray(proposals) ? proposals : [];
  const mutationTypes = new Set(["task", "calendar", "plan", "reminder"]);
  const supportTypes = new Set(["knowledge", "chat", "control", "agent"]);
  const mutating = rows.filter((proposal) => !supportTypes.has(proposal.type));
  if (!mutating.length || !mutating.every((proposal) => mutationTypes.has(proposal.type))) return null;
  const scheduledTask = mutating.find((proposal) => {
    const fields = proposal.fields && typeof proposal.fields === "object" ? proposal.fields : {};
    return proposal.type === "task" && (fields.day || fields.startTime || fields.time);
  });
  if (scheduledTask) return scheduledTask;
  return mutating.find((proposal) => proposal.type === "task") || mutating.find((proposal) => proposal.type === "calendar") || mutating[0] || null;
}

function renderRecommendedProposal(proposal) {
  if (!proposal) return "";
  const fields = proposal.fields && typeof proposal.fields === "object" ? proposal.fields : {};
  const blocked = proposalNeedsOwnerChoice(proposal);
  const meta = [
    fields.day ? "Дата: " + fields.day : "",
    fields.startTime || fields.time ? "Время: " + (fields.startTime || fields.time) : "",
    fields.timeAmbiguous ? "Нужно уточнить: " + (fields.timeOptions || []).join(" / ") : "",
    proposal.destination ? "Куда: " + proposal.destination : ""
  ].filter(Boolean);
  return [
    "<div class=\"recommended-proposal\" data-testid=\"recommended-action\">",
    "<div>",
    "<span>Рекомендуемое действие</span>",
    "<strong>" + escapeHtml(proposal.title) + "</strong>",
    meta.length ? "<p>" + escapeHtml(meta.join(" · ")) + "</p>" : "",
    "</div>",
    "<div class=\"recommended-actions\">",
    "<button class=\"primary\" data-action=\"apply-proposal\" data-id=\"" + escapeHtml(proposal.id) + "\" data-testid=\"recommended-primary-action\"" + (blocked ? " disabled title=\"" + escapeHtml(fields.ambiguityReason || fields.needsOwnerChoice || "Нужно уточнение") + "\"" : "") + ">" + escapeHtml(proposalApplyLabel(proposal, 1)) + "</button>",
    "<button data-action=\"edit-proposal\" data-id=\"" + escapeHtml(proposal.id) + "\">Изменить</button>",
    "<button data-action=\"open-proposal-control\" data-id=\"" + escapeHtml(proposal.id) + "\">Детали</button>",
    "</div>",
    "</div>"
  ].join("");
}

function renderProposalCard(proposal, visibleCount) {
  const percent = Math.round((proposal.confidence || 0) * 100);
  const blocked = proposalNeedsOwnerChoice(proposal);
  const fields = proposal.fields && typeof proposal.fields === "object" ? proposal.fields : {};
  return [
    "<article class=\"proposal-card\" data-testid=\"proposal-row\">",
    "<div class=\"proposal-card-main\">",
    "<div class=\"proposal-type\"><span>" + escapeHtml(proposal.type) + "</span><strong>" + escapeHtml(proposal.destination || destinationForProposalType(proposal.type)) + "</strong></div>",
    "<h4>" + escapeHtml(proposal.title) + "</h4>",
    "<p>" + escapeHtml(proposal.reason || "Найдено в источнике") + "</p>",
    proposal.quote ? "<blockquote>" + escapeHtml(proposal.quote) + "</blockquote>" : "",
    renderProposalFieldList(proposal.fields),
    "</div>",
    "<div class=\"proposal-actions\">",
    "<span class=\"confidence\">" + percent + "%</span>",
    "<button data-action=\"apply-proposal\" data-id=\"" + escapeHtml(proposal.id) + "\"" + (blocked ? " disabled title=\"" + escapeHtml(fields.ambiguityReason || fields.needsOwnerChoice || "Нужно уточнение") + "\"" : "") + ">" + escapeHtml(proposalApplyLabel(proposal, visibleCount || 0)) + "</button>",
    "<button data-action=\"edit-proposal\" data-id=\"" + escapeHtml(proposal.id) + "\">Изменить</button>",
    "<button data-action=\"dismiss-proposal\" data-id=\"" + escapeHtml(proposal.id) + "\">Пропустить</button>",
    "<button data-action=\"open-proposal-source\" data-id=\"" + escapeHtml(proposal.id) + "\">Источник</button>",
    "<button data-action=\"open-proposal-control\" data-id=\"" + escapeHtml(proposal.id) + "\">Связи / Контроль</button>",
    "</div>",
    "</article>"
  ].join("");
}

function renderGraphFilters(state) {
  const filters = Object.assign({ notes: true, productBrain: false, sources: true, goals: true, tasks: true, money: true, habits: true, insights: true, knowledge: true, ghosts: true }, state.graphFilters || {});
  const rows = [
    ["notes", "Заметки"],
    ["sources", "Источники"],
    ["goals", "Цели"],
    ["tasks", "Задачи"],
    ["money", "Деньги"],
    ["habits", "Привычки"],
    ["insights", "Инсайты"],
    ["knowledge", "Знания"],
    ["ghosts", "Ghost links"]
  ];
  return [
    "<div class=\"graph-filters\" data-testid=\"graph-filters\">",
    "<label><input type=\"checkbox\" data-graph-filter=\"productBrain\" data-testid=\"graph-filter-productBrain\"" + (filters.productBrain ? " checked" : "") + "> Dev / Product Brain</label>",
    rows.map((row) => {
      const checked = filters[row[0]] !== false ? " checked" : "";
      return "<label><input type=\"checkbox\" data-graph-filter=\"" + row[0] + "\" data-testid=\"graph-filter-" + row[0] + "\"" + checked + "> " + row[1] + "</label>";
    }).join(""),
    "</div>"
  ].join("");
}

function renderProposalPanel(state) {
  return renderProposalPanelV2(state);
  const proposals = Object.values(state.proposals || {}).filter((proposal) => proposal.status === "open").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 7);
  return [
    "<section class=\"info-panel workflow-panel\" data-testid=\"proposal-panel\">",
    "<div class=\"section-title\">Действия</div>",
    proposals.length ? proposals.map((proposal) => {
      return [
        "<div class=\"proposal-row\" data-testid=\"proposal-row\">",
        "<span>" + escapeHtml(proposal.title) + "</span>",
        "<button data-action=\"apply-proposal\" data-id=\"" + escapeHtml(proposal.id) + "\">Взять</button>",
        "<button data-action=\"dismiss-proposal\" data-id=\"" + escapeHtml(proposal.id) + "\">Скрыть</button>",
        "</div>"
      ].join("");
    }).join("") : "<div class=\"empty compact\">Добавь текст или файл, чтобы получить локальные действия.</div>",
    "</section>"
  ].join("");
}

function calendarDays(state) {
  const days = [];
  const start = new Date(todayKey() + "T00:00:00");
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const tasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.day === key).sort(sortScheduledItems);
    const plans = Object.values(state.planBlocks || {}).filter((block) => !block.deleted && block.day === key).sort(sortScheduledItems);
    days.push({ key, label: key.slice(5), tasks, plans });
  }
  return days;
}

function sortScheduledItems(a, b) {
  const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  if (timeDiff !== 0) return timeDiff;
  return String(a.updatedAt || "").localeCompare(String(b.updatedAt || ""));
}

function calendarItemsForDay(day) {
  return day.tasks.map((task) => Object.assign({ kind: "task" }, task))
    .concat(day.plans.map((block) => Object.assign({ kind: "plan" }, block)))
    .sort(sortScheduledItems);
}

function remindersForDay(state, dayKey) {
  return Object.values(state.reminders || {})
    .filter((reminder) => !reminder.deleted && reminder.day === dayKey)
    .map((reminder) => Object.assign({ kind: "reminder", startTime: reminder.time, endTime: "" }, reminder));
}

function calendarItemsWithReminders(state, day) {
  return calendarItemsForDay(day).concat(remindersForDay(state, day.key)).sort(sortScheduledItems);
}

function weekAgendaItems(state, days) {
  return days.flatMap((day) => calendarItemsWithReminders(state, day).map((item) => Object.assign({ dayKey: day.key }, item)))
    .filter((item) => item.status !== "done")
    .sort((a, b) => {
      const dayDiff = String(a.dayKey || a.day || "").localeCompare(String(b.dayKey || b.day || ""));
      if (dayDiff !== 0) return dayDiff;
      return sortScheduledItems(a, b);
    });
}

function scheduleKindLabel(kind) {
  if (kind === "plan") return "План";
  if (kind === "reminder") return "Напоминание";
  return "Задача";
}

function scheduleStatusLabel(item) {
  if (item.kind === "plan") return item.status === "done" ? "Готово" : "План";
  return item.status === "done" ? "Готово" : "Открыто";
}

function scheduleSourceHint(state, item) {
  const source = item.sourceId && state.sources[item.sourceId] ? state.sources[item.sourceId] : null;
  const note = item.noteId && state.notes[item.noteId] ? state.notes[item.noteId] : null;
  if (source) return "Источник: " + source.name;
  if (note) return "Заметка: " + note.title;
  return "Источник не привязан";
}

function renderScheduleActions(item) {
  if (item.kind === "plan") {
    return [
      "<button class=\"toggle-button\" data-action=\"toggle-plan-block\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"plan-toggle\">" + escapeHtml(scheduleStatusLabel(item)) + "</button>",
      "<button class=\"mini-button\" data-action=\"edit-plan\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"edit-plan\">Изменить</button>",
      "<button class=\"mini-button\" data-action=\"plan-tomorrow\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"plan-tomorrow\">На завтра</button>",
      "<button class=\"mini-button\" data-action=\"plan-reminder\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"plan-reminder\">Напомнить</button>",
      "<button class=\"mini-button\" data-action=\"open-plan-source\" data-id=\"" + escapeHtml(item.id) + "\">Источник</button>",
      "<button class=\"mini-button\" data-action=\"open-plan-control\" data-id=\"" + escapeHtml(item.id) + "\">Контроль</button>",
      "<button class=\"mini-button\" data-action=\"archive-plan\" data-id=\"" + escapeHtml(item.id) + "\">Архив</button>"
    ].join("");
  }
  if (item.kind === "reminder") {
    return [
      "<button class=\"toggle-button\" data-action=\"toggle-reminder\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"reminder-toggle\">" + escapeHtml(scheduleStatusLabel(item)) + "</button>",
      "<button class=\"mini-button\" data-action=\"edit-reminder\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"edit-reminder\">Изменить</button>",
      "<button class=\"mini-button\" data-action=\"reminder-tomorrow\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"reminder-tomorrow\">На завтра</button>",
      "<button class=\"mini-button\" data-action=\"open-reminder-source\" data-id=\"" + escapeHtml(item.id) + "\">Источник</button>",
      "<button class=\"mini-button\" data-action=\"open-reminder-control\" data-id=\"" + escapeHtml(item.id) + "\">Контроль</button>",
      "<button class=\"mini-button\" data-action=\"archive-reminder\" data-id=\"" + escapeHtml(item.id) + "\">Архив</button>"
    ].join("");
  }
  return [
    "<button class=\"toggle-button\" data-action=\"toggle-task\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"task-toggle\">" + escapeHtml(scheduleStatusLabel(item)) + "</button>",
    "<button class=\"mini-button\" data-action=\"edit-task\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"edit-task\">Изменить</button>",
    "<button class=\"mini-button\" data-action=\"task-tomorrow\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"task-tomorrow\">На завтра</button>",
    "<button class=\"mini-button\" data-action=\"task-reminder\" data-id=\"" + escapeHtml(item.id) + "\" data-testid=\"task-reminder\">Напомнить</button>",
    "<button class=\"mini-button\" data-action=\"open-task-source\" data-id=\"" + escapeHtml(item.id) + "\">Источник</button>",
    "<button class=\"mini-button\" data-action=\"open-task-control\" data-id=\"" + escapeHtml(item.id) + "\">Контроль</button>",
    "<button class=\"mini-button\" data-action=\"archive-task\" data-id=\"" + escapeHtml(item.id) + "\">Архив</button>"
  ].join("");
}

function renderScheduleItem(state, item) {
  const done = item.status === "done" ? " done" : "";
  return [
    "<article class=\"schedule-item " + escapeHtml(item.kind || "task") + done + "\" data-testid=\"calendar-item\" data-kind=\"" + escapeHtml(item.kind || "task") + "\">",
    "<div class=\"schedule-main\">",
    "<time>" + escapeHtml(formatSchedule(item)) + "</time>",
    "<strong>" + escapeHtml(item.title) + "</strong>",
    "<span>" + escapeHtml(scheduleKindLabel(item.kind) + " · " + scheduleSourceHint(state, item)) + "</span>",
    "</div>",
    "<div class=\"schedule-actions\">",
    renderScheduleActions(item),
    "</div>",
    "</article>"
  ].join("");
}

function renderTimeRowsForDay(state, day, items) {
  const rows = [];
  const noTime = items.filter((item) => !item.startTime);
  const timedItems = items.filter((item) => item.startTime);
  rows.push([
    "<div class=\"time-row no-time\" data-testid=\"no-time-bucket\">",
    "<time>Без времени</time>",
    "<div class=\"time-row-items\">",
    noTime.length ? noTime.map((item) => renderScheduleItem(state, item)).join("") : "<div class=\"empty compact\">Нет задач без времени.</div>",
    "</div>",
    "</div>"
  ].join(""));
  if (!timedItems.length) return rows.join("");
  for (let hour = 5; hour <= 23; hour += 1) {
    const key = String(hour).padStart(2, "0") + ":00";
    const rowItems = items.filter((item) => item.startTime && timeToMinutes(item.startTime) >= hour * 60 && timeToMinutes(item.startTime) < (hour + 1) * 60);
    rows.push([
      "<div class=\"time-row" + (rowItems.length ? "" : " empty-hour") + "\" data-testid=\"time-row-" + key + "\">",
      "<time>" + key + "</time>",
      "<div class=\"time-row-items\">",
      rowItems.length ? rowItems.map((item) => renderScheduleItem(state, item)).join("") : "<span class=\"time-empty\"></span>",
      "</div>",
      "</div>"
    ].join(""));
  }
  return rows.join("");
}

function renderCalendarPanelLegacy(state) {
  const days = calendarDays(state);
  return [
    "<section class=\"info-panel workflow-panel\" data-testid=\"calendar-panel\">",
    "<div class=\"section-title\">Календарь</div>",
    "<div class=\"calendar-grid\">",
    days.map((day) => {
      const count = day.tasks.length + day.plans.length;
      return "<div class=\"calendar-day" + (day.key === todayKey() ? " today" : "") + "\"><strong>" + escapeHtml(day.label) + "</strong><span>" + count + "</span></div>";
    }).join(""),
    "</div>",
    "</section>"
  ].join("");
}

function renderCalendarPanelV5(state) {
  const days = calendarDays(state);
  return [
    "<section class=\"info-panel workflow-panel\" data-testid=\"calendar-panel\">",
    "<div class=\"section-title\">Календарь</div>",
    "<div class=\"calendar-grid\">",
    days.map((day) => {
      const items = calendarItemsWithReminders(state, day);
      const chips = items.slice(0, 3).map((item) => {
        const done = item.status === "done" ? " done" : "";
        return "<span class=\"calendar-chip" + done + "\" data-testid=\"calendar-item\"><em>" + escapeHtml(formatSchedule(item)) + "</em>" + escapeHtml(shorten(item.title, 44)) + "</span>";
      }).join("");
      const overflow = items.length > 3 ? "<small>+" + (items.length - 3) + "</small>" : "";
      return "<button class=\"calendar-day" + (day.key === todayKey() ? " today" : "") + "\" data-action=\"set-surface\" data-id=\"today\" data-day=\"" + escapeHtml(day.key) + "\"><strong><em>" + escapeHtml(formatDayLabel(day.key).split(" ")[0]) + "</em>" + escapeHtml(day.label) + "</strong><span>" + items.length + "</span><div class=\"calendar-stack\">" + chips + overflow + "</div></button>";
    }).join(""),
    "</div>",
    "</section>"
  ].join("");
}

function renderCalendarWorkbench(state) {
  const days = calendarDays(state);
  const today = todayKey();
  const tomorrow = dateKeyFromOffset(1);
  const openTasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.status !== "done");
  const openReminders = Object.values(state.reminders || {}).filter((reminder) => !reminder.deleted && reminder.status !== "done");
  const overdue = openTasks.filter((task) => task.day < today).concat(openReminders.filter((reminder) => reminder.day < today));
  const todayItems = calendarItemsWithReminders(state, days[0] || { key: today, tasks: [], plans: [] });
  const tomorrowItems = calendarItemsWithReminders(state, days[1] || { key: tomorrow, tasks: [], plans: [] });
  const agendaItems = weekAgendaItems(state, days).slice(0, 8);
  const overload = days.map((day) => ({ day, items: calendarItemsWithReminders(state, day).filter((item) => item.status !== "done") }))
    .find((row) => row.items.length >= 5);
  const focusTitle = overload ? "Перегруз календаря" : (agendaItems.length ? "Ближайшие блоки времени" : "Неделя свободна");
  const focusDetail = overload
    ? formatDayLabel(overload.day.key) + ": " + overload.items.length + " блоков. Перенеси или укороти часть задач."
    : (agendaItems.length ? "Показывает только то, где есть действие." : "Добавь задачу, и она появится в недельном плане.");
  return [
    "<section class=\"info-panel calendar-workbench\" data-testid=\"calendar-workbench\">",
    "<div class=\"card-head\"><h2>Календарь</h2><span>Сегодня, завтра, неделя, без времени, напоминания и источник каждого действия</span></div>",
    "<div class=\"calendar-composer\" data-testid=\"calendar-composer\">",
    "<input id=\"calendar-task-input\" data-testid=\"calendar-task-input\" autocomplete=\"off\" aria-label=\"Calendar task\">",
    "<input id=\"calendar-task-day\" data-testid=\"calendar-task-day\" type=\"date\" aria-label=\"Calendar date\" value=\"" + escapeHtml(today) + "\">",
    "<input id=\"calendar-task-time\" data-testid=\"calendar-task-time\" type=\"time\" aria-label=\"Calendar time\" value=\"\">",
    "<button data-action=\"add-calendar-task\" data-testid=\"add-calendar-task\">Добавить</button>",
    "</div>",
    "<div class=\"calendar-focus-grid\" data-testid=\"calendar-focus-grid\">",
    "<button data-action=\"set-surface\" data-id=\"today\"><span>Сегодня</span><strong>" + todayItems.filter((item) => item.status !== "done").length + "</strong><em>" + escapeHtml(today) + "</em></button>",
    "<button data-action=\"set-surface\" data-id=\"calendar\"><span>Завтра</span><strong>" + tomorrowItems.filter((item) => item.status !== "done").length + "</strong><em>" + escapeHtml(tomorrow) + "</em></button>",
    "<button data-action=\"set-surface\" data-id=\"calendar\"><span>Без времени</span><strong>" + openTasks.filter((task) => !task.startTime).length + "</strong><em>нужно поставить время</em></button>",
    "<button data-action=\"set-surface\" data-id=\"control\"><span>Просрочено</span><strong>" + overdue.length + "</strong><em>видно в контроле</em></button>",
    "</div>",
    "<div class=\"calendar-agenda-strip\" data-testid=\"calendar-agenda-strip\">",
    "<div data-testid=\"calendar-overload-warning\"><span>Фокус недели</span><strong>" + escapeHtml(focusTitle) + "</strong><em>" + escapeHtml(focusDetail) + "</em></div>",
    "<div class=\"calendar-agenda-list\" data-testid=\"calendar-agenda-list\">",
    agendaItems.length ? agendaItems.map((item) => "<button class=\"calendar-agenda-item\" data-action=\"set-surface\" data-id=\"today\" data-testid=\"calendar-agenda-item\"><time>" + escapeHtml(formatDayLabel(item.dayKey || item.day)) + " · " + escapeHtml(formatSchedule(item)) + "</time><strong>" + escapeHtml(shorten(item.title, 54)) + "</strong><span>" + escapeHtml(scheduleKindLabel(item.kind) + " · " + scheduleSourceHint(state, item)) + "</span></button>").join("") : "<button class=\"calendar-empty-action\" data-action=\"quick-task\" data-testid=\"calendar-empty-action\"><time>сейчас</time><strong>Добавить первый блок времени</strong><span>Создаст задачу, которую можно поставить в календарь.</span></button>",
    "</div>",
    "</div>",
    "<div class=\"week-board\" data-testid=\"calendar-week\">",
    days.map((day) => {
      const items = calendarItemsWithReminders(state, day);
      return [
        "<div class=\"week-day\">",
        "<div class=\"week-day-head\"><strong>" + escapeHtml(formatDayLabel(day.key)) + "</strong><span>" + items.length + "</span></div>",
        "<div class=\"time-lane\">",
        renderTimeRowsForDay(state, day, items),
        "</div>",
        "</div>"
      ].join("");
    }).join(""),
    "</div>",
    "</section>"
  ].join("");
}

function financeAccountName(state, accountId) {
  const account = accountId && state.financeAccounts[accountId] ? state.financeAccounts[accountId] : null;
  return account ? account.name : "Основной счет";
}

function renderFinanceAccountOptions(accounts, selectedName) {
  const names = accounts.length ? accounts.map((account) => account.name) : ["Основной счет"];
  const selected = cleanLine(selectedName || names[0] || "Основной счет");
  return names.map((name) => {
    const isSelected = normalizeTitle(name) === normalizeTitle(selected) ? " selected" : "";
    return "<option value=\"" + escapeHtml(name) + "\"" + isSelected + ">" + escapeHtml(name) + "</option>";
  }).join("");
}

function financeReceiptSources(state) {
  return Object.values(state.sources || {})
    .filter((source) => !source.deleted && source.kind === "image")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
}

function renderReceiptExpenseCard(state, source, accounts) {
  const image = source.dataUrl
    ? "<img class=\"receipt-preview\" src=\"" + escapeHtml(source.dataUrl) + "\" alt=\"Receipt preview\">"
    : "<div class=\"empty compact\">Файл сохранен, превью недоступно для большого размера.</div>";
  return [
    "<article class=\"receipt-expense-card\" data-testid=\"receipt-expense-card\">",
    "<div class=\"receipt-media\">",
    image,
    "<div><strong>" + escapeHtml(source.name) + "</strong><span>OCR не настроен — ручное заполнение работает и сохраняет источник.</span></div>",
    "</div>",
    "<div class=\"receipt-form\">",
    "<input id=\"receipt-merchant-" + escapeHtml(source.id) + "\" aria-label=\"Receipt merchant\" value=\"" + escapeHtml(stripExtension(source.name)) + "\">",
    "<input id=\"receipt-amount-" + escapeHtml(source.id) + "\" aria-label=\"Receipt amount\" type=\"number\" min=\"0\" step=\"0.01\">",
    "<input id=\"receipt-category-" + escapeHtml(source.id) + "\" aria-label=\"Receipt category\" value=\"Разное\">",
    "<select id=\"receipt-account-" + escapeHtml(source.id) + "\" aria-label=\"Receipt account\">" + renderFinanceAccountOptions(accounts, "") + "</select>",
    "<input id=\"receipt-day-" + escapeHtml(source.id) + "\" aria-label=\"Receipt day\" type=\"date\" value=\"" + escapeHtml(todayKey()) + "\">",
    "<input id=\"receipt-note-" + escapeHtml(source.id) + "\" aria-label=\"Receipt note\" value=\"\">",
    "<button data-action=\"save-receipt-expense\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"save-receipt-expense\">Сохранить расход</button>",
    "</div>",
    "</article>"
  ].join("");
}

function renderFinancePanel(state) {
  return renderFinancePanelV2(state);
  const summary = financeSummary(state);
  const accounts = Object.values(state.financeAccounts || {}).filter((item) => !item.deleted);
  const txs = Object.values(state.financeTransactions || {}).filter((item) => !item.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
  const budgets = Object.values(state.budgets || {}).filter((item) => !item.deleted);
  const subs = Object.values(state.subscriptions || {}).filter((item) => !item.deleted && item.status === "active");
  return [
    "<section class=\"info-panel finance-workbench\" data-testid=\"finance-panel\">",
    "<div class=\"card-head\"><h2>Финансы</h2><span>Баланс, расходы, бюджет и подписки из тех же артефактов</span></div>",
    "<div class=\"finance-metrics\">",
    "<div><span>Баланс</span><strong>" + Math.round(summary.balance) + " ₽</strong></div>",
    "<div><span>Сегодня</span><strong>" + Math.round(summary.todaySpend) + " ₽</strong></div>",
    "<div><span>Месяц</span><strong>" + Math.round(summary.monthSpend) + " ₽</strong></div>",
    "<div><span>Бюджет</span><strong>" + (summary.budgetLimit ? Math.round(summary.budgetLeft) + " ₽" : "не задан") + "</strong></div>",
    "</div>",
    "<div class=\"finance-form\">",
    "<input id=\"finance-title\" data-testid=\"finance-title\" aria-label=\"Finance title\" autocomplete=\"off\">",
    "<input id=\"finance-amount\" data-testid=\"finance-amount\" type=\"number\" aria-label=\"Finance amount\">",
    "<select id=\"finance-kind\" data-testid=\"finance-kind\"><option value=\"expense\">Расход</option><option value=\"income\">Доход</option><option value=\"balance\">Баланс</option></select>",
    "<button data-action=\"add-finance\" data-testid=\"add-finance\">Записать</button>",
    "</div>",
    "<div class=\"finance-columns\">",
    "<div><h3>Операции</h3>" + (txs.length ? txs.map((tx) => "<div class=\"money-row\" data-testid=\"finance-transaction\"><span>" + escapeHtml(tx.title) + "</span><strong>" + (tx.kind === "income" ? "+" : "-") + Math.round(tx.amount) + " ₽</strong></div>").join("") : "<div class=\"empty compact\">Расходы появятся после Apply или ручного ввода.</div>") + "</div>",
    "<div><h3>Счета</h3>" + (accounts.length ? accounts.map((account) => "<div class=\"money-row\"><span>" + escapeHtml(account.name) + "</span><strong>" + Math.round(account.balance) + " ₽</strong></div>").join("") : "<div class=\"empty compact\">Задай баланс: “баланс карта 15200”.</div>") + "</div>",
    "<div><h3>Бюджеты / подписки</h3>" + budgets.map((budget) => "<div class=\"money-row\"><span>" + escapeHtml(budget.category) + "</span><strong>" + Math.round(budget.limit) + " ₽</strong></div>").join("") + subs.map((sub) => "<div class=\"money-row\"><span>" + escapeHtml(sub.title) + "</span><strong>" + Math.round(sub.amount) + " ₽</strong></div>").join("") + (!budgets.length && !subs.length ? "<div class=\"empty compact\">Бюджеты и подписки появятся из разбора текста.</div>" : "") + "</div>",
    "</div>",
    "</section>"
  ].join("");
}

function renderFinancePanelV2(state) {
  const summary = financeSummary(state);
  const accounts = Object.values(state.financeAccounts || {}).filter((item) => !item.deleted).sort((a, b) => a.name.localeCompare(b.name));
  const txs = Object.values(state.financeTransactions || {}).filter((item) => !item.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 18);
  const budgets = Object.values(state.budgets || {}).filter((item) => !item.deleted).sort((a, b) => a.category.localeCompare(b.category));
  const subs = Object.values(state.subscriptions || {}).filter((item) => !item.deleted && item.status === "active").sort(sortScheduledItems);
  const receiptSources = financeReceiptSources(state);
  const accountOptions = renderFinanceAccountOptions(accounts, "");
  const monthSpendByCategory = {};
  const monthKey = todayKey().slice(0, 7);
  for (const tx of Object.values(state.financeTransactions || {}).filter((item) => !item.deleted && item.kind === "expense" && String(item.day || "").startsWith(monthKey))) {
    monthSpendByCategory[tx.category] = (monthSpendByCategory[tx.category] || 0) + tx.amount;
  }
  return [
    "<section class=\"info-panel finance-workbench finance-workbench-v2\" data-testid=\"finance-panel\">",
    "<div class=\"card-head\"><h2>Финансы</h2><span>Счета, расходы, бюджет, подписки и скрины чеков как связанные части одной системы.</span></div>",
    "<div class=\"finance-metrics\">",
    "<div><span>Баланс</span><strong>" + Math.round(summary.balance) + " ₽</strong></div>",
    "<div><span>Сегодня</span><strong>" + Math.round(summary.todaySpend) + " ₽</strong></div>",
    "<div><span>Месяц</span><strong>" + Math.round(summary.monthSpend) + " ₽</strong></div>",
    "<div><span>Бюджет</span><strong>" + (summary.budgetLimit ? Math.round(summary.budgetLeft) + " ₽" : "не задан") + "</strong></div>",
    "</div>",
    "<div class=\"finance-action-grid\">",
    "<section class=\"finance-tool\" data-testid=\"finance-entry-form\"><h3>Операция</h3><div class=\"finance-form detailed\">",
    "<input id=\"finance-title\" data-testid=\"finance-title\" aria-label=\"Finance title\" autocomplete=\"off\">",
    "<input id=\"finance-amount\" data-testid=\"finance-amount\" type=\"number\" min=\"0\" step=\"0.01\" aria-label=\"Finance amount\">",
    "<input id=\"finance-category\" data-testid=\"finance-category\" aria-label=\"Finance category\" value=\"Разное\">",
    "<select id=\"finance-account\" data-testid=\"finance-account\" aria-label=\"Finance account\">" + accountOptions + "</select>",
    "<input id=\"finance-day\" data-testid=\"finance-day\" type=\"date\" aria-label=\"Finance day\" value=\"" + escapeHtml(todayKey()) + "\">",
    "<select id=\"finance-kind\" data-testid=\"finance-kind\"><option value=\"expense\">Расход</option><option value=\"income\">Доход</option><option value=\"transfer\">Перевод</option><option value=\"balance\">Баланс</option></select>",
    "<button data-action=\"add-finance\" data-testid=\"add-finance\">Записать</button>",
    "</div></section>",
    "<section class=\"finance-tool\" data-testid=\"finance-account-form\"><h3>Счет / баланс</h3><div class=\"finance-form compact-finance-form\">",
    "<input id=\"account-name\" data-testid=\"account-name\" aria-label=\"Account name\" value=\"" + escapeHtml(accounts[0] ? accounts[0].name : "Основной счет") + "\">",
    "<input id=\"account-balance\" data-testid=\"account-balance\" aria-label=\"Account balance\" type=\"number\" step=\"0.01\" value=\"" + escapeHtml(accounts[0] ? String(Math.round(accounts[0].balance)) : "0") + "\">",
    "<button data-action=\"set-finance-balance\" data-testid=\"set-finance-balance\">Сохранить баланс</button>",
    "</div></section>",
    "<section class=\"finance-tool\" data-testid=\"finance-budget-form\"><h3>Бюджет</h3><div class=\"finance-form compact-finance-form\">",
    "<input id=\"budget-category\" data-testid=\"budget-category\" aria-label=\"Budget category\" value=\"Продукты\">",
    "<input id=\"budget-limit\" data-testid=\"budget-limit\" aria-label=\"Budget limit\" type=\"number\" min=\"0\" step=\"0.01\">",
    "<button data-action=\"add-budget-entry\" data-testid=\"add-budget-entry\">Добавить бюджет</button>",
    "</div></section>",
    "<section class=\"finance-tool\" data-testid=\"finance-subscription-form\"><h3>Подписка / счет</h3><div class=\"finance-form compact-finance-form subscription-form\">",
    "<input id=\"subscription-title\" data-testid=\"subscription-title\" aria-label=\"Subscription title\" value=\"\">",
    "<input id=\"subscription-amount\" data-testid=\"subscription-amount\" aria-label=\"Subscription amount\" type=\"number\" min=\"0\" step=\"0.01\">",
    "<input id=\"subscription-day\" data-testid=\"subscription-day\" aria-label=\"Subscription day\" type=\"date\" value=\"" + escapeHtml(todayKey()) + "\">",
    "<input id=\"subscription-category\" data-testid=\"subscription-category\" aria-label=\"Subscription category\" value=\"Подписки\">",
    "<button data-action=\"add-subscription-entry\" data-testid=\"add-subscription-entry\">Добавить</button>",
    "</div></section>",
    "</div>",
    "<div class=\"finance-columns\">",
    "<div><h3>Операции</h3>" + (txs.length ? txs.map((tx) => {
      const sign = tx.kind === "income" ? "+" : tx.kind === "transfer" ? "±" : "-";
      return "<div class=\"money-row detailed\" data-testid=\"finance-transaction\"><span><strong>" + escapeHtml(tx.title) + "</strong><em>" + escapeHtml(tx.day + " · " + tx.category + " · " + financeAccountName(state, tx.accountId)) + "</em></span><strong>" + sign + Math.round(tx.amount) + " ₽</strong></div>";
    }).join("") : "<div class=\"empty compact\">Добавь расход вручную, вставь текст траты или импортируй скрин чека.</div>") + "</div>",
    "<div><h3>Счета</h3>" + (accounts.length ? accounts.map((account) => "<div class=\"money-row\" data-testid=\"finance-account-row\"><span>" + escapeHtml(account.name) + "</span><strong>" + Math.round(account.balance) + " ₽</strong></div>").join("") : "<div class=\"empty compact\">Сохрани баланс счета, например карта или наличные.</div>") + "</div>",
    "<div><h3>Бюджеты / подписки</h3>" + (budgets.length || subs.length ? budgets.map((budget) => {
      const spent = monthSpendByCategory[budget.category] || 0;
      const left = budget.limit - spent;
      return "<div class=\"money-row detailed\" data-testid=\"budget-row\"><span><strong>" + escapeHtml(budget.category) + "</strong><em>" + Math.round(spent) + " ₽ потрачено</em></span><strong>" + Math.round(left) + " ₽</strong></div>";
    }).join("") + subs.map((sub) => "<div class=\"money-row detailed\" data-testid=\"subscription-row\"><span><strong>" + escapeHtml(sub.title) + "</strong><em>" + escapeHtml(sub.day + " · " + sub.category) + "</em></span><strong>" + Math.round(sub.amount) + " ₽</strong></div>").join("") : "<div class=\"empty compact\">Задай лимит категории или регулярный платеж.</div>") + "</div>",
    "</div>",
    "<section class=\"receipt-workbench\" data-testid=\"receipt-workbench\"><div class=\"card-head\"><h3>Скрины чеков</h3><span>OCR не включается без движка; ручное извлечение сохраняет источник, транзакцию, граф и контроль</span></div>",
    receiptSources.length ? receiptSources.map((source) => renderReceiptExpenseCard(state, source, accounts)).join("") : "<div class=\"empty compact\">Импортируй изображение чека через Вход или кнопку Файл. Оно появится здесь для ручного заполнения.</div>",
    "</section>",
    "</section>"
  ].join("");
}

function habitStreak(habit) {
  const checkins = habit.checkins || {};
  let streak = 0;
  for (let offset = 0; offset < 60; offset += 1) {
    if (!checkins[dateKeyFromOffset(-offset)]) break;
    streak += 1;
  }
  return streak;
}

function domainTextMatches(text, keywords) {
  const haystack = normalizeTitle(text || "");
  return keywords.some((keyword) => haystack.includes(normalizeTitle(keyword)));
}

function countDomainMatches(items, keywords, getText) {
  return items.filter((item) => domainTextMatches(getText(item), keywords)).length;
}

function lifeDomainStats(state) {
  const habits = Object.values(state.habits || {}).filter((item) => !item.deleted);
  const goals = Object.values(state.goals || {}).filter((item) => !item.deleted);
  const tasks = Object.values(state.tasks || {}).filter((item) => !item.deleted && item.status !== "done");
  const txs = Object.values(state.financeTransactions || {}).filter((item) => !item.deleted);
  const reading = Object.values(state.readingItems || {}).filter((item) => !item.deleted);
  const highlights = Object.values(state.highlights || {}).filter((item) => !item.deleted);
  const notes = Object.values(state.notes || {}).filter((item) => !item.deleted);
  const sources = Object.values(state.sources || {}).filter((item) => !item.deleted);
  const today = todayKey();
  const domains = [
    {
      key: "health",
      title: "Здоровье",
      color: "#0d9488",
      keywords: ["сон", "вода", "здоров", "зал", "спорт", "протеин", "еда", "аптека", "мед", "энерг"],
      nextAction: "Один мягкий check-in сегодня",
      signal: "привычки, тело, сон, питание"
    },
    {
      key: "money",
      title: "Деньги",
      color: "#16a34a",
      keywords: ["деньг", "бюдж", "расход", "доход", "зарплат", "накоп", "счет", "карта", "подпис", "руб"],
      nextAction: "Проверить один расход или цель",
      signal: "расходы, счета, накопления"
    },
    {
      key: "growth",
      title: "Рост",
      color: "#4f46e5",
      keywords: ["книг", "читать", "обуч", "курс", "знани", "идея", "исслед", "проект", "второго мозга"],
      nextAction: "Вернуть один highlight в знание",
      signal: "книги, знания, проекты"
    },
    {
      key: "work",
      title: "Работа",
      color: "#f59e0b",
      keywords: ["работ", "встреч", "документ", "задач", "проект", "созвон", "почт", "клиент", "план"],
      nextAction: "Выбрать одну рабочую next action",
      signal: "задачи, календарь, письма"
    },
    {
      key: "home",
      title: "Дом",
      color: "#a855f7",
      keywords: ["дом", "сем", "полк", "лампоч", "ремонт", "купить", "магаз", "пятероч", "продукт"],
      nextAction: "Собрать один бытовой шаг",
      signal: "дом, покупки, семья"
    },
    {
      key: "relationships",
      title: "Связи",
      color: "#ec4899",
      keywords: ["друг", "мам", "пап", "сем", "отнош", "позвон", "встреч", "сообщ", "письм"],
      nextAction: "Поставить одно касание с человеком",
      signal: "люди, встречи, сообщения"
    }
  ];
  return domains.map((domain) => {
    const habitMatches = countDomainMatches(habits, domain.keywords, (habit) => habit.title + " " + habit.frequency);
    const checkedToday = habits.filter((habit) => habit.checkins && habit.checkins[today] && domainTextMatches(habit.title, domain.keywords)).length;
    const goalMatches = countDomainMatches(goals, domain.keywords, (goal) => goal.title);
    const taskMatches = countDomainMatches(tasks, domain.keywords, (task) => task.title);
    const noteMatches = countDomainMatches(notes, domain.keywords, (note) => note.title + " " + note.body);
    const sourceMatches = countDomainMatches(sources, domain.keywords, (source) => source.name + " " + source.text);
    const readingMatches = countDomainMatches(reading.concat(highlights), domain.keywords, (item) => item.title || item.text || item.quote || "");
    const moneyMatches = domain.key === "money" ? txs.length : 0;
    const evidence = habitMatches + goalMatches + taskMatches + noteMatches + sourceMatches + readingMatches + moneyMatches;
    const score = Math.max(22, Math.min(96,
      34 + habitMatches * 9 + checkedToday * 11 + goalMatches * 8 + taskMatches * 5 + noteMatches * 3 + sourceMatches * 2 + readingMatches * 4 + moneyMatches * 2
    ));
    const reason = evidence
      ? domain.signal + ": " + evidence + " сигналов, " + checkedToday + " check-ins сегодня"
      : "сигналов мало: домен виден, но пока не связан с привычкой, целью или задачей";
    return Object.assign({}, domain, {
      score,
      evidence,
      checkedToday,
      reason
    });
  }).sort((a, b) => b.score - a.score);
}

function domainArtifactStats(state) {
  const tasks = Object.values(state.tasks || {}).filter((item) => !item.deleted);
  const notes = Object.values(state.notes || {}).filter((item) => !item.deleted);
  const sources = Object.values(state.sources || {}).filter((item) => !item.deleted);
  const goals = Object.values(state.goals || {}).filter((item) => !item.deleted);
  const habits = Object.values(state.habits || {}).filter((item) => !item.deleted);
  const txs = Object.values(state.financeTransactions || {}).filter((item) => !item.deleted);
  const pools = [
    ["tasks", tasks, (item) => item.title + " " + (item.sourceId || "")],
    ["notes", notes, (item) => item.title + " " + item.body],
    ["sources", sources, (item) => item.name + " " + item.text],
    ["goals", goals, (item) => item.title],
    ["habits", habits, (item) => item.title + " " + item.frequency],
    ["money", txs, (item) => item.title + " " + item.category + " " + item.kind]
  ];
  const definitions = [
    {
      key: "health",
      title: "Здоровье",
      accent: "#0d9488",
      keywords: ["здоров", "сон", "энерг", "зал", "спорт", "вода", "мед", "аптек", "боль"],
      nextAction: "мягкий check-in здоровья",
      route: "habits"
    },
    {
      key: "home",
      title: "Дом",
      accent: "#a855f7",
      keywords: ["дом", "ремонт", "уборк", "полк", "ламп", "инвент", "кварт", "сем"],
      nextAction: "один бытовой шаг",
      route: "today"
    },
    {
      key: "relationships",
      title: "Отношения",
      accent: "#ec4899",
      keywords: ["друг", "мам", "пап", "сем", "отнош", "позвон", "встреч", "сообщ"],
      nextAction: "касание с человеком",
      route: "today"
    },
    {
      key: "food",
      title: "Еда",
      accent: "#f97316",
      keywords: ["еда", "завтрак", "ужин", "обед", "продукт", "магаз", "пятер", "протеин", "рецепт"],
      nextAction: "план еды или покупки",
      route: "finance"
    },
    {
      key: "shopping",
      title: "Покупки",
      accent: "#16a34a",
      keywords: ["купить", "чек", "товар", "маркет", "доставка", "покуп", "магаз", "список"],
      nextAction: "проверить список покупок",
      route: "finance"
    },
    {
      key: "travel",
      title: "Поездки",
      accent: "#0284c7",
      keywords: ["поезд", "рейс", "билет", "отель", "такси", "дорог", "путеш", "аэропорт"],
      nextAction: "собрать travel object",
      route: "calendar"
    },
    {
      key: "admin",
      title: "Документы",
      accent: "#64748b",
      keywords: ["документ", "паспорт", "договор", "счет", "акт", "налог", "страх", "админ"],
      nextAction: "открыть один документ",
      route: "library"
    },
    {
      key: "energy",
      title: "Сон / энергия",
      accent: "#14b8a6",
      keywords: ["сон", "энерг", "устал", "отдых", "режим", "утро", "вечер", "встать"],
      nextAction: "упростить день по энергии",
      route: "today"
    }
  ];
  return definitions.map((definition) => {
    const matches = [];
    for (const [kind, items, getText] of pools) {
      for (const item of items) {
        if (domainTextMatches(getText(item), definition.keywords)) {
          matches.push({
            kind,
            title: item.title || item.name || item.category || item.kind || definition.title,
            id: item.id || ""
          });
        }
      }
    }
    const unique = [];
    const seen = new Set();
    for (const match of matches) {
      const key = match.kind + ":" + match.id + ":" + match.title;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(match);
    }
    const evidence = unique.length;
    const primary = unique[0];
    return Object.assign({}, definition, {
      evidence,
      primaryTitle: primary ? primary.title : "нет связанных артефактов",
      reason: evidence
        ? evidence + " связанных объектов: " + unique.slice(0, 3).map((item) => item.kind + " / " + shorten(item.title, 34)).join("; ")
        : "Пока это пустой доменный артефакт: он виден заранее, но не притворяется заполненным.",
      stateLabel: evidence ? "связано" : "пусто"
    });
  }).sort((a, b) => b.evidence - a.evidence || a.title.localeCompare(b.title));
}

function renderDomainArtifactBoard(state) {
  const artifacts = domainArtifactStats(state);
  return [
    "<section class=\"domain-artifact-board\" data-testid=\"domain-artifact-board\">",
    "<div class=\"domain-artifact-head\">",
    "<div><span>Доменные артефакты</span><h3>Здоровье, дом, еда, поездки и отношения как проекции графа</h3></div>",
    "<p>Это не отдельные приложения. LifeOS собирает сигналы из задач, источников, заметок, привычек, целей и финансов, а потом показывает один следующий шаг.</p>",
    "</div>",
    "<div class=\"domain-artifact-grid\">",
    artifacts.map((artifact) => [
      "<article class=\"domain-artifact-card\" data-testid=\"domain-artifact-card\" style=\"--domain-color:" + escapeHtml(artifact.accent) + "\">",
      "<div><span>" + escapeHtml(artifact.stateLabel) + "</span><strong>" + escapeHtml(artifact.title) + "</strong></div>",
      "<p>" + escapeHtml(artifact.reason) + "</p>",
      "<em>Следующий шаг: " + escapeHtml(artifact.nextAction) + "</em>",
      "<div class=\"domain-artifact-actions\">",
      "<button data-action=\"quick-task\" data-testid=\"domain-artifact-next\">Создать шаг</button>",
      "<button data-action=\"set-surface\" data-id=\"" + escapeHtml(artifact.route) + "\">Открыть</button>",
      "<button data-action=\"set-surface\" data-id=\"graph\">Связи</button>",
      "<button data-action=\"set-surface\" data-id=\"control\">Контроль</button>",
      "</div>",
      "</article>"
    ].join("")).join(""),
    "</div>",
    "</section>"
  ].join("");
}

function renderBalanceWheel(state) {
  const domains = lifeDomainStats(state);
  const ordered = domains.slice().sort((a, b) => a.key.localeCompare(b.key));
  const angleStep = (Math.PI * 2) / ordered.length;
  const points = ordered.map((domain, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const radius = 28 + domain.score * 0.78;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      labelX: Math.cos(angle) * 110,
      labelY: Math.sin(angle) * 110,
      domain
    };
  });
  const polygon = points.map((point) => point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ");
  const weak = domains.slice().sort((a, b) => a.score - b.score || a.title.localeCompare(b.title))[0] || domains[0];
  const average = Math.round(domains.reduce((sum, domain) => sum + domain.score, 0) / Math.max(1, domains.length));
  return [
    "<section class=\"balance-dashboard\" data-testid=\"balance-wheel-panel\">",
    "<div class=\"balance-copy\">",
    "<div class=\"section-title\">Колесо баланса</div>",
    "<h3>Не еще одна форма, а карта доменов дня</h3>",
    "<p>LifeOS выводит домены из реальных артефактов: привычек, целей, задач, денег, источников и знаний.</p>",
    "<div class=\"balance-score\"><span>Средний тонус</span><strong>" + average + "%</strong></div>",
    "</div>",
    "<div class=\"balance-wheel\" data-testid=\"balance-wheel\">",
    "<svg class=\"balance-wheel-svg\" viewBox=\"-126 -126 252 252\" role=\"img\" aria-label=\"Колесо баланса LifeOS\">",
    [32, 58, 84].map((radius) => "<circle cx=\"0\" cy=\"0\" r=\"" + radius + "\" />").join(""),
    points.map((point) => "<line x1=\"0\" y1=\"0\" x2=\"" + point.labelX.toFixed(1) + "\" y2=\"" + point.labelY.toFixed(1) + "\" />").join(""),
    "<polygon points=\"" + polygon + "\" />",
    points.map((point) => "<text x=\"" + point.labelX.toFixed(1) + "\" y=\"" + point.labelY.toFixed(1) + "\">" + escapeHtml(point.domain.title) + "</text>").join(""),
    "</svg>",
    "</div>",
    "<div class=\"weak-domain-card\" data-testid=\"weak-domain-card\">",
    "<span>Самый тихий домен</span>",
    "<strong>" + escapeHtml(weak.title) + " · " + weak.score + "%</strong>",
    "<em>" + escapeHtml(weak.reason) + "</em>",
    "<button data-action=\"quick-task\" data-testid=\"domain-next-action\">Добавить шаг: " + escapeHtml(weak.nextAction) + "</button>",
    "</div>",
    "<div class=\"domain-list\" data-testid=\"domain-list\">",
    domains.map((domain) => [
      "<div class=\"domain-row\" data-testid=\"domain-row\" style=\"--domain-color:" + escapeHtml(domain.color) + "\">",
      "<span>" + escapeHtml(domain.title) + "</span>",
      "<div><i style=\"width:" + domain.score + "%\"></i></div>",
      "<strong>" + domain.score + "%</strong>",
      "<em>" + escapeHtml(domain.reason) + "</em>",
      "</div>"
    ].join("")).join(""),
    "</div>",
    "</section>"
  ].join("");
}

function renderHabitsGoalsPanel(state) {
  return renderHabitsGoalsPanelV2(state);
  const habits = Object.values(state.habits || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const goals = Object.values(state.goals || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const insights = Object.values(state.insights || {}).filter((item) => item.status === "open").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  return [
    "<section class=\"info-panel habits-goals-workbench\" data-testid=\"habits-goals-panel\">",
    "<div class=\"card-head\"><h2>Привычки и цели</h2><span>Чеки, прогресс и инсайты связаны с источниками</span></div>",
    "<div class=\"habit-goal-grid\">",
    "<div><h3>Привычки</h3>",
    habits.length ? habits.map((habit) => {
      const checked = habit.checkins && habit.checkins[todayKey()];
      return "<div class=\"habit-row\" data-testid=\"habit-row\"><button data-action=\"toggle-habit\" data-id=\"" + escapeHtml(habit.id) + "\">" + (checked ? "✓" : "○") + "</button><span>" + escapeHtml(habit.title) + "</span><strong>" + habitStreak(habit) + " дн.</strong></div>";
    }).join("") : "<div class=\"empty compact\">Напиши: “каждый день вода 2л”.</div>",
    "</div>",
    "<div><h3>Цели</h3>",
    goals.length ? goals.map((goal) => {
      const progressInfo = goalProgress(state, goal.id);
      const progress = goal.targetAmount ? Math.min(100, Math.round((goal.progress || 0) / goal.targetAmount * 100)) : progressInfo.percent;
      const target = goal.targetAmount ? " до " + Math.round(goal.targetAmount) + " ₽" : "";
      return "<div class=\"goal-row\" data-testid=\"goal-row\"><button class=\"toggle-button\" data-action=\"toggle-goal\" data-id=\"" + escapeHtml(goal.id) + "\">" + (goal.status === "done" ? "Done" : "Active") + "</button><span>" + escapeHtml(goal.title + target) + "</span><strong>" + progress + "%</strong><button class=\"mini-button\" data-action=\"archive-goal\" data-id=\"" + escapeHtml(goal.id) + "\">Archive</button></div>";
    }).join("") : "<div class=\"empty compact\">Напиши: “хочу накопить 30000 до 1 июля”.</div>",
    "</div>",
    "<div><h3>Инсайты</h3>",
    insights.length ? insights.map((insight) => "<div class=\"insight-row\" data-testid=\"insight-row\"><strong>" + escapeHtml(insight.title) + "</strong><span>" + escapeHtml(shorten(insight.reason, 120)) + "</span></div>").join("") : "<div class=\"empty compact\">Инсайты появятся из книг, заметок и повторяющихся тем.</div>",
    "</div>",
    "</div>",
    "</section>"
  ].join("");
}

function renderHabitsGoalsPanelV2(state) {
  const habits = Object.values(state.habits || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const goals = Object.values(state.goals || {}).filter((item) => !item.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const insights = Object.values(state.insights || {}).filter((item) => item.status === "open").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
  return [
    "<section class=\"info-panel habits-goals-workbench habits-goals-v2\" data-testid=\"habits-goals-panel\">",
    "<div class=\"card-head\"><h2>Привычки и цели</h2><span>Check-ins, прогресс, next actions и локальные инсайты связаны с артефактами</span></div>",
    "<div class=\"habit-goal-compose\">",
    "<section class=\"habit-tool\" data-testid=\"habit-form\"><h3>Новая привычка</h3><div class=\"habit-form-grid\"><input id=\"habit-title\" data-testid=\"habit-title\" aria-label=\"Habit title\"><select id=\"habit-frequency\" data-testid=\"habit-frequency\" aria-label=\"Habit frequency\"><option value=\"daily\">каждый день</option><option value=\"weekly\">еженедельно</option><option value=\"weekdays\">по будням</option></select><button data-action=\"add-habit-entry\" data-testid=\"add-habit-entry\">Добавить</button></div></section>",
    "<section class=\"habit-tool\" data-testid=\"goal-form\"><h3>Новая цель</h3><div class=\"goal-form-grid\"><input id=\"goal-title-entry\" data-testid=\"goal-title-entry\" aria-label=\"Goal title\"><input id=\"goal-target-amount\" data-testid=\"goal-target-amount\" aria-label=\"Goal target amount\" type=\"number\" min=\"0\" step=\"0.01\"><input id=\"goal-target-date\" data-testid=\"goal-target-date\" aria-label=\"Goal target date\" type=\"date\"><button data-action=\"add-goal-entry\" data-testid=\"add-goal-entry\">Добавить</button></div></section>",
    "</div>",
    renderBalanceWheel(state),
    renderDomainArtifactBoard(state),
    "<div class=\"habit-goal-grid\">",
    "<div><h3>Привычки</h3>",
    habits.length ? habits.map((habit) => {
      const checked = habit.checkins && habit.checkins[todayKey()];
      return "<div class=\"habit-row detailed\" data-testid=\"habit-row\"><button data-action=\"toggle-habit\" data-id=\"" + escapeHtml(habit.id) + "\" data-testid=\"habit-toggle\">" + (checked ? "✓" : "○") + "</button><span><strong>" + escapeHtml(habit.title) + "</strong><em>" + escapeHtml(habit.frequency) + " · " + habitStreak(habit) + " дн.</em></span><button class=\"mini-button\" data-action=\"archive-habit\" data-id=\"" + escapeHtml(habit.id) + "\">Archive</button></div>";
    }).join("") : "<div class=\"empty compact\">Добавь привычку или напиши ее во Вход.</div>",
    "</div>",
    "<div><h3>Цели</h3>",
    goals.length ? goals.map((goal) => {
      const progressInfo = goalProgress(state, goal.id);
      const target = Number(goal.targetAmount || 0);
      const progressValue = Number(goal.progress || 0);
      const progress = target ? Math.min(100, Math.round(progressValue / target * 100)) : progressInfo.total ? Math.round(progressInfo.done / progressInfo.total * 100) : 0;
      return [
        "<div class=\"goal-row detailed\" data-testid=\"goal-row\">",
        "<button class=\"toggle-button\" data-action=\"toggle-goal\" data-id=\"" + escapeHtml(goal.id) + "\">" + (goal.status === "done" ? "Done" : "Active") + "</button>",
        "<span><strong>" + escapeHtml(goal.title) + "</strong><em>" + (target ? Math.round(progressValue) + " / " + Math.round(target) + " ₽" : progressInfo.done + "/" + progressInfo.total + " задач") + (goal.targetDate ? " · до " + escapeHtml(goal.targetDate) : "") + "</em></span>",
        "<strong>" + progress + "%</strong>",
        "<div class=\"goal-actions\"><input id=\"goal-progress-" + escapeHtml(goal.id) + "\" aria-label=\"Goal progress\" type=\"number\" min=\"0\" step=\"0.01\"><button class=\"mini-button\" data-action=\"add-goal-progress\" data-id=\"" + escapeHtml(goal.id) + "\" data-testid=\"add-goal-progress\">+Прогресс</button><button class=\"mini-button\" data-action=\"goal-next-task\" data-id=\"" + escapeHtml(goal.id) + "\" data-testid=\"goal-next-task\">Next task</button><button class=\"mini-button\" data-action=\"archive-goal\" data-id=\"" + escapeHtml(goal.id) + "\">Archive</button></div>",
        "</div>"
      ].join("");
    }).join("") : "<div class=\"empty compact\">Добавь цель с числом или датой.</div>",
    "</div>",
    "<div><h3>Инсайты</h3><button data-action=\"refresh-insights\" data-testid=\"refresh-insights\">Обновить инсайты</button>",
    insights.length ? insights.map((insight) => "<div class=\"insight-row detailed\" data-testid=\"insight-row\"><span><strong>" + escapeHtml(insight.title) + "</strong><em>" + escapeHtml(shorten(insight.reason, 150)) + "</em></span><div class=\"insight-actions\"><button data-action=\"insight-to-task\" data-id=\"" + escapeHtml(insight.id) + "\" data-testid=\"insight-to-task\">Создать задачу</button><button data-action=\"ignore-insight\" data-id=\"" + escapeHtml(insight.id) + "\" data-testid=\"ignore-insight\">Пропустить</button></div></div>").join("") : "<div class=\"empty compact\">Нажми обновить: LifeOS найдет привычки без отметки, цели без next action и повторяющиеся расходы.</div>",
    "</div>",
    "</div>",
    "</section>"
  ].join("");
}

function renderChatPanel(state) {
  const messages = Object.values(state.chatMessages || {}).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-6);
  return [
    "<section class=\"info-panel workflow-panel\" data-testid=\"chat-panel\">",
    "<div class=\"section-title\">Chat</div>",
    "<div class=\"chat-log\">",
    messages.length ? messages.map((message) => {
      const actions = message.role === "owner"
        ? "<div class=\"chat-actions\"><button data-action=\"chat-to-proposal\" data-id=\"" + escapeHtml(message.id) + "\" data-testid=\"chat-to-proposal\">Предложить задачу</button><button data-action=\"chat-to-plan\" data-id=\"" + escapeHtml(message.id) + "\">Предложить план</button></div>"
        : "";
      return "<div class=\"chat-message " + message.role + "\" data-testid=\"chat-message\"><strong>" + escapeHtml(message.role) + "</strong><span>" + escapeHtml(shorten(message.text, 120)) + "</span>" + actions + "</div>";
    }).join("") : "<div class=\"empty compact\">Локальный чат готов к активному артефакту.</div>",
    "</div>",
    "<div class=\"compact-form\">",
    "<textarea id=\"chat-input\" data-testid=\"chat-input\" rows=\"2\" autocomplete=\"off\" aria-label=\"Chat message\"></textarea>",
    "<button data-action=\"send-chat\" data-testid=\"send-chat\">Отправить</button>",
    "</div>",
    "</section>"
  ].join("");
}

function renderFlowStepNode(kind, title, value, detail) {
  return [
    "<div class=\"flow-builder-node flow-builder-node-" + escapeHtml(kind) + "\" data-testid=\"flow-builder-node\">",
    "<span>" + escapeHtml(title) + "</span>",
    "<strong>" + escapeHtml(value || "не задано") + "</strong>",
    detail ? "<em>" + escapeHtml(detail) + "</em>" : "",
    "</div>"
  ].join("");
}

function renderAgentRunCard(run) {
  return [
    "<article class=\"agent-run\" data-testid=\"agent-run\">",
    "<div><strong>" + escapeHtml(run.name + " · " + humanStatus(run.status)) + "</strong><span>" + escapeHtml(shorten(run.summary, 140)) + "</span></div>",
    "<div class=\"agent-run-meta\">",
    "<span>Контекст: " + escapeHtml((run.scopes || []).join(", ") || "только предложения") + "</span>",
    "<span>Риск: локально, без внешней отправки</span>",
    "<span>Требуется Принять</span>",
    "</div>",
    "<button data-action=\"focus-graph-node\" data-id=\"" + escapeHtml(run.id) + "\">Показать связи</button>",
    "</article>"
  ].join("");
}

function renderFlowRunCard(state, run) {
  const proposalTitles = (run.proposalIds || []).map((proposalId) => {
    const proposal = state.proposals[proposalId];
    return proposal ? proposal.title : proposalId;
  });
  return [
    "<article class=\"flow-run-card\" data-testid=\"flow-run-row\">",
    "<div><strong>" + escapeHtml(humanStatus(run.status)) + "</strong><span>" + escapeHtml(shorten(run.summary, 140)) + "</span></div>",
    proposalTitles.length ? "<em>Предложение: " + escapeHtml(proposalTitles.map((title) => shorten(title, 54)).join(" / ")) + "</em>" : "<em>Предложение не создано</em>",
    "<div class=\"agent-run-meta\"><span>Проверка без изменений</span><span>Требуется подтверждение</span><span>Откат и контроль видны</span></div>",
    "<button data-action=\"focus-graph-node\" data-id=\"" + escapeHtml(run.id) + "\">Показать связи</button>",
    "</article>"
  ].join("");
}

function renderApprovalQueue(state) {
  const proposals = Object.values(state.proposals || {})
    .filter((proposal) => proposal.status === "open" && ["actions", "calendar", "money", "habits", "goals", "knowledge"].includes(proposal.group || groupForProposalType(proposal.type)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
  return [
    "<section class=\"approval-queue\" data-testid=\"approval-queue\">",
    "<div class=\"section-title\">Очередь согласования</div>",
    proposals.length ? proposals.map((proposal) => [
      "<div class=\"approval-row\" data-testid=\"approval-row\">",
      "<span>" + escapeHtml(proposalGroupLabel(proposal.group || groupForProposalType(proposal.type))) + "</span>",
      "<strong>" + escapeHtml(shorten(proposal.title, 82)) + "</strong>",
      "<button data-action=\"apply-proposal\" data-id=\"" + escapeHtml(proposal.id) + "\">Принять</button>",
      "<button data-action=\"open-proposal-control\" data-id=\"" + escapeHtml(proposal.id) + "\">Контроль</button>",
      "</div>"
    ].join("")).join("") : "<div class=\"empty compact\">Проверка создаст предложение здесь. Никаких скрытых изменений до «Принять».</div>",
    "</section>"
  ].join("");
}

function renderAgentPanel(state) {
  const runs = Object.values(state.agentRuns || {}).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const flows = Object.values(state.flows || {}).sort((a, b) => a.name.localeCompare(b.name));
  const flowRuns = Object.values(state.flowRuns || {}).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const activeFlow = flows[0] || { name: "Сценарий владельца", steps: [], runCount: 0, status: "ready" };
  const trigger = activeFlow.steps.find((step) => step.kind === "trigger")?.value || "новый артефакт";
  const condition = activeFlow.steps.find((step) => step.kind === "condition")?.value || "есть действие";
  const action = activeFlow.steps.find((step) => step.kind === "proposal_action")?.value || "task";
  return [
    "<section class=\"info-panel workflow-panel agent-flow-workbench\" data-testid=\"agent-panel\">",
    "<div class=\"section-title\">Агенты и сценарии</div>",
    "<div class=\"agent-flow-summary\">",
    "<div><span>Агенты</span><strong>" + runs.length + "</strong></div>",
    "<div><span>Сценарии</span><strong>" + flowRuns.length + "</strong></div>",
    "<div><span>Режим</span><strong>только предложения</strong></div>",
    "<div><span>Внешние действия</span><strong>по разрешению</strong></div>",
    "</div>",
    "<div class=\"agent-risk-card\" data-testid=\"agent-risk-card\"><strong>Граница безопасности</strong><span>Агенты и сценарии читают активный артефакт, создают только предложения, требуют явного «Принять» и пишут след в Связях/Контроле.</span></div>",
    "<div class=\"compact-form two-buttons\"><button data-action=\"run-agent-active\" data-testid=\"agent-panel-run\">Проверить агента</button><button data-action=\"run-flow\" data-testid=\"flow-panel-run\">Проверить сценарий</button></div>",
    "<div class=\"flow-builder\" data-testid=\"flow-builder\">",
    "<label><span>Триггер</span><input id=\"flow-trigger\" data-testid=\"flow-trigger\" aria-label=\"Flow trigger\" value=\"" + escapeHtml(trigger) + "\"></label>",
    "<label><span>Условие</span><input id=\"flow-condition\" data-testid=\"flow-condition\" aria-label=\"Flow condition\" value=\"" + escapeHtml(condition) + "\"></label>",
    "<label><span>Действие</span><select id=\"flow-action\" data-testid=\"flow-action\" aria-label=\"Flow action\"><option value=\"task\"" + (action === "task" ? " selected" : "") + ">предложить задачу</option><option value=\"plan\"" + (action === "plan" ? " selected" : "") + ">предложить блок времени</option><option value=\"review\"" + (action === "review" ? " selected" : "") + ">предложить разбор</option></select></label>",
    "<button data-action=\"run-flow-builder\" data-testid=\"run-flow-builder\">Проверить сценарий</button>",
    "</div>",
    "<div class=\"flow-builder-board\" data-testid=\"flow-builder-board\">",
    renderFlowStepNode("trigger", "Когда", trigger, "событие в LifeOS"),
    renderFlowStepNode("condition", "Если", condition, "условие перед действием"),
    renderFlowStepNode("action", "То", action === "task" ? "предложить задачу" : action === "plan" ? "предложить блок времени" : "предложить разбор", "только предложение, без скрытых изменений"),
    "</div>",
    flows.length ? "<div class=\"flow-template-list\" data-testid=\"flow-template-list\">" + flows.map((flow) => "<div class=\"provider-row\"><span>" + escapeHtml(flow.name) + "<em>" + escapeHtml(flow.steps.map((step) => step.value).join(" → ") || "событие → условие → предложение") + "</em></span><strong>" + flow.runCount + " проверок</strong></div>").join("") + "</div>" : "",
    renderApprovalQueue(state),
    "<div class=\"agent-history-grid\">",
    "<section><div class=\"section-title\">История агентов</div>" + (runs.length ? runs.map(renderAgentRunCard).join("") : "<div class=\"empty compact\">Проверка агента появится после запуска.</div>") + "</section>",
    "<section><div class=\"section-title\">История сценариев</div>" + (flowRuns.length ? "<div class=\"flow-run-list\" data-testid=\"flow-run-list\">" + flowRuns.map((run) => renderFlowRunCard(state, run)).join("") + "</div>" : "<div class=\"empty compact\">Проверка сценария появится после запуска.</div>") + "</section>",
    "</div>",
    "</section>"
  ].join("");
}

function renderTranscriptSegmentRow(segment) {
  return [
    "<div class=\"transcript-segment-row\" data-testid=\"transcript-segment-row\">",
    "<strong>" + escapeHtml(segment.timecode || String(segment.index + 1)) + "</strong>",
    "<span>" + escapeHtml(shorten(segment.text, 160)) + "</span>",
    "</div>"
  ].join("");
}

function renderAudioCheckpointRow(checkpoint) {
  return [
    "<div class=\"audio-checkpoint-row\" data-testid=\"audio-checkpoint-row\">",
    "<strong>" + escapeHtml(checkpoint.timecode || "без времени") + "</strong>",
    "<span>" + escapeHtml(checkpoint.title) + "</span>",
    checkpoint.note ? "<em>" + escapeHtml(shorten(checkpoint.note, 90)) + "</em>" : "",
    "</div>"
  ].join("");
}

function renderPlayerNoteRow(playerNote) {
  return [
    "<div class=\"player-note-row\" data-testid=\"player-note-row\">",
    "<strong>" + escapeHtml(playerNote.title) + "</strong>",
    "<span>" + escapeHtml(shorten(playerNote.text, 120)) + "</span>",
    "</div>"
  ].join("");
}

function renderAudioSourceCard(state, source) {
  const segments = transcriptSegmentsForSource(state, source.id);
  const checkpoints = audioCheckpointsForSource(state, source.id);
  const playerNotes = playerNotesForSource(state, source.id);
  const player = source.dataUrl
    ? "<audio controls src=\"" + escapeHtml(source.dataUrl) + "\"></audio>"
    : "<div class=\"empty compact\">Файл сохранён как источник. Для встроенного проигрывания импортируй аудио до 8 MB; расшифровка всё равно работает.</div>";
  const meta = sourceMetaLabel(source);
  return [
    "<article class=\"audio-card\" data-testid=\"audio-card\">",
    "<div class=\"audio-card-head\">",
    "<div><strong>" + escapeHtml(source.name) + "</strong><span>" + escapeHtml(meta) + "</span></div>",
    "<div class=\"knowledge-actions\"><button data-action=\"open-source-note\" data-id=\"" + escapeHtml(source.id) + "\">Открыть заметку</button><button data-action=\"request-stt-gate\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"request-stt-gate\">Настроить STT</button></div>",
    "</div>",
    player,
    "<div class=\"knowledge-metrics\"><span>фрагменты <strong>" + segments.length + "</strong></span><span>закладки <strong>" + checkpoints.length + "</strong></span><span>заметки <strong>" + playerNotes.length + "</strong></span></div>",
    "<label class=\"transcript-editor-label\">Ручная расшифровка<textarea class=\"transcript-box\" data-testid=\"transcript-input-" + escapeHtml(source.id) + "\" id=\"transcript-" + escapeHtml(source.id) + "\" spellcheck=\"true\">" + escapeHtml(source.transcriptText || "") + "</textarea></label>",
    "<div class=\"audio-actions\">",
    "<button data-action=\"save-transcript\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"save-transcript-" + escapeHtml(source.id) + "\">Сохранить расшифровку</button>",
    "<input id=\"checkpoint-time-" + escapeHtml(source.id) + "\" data-testid=\"checkpoint-time\" autocomplete=\"off\" aria-label=\"Время закладки\">",
    "<input id=\"checkpoint-title-" + escapeHtml(source.id) + "\" data-testid=\"checkpoint-title\" autocomplete=\"off\" aria-label=\"Название закладки\">",
    "<button data-action=\"add-audio-checkpoint\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"add-audio-checkpoint\">Добавить закладку</button>",
    "</div>",
    "<div class=\"transcript-selection-tools\">",
    "<textarea id=\"transcript-snippet-" + escapeHtml(source.id) + "\" data-testid=\"transcript-snippet\" aria-label=\"Transcript snippet\"></textarea>",
    "<div class=\"knowledge-actions\"><button data-action=\"transcript-to-note\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"transcript-to-note\">Заметка</button><button data-action=\"transcript-to-task\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"transcript-to-task\">Задача</button><button data-action=\"transcript-to-claim\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"transcript-to-claim\">Вывод</button><button data-action=\"transcript-to-highlight\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"transcript-to-highlight\">Цитата</button></div>",
    "</div>",
    segments.length ? "<div class=\"transcript-segment-stack\">" + segments.slice(0, 10).map(renderTranscriptSegmentRow).join("") + "</div>" : "<div class=\"empty compact\">Сохрани ручную расшифровку, и LifeOS сделает её searchable и связанной с задачами/заметками.</div>",
    checkpoints.length ? "<div class=\"audio-checkpoint-stack\">" + checkpoints.slice(0, 6).map(renderAudioCheckpointRow).join("") + "</div>" : "<div class=\"empty compact\">Добавь закладки, чтобы быстро вернуться к важным местам.</div>",
    playerNotes.length ? "<div class=\"player-note-stack\">" + playerNotes.slice(0, 6).map(renderPlayerNoteRow).join("") + "</div>" : "",
    "</article>"
  ].join("");
}

function renderPlayerPanel(state) {
  const audios = Object.values(state.sources || {}).filter((source) => !source.deleted && source.kind === "audio").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);
  const stt = state.providers.stt || { status: "not-configured", requiredAction: "Manual transcript is available now." };
  return [
    "<section class=\"info-panel workflow-panel player-workbench\" data-testid=\"player-panel\">",
    "<div class=\"card-head\"><h2>Плеер и расшифровка</h2><span>Аудио, ручная расшифровка, закладки и действия из текста связаны с графом и Контролем.</span></div>",
    "<div class=\"stt-gate\" data-testid=\"stt-gate\"><div><strong>STT</strong><span>" + escapeHtml(humanStatus(stt.status)) + "</span></div><p>" + escapeHtml(stt.requiredAction || "Ручная расшифровка работает сейчас.") + "</p></div>",
    "<button data-action=\"import-audio\" data-testid=\"player-import-audio\">Открыть аудио</button>",
    audios.length ? "<div class=\"audio-card-grid\">" + audios.map((source) => renderAudioSourceCard(state, source)).join("") + "</div>" : "<div class=\"empty compact\">Открой аудио, чтобы слушать, расшифровывать вручную и превращать фрагменты в заметки, задачи или выводы.</div>",
    "</section>"
  ].join("");
}

function renderProviderPanel(state) {
  const providers = state.providers || {};
  const rows = Object.keys(providers).map((key) => {
    const provider = providers[key];
    const action = key === "mail" ? "<button data-action=\"prepare-mail\" data-id=\"" + key + "\">Подготовить</button>" : "";
    const revoke = provider.status !== "local-only" && provider.status !== "revoked" ? "<button data-action=\"revoke-provider\" data-id=\"" + escapeHtml(key) + "\">Отключить</button>" : "";
    const meta = [provider.endpoint, provider.scopes && provider.scopes.length ? provider.scopes.map((scope) => scope.replace(/[-_]/g, " ")).join(", ") : "", provider.revokedAt ? "отключено " + provider.revokedAt : "", provider.lastError ? "есть ошибка" : ""].filter(Boolean).join(" · ");
    return "<div class=\"provider-row provider-action\"><span>" + escapeHtml(provider.label || key) + (meta ? "<em>" + escapeHtml(meta) + "</em>" : "") + "</span><strong>" + escapeHtml(humanStatus(provider.status)) + "</strong>" + action + revoke + "</div>";
  }).join("");
  return [
    "<section class=\"info-panel workflow-panel\" data-testid=\"provider-panel\">",
    "<div class=\"section-title\">Подключения</div>",
    rows,
    "</section>"
  ].join("");
}

function providerPassportCopy(key, provider) {
  const map = {
    ollama: {
      setup: "Запусти Ollama локально и нажми Проверить Ollama.",
      local: "Чат и заметки работают без модели.",
      sends: "Только активный артефакт после явного запуска.",
      fallback: "Локальные ответы и предложения без внешней модели."
    },
    mail: {
      setup: "Подготовить OAuth; до этого вставляй письмо как источник.",
      local: "Вставленное письмо сохраняется как источник и разбирается локально.",
      sends: "Доступы OAuth только после явного разрешения владельца.",
      fallback: "Вставка текста письма во Вход."
    },
    calendar: {
      setup: "Локальный календарь уже работает без внешних аккаунтов.",
      local: "Задачи, напоминания и блоки времени остаются в локальной базе.",
      sends: "Ничего не уходит во внешний календарь.",
      fallback: "План дня и локальный календарь."
    },
    calendarSync: {
      setup: "Подготовить OAuth для синхронизации внешнего календаря.",
      local: "Локальные блоки остаются источником правды.",
      sends: "Доступы чтения/записи календаря только после явного разрешения владельца.",
      fallback: "Экспорт или ручной перенос из календаря."
    },
    automation: {
      setup: "Локальный сценарий: событие, условие, действие, проверка.",
      local: "Создаются только предложения и история проверок.",
      sends: "Ничего не уходит наружу.",
      fallback: "Очередь согласования и Контроль."
    },
    player: {
      setup: "Аудиоплеер локальный; STT подключается отдельно.",
      local: "Проигрывание, ручная расшифровка и закладки локальны.",
      sends: "Аудио не отправляется без подключения STT.",
      fallback: "Редактор ручной расшифровки."
    },
    pwa: {
      setup: "Проверить офлайн-оболочку и установку.",
      local: "Shell кэшируется; данные остаются IndexedDB/localStorage.",
      sends: "Ничего наружу; установку решает браузер.",
      fallback: "Обычный режим браузера."
    },
    stt: {
      setup: "Подключить браузерный или локальный STT.",
      local: "Ручная расшифровка работает сейчас.",
      sends: "Аудио только после отдельного разрешения STT.",
      fallback: "Редактор ручной расшифровки."
    },
    ocr: {
      setup: "Подключить OCR для чеков.",
      local: "Скрин чека сохраняется и заполняется вручную.",
      sends: "Изображение не отправляется без OCR provider.",
      fallback: "Ручное извлечение чека."
    },
    pdf: {
      setup: "Установить PDF-парсер.",
      local: "Файл хранится как источник; экран честно объясняет ограничение.",
      sends: "PDF не парсится и не отправляется без парсера.",
      fallback: "Чтение TXT/MD."
    },
    epub: {
      setup: "Установить EPUB-парсер.",
      local: "Книга хранится как источник; TXT/MD читаются сейчас.",
      sends: "EPUB не парсится и не отправляется без парсера.",
      fallback: "Чтение TXT/MD."
    },
    notifications: {
      setup: "Запросить browser notification permission только явно.",
      local: "Reminders видны в Today/Calendar без permission.",
      sends: "Ничего наружу; permission контролирует браузер.",
      fallback: "Внутренние reminders и Control."
    }
  };
  return map[key] || {
    setup: provider.requiredAction || "Провайдер требует явной настройки владельцем.",
    local: "Локальное состояние Artifact OS остаётся доступным.",
    sends: "Данные не отправляются без явного подтверждения.",
    fallback: "Используй локальный workspace-flow."
  };
}

function providerStatusLabel(status) {
  const labels = {
    "local-only": "локально",
    "not-connected": "не подключено",
    "not-configured": "нужна настройка",
    "permission-required": "нужно разрешение",
    "parser-required": "нужен парсер",
    "needs-owner-credentials": "нужны данные владельца",
    "unchecked": "не проверено",
    "reachable": "endpoint доступен",
    "offline": "офлайн",
    "models_found": "модели найдены",
    "not-run": "не запускалось",
    "blocked_by_browser_or_cors": "заблокировано браузером/CORS",
    "degraded": "частично работает",
    "generation_ok": "генерация прошла",
    "service-worker-ready": "готово локально",
    "revoked": "отключено"
  };
  return labels[String(status || "")] || String(status || "unknown");
}

function renderProviderPassport(state, key, provider) {
  const copy = providerPassportCopy(key, provider);
  const scopes = provider.scopes && provider.scopes.length ? provider.scopes.map((scope) => scope.replace(/[-_]/g, " ")).join(", ") : "локально";
  const status = provider.status || "unknown";
  const canPrepare = ["mail", "calendarSync", "ocr", "stt", "pdf", "epub", "notifications"].includes(key);
  const canProbe = key === "ollama" || key === "pwa";
  const setupAction = canPrepare ? "<button data-action=\"prepare-provider\" data-id=\"" + escapeHtml(key) + "\" data-testid=\"prepare-provider-" + escapeHtml(key) + "\">Подготовить</button>" : "";
  const probeAction = key === "ollama"
    ? "<button data-action=\"probe-ollama\" data-testid=\"probe-provider-ollama\">Проверить Ollama</button><button data-action=\"test-ollama-generation\" data-testid=\"test-provider-ollama-generation\">Тест генерации</button>"
    : key === "pwa"
      ? "<button data-action=\"check-pwa\" data-testid=\"probe-provider-pwa\">Проверить PWA</button>"
      : "";
  const revoke = status !== "local-only" && status !== "revoked" ? "<button data-action=\"revoke-provider\" data-id=\"" + escapeHtml(key) + "\">Отключить</button>" : "";
  const lastRun = Object.values(state.providerRuns || {}).filter((run) => run.providerId === key).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return [
    "<article class=\"provider-passport\" data-testid=\"provider-row-" + escapeHtml(key) + "\" data-provider=\"" + escapeHtml(key) + "\">",
    "<div class=\"provider-passport-head\"><div><span>Подключение</span><strong>" + escapeHtml(provider.label || key) + "</strong></div><mark data-status=\"" + escapeHtml(status) + "\">" + escapeHtml(providerStatusLabel(status)) + "</mark></div>",
    "<div class=\"provider-passport-grid\">",
    "<div><span>Настройка</span><strong>" + escapeHtml(copy.setup) + "</strong></div>",
    "<div><span>Локальная замена</span><strong>" + escapeHtml(copy.local) + "</strong></div>",
    "<div><span>Граница данных</span><strong>" + escapeHtml(copy.sends) + "</strong></div>",
    "<div><span>Доступы</span><strong>" + escapeHtml(scopes) + "</strong></div>",
    "</div>",
    provider.requiredAction ? "<p class=\"provider-required\">" + escapeHtml(provider.requiredAction) + "</p>" : "",
    provider.lastError ? "<div class=\"provider-error\">" + escapeHtml(shorten(provider.lastError, 140)) + "</div>" : "",
    lastRun ? "<div class=\"provider-run-row\" data-testid=\"provider-run-row\"><strong>" + escapeHtml(providerRunLabel(lastRun)) + "</strong><span>" + escapeHtml(shorten(lastRun.summary, 120)) + "</span></div>" : "<div class=\"empty compact\">Пока нет проверки подключения. Действие будет записано в Контроль.</div>",
    "<div class=\"provider-actions\">" + [setupAction, probeAction, revoke].filter(Boolean).join("") + "</div>",
    "</article>"
  ].join("");
}

function renderProviderPanelV2(state) {
  const providers = state.providers || {};
  const preferred = ["ollama", "mail", "calendar", "calendarSync", "ocr", "stt", "pdf", "epub", "notifications", "pwa", "automation", "player"];
  const keys = preferred.filter((key) => providers[key]).concat(Object.keys(providers).filter((key) => !preferred.includes(key)));
  return [
    "<section class=\"info-panel workflow-panel provider-passport-panel\" data-testid=\"provider-panel\">",
    "<div class=\"card-head\"><h2>Подключения</h2><span>Каждое подключение честно показывает, что работает локально, что ждёт настройки и какие данные могут уйти наружу.</span></div>",
    "<div class=\"provider-passport-grid-list\">",
    keys.map((key) => renderProviderPassport(state, key, providers[key])).join(""),
    "</div>",
    "</section>"
  ].join("");
}

function renderPwaPanel(state) {
  const env = state.environment || {};
  const provider = (state.providers || {}).pwa || {};
  const manifest = env.manifestHref || "./manifest.webmanifest";
  const swStatus = env.serviceWorkerStatus || provider.status || "unchecked";
  const installStatus = env.installPromptStatus || "not-seen";
  const displayMode = env.displayMode || "browser";
  const displayLabel = displayMode === "browser" ? "браузер" : displayMode === "standalone" ? "как приложение" : displayMode === "minimal-ui" ? "минимальный режим" : displayMode;
  const error = env.pwaLastError ? "<div class=\"provider-error\">" + escapeHtml(shorten(env.pwaLastError, 140)) + "</div>" : "";
  return [
    "<section class=\"info-panel workflow-panel pwa-panel\" data-testid=\"pwa-panel\">",
    "<div class=\"section-title\">Офлайн и установка</div>",
    "<div class=\"provider-row\"><span>Файл приложения</span><strong data-testid=\"pwa-manifest\">" + escapeHtml(manifest) + "</strong></div>",
    "<div class=\"provider-row\"><span>Офлайн-оболочка</span><strong data-testid=\"pwa-service-worker-status\" data-raw-status=\"" + escapeHtml(swStatus) + "\">" + escapeHtml(humanStatus(swStatus)) + "</strong></div>",
    "<div class=\"provider-row\"><span>Область</span><strong data-testid=\"pwa-service-worker-scope\">" + escapeHtml(env.serviceWorkerScope || "ещё не зарегистрирована") + "</strong></div>",
    "<div class=\"provider-row\"><span>Установка</span><strong data-testid=\"pwa-install-status\" data-raw-status=\"" + escapeHtml(installStatus) + "\">" + escapeHtml(humanStatus(installStatus)) + "</strong></div>",
    "<div class=\"provider-row\"><span>Режим окна</span><strong data-testid=\"pwa-display-mode\" data-raw-status=\"" + escapeHtml(displayMode) + "\">" + escapeHtml(displayLabel) + "</strong></div>",
    "<div class=\"provider-send-box\" data-testid=\"pwa-boundary\"><strong>Что честно работает</strong><span>Оболочка кэшируется локально. Данные остаются в браузерном хранилище. Установка зависит от браузера и не подделывается.</span></div>",
    "<div class=\"provider-actions\"><button data-action=\"check-pwa\" data-testid=\"check-pwa\">Проверить PWA</button><button data-action=\"show-pwa-install\" data-testid=\"show-pwa-install\">Установить</button></div>",
    error,
    "</section>"
  ].join("");
}

const V34_CONTROL_COLLECTIONS = Object.freeze({
  channel: "channels",
  system: "systemDefinitions",
  "system-record": "systemRecords",
  project: "projects",
  "project-item": "projectItems",
  "model-profile": "modelProfiles",
  "smart-home-device": "smartHomeDevices",
  "smart-home-event": "smartHomeEvents",
  "marketplace-pack": "marketplacePacks",
  "installed-pack": "installedPacks",
  "design-profile": "designProfiles",
  database: "customDatabases",
  "database-row": "databaseRows",
  "screen-session": "screenCompanionSessions",
  "twin-snapshot": "personalTwinSnapshots"
});

function pushDeletedControlRows(rows, state, kind) {
  const collection = state[V34_CONTROL_COLLECTIONS[kind]] || {};
  for (const item of Object.values(collection).filter((row) => row && row.deleted)) {
    rows.push({
      kind,
      id: item.id,
      title: item.title || item.name || item.id,
      updatedAt: item.updatedAt || item.createdAt || ""
    });
  }
}

function archiveV34ControlObject(state, kind, object) {
  const collectionKey = V34_CONTROL_COLLECTIONS[kind];
  if (!collectionKey || !object || !object.id || !state[collectionKey] || !state[collectionKey][object.id]) return false;
  state[collectionKey][object.id].deleted = true;
  state[collectionKey][object.id].updatedAt = now();
  return true;
}

function restoreV34ControlObject(state, kind, id) {
  const collectionKey = V34_CONTROL_COLLECTIONS[kind];
  const object = collectionKey && state[collectionKey] ? state[collectionKey][id] : null;
  if (!object) return false;
  object.deleted = false;
  object.updatedAt = now();
  state.graphView.selectedNodeId = id;
  state.activeSurface = graphNodeWorkspace(kind, object);
  addAudit(state, "control.restore", "Restored " + kind + ": " + graphNodeTitle(kind, object, id), object.noteId || state.activeNoteId);
  return true;
}

function recoveryItems(state) {
  const rows = [];
  for (const note of Object.values(state.notes || {}).filter((item) => item.deleted)) rows.push({ kind: "note", id: note.id, title: note.title, updatedAt: note.updatedAt });
  for (const source of Object.values(state.sources || {}).filter((item) => item.deleted)) rows.push({ kind: "source", id: source.id, title: source.name, updatedAt: source.updatedAt });
  for (const task of Object.values(state.tasks || {}).filter((item) => item.deleted)) rows.push({ kind: "task", id: task.id, title: task.title, updatedAt: task.updatedAt });
  for (const reminder of Object.values(state.reminders || {}).filter((item) => item.deleted)) rows.push({ kind: "reminder", id: reminder.id, title: reminder.title, updatedAt: reminder.updatedAt });
  for (const habit of Object.values(state.habits || {}).filter((item) => item.deleted)) rows.push({ kind: "habit", id: habit.id, title: habit.title, updatedAt: habit.updatedAt });
  for (const goal of Object.values(state.goals || {}).filter((item) => item.deleted)) rows.push({ kind: "goal", id: goal.id, title: goal.title, updatedAt: goal.updatedAt });
  for (const block of Object.values(state.planBlocks || {}).filter((item) => item.deleted)) rows.push({ kind: "plan", id: block.id, title: block.title, updatedAt: block.updatedAt });
  for (const kind of Object.keys(V34_CONTROL_COLLECTIONS)) pushDeletedControlRows(rows, state, kind);
  return rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))).slice(0, 12);
}

function controlObjectCounts(state) {
  return [
    ["sources", Object.values(state.sources || {}).filter((item) => !item.deleted).length],
    ["tasks", Object.values(state.tasks || {}).filter((item) => !item.deleted).length],
    ["finance", Object.values(state.financeTransactions || {}).filter((item) => !item.deleted).length],
    ["habits", Object.values(state.habits || {}).filter((item) => !item.deleted).length],
    ["goals", Object.values(state.goals || {}).filter((item) => !item.deleted).length],
    ["insights", Object.values(state.insights || {}).length],
    ["claims", Object.values(state.claims || {}).filter((item) => !item.deleted).length],
    ["questions", Object.values(state.questions || {}).filter((item) => !item.deleted).length],
    ["review", Object.values(state.reviewItems || {}).filter((item) => !item.deleted).length],
    ["reading", Object.values(state.readingItems || {}).filter((item) => !item.deleted).length],
    ["highlights", Object.values(state.highlights || {}).filter((item) => !item.deleted).length],
    ["transcript", Object.values(state.transcriptSegments || {}).filter((item) => !item.deleted).length],
    ["audio checkpoints", Object.values(state.audioCheckpoints || {}).filter((item) => !item.deleted).length],
    ["player notes", Object.values(state.playerNotes || {}).filter((item) => !item.deleted).length],
    ["chat messages", visibleChatMessages(state).length],
    ["receipts", Array.isArray(state.control && state.control.receipts) ? state.control.receipts.length : 0],
    ["saved searches", savedSearchList(state).length],
    ["provider runs", Object.values(state.providerRuns || {}).length],
    ["flow runs", Object.values(state.flowRuns || {}).length],
    ["channels", Object.values(state.channels || {}).filter((item) => !item.deleted).length],
    ["systems", Object.values(state.systemDefinitions || {}).filter((item) => !item.deleted).length],
    ["projects", Object.values(state.projects || {}).filter((item) => !item.deleted).length],
    ["models", Object.values(state.modelProfiles || {}).filter((item) => !item.deleted).length],
    ["home devices", Object.values(state.smartHomeDevices || {}).filter((item) => !item.deleted).length],
    ["marketplace packs", Object.values(state.marketplacePacks || {}).filter((item) => !item.deleted).length],
    ["databases", Object.values(state.customDatabases || {}).filter((item) => !item.deleted).length],
    ["twin snapshots", Object.values(state.personalTwinSnapshots || {}).filter((item) => !item.deleted).length]
  ];
}

function ownerReadinessRows(state) {
  const graph = mapGraph(state);
  const liveSources = Object.values(state.sources || {}).filter((item) => !item.deleted);
  const liveTasks = Object.values(state.tasks || {}).filter((item) => !item.deleted);
  const liveFinance = Object.values(state.financeTransactions || {}).filter((item) => !item.deleted);
  const liveHabits = Object.values(state.habits || {}).filter((item) => !item.deleted);
  const liveGoals = Object.values(state.goals || {}).filter((item) => !item.deleted);
  const liveChatMessages = visibleChatMessages(state);
  const liveKnowledge = [
    Object.values(state.claims || {}).filter((item) => !item.deleted).length,
    Object.values(state.questions || {}).filter((item) => !item.deleted).length,
    Object.values(state.reviewItems || {}).filter((item) => !item.deleted).length,
    Object.values(state.insights || {}).filter((item) => !item.deleted).length
  ].reduce((sum, value) => sum + value, 0);
  const providerStatuses = Object.values(state.providers || {}).map((provider) => provider.status || "unknown");
  const fakeReadyProvider = providerStatuses.some((status) => ["ready", "connected"].includes(status));
  const appliedObjectCount = liveTasks.length + liveFinance.length + liveHabits.length + liveGoals.length + liveKnowledge + liveChatMessages.length;
  const v34Count = [
    Object.values(state.channels || {}).filter((item) => !item.deleted).length,
    Object.values(state.systemDefinitions || {}).filter((item) => !item.deleted).length,
    Object.values(state.marketplacePacks || {}).filter((item) => !item.deleted).length,
    Object.values(state.modelProfiles || {}).filter((item) => !item.deleted).length,
    Object.values(state.customDatabases || {}).filter((item) => !item.deleted).length,
    Object.values(state.screenCompanionSessions || {}).filter((item) => !item.deleted).length,
    Object.values(state.personalTwinSnapshots || {}).filter((item) => !item.deleted).length
  ].reduce((sum, value) => sum + value, 0);
  return [
    {
      id: "artifact-chain",
      label: "Цепочка артефакта",
      status: liveSources.length && appliedObjectCount && graph.nodes.length ? "ok" : "needs-data",
      detail: liveSources.length + " источников · " + appliedObjectCount + " проекций · " + graph.nodes.length + " узлов"
    },
    {
      id: "repository",
      label: "Сохранение базы",
      status: repository && repository.storageMode ? "ok" : "error",
      detail: (repository && repository.storageMode ? repository.storageMode : "недоступно") + " · следов " + state.auditLog.length
    },
    {
      id: "graph-control",
      label: "Связи и Контроль",
      status: graph.nodes.length && graph.links.length && state.auditLog.length ? "ok" : "needs-data",
      detail: graph.nodes.length + " узлов · " + graph.links.length + " связей · " + state.auditLog.length + " следов"
    },
    {
      id: "v34-platform",
      label: "Платформа v34",
      status: v34Count >= 10 && state.providers.screen && state.providers.smartHome && state.providers.marketplace ? "ok" : "needs-data",
      detail: v34Count + " v34 объектов · каналы/системы/паки/модели/базы/разрешения"
    },
    {
      id: "offline",
      label: "Локальный режим",
      status: state.environment.online ? "online" : "offline-ready",
      detail: state.environment.online ? "сеть доступна; локальная база остаётся главной" : "сеть недоступна; локальная база остаётся usable"
    },
    {
      id: "provider-gates",
      label: "Честность подключений",
      status: fakeReadyProvider ? "review" : "ok",
      detail: fakeReadyProvider ? "есть спорный статус готовности; нужно проверить" : "внешние подключения явно локальные, отключены или ждут настройки"
    },
    {
      id: "error-boundary",
      label: "Восстановление интерфейса",
      status: bootError ? "error" : "ready",
      detail: bootError ? shorten(bootError.message || String(bootError), 120) : "при ошибке показывается экран восстановления, база не портится"
    }
  ];
}

function renderOwnerReadinessPanel(state) {
  const rows = ownerReadinessRows(state);
  return [
    "<div class=\"owner-readiness\" data-testid=\"owner-readiness-panel\">",
    "<div class=\"subsection-title\">Готовность для владельца</div>",
    rows.map((row) => {
      return [
        "<div class=\"readiness-row\" data-testid=\"readiness-row\" data-readiness-id=\"" + escapeHtml(row.id) + "\" data-status=\"" + escapeHtml(row.status) + "\">",
        "<span>" + escapeHtml(row.label) + "</span>",
        "<strong data-testid=\"readiness-state\">" + escapeHtml(humanStatus(row.status) || row.status) + "</strong>",
        "<em>" + escapeHtml(row.detail) + "</em>",
        "</div>"
      ].join("");
    }).join(""),
    "</div>"
  ].join("");
}

function buildVaultExportPayload(state) {
  return {
    exportedAt: now(),
    schemaVersion: state.schemaVersion,
    notes: Object.values(state.notes).filter((note) => !note.deleted),
    folders: Object.values(state.folders),
    sources: Object.values(state.sources || {}),
    tasks: Object.values(state.tasks || {}),
    goals: Object.values(state.goals || {}),
    reminders: Object.values(state.reminders || {}),
    habits: Object.values(state.habits || {}),
    financeAccounts: Object.values(state.financeAccounts || {}),
    financeTransactions: Object.values(state.financeTransactions || {}),
    budgets: Object.values(state.budgets || {}),
    subscriptions: Object.values(state.subscriptions || {}),
    insights: Object.values(state.insights || {}),
    claims: Object.values(state.claims || {}),
    questions: Object.values(state.questions || {}),
    reviewItems: Object.values(state.reviewItems || {}),
    readingItems: Object.values(state.readingItems || {}),
    highlights: Object.values(state.highlights || {}),
    transcriptSegments: Object.values(state.transcriptSegments || {}),
    audioCheckpoints: Object.values(state.audioCheckpoints || {}),
    playerNotes: Object.values(state.playerNotes || {}),
    savedSearches: Object.values(state.savedSearches || {}),
    planBlocks: Object.values(state.planBlocks || {}),
    proposals: Object.values(state.proposals || {}),
    chatMessages: Object.values(state.chatMessages || {}),
    agentRuns: Object.values(state.agentRuns || {}),
    providerRuns: Object.values(state.providerRuns || {}),
    flowRuns: Object.values(state.flowRuns || {}),
    flows: Object.values(state.flows || {}),
    channels: Object.values(state.channels || {}),
    systemDefinitions: Object.values(state.systemDefinitions || {}),
    systemRecords: Object.values(state.systemRecords || {}),
    projects: Object.values(state.projects || {}),
    projectItems: Object.values(state.projectItems || {}),
    modelProfiles: Object.values(state.modelProfiles || {}),
    smartHomeDevices: Object.values(state.smartHomeDevices || {}),
    smartHomeEvents: Object.values(state.smartHomeEvents || {}),
    marketplacePacks: Object.values(state.marketplacePacks || {}),
    installedPacks: Object.values(state.installedPacks || {}),
    designProfiles: Object.values(state.designProfiles || {}),
    designStudio: state.designStudio || {},
    customDatabases: Object.values(state.customDatabases || {}),
    databaseRows: Object.values(state.databaseRows || {}),
    screenCompanionSessions: Object.values(state.screenCompanionSessions || {}),
    personalTwinSnapshots: Object.values(state.personalTwinSnapshots || {}),
    providers: state.providers,
    environment: state.environment,
    ollama: state.ollama,
    control: Object.assign({}, state.control, { rollbackSnapshots: [] }),
    backlinks: state.backlinks,
    ghosts: state.ghosts,
    graph: mapGraph(state),
    auditLog: state.auditLog
  };
}

function buildSelectedExportPayload(state, nodeId) {
  const selectedId = nodeId || state.graphView.selectedNodeId || state.activeNoteId;
  const resolved = graphNodeObject(state, selectedId);
  const object = resolved ? resolved.object : getActiveNote(state);
  const noteId = object && object.noteId ? object.noteId : resolved && resolved.kind === "note" ? object.id : state.activeNoteId;
  const sourceId = object && object.sourceId ? object.sourceId : "";
  const graphState = clone(state);
  graphState.graphView = Object.assign({}, graphState.graphView, { selectedNodeId: selectedId, mode: "local", searchQuery: "" });
  return {
    exportedAt: now(),
    schemaVersion: state.schemaVersion,
    selectedId,
    kind: resolved ? resolved.kind : "note",
    object,
    linkedNote: noteId && state.notes[noteId] ? state.notes[noteId] : null,
    linkedSource: sourceId && state.sources[sourceId] ? state.sources[sourceId] : null,
    localGraph: mapGraph(graphState),
    auditTrail: state.auditLog.filter((row) => row.noteId === noteId || row.noteId === selectedId || row.summary.includes(selectedId)).slice(-40)
  };
}

function downloadJsonPayload(payload, filename) {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function backupSummary(payload) {
  if (!payload || typeof payload !== "object") return "Invalid backup payload";
  const rows = [
    ["notes", Array.isArray(payload.notes) ? payload.notes.length : 0],
    ["sources", Array.isArray(payload.sources) ? payload.sources.length : 0],
    ["tasks", Array.isArray(payload.tasks) ? payload.tasks.length : 0],
    ["finance", Array.isArray(payload.financeTransactions) ? payload.financeTransactions.length : 0],
    ["habits", Array.isArray(payload.habits) ? payload.habits.length : 0],
    ["goals", Array.isArray(payload.goals) ? payload.goals.length : 0],
    ["systems", Array.isArray(payload.systemDefinitions) ? payload.systemDefinitions.length : 0],
    ["projects", Array.isArray(payload.projects) ? payload.projects.length : 0],
    ["databases", Array.isArray(payload.customDatabases) ? payload.customDatabases.length : 0],
    ["chatMessages", Array.isArray(payload.chatMessages) ? payload.chatMessages.length : 0],
    ["savedSearches", Array.isArray(payload.savedSearches) ? payload.savedSearches.length : 0],
    ["audit", Array.isArray(payload.auditLog) ? payload.auditLog.length : 0]
  ];
  return rows.map((row) => row[0] + "=" + row[1]).join(", ");
}

function buildRollbackStatePayload(state) {
  const payload = clone(state);
  payload.control = Object.assign({}, payload.control || {}, { rollbackSnapshots: [] });
  payload.commandMessage = "Restored from rollback snapshot";
  return payload;
}

function createRollbackSnapshot(state, label) {
  const snapshot = {
    id: makeId("rollback"),
    title: cleanLine(label || "Manual rollback snapshot"),
    createdAt: now(),
    summary: backupSummary(buildVaultExportPayload(state)),
    payload: buildRollbackStatePayload(state)
  };
  state.control.rollbackSnapshots = [snapshot].concat(state.control.rollbackSnapshots || []).slice(0, 3);
  addAudit(state, "control.rollback.snapshot", "Rollback snapshot created: " + snapshot.title, state.activeNoteId);
  return snapshot.id;
}

function restoreRollbackSnapshot(state, snapshotId) {
  const snapshots = Array.isArray(state.control.rollbackSnapshots) ? state.control.rollbackSnapshots : [];
  const snapshot = snapshots.find((item) => item.id === snapshotId);
  if (!snapshot || !snapshot.payload) return false;
  const restored = normalizeState(snapshot.payload);
  const retainedSnapshots = snapshots.slice(0, 3);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, restored);
  state.control.rollbackSnapshots = retainedSnapshots;
  state.control.lastImportSummary = "Restored rollback snapshot: " + snapshot.title;
  addAudit(state, "control.rollback.restore", "Rollback restored: " + snapshot.title, state.activeNoteId);
  return true;
}

function importBackupPreview(state, payload, filename) {
  const summary = backupSummary(payload);
  const title = "Backup preview: " + cleanLine(filename || "lifeos-backup.json");
  const noteId = createNote(state, title, state.activeFolderId, "# " + title + "\n\n" + summary + "\n\nImported as preview. Apply/merge is intentionally not silent.");
  const sourceId = makeId("source");
  const createdAt = now();
  state.sources[sourceId] = {
    id: sourceId,
    name: cleanLine(filename || "lifeos-backup.json"),
    kind: "backup",
    mime: "application/json",
    size: JSON.stringify(payload).length,
    text: summary,
    dataUrl: "",
    noteId,
    transcriptText: "",
    transcriptStatus: "",
    status: "backup-imported",
    parserStatus: "backup-preview",
    deleted: false,
    createdAt,
    updatedAt: createdAt
  };
  state.control.lastImportSummary = summary;
  state.activeNoteId = noteId;
  state.activeSurface = "control";
  addAudit(state, "control.backup.import", "Backup imported as preview: " + summary, noteId);
  return sourceId;
}

function archiveSelectedControlObject(state) {
  const selectedId = state.graphView.selectedNodeId || state.activeNoteId;
  const resolved = graphNodeObject(state, selectedId);
  if (!resolved) return false;
  if (resolved.kind === "note") {
    deleteNote(state, resolved.object.id);
    return true;
  }
  if (resolved.kind === "source") archiveSource(state, resolved.object.id);
  else if (resolved.kind === "task") archiveTask(state, resolved.object.id);
  else if (resolved.kind === "goal") archiveGoal(state, resolved.object.id);
  else if (resolved.kind === "habit") archiveHabit(state, resolved.object.id);
  else if (resolved.kind === "plan") archivePlanBlock(state, resolved.object.id);
  else if (resolved.kind === "reminder") archiveReminder(state, resolved.object.id);
  else if (archiveV34ControlObject(state, resolved.kind, resolved.object)) {
    // v34 objects share the same soft-delete control contract.
  }
  else {
    addAudit(state, "control.archive.unsupported", "Archive is not implemented for " + resolved.kind, state.activeNoteId);
    return false;
  }
  addAudit(state, "control.archive", "Archived selected " + resolved.kind + ": " + graphNodeTitle(resolved.kind, resolved.object, selectedId), state.activeNoteId);
  return true;
}

function renderProductBrainControlCard(state) {
  const summary = productBrainStatusSummary(state);
  return [
    "<section class=\"product-brain-control-card\" data-testid=\"product-brain-control-card\">",
    "<div class=\"section-title\">Состояние разработки LifeOS</div>",
    "<div class=\"product-brain-state-grid\">",
    "<span>готово <strong>" + (summary.counts.DONE || 0) + "</strong></span>",
    "<span>частично <strong>" + (summary.counts.PARTIAL || 0) + "</strong></span>",
    "<span>сломано <strong>" + (summary.counts.BROKEN || 0) + "</strong></span>",
    "<span>ждёт настройки <strong>" + (summary.counts.GATED || 0) + "</strong></span>",
    "<span>дальше <strong>" + escapeHtml(summary.nextPackage) + "</strong></span>",
    "</div>",
    "<div class=\"provider-row\"><span>Память разработки</span><strong>" + escapeHtml(summary.version || PRODUCT_BRAIN_VERSION) + "</strong></div>",
    "<div class=\"provider-row\"><span>GitHub</span><strong data-testid=\"product-brain-github-status\">" + escapeHtml(summary.githubReleaseStatus) + "</strong></div>",
    "<div class=\"provider-row\"><span>Центр</span><strong>LifeOS Product Brain</strong></div>",
    "<div class=\"knowledge-actions\"><button data-action=\"open-note\" data-id=\"" + PRODUCT_BRAIN_ROOT_ID + "\" data-testid=\"control-open-product-brain\">Открыть источник</button><button data-action=\"set-surface\" data-id=\"graph\" data-testid=\"control-product-brain-graph\">Показать связи</button><button data-action=\"set-surface\" data-id=\"chat\" data-testid=\"control-product-brain-chat\">Спросить</button></div>",
    "</section>"
  ].join("");
}

function renderDataControlPanelV2(state) {
  const rows = recoveryItems(state);
  const usage = formatBytes(state.environment.storageUsage || 0);
  const quota = state.environment.storageQuota ? formatBytes(state.environment.storageQuota) : "unknown";
  const objectCounts = controlObjectCounts(state);
  const selectedId = state.graphView.selectedNodeId || state.activeNoteId;
  const selected = graphNodeObject(state, selectedId);
  const selectedTitle = selected ? graphNodeTitle(selected.kind, selected.object, selectedId) : (getActiveNote(state) ? getActiveNote(state).title : "none");
  const snapshots = Array.isArray(state.control.rollbackSnapshots) ? state.control.rollbackSnapshots : [];
  const corruptRecords = Array.isArray(state.control.corruptRecords) ? state.control.corruptRecords : [];
  const receipts = Array.isArray(state.control.receipts) ? state.control.receipts.slice(0, 8) : [];
  const corruptStatusLabel = (status) => status === "recovered" ? "восстановлено" : "изолировано";
  const providerRows = Object.entries(state.providers || {}).map(([, provider]) => "<span>" + escapeHtml(provider.label || "Подключение") + " <strong>" + escapeHtml(humanStatus(provider.status || "unknown")) + "</strong></span>").join("");
  const privacyZones = Object.entries(state.control.privacyZones || {}).map(([key, value]) => "<span>" + escapeHtml(humanObjectLabel(key)) + " <strong>" + escapeHtml(humanStatus(value) || value) + "</strong></span>").join("");
  const architecture = buildArchitectureSnapshot(state);
  const architectureProblems = architecture.validation.problems || [];
  const lastArchitectureEvent = architecture.eventBus.lastEvent;
  return [
    "<section class=\"info-panel workflow-panel data-control-v2\" data-testid=\"data-control-panel\">",
    "<div class=\"section-title\">Контроль данных</div>",
    "<div class=\"control-actions\" data-testid=\"control-actions\">",
    "<button data-action=\"export-vault\" data-testid=\"control-export-all\">Экспорт всего</button>",
    "<button data-action=\"export-selected-artifact\" data-testid=\"export-selected-artifact\">Экспорт фокуса</button>",
    "<button data-action=\"import-backup\" data-testid=\"import-backup\">Импорт бэкапа</button>",
    "<button data-action=\"create-rollback-snapshot\" data-testid=\"create-rollback-snapshot\">Снимок отката</button>",
    "<button data-action=\"archive-selected-artifact\" data-testid=\"archive-selected-artifact\">В архив</button>",
    "</div>",
    "<div class=\"provider-row\"><span>Версия базы</span><strong>v" + state.schemaVersion + "</strong></div>",
    "<div class=\"provider-row\"><span>Сеть</span><strong data-testid=\"network-status\" data-raw-status=\"" + (state.environment.online ? "online" : "offline") + "\">" + (state.environment.online ? "онлайн" : "офлайн") + "</strong></div>",
    "<div class=\"provider-row\"><span>Хранилище</span><strong>" + escapeHtml(usage + " / " + quota) + "</strong></div>",
    "<div class=\"provider-row\"><span>Закреплено в браузере</span><strong>" + (state.environment.persisted ? "да" : "нет") + "</strong></div>",
    "<div class=\"provider-row\"><span>В фокусе</span><strong data-testid=\"control-selected\">" + escapeHtml(selectedTitle) + "</strong></div>",
    state.control.lastExportSummary ? "<div class=\"provider-row\"><span>Последний экспорт</span><strong data-testid=\"last-export-summary\">" + escapeHtml(state.control.lastExportSummary) + "</strong></div>" : "",
    state.control.lastImportSummary ? "<div class=\"provider-row\"><span>Последний импорт</span><strong data-testid=\"last-import-summary\">" + escapeHtml(state.control.lastImportSummary) + "</strong></div>" : "",
    "<div class=\"storage-map\" data-testid=\"storage-map\">" + objectCounts.map((row) => "<span>" + escapeHtml(controlCountLabel(row[0])) + " <strong>" + row[1] + "</strong></span>").join("") + "</div>",
    "<div class=\"storage-map privacy-map\" data-testid=\"privacy-map\">" + privacyZones + providerRows + "</div>",
    "<details class=\"dev-state\" data-testid=\"dev-state\"><summary>Состояние разработки</summary>",
    renderProductBrainControlCard(state),
    "<div class=\"architecture-contract\" data-testid=\"architecture-contract\">",
    "<div class=\"section-title\">Контракт LifeOS</div>",
    "<div class=\"storage-map\" data-testid=\"architecture-contract-map\">",
    "<span>коллекции <strong data-testid=\"architecture-collection-count\">" + architecture.collections.length + "</strong></span>",
    "<span>рабочие места <strong data-testid=\"architecture-workspace-count\">" + architecture.workspaces.length + "</strong></span>",
    "<span>модули <strong data-testid=\"architecture-module-count\">" + architecture.modules.length + "</strong></span>",
    "<span>адаптеры <strong data-testid=\"architecture-adapter-count\">" + architecture.stateAdapters.length + "</strong></span>",
    "<span>события <strong data-testid=\"architecture-event-count\">" + architecture.eventBus.count + "</strong></span>",
    "</div>",
    "<div class=\"provider-row\"><span>Граница</span><strong data-testid=\"architecture-version\">" + escapeHtml(architecture.architectureVersion) + "</strong></div>",
    "<div class=\"provider-row\"><span>Проверка</span><strong data-testid=\"architecture-validation\">" + (architecture.validation.ok ? "ок" : escapeHtml(architectureProblems.join("; "))) + "</strong></div>",
    lastArchitectureEvent ? "<div class=\"provider-row\"><span>Последнее событие</span><strong data-testid=\"architecture-last-event\">" + escapeHtml(lastArchitectureEvent.type + " / " + lastArchitectureEvent.summary) + "</strong></div>" : "<div class=\"empty compact\" data-testid=\"architecture-last-event\">Событий архитектуры пока нет.</div>",
    "</div>",
    renderOwnerReadinessPanel(state),
    "</details>",
    "<div class=\"provider-row\"><span>Снимки отката</span><strong data-testid=\"rollback-count\">" + snapshots.length + "</strong></div>",
    snapshots.length ? snapshots.map((snapshot) => "<div class=\"recovery-row rollback-row\" data-testid=\"rollback-row\"><span>" + escapeHtml(snapshot.title + " / " + snapshot.summary) + "</span><button data-action=\"restore-rollback-snapshot\" data-id=\"" + escapeHtml(snapshot.id) + "\" data-testid=\"restore-rollback-snapshot\">Восстановить</button></div>").join("") : "<div class=\"empty compact\" data-testid=\"rollback-empty\">Снимков отката пока нет.</div>",
    "<div class=\"provider-row\"><span>Повреждённые записи</span><strong data-testid=\"corrupt-record-count\">" + corruptRecords.length + "</strong></div>",
    corruptRecords.length ? corruptRecords.map((record) => "<div class=\"recovery-row corrupt-row\" data-testid=\"corrupt-record-row\"><span>" + escapeHtml(corruptStatusLabel(record.status) + " / " + record.kind + ": " + record.reason) + "</span><button data-action=\"recover-corrupt-record\" data-id=\"" + escapeHtml(record.id) + "\" data-testid=\"recover-corrupt-record\"" + (record.status === "recovered" ? " disabled" : "") + ">Восстановить</button></div>").join("") : "<div class=\"empty compact\" data-testid=\"corrupt-record-empty\">Изолированных поврежденных записей нет.</div>",
    "<div class=\"provider-row\"><span>Receipts</span><strong data-testid=\"receipt-count\">" + (Array.isArray(state.control.receipts) ? state.control.receipts.length : 0) + "</strong></div>",
    receipts.length ? receipts.map((receipt) => "<div class=\"recovery-row receipt-row\" data-testid=\"receipt-row\"><span>" + escapeHtml(receipt.kind + " / " + receipt.summary) + "</span><button data-action=\"focus-graph-node\" data-id=\"" + escapeHtml(receipt.objectId) + "\" data-testid=\"receipt-open-object\">Открыть след</button></div>").join("") : "<div class=\"empty compact\" data-testid=\"receipt-empty\">Receipts появятся после действий владельца.</div>",
    "<div class=\"provider-row\"><span>Архив</span><strong>" + rows.length + "</strong></div>",
    rows.length ? rows.map((row) => "<div class=\"recovery-row\" data-testid=\"recovery-row\"><span>" + escapeHtml(humanObjectLabel(row.kind) + ": " + row.title) + "</span><button data-action=\"restore-" + row.kind + "\" data-id=\"" + escapeHtml(row.id) + "\">Вернуть</button></div>").join("") : "<div class=\"empty compact\">Архив пуст.</div>",
    "</section>"
  ].join("");
}

function renderDataControlPanel(state) {
  return renderDataControlPanelV2(state);
  const rows = recoveryItems(state);
  const usage = formatBytes(state.environment.storageUsage || 0);
  const quota = state.environment.storageQuota ? formatBytes(state.environment.storageQuota) : "unknown";
  const objectCounts = [
    ["sources", Object.values(state.sources || {}).filter((item) => !item.deleted).length],
    ["tasks", Object.values(state.tasks || {}).filter((item) => !item.deleted).length],
    ["finance", Object.values(state.financeTransactions || {}).filter((item) => !item.deleted).length],
    ["habits", Object.values(state.habits || {}).filter((item) => !item.deleted).length],
    ["goals", Object.values(state.goals || {}).filter((item) => !item.deleted).length],
    ["insights", Object.values(state.insights || {}).length],
    ["claims", Object.values(state.claims || {}).filter((item) => !item.deleted).length],
    ["questions", Object.values(state.questions || {}).filter((item) => !item.deleted).length],
    ["review", Object.values(state.reviewItems || {}).filter((item) => !item.deleted).length],
    ["reading", Object.values(state.readingItems || {}).filter((item) => !item.deleted).length],
    ["highlights", Object.values(state.highlights || {}).filter((item) => !item.deleted).length],
    ["transcript", Object.values(state.transcriptSegments || {}).filter((item) => !item.deleted).length],
    ["audio checkpoints", Object.values(state.audioCheckpoints || {}).filter((item) => !item.deleted).length],
    ["player notes", Object.values(state.playerNotes || {}).filter((item) => !item.deleted).length],
    ["provider runs", Object.values(state.providerRuns || {}).length],
    ["flow runs", Object.values(state.flowRuns || {}).length]
  ];
  return [
    "<section class=\"info-panel workflow-panel\" data-testid=\"data-control-panel\">",
    "<div class=\"section-title\">Контроль</div>",
    "<div class=\"provider-row\"><span>Schema</span><strong>v" + state.schemaVersion + "</strong></div>",
    "<div class=\"provider-row\"><span>Network</span><strong data-testid=\"network-status\">" + (state.environment.online ? "online" : "offline") + "</strong></div>",
    "<div class=\"provider-row\"><span>Storage</span><strong>" + escapeHtml(usage + " / " + quota) + "</strong></div>",
    "<div class=\"provider-row\"><span>Persisted</span><strong>" + (state.environment.persisted ? "yes" : "no") + "</strong></div>",
    "<div class=\"storage-map\" data-testid=\"storage-map\">" + objectCounts.map((row) => "<span>" + escapeHtml(row[0]) + " <strong>" + row[1] + "</strong></span>").join("") + "</div>",
    "<div class=\"provider-row\"><span>Recovery</span><strong>" + rows.length + "</strong></div>",
    rows.length ? rows.map((row) => {
      return "<div class=\"recovery-row\" data-testid=\"recovery-row\"><span>" + escapeHtml(row.kind + ": " + row.title) + "</span><button data-action=\"restore-" + row.kind + "\" data-id=\"" + escapeHtml(row.id) + "\">Вернуть</button></div>";
    }).join("") : "<div class=\"empty compact\">Архив пуст.</div>",
    "</section>"
  ].join("");
}

function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return Math.round(value / 102.4) / 10 + " KB";
  return Math.round(value / 1024 / 102.4) / 10 + " MB";
}

function humanObjectLabel(kind) {
  const labels = {
    source: "Источник",
    note: "Заметка",
    task: "Задача",
    reminder: "Напоминание",
    habit: "Привычка",
    goal: "Цель",
    plan: "План",
    finance: "Деньги",
    backup: "Бэкап",
    image: "Скрин",
    audio: "Аудио",
    book: "Книга",
    text: "Текст",
    mail: "Письмо",
    file: "Файл",
    channel: "Канал",
    system: "Система",
    "system-record": "Запись системы",
    project: "Проект",
    "project-item": "Пункт проекта",
    "model-profile": "Маршрут модели",
    "smart-home-device": "Устройство дома",
    "smart-home-event": "Событие дома",
    "marketplace-pack": "Пакет системы",
    "installed-pack": "Установка пакета",
    "design-profile": "Профиль дизайна",
    database: "База",
    "database-row": "Строка базы",
    "screen-session": "Screen Companion",
    "twin-snapshot": "Снимок памяти"
  };
  return labels[String(kind || "")] || String(kind || "Объект");
}

function humanStatus(value) {
  const labels = {
    captured: "ждёт разбора",
    "text-ready": "текст готов",
    "audio-stored": "аудио сохранено",
    stored: "сохранено",
    reading: "в чтении",
    gated: "нужно подключение",
    queued: "в очереди",
    "manual-transcript-required": "нужна расшифровка",
    "manual-transcript-ready": "расшифровка готова",
    "transcript-ready": "расшифровка готова",
    "needs-owner-transcript": "нужна расшифровка",
    "stt-provider-gated": "STT подключается отдельно",
    "ocr-manual-required": "чек заполняется вручную",
    "manual-extraction-ready": "извлечение готово",
    "pdf-parser-required": "PDF ждёт парсер",
    "epub-parser-required": "EPUB ждёт парсер",
    "parser-required": "нужен парсер",
    "backup-preview": "предпросмотр бэкапа",
    "backup-imported": "бэкап загружен",
    open: "открыто",
    applied: "принято",
    done: "готово",
    active: "активно",
    revoked: "отключено",
    unchecked: "не проверено",
    reachable: "endpoint доступен",
    "models_found": "модели найдены",
    "blocked_by_browser_or_cors": "заблокировано браузером/CORS",
    degraded: "частично работает",
    offline: "офлайн",
    online: "онлайн",
    blocked: "заблокировано",
    "service-worker-ready": "офлайн-оболочка готова",
    supported: "поддерживается",
    unsupported: "не поддерживается",
    "service-worker-error": "ошибка service worker",
    "not-seen": "браузер не предложил",
    available: "можно установить",
    accepted: "установка принята",
    dismissed: "установка отклонена",
    prompted: "запрос показан",
    "browser-menu-required": "через меню браузера",
    "permission-required": "нужно разрешение",
    "not-connected": "не подключено",
    "not-configured": "нужна настройка",
    "needs-owner-credentials": "нужны данные владельца",
    "local-only": "локально",
    "proposal_created": "предложение создано",
    "dry-run": "черновой прогон",
    "test-generation": "тест генерации",
    "generation_ok": "генерация прошла",
    "not-run": "не запускалось",
    "needs-data": "нужно действие",
    "offline-ready": "готово офлайн",
    ready: "готово",
    ok: "ок",
    review: "проверить",
    error: "ошибка",
    selected: "выбрано"
  };
  return labels[String(value || "")] || String(value || "");
}

function sourceMetaLabel(source) {
  if (!source) return "";
  const parts = [
    humanObjectLabel(source.kind),
    humanStatus(source.status),
    humanStatus(source.parserStatus),
    humanStatus(source.transcriptStatus),
    source.size ? formatBytes(source.size) : ""
  ].filter(Boolean);
  return Array.from(new Set(parts)).join(" · ");
}

function providerRunLabel(run) {
  if (!run) return "";
  const kindLabels = {
    prepare: "подготовка",
    probe: "проверка",
    revoke: "отключение",
    "dry-run": "черновой прогон",
    "proposal-dry-run": "предложения",
    "test-generation": "тест генерации",
    "model-select": "модель",
    "service-worker-check": "проверка PWA",
    "owner-check": "проверка владельца",
    "install-prompt": "установка"
  };
  return (kindLabels[run.kind] || humanStatus(run.kind) || run.kind) + " / " + humanStatus(run.status || "");
}

function controlCountLabel(key) {
  const labels = {
    sources: "источники",
    tasks: "задачи",
    finance: "деньги",
    habits: "привычки",
    goals: "цели",
    insights: "инсайты",
    claims: "выводы",
    questions: "вопросы",
    review: "повторение",
    reading: "чтение",
    highlights: "цитаты",
    transcript: "расшифровка",
    "audio checkpoints": "аудио-закладки",
    "player notes": "заметки плеера",
    "chat messages": "сообщения чата",
    "saved searches": "поиски",
    "provider runs": "проверки провайдеров",
    "flow runs": "прогоны потоков",
    channels: "каналы",
    systems: "системы",
    projects: "проекты",
    models: "модели",
    "home devices": "устройства дома",
    "marketplace packs": "пакеты систем",
    databases: "базы",
    "twin snapshots": "снимки памяти"
  };
  return labels[key] || key;
}

function auditTypeLabel(type) {
  const value = String(type || "");
  if (!value) return "Событие";
  if (value.includes("capture") || value.includes("source")) return "Источник";
  if (value.includes("task") || value.includes("reminder") || value.includes("plan")) return "План";
  if (value.includes("finance") || value.includes("receipt") || value.includes("budget")) return "Деньги";
  if (value.includes("habit") || value.includes("goal")) return "Прогресс";
  if (value.includes("graph") || value.includes("link")) return "Связь";
  if (value.includes("provider") || value.includes("ollama") || value.includes("pwa")) return "Подключение";
  if (value.includes("rollback") || value.includes("backup") || value.includes("control")) return "Контроль";
  if (value.includes("chat")) return "Чат";
  if (value.includes("agent") || value.includes("flow")) return "Сценарий";
  if (value.includes("reader") || value.includes("highlight") || value.includes("knowledge")) return "Знание";
  return value.split(".").map((part) => part ? part[0].toUpperCase() + part.slice(1) : "").join(" ");
}

function sourcesForPanel(state, note) {
  const sources = Object.values(state.sources || {}).filter((source) => !source.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!note) return sources.slice(0, 6);
  const attached = sources.filter((source) => source.noteId === note.id);
  const recent = sources.filter((source) => source.noteId !== note.id).slice(0, 4);
  return attached.concat(recent).slice(0, 8);
}

function renderSourcePanel(state, note) {
  const sources = sourcesForPanel(state, note);
  return [
    "<section class=\"info-panel workflow-panel\" data-testid=\"sources-panel\">",
    "<div class=\"section-title\">Источники</div>",
    sources.length ? sources.map((source) => renderSourceRow(source, state)).join("") : "<div class=\"empty compact\">Импортируй текст, книгу, файл или аудио.</div>",
    "</section>"
  ].join("");
}

function renderSourceRow(source, state) {
  const note = source.noteId ? state.notes[source.noteId] : null;
  const meta = sourceMetaLabel(source);
  const transcript = source.kind === "audio" ? [
    "<textarea class=\"transcript-box\" data-testid=\"transcript-input-" + escapeHtml(source.id) + "\" id=\"transcript-" + escapeHtml(source.id) + "\" spellcheck=\"true\">" + escapeHtml(source.transcriptText || "") + "</textarea>",
    "<button data-action=\"save-transcript\" data-id=\"" + escapeHtml(source.id) + "\" data-testid=\"save-transcript-" + escapeHtml(source.id) + "\">Сохранить расшифровку</button>"
  ].join("") : "";
  return [
    "<div class=\"source-row\" data-testid=\"source-row\">",
    "<div class=\"source-main\">",
    "<button class=\"source-name\" data-action=\"open-source-note\" data-id=\"" + escapeHtml(source.id) + "\">" + escapeHtml(source.name) + "</button>",
    "<span>" + escapeHtml(meta) + "</span>",
    note ? "<span>Связано с " + escapeHtml(note.title) + "</span>" : "<span>Сохранено без заметки-проекции</span>",
    "</div>",
    transcript,
    "<button data-action=\"archive-source\" data-id=\"" + escapeHtml(source.id) + "\">Архив</button>",
    "</div>"
  ].join("");
}

function goalProgress(state, goalId) {
  const tasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.goalId === goalId);
  const done = tasks.filter((task) => task.status === "done").length;
  return { done, total: tasks.length };
}

function renderTodayPanel(state, note) {
  const today = todayKey();
  const tasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.day === today).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const goals = Object.values(state.goals || {}).filter((goal) => !goal.deleted).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).slice(0, 8);
  const blocks = Object.values(state.planBlocks || {}).filter((block) => !block.deleted && block.day === today).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return [
    "<section class=\"info-panel workflow-panel\" data-testid=\"today-panel\">",
    "<div class=\"section-title\">Сегодня и цели</div>",
    "<div class=\"compact-form\">",
    "<input id=\"task-input\" data-testid=\"task-input\" autocomplete=\"off\" aria-label=\"Task\" value=\"\">",
    "<button data-action=\"add-task\" data-testid=\"add-task\">Добавить</button>",
    "</div>",
    "<div class=\"compact-form\">",
    "<input id=\"goal-input\" data-testid=\"goal-input\" autocomplete=\"off\" aria-label=\"Goal\" value=\"\">",
    "<button data-action=\"add-goal\" data-testid=\"add-goal\">Цель</button>",
    "</div>",
    "<div class=\"compact-form\">",
    "<input id=\"plan-input\" data-testid=\"plan-input\" autocomplete=\"off\" aria-label=\"Plan block\" value=\"\">",
    "<button data-action=\"add-plan-block\" data-testid=\"add-plan-block\">В план</button>",
    "</div>",
    blocks.length ? blocks.map((block) => renderPlanRow(block)).join("") : "",
    tasks.length ? tasks.map((task) => renderTaskRow(task)).join("") : "<div class=\"empty compact\">На сегодня пока нет открытых действий.</div>",
    goals.length ? goals.map((goal) => renderGoalRow(goal, state)).join("") : "",
    "</section>"
  ].join("");
}

function renderTaskRow(task) {
  const done = task.status === "done";
  return [
    "<div class=\"task-row" + (done ? " done" : "") + "\" data-testid=\"task-row\">",
    "<button class=\"toggle-button\" data-action=\"toggle-task\" data-id=\"" + escapeHtml(task.id) + "\" data-testid=\"task-toggle\">" + (done ? "Готово" : "Открыто") + "</button>",
    "<span>" + escapeHtml(task.title) + "</span>",
    "<button class=\"mini-button\" data-action=\"archive-task\" data-id=\"" + escapeHtml(task.id) + "\">Архив</button>",
    "</div>"
  ].join("");
}

function renderPlanRow(block) {
  const done = block.status === "done";
  return [
    "<div class=\"task-row plan-row" + (done ? " done" : "") + "\" data-testid=\"plan-row\">",
    "<button class=\"toggle-button\" data-action=\"toggle-plan-block\" data-id=\"" + escapeHtml(block.id) + "\" data-testid=\"plan-toggle\">" + (done ? "Готово" : "План") + "</button>",
    "<span>" + escapeHtml(block.title) + "</span>",
    "<button class=\"mini-button\" data-action=\"archive-plan\" data-id=\"" + escapeHtml(block.id) + "\">Архив</button>",
    "</div>"
  ].join("");
}

function renderGoalRow(goal, state) {
  const progress = goalProgress(state, goal.id);
  const done = goal.status === "done";
  return [
    "<div class=\"goal-row" + (done ? " done" : "") + "\" data-testid=\"goal-row\">",
    "<button class=\"toggle-button\" data-action=\"toggle-goal\" data-id=\"" + escapeHtml(goal.id) + "\" data-testid=\"goal-toggle\">" + (done ? "Done" : "Active") + "</button>",
    "<span>" + escapeHtml(goal.title) + "</span>",
    "<strong>" + progress.done + "/" + progress.total + "</strong>",
    "<button class=\"mini-button\" data-action=\"archive-goal\" data-id=\"" + escapeHtml(goal.id) + "\">Archive</button>",
    "</div>"
  ].join("");
}

function renderTodayPanelV5(state, note) {
  const today = todayKey();
  const tasks = Object.values(state.tasks || {}).filter((task) => !task.deleted && task.day === today).sort(sortScheduledItems);
  const goals = Object.values(state.goals || {}).filter((goal) => !goal.deleted).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).slice(0, 5);
  const blocks = Object.values(state.planBlocks || {}).filter((block) => !block.deleted && block.day === today).sort(sortScheduledItems);
  return [
    "<section class=\"info-panel workflow-panel today-workbench\" data-testid=\"today-panel\">",
    "<div class=\"section-title\">Сегодня</div>",
    "<div class=\"task-composer\">",
    "<input id=\"task-input\" data-testid=\"task-input\" autocomplete=\"off\" aria-label=\"Task\" value=\"\">",
    "<input id=\"task-day\" data-testid=\"task-day\" type=\"date\" aria-label=\"Task date\" value=\"" + escapeHtml(today) + "\">",
    "<input id=\"task-time\" data-testid=\"task-time-input\" type=\"time\" aria-label=\"Task time\" value=\"\">",
    "<button data-action=\"add-task\" data-testid=\"add-task\">Добавить</button>",
    "</div>",
    "<div class=\"goal-composer\">",
    "<input id=\"goal-input\" data-testid=\"goal-input\" autocomplete=\"off\" aria-label=\"Goal\" value=\"\">",
    "<button data-action=\"add-goal\" data-testid=\"add-goal\">Цель</button>",
    "</div>",
    "<div class=\"plan-composer\">",
    "<input id=\"plan-input\" data-testid=\"plan-input\" autocomplete=\"off\" aria-label=\"Plan block\" value=\"\">",
    "<input id=\"plan-day\" data-testid=\"plan-day\" type=\"date\" aria-label=\"Plan date\" value=\"" + escapeHtml(today) + "\">",
    "<input id=\"plan-time\" data-testid=\"plan-time-input\" type=\"time\" aria-label=\"Plan time\" value=\"\">",
    "<button data-action=\"add-plan-block\" data-testid=\"add-plan-block\">План</button>",
    "</div>",
    "<div class=\"timeline\" data-testid=\"day-timeline\">",
    blocks.length || tasks.length ? blocks.map((block) => renderPlanRowV5(state, block)).concat(tasks.map((task) => renderTaskRowV5(state, task))).join("") : "<div class=\"empty compact\">На сегодня пока пусто.</div>",
    "</div>",
    goals.length ? "<div class=\"goal-stack\">" + goals.map((goal) => renderGoalRow(goal, state)).join("") + "</div>" : "",
    "</section>"
  ].join("");
}

function renderTaskRowV5(state, task) {
  const done = task.status === "done";
  const item = Object.assign({ kind: "task" }, task);
  return [
    "<div class=\"task-row" + (done ? " done" : "") + "\" data-testid=\"task-row\">",
    "<div class=\"task-main\"><time data-testid=\"task-time\">" + escapeHtml(formatSchedule(task)) + "</time><span>" + escapeHtml(task.title) + "</span><small>" + escapeHtml(scheduleSourceHint(state, item)) + "</small></div>",
    "<div class=\"task-actions\">" + renderScheduleActions(item) + "</div>",
    "</div>"
  ].join("");
}

function renderPlanRowV5(state, block) {
  const done = block.status === "done";
  const item = Object.assign({ kind: "plan" }, block);
  return [
    "<div class=\"task-row plan-row" + (done ? " done" : "") + "\" data-testid=\"plan-row\">",
    "<div class=\"task-main\"><time>" + escapeHtml(formatSchedule(block)) + "</time><span>" + escapeHtml(block.title) + "</span><small>" + escapeHtml(scheduleSourceHint(state, item)) + "</small></div>",
    "<div class=\"task-actions\">" + renderScheduleActions(item) + "</div>",
    "</div>"
  ].join("");
}

function renderOllamaPanel(state) {
  const models = state.ollama.models && state.ollama.models.length ? state.ollama.models.join(", ") : "модели не найдены";
  const error = state.ollama.lastError ? "<div class=\"provider-error\">" + escapeHtml(shorten(state.ollama.lastError, 120)) + "</div>" : "";
  const activeNote = getActiveNote(state);
  const modelOptions = (state.ollama.models || []).map((model) => {
    const selected = model === state.ollama.selectedModel ? " selected" : "";
    return "<option value=\"" + escapeHtml(model) + "\"" + selected + ">" + escapeHtml(model) + "</option>";
  }).join("");
  const runs = Object.values(state.providerRuns || {}).filter((run) => run.providerId === "ollama").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  return [
    "<section class=\"info-panel workflow-panel\" data-testid=\"ollama-panel\">",
    "<div class=\"section-title\">Локальный AI / Ollama</div>",
    "<div class=\"provider-row\"><span>Статус</span><strong data-testid=\"ollama-status\" data-raw-status=\"" + escapeHtml(state.ollama.status) + "\">" + escapeHtml(humanStatus(state.ollama.status)) + "</strong></div>",
    "<input id=\"ollama-endpoint\" data-testid=\"ollama-endpoint\" autocomplete=\"off\" aria-label=\"Ollama endpoint\" value=\"" + escapeHtml(state.ollama.endpoint) + "\">",
    "<div class=\"provider-actions\"><button data-action=\"probe-ollama\" data-testid=\"probe-ollama\">Проверить Ollama</button><button data-action=\"test-ollama-generation\" data-testid=\"test-ollama-generation\">Тест генерации</button><button data-action=\"ollama-dry-run\" data-testid=\"ollama-dry-run\">Создать предложения</button><button data-action=\"revoke-provider\" data-id=\"ollama\" data-testid=\"revoke-ollama\">Отключить</button></div>",
    state.ollama.models.length ? "<label class=\"provider-select\">Модель<select id=\"ollama-model\" data-testid=\"ollama-model\" aria-label=\"Ollama model\">" + modelOptions + "</select><button data-action=\"save-ollama-model\" data-testid=\"save-ollama-model\">Сохранить модель</button></label>" : "",
    "<div class=\"provider-row\"><span>Модели</span><strong>" + escapeHtml(models) + "</strong></div>",
    "<div class=\"provider-row\"><span>Выбрана</span><strong data-testid=\"ollama-selected-model\">" + escapeHtml(state.ollama.selectedModel || "не выбрана") + "</strong></div>",
    "<div class=\"provider-row\"><span>Тест генерации</span><strong data-testid=\"ollama-generation-status\">" + escapeHtml(humanStatus(state.ollama.lastGenerationStatus || (state.ollama.status === "models_found" ? "not-run" : state.ollama.status))) + "</strong></div>",
    state.ollama.lastLatencyMs ? "<div class=\"provider-row\"><span>Latency</span><strong data-testid=\"ollama-latency\">" + escapeHtml(String(state.ollama.lastLatencyMs)) + "ms</strong></div>" : "",
    state.ollama.lastGenerationSample ? "<div class=\"provider-row\"><span>Ответ модели</span><strong data-testid=\"ollama-generation-sample\">" + escapeHtml(shorten(state.ollama.lastGenerationSample, 120)) + "</strong></div>" : "",
    "<div class=\"provider-row\"><span>Доступ</span><strong>" + escapeHtml((state.ollama.scopes || []).map((scope) => scope.replace(/[-_]/g, " ")).join(", ") || "активный артефакт") + "</strong></div>",
    "<div class=\"provider-send-box\" data-testid=\"ollama-send-preview\"><strong>Что будет отправлено после явного запуска</strong><span>" + escapeHtml(activeNote ? activeNote.title : "Нет активной заметки") + " · только предложения · без скрытых изменений</span></div>",
    state.ollama.lastCheckedAt ? "<div class=\"provider-row\"><span>Проверено</span><strong>" + escapeHtml(state.ollama.lastCheckedAt) + "</strong></div>" : "",
    state.ollama.revokedAt ? "<div class=\"provider-row\"><span>Отключено</span><strong>" + escapeHtml(state.ollama.revokedAt) + "</strong></div>" : "",
    error,
    runs.length ? "<div class=\"provider-run-list\" data-testid=\"provider-run-list\">" + runs.map((run) => "<div class=\"provider-run-row\" data-testid=\"provider-run-row\"><strong>" + escapeHtml(providerRunLabel(run)) + "</strong><span>" + escapeHtml(shorten(run.summary, 120)) + "</span></div>").join("") + "</div>" : "<div class=\"empty compact\">Ollama ещё не проверялся. Проверка всегда явная.</div>",
    "</section>"
  ].join("");
}

function renderAudit(state) {
  const rows = state.auditLog.slice(-8).reverse();
  return rows.length ? rows.map((row) => {
    return "<div class=\"audit-row\"><strong>" + escapeHtml(auditTypeLabel(row.type)) + "</strong><span>" + escapeHtml(shorten(row.summary, 74)) + "</span></div>";
  }).join("") : "<div class=\"empty compact\">Изменений пока нет.</div>";
}

function mountGraph() {
  const canvas = document.querySelector("#graph-canvas");
  if (!canvas || !store) return;
  graphEngine = new GraphCanvas(canvas, mapGraph(store.state), store.state);
}

function renderSidePanelsOnly() {
  const container = document.querySelector("#link-panels");
  const note = getActiveNote(store.state);
  if (container && note) {
    container.innerHTML = [
      renderBacklinkPanel(incomingBacklinks(store.state, note.id)),
      renderOutlinkPanel(outgoingLinks(store.state, note), store.state),
      renderGhostPanel(store.state, store.state.ghosts[store.state.graphView.selectedNodeId] || null)
    ].join("");
  }
  updateLiveMetrics();
  updateSaveStatus();
}

function updateLiveMetrics() {
  const note = getActiveNote(store.state);
  const linkCount = document.querySelector("#live-link-count");
  const preview = document.querySelector("#markdown-preview");
  if (note && linkCount) linkCount.textContent = note.links.length + " links";
  if (note && preview) preview.innerHTML = renderMarkdown(note.body, store.state);
}

function updateSaveStatus() {
  const status = document.querySelector("#save-status");
  if (!status || !store) return;
  const map = {
    idle: "готово",
    dirty: "есть правка",
    saving: "сохраняю",
    saved: "сохранено",
    error: "ошибка"
  };
  status.textContent = map[store.saveState] || "готово";
  status.dataset.state = store.saveState;
}

function exportVault(state, selectedId) {
  const exportPayload = selectedId ? buildSelectedExportPayload(state, selectedId) : buildVaultExportPayload(state);
  const filename = selectedId ? "lifeos-selected-artifact.json" : "lifeos-knowledge-vault.json";
  downloadJsonPayload(exportPayload, filename);
  return { filename, summary: selectedId ? "selected " + (exportPayload.kind || "artifact") + " / " + (exportPayload.selectedId || selectedId) : backupSummary(exportPayload) };
  const payload = {
    exportedAt: now(),
    notes: Object.values(state.notes).filter((note) => !note.deleted),
    folders: Object.values(state.folders),
    sources: Object.values(state.sources || {}),
    tasks: Object.values(state.tasks || {}),
    goals: Object.values(state.goals || {}),
    reminders: Object.values(state.reminders || {}),
    habits: Object.values(state.habits || {}),
    financeAccounts: Object.values(state.financeAccounts || {}),
    financeTransactions: Object.values(state.financeTransactions || {}),
    budgets: Object.values(state.budgets || {}),
    subscriptions: Object.values(state.subscriptions || {}),
    insights: Object.values(state.insights || {}),
    claims: Object.values(state.claims || {}),
    questions: Object.values(state.questions || {}),
    reviewItems: Object.values(state.reviewItems || {}),
    readingItems: Object.values(state.readingItems || {}),
    highlights: Object.values(state.highlights || {}),
    transcriptSegments: Object.values(state.transcriptSegments || {}),
    audioCheckpoints: Object.values(state.audioCheckpoints || {}),
    playerNotes: Object.values(state.playerNotes || {}),
    planBlocks: Object.values(state.planBlocks || {}),
    proposals: Object.values(state.proposals || {}),
    chatMessages: Object.values(state.chatMessages || {}),
    agentRuns: Object.values(state.agentRuns || {}),
    providerRuns: Object.values(state.providerRuns || {}),
    flowRuns: Object.values(state.flowRuns || {}),
    flows: Object.values(state.flows || {}),
    providers: state.providers,
    environment: state.environment,
    ollama: state.ollama,
    backlinks: state.backlinks,
    ghosts: state.ghosts,
    graph: mapGraph(state),
    auditLog: state.auditLog
  };
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "lifeos-knowledge-vault.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function promptValue(message, fallback) {
  const value = window.prompt(message, fallback || "");
  return value == null ? "" : cleanLine(value);
}

async function importFilesFromInput(fileList, forcedKind) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const payloads = [];
  for (const file of files) {
    payloads.push(await fileToSourcePayload(file, forcedKind));
  }
  await store.commit("Sources imported", (state) => {
    for (const payload of payloads) {
      const sourceId = addImportedSource(state, payload);
      createActionProposalsForSource(state, sourceId);
      const source = state.sources[sourceId];
      addChatMessage(state, "assistant", "Imported " + source.name + " and prepared next actions.", source.id, source.noteId);
    }
  });
}

async function importBackupFromInput(fileList) {
  const file = Array.from(fileList || [])[0];
  if (!file) return;
  const text = await file.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    await store.commit("Backup import rejected", (state) => {
      state.control.lastImportSummary = "Rejected invalid JSON backup: " + (error && error.message ? error.message : String(error));
      addAudit(state, "control.backup.reject", state.control.lastImportSummary, state.activeNoteId);
    });
    return;
  }
  await store.commit("Backup imported as preview", (state) => importBackupPreview(state, payload, file.name));
}

async function handleAction(action, id) {
  if (!store) return;
  if (action === "open-command-palette") {
    await store.commit("Командная палитра открыта", (state) => {
      state.commandPaletteOpen = true;
      state.commandPaletteQuery = state.searchQuery || state.commandPaletteQuery || "";
      addAudit(state, "command.palette.open", "Командная палитра открыта", state.activeNoteId);
    });
    return;
  }
  if (action === "close-command-palette") {
    await store.commit("Командная палитра закрыта", (state) => {
      state.commandPaletteOpen = false;
      addAudit(state, "command.palette.close", "Командная палитра закрыта", state.activeNoteId);
    });
    return;
  }
  if (action === "run-command") {
    await store.commit("Команда выполнена", (state) => runCommandPaletteCommand(state, id));
    return;
  }
  if (action === "save-current-search") {
    await store.commit("Поиск сохранен", (state) => {
      saveCurrentSearch(state);
      state.commandPaletteOpen = true;
    });
    return;
  }
  if (action === "run-saved-search") {
    await store.commit("Сохраненный поиск запущен", (state) => runSavedSearch(state, id));
    return;
  }
  if (action === "delete-saved-search") {
    await store.commit("Сохраненный поиск удален", (state) => deleteSavedSearch(state, id));
    return;
  }
  if (action === "set-surface") {
    await store.commit("Рабочее место открыто", (state) => {
      state.activeSurface = id || "inbox";
      state.commandPaletteOpen = false;
    });
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      setTimeout(() => window.scrollTo(0, 0), 0);
    });
    return;
  }
  if (action === "create-system") {
    const titleInput = document.querySelector("#system-title");
    const kindInput = document.querySelector("#system-kind");
    await store.commit("V34 system created", (state) => {
      const systemId = createSystemDefinition(state, {
        title: titleInput ? titleInput.value : "",
        kind: kindInput ? kindInput.value : "custom"
      });
      if (systemId) {
        state.graphView.selectedNodeId = systemId;
        state.activeSurface = "systems";
      }
    });
    return;
  }
  if (action === "add-system-entity-field") {
    const systemInput = document.querySelector("#builder-field-system");
    const entityInput = document.querySelector("#builder-field-entity");
    const nameInput = document.querySelector("#builder-field-name");
    const typeInput = document.querySelector("#builder-field-type");
    const optionsInput = document.querySelector("#builder-field-options");
    const requiredInput = document.querySelector("#builder-field-required");
    await store.commit("Typed field added to system entity", (state) => {
      const result = addSystemEntityField(state, systemInput ? systemInput.value : "", entityInput ? entityInput.value : "", {
        name: nameInput ? nameInput.value : "",
        type: typeInput ? typeInput.value : "text",
        options: optionsInput && optionsInput.value ? optionsInput.value.split(",").map((item) => item.trim()).filter(Boolean) : [],
        required: requiredInput ? requiredInput.checked : false
      });
      state.commandMessage = result.ok ? state.commandMessage : result.errors.join("; ");
    });
    return;
  }
  if (action === "create-system-record") {
    const systemInput = document.querySelector("#builder-record-system-" + id);
    const entityInput = document.querySelector("#builder-record-entity-" + id);
    const titleInput = document.querySelector("#builder-record-title-" + id);
    await store.commit("System record created", (state) => {
      const system = state.systemDefinitions[systemInput ? systemInput.value : ""];
      const entityName = entityInput ? entityInput.value : "";
      const entity = system ? system.entities.find((item) => item.name === entityName) : null;
      const rawValues = { title: titleInput ? titleInput.value : "" };
      if (entity) {
        entity.fields.forEach((field, fieldIndex) => {
          const fieldInput = document.querySelector("#builder-record-field-" + id + "-" + fieldIndex);
          if (fieldInput) rawValues[field.name] = fieldInput.value;
        });
      }
      const result = createSystemRecord(state, systemInput ? systemInput.value : "", entityName, rawValues);
      if (result.ok) {
        state.graphView.selectedNodeId = result.id;
      } else {
        state.commandMessage = result.errors.join("; ");
      }
    });
    return;
  }
  if (action === "edit-system-record") {
    const record = store.state.systemRecords[id];
    if (!record) return;
    const system = store.state.systemDefinitions[record.systemId];
    const entity = system ? system.entities.find((item) => item.name === record.entityName) : null;
    const title = promptValue("Название записи", record.title);
    if (title === null) return;
    const rawValues = { title };
    if (entity) {
      for (const field of entity.fields) {
        const value = promptValue(field.name + " (" + field.type + ")", String(record.fields[field.name] ?? ""));
        if (value !== null) rawValues[field.name] = value;
      }
    }
    await store.commit("System record edited", (state) => {
      const result = updateSystemRecord(state, id, rawValues);
      if (!result.ok) state.commandMessage = result.errors.join("; ");
    });
    return;
  }
  if (action === "add-system-trigger") {
    const systemInput = document.querySelector("#builder-trigger-system");
    const kindInput = document.querySelector("#builder-trigger-kind");
    const entityInput = document.querySelector("#builder-trigger-entity");
    const fieldInput = document.querySelector("#builder-trigger-field");
    const actionInput = document.querySelector("#builder-trigger-action");
    await store.commit("System trigger added", (state) => {
      const result = addSystemTrigger(state, systemInput ? systemInput.value : "", {
        kind: kindInput ? kindInput.value : "on-create",
        entityName: entityInput ? entityInput.value : "",
        fieldName: fieldInput ? fieldInput.value : "",
        actionType: actionInput ? actionInput.value : "task"
      });
      if (!result.ok) state.commandMessage = result.errors.join("; ");
    });
    return;
  }
  if (action === "toggle-system-record-state") {
    await store.commit("System record state changed", (state) => {
      toggleSystemRecordState(state, id);
    });
    return;
  }
  if (action === "set-system-view") {
    const [systemId, mode] = String(id || "").split("::");
    await store.commit("System view mode selected", (state) => {
      state.designStudio.viewPresets["system:" + systemId] = normalizeViewPreset(Object.assign({}, state.designStudio.viewPresets["system:" + systemId], { renderer: mode }));
    });
    return;
  }
  if (action === "install-pack") {
    await store.commit("V34 local pack installed", (state) => {
      const systemId = installMarketplacePack(state, id);
      if (systemId) {
        state.graphView.selectedNodeId = systemId;
        state.activeSurface = "systems";
      }
    });
    return;
  }
  if (action === "create-project") {
    const input = document.querySelector("#project-title");
    await store.commit("V34 project created", (state) => {
      const projectId = createProject(state, input ? input.value : "");
      if (projectId) {
        state.graphView.selectedNodeId = projectId;
        state.activeSurface = "projects";
      }
    });
    return;
  }
  if (action === "add-project-item") {
    const projectInput = document.querySelector("#project-select");
    const titleInput = document.querySelector("#project-item-title");
    const kindInput = document.querySelector("#project-item-kind");
    await store.commit("V34 project item added", (state) => {
      const itemId = addProjectItem(state, projectInput ? projectInput.value : "", titleInput ? titleInput.value : "", kindInput ? kindInput.value : "decision");
      if (itemId) {
        state.graphView.selectedNodeId = itemId;
        state.activeSurface = "projects";
      }
    });
    return;
  }
  if (action === "add-database") {
    const input = document.querySelector("#database-title");
    await store.commit("V34 database created", (state) => {
      const databaseId = createCustomDatabase(state, input ? input.value : "");
      if (databaseId) {
        state.graphView.selectedNodeId = databaseId;
        state.activeSurface = "databases";
      }
    });
    return;
  }
  if (action === "add-database-row") {
    const databaseInput = document.querySelector("#database-select");
    const titleInput = document.querySelector("#database-row-title");
    const statusInput = document.querySelector("#database-row-status");
    await store.commit("V34 database row added", (state) => {
      const rowId = addDatabaseRow(state, databaseInput ? databaseInput.value : "", titleInput ? titleInput.value : "", statusInput ? statusInput.value : "open");
      if (rowId) {
        state.graphView.selectedNodeId = rowId;
        state.activeSurface = "databases";
      }
    });
    return;
  }
  if (action === "save-design-profile") {
    const profileInput = document.querySelector("#design-profile-select");
    const modeInput = document.querySelector("#design-render-mode");
    await store.commit("V34 design profile selected", (state) => {
      saveDesignProfile(state, profileInput ? profileInput.value : "", modeInput ? modeInput.value : "");
      state.graphView.selectedNodeId = profileInput ? profileInput.value : state.designStudio.activeProfileId;
      state.activeSurface = "design";
    });
    return;
  }
  if (action === "save-view-preset") {
    const surfaceInput = document.querySelector("#view-preset-surface");
    const rendererInput = document.querySelector("#view-preset-renderer");
    const densityInput = document.querySelector("#view-preset-density");
    const groupingInput = document.querySelector("#view-preset-grouping");
    await store.commit("View preset saved", (state) => {
      const surface = surfaceInput ? cleanLine(surfaceInput.value) : state.activeSurface;
      const preset = normalizeViewPreset({
        renderer: rendererInput ? rendererInput.value : "",
        density: densityInput ? densityInput.value : "",
        grouping: groupingInput ? groupingInput.value : ""
      });
      state.designStudio.viewPresets[surface] = preset;
      state.designStudio.updatedAt = now();
      addAudit(state, "design.profile", "View preset saved for " + surface + ": " + preset.renderer + "/" + preset.density + "/" + preset.grouping, state.activeNoteId);
    });
    return;
  }
  if (action === "add-model-profile") {
    const titleInput = document.querySelector("#model-title");
    const endpointInput = document.querySelector("#model-endpoint");
    const kindInput = document.querySelector("#model-kind");
    await store.commit("V34 model route added", (state) => {
      const modelId = addModelProfile(state, titleInput ? titleInput.value : "", endpointInput ? endpointInput.value : "", kindInput ? kindInput.value : "owner-key");
      if (modelId) {
        state.graphView.selectedNodeId = modelId;
        state.activeSurface = "models";
      }
    });
    return;
  }
  if (action === "verify-model-route") {
    await store.commit("V34 model route checked", (state) => {
      const modelId = verifyModelRoute(state, id);
      if (modelId) {
        state.graphView.selectedNodeId = modelId;
        state.activeSurface = "models";
      }
    });
    return;
  }
  if (action === "add-smart-home-device") {
    const titleInput = document.querySelector("#home-device-title");
    const roomInput = document.querySelector("#home-device-room");
    await store.commit("V34 smart home device added", (state) => {
      const deviceId = addSmartHomeDevice(state, titleInput ? titleInput.value : "", roomInput ? roomInput.value : "");
      if (deviceId) {
        state.graphView.selectedNodeId = deviceId;
        state.activeSurface = "smart-home";
      }
    });
    return;
  }
  if (action === "record-smart-home-event") {
    const deviceInput = document.querySelector("#home-device-select");
    const textInput = document.querySelector("#home-event-text");
    await store.commit("V34 smart home event recorded", (state) => {
      const eventId = recordSmartHomeEvent(state, deviceInput ? deviceInput.value : "", textInput ? textInput.value : "");
      if (eventId) {
        state.graphView.selectedNodeId = eventId;
        state.activeSurface = "smart-home";
      }
    });
    return;
  }
  if (action === "prepare-screen-companion") {
    await store.commit("V34 screen companion prepared", (state) => {
      const sessionId = prepareScreenCompanionSession(state);
      if (sessionId) {
        state.graphView.selectedNodeId = sessionId;
        state.activeSurface = "screen";
      }
    });
    return;
  }
  if (action === "create-twin-snapshot") {
    await store.commit("V34 personal twin snapshot created", (state) => {
      const snapshotId = createPersonalTwinSnapshot(state);
      if (snapshotId) {
        state.graphView.selectedNodeId = snapshotId;
        state.activeSurface = "twin";
      }
    });
    return;
  }
  if (action === "set-inspector-renderer") {
    await store.commit("Inspector renderer changed", (state) => {
      state.control.inspectorRenderer = RENDERER_MODES.includes(id) ? id : "card";
    });
    return;
  }
  if (action === "set-graph-mode") {
    await store.commit("Graph mode selected", (state) => {
      state.graphView.mode = id === "local" ? "local" : "global";
      if (state.graphView.mode === "local" && !state.graphView.selectedNodeId) state.graphView.selectedNodeId = state.activeNoteId;
      addAudit(state, "graph.mode", "Graph mode set to " + state.graphView.mode, state.activeNoteId);
    });
    return;
  }
  if (action === "focus-graph-node") {
    await store.commit("Graph node focused", (state) => {
      selectGraphNodeInState(state, id);
      state.graphView.mode = "local";
      addAudit(state, "graph.focus", "Focused graph node " + id, state.activeNoteId);
    });
    return;
  }
  if (action === "open-graph-node") {
    await store.commit("Graph node opened", (state) => {
      openGraphNodeInState(state, id);
      addAudit(state, "graph.open", "Opened graph node " + id, state.activeNoteId);
    });
    return;
  }
  if (action === "clear-graph-search") {
    await store.commit("Graph search cleared", (state) => {
      state.graphView.searchQuery = "";
      addAudit(state, "graph.search", "Graph search cleared", state.activeNoteId);
    });
    return;
  }
  if (action === "new-note") {
    const title = promptValue("Note title", "Untitled");
    if (!title) return;
    await store.commit("Note created", (state) => {
      createNote(state, title, state.activeFolderId, "# " + title + "\n");
      state.activeSurface = "library";
    });
    return;
  }
  if (action === "new-folder") {
    const name = promptValue("Folder name", "New folder");
    if (!name) return;
    await store.commit("Folder created", (state) => createFolder(state, name));
    return;
  }
  if (action === "select-folder") {
    await store.commit("Folder selected", (state) => {
      if (state.folders[id]) state.activeFolderId = id;
    });
    return;
  }
  if (action === "open-note") {
    await store.commit("Note opened", (state) => {
      if (state.notes[id] && !state.notes[id].deleted) {
        state.activeNoteId = id;
        state.activeFolderId = state.notes[id].folderId;
        state.activeSurface = "library";
      }
    });
    return;
  }
  if (action === "create-from-ghost") {
    await store.commit("Ghost node converted to note", (state) => {
      createNoteFromGhost(state, id);
      state.activeSurface = "library";
    });
    return;
  }
  if (action === "focus-capture") {
    const input = document.querySelector("#capture-input");
    if (input) input.focus();
    return;
  }
  if (action === "capture-text") {
    const input = document.querySelector("#capture-input");
    const text = input ? input.value : store.state.captureDraft;
    await store.commit("Inbox captured", (state) => captureTextArtifact(state, text));
    return;
  }
  if (action === "clear-capture") {
    await store.commit("Capture cleared", (state) => {
      state.captureDraft = "";
      addAudit(state, "inbox.clear", "Capture input cleared", state.activeNoteId);
    });
    return;
  }
  if (action === "run-flow") {
    await store.commit("Flow completed", (state) => runCaptureFlow(state));
    return;
  }
  if (action === "run-flow-builder") {
    const trigger = document.querySelector("#flow-trigger");
    const condition = document.querySelector("#flow-condition");
    const flowAction = document.querySelector("#flow-action");
    await store.commit("Flow dry run completed", (state) => {
      runFlowBuilderDryRun(state, trigger ? trigger.value : "", condition ? condition.value : "", flowAction ? flowAction.value : "task");
    });
    return;
  }
  if (action === "auto-build-active") {
    await store.commit("Artifact workspace built", (state) => {
      if (state.captureDraft.trim()) {
        const sourceId = captureTextArtifact(state, state.captureDraft);
        buildArtifactWorkspace(state, sourceId);
      } else {
        buildArtifactWorkspace(state, "");
      }
    });
    return;
  }
  if (action === "run-agent-active") {
    await store.commit("Agent completed", (state) => {
      const source = Object.values(state.sources || {}).filter((item) => !item.deleted && item.noteId === state.activeNoteId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      runLocalAgent(state, source ? source.id : "", state.activeNoteId);
    });
    return;
  }
  if (action === "apply-proposal") {
    await store.commit("Proposal applied", (state) => applyProposal(state, id));
    return;
  }
  if (action === "apply-all-proposals") {
    await store.commit("All proposals applied", (state) => applyAllProposals(state));
    return;
  }
  if (action === "apply-source-proposals") {
    await store.commit("Artifact proposals applied", (state) => {
      const safeTypes = ["knowledge-summary", "task", "calendar", "plan", "reminder", "finance_expense", "finance_income", "balance", "budget", "subscription", "bill", "habit", "routine", "goal", "money_goal", "insight", "knowledge", "note", "claim", "question", "review", "book"];
      const count = applySourceProposals(state, id || "", safeTypes);
      for (const proposal of Object.values(state.proposals || {})) {
        if (proposal.status !== "open" || proposal.sourceId !== id) continue;
        if (["agent", "chat", "flow", "control", "provider_connection_request"].includes(proposal.type)) {
          proposal.status = "deferred";
          proposal.updatedAt = now();
        }
      }
      state.commandMessage = count ? "Готово: принято " + count + " предложений текущего артефакта" : "Нет открытых предложений для текущего артефакта";
    });
    return;
  }
  if (action === "edit-proposal") {
    const proposal = store.state.proposals[id];
    if (!proposal) return;
    const nextTitle = promptValue("Edit proposal", proposal.title);
    if (!nextTitle) return;
    await store.commit("Proposal edited", (state) => {
      if (!state.proposals[id]) return;
      state.proposals[id].title = cleanLine(nextTitle);
      state.proposals[id].fields = Object.assign({}, state.proposals[id].fields || {}, { title: cleanLine(nextTitle) });
      state.proposals[id].updatedAt = now();
      addAudit(state, "proposal.edit", "Edited proposal: " + nextTitle, state.proposals[id].noteId);
    });
    return;
  }
  if (action === "dismiss-proposal") {
    await store.commit("Proposal dismissed", (state) => dismissProposal(state, id));
    return;
  }
  if (action === "open-proposal-source") {
    await store.commit("Proposal source opened", (state) => {
      const proposal = state.proposals[id];
      const source = proposal && proposal.sourceId ? state.sources[proposal.sourceId] : null;
      if (source && source.noteId && state.notes[source.noteId] && !state.notes[source.noteId].deleted) {
        state.activeNoteId = source.noteId;
        state.activeFolderId = state.notes[source.noteId].folderId;
        state.activeSurface = "library";
      }
    });
    return;
  }
  if (action === "open-proposal-control") {
    await store.commit("Proposal graph/control opened", (state) => {
      const proposal = state.proposals[id];
      if (proposal) state.graphView.selectedNodeId = proposal.appliedObjectId || proposal.id;
      state.activeSurface = "control";
    });
    return;
  }
  if (action === "quick-expense") {
    await store.commit("Quick expense template", (state) => {
      state.captureDraft = "Расход: ";
      addAudit(state, "capture.template", "Quick expense template opened", state.activeNoteId);
    });
    return;
  }
  if (action === "quick-task") {
    const input = document.querySelector("#capture-input");
    const text = input ? input.value : store.state.captureDraft;
    const cleanText = repairMojibake(String(text || "")).replace(/^задача\s*:\s*/i, "").trim();
    if (cleanText) {
      await store.commit("Quick task created", (state) => quickTaskFromCapture(state, cleanText));
      return;
    }
    await store.commit("Quick task template", (state) => {
      state.captureDraft = "Задача: ";
      addAudit(state, "capture.template", "Quick task template opened", state.activeNoteId);
    });
    return;
  }
  if (action === "quick-habit") {
    await store.commit("Quick habit template", (state) => {
      state.captureDraft = "Каждый день ";
      addAudit(state, "capture.template", "Quick habit template opened", state.activeNoteId);
    });
    return;
  }
  if (action === "send-chat") {
    const chatInputs = Array.from(document.querySelectorAll("#chat-input"));
    const input = chatInputs.find((item) => item.value && item.value.trim())
      || chatInputs.find((item) => item.offsetParent !== null)
      || chatInputs[0];
    const text = input ? input.value : "";
    await store.commit("Chat message sent", (state) => {
      const cleanText = String(text || "").trim();
      if (!cleanText) return;
      const normalizedChatText = normalizeRuText(cleanText);
      const wantsDevAnswer = /^\/dev\b/i.test(cleanText) || normalizedChatText.includes("спросить о разработке") || normalizedChatText.includes("состояние разработки");
      const productBrainAnswer = wantsDevAnswer ? answerProductBrainQuestion(state, cleanText.replace(/^\/dev\s*/i, "")) : "";
      if (productBrainAnswer) {
        state.activeNoteId = PRODUCT_BRAIN_ROOT_ID;
        state.graphView.selectedNodeId = PRODUCT_BRAIN_ROOT_ID;
        addChatMessage(state, "owner", cleanText, "", PRODUCT_BRAIN_ROOT_ID);
        addChatMessage(state, "assistant", productBrainAnswer, "", PRODUCT_BRAIN_ROOT_ID);
        addAudit(state, "chat.product_brain", "Product Brain answered local development question", PRODUCT_BRAIN_ROOT_ID);
        return;
      }
      addChatMessage(state, "owner", cleanText, "", state.activeNoteId);
      addChatMessage(state, "assistant", buildLocalChatAnswer(state, cleanText), "", state.activeNoteId);
      addAudit(state, "chat.local.answer", "Local chat answered: " + shorten(cleanText, 90), state.activeNoteId);
    });
    return;
  }
  if (action === "chat-to-proposal" || action === "chat-to-plan") {
    await store.commit("Chat message converted to proposal", (state) => {
      chatMessageToProposal(state, id || (latestOwnerChatMessage(state) ? latestOwnerChatMessage(state).id : ""), action === "chat-to-plan" ? "plan" : "task");
    });
    return;
  }
  if (action === "import-file") {
    const input = document.querySelector("#file-import");
    if (input) input.click();
    return;
  }
  if (action === "import-audio") {
    const input = document.querySelector("#audio-import");
    if (input) input.click();
    return;
  }
  if (action === "import-backup") {
    const input = document.querySelector("#backup-import");
    if (input) input.click();
    return;
  }
  if (action === "open-source-note") {
    await store.commit("Source note opened", (state) => {
      const source = state.sources[id];
      if (source && source.noteId && state.notes[source.noteId] && !state.notes[source.noteId].deleted) {
        state.activeNoteId = source.noteId;
        state.activeFolderId = state.notes[source.noteId].folderId;
        state.activeSurface = "library";
      }
    });
    return;
  }
  if (action === "save-transcript") {
    const input = document.getElementById("transcript-" + id);
    const transcript = input ? input.value : "";
    await store.commit("Transcript saved", (state) => {
      saveSourceTranscript(state, id, transcript);
      state.activeSurface = "player";
    });
    return;
  }
  if (action === "add-audio-checkpoint") {
    const titleInput = document.getElementById("checkpoint-title-" + id);
    const timeInput = document.getElementById("checkpoint-time-" + id);
    await store.commit("Audio checkpoint added", (state) => {
      addAudioCheckpoint(state, id, titleInput ? titleInput.value : "", timeInput ? timeInput.value : "", "");
    });
    return;
  }
  if (action === "request-stt-gate") {
    await store.commit("STT gate requested", (state) => requestSttGate(state, id));
    return;
  }
  if (action === "transcript-to-note" || action === "transcript-to-task" || action === "transcript-to-claim" || action === "transcript-to-highlight") {
    const input = document.getElementById("transcript-snippet-" + id);
    const snippet = input ? input.value : "";
    await store.commit("Transcript action applied", (state) => {
      if (action === "transcript-to-note") transcriptSnippetToNote(state, id, snippet);
      if (action === "transcript-to-task") transcriptSnippetToTask(state, id, snippet);
      if (action === "transcript-to-claim") transcriptSnippetToClaim(state, id, snippet);
      if (action === "transcript-to-highlight") transcriptSnippetToHighlight(state, id, snippet);
    });
    return;
  }
  if (action === "archive-source") {
    await store.commit("Source archived", (state) => archiveSource(state, id));
    return;
  }
  if (action === "archive-task") {
    await store.commit("Task archived", (state) => archiveTask(state, id));
    return;
  }
  if (action === "archive-goal") {
    await store.commit("Goal archived", (state) => archiveGoal(state, id));
    return;
  }
  if (action === "archive-habit") {
    await store.commit("Habit archived", (state) => archiveHabit(state, id));
    return;
  }
  if (action === "archive-plan") {
    await store.commit("Plan block archived", (state) => archivePlanBlock(state, id));
    return;
  }
  if (action === "archive-reminder") {
    await store.commit("Reminder archived", (state) => archiveReminder(state, id));
    return;
  }
  if (action === "restore-note") {
    await store.commit("Note restored", (state) => restoreNote(state, id));
    return;
  }
  if (action === "restore-source") {
    await store.commit("Source restored", (state) => restoreSource(state, id));
    return;
  }
  if (action === "restore-task") {
    await store.commit("Task restored", (state) => restoreTask(state, id));
    return;
  }
  if (action === "restore-goal") {
    await store.commit("Goal restored", (state) => restoreGoal(state, id));
    return;
  }
  if (action === "restore-plan") {
    await store.commit("Plan block restored", (state) => restorePlanBlock(state, id));
    return;
  }
  if (action === "restore-reminder") {
    await store.commit("Reminder restored", (state) => restoreReminder(state, id));
    return;
  }
  if (action === "restore-habit") {
    await store.commit("Habit restored", (state) => restoreHabit(state, id));
    return;
  }
  if (action.startsWith("restore-") && Object.prototype.hasOwnProperty.call(V34_CONTROL_COLLECTIONS, action.slice("restore-".length))) {
    const kind = action.slice("restore-".length);
    await store.commit("V34 object restored", (state) => restoreV34ControlObject(state, kind, id));
    return;
  }
  if (action === "prepare-provider") {
    await store.commit("Provider setup prepared", (state) => {
      const providerId = cleanLine(id || "provider");
      if (!state.providers[providerId]) {
        state.providers[providerId] = { status: "not-connected", label: providerId, lastCheckedAt: "" };
      }
      state.providers[providerId].status = "needs-owner-credentials";
      state.providers[providerId].lastCheckedAt = now();
      state.providers[providerId].lastError = "";
      state.activeSurface = "providers";
      recordProviderRun(state, providerId, "prepare", "needs-owner-credentials", "Provider waits for owner-approved credentials", { requiredAction: state.providers[providerId].requiredAction || "" });
      addAudit(state, "provider.prepare", providerId + " provider waiting for owner-approved credentials", state.activeNoteId);
    });
    return;
  }
  if (action === "prepare-mail") {
    await store.commit("Mail setup prepared", (state) => {
      state.providers.mail.status = "needs-owner-credentials";
      state.providers.mail.lastCheckedAt = now();
      state.activeSurface = "mail";
      addAudit(state, "provider.prepare", "Mail provider waiting for owner-approved credentials", state.activeNoteId);
    });
    return;
  }
  if (action === "add-task") {
    const input = document.querySelector("#task-input");
    const dayInput = document.querySelector("#task-day");
    const timeInput = document.querySelector("#task-time");
    const title = input ? input.value : "";
    await store.commit("Task added", (state) => addTask(state, title, {
      day: dayInput ? dayInput.value : "",
      startTime: timeInput ? timeInput.value : ""
    }));
    return;
  }
  if (action === "add-calendar-task") {
    const input = document.querySelector("#calendar-task-input");
    const dayInput = document.querySelector("#calendar-task-day");
    const timeInput = document.querySelector("#calendar-task-time");
    const title = input ? input.value : "";
    await store.commit("Calendar task added", (state) => addTask(state, title, {
      day: dayInput ? dayInput.value : "",
      startTime: timeInput ? timeInput.value : ""
    }));
    return;
  }
  if (action === "toggle-task") {
    await store.commit("Task toggled", (state) => toggleTask(state, id));
    return;
  }
  if (action === "edit-task") {
    const task = store.state.tasks[id];
    if (!task) return;
    const title = promptValue("Task title", task.title);
    if (!title) return;
    const day = promptValue("Task date YYYY-MM-DD", task.day || todayKey()) || task.day;
    const startTime = promptValue("Task time HH:MM", task.startTime || "");
    await store.commit("Task edited", (state) => updateTask(state, id, { title, day, startTime }));
    return;
  }
  if (action === "task-tomorrow") {
    await store.commit("Task moved to tomorrow", (state) => moveTaskToTomorrow(state, id));
    return;
  }
  if (action === "task-reminder") {
    await store.commit("Task reminder added", (state) => addReminderForTask(state, id));
    return;
  }
  if (action === "open-task-source") {
    await store.commit("Task source opened", (state) => {
      const task = state.tasks[id];
      if (!task) return;
      const source = task.sourceId ? state.sources[task.sourceId] : null;
      const note = task.noteId ? state.notes[task.noteId] : null;
      if (source && source.noteId && state.notes[source.noteId] && !state.notes[source.noteId].deleted) {
        state.activeNoteId = source.noteId;
        state.activeFolderId = state.notes[source.noteId].folderId;
      } else if (note && !note.deleted) {
        state.activeNoteId = note.id;
        state.activeFolderId = state.folders[note.folderId] ? note.folderId : state.activeFolderId;
      }
      state.activeSurface = "library";
      addAudit(state, "task.source.open", "Opened source for task: " + task.title, task.noteId);
    });
    return;
  }
  if (action === "open-task-control") {
    await store.commit("Task control opened", (state) => {
      const task = state.tasks[id];
      state.graphView.selectedNodeId = id;
      state.activeSurface = "control";
      addAudit(state, "task.control.open", "Opened control for task: " + (task ? task.title : id), task ? task.noteId : state.activeNoteId);
    });
    return;
  }
  if (action === "add-goal") {
    const input = document.querySelector("#goal-input");
    const title = input ? input.value : "";
    await store.commit("Goal added", (state) => addGoal(state, title));
    return;
  }
  if (action === "toggle-goal") {
    await store.commit("Goal toggled", (state) => toggleGoal(state, id));
    return;
  }
  if (action === "toggle-habit") {
    await store.commit("Habit toggled", (state) => toggleHabit(state, id, todayKey()));
    return;
  }
  if (action === "add-habit-entry") {
    const titleInput = document.querySelector("#habit-title");
    const frequencyInput = document.querySelector("#habit-frequency");
    const title = titleInput ? titleInput.value : "";
    const frequency = frequencyInput ? frequencyInput.value : "daily";
    await store.commit("Habit added", (state) => addHabit(state, title, {
      frequency,
      noteId: state.activeNoteId
    }));
    return;
  }
  if (action === "add-goal-entry") {
    const titleInput = document.querySelector("#goal-title-entry");
    const amountInput = document.querySelector("#goal-target-amount");
    const dateInput = document.querySelector("#goal-target-date");
    const title = titleInput ? titleInput.value : "";
    const targetAmount = amountInput ? Number(amountInput.value || 0) : 0;
    const targetDate = dateInput ? dateInput.value : "";
    await store.commit("Goal added", (state) => addGoal(state, title, {
      targetAmount,
      targetDate,
      noteId: state.activeNoteId
    }));
    return;
  }
  if (action === "add-goal-progress") {
    const input = document.getElementById("goal-progress-" + id);
    const amount = input ? Number(input.value || 0) : 0;
    await store.commit("Goal progress added", (state) => addGoalProgress(state, id, amount, "manual"));
    return;
  }
  if (action === "goal-next-task") {
    await store.commit("Goal next task added", (state) => addTaskForGoal(state, id, ""));
    return;
  }
  if (action === "refresh-insights") {
    await store.commit("Insights refreshed", (state) => refreshDeterministicInsights(state));
    return;
  }
  if (action === "ignore-insight") {
    await store.commit("Insight ignored", (state) => ignoreInsight(state, id));
    return;
  }
  if (action === "insight-to-task") {
    await store.commit("Insight converted to task", (state) => turnInsightIntoTask(state, id));
    return;
  }
  if (action === "extract-knowledge") {
    await store.commit("Knowledge extracted", (state) => extractKnowledgeFromNote(state, id || state.activeNoteId));
    return;
  }
  if (action === "add-claim-entry") {
    const input = document.querySelector("#claim-title");
    const title = input ? input.value : "";
    await store.commit("Claim added", (state) => addClaim(state, title, title, {
      noteId: state.activeNoteId,
      sourceId: sourceForNote(state, state.activeNoteId)?.id || "",
      quote: title
    }));
    return;
  }
  if (action === "add-question-entry") {
    const input = document.querySelector("#question-title");
    const title = input ? input.value : "";
    await store.commit("Question added", (state) => addQuestion(state, title, "Owner-added question", {
      noteId: state.activeNoteId,
      sourceId: sourceForNote(state, state.activeNoteId)?.id || "",
      quote: title
    }));
    return;
  }
  if (action === "add-review-entry") {
    const titleInput = document.querySelector("#review-title");
    const dayInput = document.querySelector("#review-day");
    const title = titleInput ? titleInput.value : "";
    const day = dayInput ? dayInput.value : dateKeyFromOffset(7);
    await store.commit("Review item added", (state) => addReviewItem(state, title || "Повторить: " + (getActiveNote(state)?.title || "artifact"), {
      noteId: state.activeNoteId,
      sourceId: sourceForNote(state, state.activeNoteId)?.id || "",
      day
    }));
    return;
  }
  if (action === "question-to-task") {
    await store.commit("Question converted to task", (state) => turnQuestionIntoTask(state, id));
    return;
  }
  if (action === "ignore-question") {
    await store.commit("Question ignored", (state) => ignoreQuestion(state, id));
    return;
  }
  if (action === "claim-to-insight") {
    await store.commit("Claim converted to insight", (state) => turnClaimIntoInsight(state, id));
    return;
  }
  if (action === "claim-to-task") {
    await store.commit("Claim converted to task", (state) => turnClaimIntoTask(state, id));
    return;
  }
  if (action === "toggle-review-item") {
    await store.commit("Review toggled", (state) => toggleReviewItem(state, id));
    return;
  }
  if (action === "review-reminder") {
    await store.commit("Review reminder added", (state) => addReminderForReviewItem(state, id));
    return;
  }
  if (action === "open-knowledge-control") {
    await store.commit("Knowledge control opened", (state) => {
      state.graphView.selectedNodeId = id || state.activeNoteId;
      state.activeSurface = "control";
      addAudit(state, "knowledge.control.open", "Opened graph/control for knowledge object: " + (id || state.activeNoteId), state.activeNoteId);
    });
    return;
  }
  if (action === "save-source-extraction") {
    const input = document.getElementById("book-extraction-" + id);
    const text = input ? input.value : "";
    await store.commit("Manual source extraction saved", (state) => saveManualSourceExtraction(state, id, text));
    return;
  }
  if (action === "extract-highlights") {
    await store.commit("Highlights extracted", (state) => extractHighlightsFromSource(state, id));
    return;
  }
  if (action === "add-highlight-entry") {
    const input = document.getElementById("highlight-title-" + id);
    const text = input ? input.value : "";
    await store.commit("Highlight added", (state) => {
      const source = state.sources[id];
      addHighlight(state, text, text, {
        sourceId: id,
        noteId: source ? source.noteId : state.activeNoteId,
        readingItemId: ensureReadingItemForSource(state, id)
      });
    });
    return;
  }
  if (action === "highlight-to-claim") {
    await store.commit("Highlight converted to claim", (state) => turnHighlightIntoClaim(state, id));
    return;
  }
  if (action === "highlight-to-task") {
    await store.commit("Highlight converted to task", (state) => turnHighlightIntoTask(state, id));
    return;
  }
  if (action === "update-reading-progress") {
    const input = document.getElementById("reading-progress-" + id);
    const progress = input ? Number(input.value || 0) : 0;
    await store.commit("Reading progress updated", (state) => updateReadingProgress(state, id, progress));
    return;
  }
  if (action === "add-finance") {
    const titleInput = document.querySelector("#finance-title");
    const amountInput = document.querySelector("#finance-amount");
    const kindInput = document.querySelector("#finance-kind");
    const categoryInput = document.querySelector("#finance-category");
    const accountInput = document.querySelector("#finance-account");
    const dayInput = document.querySelector("#finance-day");
    const title = titleInput ? titleInput.value : "";
    const amount = amountInput ? Number(amountInput.value || 0) : 0;
    const kind = kindInput ? kindInput.value : "expense";
    const category = categoryInput ? categoryInput.value : inferFinanceCategory(title);
    const accountName = accountInput ? accountInput.value : "Основной счет";
    const day = dayInput ? dayInput.value : todayKey();
    await store.commit("Finance entry added", (state) => {
      if (kind === "balance") {
        ensureFinanceAccount(state, accountName || title || "Основной счет", amount);
      } else {
        addFinanceTransaction(state, title || (kind === "income" ? "Доход" : kind === "transfer" ? "Перевод" : "Расход"), amount, kind, {
          category: category || inferFinanceCategory(title),
          accountName,
          day
        });
      }
    });
    return;
  }
  if (action === "set-finance-balance") {
    const nameInput = document.querySelector("#account-name");
    const balanceInput = document.querySelector("#account-balance");
    const name = nameInput ? nameInput.value : "Основной счет";
    const balance = balanceInput ? Number(balanceInput.value || 0) : 0;
    await store.commit("Finance balance set", (state) => ensureFinanceAccount(state, name, balance));
    return;
  }
  if (action === "add-budget-entry") {
    const categoryInput = document.querySelector("#budget-category");
    const limitInput = document.querySelector("#budget-limit");
    const category = categoryInput ? categoryInput.value : "";
    const limit = limitInput ? Number(limitInput.value || 0) : 0;
    await store.commit("Budget added", (state) => addBudget(state, category || "Разное", limit, {
      period: "month",
      noteId: state.activeNoteId
    }));
    return;
  }
  if (action === "add-subscription-entry") {
    const titleInput = document.querySelector("#subscription-title");
    const amountInput = document.querySelector("#subscription-amount");
    const dayInput = document.querySelector("#subscription-day");
    const categoryInput = document.querySelector("#subscription-category");
    const title = titleInput ? titleInput.value : "";
    const amount = amountInput ? Number(amountInput.value || 0) : 0;
    const day = dayInput ? dayInput.value : todayKey();
    const category = categoryInput ? categoryInput.value : "Подписки";
    await store.commit("Subscription added", (state) => addSubscription(state, title || "Подписка", amount, {
      day,
      category,
      noteId: state.activeNoteId
    }));
    return;
  }
  if (action === "save-receipt-expense") {
    const source = store.state.sources[id];
    if (!source) return;
    const merchantInput = document.getElementById("receipt-merchant-" + id);
    const amountInput = document.getElementById("receipt-amount-" + id);
    const categoryInput = document.getElementById("receipt-category-" + id);
    const accountInput = document.getElementById("receipt-account-" + id);
    const dayInput = document.getElementById("receipt-day-" + id);
    const noteInput = document.getElementById("receipt-note-" + id);
    const merchant = merchantInput ? merchantInput.value : stripExtension(source.name);
    const amount = amountInput ? Number(amountInput.value || 0) : 0;
    const category = categoryInput ? categoryInput.value : "Разное";
    const accountName = accountInput ? accountInput.value : "Основной счет";
    const day = dayInput ? dayInput.value : todayKey();
    const noteText = noteInput ? noteInput.value : "";
    await store.commit("Receipt expense saved", (state) => {
      const txId = addFinanceTransaction(state, merchant || source.name, amount, "expense", {
        category,
        accountName,
        day,
        sourceId: id,
        noteId: source.noteId || state.activeNoteId
      });
      if (txId && noteText) addInsight(state, "Комментарий к чеку: " + merchant, noteText, { sourceId: id, noteId: source.noteId || state.activeNoteId });
      addAudit(state, "receipt.manual", "Manual receipt expense saved from " + source.name, source.noteId || state.activeNoteId);
    });
    return;
  }
  if (action === "add-finance") {
    const titleInput = document.querySelector("#finance-title");
    const amountInput = document.querySelector("#finance-amount");
    const kindInput = document.querySelector("#finance-kind");
    const title = titleInput ? titleInput.value : "";
    const amount = amountInput ? Number(amountInput.value || 0) : 0;
    const kind = kindInput ? kindInput.value : "expense";
    await store.commit("Finance entry added", (state) => {
      if (kind === "balance") {
        ensureFinanceAccount(state, title || "Основной счет", amount);
      } else {
        addFinanceTransaction(state, title || (kind === "income" ? "Доход" : "Расход"), amount, kind, {
          category: inferFinanceCategory(title),
          day: todayKey()
        });
      }
    });
    return;
  }
  if (action === "add-plan-block") {
    const input = document.querySelector("#plan-input");
    const dayInput = document.querySelector("#plan-day");
    const timeInput = document.querySelector("#plan-time");
    const title = input ? input.value : "";
    await store.commit("Plan block added", (state) => addPlanBlock(state, title, {
      day: dayInput ? dayInput.value : "",
      startTime: timeInput ? timeInput.value : ""
    }));
    return;
  }
  if (action === "toggle-plan-block") {
    await store.commit("Plan block toggled", (state) => togglePlanBlock(state, id));
    return;
  }
  if (action === "edit-plan") {
    const block = store.state.planBlocks[id];
    if (!block) return;
    const title = promptValue("Plan title", block.title);
    if (!title) return;
    const day = promptValue("Plan date YYYY-MM-DD", block.day || todayKey()) || block.day;
    const startTime = promptValue("Plan time HH:MM", block.startTime || "");
    await store.commit("Plan block edited", (state) => updatePlanBlock(state, id, { title, day, startTime }));
    return;
  }
  if (action === "plan-tomorrow") {
    await store.commit("Plan block moved to tomorrow", (state) => movePlanBlockToTomorrow(state, id));
    return;
  }
  if (action === "plan-reminder") {
    await store.commit("Plan reminder added", (state) => addReminderForPlanBlock(state, id));
    return;
  }
  if (action === "open-plan-source") {
    await store.commit("Plan source opened", (state) => {
      const block = state.planBlocks[id];
      if (!block) return;
      const source = block.sourceId ? state.sources[block.sourceId] : null;
      const note = block.noteId ? state.notes[block.noteId] : null;
      if (source && source.noteId && state.notes[source.noteId] && !state.notes[source.noteId].deleted) {
        state.activeNoteId = source.noteId;
        state.activeFolderId = state.notes[source.noteId].folderId;
      } else if (note && !note.deleted) {
        state.activeNoteId = note.id;
        state.activeFolderId = state.folders[note.folderId] ? note.folderId : state.activeFolderId;
      }
      state.activeSurface = "library";
      addAudit(state, "plan.source.open", "Opened source for plan block: " + block.title, block.noteId);
    });
    return;
  }
  if (action === "open-plan-control") {
    await store.commit("Plan control opened", (state) => {
      const block = state.planBlocks[id];
      state.graphView.selectedNodeId = id;
      state.activeSurface = "control";
      addAudit(state, "plan.control.open", "Opened control for plan block: " + (block ? block.title : id), block ? block.noteId : state.activeNoteId);
    });
    return;
  }
  if (action === "toggle-reminder") {
    await store.commit("Reminder toggled", (state) => toggleReminder(state, id));
    return;
  }
  if (action === "edit-reminder") {
    const reminder = store.state.reminders[id];
    if (!reminder) return;
    const title = promptValue("Reminder title", reminder.title);
    if (!title) return;
    const day = promptValue("Reminder date YYYY-MM-DD", reminder.day || todayKey()) || reminder.day;
    const time = promptValue("Reminder time HH:MM", reminder.time || "");
    await store.commit("Reminder edited", (state) => updateReminder(state, id, { title, day, time }));
    return;
  }
  if (action === "reminder-tomorrow") {
    await store.commit("Reminder moved to tomorrow", (state) => updateReminder(state, id, { day: dateKeyFromOffset(1) }));
    return;
  }
  if (action === "open-reminder-source") {
    await store.commit("Reminder source opened", (state) => {
      const reminder = state.reminders[id];
      if (!reminder) return;
      const source = reminder.sourceId ? state.sources[reminder.sourceId] : null;
      const note = reminder.noteId ? state.notes[reminder.noteId] : null;
      if (source && source.noteId && state.notes[source.noteId] && !state.notes[source.noteId].deleted) {
        state.activeNoteId = source.noteId;
        state.activeFolderId = state.notes[source.noteId].folderId;
      } else if (note && !note.deleted) {
        state.activeNoteId = note.id;
        state.activeFolderId = state.folders[note.folderId] ? note.folderId : state.activeFolderId;
      }
      state.activeSurface = "library";
      addAudit(state, "reminder.source.open", "Opened source for reminder: " + reminder.title, reminder.noteId);
    });
    return;
  }
  if (action === "open-reminder-control") {
    await store.commit("Reminder control opened", (state) => {
      const reminder = state.reminders[id];
      state.graphView.selectedNodeId = id;
      state.activeSurface = "control";
      addAudit(state, "reminder.control.open", "Opened control for reminder: " + (reminder ? reminder.title : id), reminder ? reminder.noteId : state.activeNoteId);
    });
    return;
  }
  if (action === "probe-ollama") {
    const input = document.querySelector("#ollama-endpoint");
    const endpoint = input ? cleanLine(input.value) : store.state.ollama.endpoint;
    const confirmed = window.confirm("Probe local Ollama endpoint " + endpoint + "?");
    if (!confirmed) return;
    try {
      const result = await probeOllama(endpoint);
      await store.commit("Ollama probe completed", (state) => {
        state.ollama = Object.assign({}, state.ollama, result);
        state.ollama.scopes = state.ollama.scopes && state.ollama.scopes.length ? state.ollama.scopes : ["active-artifact-analysis"];
        syncOllamaProviderState(state);
        recordProviderRun(state, "ollama", "probe", result.status, "Ollama " + result.status + " at " + result.endpoint, { models: result.models });
        addAudit(state, "ollama.probe", "Ollama " + result.status + " at " + result.endpoint, state.activeNoteId);
      });
    } catch (error) {
      await store.commit("Ollama probe failed", (state) => {
        state.ollama.endpoint = String(endpoint || "http://127.0.0.1:11434").replace(/\/+$/, "");
        const status = classifyOllamaFetchError(error);
        state.ollama.status = status;
        state.ollama.models = [];
        state.ollama.selectedModel = "";
        state.ollama.lastError = error && error.message ? error.message : String(error);
        state.ollama.lastCheckedAt = now();
        state.ollama.lastProbeAt = state.ollama.lastCheckedAt;
        syncOllamaProviderState(state);
        recordProviderRun(state, "ollama", "probe", status, "Ollama probe failed at " + state.ollama.endpoint + ": " + status, { error: state.ollama.lastError });
        addAudit(state, "ollama.probe", "Ollama unreachable at " + state.ollama.endpoint, state.activeNoteId);
      });
    }
    return;
  }
  if (action === "save-ollama-model") {
    const input = document.querySelector("#ollama-model");
    await store.commit("Ollama model selected", (state) => {
      const selected = input ? cleanLine(input.value) : "";
      if (selected && state.ollama.models.includes(selected)) {
        state.ollama.selectedModel = selected;
        syncOllamaProviderState(state);
        recordProviderRun(state, "ollama", "model-select", "selected", "Selected model " + selected, { selected });
      }
    });
    return;
  }
  if (action === "test-ollama-generation") {
    const endpointInput = document.querySelector("#ollama-endpoint");
    const modelInput = document.querySelector("#ollama-model");
    const endpoint = endpointInput ? cleanLine(endpointInput.value) : store.state.ollama.endpoint;
    const model = modelInput && cleanLine(modelInput.value) ? cleanLine(modelInput.value) : (store.state.ollama.selectedModel || (store.state.ollama.models || [])[0] || "");
    if (!model) {
      await store.commit("Ollama generation test blocked", (state) => {
        state.ollama.endpoint = String(endpoint || "http://127.0.0.1:11434").replace(/\/+$/, "");
        state.ollama.status = "degraded";
        state.ollama.lastGenerationStatus = "blocked";
        state.ollama.lastError = "No Ollama model selected for /api/generate test.";
        state.ollama.lastCheckedAt = now();
        syncOllamaProviderState(state);
        recordProviderRun(state, "ollama", "test-generation", "blocked", "Ollama generation test blocked: no model selected", { endpoint: state.ollama.endpoint });
      });
      return;
    }
    const confirmed = window.confirm("Run local Ollama /api/generate test on " + model + " at " + endpoint + "?");
    if (!confirmed) return;
    try {
      const result = await testOllamaGeneration(endpoint, model);
      await store.commit("Ollama generation test completed", (state) => {
        state.ollama.endpoint = result.endpoint;
        state.ollama.selectedModel = result.model;
        state.ollama.models = Array.isArray(state.ollama.models) ? state.ollama.models : [];
        if (result.model && !state.ollama.models.includes(result.model)) state.ollama.models.unshift(result.model);
        state.ollama.status = "generation_ok";
        state.ollama.lastGenerationStatus = result.status;
        state.ollama.lastGenerationSample = result.sample;
        state.ollama.lastLatencyMs = result.latencyMs;
        state.ollama.lastError = "";
        state.ollama.lastCheckedAt = now();
        syncOllamaProviderState(state);
        recordProviderRun(state, "ollama", "test-generation", result.status, "Ollama /api/generate ok on " + result.model + " in " + result.latencyMs + "ms", result);
        addAudit(state, "ollama.generate.test", "Ollama /api/generate test ok on " + result.model, state.activeNoteId);
      });
    } catch (error) {
      await store.commit("Ollama generation test failed", (state) => {
        const status = classifyOllamaFetchError(error);
        state.ollama.endpoint = String(endpoint || "http://127.0.0.1:11434").replace(/\/+$/, "");
        state.ollama.status = status === "offline" ? "offline" : "degraded";
        state.ollama.lastGenerationStatus = status;
        state.ollama.lastError = error && error.message ? error.message : String(error);
        state.ollama.lastCheckedAt = now();
        syncOllamaProviderState(state);
        recordProviderRun(state, "ollama", "test-generation", state.ollama.status, "Ollama /api/generate failed: " + state.ollama.lastError, { endpoint: state.ollama.endpoint, model, status });
        addAudit(state, "ollama.generate.test", "Ollama /api/generate failed: " + state.ollama.status, state.activeNoteId);
      });
    }
    return;
  }
  if (action === "ollama-dry-run") {
    await store.commit("Ollama proposal dry run", (state) => createOllamaProposalDryRun(state, "Analyze active artifact and return proposal drafts only"));
    return;
  }
  if (action === "revoke-provider") {
    await store.commit("Provider revoked", (state) => revokeProvider(state, id));
    return;
  }
  if (action === "check-pwa") {
    await refreshPwaStatus("owner-check");
    return;
  }
  if (action === "show-pwa-install") {
    await requestPwaInstallPrompt();
    return;
  }
  if (action === "delete-note") {
    const note = store.state.notes[id];
    if (!note) return;
    const confirmed = window.confirm("Delete " + note.title + "? Links to it become ghost nodes.");
    if (!confirmed) return;
    await store.commit("Note deleted", (state) => deleteNote(state, id));
    return;
  }
  if (action === "export-vault") {
    const result = exportVault(store.state, "");
    await store.commit("Vault export generated", (state) => {
      state.control.lastExportSummary = result.summary;
      addAudit(state, "vault.export", "Vault export generated: " + result.summary, state.activeNoteId);
    });
    return;
  }
  if (action === "export-selected-artifact") {
    const selectedId = store.state.graphView.selectedNodeId || store.state.activeNoteId;
    const result = exportVault(store.state, selectedId);
    await store.commit("Selected artifact export generated", (state) => {
      state.control.lastExportSummary = result.summary;
      addAudit(state, "control.export.selected", "Selected artifact export generated: " + result.summary, state.activeNoteId);
    });
    return;
  }
  if (action === "create-rollback-snapshot") {
    await store.commit("Rollback snapshot created", (state) => {
      createRollbackSnapshot(state, "Snapshot before Data Control change");
    });
    return;
  }
  if (action === "restore-rollback-snapshot") {
    const confirmed = window.confirm("Restore this rollback snapshot? Current state will be replaced by the snapshot.");
    if (!confirmed) return;
    await store.commit("Rollback snapshot restored", (state) => restoreRollbackSnapshot(state, id));
    return;
  }
  if (action === "recover-corrupt-record") {
    await store.commit("Corrupt record recovered", (state) => recoverCorruptRecord(state, id));
    return;
  }
  if (action === "revoke-capability") {
    await store.commit("Capability revoked", (state) => revokeCapability(state, id));
    return;
  }
  if (action === "archive-selected-artifact") {
    const selectedId = store.state.graphView.selectedNodeId || store.state.activeNoteId;
    const confirmed = window.confirm("Archive selected artifact " + selectedId + "? You can recover supported objects from Data Control.");
    if (!confirmed) return;
    await store.commit("Selected artifact archived", (state) => archiveSelectedControlObject(state));
    return;
  }
}

function handleInput(event) {
  const target = event.target;
  if (!store || !(target instanceof HTMLElement)) return;
  if (target.id === "global-search") {
    store.updateSearch(target.value);
    return;
  }
  if (target.id === "command-palette-query") {
    store.updateCommandPaletteQuery(target.value);
    return;
  }
  if (target.id === "capture-input") {
    store.state.captureDraft = target.value;
    store.scheduleSave("Capture draft saved");
    return;
  }
  if (target.id === "graph-search") {
    store.state.graphView.searchQuery = target.value;
    if (cleanLine(target.value)) store.state.graphView.mode = "global";
    store.scheduleSave("Graph search saved");
    render();
    return;
  }
  if (target.id === "note-body") {
    store.updateEditor(store.state.activeNoteId, target.value);
  }
}

async function handleChange(event) {
  const target = event.target;
  if (!store || !(target instanceof HTMLElement)) return;
  if (target.dataset && target.dataset.graphFilter) {
    const key = target.dataset.graphFilter;
    await store.commit("Graph filter changed", (state) => {
      state.graphFilters[key] = Boolean(target.checked);
      addAudit(state, "graph.filter", "Graph filter " + key + " set to " + String(Boolean(target.checked)), state.activeNoteId);
    });
    return;
  }
  if (target.id === "file-import") {
    await importFilesFromInput(target.files, "");
    target.value = "";
    return;
  }
  if (target.id === "audio-import") {
    await importFilesFromInput(target.files, "audio");
    target.value = "";
    return;
  }
  if (target.id === "backup-import") {
    await importBackupFromInput(target.files);
    target.value = "";
    return;
  }
  if (target.id === "note-title") {
    const noteId = store.state.activeNoteId;
    const title = target.value;
    await store.commit("Note renamed", (state) => renameNote(state, noteId, title));
    return;
  }
  if (target.id === "note-folder") {
    const folderId = target.value;
    const noteId = store.state.activeNoteId;
    await store.commit("Note moved", (state) => {
      const note = state.notes[noteId];
      if (note && state.folders[folderId]) {
        note.folderId = folderId;
        note.updatedAt = now();
        state.activeFolderId = folderId;
        addAudit(state, "note.move", "Note moved to " + state.folders[folderId].name, noteId);
      }
    });
  }
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function bindGlobalEvents() {
  app.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();
    handleAction(button.dataset.action, button.dataset.id || "").catch((error) => {
      bootError = error;
      renderError(error);
    });
  });
  app.addEventListener("input", handleInput);
  app.addEventListener("change", (event) => {
    handleChange(event).catch((error) => {
      bootError = error;
      renderError(error);
    });
  });
  app.addEventListener("dragover", (event) => {
    event.preventDefault();
    document.body.classList.add("drag-active");
  });
  app.addEventListener("dragleave", (event) => {
    if (event.target === app) document.body.classList.remove("drag-active");
  });
  app.addEventListener("drop", (event) => {
    event.preventDefault();
    document.body.classList.remove("drag-active");
    const files = event.dataTransfer ? event.dataTransfer.files : null;
    importFilesFromInput(files, "").catch((error) => {
      bootError = error;
      renderError(error);
    });
  });
  window.addEventListener("error", (event) => {
    bootError = event.error || new Error(event.message);
    renderError(bootError);
  });
  window.addEventListener("unhandledrejection", (event) => {
    bootError = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    renderError(bootError);
  });
  window.addEventListener("online", () => {
    refreshEnvironmentStatus().catch(() => {});
  });
  window.addEventListener("offline", () => {
    refreshEnvironmentStatus().catch(() => {});
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (!store) return;
    store.commit("PWA install prompt available", (state) => {
      state.environment.installPromptStatus = "available";
      state.environment.displayMode = displayModeStatus();
      syncPwaProviderState(state, "install-prompt-available", {
        installPromptStatus: "available"
      });
      recordProviderRun(state, "pwa", "install-prompt", "available", "Browser exposed PWA install prompt", {
        displayMode: state.environment.displayMode
      });
    }).catch((error) => {
      bootError = error;
      renderError(error);
    });
  });
  window.addEventListener("keydown", (event) => {
    if (!store) return;
    if (event.target instanceof HTMLElement && event.target.id === "chat-input" && event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) {
      event.preventDefault();
      handleAction("send-chat", "").catch((error) => {
        bootError = error;
        renderError(error);
      });
      return;
    }
    const key = String(event.key || "").toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "k") {
      event.preventDefault();
      store.commit("Командная палитра открыта", (state) => {
        state.commandPaletteOpen = true;
        state.commandPaletteQuery = state.searchQuery || state.commandPaletteQuery || "";
        addAudit(state, "command.palette.shortcut", "Командная палитра открыта через Ctrl/Cmd+K", state.activeNoteId);
      }).catch((error) => {
        bootError = error;
        renderError(error);
      });
      return;
    }
    if (event.key === "Escape" && store.state.commandPaletteOpen) {
      event.preventDefault();
      store.commit("Командная палитра закрыта", (state) => {
        state.commandPaletteOpen = false;
        addAudit(state, "command.palette.shortcut", "Командная палитра закрыта через Esc", state.activeNoteId);
      }).catch((error) => {
        bootError = error;
        renderError(error);
      });
      return;
    }
    if (event.key === "/" && !store.state.commandPaletteOpen && !isTypingTarget(event.target)) {
      event.preventDefault();
      const input = document.getElementById("global-search");
      if (input) input.focus();
    }
  });
}

function renderError(error) {
  app.innerHTML = [
    "<div class=\"error-shell\">",
    "<h1>Repository boundary stopped a failure</h1>",
    "<p>" + escapeHtml(error && error.message ? error.message : "Unknown error") + "</p>",
    "<button onclick=\"location.reload()\">Reload vault</button>",
    "</div>"
  ].join("");
}

async function refreshEnvironmentStatus() {
  if (!store) return;
  const estimate = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : {};
  const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
  await store.commit("Локальная среда проверена", (state) => {
    state.environment.online = navigator.onLine !== false;
    state.environment.persisted = Boolean(persisted);
    state.environment.storageUsage = Number(estimate.usage || 0);
    state.environment.storageQuota = Number(estimate.quota || 0);
    state.environment.updatedAt = now();
  });
}

async function deleteRepositoryDatabasesForTest() {
  if (!("indexedDB" in window)) return;
  const names = [DB_NAME];
  if (indexedDB.databases) {
    try {
      const databases = await indexedDB.databases();
      for (const db of databases || []) {
        if (db.name && !names.includes(db.name)) names.push(db.name);
      }
    } catch (error) {
      bootError = error;
    }
  }
  await Promise.all(names.map((name) => new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
    request.onblocked = () => resolve(false);
  })));
}

async function resetRepositoryForTest() {
  if (repository && typeof repository.close === "function") repository.close();
  repository = null;
  store = null;
  localStorage.clear();
  await deleteRepositoryDatabasesForTest();
  setTimeout(() => window.location.reload(), 0);
  return true;
}

function seedExactLargeVault(state) {
  const createdAt = now();
  const folderId = state.activeFolderId && state.folders[state.activeFolderId] ? state.activeFolderId : Object.keys(state.folders)[0];
  for (let index = 0; index < 2000; index += 1) {
    const noteId = "note_large_exact_" + String(index).padStart(4, "0");
    const nextA = "Large exact note " + String((index + 1) % 2000).padStart(4, "0");
    const nextB = "Large exact note " + String((index + 997) % 2000).padStart(4, "0");
    state.notes[noteId] = {
      id: noteId,
      title: "Large exact note " + String(index).padStart(4, "0"),
      folderId,
      body: "# Large exact note " + String(index).padStart(4, "0") + "\n\nLinks: [[" + nextA + "]] and [[" + nextB + "]].\n\nArtifact OS benchmark object with source, projection, graph and control evidence.",
      tags: ["large-vault", "benchmark"],
      links: [],
      deleted: false,
      createdAt,
      updatedAt: createdAt
    };
  }
  for (let index = 0; index < 1000; index += 1) {
    const sourceId = "source_large_exact_" + String(index).padStart(4, "0");
    const noteId = "note_large_exact_" + String(index).padStart(4, "0");
    state.sources[sourceId] = {
      id: sourceId,
      name: "Large exact artifact " + String(index).padStart(4, "0") + ".md",
      kind: "text",
      mime: "text/markdown",
      size: 256,
      text: "Large exact artifact " + index + " linked to [[" + state.notes[noteId].title + "]].",
      transcriptText: "",
      dataUrl: "",
      parserStatus: "text-ready",
      status: "text-ready",
      noteId,
      deleted: false,
      analysis: null,
      createdAt,
      updatedAt: createdAt
    };
  }
  const accountId = "account_large_exact_main";
  state.financeAccounts[accountId] = { id: accountId, name: "Large exact account", balance: 1000000, currency: "RUB", deleted: false, createdAt, updatedAt: createdAt };
  for (let index = 0; index < 2000; index += 1) {
    const taskId = "task_large_exact_" + String(index).padStart(4, "0");
    const timed = index % 3 === 0;
    const start = timed ? String(8 + (index % 10)).padStart(2, "0") + ":00" : "";
    state.tasks[taskId] = {
      id: taskId,
      title: "Large exact task " + String(index).padStart(4, "0"),
      noteId: "note_large_exact_" + String(index % 2000).padStart(4, "0"),
      sourceId: "source_large_exact_" + String(index % 1000).padStart(4, "0"),
      goalId: "",
      day: dateKeyFromOffset(index % 21),
      startTime: start,
      endTime: timed ? addMinutesToTime(start, 45) : "",
      dateHint: "",
      status: "open",
      deleted: false,
      createdAt,
      updatedAt: createdAt
    };
  }
  for (let index = 0; index < 1000; index += 1) {
    const txId = "tx_large_exact_" + String(index).padStart(4, "0");
    state.financeTransactions[txId] = {
      id: txId,
      title: "Large exact transaction " + String(index).padStart(4, "0"),
      amount: 100 + (index % 900),
      kind: index % 5 === 0 ? "income" : "expense",
      category: ["Еда", "Дом", "Здоровье", "Транспорт", "Подписки"][index % 5],
      accountId,
      day: dateKeyFromOffset(-(index % 30)),
      noteId: "note_large_exact_" + String(index % 2000).padStart(4, "0"),
      sourceId: "source_large_exact_" + String(index % 1000).padStart(4, "0"),
      deleted: false,
      createdAt,
      updatedAt: createdAt
    };
  }
  for (let index = 0; index < 250; index += 1) {
    const habitId = "habit_large_exact_" + String(index).padStart(4, "0");
    state.habits[habitId] = {
      id: habitId,
      title: "Large exact habit " + String(index).padStart(4, "0"),
      frequency: index % 2 ? "weekly" : "daily",
      checkins: index % 3 === 0 ? { [todayKey()]: createdAt } : {},
      noteId: "note_large_exact_" + String(index).padStart(4, "0"),
      sourceId: "source_large_exact_" + String(index % 1000).padStart(4, "0"),
      status: "active",
      deleted: false,
      createdAt,
      updatedAt: createdAt
    };
  }
  for (let index = 0; index < 250; index += 1) {
    const goalId = "goal_large_exact_" + String(index).padStart(4, "0");
    state.goals[goalId] = {
      id: goalId,
      title: "Large exact goal " + String(index).padStart(4, "0"),
      noteId: "note_large_exact_" + String((index + 250) % 2000).padStart(4, "0"),
      sourceId: "source_large_exact_" + String(index % 1000).padStart(4, "0"),
      targetAmount: 10000 + index * 100,
      targetDate: dateKeyFromOffset(30 + (index % 120)),
      progress: index % 100,
      status: "active",
      deleted: false,
      createdAt,
      updatedAt: createdAt
    };
  }
  state.activeNoteId = "note_large_exact_0000";
  state.graphView = Object.assign({}, state.graphView || {}, { mode: "global", searchQuery: "Large exact", selectedNodeId: "note_large_exact_0000" });
  state.control.lastImportSummary = "Exact large vault seeded: 1000 artifacts, 2000 notes, 2000 tasks, 1000 transactions, 500 habits/goals.";
  addAudit(state, "test.seed.exact-large-vault", "Exact large vault seeded: at least 6751 graph nodes / 7250 graph edges", state.activeNoteId);
  return {
    artifacts: 1000,
    notes: 2000,
    tasks: 2000,
    financeTransactions: 1000,
    habitsGoals: 500,
    graphNodes: 6751,
    graphEdges: 7250
  };
}

async function boot() {
  app.innerHTML = "<div class=\"loading-shell\">Открываю локальный LifeOS</div>";
  bindGlobalEvents();
  repository = new KnowledgeRepository();
  await repository.init();
  store = new ReactiveStore(repository);
  store.subscribe(render);
  await store.hydrate();
  render();
  refreshEnvironmentStatus().catch((error) => {
    bootError = error;
  });
  refreshPwaStatus("boot").catch((error) => {
    bootError = error;
  });
}

boot().catch((error) => {
  bootError = error;
  renderError(error);
});

window.__lifeosKnowledgeBase = {
  extractWikiLinks,
  replaceWikiLinksForRename,
  mapGraph,
  graphForCanvas,
  runForceLayout,
  chunkString,
  fileToSourcePayload,
  addImportedSource,
  analyzeArtifactInput,
  parseDateFromText,
  parseTimeFromText,
  parseTaskSchedule,
  analyzeSourceArtifact,
  seedExactLargeVault,
  isolateCorruptRecord,
  recoverCorruptRecord,
  buildArchitectureSnapshot,
  validateArchitectureState,
  buildArtifactWorkspace,
  saveSourceTranscript,
  extractKnowledgeFromNote,
  addClaim,
  addQuestion,
  addReviewItem,
  ensureReadingItemForSource,
  addHighlight,
  saveManualSourceExtraction,
  syncTranscriptSegments,
  addAudioCheckpoint,
  addPlayerNote,
  requestSttGate,
  probeOllama,
  normalizeTitle,
  productBrainStatusSummary,
  answerProductBrainQuestion,
  resetForTest: resetRepositoryForTest,
  getStateSnapshot() {
    return store ? clone(store.state) : null;
  },
  getArchitectureSnapshot() {
    return buildArchitectureSnapshot(store ? store.state : {});
  },
  setSurfaceForTest(surface) {
    if (!store) return Promise.resolve(false);
    return store.commit("Test surface selected", (state) => {
      state.activeSurface = cleanLine(surface || "inbox");
      if (state.activeSurface === "library" || state.activeSurface === "chat") state.activeNoteId = PRODUCT_BRAIN_ROOT_ID;
      if (state.activeSurface === "graph" || state.activeSurface === "control") state.graphView.selectedNodeId = PRODUCT_BRAIN_ROOT_ID;
    }).then(() => true);
  },
  flushForTest() {
    return store ? store.persistCurrent(store.stateRevision) : Promise.resolve();
  },
  seedLargeVaultForTest(count) {
    if (!store) return Promise.resolve(0);
    const limit = Math.max(0, Math.min(1000, Number(count || 0)));
    return store.commit("Large vault test seed", (state) => {
      for (let index = 0; index < limit; index += 1) {
        const title = "Large vault node " + index;
        const body = "# " + title + "\n\nLink to [[Large vault node " + ((index + 1) % Math.max(1, limit)) + "]].";
        const noteId = createNote(state, title, state.activeFolderId, body);
        if (index === 0) state.activeNoteId = noteId;
      }
      addAudit(state, "test.seed", "Large vault test seed: " + limit + " notes", state.activeNoteId);
    }).then(() => limit);
  },
  seedExactLargeVaultForTest() {
    if (!store) return Promise.resolve(null);
    const next = clone(store.state);
    const summary = seedExactLargeVault(next);
    recordArchitectureEvent(next, "repository.commit", "Exact large vault test seed", {
      revision: store.stateRevision + 1,
      activeSurface: next.activeSurface,
      activeArtifactId: next.activeNoteId
    });
    const architectureValidation = validateArchitectureState(next);
    if (!architectureValidation.ok) {
      addAudit(next, "architecture.validation.failed", "Architecture contract failed: " + architectureValidation.problems.join("; "), next.activeNoteId);
    }
    rebuildIndexes(next);
    next.commandMessage = "Exact large vault test seed";
    store.state = next;
    store.stateRevision += 1;
    store.saveState = "dirty";
    store.emit();
    updateSaveStatus();
    return Promise.resolve(summary);
  },
  injectCorruptRecordForTest() {
    if (!store) return Promise.resolve("");
    let recordId = "";
    return store.commit("Corrupt record isolated for test", (state) => {
      recordId = isolateCorruptRecord(state, "fixture-json", "{ broken: true, missingQuote: ", "Fixture corrupt record failed JSON validation and was isolated.");
    }).then(() => recordId);
  }
};

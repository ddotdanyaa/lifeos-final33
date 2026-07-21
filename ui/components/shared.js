export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// S1.2: подсветка совпавших букв в результатах поиска (донор-идея AFFiNE quicksearch
// highlight, своя реализация - их компонент рассчитан на пред-токенизированный текст с
// сервера, у нас честный локальный матчинг). Exact substring - подсвечивается целиком;
// иначе - посимвольно по порядку fuzzy-совпадения (та же логика, что vendored fuzzyMatch).
export function highlightMatch(text, query) {
  const raw = String(text || "");
  const q = String(query || "").trim();
  if (!q) return escapeHtml(raw);
  const lowerRaw = raw.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const exactIndex = lowerRaw.indexOf(lowerQuery);
  if (exactIndex >= 0) {
    return escapeHtml(raw.slice(0, exactIndex))
      + "<mark>" + escapeHtml(raw.slice(exactIndex, exactIndex + q.length)) + "</mark>"
      + escapeHtml(raw.slice(exactIndex + q.length));
  }
  let qi = 0;
  let html = "";
  for (const char of raw) {
    if (qi < lowerQuery.length && char.toLowerCase() === lowerQuery[qi]) {
      html += "<mark>" + escapeHtml(char) + "</mark>";
      qi += 1;
    } else {
      html += escapeHtml(char);
    }
  }
  return html;
}

export function publicText(value) {
  return String(value ?? "")
    .replace(/\bLifeOS Product Brain\b/g, "активный контекст")
    .replace(/\bProduct Brain\b/g, "контекст разработки");
}

export function compactText(value, limit = 90) {
  const text = publicText(value).replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return text.slice(0, Math.max(0, limit - 1)).trimEnd() + "…";
}

export function money(value) {
  const number = Number(value || 0);
  return Math.round(number).toLocaleString("ru-RU") + " ₽";
}

export function plural(value, one, few, many) {
  const n = Math.abs(Number(value || 0)) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

// T1.1: срочность задачи (идея obsidian-tasks Urgency.ts, MIT - docs/OSS_DONOR_AUDIT.md):
// просрочка растёт со днями, сегодня > скоро > без даты; назначенное время и напоминание
// повышают. Честная арифметика, не ML.
export function taskUrgency(task, todayKey) {
  if (!task || task.status === "done" || task.deleted) return 0;
  let score = 0;
  // T1.7: «лягушка» (главная задача дня) всегда всплывает наверх.
  if (task.frog) score += 100;
  if (task.day) {
    const gap = Math.round((Date.parse(task.day) - Date.parse(todayKey)) / 86400000);
    if (gap < 0) score += 12 + Math.min(12, -gap);
    else if (gap === 0) score += 9;
    else score += Math.max(0, 6 - gap);
  }
  if (task.startTime) score += 3;
  if (task.remindAt || task.reminderId) score += 2;
  return score;
}

// T1.2: класс-полоска срочности для строки задачи (тихая, не «мультяшная»).
export function urgencyClass(task, todayKey) {
  const score = taskUrgency(task, todayKey);
  if (score >= 13) return "urgency-high";
  if (score >= 9) return "urgency-med";
  return "";
}

export function humanDay(day, today, tomorrow) {
  if (!day) return "без даты";
  if (day === today) return "сегодня";
  if (day === tomorrow) return "завтра";
  return day;
}

export function scheduleLine(item, today, tomorrow) {
  const day = humanDay(item?.day || item?.targetDate || "", today, tomorrow);
  const time = item?.startTime || item?.time || "";
  return [day, time].filter(Boolean).join(", ");
}

export function providerLabel(status) {
  const value = String(status || "");
  const map = {
    "local-only": "работает локально",
    "not-connected": "не подключено",
    "not-configured": "нужна настройка",
    "permission-required": "нужно разрешение",
    "parser-required": "нужен парсер",
    "needs-owner-credentials": "нужны данные владельца",
    unchecked: "не проверено",
    offline: "не подключено",
    blocked: "заблокировано",
    error: "ошибка подключения",
    reachable: "доступно",
    models_found: "модели найдены, генерация не проверена",
    "blocked_by_browser_or_cors": "заблокировано браузером/CORS",
    degraded: "частично работает",
    "generation_ok": "генерация прошла",
    revoked: "отключено",
    "service-worker-ready": "работает локально",
    "offline-ready": "работает локально",
    downloading: "идёт загрузка модели",
    ready: "готово локально, офлайн",
    transcribing: "идёт расшифровка"
  };
  return map[value] || value.replace(/[-_]/g, " ") || "неизвестно";
}

export function button(action, label, options = {}) {
  const classes = ["ui-btn"];
  if (options.kind) classes.push("ui-btn-" + options.kind);
  if (options.className) classes.push(options.className);
  const id = options.id ? ` data-id="${escapeHtml(options.id)}"` : "";
  const test = options.testId ? ` data-testid="${escapeHtml(options.testId)}"` : "";
  const disabled = options.disabled ? " disabled" : "";
  const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
  return `<button class="${classes.join(" ")}" data-action="${escapeHtml(action)}"${id}${test}${disabled}${title}>${escapeHtml(label)}</button>`;
}

export function emptyState(title, detail, action = "") {
  return [
    `<div class="empty-state" data-testid="empty-state">`,
    `<strong>${escapeHtml(title)}</strong>`,
    detail ? `<span>${escapeHtml(detail)}</span>` : "",
    action,
    `</div>`
  ].join("");
}

export function objectChip(label, value, accent = "") {
  const style = accent ? ` style="--chip-accent:${escapeHtml(accent)}"` : "";
  return `<span class="object-chip"${style}><em>${escapeHtml(label)}</em><strong>${escapeHtml(value)}</strong></span>`;
}

export function safeList(items, renderer, fallback) {
  return items && items.length ? items.map(renderer).join("") : fallback;
}

// Renderer Registry (P2.1): one artifact -> any of RENDERER_MODES, driven by a
// presentArtifact() shape (see artifact-os-architecture.mjs) rather than per-type markup.
export function renderArtifactAsFeedBubble(item) {
  return [
    `<article class="renderer-feed-bubble" data-testid="renderer-feed-bubble" data-render-type="${escapeHtml(item.type)}">`,
    `<time>${escapeHtml(item.createdAt.slice(0, 16))}</time>`,
    `<strong>${escapeHtml(item.title)}</strong>`,
    `<span>${escapeHtml(compactText(item.summary, 140))}</span>`,
    `</article>`
  ].join("");
}

export function renderArtifactAsCard(item) {
  return [
    `<article class="renderer-card" data-testid="renderer-card" data-render-type="${escapeHtml(item.type)}">`,
    `<header><strong>${escapeHtml(item.title)}</strong><mark>${escapeHtml(item.status)}</mark></header>`,
    `<p>${escapeHtml(compactText(item.summary, 180))}</p>`,
    `<footer>${escapeHtml(item.type)} · ${escapeHtml(item.updatedAt.slice(0, 16))}</footer>`,
    `</article>`
  ].join("");
}

export function renderArtifactAsTableRow(item) {
  return [
    `<tr class="renderer-table-row" data-testid="renderer-table-row" data-render-type="${escapeHtml(item.type)}">`,
    `<td>${escapeHtml(item.title)}</td>`,
    `<td>${escapeHtml(item.type)}</td>`,
    `<td>${escapeHtml(item.status)}</td>`,
    `<td>${escapeHtml(item.updatedAt.slice(0, 10))}</td>`,
    `</tr>`
  ].join("");
}

export function renderArtifactAsTimeline(item) {
  return [
    `<li class="renderer-timeline-entry" data-testid="renderer-timeline-entry" data-render-type="${escapeHtml(item.type)}">`,
    `<time>${escapeHtml(item.createdAt.slice(0, 16))}</time>`,
    `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(compactText(item.summary, 120))}</span></div>`,
    `</li>`
  ].join("");
}

export const RENDERER_MODE_FUNCTIONS = {
  "feed-bubble": renderArtifactAsFeedBubble,
  card: renderArtifactAsCard,
  "table-row": renderArtifactAsTableRow,
  timeline: renderArtifactAsTimeline
};

export function renderArtifactByMode(item, mode) {
  const renderFn = RENDERER_MODE_FUNCTIONS[mode] || renderArtifactAsCard;
  return renderFn(item);
}

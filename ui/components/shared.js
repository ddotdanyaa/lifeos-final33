export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    "offline-ready": "работает локально"
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

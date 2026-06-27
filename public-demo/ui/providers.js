import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, escapeHtml, providerLabel, safeList } from "./components/shared.js";

const PREPARABLE_PROVIDERS = new Set(["mail", "calendarSync", "ocr", "stt", "pdf", "epub", "notifications"]);

function providerAction(key, provider) {
  const actions = [];

  if (key === "ollama") {
    actions.push(button("probe-ollama", "Проверить подключение", { kind: "primary", testId: "probe-provider-ollama" }));
  }

  if (key === "pwa") {
    actions.push(button("check-pwa", "Проверить", { kind: "primary", testId: "check-pwa" }));
  }

  if (PREPARABLE_PROVIDERS.has(key)) {
    actions.push(button("prepare-provider", "Подготовить", { id: key, kind: "ghost", testId: `prepare-provider-${key}` }));
  }

  if (provider.status !== "local-only" && provider.status !== "revoked") {
    actions.push(button("revoke-provider", "Отключить", { id: key, kind: "ghost", testId: `revoke-provider-${key}` }));
  }

  return actions.join("");
}

function normalizePwaStatus(provider = {}) {
  const raw = provider.serviceWorkerStatus || provider.status || "unsupported";
  if (["service-worker-ready", "ready", "local-only", "active", "installed"].includes(raw)) return "service-worker-ready";
  if (["service-worker-error", "error", "failed"].includes(raw)) return "service-worker-error";
  return "unsupported";
}

function pwaStatusText(raw) {
  if (raw === "service-worker-ready") return "офлайн-оболочка готова";
  if (raw === "service-worker-error") return "ошибка service worker";
  return "не поддерживается";
}

function pwaPassport(provider) {
  const raw = normalizePwaStatus(provider);
  const manifest = provider.manifest || "manifest.webmanifest";
  const scope = provider.scope || provider.serviceWorkerScope || "проверится после запуска";
  return [
    `<div class="provider-mini-passport" data-testid="pwa-panel">`,
    `<div><span>Файл приложения</span><strong data-testid="pwa-manifest">${escapeHtml(manifest)}</strong></div>`,
    `<div><span>Офлайн-оболочка</span><strong data-testid="pwa-service-worker-status" data-raw-status="${escapeHtml(raw)}">${escapeHtml(pwaStatusText(raw))}</strong></div>`,
    `<div><span>Область</span><strong data-testid="pwa-service-worker-scope">${escapeHtml(scope)}</strong></div>`,
    `</div>`
  ].join("");
}

function providerCard(key, provider = {}) {
  const label = provider.label || key;
  const status = providerLabel(provider.status);
  const summary = provider.requiredAction || provider.fallback || "Локальный режим работает без внешней отправки данных.";
  const localBoundary = provider.localFallback || "артефакты, история, ручной ввод и контроль остаются на устройстве";

  return [
    `<article class="provider-setup-card provider-${escapeHtml(key)}" data-testid="provider-row-${escapeHtml(key)}">`,
    `<header>`,
    `<span>Подключение</span>`,
    `<strong>${escapeHtml(label)}</strong>`,
    `<mark>${escapeHtml(status)}</mark>`,
    `</header>`,
    `<p>${escapeHtml(summary)}</p>`,
    key === "pwa" ? pwaPassport(provider) : "",
    `<div class="provider-boundary"><span>Что остаётся локально</span><strong>${escapeHtml(localBoundary)}</strong></div>`,
    `<div class="provider-actions">${providerAction(key, provider)}</div>`,
    `</article>`
  ].join("");
}

export function renderProviders(ctx) {
  const providers = ctx.providers || [];
  const body = [
    `<div class="providers-layout" data-testid="provider-panel">`,
    safeList(
      providers,
      (row) => providerCard(row.key, row.provider),
      `<div class="empty-inline">Подключения появятся после проверки среды.</div>`
    ),
    `</div>`
  ].join("");

  return renderWorkspaceLayout(
    "providers",
    "Подключения",
    "Здесь видно, что работает локально, что можно подключить позже и какие данные покидают устройство.",
    body,
    { testId: "workspace-providers", kicker: "Настройка" }
  );
}

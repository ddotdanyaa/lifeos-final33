import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, escapeHtml, providerLabel, safeList } from "./components/shared.js";

const PREPARABLE_PROVIDERS = new Set(["mail", "calendarSync", "ocr", "stt", "pdf", "epub", "notifications", "smartHome"]);

function providerAction(key, provider) {
  const actions = [];

  if (key === "ollama") {
    actions.push(button("probe-ollama", "Проверить подключение", { kind: "primary", testId: "probe-provider-ollama" }));
    actions.push(button("test-ollama-generation", "Тест генерации", { kind: "ghost", testId: "test-provider-ollama-generation" }));
    actions.push(button("test-ollama-embeddings", "Тест эмбеддингов", { kind: "ghost", testId: "test-provider-ollama-embeddings" }));
    actions.push(button("build-semantic-index", "Построить семантический индекс", { kind: "ghost", testId: "build-semantic-index" }));
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

function semanticIndexPassport(ctx) {
  const index = ctx.semanticIndex || {};
  return [
    `<div class="provider-mini-passport" data-testid="semantic-index-panel">`,
    `<div><span>Семантический индекс</span><strong data-testid="semantic-index-count">${index.vectorCount || 0} заметок</strong></div>`,
    `<div><span>Модель</span><strong data-testid="semantic-index-model">${escapeHtml(index.model || "не построен")}</strong></div>`,
    `</div>`
  ].join("");
}

function providerCard(key, provider = {}, ctx) {
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
    key === "ollama" ? semanticIndexPassport(ctx || {}) : "",
    `<div class="provider-boundary"><span>Что остаётся локально</span><strong>${escapeHtml(localBoundary)}</strong></div>`,
    `<div class="provider-actions">${providerAction(key, provider)}</div>`,
    `</article>`
  ].join("");
}

function byokVaultSection(ctx) {
  const models = (ctx.modelProfiles || []).filter((model) => model.kind === "cloud-gated");
  const entries = Object.values(ctx.control?.byokVault || {}).filter((entry) => !entry.revokedAt);
  return [
    `<section class="byok-vault" data-testid="byok-vault-panel">`,
    `<header><h3>BYOK: ключи облачных маршрутов</h3><p>Ключ вводит только владелец здесь; всегда замаскирован в интерфейсе и не попадает в экспорт по умолчанию.</p></header>`,
    `<div class="v34-form" data-testid="byok-vault-form">`,
    `<label><span>Маршрут (cloud-gated модель)</span><select id="byok-provider">${models.map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.title)}</option>`).join("") || `<option value="">нет cloud-gated маршрутов</option>`}</select></label>`,
    `<label><span>Ключ</span><input id="byok-key" type="password" autocomplete="off" value="" placeholder="sk-..."></label>`,
    button("add-byok-key", "Сохранить ключ", { kind: "primary", testId: "add-byok-key", disabled: !models.length }),
    `</div>`,
    safeList(
      entries,
      (entry) => `<div class="byok-key-row" data-testid="byok-key-row"><span>${escapeHtml((models.find((model) => model.id === entry.providerId) || {}).title || entry.providerId)}</span><strong data-testid="byok-key-masked">${escapeHtml(entry.maskedPreview)}</strong>${button("revoke-byok-key", "Отозвать", { id: entry.id, kind: "ghost", testId: "revoke-byok-key" })}</div>`,
      `<div class="empty-inline" data-testid="byok-vault-empty">Ключей пока нет.</div>`
    ),
    `</section>`
  ].join("");
}

export function renderProviders(ctx) {
  const providers = ctx.providers || [];
  const body = [
    `<div class="providers-layout" data-testid="provider-panel">`,
    safeList(
      providers,
      (row) => providerCard(row.key, row.provider, ctx),
      `<div class="empty-inline">Подключения появятся после проверки среды.</div>`
    ),
    byokVaultSection(ctx),
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

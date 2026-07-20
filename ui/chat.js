import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, compactText, escapeHtml, providerLabel, safeList } from "./components/shared.js";

// R4 CHAT_THREAD_SEARCH: a Jan-style thread search filter. ctx.chatMessages already carries
// the full thread (visibleChatMessages has no limit; only the render below used to slice it to
// the last 14) - a plain case-insensitive substring match is enough for an in-memory chat
// history, so no new search-library dependency is needed for this.
function filterChatMessages(messages, query) {
  const clean = String(query || "").trim().toLowerCase();
  if (!clean) return messages.slice(-14);
  return messages.filter((message) => String(message.text || message.content || "").toLowerCase().includes(clean));
}

// U4 CHAT_ACTIONS: real proposal-apply UI inline in the chat thread (BLOCKED.md previously
// noted state.proposals had no live renderer anywhere in the chat-first shell, even though
// apply-proposal/dismiss-proposal already worked). Each owner message that got a real,
// typed proposal (app.js's createChatMessageProposal, same classifier + proposal store as
// the main capture input) shows its preview and an Применить/Отклонить pair right here.
const CHAT_PROPOSAL_TYPE_LABELS = {
  shift: "Смена",
  finance_expense: "Расход",
  finance_income: "Доход",
  reminder: "Напоминание",
  task: "Задача",
  knowledge: "Заметка"
};

// Срез 5: вопрос ("сколько заработал?") не должен показывать кнопку «Сделать задачей» -
// это визуальный мусор под вопросом. Утверждения (у которых нет готового proposal) кнопку
// сохраняют. Лёгкий детектор — зеркало app.js's looksLikeQuestion, без импорта из app.js.
function messageLooksLikeQuestion(text) {
  const clean = String(text || "").trim().toLocaleLowerCase();
  if (!clean) return false;
  if (clean.includes("?")) return true;
  return ["как ", "почему ", "что ", "какой ", "какая ", "какое ", "какие ", "какого ", "сколько ", "умеешь", "можешь", "расскажи", "объясни", "сравни", "покажи", "стоит ли", "ты "].some((opener) => clean.startsWith(opener));
}

function chatProposalPreview(ctx, message) {
  if (message.role === "assistant" || !message.proposalId) {
    return message.role !== "assistant" && !messageLooksLikeQuestion(message.text || message.content || "")
      ? `<div>${button("chat-to-proposal", "Сделать задачей", { id: message.id, kind: "ghost", testId: "chat-to-proposal" })}</div>`
      : "";
  }
  const proposal = (ctx.proposals || []).find((item) => item.id === message.proposalId);
  if (!proposal) return "";
  const typeLabel = CHAT_PROPOSAL_TYPE_LABELS[proposal.type] || proposal.type;
  if (proposal.status === "applied") {
    return `<div class="chat-proposal-preview applied" data-testid="chat-proposal-preview" data-raw-status="applied"><span>${escapeHtml(typeLabel)} применено</span></div>`;
  }
  if (proposal.status !== "open") return "";
  return [
    `<div class="chat-proposal-preview" data-testid="chat-proposal-preview" data-raw-status="open" data-raw-type="${escapeHtml(proposal.type)}">`,
    `<span class="chat-proposal-type">${escapeHtml(typeLabel)}</span>`,
    `<strong>${escapeHtml(proposal.title)}</strong>`,
    `<div class="chat-proposal-actions">`,
    button("apply-proposal", "Применить", { id: proposal.id, kind: "primary", testId: "chat-proposal-apply" }),
    button("dismiss-proposal", "Отклонить", { id: proposal.id, kind: "ghost", testId: "chat-proposal-dismiss" }),
    `</div>`,
    `</div>`
  ].join("");
}

export function renderChat(ctx) {
  const allMessages = ctx.chatMessages || [];
  const chatSearchQuery = ctx.chatSearchQuery || "";
  const messages = filterChatMessages(allMessages, chatSearchQuery);
  const isSearching = Boolean(chatSearchQuery.trim());
  const activeTitle = ctx.activeNote?.title || ctx.latestSource?.name || "активный контекст";
  const ollamaStatus = ctx.ollama?.status || "unchecked";
  const generationStatus = ctx.ollama?.lastGenerationStatus || "";
  const localModelReady = ollamaStatus === "generation_ok" || generationStatus === "generation_ok";
  const chatMode = localModelReady ? "Local Rules + Ollama" : "Local Rules";
  const localModelStatus = localModelReady
    ? "локальная модель проверена генерацией"
    : ollamaStatus === "models_found"
      ? "модели найдены, генерация не проверена"
      : "локальная модель не подключена";
  const selectedModel = ctx.ollama?.selectedModel || (ctx.ollama?.models || [])[0] || "";
  const latency = ctx.ollama?.lastLatencyMs ? `${ctx.ollama.lastLatencyMs}ms` : "";
  const endpoint = ctx.ollama?.endpoint || "http://127.0.0.1:11434";
  const body = [
    `<div class="chat-thread-layout" data-testid="chat-panel">`,
    `<aside class="chat-context-card"><span>Контекст ответа</span><strong>${escapeHtml(activeTitle)}</strong><p>Чат отвечает локально по активному артефакту, задачам, предложениям, системам, поиску, истории и графу. Модель включается только после проверки генерации.</p><div class="local-ai-strip"><span>Режим</span><strong data-testid="chat-mode">${escapeHtml(chatMode)}</strong></div><div class="local-ai-strip"><span>Модель</span><strong data-testid="local-model-status" data-raw-status="${escapeHtml(ollamaStatus)}" data-generation-status="${escapeHtml(generationStatus)}">${escapeHtml(localModelStatus)}</strong><em data-testid="chat-fallback-mode">${escapeHtml(selectedModel || latency ? [selectedModel, generationStatus || "generation:not-run", latency].filter(Boolean).join(" · ") : "fallback: Local Rules")}</em></div><div class="local-ai-strip"><span>Ollama</span><strong data-testid="ollama-status" data-raw-status="${escapeHtml(ollamaStatus)}">${escapeHtml(providerLabel(ollamaStatus))}</strong>${button("probe-ollama", "Проверить", { kind: "ghost", testId: "probe-ollama" })}${button("test-ollama-generation", "Тест", { kind: "ghost", testId: "test-ollama-generation" })}</div><div class="local-ai-strip"><span>Эмбеддинги</span><strong data-testid="ollama-embeddings-status" data-raw-status="${escapeHtml(ctx.ollama?.embeddingsStatus || "unchecked")}">${escapeHtml(ctx.ollama?.embeddingsStatus === "embeddings_ok" ? "проверены (" + (ctx.ollama.embeddingsModel || "") + ")" : ctx.ollama?.embeddingsStatus === "provider_unavailable" ? "недоступны" : "не проверены")}</strong>${button("test-ollama-embeddings", "Тест эмбеддингов", { kind: "ghost", testId: "test-ollama-embeddings" })}</div><label class="local-ai-strip"><span>Адрес</span><input id="ollama-endpoint" data-testid="ollama-endpoint" value="${escapeHtml(endpoint)}" autocomplete="off" aria-label="Ollama endpoint"></label></aside>`,
    `<label class="chat-thread-search-label"><span>Поиск по истории чата</span><input id="chat-thread-search" data-testid="chat-thread-search" value="${escapeHtml(chatSearchQuery)}" autocomplete="off" placeholder="Найти в истории чата…" aria-label="Поиск по истории чата"></label>`,
    `<section class="chat-thread" data-testid="chat-thread">`,
    isSearching && !messages.length
      ? `<div class="empty-inline" data-testid="chat-thread-search-empty">Ничего не найдено по «${escapeHtml(chatSearchQuery.trim())}».</div>`
      : safeList(messages, (message) => `<article class="chat-message ${message.role === "assistant" ? "assistant" : "owner"}" data-message-id="${escapeHtml(message.id || "")}" data-receipt-id="${escapeHtml(message.receiptId || "")}" data-testid="${isSearching ? "chat-thread-search-result" : ""}"><span>${message.role === "assistant" ? "LifeOS" : "Ты"}</span><p>${escapeHtml(compactText(message.text || message.content || "", 760))}</p>${chatProposalPreview(ctx, message)}</article>`, `<article class="chat-message assistant"><span>LifeOS</span><p>Напиши сообщение: оно станет локальным артефактом, попадёт в историю, поиск, граф, ленту и Data Control.</p></article>`),
    `</section>`,
    `<footer class="chat-composer" data-testid="chat-composer"><textarea id="chat-input" data-testid="chat-input" rows="2" placeholder="Напиши вопрос, я отвечу по локальному контексту…" aria-label="Сообщение в чат" spellcheck="true"></textarea>${button("send-chat", "Отправить", { kind: "primary", testId: "send-chat" })}<details><summary>Спросить о разработке</summary><p>Команда /dev отвечает из внутреннего состояния разработки.</p></details></footer>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("chat", "Чат", "Локальный диалог по текущему контексту: отвечает, объясняет, ищет и помогает превратить сообщение в действие.", body, { testId: "workspace-chat", kicker: "Диалог" });
}

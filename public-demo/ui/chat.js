import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, compactText, escapeHtml, providerLabel, safeList } from "./components/shared.js";

export function renderChat(ctx) {
  const messages = ctx.chatMessages || [];
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
    `<aside class="chat-context-card"><span>Контекст ответа</span><strong>${escapeHtml(activeTitle)}</strong><p>Чат отвечает локально по активному артефакту, задачам, предложениям, системам, поиску, истории и графу. Модель включается только после проверки генерации.</p><div class="local-ai-strip"><span>Режим</span><strong data-testid="chat-mode">${escapeHtml(chatMode)}</strong></div><div class="local-ai-strip"><span>Модель</span><strong data-testid="local-model-status" data-raw-status="${escapeHtml(ollamaStatus)}" data-generation-status="${escapeHtml(generationStatus)}">${escapeHtml(localModelStatus)}</strong><em data-testid="chat-fallback-mode">${escapeHtml(selectedModel || latency ? [selectedModel, generationStatus || "generation:not-run", latency].filter(Boolean).join(" · ") : "fallback: Local Rules")}</em></div><div class="local-ai-strip"><span>Ollama</span><strong data-testid="ollama-status" data-raw-status="${escapeHtml(ollamaStatus)}">${escapeHtml(providerLabel(ollamaStatus))}</strong>${button("probe-ollama", "Проверить", { kind: "ghost", testId: "probe-ollama" })}${button("test-ollama-generation", "Тест", { kind: "ghost", testId: "test-ollama-generation" })}</div><label class="local-ai-strip"><span>Адрес</span><input id="ollama-endpoint" data-testid="ollama-endpoint" value="${escapeHtml(endpoint)}" autocomplete="off" aria-label="Ollama endpoint"></label></aside>`,
    `<section class="chat-thread" data-testid="chat-thread">`,
    safeList(messages.slice(-14), (message) => `<article class="chat-message ${message.role === "assistant" ? "assistant" : "owner"}" data-message-id="${escapeHtml(message.id || "")}" data-receipt-id="${escapeHtml(message.receiptId || "")}"><span>${message.role === "assistant" ? "LifeOS" : "Ты"}</span><p>${escapeHtml(compactText(message.text || message.content || "", 760))}</p>${message.receiptId ? `<small>receipt ${escapeHtml(message.receiptId)}</small>` : ""}${message.role !== "assistant" ? `<div>${button("chat-to-proposal", "Сделать задачей", { id: message.id, kind: "ghost", testId: "chat-to-proposal" })}</div>` : ""}</article>`, `<article class="chat-message assistant"><span>LifeOS</span><p>Напиши сообщение: оно станет локальным артефактом, попадёт в историю, поиск, граф, ленту и Data Control.</p></article>`),
    `</section>`,
    `<footer class="chat-composer" data-testid="chat-composer"><textarea id="chat-input" data-testid="chat-input" rows="2" placeholder="Напиши вопрос, я отвечу по локальному контексту…" aria-label="Сообщение в чат" spellcheck="true"></textarea>${button("send-chat", "Отправить", { kind: "primary", testId: "send-chat" })}<details><summary>Спросить о разработке</summary><p>Команда /dev отвечает из внутреннего состояния разработки.</p></details></footer>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("chat", "Чат", "Локальный диалог по текущему контексту: отвечает, объясняет, ищет и помогает превратить сообщение в действие.", body, { testId: "workspace-chat", kicker: "Диалог" });
}

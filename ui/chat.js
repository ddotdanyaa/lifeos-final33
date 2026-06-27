import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";
import { button, compactText, escapeHtml, providerLabel, safeList } from "./components/shared.js";

export function renderChat(ctx) {
  const messages = ctx.chatMessages || [];
  const activeTitle = ctx.activeNote?.title || ctx.latestSource?.name || "активный артефакт";
  const body = [
    `<div class="chat-thread-layout" data-testid="chat-panel">`,
    `<aside class="chat-context-card"><span>Контекст</span><strong>${escapeHtml(activeTitle)}</strong><p>Чат хранится локально. Без Ollama он отвечает правилами LifeOS и может превратить сообщение в предложение.</p><div class="local-ai-strip"><span>Ollama</span><strong data-testid="ollama-status" data-raw-status="${escapeHtml(ctx.ollama?.status || "")}">${escapeHtml(providerLabel(ctx.ollama?.status))}</strong>${button("probe-ollama", "Проверить", { kind: "ghost", testId: "probe-ollama" })}</div></aside>`,
    `<section class="chat-thread" data-testid="chat-thread">`,
    safeList(messages.slice(-14), (message) => `<article class="chat-message ${message.role === "assistant" ? "assistant" : "owner"}"><span>${message.role === "assistant" ? "LifeOS" : "Ты"}</span><p>${escapeHtml(compactText(message.text || message.content || "", 420))}</p>${message.role !== "assistant" ? `<div>${button("chat-to-proposal", "Сделать задачей", { id: message.id, kind: "ghost", testId: "chat-to-proposal" })}</div>` : ""}</article>`, `<article class="chat-message assistant"><span>LifeOS</span><p>Напиши вопрос по активному артефакту. Например: что сделать дальше?</p></article>`),
    `</section>`,
    `<footer class="chat-composer"><input id="chat-input" data-testid="chat-input" placeholder="Спроси по активному артефакту…" aria-label="Сообщение в чат">${button("send-chat", "Отправить", { kind: "primary", testId: "send-chat" })}<details><summary>Спросить о разработке</summary><p>Команда /dev отвечает из внутреннего состояния разработки.</p></details></footer>`,
    `</div>`
  ].join("");
  return renderWorkspaceLayout("chat", "Чат", "Разговор по активному артефакту. AI не нужен для локальной истории и базовых ответов.", body, { testId: "workspace-chat", kicker: "Диалог" });
}

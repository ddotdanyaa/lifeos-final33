import { button, escapeHtml, providerLabel, safeList } from "./shared.js";

function sttProvider(ctx) {
  const row = (ctx.providers || []).find((item) => item.key === "stt");
  return row ? row.provider : { status: "not-configured", requiredAction: "Ручная расшифровка работает сейчас." };
}

export function renderPlayerSurface(ctx) {
  const audios = ctx.audioSources || [];
  const active = audios[0] || null;
  const stt = sttProvider(ctx);
  return [
    `<div class="player-surface" data-testid="player-surface">`,
    `<aside class="audio-list">`,
    `<h3>Аудио</h3>`,
    safeList(audios, (audio) => `<article class="audio-card" data-testid="audio-card"><strong>${escapeHtml(audio.name || "Аудио")}</strong><span>${escapeHtml(audio.transcriptText ? "есть расшифровка" : "можно расшифровать вручную")}</span>${button("open-source-note", "Открыть источник", { id: audio.id, kind: "ghost" })}<label class="transcript-editor-label">Ручная расшифровка<textarea class="transcript-box" data-testid="transcript-input-${escapeHtml(audio.id)}" id="transcript-${escapeHtml(audio.id)}" spellcheck="true">${escapeHtml(audio.transcriptText || "")}</textarea></label>${button("save-transcript", "Сохранить расшифровку", { id: audio.id, kind: "primary", testId: `save-transcript-${audio.id}` })}<div class="checkpoint-row"><input id="checkpoint-time-${escapeHtml(audio.id)}" data-testid="checkpoint-time" aria-label="Время закладки" placeholder="00:30"><input id="checkpoint-title-${escapeHtml(audio.id)}" data-testid="checkpoint-title" aria-label="Название закладки" placeholder="Что важно">${button("add-audio-checkpoint", "Добавить закладку", { id: audio.id, kind: "ghost", testId: "add-audio-checkpoint" })}</div><textarea id="transcript-snippet-${escapeHtml(audio.id)}" data-testid="transcript-snippet" aria-label="Transcript snippet" placeholder="Фрагмент для заметки, задачи или вывода"></textarea><div class="knowledge-actions">${button("transcript-to-task", "В задачу", { id: audio.id, kind: "ghost", testId: "transcript-to-task" })}${button("transcript-to-claim", "В вывод", { id: audio.id, kind: "ghost", testId: "transcript-to-claim" })}${button("transcript-to-note", "В заметку", { id: audio.id, kind: "ghost", testId: "transcript-to-note" })}</div></article>`, `<div class="empty-inline">Добавь аудио.</div>`),
    button("import-audio", "Добавить аудио", { kind: "primary", testId: "player-import-audio" }),
    `</aside>`,
    `<section class="audio-player-card" data-testid="player-panel">`,
    `<div class="player-art"><span>▶</span></div>`,
    `<h3>${escapeHtml(active?.name || "Плеер")}</h3>`,
    active?.dataUrl ? `<audio controls src="${escapeHtml(active.dataUrl)}" data-testid="audio-player"></audio>` : `<div class="audio-fake-controls"><button>▶</button><div></div><time>00:00</time></div>`,
    `<p>Аудио сохраняется локально. Авторасшифровка требует настройки, ручной текст работает сейчас.</p>`,
    `<div class="stt-gate" data-testid="stt-gate"><div><strong>STT</strong><span>${escapeHtml(providerLabel(stt.status))}</span></div><p>${escapeHtml(stt.requiredAction || "нужна настройка; ручной режим работает")}</p></div>`,
    `</section>`,
    `<section class="transcript-editor">`,
    `<h3>Разбор фрагмента</h3>`,
    `<div class="transcript-actions">${active ? button("transcript-to-note", "Фрагмент в заметку", { id: active.id, kind: "ghost", testId: "transcript-to-note" }) : ""}${active ? button("transcript-to-task", "Фрагмент в задачу", { id: active.id, kind: "ghost", testId: "transcript-to-task" }) : ""}</div>`,
    `</section>`,
    `</div>`
  ].join("");
}

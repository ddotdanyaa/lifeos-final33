import { button, escapeHtml, providerLabel, safeList } from "./shared.js";

function sttProvider(ctx) {
  const row = (ctx.providers || []).find((item) => item.key === "stt");
  return row ? row.provider : { status: "not-configured", requiredAction: "Ручная расшифровка работает сейчас." };
}

function segmentsFor(ctx, sourceId) {
  return (ctx.transcriptSegments || []).filter((segment) => segment.sourceId === sourceId).sort((a, b) => a.index - b.index);
}

function renderSegmentRow(segment) {
  return `<div class="transcript-segment-row" data-testid="transcript-segment-row"><strong>${escapeHtml(segment.timecode || String((segment.index || 0) + 1))}</strong><span>${escapeHtml((segment.text || "").slice(0, 160))}</span></div>`;
}

function whisperStatusLabel(audio) {
  const status = String(audio.transcriptStatus || "");
  if (status === "whisper-transcribing") return "идёт расшифровка Whisper…";
  if (status === "whisper-done") return "расшифровано Whisper";
  if (status.startsWith("whisper-failed")) return status.replace("whisper-failed: ", "не удалось: ");
  return audio.transcriptText ? "есть расшифровка" : "можно расшифровать вручную";
}

function recordStatusLabel(status) {
  if (status === "recording") return "идёт запись…";
  if (status === "error") return "запись не удалась";
  return "готово к записи";
}

function renderRecordPanel(recordingStatus) {
  const status = String((recordingStatus && recordingStatus.status) || "idle");
  const isRecording = status === "recording";
  return [
    `<div class="audio-record-panel" data-testid="audio-record-panel">`,
    `<canvas data-testid="record-waveform" width="240" height="60"></canvas>`,
    `<div data-testid="record-status" data-raw-status="${escapeHtml(status)}"><span>${escapeHtml(recordStatusLabel(status))}</span>${status === "error" && recordingStatus.error ? `<em>${escapeHtml(recordingStatus.error)}</em>` : ""}</div>`,
    isRecording
      ? button("stop-audio-recording", "Стоп", { kind: "danger", testId: "stop-audio-recording" })
      : button("start-audio-recording", "Записать аудио", { kind: "ghost", testId: "start-audio-recording" }),
    `</div>`
  ].join("");
}

export function renderPlayerSurface(ctx) {
  const audios = ctx.audioSources || [];
  const active = audios[0] || null;
  const stt = sttProvider(ctx);
  const sttReady = stt.status === "ready";
  return [
    `<div class="player-surface" data-testid="player-surface">`,
    `<aside class="audio-list">`,
    `<h3>Аудио</h3>`,
    safeList(audios, (audio) => `<article class="audio-card" data-testid="audio-card"><strong>${escapeHtml(audio.name || "Аудио")}</strong><span>${escapeHtml(whisperStatusLabel(audio))}</span>${button("open-source-note", "Открыть источник", { id: audio.id, kind: "ghost" })}${button("transcribe-whisper", "Расшифровать (Whisper)", { id: audio.id, kind: "ghost", testId: `transcribe-whisper-${audio.id}`, disabled: !sttReady || audio.transcriptStatus === "whisper-transcribing", title: sttReady ? "" : "Сначала подготовь Whisper ниже" })}<label class="transcript-editor-label">Ручная расшифровка<textarea class="transcript-box" data-testid="transcript-input-${escapeHtml(audio.id)}" id="transcript-${escapeHtml(audio.id)}" spellcheck="true">${escapeHtml(audio.transcriptText || "")}</textarea></label>${button("save-transcript", "Сохранить расшифровку", { id: audio.id, kind: "primary", testId: `save-transcript-${audio.id}` })}${safeList(segmentsFor(ctx, audio.id), renderSegmentRow, "")}<div class="checkpoint-row"><input id="checkpoint-time-${escapeHtml(audio.id)}" data-testid="checkpoint-time" aria-label="Время закладки" placeholder="00:30"><input id="checkpoint-title-${escapeHtml(audio.id)}" data-testid="checkpoint-title" aria-label="Название закладки" placeholder="Что важно">${button("add-audio-checkpoint", "Добавить закладку", { id: audio.id, kind: "ghost", testId: "add-audio-checkpoint" })}</div><textarea id="transcript-snippet-${escapeHtml(audio.id)}" data-testid="transcript-snippet" aria-label="Transcript snippet" placeholder="Фрагмент для заметки, задачи или вывода"></textarea><div class="knowledge-actions">${button("transcript-to-task", "В задачу", { id: audio.id, kind: "ghost", testId: "transcript-to-task" })}${button("transcript-to-claim", "В вывод", { id: audio.id, kind: "ghost", testId: "transcript-to-claim" })}${button("transcript-to-note", "В заметку", { id: audio.id, kind: "ghost", testId: "transcript-to-note" })}</div></article>`, `<div class="empty-inline">Добавь аудио.</div>`),
    button("import-audio", "Добавить аудио", { kind: "primary", testId: "player-import-audio" }),
    renderRecordPanel(ctx.control?.audioRecordingStatus),
    `</aside>`,
    `<section class="audio-player-card" data-testid="player-panel">`,
    `<div class="player-art"><span>▶</span></div>`,
    `<h3>${escapeHtml(active?.name || "Плеер")}</h3>`,
    active?.dataUrl ? `<audio controls src="${escapeHtml(active.dataUrl)}" data-testid="audio-player"></audio>` : `<div class="audio-fake-controls"><button>▶</button><div></div><time>00:00</time></div>`,
    `<p>Аудио сохраняется локально. Whisper расшифровывает офлайн после подготовки; ручной текст работает всегда.</p>`,
    `<div class="stt-gate" data-testid="stt-gate" data-raw-status="${escapeHtml(stt.status || "not-configured")}"><div><strong>STT</strong><span>${escapeHtml(providerLabel(stt.status))}${stt.status === "downloading" && Number.isFinite(stt.percent) ? " · " + stt.percent + "%" : ""}</span></div><p>${escapeHtml(stt.requiredAction || "нужна настройка; ручной режим работает")}</p>${sttReady ? "" : button("prepare-whisper", "Подготовить Whisper (скачает ~75 МБ)", { kind: "primary", testId: "prepare-whisper", disabled: stt.status === "downloading" })}</div>`,
    `</section>`,
    `<section class="transcript-editor">`,
    `<h3>Разбор фрагмента</h3>`,
    `<div class="transcript-actions">${active ? button("transcript-to-note", "Фрагмент в заметку", { id: active.id, kind: "ghost", testId: "transcript-to-note" }) : ""}${active ? button("transcript-to-task", "Фрагмент в задачу", { id: active.id, kind: "ghost", testId: "transcript-to-task" }) : ""}</div>`,
    `</section>`,
    `</div>`
  ].join("");
}

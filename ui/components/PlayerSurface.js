import { button, escapeHtml, providerLabel, safeList } from "./shared.js";

function sttProvider(ctx) {
  const row = (ctx.providers || []).find((item) => item.key === "stt");
  return row ? row.provider : { status: "not-configured", requiredAction: "Ручная расшифровка работает сейчас." };
}

// U3 VOICE_LOOP: tried vosk-browser (Apache-2.0, small-ru) first, per the plan's own listed
// option - genuinely blocked (see DECISIONS.md: its WASM model extracts the repackaged model
// correctly, then hangs on an internal filesystem sync with no error). whisper.cpp (below) is
// the engine that actually works; Vosk's honest blocked status stays visible rather than being
// silently deleted, matching how Whisper's own blocked status stays visible too.
function voskProvider(ctx) {
  const row = (ctx.providers || []).find((item) => item.key === "vosk");
  return row ? row.provider : { status: "not-configured", requiredAction: "Ручная расшифровка работает сейчас." };
}

function voskStatusLabel(audio) {
  const status = String(audio.transcriptStatus || "");
  if (status === "vosk-transcribing") return "идёт расшифровка Vosk…";
  if (status === "vosk-done") return "расшифровано Vosk";
  if (status.startsWith("vosk-failed")) return status.replace("vosk-failed: ", "не удалось: ");
  return "";
}

// whisper.cpp (MIT) - the engine that actually works end to end. A local HTTP daemon the
// owner starts (npm run whisper-server), treated exactly like Ollama: the app only probes and
// calls it, never spawns/manages the process itself.
function whisperCppProvider(ctx) {
  const row = (ctx.providers || []).find((item) => item.key === "whispercpp");
  return row ? row.provider : { status: "not-configured", requiredAction: "Запусти локальный сервер: npm run whisper-server" };
}

function whisperCppStatusLabel(audio) {
  const status = String(audio.transcriptStatus || "");
  if (status === "whispercpp-transcribing") return "идёт расшифровка whisper.cpp…";
  if (status === "whispercpp-done") return "расшифровано whisper.cpp";
  if (status.startsWith("whispercpp-failed")) return status.replace("whispercpp-failed: ", "не удалось: ");
  return "";
}

// Байты у записи есть, если она либо целиком лежит строкой в состоянии, либо сохранена блобом.
export function hasAudioBytes(source) {
  return Boolean(source && (source.dataUrl || source.mediaStored));
}

function segmentsFor(ctx, sourceId) {
  return (ctx.transcriptSegments || []).filter((segment) => segment.sourceId === sourceId).sort((a, b) => a.index - b.index);
}

function renderSegmentRow(segment) {
  return `<div class="transcript-segment-row" data-testid="transcript-segment-row"><strong>${escapeHtml(segment.timecode || String((segment.index || 0) + 1))}</strong><span>${escapeHtml((segment.text || "").slice(0, 160))}</span></div>`;
}

// U5 READER: checkpoints were create-only before this package - added here so an owner can
// actually get back to a bookmarked moment, not just see a count of them.
function checkpointsFor(ctx, sourceId) {
  return (ctx.audioCheckpoints || []).filter((checkpoint) => checkpoint.sourceId === sourceId).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function renderCheckpointRow(checkpoint) {
  return `<div class="audio-checkpoint-row" data-testid="audio-checkpoint-row"><strong>${escapeHtml(checkpoint.timecode || "без времени")}</strong><span>${escapeHtml(checkpoint.title)}</span>${button("seek-audio-checkpoint", "Перейти", { id: checkpoint.id, kind: "ghost", testId: "seek-audio-checkpoint" })}</div>`;
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

export function renderRecordPanel(recordingStatus) {
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
  const vosk = voskProvider(ctx);
  const voskReady = vosk.status === "ready";
  const whispercpp = whisperCppProvider(ctx);
  const whisperCppReady = whispercpp.status === "reachable";
  return [
    `<div class="player-surface" data-testid="player-surface">`,
    `<aside class="audio-list">`,
    `<div class="audio-list-head"><h3>Аудио${audios.length ? ` <span class="audio-count" data-testid="audio-count">${audios.length}</span>` : ""}</h3></div>`,
    // U-DUMP: card is compact by default - name + status + a delete button + the transcribe row,
    // with the heavy editing controls (manual transcript, checkpoints, snippet, knowledge actions)
    // folded into <details>, open only on the active (top) card. Dumping 20-30 files after work
    // stays a scannable, deletable list inside a bounded scroll area instead of an endless wall.
    safeList(audios, (audio, index) => `<article class="audio-card" data-testid="audio-card">`
      + `<div class="audio-card-head"><div><strong>${escapeHtml(audio.name || "Аудио")}</strong><span>${escapeHtml(whisperStatusLabel(audio))}</span>${voskStatusLabel(audio) ? `<span>${escapeHtml(voskStatusLabel(audio))}</span>` : ""}${whisperCppStatusLabel(audio) ? `<span>${escapeHtml(whisperCppStatusLabel(audio))}</span>` : ""}</div>${button("archive-source", "Удалить", { id: audio.id, kind: "danger", testId: `archive-source-${audio.id}`, title: "Убрать этот файл из списка (можно восстановить из Контроля)" })}</div>`
      + `<div class="audio-card-actions">${button("open-source-note", "Открыть источник", { id: audio.id, kind: "ghost" })}${button("transcribe-whisper", "Расшифровать (Whisper)", { id: audio.id, kind: "ghost", testId: `transcribe-whisper-${audio.id}`, disabled: !sttReady || audio.transcriptStatus === "whisper-transcribing", title: sttReady ? "" : "Сначала подготовь Whisper ниже" })}${button("transcribe-vosk", "Расшифровать (Vosk)", { id: audio.id, kind: "ghost", testId: `transcribe-vosk-${audio.id}`, disabled: !voskReady || audio.transcriptStatus === "vosk-transcribing", title: voskReady ? "" : "Сначала подготовь Vosk ниже" })}${button("transcribe-whispercpp", "Расшифровать (whisper.cpp)", { id: audio.id, kind: "ghost", testId: `transcribe-whispercpp-${audio.id}`, disabled: !whisperCppReady || audio.transcriptStatus === "whispercpp-transcribing", title: whisperCppReady ? "" : "Сначала проверь whisper.cpp ниже" })}</div>`
      + `<details class="audio-card-more"${index === 0 ? " open" : ""}><summary>Расшифровка, закладки, заметка</summary>`
      + `<label class="transcript-editor-label">Ручная расшифровка<textarea class="transcript-box" data-testid="transcript-input-${escapeHtml(audio.id)}" id="transcript-${escapeHtml(audio.id)}" spellcheck="true">${escapeHtml(audio.transcriptText || "")}</textarea></label>${button("save-transcript", "Сохранить расшифровку", { id: audio.id, kind: "primary", testId: `save-transcript-${audio.id}` })}${safeList(segmentsFor(ctx, audio.id), renderSegmentRow, "")}<div class="checkpoint-row"><input id="checkpoint-time-${escapeHtml(audio.id)}" data-testid="checkpoint-time" aria-label="Время закладки" placeholder="00:30"><input id="checkpoint-title-${escapeHtml(audio.id)}" data-testid="checkpoint-title" aria-label="Название закладки" placeholder="Что важно">${button("add-audio-checkpoint", "Добавить закладку", { id: audio.id, kind: "ghost", testId: "add-audio-checkpoint" })}</div>${safeList(checkpointsFor(ctx, audio.id), renderCheckpointRow, "")}<textarea id="transcript-snippet-${escapeHtml(audio.id)}" data-testid="transcript-snippet" aria-label="Transcript snippet" placeholder="Фрагмент для заметки, задачи или вывода"></textarea><div class="knowledge-actions">${button("transcript-to-task", "В задачу", { id: audio.id, kind: "ghost", testId: "transcript-to-task" })}${button("transcript-to-claim", "В вывод", { id: audio.id, kind: "ghost", testId: "transcript-to-claim" })}${button("transcript-to-note", "В заметку", { id: audio.id, kind: "ghost", testId: "transcript-to-note" })}</div>`
      + `</details></article>`, `<div class="empty-inline">Добавь аудио.</div>`),
    button("import-audio", "Добавить аудио", { kind: "primary", testId: "player-import-audio" }),
    renderRecordPanel(ctx.control?.audioRecordingStatus),
    `</aside>`,
    `<section class="audio-player-card" data-testid="player-panel">`,
    `<div class="player-art"><span>▶</span></div>`,
    `<h3>${escapeHtml(active?.name || "Плеер")}</h3>`,
    // Крупный файл живёт блобом в хранилище, а не строкой в состоянии: `src` тогда пустой и
    // подставляется после отрисовки (mountAudioPlayer). Плеер обязан появиться в обоих случаях —
    // иначе часовая запись выглядит как «звука нет», хотя он сохранён целиком.
    hasAudioBytes(active) ? `<audio controls${active.dataUrl ? ` src="${escapeHtml(active.dataUrl)}"` : ""} data-testid="audio-player" data-source-id="${escapeHtml(active.id)}" data-rate="${escapeHtml(String(active.playbackRate || 1))}"></audio>` : `<div class="audio-fake-controls"><button>▶</button><div></div><time>00:00</time></div>`,
    // R1.1: скорость воспроизведения (Audiobookshelf-идея, код свой) - запоминается в артефакте.
    hasAudioBytes(active) ? `<div class="audio-speed-row" data-testid="audio-speed-row"><span>Скорость</span>${[0.75, 1, 1.25, 1.5, 2].map((rate) => `<button data-action="set-audio-rate" data-id="${escapeHtml(active.id + "::" + rate)}" data-testid="audio-rate-${String(rate).replace(".", "-")}" class="${Number(active.playbackRate || 1) === rate ? "active" : ""}">${rate}×</button>`).join("")}</div>` : "",
    `<p>Аудио сохраняется локально. whisper.cpp расшифровывает офлайн через локальный сервер и работает; Whisper и Vosk честно заблокированы отдельными внешними проблемами (ONNX Runtime и WASM-библиотека соответственно); ручной текст работает всегда.</p>`,
    `<div class="stt-gate" data-testid="stt-gate" data-raw-status="${escapeHtml(stt.status || "not-configured")}"><div><strong>STT (Whisper)</strong><span>${escapeHtml(providerLabel(stt.status))}${stt.status === "downloading" && Number.isFinite(stt.percent) ? " · " + stt.percent + "%" : ""}</span></div><p>${escapeHtml(stt.requiredAction || "нужна настройка; ручной режим работает")}</p>${sttReady ? "" : button("prepare-whisper", "Подготовить Whisper (скачает ~75 МБ)", { kind: "primary", testId: "prepare-whisper", disabled: stt.status === "downloading" })}</div>`,
    `<div class="stt-gate" data-testid="vosk-gate" data-raw-status="${escapeHtml(vosk.status || "not-configured")}"><div><strong>STT (Vosk)</strong><span>${escapeHtml(providerLabel(vosk.status))}${vosk.status === "downloading" && Number.isFinite(vosk.percent) ? " · " + vosk.percent + "%" : ""}</span></div><p>${escapeHtml(vosk.requiredAction || "нужна настройка; ручной режим работает")}</p>${voskReady ? "" : button("prepare-vosk", "Подготовить Vosk (скачает ~46 МБ)", { kind: "primary", testId: "prepare-vosk", disabled: vosk.status === "downloading" })}</div>`,
    `<div class="stt-gate" data-testid="whispercpp-gate" data-raw-status="${escapeHtml(whispercpp.status || "not-configured")}"><div><strong>STT (whisper.cpp)</strong><span>${escapeHtml(providerLabel(whispercpp.status))}</span></div><p>${escapeHtml(whispercpp.requiredAction || "нужна настройка; ручной режим работает")}</p><label class="local-ai-strip"><span>Адрес</span><input id="whispercpp-endpoint" data-testid="whispercpp-endpoint" value="${escapeHtml(whispercpp.endpoint || "http://127.0.0.1:8090")}" autocomplete="off" aria-label="whisper.cpp endpoint"></label>${button("probe-whispercpp", "Проверить whisper.cpp", { kind: "primary", testId: "probe-whispercpp" })}</div>`,
    `</section>`,
    `<section class="transcript-editor">`,
    `<h3>Разбор фрагмента</h3>`,
    `<div class="transcript-actions">${active ? button("transcript-to-note", "Фрагмент в заметку", { id: active.id, kind: "ghost", testId: "transcript-to-note" }) : ""}${active ? button("transcript-to-task", "Фрагмент в задачу", { id: active.id, kind: "ghost", testId: "transcript-to-task" }) : ""}</div>`,
    `</section>`,
    `</div>`
  ].join("");
}

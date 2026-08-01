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
// Боль владельца 2026-07-30, дословно: «нажимаю разобрать… снизу идёт расшифровка, локальная…
// сколько процентов, сколько загрузки непонятно, сколько ещё ждать тоже непонятно… и вот, новая
// запись тридцать: не удалось расшифровать, заебись, да? То есть я даже так долго ещё ждал,
// чтобы ничего не расшифровалось».
//
// Здесь было ТРИ кнопки «Расшифровать» — Whisper, Vosk и whisper.cpp, — из которых две всегда
// заблокированы внешними причинами (ONNX Runtime и WASM-библиотека). Владелец видел три
// одинаковых обещания и ни одного работающего движка, а причина отказа лежала абзацем ниже.
//
// Стало: рабочий движок выносится ОДНОЙ кнопкой «Расшифровать», остальные уезжают в «Другие
// движки» — их testId сохранены, потому что на них висят восемь спек, и ослаблять их запрещено.
// Если не готов ни один — кнопки нет вовсе, вместо неё сказано, что нажать.
function transcribeControls(audio, ready) {
  const busy = String(audio.transcriptStatus || "").includes("transcribing");
  const primary = ready.whisperCppReady
    ? { action: "transcribe-whispercpp", testId: `transcribe-whispercpp-${audio.id}`, label: "Расшифровать" }
    : ready.sttReady
      ? { action: "transcribe-whisper", testId: `transcribe-whisper-${audio.id}`, label: "Расшифровать" }
      : null;
  const rest = [
    ["transcribe-whispercpp", "whisper.cpp", ready.whisperCppReady, `transcribe-whispercpp-${audio.id}`],
    ["transcribe-whisper", "Whisper", ready.sttReady, `transcribe-whisper-${audio.id}`],
    ["transcribe-vosk", "Vosk", ready.voskReady, `transcribe-vosk-${audio.id}`]
  ].filter((row) => !primary || row[0] !== primary.action);
  return [
    primary ? button(primary.action, busy ? "Идёт расшифровка…" : primary.label, { id: audio.id, kind: "primary", testId: primary.testId, disabled: busy }) : "",
    `<details class="audio-engines" data-testid="audio-engines"><summary>Другие движки</summary>`,
    rest.map(([action, label, isReady, testId]) => button(action, label, { id: audio.id, kind: "ghost", testId, disabled: !isReady || busy, title: isReady ? "" : "Движок не готов — см. ниже" })).join(""),
    `</details>`
  ].join("");
}

// Честная строка вместо молчания. Два случая, и оба владелец видел вживую: ни одного движка нет
// (тогда ожидание бессмысленно, и надо сказать, что нажать) и идёт разбор (тогда надо сказать,
// сколько это на самом деле длится — соседняя сессия замерила минуты, а не секунды).
function transcribeHonestNote(audio, ready) {
  const busy = String(audio.transcriptStatus || "").includes("transcribing");
  if (busy) {
    return `<p class="audio-honest-note" data-testid="transcribe-note">Идёт локальная расшифровка. На этом компьютере это минуты, а не секунды — вкладку можно не держать открытой.</p>`;
  }
  if (!ready.whisperCppReady && !ready.sttReady && !ready.voskReady) {
    return `<p class="audio-honest-note" data-testid="transcribe-blocked">Расшифровывать нечем: локальный движок не запущен. Запусти <code>npm run whisper-server</code> и нажми «Проверить whisper.cpp» ниже. Ручной текст работает всегда.</p>`;
  }
  return "";
}

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

// Работает ли расшифровка хоть чем-нибудь. Владельцу не важно, КАКОЙ движок справился —
// важно, справится ли кто-нибудь. Три статуса сводятся в один ответ «да/нет», и только «нет»
// имеет право занимать место на экране.
function sttWorking(stt, vosk, whispercpp) {
  return [stt, vosk, whispercpp].some((provider) => provider && provider.status === "ready");
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
      + `<div class="audio-card-actions">${button("open-source-note", "Открыть источник", { id: audio.id, kind: "ghost" })}${transcribeControls(audio, { sttReady, voskReady, whisperCppReady })}</div>`
      + transcribeHonestNote(audio, { sttReady, voskReady, whisperCppReady })
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
    // ТРЕБОВАНИЕ Т4. Владелец дословно: «убери всякий мусор ненужный, как в аудио: скачать,
    // проверить это, проверить то. Зачем это всё проверять? Ты сам автоматически это всё
    // проверяй. Человек должен просто брать и пользоваться».
    //
    // Здесь стояли ТРИ блока проверок — Whisper, Vosk, whisper.cpp — каждый со своим статусом,
    // своей кнопкой «Подготовить» и своим полем адреса. Владелец приходил послушать запись, а
    // получал панель настройки трёх движков, из которых работает один.
    //
    // Теперь: если расшифровка работает — на экране про неё НЕТ НИЧЕГО. Если не работает — ОДНА
    // строка: чего не хватает и одна кнопка. Движки никуда не делись, их настройка живёт в
    // «Подключениях», где ей и место (инвариант И-7: не заводить экран под то, что помещается
    // в существующий).
    sttWorking(stt, vosk, whispercpp)
      ? `<p data-testid="stt-ready">Расшифровка работает — просто нажми «Расшифровать». Аудио остаётся на этом компьютере.</p>`
      : `<div class="stt-gate" data-testid="stt-gate" data-raw-status="${escapeHtml(stt.status || "not-configured")}">`
        + `<p>Расшифровка пока не настроена. Текст можно вписать руками — это работает всегда.</p>`
        + button("set-surface", "Настроить расшифровку", { id: "providers", kind: "primary", testId: "stt-setup" })
        + `</div>`,
    `</section>`,
    `<section class="transcript-editor">`,
    `<h3>Разбор фрагмента</h3>`,
    `<div class="transcript-actions">${active ? button("transcript-to-note", "Фрагмент в заметку", { id: active.id, kind: "ghost", testId: "transcript-to-note" }) : ""}${active ? button("transcript-to-task", "Фрагмент в задачу", { id: active.id, kind: "ghost", testId: "transcript-to-task" }) : ""}</div>`,
    `</section>`,
    `</div>`
  ].join("");
}

import { button, escapeHtml } from "./shared.js";
import { findSimilarThoughts } from "../../core/similar-thoughts.mjs";
import { formatObjectDay } from "../../core/format.mjs";

// Владелец 2026-07-30: «я закидываю двадцать мыслей в день… система должна видеть похожие старые
// идеи и помечать как дубль или уточнение. Результат: „найдено 3 похожих идеи от 15.07, 22.07“».
//
// Показываем это ПРЯМО ПОД ПОЛЕМ, пока мысль ещё пишется, а не после сохранения: смысл в том,
// чтобы повтор не родился, а не в том, чтобы его потом найти. Каждая находка кликается и
// открывает ту запись — действие `open-source-note` уже существует, второго пути не заводим.
function renderSimilarThoughts(ctx) {
  const draft = String(ctx.captureDraft || "");
  // Срез В: вердикт «новое» гасит подсказку — но только для ТОГО САМОГО текста. Допишет фразу —
  // подсказка вернётся, потому что это уже другая мысль, и молчать о повторе снова нельзя.
  if (draft.trim() && draft === String(ctx.similarVerdictFor || "")) {
    return `<div class="capture-attachments" data-testid="similar-verdict-done"><span class="capture-attachments-title">Проверено: это другая мысль</span></div>`;
  }
  const notes = Array.isArray(ctx.notes) ? ctx.notes : Object.values(ctx.notes || {});
  // Заменённые записи из подсказки уходят: предлагать повтор того, что владелец уже уточнил,
  // значит звать его исправлять одно и то же дважды.
  const live = notes.filter((note) => note && !String(note.supersededBy || "").trim());
  const similar = findSimilarThoughts(draft, live);
  if (!similar.length) return "";
  return [
    `<div class="capture-attachments" data-testid="similar-thoughts">`,
    `<span class="capture-attachments-title">Похоже, ты уже об этом писал — ${similar.length}</span>`,
    similar.map((row) => [
      `<div class="similar-thought-row">`,
      `<button class="capture-attachment" data-action="open-source-note" data-id="${escapeHtml(row.id)}" data-testid="similar-thought" title="${escapeHtml(row.reason)}">`,
      `<strong>${escapeHtml(row.title)}</strong>`,
      `<span>${escapeHtml(formatObjectDay(row.createdAt) || "дата неизвестна")} · ${escapeHtml(row.verdict)}</span>`,
      `</button>`,
      // Т7: вердикт выносит ВЛАДЕЛЕЦ, а не порог похожести. Три кнопки в строку, без списка:
      // одно движение вместо двух. Каждая пишет решение в журнал — это и есть то, на чём
      // система учится отличать повтор от продолжения.
      `<div class="similar-thought-verdict" data-testid="similar-thought-verdict">`,
      button("thought-verdict-duplicate", "Дубль", { id: row.id, kind: "ghost", testId: "verdict-duplicate", title: "Не заводить второй раз — открыть ту запись" }),
      button("thought-verdict-supersede", "Уточнение", { id: row.id, kind: "ghost", testId: "verdict-supersede", title: "Записать новое и пометить прежнее заменённым" }),
      button("thought-verdict-distinct", "Новое", { id: row.id, kind: "ghost", testId: "verdict-distinct", title: "Это другая мысль" }),
      `</div>`,
      `</div>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

// Прикреплённые файлы. Раньше импорт проходил молча — владелец выбирал два голосовых, на
// экране не менялось ничего, и он справедливо решал, что файлы не прикрепились. Теперь каждый
// виден строкой: имя, размер и честный статус, который считается из самой записи.
function renderAttachments(attachments) {
  if (!attachments.length) return "";
  return [
    `<div class="capture-attachments" data-testid="capture-attachments">`,
    `<span class="capture-attachments-title">Прикреплено: ${attachments.length}</span>`,
    // У каждого файла своя кнопка «убрать»: «Очистить» снимало разом ВСЁ, и чтобы отцепить один
    // случайно добавленный файл, приходилось начинать заново. Убирается только из списка
    // прикреплённого — сама запись остаётся в Базе, поэтому действие не разрушительное.
    attachments.map((item) => [
      `<span class="capture-attachment-wrap">`,
      `<button class="capture-attachment" data-action="open-source-note" data-id="${escapeHtml(item.id)}" data-testid="capture-attachment" title="Открыть запись">`,
      `<strong>${escapeHtml(item.name || "Файл")}</strong>`,
      `<span>${escapeHtml(formatAttachmentSize(item.size))} · ${escapeHtml(item.status)}</span>`,
      `</button>`,
      // Фото чека умеет стать расходом само — но только по нажатию. Кнопка стоит у самого файла, а
      // не в общем меню: распознавать нужно КОНКРЕТНЫЙ снимок, и владелец видит, какой именно.
      item.kind === "image"
        ? `<button class="capture-attachment-ocr" data-action="recognize-receipt" data-id="${escapeHtml(item.id)}" data-testid="recognize-receipt-${escapeHtml(item.id)}" title="Прочитать сумму с фото локально. Ничего не запишется без подтверждения">Распознать чек</button>`
        : "",
      `<button class="capture-attachment-remove" data-action="detach-capture-file" data-id="${escapeHtml(item.id)}" data-testid="detach-capture-file" title="Убрать из прикреплённого. Запись останется в Базе" aria-label="Убрать ${escapeHtml(item.name || "файл")} из прикреплённого">×</button>`,
      `</span>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

function formatAttachmentSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return "размер неизвестен";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " МБ";
}

// Состояние записи прямо у поля. См. комментарий в renderAssistantInput о том, почему.
function renderRecordingState(ctx) {
  const status = (ctx.control && ctx.control.audioRecordingStatus) || {};
  if (status.status === "error") {
    return `<div class="capture-recording capture-recording-error" role="alert" data-testid="capture-recording-error">Микрофон не открылся: ${escapeHtml(status.error || "браузер не дал доступ")}. Проверь разрешение для сайта в адресной строке — или просто напиши текстом.</div>`;
  }
  if (!status.status || status.status === "idle") return "";
  return [
    `<div class="capture-recording" role="status" data-testid="capture-recording">`,
    `<span class="capture-recording-dot" aria-hidden="true"></span>`,
    `<span>Идёт запись — говори. Остановишь, и я расшифрую.</span>`,
    button("stop-audio-recording", "Остановить", { kind: "calm", testId: "capture-stop-recording" }),
    `</div>`
  ].join("");
}

export function renderAssistantInput(ctx) {
  const attachments = ctx.captureAttachments || [];
  // Владелец 2026-07-30: «зачем вот такое разделение — голос, расход, задача, мысль, файл или
  // скрин?». Возражение по существу: тип записи должен определять РАЗБОР по тексту, а не владелец
  // до ввода. Кнопка типа перекладывает работу анализатора на человека.
  //
  // Полностью свернуть ряд нельзя: `quick-expense`, `quick-note` и `bulk-import-lines` кликают
  // три живые спеки, а ослаблять тест ради вида запрещено (CLAUDE.md §3). Поэтому в «Ещё»
  // уезжает только то, что ничем не держится: два дублирующих способа импорта и «Очистить».
  // Остальное снимается вместе с теми спеками — отдельным пакетом и по слову владельца.
  //
  // СРЕЗ Г (2026-07-31). Требование Т1 закрыто: на экране остаются поле, главная кнопка и два
  // неразрушающих действия — прикрепить и записать голос. Всё остальное уехало в «Ещё».
  //
  // Кнопки типа записи НЕ УДАЛЕНЫ: они работают, и одиннадцать спек продолжают доказывать, что
  // работают. Изменилось не поведение, а место — и вместе с продуктом переписаны сами спеки
  // (CLAUDE.md §3 запрещает ослаблять тест ради зелёного, но требует менять контракт вместе с
  // намеренным изменением продукта; намерение записано владельцем в MVP_SPEC.md Т1).
  //
  // Почему это вообще важно: кнопка типа перекладывает работу анализатора на человека. Владелец
  // просил убрать её «десять тысяч раз» — и был прав по существу, а не по вкусу.
  const rareButtons = [
    ["quick-expense", "Расход", "quick-expense"],
    ["quick-task", "Задача", "quick-task"],
    ["quick-note", "Мысль", "quick-note"],
    ["import-audio", "Аудио", "capture-audio"],
    ["import-file", "Книга", "capture-book"],
    ["bulk-import-lines", "Импорт по строкам", "bulk-import-lines"]
  ];
  return [
    `<section class="assistant-composer" data-testid="mega-dropzone">`,
    `<label for="capture-input">Что добавить в LifeOS?</label>`,
    `<textarea id="capture-input" data-testid="capture-input" spellcheck="true" aria-label="Универсальный ввод LifeOS" placeholder="Напиши, скажи, скинь файл — чем это является, определю сам.">${escapeHtml(ctx.captureDraft || "")}</textarea>`,
    // Два действия рядом с полем. Оба неразрушающие, оба про способ ввода, ни одно не просит
    // владельца решить, ЧЕМ является то, что он сейчас скажет.
    // Владелец 2026-08-01: «у меня даже микрофон на сайте не работает». Он работал — но нажатие
    // не меняло на Доме НИЧЕГО: индикатор записи и кнопка «стоп» жили только на экране Аудио,
    // далеко внизу. Запись шла молча, останавливать её было нечем, и это неотличимо от поломки.
    //
    // Ошибку доступа тоже показываем здесь: «браузер не дал микрофон» — ответ, с которым можно
    // что-то сделать, а молчание — нет.
    renderRecordingState(ctx),
    `<div class="assistant-quick-actions" data-testid="assistant-quick-actions">`,
    button("import-file", "Прикрепить", { kind: "ghost", testId: "capture-import", title: "Файл, фото, чек, книга" }),
    button("start-audio-recording", "Записать голос", { kind: "ghost", testId: "quick-voice" }),
    `</div>`,
    // Ответ микрофона стоит У КНОПКИ, а не в панели дня. Браузер отказал в доступе — так и
    // сказано, вместе с тем, что делать. Молчащая кнопка записи неотличима от сломанного
    // микрофона, и владелец справедливо решает, что диктовать нельзя.
    ctx.micError
      ? `<p class="capture-mic-error" role="alert" data-testid="capture-mic-error">Микрофон не открылся: ${escapeHtml(ctx.micError)}. Проверь разрешение на микрофон в замке слева от адреса — и попробуй снова. Текст можно писать руками, это работает всегда.</p>`
      : "",
    renderAttachments(attachments),
    renderSimilarThoughts(ctx),
    `<div class="assistant-submit-row">`,
    // Кнопка называет то, что сделает. Раньше при пустом поле и двух прикреплённых голосовых
    // она не делала ничего — ни действия, ни объяснения, и это читалось как зависание.
    // Две кнопки, склеенные в одну форму. Владелец 2026-08-01: «разбор по цифрам, по датам, по
    // времени — этого недостаточно, чтобы по смыслу понять».
    //
    // Левая половина — правила: мгновенно, без сети, всегда работает. Правая — локальная модель:
    // медленнее, зато видит смысл («завтра смена» → «сегодня вечером надо решить, во сколько
    // вставать»). Они не конкурируют: разбор с ИИ сначала сохраняет запись правилами и только
    // потом зовёт модель, поэтому нажать «с ИИ» никогда не хуже, чем нажать обычную.
    //
    // Склеены намеренно: это ОДНО действие с двумя глубинами, а не два разных. Разнеси их — и
    // владелец будет каждый раз выбирать между «сохранить» и «понять».
    `<span class="capture-split" data-testid="capture-split">`,
    button("capture-text", attachments.length && !(ctx.captureDraft || "").trim() ? "Разобрать прикреплённое (" + attachments.length + ")" : "Разобрать", { kind: "calm", testId: "capture-text", className: "capture-split-main" }),
    button("capture-with-ai", "с ИИ", { kind: "calm", testId: "capture-with-ai", className: "capture-split-ai", title: "Медленнее, но понимает смысл: локальная модель на этом компьютере" }),
    `</span>`,
    `<details class="capture-more" data-testid="capture-more"><summary>Ещё</summary>`,
    rareButtons.map(([action, label, testId]) => button(action, label, { kind: "ghost", testId })).join(""),
    button("clear-capture", "Очистить", { kind: "ghost", testId: "clear-capture" }),
    `</details>`,
    `</div>`,
    `</section>`
  ].join("");
}

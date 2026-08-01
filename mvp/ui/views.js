// Экраны. Только разметка — состояние не трогается, события не вешаются (их ловит один
// делегат в app.js). Каждый интерактивный элемент несёт data-testid.
import { escapeHtml, shorten, dayKey } from "../core/text.js";
import { GATE } from "../core/analyze.js";
import { adjusted, needsMore } from "../core/learn.js";

const pct = (value) => `${Math.round(value * 100)}%`;

export function renderCapture(state, similar) {
  return `
    <section class="card capture" data-testid="capture">
      <h2>Что у тебя в голове</h2>
      <textarea id="capture-input" data-testid="capture-input" rows="4"
        placeholder="Пиши как есть. Тип определится сам.">${escapeHtml(state.draft)}</textarea>
      ${similar.length ? `
        <div class="similar" data-testid="similar-before-save">
          <span class="muted">Похоже, уже было:</span>
          ${similar.map((row) => `
            <button class="chip" data-action="open-record" data-id="${escapeHtml(row.record.id)}" data-testid="similar-record">
              ${escapeHtml(dayKey(row.record.createdAt))} · ${escapeHtml(shorten(row.record.text, 40))}
            </button>`).join("")}
        </div>` : ""}
      <div class="row">
        <button class="primary" data-action="save-record" data-testid="save-record">Записать</button>
        <span class="muted" data-testid="draft-note">${state.draft ? "черновик сохраняется сам" : ""}</span>
      </div>
    </section>`;
}

// «Что я понял» — пофактово. У каждого вывода своя цитата, своя уверенность и СВОИ кнопки.
// Одна кнопка «принять всё» здесь запрещена: она и есть причина, по которой человек перестаёт
// понимать, что система поняла.
export function renderFacts(state) {
  const pending = Object.values(state.facts).filter((row) => row.status === "open");
  if (!pending.length) return "";
  const record = state.records[pending[0].recordId];
  return `
    <section class="card facts" data-testid="facts">
      <h2>Что я понял из записи</h2>
      ${record ? `<p class="muted source-line" data-testid="facts-source">«${escapeHtml(shorten(record.text, 120))}»</p>` : ""}
      ${pending.map((item) => renderFact(state, item)).join("")}
    </section>`;
}

function renderFact(state, item) {
  const conf = adjusted(state, item);
  const question = conf.value < GATE;
  const left = needsMore(state, item.type);
  return `
    <div class="fact ${question ? "fact-question" : ""}" data-testid="fact" data-type="${escapeHtml(item.type)}">
      <div class="fact-head">
        <span class="tag" data-testid="fact-type">${escapeHtml(item.type)}</span>
        <strong data-testid="fact-title">${escapeHtml(item.title)}</strong>
      </div>
      <div class="fact-why" data-testid="fact-quote">
        из фразы: «${escapeHtml(item.quote)}»
      </div>
      <div class="fact-meta">
        <span data-testid="fact-confidence">${question ? "не уверен" : "уверен"} · ${pct(conf.value)}</span>
        <span class="muted">${escapeHtml(item.why)}</span>
        ${conf.trusted ? `<span class="muted" data-testid="fact-learned">поправлено твоей историей (×${conf.weight})</span>`
          : `<span class="muted" data-testid="fact-needs">ещё ${left} ${left === 1 ? "правка" : "правок"} — и начну учитывать</span>`}
      </div>
      ${question
        ? `<p class="ask" data-testid="fact-ask">Тут я не уверен, поэтому спрашиваю, а не решаю за тебя.</p>`
        : ""}
      <div class="row">
        <button class="primary" data-action="fact-accept" data-id="${escapeHtml(item.id)}" data-testid="fact-accept">Верно</button>
        <button data-action="fact-edit" data-id="${escapeHtml(item.id)}" data-testid="fact-edit">Исправить</button>
        <button class="ghost" data-action="fact-reject" data-id="${escapeHtml(item.id)}" data-testid="fact-reject">Не то</button>
      </div>
    </div>`;
}

export function renderInsights(state, insights) {
  if (!insights.length) {
    return `
      <section class="card" data-testid="insights">
        <h2>Что я заметил</h2>
        <p class="muted" data-testid="insights-empty">Пока нечего заметить: выводы появляются, когда одна тема встречается в записях разных дней. Это честно — на одной записи закономерности нет.</p>
      </section>`;
  }
  return `
    <section class="card" data-testid="insights">
      <h2>Что я заметил</h2>
      ${insights.map((item) => `
        <div class="insight" data-testid="insight">
          <div class="fact-head">
            <span class="tag">${escapeHtml(item.kind)}</span>
            <strong data-testid="insight-title">${escapeHtml(item.title)}</strong>
          </div>
          <p class="muted">${escapeHtml(item.detail)}</p>
          <div class="sources" data-testid="insight-sources">
            <span class="muted">из записей:</span>
            ${item.refs.map((refId) => {
              const record = state.records[refId];
              return record ? `<button class="chip" data-action="open-record" data-id="${escapeHtml(refId)}" data-testid="insight-source">${escapeHtml(dayKey(record.createdAt))} · ${escapeHtml(shorten(record.text, 32))}</button>` : "";
            }).join("")}
          </div>
          <div class="fact-meta"><span data-testid="insight-confidence">уверенность ${pct(item.confidence)}</span></div>
          <div class="row">
            <button data-action="insight-to-task" data-id="${escapeHtml(item.id)}" data-testid="insight-to-task">Сделать задачей</button>
            <button class="ghost" data-action="insight-dismiss" data-id="${escapeHtml(item.id)}" data-testid="insight-dismiss">Не то</button>
          </div>
        </div>`).join("")}
    </section>`;
}

// «Чему научилась» — изменение, а не остаток. Пустые сутки говорятся прямо: нарисованная
// активность обесценивает экран сильнее, чем его отсутствие.
export function renderLearning(state, delta) {
  return `
    <section class="card" data-testid="learning">
      <h2>Чему я научился за сутки</h2>
      ${!delta.signals
        ? `<p class="muted" data-testid="learning-empty">Ты ничего не подтверждал и не отклонял — учиться было не на чем.</p>`
        : `
        <p data-testid="learning-signals">Твоих правок: ${delta.signals} — верно ${delta.accepted}, не то ${delta.rejected}.</p>
        ${delta.changes.length
          ? delta.changes.map((row) => `
              <div class="change" data-testid="learning-change">
                <strong>${escapeHtml(row.type)}</strong>
                <span data-testid="learning-change-value">${row.to > row.from ? "буду предлагать увереннее" : "буду осторожнее"} · ${row.from} → ${row.to}</span>
              </div>`).join("")
          : `<p class="muted" data-testid="learning-no-change">Правки записаны, но поведение пока не сдвинулось: их мало. Двигать по шуму — врать.</p>`}
        <details class="sources-block">
          <summary data-testid="learning-sources-toggle">Из чего это вышло</summary>
          ${delta.recent.map((row) => `
            <div class="muted" data-testid="learning-source">
              ${escapeHtml(row.kind === "rejected" || row.kind === "dismissedInsight" ? "не то" : "верно")} · ${escapeHtml(row.factType)}${row.quote ? ` · «${escapeHtml(shorten(row.quote, 40))}»` : ""}
            </div>`).join("")}
        </details>`}
    </section>`;
}

export function renderRecords(state) {
  const records = Object.values(state.records).filter((row) => !row.deleted)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 12);
  if (!records.length) return "";
  return `
    <section class="card" data-testid="records">
      <h2>Записи</h2>
      ${records.map((row) => `
        <div class="record" data-testid="record" id="rec-${escapeHtml(row.id)}">
          <span class="muted">${escapeHtml(dayKey(row.createdAt))}</span>
          <p>${escapeHtml(row.text)}</p>
        </div>`).join("")}
    </section>`;
}

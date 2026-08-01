import { button, escapeHtml } from "./shared.js";

// СРЕЗ Б · ПОСТРОЧНЫЙ РАЗБОР.
//
// Претензия владельца №8 дословно: «снизу „что я понял из этой записи" — просто пишет „источник
// сохранён, можно принять безопасные", и тупо кнопка „Принять"». Он прав дважды: выводы были
// склеены в один список строк без действий, а согласиться можно было только со всеми сразу.
//
// Здесь каждый вывод — отдельная строка со СВОЕЙ цитатой, СВОИМ доверием и СВОИМИ двумя
// кнопками. Это не украшение: пока согласие одно на всё, журнал решений получает один сигнал
// вместо семи, и учиться системе не на чем. Гранулярность разбора — это гранулярность обучения.
//
// «Принять всё» не удалено — оно уехало вниз и стало тихим. Владелец, который уже доверяет
// разбору, жмёт его одним движением; владелец, который проверяет, читает строки.

// Служебные шаги разбора решением владельца не являются и в очередь не попадают —
// список зеркалит MACHINERY_DRAFT_IDS в app.js. Импортировать оттуда нельзя: модули
// поверхностей не ссылаются обратно в ядро (audit-module-closure).
const MACHINERY_DRAFTS = new Set(["knowledge-summary", "control-graph", "automation-context"]);

// Человеческие имена типов. Владелец не обязан знать, что `finance_expense` — это расход.
const TYPE_WORDS = {
  task: "Дело",
  calendar: "Встреча",
  reminder: "Напоминание",
  plan: "План",
  shift: "Смена",
  finance_expense: "Расход",
  finance_income: "Доход",
  balance: "Баланс",
  knowledge: "Знание",
  note: "Мысль",
  insight: "Вывод",
  book: "Книга",
  mail: "Письмо",
  supersede: "Уточнение прежнего",
  agent: "Действие",
  parser: "Разбор файла",
  transcript: "Расшифровка"
};

const MAX_VISIBLE = 7;

function typeWord(type) {
  const key = String(type || "").trim();
  return TYPE_WORDS[key] || key || "Вывод";
}

// Одна строка разбора. Порядок сверху вниз — вывод, основание, доверие, действия: сначала ЧТО,
// потом ПОЧЕМУ, потом НАСКОЛЬКО, и только потом выбор. Обратный порядок заставляет решать до
// того, как прочитано основание.
function breakdownRow(proposal) {
  const trust = proposal.trust && proposal.trust.words ? proposal.trust : null;
  return [
    `<li class="parse-row" data-testid="parse-row" data-raw-type="${escapeHtml(proposal.type || "")}">`,
    `<div class="parse-row-head">`,
    `<span class="parse-row-type">${escapeHtml(typeWord(proposal.type))}</span>`,
    `<strong class="parse-row-title">${escapeHtml(proposal.title || "")}</strong>`,
    `</div>`,
    // Цитата — это и есть ответ на «почему ты так решил». Без неё строка снова становится
    // утверждением без основания, а Т5 требует источник у КАЖДОГО вывода.
    proposal.quote
      ? `<blockquote class="parse-row-quote" data-testid="parse-row-quote">${escapeHtml(proposal.quote)}</blockquote>`
      : `<span class="parse-row-noquote" data-testid="parse-row-noquote">точного места в записи не нашёл</span>`,
    trust
      ? `<span class="parse-row-trust" data-testid="parse-row-trust" data-raw-trusted="${trust.trusted ? "yes" : "no"}">${escapeHtml(trust.words)}</span>`
      : "",
    `<div class="parse-row-actions">`,
    button("apply-proposal", "Создать", { id: proposal.id, kind: "calm", testId: "parse-row-apply" }),
    button("dismiss-proposal", "Не то", { id: proposal.id, kind: "ghost", testId: "parse-row-dismiss" }),
    `</div>`,
    `</li>`
  ].join("");
}

// Отбор строк живёт в ОДНОМ месте: Дом спрашивает «есть ли разбор», чтобы не показывать рядом
// вторую карточку с одной кнопкой. Два независимых фильтра разъехались бы на первой же правке.
export function openBreakdownRows(ctx) {
  const source = ctx && ctx.latestSource;
  if (!source) return [];
  return (ctx.proposals || [])
    .filter((proposal) => proposal && proposal.status === "open")
    .filter((proposal) => proposal.sourceId === source.id)
    .filter((proposal) => !MACHINERY_DRAFTS.has(String(proposal.draftId || "")));
}

export function renderParseBreakdown(ctx) {
  const source = ctx.latestSource;
  const rows = openBreakdownRows(ctx);
  if (!rows.length) return "";
  const visible = rows.slice(0, MAX_VISIBLE);
  const hidden = rows.slice(MAX_VISIBLE);
  return [
    `<section class="parse-breakdown" data-testid="parse-breakdown">`,
    // Заголовок говорит от лица системы и называет число: владелец сразу видит объём, а не
    // прокручивает, чтобы узнать, сколько ещё осталось.
    `<h2 class="parse-breakdown-title">Я понял из этой записи — ${rows.length}</h2>`,
    `<ul class="parse-rows">`,
    visible.map(breakdownRow).join(""),
    `</ul>`,
    // Больше семи строк подряд не читают. Остальное честно свёрнуто, а не отрезано.
    hidden.length
      ? `<details class="parse-breakdown-more" data-testid="parse-breakdown-more"><summary>Ещё ${hidden.length}</summary><ul class="parse-rows">${hidden.map(breakdownRow).join("")}</ul></details>`
      : "",
    // Согласие на всё осталось возможным, но перестало быть главным: оно внизу и тихое.
    `<div class="parse-breakdown-bulk">`,
    button("apply-source-proposals", "Принять всё", { id: source.id, kind: "ghost", testId: "parse-apply-all" }),
    `</div>`,
    `</section>`
  ].join("");
}

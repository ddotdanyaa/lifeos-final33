import { button, escapeHtml, plural } from "./components/shared.js";

// Разбор дня (канон design-system/Universal Capture.dc.html): стадии с реальными счётчиками
// и «нужно уточнить». Всё считает app.js (runDayDigest/computeDayDigestView), здесь разметка.

function renderStages(digest) {
  if (!digest.stages.length) return "";
  return [
    `<ol class="digest-stages" data-testid="digest-stages">`,
    digest.stages.map((stage) => [
      `<li class="digest-stage" data-testid="digest-stage" data-stage="${escapeHtml(stage.id)}">`,
      `<span class="digest-stage-label">${escapeHtml(stage.label)}</span>`,
      // Счётчик стадии — то, что она реально сделала, а не проценты выдуманного прогресса.
      `<strong class="digest-stage-value" data-testid="digest-stage-value">${escapeHtml(stage.value)}</strong>`,
      `<em class="digest-stage-detail">${escapeHtml(stage.detail)}</em>`,
      `</li>`
    ].join("")).join(""),
    `</ol>`
  ].join("");
}

// Закон №6: то, в чём система не уверена, показывается ВОПРОСОМ с вариантами ответа,
// а не предложением с кнопкой «Принять».
function renderQuestions(digest) {
  if (!digest.questions.length) return "";
  return [
    `<section class="digest-asks" data-testid="digest-asks">`,
    `<p class="canon-eyebrow">Нужно уточнить <em>${digest.questions.length}</em></p>`,
    digest.questions.map((item) => [
      `<article class="digest-ask" data-testid="digest-ask" data-proposal="${escapeHtml(item.id)}">`,
      `<h4 data-testid="digest-ask-question">${escapeHtml(item.question)}</h4>`,
      `<p class="digest-ask-why" data-testid="digest-ask-why">${escapeHtml(item.why)}</p>`,
      item.quote ? `<blockquote class="digest-ask-quote" data-testid="digest-ask-quote">«${escapeHtml(item.quote)}»</blockquote>` : "",
      `<div class="digest-ask-options">`,
      item.options.map((option) => [
        `<button class="digest-ask-option" data-action="answer-digest-question" data-id="${escapeHtml(item.id + "::" + option.id)}" data-testid="digest-ask-option">`,
        `<strong>${escapeHtml(option.label)}</strong><em>${escapeHtml(option.hint)}</em>`,
        `</button>`
      ].join("")).join(""),
      `</div>`,
      `</article>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

// Канон (Universal Capture, блок «Противоречия»): расхождения, которые владелец сам не сводил,
// потому что они живут в РАЗНЫХ объектах. У каждого — числа и объект, в который можно провалиться.
function renderContradictions(ctx) {
  const rows = ctx.contradictions || [];
  if (!rows.length) return "";
  return [
    `<section class="contradictions" data-testid="contradictions">`,
    `<p class="canon-eyebrow">Противоречия <em>${rows.length}</em></p>`,
    `<p class="contradictions-note">То, что ты не видел сам: эти объекты заданы в разное время и между собой никогда не сверялись.</p>`,
    rows.map((row) => [
      `<article class="contradiction" data-testid="contradiction" data-contradiction="${escapeHtml(row.id)}">`,
      `<h4>${escapeHtml(row.title)}</h4>`,
      `<p data-testid="contradiction-summary">${escapeHtml(row.summary)}</p>`,
      `<div class="contradiction-foot">`,
      `<em data-testid="contradiction-evidence">${escapeHtml(row.evidence)}</em>`,
      button("open-object", "Открыть объект", { id: row.objectId, kind: "ghost", testId: "contradiction-open" }),
      `</div>`,
      `</article>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

// Канон (Universal Capture, блок «Инсайты»): паттерн — это СРАВНЕНИЕ двух выборок по своим же
// данным, а не мотивационная фраза. Поэтому рядом с выводом всегда стоит размер выборки.
function renderBehaviorPatterns(ctx) {
  const rows = ctx.behaviorPatterns || [];
  if (!rows.length) return "";
  return [
    `<section class="behavior-patterns" data-testid="behavior-patterns">`,
    `<p class="canon-eyebrow">Паттерны <em>${rows.length}</em></p>`,
    rows.map((row) => [
      `<article class="behavior-pattern" data-testid="behavior-pattern" data-pattern="${escapeHtml(row.id)}">`,
      `<h4>${escapeHtml(row.title)}</h4>`,
      `<p data-testid="behavior-pattern-detail">${escapeHtml(row.detail)}</p>`,
      // Размер выборки — обязательная часть вывода: без него это гадание.
      `<em data-testid="behavior-pattern-evidence">${escapeHtml(row.evidence)}</em>`,
      row.objectId ? button("open-object", "Открыть объект", { id: row.objectId, kind: "ghost", testId: "behavior-pattern-open" }) : "",
      `</article>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

// СЦЕНАРИЙ 8 · НЕЗАКРЫТЫЕ ПЕТЛИ. Вечерний итог рассказывал о дне и ничего с ним не делал:
// открытые задачи оставались висеть, и завтрашнее утро начиналось с нуля. Здесь появляется
// единственное движение, ради которого итог вообще нужен — «перенести на завтра».
//
// Список короткий намеренно: семь строк максимум. Двадцать незакрытых петель вечером усталый
// человек не разбирает — он закрывает вкладку.
function renderOpenLoops(digest) {
  const loops = digest.openLoops || [];
  if (!loops.length) return "";
  const overdue = loops.filter((row) => row.overdue).length;
  return [
    `<div class="digest-loops" data-testid="digest-open-loops">`,
    `<h3>Осталось незакрытым — ${loops.length}${overdue ? ` · просрочено ${overdue}` : ""}</h3>`,
    `<ul>`,
    loops.map((row) => [
      `<li data-testid="digest-loop">`,
      // Закрыть петлю можно прямо отсюда — это и есть самый частый исход разбора вечером:
      // «а это я уже сделал». Действие `toggle-task` уже существует, второго пути не заводим.
      `<button class="digest-loop-row" data-action="toggle-task" data-id="${escapeHtml(row.id)}" data-testid="digest-loop-done" title="Отметить сделанным">${escapeHtml(row.title)}</button>`,
      row.overdue ? `<span class="digest-loop-overdue">ещё с ${escapeHtml(row.day)}</span>` : "",
      `</li>`
    ].join("")).join(""),
    `</ul>`,
    button("carry-loops-tomorrow", "Перенести всё на завтра", { kind: "calm", testId: "carry-loops-tomorrow" }),
    `</div>`
  ].join("");
}

// САМООБУЧЕНИЕ ПРОДУКТА. Владелец 2026-08-01: «если сделать самообучающийся сценарий, то всё
// остальное будет улучшаться после каждого дня моих голосовых».
//
// Здесь видно то, что он сказал ПРО САМУ СИСТЕМУ — его же словами, с датой. И одна кнопка,
// которая превращает неделю голосовых в список работы с цитатами.
//
// Система по этим записям себя НЕ чинит и не притворяется, что может: код пишет человек.
// Ценность в том, что теперь замечания не тонут среди мыслей про такси и деньги.
function renderProductFeedback(ctx) {
  const rows = ctx.productFeedback || [];
  if (!rows.length) return "";
  const shown = rows.slice(0, 5);
  return [
    `<div class="digest-feedback" data-testid="digest-product-feedback">`,
    `<h3>Что ты сказал про саму систему — ${rows.length}</h3>`,
    `<ul>`,
    shown.map((row) => [
      `<li data-testid="product-feedback-row">`,
      `<strong>${escapeHtml(row.title)}</strong>`,
      `<span>${escapeHtml(row.kind || "")} · ${escapeHtml(String(row.createdAt || "").slice(0, 10))}</span>`,
      `</li>`
    ].join("")).join(""),
    `</ul>`,
    rows.length > shown.length ? `<span class="digest-feedback-more">и ещё ${rows.length - shown.length}</span>` : "",
    button("export-product-feedback", "Выгрузить, что доработать", { kind: "calm", testId: "export-product-feedback" }),
    `</div>`
  ].join("");
}

export function renderDayDigest(ctx) {
  const digest = ctx.dayDigest || { stages: [], questions: [], hasReport: false, sourceCount: 0, hint: "" };
  const runLabel = digest.hasReport ? "Разобрать заново" : "Разобрать день";
  return [
    `<section class="day-digest" data-testid="day-digest">`,
    `<div class="digest-head">`,
    `<p class="canon-eyebrow">Разбор дня</p>`,
    button("run-day-digest", runLabel, { kind: "primary", testId: "run-day-digest", disabled: !digest.sourceCount }),
    `</div>`,
    `<p class="digest-hint" data-testid="digest-hint">${escapeHtml(digest.hint)}</p>`,
    digest.hasReport
      ? `<p class="digest-ran" data-testid="digest-ran">Разобрано ${escapeHtml(digest.ranAt)} · ${digest.readyCount} ${plural(digest.readyCount, "предложение ждёт", "предложения ждут", "предложений ждут")} решения на Доме${digest.questions.length ? ` · ${digest.questions.length} ${plural(digest.questions.length, "вопрос", "вопроса", "вопросов")} ниже` : ""}</p>`
      : "",
    renderProductFeedback(ctx),
    renderOpenLoops(digest),
    renderStages(digest),
    renderContradictions(ctx),
    renderBehaviorPatterns(ctx),
    renderQuestions(digest),
    `</section>`
  ].join("");
}

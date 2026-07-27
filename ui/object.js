import { button, escapeHtml, safeList } from "./components/shared.js";

// Объект (канон design-system/Artifact Inspector.dc.html): экран, в который «проваливается»
// любая карточка. Ничего своего не считает — всё приходит проекцией ctx.objectInspector из
// app.js (computeObjectInspector), здесь только разметка.

function renderScale(scale) {
  if (!scale) return "";
  return [
    `<div class="object-scale" data-testid="object-scale">`,
    `<div class="object-scale-head"><span>${escapeHtml(scale.needLabel)}</span><em data-testid="object-scale-gap">${escapeHtml(scale.gapLabel)}</em></div>`,
    `<div class="object-scale-bar"><i style="width:${scale.havePercent}%"></i></div>`,
    `<div class="object-scale-foot"><span>${escapeHtml(scale.haveLabel)}</span><span>${escapeHtml(scale.needLabel)}</span></div>`,
    `</div>`
  ].join("");
}

function renderFacts(facts) {
  if (!facts.length) return "";
  return [
    `<div class="object-facts" data-testid="object-facts">`,
    facts.map((fact) => [
      `<div class="object-fact" data-testid="object-fact">`,
      `<strong>${escapeHtml(fact.value)}</strong>`,
      `<span>${escapeHtml(fact.label)}</span>`,
      // Закон №5: у каждого числа виден источник, откуда оно взято.
      `<em data-testid="object-fact-source">${escapeHtml(fact.source)}</em>`,
      `</div>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

function renderTabs(tabs) {
  return [
    `<nav class="object-tabs" data-testid="object-tabs">`,
    tabs.map((tab) => [
      `<button class="object-tab${tab.active ? " active" : ""}" data-action="set-object-tab" data-id="${escapeHtml(tab.id)}" data-testid="object-tab-${escapeHtml(tab.id)}">`,
      escapeHtml(tab.label),
      tab.count ? `<span class="object-tab-count">${tab.count}</span>` : "",
      `</button>`
    ].join("")).join(""),
    `</nav>`
  ].join("");
}

// P0-1: разрешение личности показано в карточке самого человека и отсюда же отменяется.
// Сведение «Дмитрий»/«Дмитрию» — правило языка, и на «Дана»/«Даня» оно ошибается: основа у них
// общая, а люди разные. Раньше это молча решала система, теперь последнее слово за владельцем.
function renderPeopleReview(review) {
  if (!review) return "";
  const forms = review.forms || [];
  return [
    `<div class="object-people" data-testid="object-people">`,
    `<p class="canon-eyebrow">Кто это${review.split ? " · закреплено отдельно" : ""}</p>`,
    `<p class="object-people-rule" data-testid="object-people-rule">${escapeHtml(review.rule)}</p>`,
    // Позиция человека и её условие — то, что владелец о нём знает. Клик ведёт в само
    // утверждение, чтобы было видно, из какой записи это взято.
    (review.stances || []).map((row) => [
      `<button class="object-people-line object-people-stance" data-action="open-object" data-id="${escapeHtml(row.id)}" data-testid="object-people-stance">`,
      `<span>${escapeHtml(row.stance)}${row.condition ? ` — при условии: <strong>${escapeHtml(row.condition)}</strong>` : ""}</span>`,
      `<em>${escapeHtml(row.at)} · «${escapeHtml(row.quote)}»</em>`,
      `</button>`
    ].join("")).join(""),
    forms.length ? [
      `<div class="object-people-forms" data-testid="object-people-forms">`,
      forms.map((row) => [
        `<span class="object-people-form" data-testid="object-people-form">`,
        `<em>${escapeHtml(row.form)}</em>`,
        // Отделять есть смысл только когда написаний больше одного.
        review.splittable
          ? button("split-person-form", "Это другой человек", { id: row.form, kind: "ghost", testId: "object-people-split" })
          : "",
        `</span>`
      ].join("")).join(""),
      `</div>`
    ].join("") : "",
    review.split
      ? `<div class="object-people-line" data-testid="object-people-split-note"><span>Написание закреплено отдельно от общей основы имени.</span>${button("unsplit-person-form", "Вернуть сведение", { id: forms.length ? forms[0].form : "", kind: "ghost", testId: "object-people-unsplit" })}</div>`
      : "",
    (review.merged || []).map((row) => [
      `<div class="object-people-line" data-testid="object-people-merged">`,
      `<span>«${escapeHtml(row.form)}» объединён с этим человеком вручную.</span>`,
      button("unmerge-person", "Разъединить", { id: row.form, kind: "ghost", testId: "object-people-unmerge" }),
      `</div>`
    ].join("")).join(""),
    (review.candidates || []).map((row) => [
      `<div class="object-people-line" data-testid="object-people-candidate">`,
      // Закон №5: рядом с предложением видно, на чём оно держится, а не только «уверенность».
      `<span>«${escapeHtml(row.alias)}» и «${escapeHtml(row.target)}» — один человек? <em>${escapeHtml(row.why)} · уверенность ${escapeHtml(row.confidence)}</em></span>`,
      button("merge-person", "Объединить", { id: row.pairId, kind: "primary", testId: "object-people-merge" }),
      button("dismiss-person-merge", "Нет", { id: row.pairId, kind: "ghost", testId: "object-people-merge-dismiss" }),
      `</div>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

// Похожие записи. Название честное: это сходство ТЕКСТА, а не смысла — модели эмбеддингов в
// продукте нет, и выдавать одно за другое нельзя. Подпись говорит это прямо, чтобы владелец знал
// цену находке, а у каждой строки видно, за что она сюда попала.
function renderSimilar(similar) {
  if (!similar || !similar.length) return "";
  return [
    `<div class="object-similar" data-testid="object-similar">`,
    `<p class="canon-eyebrow">Похожее по тексту</p>`,
    `<p class="object-similar-note" data-testid="object-similar-note">Совпадение слов и их форм, а не смысла: модели смысла в системе нет, поэтому обещать её нельзя.</p>`,
    similar.map((row) => [
      `<button class="object-similar-row" data-action="open-object" data-id="${escapeHtml(row.id)}" data-testid="object-similar-row">`,
      `<span class="object-similar-body"><strong>${escapeHtml(row.title)}</strong><em data-testid="object-similar-why">${escapeHtml(row.why)}</em></span>`,
      `<span class="object-similar-score" data-testid="object-similar-score">${row.percent}%</span>`,
      `</button>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

// Первый исходник объекта — на самой первой вкладке. Владелец проваливается в объект своей
// голосовой и должен увидеть ЕЁ, а не оглавление из пяти вкладок: плеер и расшифровка стоят
// выше рассуждений системы о записи.
function firstSourceBody(inspector) {
  for (const group of inspector.sourceGroups || []) {
    for (const item of group.items || []) {
      const body = renderSourceBody(item);
      if (body) return body;
    }
  }
  return "";
}

function renderEssence(inspector) {
  return [
    `<div class="object-panel" data-testid="object-panel-sut">`,
    firstSourceBody(inspector),
    renderPeopleReview(inspector.peopleReview),
    `<p class="object-next" data-testid="object-next">${escapeHtml(inspector.next.text)}</p>`,
    `<p class="object-next-why" data-testid="object-next-why">${escapeHtml(inspector.next.why)}</p>`,
    inspector.next.tab ? button("set-object-tab", "Посмотреть варианты", { id: inspector.next.tab, kind: "primary", testId: "object-next-open" }) : "",
    `<div class="object-knows" data-testid="object-knows">`,
    safeList(inspector.knows, (row) => [
      `<div class="object-know" data-testid="object-know">`,
      `<strong>${escapeHtml(row.title)}</strong>`,
      `<span>${escapeHtml(row.detail)}</span>`,
      `<em data-testid="object-know-confidence">уверенность ${escapeHtml(row.confidence)}</em>`,
      `</div>`
    ].join(""), ""),
    `</div>`,
    renderSimilar(inspector.similar),
    `</div>`
  ].join("");
}

// Сам исходник внутри карточки объекта: аудио играет, расшифровка читается. Раньше здесь была
// только строка «заголовок · что дал · дата», и владелец, провалившись в объект своей голосовой,
// не находил ни файла, ни текста — карточка рассказывала ОБ объекте вместо того, чтобы его
// показать. Адрес блоба подставляется после отрисовки, как и в плеере на экране «Аудио».
function renderSourceBody(item) {
  const parts = [];
  if (item.media && item.media.mediaKind === "audio") {
    parts.push(`<audio controls${item.media.dataUrl ? ` src="${escapeHtml(item.media.dataUrl)}"` : ""} data-testid="object-source-audio" data-source-id="${escapeHtml(item.media.id)}"></audio>`);
  }
  if (item.media && item.media.mediaKind === "image" && item.media.dataUrl) {
    parts.push(`<img src="${escapeHtml(item.media.dataUrl)}" alt="${escapeHtml(item.title)}" data-testid="object-source-image">`);
  }
  if (item.transcript) {
    parts.push(`<p class="object-source-transcript" data-testid="object-source-transcript">${escapeHtml(item.transcript)}</p>`);
  } else if (item.media && item.media.mediaKind === "audio") {
    parts.push(`<p class="empty-inline" data-testid="object-source-transcript-empty">Расшифровки пока нет — её можно получить на экране «Аудио».</p>`);
  }
  if (!parts.length) return "";
  return `<div class="object-source-preview" data-testid="object-source-preview">${parts.join("")}</div>`;
}

function renderSources(inspector) {
  if (!inspector.sourceGroups.length) {
    return `<div class="object-panel" data-testid="object-panel-src"><p class="empty-inline" data-testid="object-sources-empty">У объекта нет входящих захватов: он либо заведён вручную, либо его источники ещё не связаны. Это не ошибка — просто пока нечего показать.</p></div>`;
  }
  return [
    `<div class="object-panel" data-testid="object-panel-src">`,
    inspector.sourceGroups.map((group) => [
      `<div class="object-source-group" data-testid="object-source-group">`,
      `<p class="canon-eyebrow">${escapeHtml(group.label)} <em>${group.items.length}</em></p>`,
      group.items.map((item) => [
        `<button class="object-source-row" data-action="open-object" data-id="${escapeHtml(item.id)}" data-testid="object-source-row">`,
        `<span class="object-source-kind">${escapeHtml(item.kindLabel)}</span>`,
        `<span class="object-source-body"><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml(item.gave)}</em></span>`,
        `<span class="object-source-date">${escapeHtml(item.date)}</span>`,
        `</button>`,
        renderSourceBody(item)
      ].join("")).join(""),
      `</div>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

function renderRelations(inspector) {
  if (!inspector.relations.length) {
    return `<div class="object-panel" data-testid="object-panel-rel"><p class="empty-inline" data-testid="object-relations-empty">Связей пока нет. Они появятся сами, когда объект встретится в других записях — руками связывать не нужно.</p></div>`;
  }
  return [
    `<div class="object-panel" data-testid="object-panel-rel">`,
    inspector.relations.map((relation) => [
      `<button class="object-relation tone-${escapeHtml(relation.tone)}" data-action="open-object" data-id="${escapeHtml(relation.id)}" data-testid="object-relation">`,
      `<span class="object-relation-type" data-testid="object-relation-type">${escapeHtml(relation.type)}</span>`,
      `<span class="object-relation-body">`,
      `<strong>${escapeHtml(relation.kindLabel)} · ${escapeHtml(relation.title)}</strong>`,
      // Закон №8: тип, сила, объяснение и время появления — всё видно у самой связи.
      `<em data-testid="object-relation-why">${escapeHtml(relation.why)}${relation.since ? " · с " + escapeHtml(relation.since) : ""}</em>`,
      `</span>`,
      `<span class="object-relation-strength" data-testid="object-relation-strength">${relation.strength}%</span>`,
      `</button>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

// P1-2 (донор Graphiti): история значений поля. Факт не стирается — у него закрывается окно
// валидности, поэтому видно, что было верно раньше и почему изменилось.
function renderHistory(inspector) {
  const history = inspector.history || [];
  if (!history.length) return "";
  return [
    `<div class="object-history" data-testid="object-history">`,
    `<p class="canon-eyebrow">Что менялось</p>`,
    history.map((row) => [
      `<div class="object-history-row" data-testid="object-history-row">`,
      `<time>${escapeHtml(row.at)}</time>`,
      `<span><strong>${escapeHtml(row.label)}</strong>: ${escapeHtml(row.from)} → ${escapeHtml(row.to)}${row.reason ? " · " + escapeHtml(row.reason) : ""}</span>`,
      `</div>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

function renderTimeline(inspector) {
  if (!inspector.months.length) {
    return `<div class="object-panel" data-testid="object-panel-time"><p class="empty-inline" data-testid="object-timeline-empty">Хронологии пока нет: у объекта одна дата и ни одного связанного события.</p></div>`;
  }
  return [
    `<div class="object-panel" data-testid="object-panel-time">`,
    `<p class="object-timeline-legend" data-testid="object-timeline-legend">Разговоры против действий по месяцам. Слева — сколько раз тема упоминалась, справа — сколько раз что-то реально произошло.</p>`,
    `<div class="object-months">`,
    inspector.months.map((month) => [
      `<div class="object-month" data-testid="object-month">`,
      `<span class="object-month-name">${escapeHtml(month.label)}</span>`,
      `<span class="object-month-bars">`,
      `<i class="object-bar-talk" style="width:${month.talkPercent}%"></i>`,
      `<i class="object-bar-act" style="width:${month.actPercent}%"></i>`,
      `</span>`,
      `<span class="object-month-counts" data-testid="object-month-counts">${escapeHtml(month.counts)}</span>`,
      `</div>`
    ].join("")).join(""),
    `</div>`,
    renderHistory(inspector),
    `</div>`
  ].join("");
}

function renderConflicts(inspector) {
  if (!inspector.conflicts.length) {
    return `<div class="object-panel" data-testid="object-panel-conf"><p class="empty-inline" data-testid="object-conflicts-empty">Противоречий нет: срок, сумма и задачи объекта сходятся между собой.</p></div>`;
  }
  return [
    `<div class="object-panel" data-testid="object-panel-conf">`,
    inspector.conflicts.map((conflict) => [
      `<section class="object-conflict" data-testid="object-conflict" data-conflict="${escapeHtml(conflict.id)}">`,
      `<h3>${escapeHtml(conflict.title)}</h3>`,
      `<p>${escapeHtml(conflict.summary)}</p>`,
      // Закон №6: при низкой уверенности объект задаёт вопрос и честно говорит, чего не хватает,
      // вместо меню вариантов из выдуманных чисел.
      conflict.question
        ? `<div class="object-conflict-ask" data-testid="object-conflict-ask">${conflict.action ? button("set-surface", conflict.action.label, { id: conflict.action.surface, kind: "ghost", testId: "object-conflict-ask-action" }) : ""}</div>`
        : "",
      `<div class="object-fixes">`,
      conflict.options.map((option) => [
        `<button class="object-fix tone-${escapeHtml(option.tone)}${option.chosen ? " chosen" : ""}" data-action="resolve-object-conflict" data-id="${escapeHtml(conflict.id + "::" + option.id)}" data-testid="object-fix">`,
        `<span class="object-fix-dot" aria-hidden="true"></span>`,
        `<span class="object-fix-body">`,
        `<strong>${escapeHtml(option.title)}</strong>`,
        `<em>${escapeHtml(option.summary)}</em>`,
        // Цена варианта считается из тех же чисел, что и само противоречие — не «на глаз».
        `<span class="object-fix-cost" data-testid="object-fix-cost">${escapeHtml(option.cost)}</span>`,
        `</span>`,
        `</button>`
      ].join("")).join(""),
      `</div>`,
      `</section>`
    ].join("")).join(""),
    `</div>`
  ].join("");
}

// Принятое решение живёт НАД вкладками, а не внутри «Противоречий»: применённый вариант
// закрывает противоречие, и если бы строка жила в той вкладке — откат стал бы недоступен.
function renderDecision(decision) {
  if (!decision) return "";
  return [
    `<div class="object-decision" data-testid="object-decision">`,
    `<span>Выбрано: «${escapeHtml(decision.title)}» · ${escapeHtml(decision.at)} · записано чеком в Контроле</span>`,
    decision.revertible ? button("revert-object-decision", "Вернуть как было", { kind: "ghost", testId: "object-decision-revert" }) : "",
    `</div>`
  ].join("");
}

const OBJECT_PANELS = {
  sut: renderEssence,
  src: renderSources,
  rel: renderRelations,
  time: renderTimeline,
  conf: renderConflicts
};

export function renderObject(ctx) {
  const inspector = ctx.objectInspector || { hasObject: false, emptyHint: "" };
  if (!inspector.hasObject) {
    return [
      `<section class="object-screen object-screen-empty" data-testid="workspace-object">`,
      `<p class="canon-eyebrow">Объект</p>`,
      `<h1 data-testid="object-title">Ничего не выбрано</h1>`,
      `<p class="object-verdict" data-testid="object-empty">${escapeHtml(inspector.emptyHint)}</p>`,
      `<div class="object-back">${button("set-surface", "В Базу", { id: "library", kind: "ghost", testId: "object-back-library" })}${button("set-surface", "В Граф", { id: "graph", kind: "ghost", testId: "object-back-graph" })}</div>`,
      `</section>`
    ].join("");
  }
  const panel = (OBJECT_PANELS[inspector.tab] || renderEssence)(inspector);
  return [
    `<section class="object-screen" data-testid="workspace-object" data-object-id="${escapeHtml(inspector.id)}">`,
    `<div class="object-back">${button("close-object", "Назад", { kind: "ghost", testId: "object-back" })}</div>`,
    `<p class="canon-eyebrow" data-testid="object-kind">${escapeHtml(inspector.kindLabel)} · ${escapeHtml(inspector.origin)}</p>`,
    `<h1 data-testid="object-title">${escapeHtml(inspector.title)}</h1>`,
    // Вердикт — одно предложение о состоянии объекта, а не пересказ его полей.
    `<p class="object-verdict" data-testid="object-verdict">${escapeHtml(inspector.verdict)}</p>`,
    renderScale(inspector.scale),
    renderFacts(inspector.facts),
    renderDecision(inspector.decision),
    renderTabs(inspector.tabs),
    panel,
    `</section>`
  ].join("");
}

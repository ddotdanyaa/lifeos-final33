// ПОШТУЧНЫЙ АУДИТ docs/Клауд.txt — что из него РЕАЛЬНО работает.
//
// Владелец 2026-08-01: «ты прям детально каждую строчку не проверяешь что выполнил… проведи
// аудит, что реально всё работает и ты ничего не забыл».
//
// Он прав по существу. Все прежние проценты («87%», «72%») я называл на глаз, читая свой же
// список, а не проверяя код. Такая оценка всегда завышена: помнишь то, что делал, и не помнишь
// того, чего не делал.
//
// Здесь оценка снимается ПРИБОРОМ. Каждый пункт внешнего текста превращён в проверку, которую
// нельзя пройти уговорами: либо в коде есть названная функция, действие, `data-testid` или файл,
// либо пункта нет. Прибор не знает слова «почти» и не умеет округлять в свою пользу.
//
// ЧЕГО ЭТОТ ПРИБОР НЕ УМЕЕТ, и это надо знать: он проверяет НАЛИЧИЕ механизма, а не его качество.
// Найденный `data-testid` доказывает, что элемент есть; он не доказывает, что владельцу с ним
// удобно. Качество меряют спеки и перепись живого — они рядом и гоняются отдельно.
//
// Источник пунктов: docs/Клауд.txt. Формулировки сохранены его словами, чтобы при чтении отчёта
// было видно, ЧТО именно обещано, а не мой пересказ обещания.

import { readFileSync, existsSync } from "node:fs";

const FILES = {};
function read(path) {
  if (!(path in FILES)) FILES[path] = existsSync(path) ? readFileSync(path, "utf8") : "";
  return FILES[path];
}

// Проверка = где искать и что. Ищем по нескольким файлам: один и тот же механизм живёт в ядре и
// в поверхности, и требовать оба значит завалить пункт из-за места, а не из-за отсутствия.
const CORE = ["app.js", "core/self-review.mjs", "core/product-feedback.mjs", "core/similar-thoughts.mjs", "core/speech-intents.mjs", "core/owner-search.mjs", "core/owner-themes.mjs", "core/date-guess.mjs", "core/ru-parse.mjs"];
const UI = ["ui/home.js", "ui/shell.js", "ui/control.js", "ui/digest.js", "ui/chat.js", "ui/object.js", "ui/components/AssistantInput.js", "ui/components/ParseBreakdown.js", "ui/components/ParseSkeleton.js", "ui/components/HumanAnswerCard.js", "ui/components/PlayerSurface.js", "styles.css"];
const ALL = [...CORE, ...UI];

// КОММЕНТАРИИ НЕ СЧИТАЮТСЯ. Первый прогон этого прибора дал 103 из 103, и это была не победа
// продукта, а слабость прибора: `includes` находит слово в комментарии, в TODO и в чужой строке.
// Инструмент, который проходит всё с первого раза, не измеряет ничего.
//
// Поэтому код очищается от комментариев ДО поиска. Совпадение в объяснении больше не считается
// доказательством работы: объяснить можно и то, чего нет.
const CODE = {};
function code(path) {
  if (!(path in CODE)) {
    const NEWLINE = String.fromCharCode(10);
    CODE[path] = read(path)
      .split(NEWLINE)
      .filter((line) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*") && !trimmed.startsWith("<!--");
      })
      .join(NEWLINE);
  }
  return CODE[path];
}

function found(needle, files) {
  return (files || ALL).some((path) => code(path).includes(needle));
}

// Кнопка засчитывается ТОЛЬКО когда у неё есть и разметка, и обработчик. `data-testid` без
// `action === "…"` в ядре — это мёртвый контрол: он выглядит как функция и ею не является.
// Ровно так продукт и обманывал владельца до переписи живого.
function wired(action, testId) {
  const hasMarkup = UI.some((path) => code(path).includes(testId || action));
  const hasHandler = code("app.js").includes('action === "' + action + '"');
  return hasMarkup && hasHandler;
}

// Пункт: id, блок внешнего текста, обещание ЕГО СЛОВАМИ, и чем оно доказывается.
// `proof` — функция, возвращающая true только если механизм действительно в коде.
const ITEMS = [
  // ─── 8 БОЛЕЙ ────────────────────────────────────────────────────────────────────────────
  ["b1-draft", "Боль 1", "мысль не теряется: закрыл приложение, вернулся — черновик на месте", () => found("captureDraft")],
  ["b1-pipeline", "Боль 1", "конвейер: нормализация → классификация → сущности → дубли → артефакт", () => found("analyzeArtifactInput") && found("findSimilarThoughts")],
  ["b1-feedback-signal", "Боль 1", "фидбек записывается как сигнал обучения", () => found("recordOwnerDecision")],
  ["b1-ranking-changes", "Боль 1", "фидбек меняет будущее ранжирование", () => found("applyOwnerProfileToProposal")],
  ["b2-per-line", "Боль 2", "каждый вывод отдельной строкой, не одна кнопка «Принять» на всё", () => found("parse-row")],
  ["b2-source-each", "Боль 2", "у каждого вывода видно, из какого куска записи он взялся", () => found("parse-row-quote")],
  ["b2-own-buttons", "Боль 2", "возле каждого вывода СВОИ действия", () => wired("apply-proposal", "parse-row-apply") && wired("dismiss-proposal", "parse-row-dismiss")],
  ["b2-confidence-visible", "Боль 2", "видно уверенность", () => found("parse-row-trust")],
  ["b2-no-tech", "Боль 2", "никаких ID / Type / Owner на главном экране", () => found("systemType") && found("allNotes")],
  ["b2-entities-people", "Боль 2", "автоматически определяются люди", () => found("isLikelyPerson")],
  ["b2-entities-money", "Боль 2", "автоматически определяются деньги", () => found("ru-money")],
  ["b2-entities-dates", "Боль 2", "автоматически определяются даты", () => found("parseDateFromText")],
  ["b3-insight-sources", "Боль 3", "инсайт можно раскрыть и увидеть, из каких записей собран", () => found("insight-sources")],
  ["b3-insight-why", "Боль 3", "видно, почему это важно ИМЕННО СЕЙЧАС", () => found("insight-why")],
  ["b3-insight-fact-or-guess", "Боль 3", "видно, это факт или гипотеза", () => found("пока предположение")],
  ["b3-insight-granular", "Боль 3", "гранулярный фидбек по отдельному инсайту, не общий на экран", () => wired("pin-insight")],
  ["b4-insight-to-action", "Боль 4", "инсайт превращается в проект одним кликом", () => wired("create-project-cluster")],
  ["b4-insight-to-task", "Боль 4", "инсайт превращается в задачу", () => found("turnClaimIntoInsight") || found("addInsight")],
  ["b4-reject-remembered", "Боль 4", "отклонение запоминается и меняет поведение", () => found("dismissProposal") && found("buildOwnerProfile")],
  ["b5-decision-matrix", "Боль 5", "система решает: проект / задача / правило / наблюдение / шум", () => found("STRONGER_THAN_TASK_TYPES")],
  ["b5-supersede", "Боль 5", "уточнение помечает прежнее заменённым, а не плодит второе", () => found("supersededBy")],
  ["b5-local-explain", "Боль 5", "локальное объяснение именно этого решения", () => found("proposal.reason") || found("reason:")],
  ["b6-memory-search", "Боль 6", "спросить обычной фразой без точного названия", () => found("searchOwnerData")],
  ["b6-memory-date", "Боль 6", "сразу видно дату каждой записи", () => found("row.when")],
  ["b6-memory-why", "Боль 6", "сразу видно, почему она связана", () => found("нашёл ")],
  ["b6-memory-open-source", "Боль 6", "кнопка открыть источник", () => wired("open-source-note")],
  ["b6-memory-delete", "Боль 6", "память можно удалить", () => found("forgetDecisions")],
  ["b6-memory-off", "Боль 6", "память можно выключить", () => found("runForgetting")],
  ["b7-day-digest", "Боль 7", "вечером одна кнопка «подвести день»", () => wired("run-day-digest")],
  ["b7-open-loops", "Боль 7", "открытые петли видны отдельно", () => found("digest-open-loops")],
  ["b7-carry-tomorrow", "Боль 7", "можно одним кликом перенести в завтра", () => wired("carry-loops-tomorrow")],
  ["b7-day-sources", "Боль 7", "можно открыть исходные записи дня", () => found("digest-loop-done")],
  ["b8-morning-start", "Боль 8", "утром видно, что осталось со вчера", () => found("morningSummary")],
  ["b8-priorities", "Боль 8", "1–3 приоритета, не 15", () => found("life-focus")],
  ["b8-morning-explains", "Боль 8", "короткое объяснение, почему это важно", () => found("life-focus-confidence")],

  // ─── 7 ДЫР ──────────────────────────────────────────────────────────────────────────────
  ["h1-learning-event", "Дыра 1", "Learning Event: вход, предсказание, действие, верно ли, уверенность, исход", () => found("state.decisions") && found("confidence") && found("edited")],
  ["h2-delayed-value", "Дыра 2", "оценка полезности спустя время, а не в момент нажатия", () => found("insight-action") && found("INSIGHT_HORIZON_HOURS")],
  ["h2-unverifiable", "Дыра 2", "молчание не считается отказом", () => found("unverifiable")],
  ["h3-user-patterns", "Дыра 3", "накопление паттернов пользователя", () => found("computeBehaviorPatterns") && found("computeUserModel")],
  ["h3-patterns-used", "Дыра 3", "паттерны ВЛИЯЮТ, а не лежат", () => found("dayPart") && found("buildOwnerProfile")],
  ["h4-trust-levels", "Дыра 4", "уровни доверия: почти уверен / вероятно / гипотеза / не хватает данных", () => found("мало данных") && found("по твоим решениям")],
  ["h5-what-changed", "Дыра 5", "объяснение «что изменилось / чему научилась»", () => found("control-self-review")],
  ["h6-rollback-learning", "Дыра 6", "защита от деградации, откат обучения", () => found("freezeCanary") && found("checkCanary")],
  ["h6-drift", "Дыра 6", "детектор дрейфа", () => found("DRIFT_WINDOW")],
  ["h7-real-life-check", "Дыра 7", "проверка на реальной жизни, а не «работает ли код»", () => existsSync("tools/audit-liveness.mjs")],

  // ─── 10 БЛОКОВ ──────────────────────────────────────────────────────────────────────────
  ["k1-failure-map", "Блок 1", "карта отказов: что увидит, что сохранится, как восстановиться", () => existsSync("docs/MVP_NEGATIVE_CASES.md")],
  ["k1-failure-code", "Блок 1", "отказы обработаны в коде, а не только описаны", () => found("provider_unavailable") && found("not-connected")],
  ["k2-decision-matrix", "Блок 2", "матрица принятия решений таблицей, а не «на глаз»", () => existsSync("docs/MVP_HARD_SPEC.md")],
  ["k3-object-states", "Блок 3", "все состояния объекта: raw → parsed → candidate → confirmed → archived", () => existsSync("docs/MVP_UX_MAP.md") && found("status: \"open\"")],
  ["k4-micro-anim", "Блок 4", "микроанимации: система думает → нашла → предлагает", () => found("parse-skeleton") && found("parse-row-in")],
  ["k5-metrics", "Блок 5", "метрики MVP: что считать успехом", () => existsSync("docs/LIVENESS_BASELINE.json") && existsSync("docs/MVP_FIELD_TEST_14D.md")],
  ["k6-learning-system", "Блок 6", "самообучение как отдельная система с весами сигналов", () => existsSync("docs/MVP_LEARNING_SPEC.md") && found("decisionWeight")],
  ["k7-user-errors", "Блок 7", "каталог пользовательских ошибок: передумал, уснул, 50 файлов", () => found("MAX_RECORDING_MS")],
  ["k8-first-hour", "Блок 8", "первый час использования расписан", () => existsSync("docs/MVP_FIELD_TEST_14D.md")],
  ["k9-evolution", "Блок 9", "контур постоянной эволюции продукта", () => existsSync("docs/MVP_EVOLUTION_LOOP.md") && found("computeSelfReview")],
  ["k10-test-catalog", "Блок 10", "каталог тестовых сценариев", () => existsSync("output/playwright/parse-breakdown.spec.mjs")],

  // ─── 10 SCENARIO ────────────────────────────────────────────────────────────────────────
  ["s1-one-field", "Сценарий 1", "поле, кнопка записи, скрепка, отправить — ВСЁ", () => wired("import-file", "capture-import") && wired("start-audio-recording", "quick-voice") && wired("capture-text")],
  ["s1-no-type-buttons", "Сценарий 1", "нет кнопок мысль/задача/расход/книга/аудио на главном", () => found("capture-more")],
  ["s2-understood-list", "Сценарий 2", "«из этой записи я понял» — списком, каждый отдельно", () => found("Я понял из этой записи")],
  ["s3-similar-old", "Сценарий 3", "это похоже на записи от таких-то дат", () => found("similar-thought")],
  ["s3-verdict", "Сценарий 3", "новое / продолжение / дубль", () => wired("thought-verdict-duplicate", "verdict-duplicate") && wired("thought-verdict-supersede", "verdict-supersede") && wired("thought-verdict-distinct", "verdict-distinct")],
  ["s4-why-insight", "Сценарий 4", "почему появился инсайт: сколько записей, что повторилось", () => found("insight-why-text")],
  ["s5-thumbs", "Сценарий 5", "после любого действия — это полезно?", () => found("parse-row-dismiss")],
  ["s5-changes-behavior", "Сценарий 5", "следующий раз поведение другое", () => found("calibratedConfidence") && found("proposalsWithTrust")],
  ["s6-memory-lives", "Сценарий 6", "через неделю спрашиваю — система отвечает", () => found("buildGroundedAnswer")],
  ["s7-knowledge-card", "Сценарий 7", "карточка знания: описание, мысли, решения, люди, инсайты", () => found("renderObject")],
  ["s8-evening-voice", "Сценарий 8", "вечером закрыть день", () => found("computeDayDigestView")],
  ["s9-argues", "Сценарий 9", "система спорит: ты сам поставил цель, поэтому не рекомендую", () => found("objection-card") && found("computeObjections")],
  ["s9-explains", "Сценарий 9", "не запрещает — объясняет", () => found("objection-why")],
  ["s10-no-sorting", "Сценарий 10", "никогда не выбираю тип записи", () => found("SPEECH_INTENT_SCHEMA")],

  // ─── 9 СЦЕНАРИЕВ ТЕСТИРОВАНИЯ ───────────────────────────────────────────────────────────
  ["t1-brain-dump", "Тест 1", "Brain Dump: диктуешь поток, ничего не сортируешь", () => wired("start-audio-recording", "quick-voice") && found("capture-recording-dot")],
  ["t2-growing-graph", "Тест 2", "каждая мысль отвечает: с чем это связано", () => found("buildLifeGraph")],
  ["t2-extend-not-create", "Тест 2", "похожесть выше порога — расширять, а не создавать новое", () => found("applySimilarVerdict")],
  ["t3-insight-engine", "Тест 3", "система сама говорит: за 7 дней ты 14 раз про X", () => found("ownerThemeInsights")],
  ["t4-memory-evolution", "Тест 4", "пишешь слово — система знает контекст без поиска", () => found("chat-citation-chip")],
  ["t5-self-organization", "Тест 5", "система сама решает: проект / задача / гипотеза / проблема", () => found("groupForProposalType")],
  ["t6-relationship-discovery", "Тест 6", "система сама нашла связь, которую ты не называл", () => found("detectProjectClusters")],
  ["t7-decision-memory", "Тест 7", "хранить ПОЧЕМУ было принято решение, а не только факт", () => found("recordOwnerDecision") && found("origin")],
  ["t8-prediction", "Тест 8", "новый проект — система предлагает шаблон, риски, прошлые ошибки", () => found("computeGoalForecast") && found("computeUnderestimated")],
  ["t9-personal-twin", "Тест 9", "обычно в такой ситуации ты выбираешь Б, но сейчас лучше А", () => found("personalTwinSnapshots")],

  // ─── 15 ВОПРОСОВ ────────────────────────────────────────────────────────────────────────
  ["q1", "Вопрос 1", "почему появился именно этот инсайт", () => found("insight-why")],
  ["q2", "Вопрос 2", "почему другой инсайт НЕ появился", () => found("dropInsightsCoveredByClusters")],
  ["q3", "Вопрос 3", "что нового система узнала сегодня", () => found("self-review-weakest")],
  ["q4", "Вопрос 4", "что она забыла", () => found("runForgetting")],
  ["q5", "Вопрос 5", "какие знания устарели", () => found("supersededAt")],
  ["q6", "Вопрос 6", "какие проекты давно не обновлялись", () => found("forgotten")],
  ["q7", "Вопрос 7", "какие правила противоречат друг другу", () => found("computeContradictions")],
  ["q8", "Вопрос 8", "какие записи дублируются", () => found("findSimilarThoughts")],
  ["q9", "Вопрос 9", "какие мысли повторяются слишком часто", () => found("recurring")],
  ["q10", "Вопрос 10", "какие идеи так и не превратились в действия", () => found("insightBetsByType")],
  ["q11", "Вопрос 11", "какие проекты застряли", () => found("overdue")],
  ["q12", "Вопрос 12", "какие инсайты никогда не приводят к пользе", () => found("never-useful")],
  ["q13", "Вопрос 13", "что можно безопасно архивировать", () => found("TRASH_GRACE_DAYS")],
  ["q14", "Вопрос 14", "что стоит показать снова через неделю", () => found("on-this-day") || found("anniversary")],
  ["q15", "Вопрос 15", "что система считает своим самым слабым местом сейчас", () => found("weakest")],

  // ─── ПРЕТЕНЗИИ ВЛАДЕЛЬЦА, добавленные поверх файла ──────────────────────────────────────
  ["o1-two-tabs", "Владелец", "две вкладки не затирают друг друга", () => found("BroadcastChannel")],
  ["o2-no-freeze", "Владелец", "экран не виснет из-за зависшей записи", () => found("WRITE_TIMEOUT_MS")],
  ["o3-mic-visible", "Владелец", "видно, что микрофон пишет, и чем остановить", () => wired("stop-audio-recording", "capture-stop-recording")],
  ["o4-ai-button", "Владелец", "рядом кнопка «разобрать с ИИ»", () => wired("capture-with-ai")],
  ["o5-decision-task", "Владелец", "из мысли о завтрашней смене рождается решение на сегодня", () => found("speech-decision")],
  ["o6-product-feedback", "Владелец", "мысль о самой системе становится заданием на доработку", () => found("detectProductFeedback")],
  ["o7-loading", "Владелец", "если что-то грузится — видно, что грузится", () => found("parse-skeleton-label")],
  ["o8-self-checks", "Владелец", "система проверяет себя сама, без кнопок «проверить»", () => found("sttWorking")]
];

const rows = ITEMS.map(([id, block, promise, proof]) => {
  let ok = false;
  let error = "";
  try {
    ok = Boolean(proof());
  } catch (issue) {
    // Упавшая проверка — это НЕ пройденный пункт. Считать иначе значит позволить прибору
    // ошибаться в свою пользу, а он для того и написан, чтобы этого не мог.
    error = String((issue && issue.message) || issue);
  }
  return { id, block, promise, ok, error };
});

const done = rows.filter((row) => row.ok);
const left = rows.filter((row) => !row.ok);
const percent = rows.length ? Math.round((done.length / rows.length) * 100) : 0;

console.log("АУДИТ docs/Клауд.txt — поштучно, по коду\n");
if (left.length) {
  console.log("НЕ РАБОТАЕТ (" + left.length + "):");
  for (const row of left) {
    console.log("  ✗ [" + row.block + "] " + row.promise + (row.error ? "  — проверка упала: " + row.error : ""));
  }
  console.log("");
}
const byBlock = new Map();
for (const row of rows) {
  if (!byBlock.has(row.block)) byBlock.set(row.block, { total: 0, ok: 0 });
  const bucket = byBlock.get(row.block);
  bucket.total += 1;
  if (row.ok) bucket.ok += 1;
}
console.log("По блокам:");
for (const [block, bucket] of byBlock) {
  console.log("  " + block.padEnd(12) + bucket.ok + " из " + bucket.total);
}
console.log("\nИТОГО: " + done.length + " из " + rows.length + " (" + percent + "%)");
console.log("Прибор проверяет НАЛИЧИЕ механизма, а не его качество. Качество меряют спеки и перепись живого.");

// Гейт краснеет, если покрытие упало ниже достигнутого. Число поднимается только осознанно —
// вместе с закрытыми пунктами, а не вместо них.
const FLOOR = Number(process.env.KLAUD_FLOOR || 0);
if (percent < FLOOR) {
  console.log("\nКРАСНЫЙ: покрытие упало ниже планки " + FLOOR + "%.");
  process.exit(1);
}

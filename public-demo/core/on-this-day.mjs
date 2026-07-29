// core/on-this-day.mjs — «В ЭТОТ ДЕНЬ».
//
// Владелец: «нет ощущения движения». Данные для него уже лежат — дата создания есть у каждой
// записи, новой коллекции не нужно. Не хватало одного: чтобы система сама показала, что он писал
// ровно в этот день раньше.
//
// Почему не только «год назад». Хранилищу владельца несколько месяцев: правило «ровно 365 дней»
// не сработает ни разу и функция будет мёртвой. Поэтому вехи идут лесенкой — год, полгода, три
// месяца, месяц, — и КАЖДАЯ подписана своим словом. Это не подмена: «месяц назад» нигде не
// выдаётся за «год назад».
//
// Слой чистый: на входе записи и дата, на выходе строки. Ни состояния, ни DOM.

// Веха: сколько месяцев назад и как это называть. Порядок от старшего к младшему — показываем
// самую дальнюю веху, до которой хранилище дотянулось: «год назад» ценнее, чем «месяц назад».
const MILESTONES = [
  { months: 12, label: "Год назад" },
  { months: 6, label: "Полгода назад" },
  { months: 3, label: "Три месяца назад" },
  { months: 1, label: "Месяц назад" }
];

// Разброс в днях. Ровно в дату запись есть далеко не всегда, а «примерно тогда» — честно, если
// сказать вслух, на сколько промахнулись. Без допуска функция молчала бы почти каждый день.
const WINDOW_DAYS = 3;

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

// Сдвиг на месяцы назад с поправкой на короткий месяц: 31 марта минус один месяц — это 28/29
// февраля, а не 3 марта. Без поправки веха уезжает, и подпись начинает врать.
export function shiftMonths(dayString, months) {
  const base = new Date(String(dayString) + "T00:00:00Z");
  if (isNaN(base.getTime())) return "";
  const day = base.getUTCDate();
  const shifted = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate();
  shifted.setUTCDate(Math.min(day, lastDay));
  return dayKey(shifted);
}

function daysBetween(a, b) {
  const left = new Date(String(a) + "T00:00:00Z").getTime();
  const right = new Date(String(b) + "T00:00:00Z").getTime();
  if (isNaN(left) || isNaN(right)) return Infinity;
  return Math.round(Math.abs(left - right) / 86400000);
}

function agoPhrase(offset) {
  if (offset === 0) return "ровно в этот день";
  const word = offset === 1 ? "день" : offset < 5 ? "дня" : "дней";
  return "на " + offset + " " + word + " раньше";
}

// records: [{ id, title, day, kind }] — day в формате ГГГГ-ММ-ДД.
// today: ГГГГ-ММ-ДД.
export function onThisDay(records, today, options) {
  const opts = options || {};
  const window = Number.isFinite(opts.windowDays) ? opts.windowDays : WINDOW_DAYS;
  const rows = (records || []).filter((row) => row && row.day && row.title);
  if (!rows.length || !today) return null;

  for (const milestone of MILESTONES) {
    const target = shiftMonths(today, milestone.months);
    if (!target) continue;
    const near = rows
      .map((row) => ({ row, offset: daysBetween(row.day, target) }))
      .filter((item) => item.offset <= window)
      // Ближе к вехе — выше. При равном расстоянии решает id, иначе строка «плавает» от
      // прогона к прогону и выглядит как новая находка каждый раз.
      .sort((a, b) => a.offset - b.offset || String(a.row.id).localeCompare(String(b.row.id)));
    if (!near.length) continue;

    const best = near[0];
    return {
      milestone: milestone.months,
      label: milestone.label,
      targetDay: target,
      // Подпись говорит ровно то, что произошло: какая веха и насколько промахнулись по дате.
      title: milestone.label + " ты писал: «" + best.row.title + "»",
      detail: best.row.day + " · " + agoPhrase(best.offset)
        + (near.length > 1 ? " · в те же дни ещё записей: " + (near.length - 1) : ""),
      recordId: best.row.id,
      refs: near.slice(0, 4).map((item) => item.row.id),
      offsetDays: best.offset
    };
  }
  return null;
}

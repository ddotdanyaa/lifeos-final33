// core/ru-parse.mjs — разбор русского времени и дат
//
// П7: вынесено из app.js замыканием от семени — инструмент сам добрал все зависимости и
// проверил, что ни одна из них не трогает состояние, хранилище и DOM. Модуль замкнут:
// ссылок обратно в app.js нет (audit-module-closure это подтверждает).

import {
  dateKeyFromOffset,
  hasRuWord,
  normalizeRuText,
  repairMojibake,
  todayKey
} from "./text.mjs";

export function normalizeTime(value) {
  const match = String(value || "").trim().match(/^([01]?\d|2[0-3]):?([0-5]\d)$/);
  if (!match) return "";
  return match[1].padStart(2, "0") + ":" + match[2];
}

export function addMinutesToTime(value, minutes) {
  const clean = normalizeTime(value);
  if (!clean) return "";
  const parts = clean.split(":").map(Number);
  const total = parts[0] * 60 + parts[1] + minutes;
  const dayMinutes = ((total % 1440) + 1440) % 1440;
  return String(Math.floor(dayMinutes / 60)).padStart(2, "0") + ":" + String(dayMinutes % 60).padStart(2, "0");
}

export function parseDateFromTextHumanSafe(text) {
  const lower = normalizeRuText(text);
  if (hasRuWord(lower, "послезавтра")) return dateKeyFromOffset(2);
  if (hasRuWord(lower, "завтра")) return dateKeyFromOffset(1);
  if (hasRuWord(lower, "сегодня")) return todayKey();
  const throughDays = lower.match(/через\s+(\d{1,2})\s+(?:день|дня|дней|д)/u);
  if (throughDays) return dateKeyFromOffset(Number(throughDays[1]));
  if (/\btomorrow\b/.test(lower)) return dateKeyFromOffset(1);
  if (/\btoday\b/.test(lower)) return todayKey();
  const iso = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const dotted = lower.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if (dotted) {
    const currentYear = new Date(todayKey() + "T00:00:00").getUTCFullYear();
    const year = dotted[3] ? Number(dotted[3].length === 2 ? "20" + dotted[3] : dotted[3]) : currentYear;
    return String(year).padStart(4, "0") + "-" + String(Number(dotted[2])).padStart(2, "0") + "-" + String(Number(dotted[1])).padStart(2, "0");
  }
  // Суффикс «Z» обязателен: без него строка «2026-07-27T00:00:00» разбирается как МЕСТНАЯ
  // полночь, а getUTCDay() ниже читает её уже в UTC — и в поясе восточнее Гринвича понедельник
  // становится воскресеньем. Владелец в UTC+3 говорил «до среды» и получал четверг: все сроки
  // по дням недели уезжали на сутки вперёд. В облаке (UTC) ошибка не проявлялась вовсе.
  const today = new Date(todayKey() + "T00:00:00Z");
  // День недели почти никогда не звучит в именительном: «до среды», «в пятницу», «к субботе».
  // Сравнение по точному слову ловило только «вторник» и «четверг» — те два дня, у которых
  // винительный совпадает с именительным. Всё остальное молча уезжало на сегодня.
  for (let index = 0; index < RU_WEEKDAY_PATTERNS.length; index += 1) {
    if (!RU_WEEKDAY_PATTERNS[index].test(lower)) continue;
    const offset = (index - today.getUTCDay() + 7) % 7 || 7;
    return dateKeyFromOffset(offset);
  }
  // «В выходные» — ближайшая суббота: это то, что владелец имеет в виду, говоря так в будни.
  if (/(?<![А-Яа-яЁё])выходн[ыои][ехм][а-яё]*(?![А-Яа-яЁё])/i.test(lower)) {
    const offset = (6 - today.getUTCDay() + 7) % 7 || 7;
    return dateKeyFromOffset(offset);
  }
  return "";
}

// Основы дней недели с явными кириллическими границами (JS \b по кириллице не работает).
// Индекс = день недели по getUTCDay, поэтому порядок начинается с воскресенья.
// «сред[аыуе]» не задевает «среди» и «средство»: там после основы стоит другая буква.
export const RU_WEEKDAY_PATTERNS = [
  /(?<![А-Яа-яЁё])(воскресень[еяю]|sunday)(?![А-Яа-яЁё])/i,
  /(?<![А-Яа-яЁё])(понедельник[аиу]?|monday)(?![А-Яа-яЁё])/i,
  /(?<![А-Яа-яЁё])(вторник[аиу]?|tuesday)(?![А-Яа-яЁё])/i,
  /(?<![А-Яа-яЁё])(сред[аыуе]|wednesday)(?![А-Яа-яЁё])/i,
  /(?<![А-Яа-яЁё])(четверг[аиу]?|thursday)(?![А-Яа-яЁё])/i,
  /(?<![А-Яа-яЁё])(пятниц[аыуе]|friday)(?![А-Яа-яЁё])/i,
  /(?<![А-Яа-яЁё])(суббот[аыуе]|saturday)(?![А-Яа-яЁё])/i
];




export function parseDateFromText(text) {
  return parseDateFromTextHumanSafe(text);
  const source = String(text || "");
  const lower = source.toLocaleLowerCase();
  const semanticLower = repairMojibake(source).toLocaleLowerCase();
  const hasDateTerm = (value, term) => new RegExp("(^|[^0-9a-zа-яё])" + term + "(?=$|[^0-9a-zа-яё])", "i").test(value);
  if (hasDateTerm(semanticLower, "послезавтра")) return dateKeyFromOffset(2);
  if (hasDateTerm(semanticLower, "завтра")) return dateKeyFromOffset(1);
  if (hasDateTerm(semanticLower, "сегодня")) return todayKey();
  const semanticThroughDays = semanticLower.match(/через\s+(\d{1,2})\s+д/);
  if (semanticThroughDays) return dateKeyFromOffset(Number(semanticThroughDays[1]));
  if (hasDateTerm(lower, "послезавтра")) return dateKeyFromOffset(2);
  if (hasDateTerm(lower, "завтра")) return dateKeyFromOffset(1);
  if (hasDateTerm(lower, "сегодня")) return todayKey();
  const throughDays = lower.match(/через\s+(\d{1,2})\s+д/);
  if (throughDays) return dateKeyFromOffset(Number(throughDays[1]));
  if (/\b(tomorrow|завтра)\b/.test(lower)) return dateKeyFromOffset(1);
  if (/\b(today|сегодня)\b/.test(lower)) return todayKey();
  const iso = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const dotted = lower.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if (dotted) {
    const currentYear = new Date(todayKey() + "T00:00:00").getUTCFullYear();
    const year = dotted[3] ? Number(dotted[3].length === 2 ? "20" + dotted[3] : dotted[3]) : currentYear;
    const day = String(Number(dotted[1])).padStart(2, "0");
    const month = String(Number(dotted[2])).padStart(2, "0");
    return String(year).padStart(4, "0") + "-" + month + "-" + day;
  }
  const weekDays = [
    ["sunday", "воскресенье"],
    ["monday", "понедельник"],
    ["tuesday", "вторник"],
    ["wednesday", "среда"],
    ["thursday", "четверг"],
    ["friday", "пятница"],
    ["saturday", "суббота"]
  ];
  const today = new Date(todayKey() + "T00:00:00Z");
  for (let index = 0; index < weekDays.length; index += 1) {
    if (!weekDays[index].some((word) => lower.includes(word))) continue;
    const current = today.getUTCDay();
    const target = index;
    const offset = (target - current + 7) % 7 || 7;
    return dateKeyFromOffset(offset);
  }
  const semanticWeekDays = [
    ["sunday", "воскресенье"],
    ["monday", "понедельник"],
    ["tuesday", "вторник"],
    ["wednesday", "среда"],
    ["thursday", "четверг"],
    ["friday", "пятница"],
    ["saturday", "суббота"]
  ];
  for (let index = 0; index < semanticWeekDays.length; index += 1) {
    if (!semanticWeekDays[index].some((word) => semanticLower.includes(word))) continue;
    const current = today.getUTCDay();
    const target = index;
    const offset = (target - current + 7) % 7 || 7;
    return dateKeyFromOffset(offset);
  }
  return "";
}

export function parseTimeFromTextHumanSafe(text) {
  const lower = normalizeRuText(text);
  const makeTime = (hour, minute = 0) => {
    const cleanHour = ((Number(hour) % 24) + 24) % 24;
    const startTime = String(cleanHour).padStart(2, "0") + ":" + String(Number(minute || 0)).padStart(2, "0");
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  };
  const ambiguous = (hour, reason, options, suggestedTime) => ({
    startTime: "",
    endTime: "",
    ambiguousTime: true,
    timeOptions: options || [String(hour).padStart(2, "0") + ":00", String((hour % 12) + 12).padStart(2, "0") + ":00"],
    suggestedTime: suggestedTime || "",
    ambiguityReason: reason
  });
  const range = lower.match(/(?:^|[^\d])([01]?\d|2[0-3])[:.](\d{2})\s*[-–]\s*([01]?\d|2[0-3])[:.](\d{2})(?:[^\d]|$)/u);
  if (range) return { startTime: range[1].padStart(2, "0") + ":" + range[2], endTime: range[3].padStart(2, "0") + ":" + range[4] };
  const clock = lower.match(/(?:^|[^\d])([01]?\d|2[0-3])[:.](\d{2})(?:[^\d]|$)/u);
  if (clock) return makeTime(Number(clock[1]), Number(clock[2]));
  if (lower.includes("\u0432\u0435\u0447\u0435\u0440\u043e\u043c") || lower.includes("\u043a \u0432\u0435\u0447\u0435\u0440\u0443") || lower.includes("\u0432\u0435\u0447\u0435\u0440\u043d\u0438\u0439 \u0441\u043b\u043e\u0442")) {
    return ambiguous(20, "Сказано только «вечером»: предлагаю 20:00, но лучше подтвердить точное время.", ["19:00", "20:00", "21:00"], "20:00");
  }
  if (lower.includes("\u0443\u0442\u0440\u043e\u043c") || lower.includes("\u0441 \u0443\u0442\u0440\u0430")) return makeTime(9, 0);
  if (lower.includes("\u0434\u043d\u0435\u043c") || lower.includes("\u0434\u043d\u0451\u043c") || lower.includes("\u043f\u043e\u0441\u043b\u0435 \u043e\u0431\u0435\u0434\u0430")) return makeTime(14, 0);
  const marked = lower.match(/(?:^|\s)(?:\u0432|\u043a|at)\s+([01]?\d|2[0-3])\s*(\u0443\u0442\u0440\u0430|\u0434\u043d\u044f|\u0432\u0435\u0447\u0435\u0440\u0430|\u043d\u043e\u0447\u0438|am|pm)(?=$|\s|[,.;:!?])/u);
  if (marked) {
    let hour = Number(marked[1]);
    const marker = marked[2];
    if ((marker === "\u0432\u0435\u0447\u0435\u0440\u0430" || marker === "\u0434\u043d\u044f" || marker === "pm") && hour < 12) hour += 12;
    if (marker === "\u043d\u043e\u0447\u0438" && hour >= 5 && hour < 12) hour += 12;
    if ((marker === "\u0443\u0442\u0440\u0430" || marker === "am") && hour === 12) hour = 0;
    return makeTime(hour, 0);
  }
  // Предлог «с» — то, как называют начало смены: «работаю с 16», «смена с 16 до 22». Раньше
  // читались только «в» и «к», поэтому у смены не было времени вовсе, а голое число успевало
  // стать расходом («Буду работать с 16» давало трату 16 ₽ — числу нечего было значить).
  // Возраст, число месяца и проценты исключены явно: «с 16 лет», «с 16 числа», «с 16 сентября».
  const fromHour = lower.match(/(?:^|\s)с\s+([01]?\d|2[0-3])(?:[:.](\d{2}))?(?=$|\s|[,.;:!?])/u);
  if (fromHour) {
    const tail = lower.slice(fromHour.index + fromHour[0].length).trimStart();
    const notATime = /^(лет|год|числ|процент|%|январ|феврал|март|апрел|мая|июн|июл|август|сентябр|октябр|ноябр|декабр)/u.test(tail);
    if (!notATime) {
      const startHour = Number(fromHour[1]);
      const startTime = String(startHour).padStart(2, "0") + ":" + String(Number(fromHour[2] || 0)).padStart(2, "0");
      const toHour = tail.match(/^до\s+([01]?\d|2[0-3])(?:[:.](\d{2}))?(?=$|\s|[,.;:!?])/u);
      const endHour = toHour ? Number(toHour[1]) : -1;
      const endTime = toHour ? String(endHour).padStart(2, "0") + ":" + String(Number(toHour[2] || 0)).padStart(2, "0") : "";
      // Час больше 12 однозначен сам по себе; «с 9 до 18» однозначен концом. Всё остальное
      // («с 9») остаётся вопросом — закон №6: при сомнении не решаем за владельца.
      // Конца смены не выдумываем: «с» называет только начало, и дорисованные 45 минут читались
      // на экране как «Смена / работа с 16:00 до 16:45» — время, которого владелец не называл.
      if (startHour > 12) return { startTime, endTime };
      if (toHour && endHour > 12) return { startTime, endTime };
      return ambiguous(startHour, "Начало без части суток: уточните " + String(startHour).padStart(2, "0") + ":00 или " + String((startHour % 12) + 12).padStart(2, "0") + ":00 перед созданием.");
    }
  }
  const plainHour = lower.match(/(?:^|\s)(?:\u0432|\u043a|at)\s+([01]?\d|2[0-3])(?=$|\s|[,.;:!?])/u);
  if (plainHour) {
    const hour = Number(plainHour[1]);
    if (hour > 12) return makeTime(hour, 0);
    const morningContext = /(\u0432\u0441\u0442\u0430\u0442\u044c|\u043f\u043e\u0434\u044a[\u0435\u0451]\u043c|\u0437\u0430\u0432\u0442\u0440\u0430\u043a|\u0443\u0442\u0440\u043e|\u0443\u0442\u0440\u043e\u043c|\u0437\u0430\u0440\u044f\u0434\u043a|morning|breakfast)/u.test(lower);
    if (morningContext || (hour >= 1 && hour <= 7)) return makeTime(hour, 0);
    return ambiguous(hour, "Время без части суток: уточните 11:00 или 23:00 перед созданием.");
  }
  return { startTime: "", endTime: "" };
}

export function parseTimeFromText(text) {
  return parseTimeFromTextHumanSafe(text);
  const source = String(text || "");
  const lower = source.toLocaleLowerCase();
  const semanticLower = repairMojibake(source).toLocaleLowerCase();
  const ambiguous = (hour, reason, suggestedTime) => ({
    startTime: "",
    endTime: "",
    ambiguousTime: true,
    timeOptions: [String(hour).padStart(2, "0") + ":00", String((hour % 12) + 12).padStart(2, "0") + ":00"],
    suggestedTime: suggestedTime || "",
    ambiguityReason: reason
  });
  const contextualMorning = ["встать", "подъем", "подъём", "завтрак", "утро", "утром", "с утра", "зарядк", "morning", "breakfast"].some((token) => semanticLower.includes(token));
  function hourWithMarker(hour, marker) {
    let value = Number(hour);
    const cleanMarker = String(marker || "").toLocaleLowerCase();
    if ((cleanMarker === "pm" || cleanMarker === "дня" || cleanMarker === "вечера") && value < 12) value += 12;
    if (cleanMarker === "ночи" && value >= 5 && value < 12) value += 12;
    if ((cleanMarker === "am" || cleanMarker === "утра") && value === 12) value = 0;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  const naturalMarkedHour = semanticLower.match(/(?:^|\s)(?:в|к|at)\s+([01]?\d|2[0-3])\s*(am|pm|утра|дня|вечера|ночи)(?=$|\s|[,.;:!?])/);
  if (naturalMarkedHour) return hourWithMarker(Number(naturalMarkedHour[1]), naturalMarkedHour[2]);
  const naturalHour = semanticLower.match(/(?:^|\s)(?:в|к|at)\s+([01]?\d|2[0-3])\b/);
  if (naturalHour) {
    const hour = Number(naturalHour[1]);
    if (hour > 12) return hourWithMarker(hour, "");
    if (hour >= 1 && hour <= 7) return hourWithMarker(hour, "утра");
    if (contextualMorning) return hourWithMarker(hour, "утра");
    return ambiguous(hour, "Время без части суток: нужно выбрать утро или вечер перед календарным блоком.");
  }
  if (semanticLower.includes("утром") || semanticLower.includes("с утра")) return { startTime: "09:00", endTime: "09:45" };
  if (semanticLower.includes("днем") || semanticLower.includes("днём") || semanticLower.includes("после обеда")) return { startTime: "14:00", endTime: "14:45" };
  if (semanticLower.includes("вечером") || semanticLower.includes("к вечеру")) return { startTime: "", endTime: "", ambiguousTime: true, timeOptions: ["19:00", "20:00", "21:00"], suggestedTime: "20:00", ambiguityReason: "Сказано только «вечером»; LifeOS предлагает 20:00, но ждет подтверждения владельца." };
  const semanticWordHour = semanticLower.match(/\bв\s+(один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать)(?:\s+(дня|вечера|утра))?\b/);
  if (semanticWordHour) {
    const hourMap = { один: 1, два: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12 };
    let value = hourMap[semanticWordHour[1]] || 0;
    if (!semanticWordHour[2] && value <= 12 && !contextualMorning) return ambiguous(value, "Время словами без части суток: нужно уточнение владельца.");
    if (!semanticWordHour[2] && contextualMorning) semanticWordHour[2] = "утра";
    if ((semanticWordHour[2] === "дня" || semanticWordHour[2] === "вечера") && value < 12) value += 12;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  const semanticHour = semanticLower.match(/(?:\bat\s+|в\s+)([01]?\d|2[0-3])(?:\s*(am|pm|дня|вечера|утра))?\b/);
  if (semanticHour) {
    let value = Number(semanticHour[1]);
    if ((semanticHour[2] === "pm" || semanticHour[2] === "дня" || semanticHour[2] === "вечера") && value < 12) value += 12;
    if ((semanticHour[2] === "am" || semanticHour[2] === "утра") && value === 12) value = 0;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  if (/\b(утром|с утра)\b/.test(lower)) return { startTime: "09:00", endTime: "09:45" };
  if (/\b(днем|после обеда)\b/.test(lower)) return { startTime: "14:00", endTime: "14:45" };
  if (/\b(вечером|к вечеру)\b/.test(lower)) return { startTime: "19:00", endTime: "19:45" };
  const wordHour = lower.match(/\bв\s+(один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать)(?:\s+(дня|вечера|утра))?\b/);
  if (wordHour) {
    const hourMap = { один: 1, два: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12 };
    let value = hourMap[wordHour[1]] || 0;
    if ((wordHour[2] === "дня" || wordHour[2] === "вечера") && value < 12) value += 12;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  const range = source.match(/(?:^|\D)([01]?\d|2[0-3])[:.](\d{2})\s*[-–]\s*([01]?\d|2[0-3])[:.](\d{2})(?:\D|$)/);
  if (range) {
    return {
      startTime: range[1].padStart(2, "0") + ":" + range[2],
      endTime: range[3].padStart(2, "0") + ":" + range[4]
    };
  }
  const clock = source.match(/(?:^|\D)([01]?\d|2[0-3])[:.](\d{2})(?:\D|$)/);
  if (clock) {
    const startTime = clock[1].padStart(2, "0") + ":" + clock[2];
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  const hour = source.toLocaleLowerCase().match(/(?:\bat\s+|в\s+)([01]?\d|2[0-3])(?:\s*(am|pm))?\b/);
  if (hour) {
    let value = Number(hour[1]);
    if (hour[2] === "pm" && value < 12) value += 12;
    if (hour[2] === "am" && value === 12) value = 0;
    const startTime = String(value).padStart(2, "0") + ":00";
    return { startTime, endTime: addMinutesToTime(startTime, 45) };
  }
  return { startTime: "", endTime: "" };
}

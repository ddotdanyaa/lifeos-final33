// core/ru-money.mjs — суммы и деньги в русской речи
//
// П7: вынесено из app.js замыканием от семени — инструмент сам добрал все зависимости и
// проверил, что ни одна из них не трогает состояние, хранилище и DOM. Модуль замкнут:
// ссылок обратно в app.js нет (audit-module-closure это подтверждает).

import {
  parseDateFromText,
  parseTimeFromText
} from "./ru-parse.mjs";
import {
  cleanLine,
  normalizeRuText,
  repairMojibake,
  shorten
} from "./text.mjs";

// ─── Разговорные суммы: как их пишет РАСШИФРОВКА, а не клавиатура ────────────────────────────
//
// Замер на 24 настоящих голосовых (2026-07-30, `tools/measure-speech-intents.mjs`) показал, что
// деньги владельца теряются не в разборе смысла, а на самом числе. whisper пишет цифры цифрами,
// но «тысяч» оставляет словом и ставит ПРОБЕЛ разрядным разделителем:
//
//   «Заплатил за квартиру 28 тысяч. Осталось на карте 9 тысяч» → НИ ОДНОГО объекта;
//   «За неделю заработал 31 тысячу»                            → доход 31 ₽;
//   «отработал 10 часов, вышло 6 800»                          → заработок потерян целиком.
//
// Это худший класс ошибки из возможных: владелец продиктовал деньги, увидел «записано» и не
// увидел суммы. Поэтому нормализация стоит ПЕРЕД любым разбором сумм, в одной точке на все пути.
export function normalizeSpokenAmounts(text) {
  return String(text || "")
    // «6 800» → «6800». Пробел склеивается только когда после него РОВНО три цифры и следом не
    // цифра: «14 00» (это время) и «8 часов 4900» так остаются нетронутыми.
    .replace(/(?<![\d.,:])(\d{1,3})[  ](\d{3})(?!\d|[.,:]\d)/gu, "$1$2")
    // «28 тысяч», «31 тысячу», «12 тыс.», «1,5 тысячи» → 28000 / 31000 / 12000 / 1500
    .replace(/(\d{1,4})(?:[.,](\d))?\s*(?:тысяч[а-яё]*|тыщ[а-яё]*|тыс\.?)(?![а-яё])/giu,
      (all, whole, tenth) => String(Number(whole) * 1000 + (tenth ? Number(tenth) * 100 : 0)))
    .replace(/(\d{1,4})(?:[.,](\d))?\s*(?:миллион[а-яё]*|млн\.?)(?![а-яё])/giu,
      (all, whole, tenth) => String(Number(whole) * 1000000 + (tenth ? Number(tenth) * 100000 : 0)));
}

// Число, за которым стоит единица измерения, деньгами не является. Тот же замер: «Спал 5 часов»
// давало расход 5 ₽, «20 страниц за вечер» — расход 20 ₽. Проверяется ХВОСТ после числа, поэтому
// перечислены начала слов, а не целые слова.
// Дата — тоже не деньги: «страховку до 10 августа» давало расход 10 ₽. Названия месяцев стоят
// здесь, а не в отдельной проверке, потому что причина одна: у числа есть своя единица, и она
// названа сразу после него.
export const SPOKEN_UNIT_TAIL_RE = /^\s*(?:час|мин|сек|лет|год|кг|км|шт|стран|дн[ейя]|недел|месяц|раз(?![а-яё]*ных)|%|числ|янв|фев|март|апрел|мая|мае|июн|июл|авг|сент|октяб|нояб|декаб)/iu;

// U2 MONEY_FAST: a bare "amount + short category" entry ("350 бензин") or "заработал 4200
// смена" has no currency sign and no keyword the older heuristics below recognize (they only
// know a fixed merchant/category word list). Reading it unambiguously by word order alone -
// 2-6 digit number next to <=3 short words total, and NOT a date/time (so "15 июля" or "в 15"
// aren't mistaken for money) - is the honest, non-ML way to cover arbitrary categories without
// enumerating every possible one.
export function looksLikeBareMoneyEntry(text) {
  const source = normalizeSpokenAmounts(String(text || "")).trim();
  if (!source) return null;
  const wordCount = source.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0 || wordCount > 4) return null;
  if (parseTimeFromText(source).startTime || parseDateFromText(source)) return null;
  const leading = source.match(/^(\d{2,6})(?:[.,]\d{1,2})?\s+\S/);
  const trailing = source.match(/\S\s+(\d{2,6})(?:[.,]\d{1,2})?\s*[.!]?$/);
  const match = leading || trailing;
  if (!match) return null;
  // «20 страниц за вечер» — это не расход 20 ₽. Единица измерения после числа снимает вопрос.
  const tail = source.slice(match.index + match[0].indexOf(match[1]) + match[1].length);
  if (SPOKEN_UNIT_TAIL_RE.test(tail)) return null;
  return Number(match[1]);
}

export function extractMoneyEntities(text) {
  const humanMatches = extractMoneyEntitiesHuman(text);
  if (humanMatches.length) return humanMatches;
  const source = normalizeSpokenAmounts(String(text || ""));
  const matches = [];
  const moneyPattern = /(?:^|[^\d])(\d{2,9})(?:\s*)(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)/gi;
  let match = moneyPattern.exec(source);
  while (match) {
    matches.push({ amount: Number(match[1]), currency: "RUB", raw: cleanLine(match[0]) });
    match = moneyPattern.exec(source);
  }
  const fallback = source.match(/\b(\d{3,9})\b/);
  if (!matches.length && fallback && /(купить|оплатить|потратил|списал|списалось|стоил|цена|баланс|зарплата|лимит|подписка|долг|expense|income|budget|subscription)/i.test(source)) {
    matches.push({ amount: Number(fallback[1]), currency: "RUB", raw: fallback[1] });
  }
  if (!matches.length) {
    const bareAmount = looksLikeBareMoneyEntry(source);
    if (bareAmount) matches.push({ amount: bareAmount, currency: "RUB", raw: String(bareAmount) });
  }
  return matches.slice(0, 6);
}

export function extractFirstAmount(text) {
  const money = extractMoneyEntities(text);
  return money.length ? money[0].amount : 0;
}

export function extractMoneyEntitiesHuman(text) {
  const source = normalizeSpokenAmounts(repairMojibake(String(text || "")));
  const lower = normalizeRuText(source);
  // «Заплатил за квартиру 28 тысяч» не считалось денежной фразой вовсе: в списке было «оплат», а
  // владелец сказал «заплатил». Замер 2026-07-30: эта запись не дала НИ ОДНОГО объекта.
  const hasMoneyContext = /(пят[её]рочк|перекр[её]сток|магнит|продукт|еда|кофе|расход|потрат|купил|купить|оплат|плат[иья]|заплат|баланс|карта|сч[её]т|зарплат|доход|заработал|пришл|получил|подписк|бюджет|лимит|перев[её]л|накоплен|стоит|стоил|руб|₽|expense|income|budget|subscription)/iu.test(lower);
  if (!hasMoneyContext) return [];
  const matches = [];
  const seen = new Set();
  const pattern = /(^|[^\d])(\d{2,9})(?:\s*)(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)?/giu;
  let match = pattern.exec(source);
  while (match) {
    const amount = Number(match[2]);
    const numEnd = match.index + match[1].length + match[2].length;
    const after = source.slice(numEnd, numEnd + 6);
    // Число с единицей измерения — не деньги: "16:00", "16 часов", "16ч", "20 страниц", "3 дня".
    const isTimeLike = !match[3] && (/^\s*[:.]\d/u.test(after) || /^\s*ч(ас|\.|\b)/iu.test(after) || SPOKEN_UNIT_TAIL_RE.test(after));
    if (Number.isFinite(amount) && amount > 0 && !isTimeLike && !seen.has(match.index + ":" + amount)) {
      seen.add(match.index + ":" + amount);
      matches.push({ amount, currency: "RUB", raw: cleanLine(match[0]) || String(amount) });
    }
    match = pattern.exec(source);
  }
  return matches.slice(0, 6);
}

export function extractBalanceAmount(text) {
  const source = normalizeSpokenAmounts(repairMojibake(String(text || "")));
  const balanceMatch = source.match(/(?:баланс|остаток|на\s+карте|карта|сч[её]т)[^\d]{0,40}(\d{3,9})/iu);
  return balanceMatch ? Number(balanceMatch[1]) : 0;
}

// Срез 3 (v1.4): смена одной фразой - "отработал 12 часов, заработал 8700, бензин 1900".
// Правила/regex, НЕ LLM (закон среза: LLM-парсинг не блокирует ежедневный цикл). Часы,
// доход по глаголу, все остальные суммы с соседним словом - расходы смены.
export function parseShiftEntry(text) {
  const clean = normalizeSpokenAmounts(normalizeRuText(String(text || "")).toLocaleLowerCase());
  if (!/(отработал|отработала|смена|смену)/.test(clean)) return null;
  // Часы берём из фразы, которая НЕ про сон. Замер на настоящей речи (2026-07-30): «Смена была
  // тяжелая, устал сильно. Спал 5 часов» давало СМЕНУ НА ПЯТЬ ЧАСОВ — часы отдыха становились
  // рабочими, потому что искались во всём тексте сразу, а слово «смена» стояло в другой фразе.
  const shiftHoursRe = /(\d{1,2}(?:[.,]\d)?)\s*час/;
  const sentences = clean.split(/(?<=[.!?…])\s+|[\r\n]+/u).map((part) => part.trim()).filter(Boolean);
  const hoursSentence = (sentences.length ? sentences : [clean])
    .find((part) => shiftHoursRe.test(part) && !/(спал[а]?|поспал|выспал|сон|отдыхал)/.test(part));
  const hoursMatch = hoursSentence ? hoursSentence.match(shiftHoursRe) : null;
  const incomeMatch = clean.match(/(?:заработал[а]?|доход|привез[а-я]*|выручка|вышло|выходит|получается|получилось|итого|на руки|после налога)\s+(\d{3,7})/);
  const hours = hoursMatch ? Number(hoursMatch[1].replace(",", ".")) : 0;
  let income = incomeMatch ? Number(incomeMatch[1]) : 0;
  // Заработок без глагола. «Забыл записать вчерашнюю смену. 8 часов 4900» — владелец не сказал
  // «заработал», и сумма уходила РАСХОДОМ: в рассказе о смене это ровно наоборот. Берём одинокую
  // сумму только когда трат не названо вовсе, иначе расход стал бы доходом — ошибка той же цены.
  if (!income && !/(потратил[а]?|купил[а]?|оплатил[а]?|списал[а-я]*|расход[а-я]*|бензин|заправ[а-я]*|отдал[а]?)/.test(clean)) {
    const bare = [];
    for (const match of clean.matchAll(/(?<![\d.,:])(\d{3,7})(?![\d.,:])/gu)) {
      const tail = clean.slice(match.index + match[1].length, match.index + match[1].length + 6);
      if (SPOKEN_UNIT_TAIL_RE.test(tail)) continue;
      bare.push(Number(match[1]));
    }
    if (bare.length === 1) income = bare[0];
  }
  if (!hours && !income) return null;
  const expenses = [];
  for (const match of clean.matchAll(/([а-яё]{3,})\s+(\d{2,6})\b|(\d{2,6})\s+(?:на\s+)?([а-яё]{3,})/g)) {
    const label = match[1] || match[4];
    const amount = Number(match[2] || match[3]);
    if (!label || !amount) continue;
    if (["заработал", "заработала", "доход", "выручка", "отработал", "отработала", "смена", "смену", "привез", "привезла", "часов", "часа", "час"].includes(label)) continue;
    if (amount === income || (hoursMatch && String(amount) === hoursMatch[1])) continue;
    expenses.push({ title: label.charAt(0).toLocaleUpperCase() + label.slice(1), amount });
  }
  return { hours, income, expenses };
}

export function extractMerchantHuman(text) {
  const lower = normalizeRuText(text);
  const known = [
    [/пят[её]рочк/u, "Пятёрочка"],
    [/перекр[её]сток/u, "Перекрёсток"],
    [/магнит/u, "Магнит"],
    [/яндекс/u, "Яндекс"],
    [/ozon/u, "Ozon"],
    [/wildberries/u, "Wildberries"],
    [/кофе/u, "Кофе"],
    [/аптек/u, "Аптека"],
    [/такси/u, "Такси"],
    [/метро/u, "Метро"],
    [/протеин/u, "Протеин"],
    [/зал|gym/u, "Зал"]
  ];
  const row = known.find((item) => item[0].test(lower));
  return row ? row[1] : "";
}

export function extractMerchant(text) {
  const humanMerchant = extractMerchantHuman(text);
  if (humanMerchant) return humanMerchant;
  const source = cleanLine(text);
  const known = source.match(/\b(пятерочка|перекресток|яндекс|ozon|wildberries|кофе|аптека|такси|метро|протеин|gym|зал)\b/i);
  if (known) return known[1];
  return shorten(source.replace(/\d{2,9}\s*(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)?/gi, "").replace(/\b(купить|оплатить|потратил|списалось|баланс|зарплата|лимит|подписка)\b/gi, ""), 48) || "Расход";
}

export function inferFinanceCategory(text) {
  const humanLower = normalizeRuText(text);
  if (/продукт|еда|кофе|пят[её]рочк|перекр[её]сток|магнит|grocery|food|meal|ужин|обед|завтрак/u.test(humanLower)) return "Еда";
  if (/такси|метро|билет|дорог|travel|поезд|бензин|заправ/u.test(humanLower)) return "Транспорт";
  if (/протеин|зал|gym|спорт/u.test(humanLower)) return "Спорт";
  if (/подписк|яндекс|netflix|spotify|icloud/u.test(humanLower)) return "Подписки";
  if (/дом|лампоч|ремонт|полк/u.test(humanLower)) return "Дом";
  const lower = String(text || "").toLocaleLowerCase();
  if (/продукт|еда|кофе|пятерочка|перекресток|grocery|food|meal|ужин|обед/.test(lower)) return "Еда";
  if (/такси|метро|билет|дорога|travel|поезд/.test(lower)) return "Транспорт";
  if (/протеин|зал|gym|спорт/.test(lower)) return "Спорт";
  if (/подписк|яндекс|netflix|spotify|icloud/.test(lower)) return "Подписки";
  if (/дом|лампоч|ремонт|полк/.test(lower)) return "Дом";
  return "Разное";
}

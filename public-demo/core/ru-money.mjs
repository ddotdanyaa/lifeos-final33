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

// U2 MONEY_FAST: a bare "amount + short category" entry ("350 бензин") or "заработал 4200
// смена" has no currency sign and no keyword the older heuristics below recognize (they only
// know a fixed merchant/category word list). Reading it unambiguously by word order alone -
// 2-6 digit number next to <=3 short words total, and NOT a date/time (so "15 июля" or "в 15"
// aren't mistaken for money) - is the honest, non-ML way to cover arbitrary categories without
// enumerating every possible one.
export function looksLikeBareMoneyEntry(text) {
  const source = String(text || "").trim();
  if (!source) return null;
  const wordCount = source.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0 || wordCount > 4) return null;
  if (parseTimeFromText(source).startTime || parseDateFromText(source)) return null;
  const leading = source.match(/^(\d{2,6})(?:[.,]\d{1,2})?\s+\S/);
  const trailing = source.match(/\S\s+(\d{2,6})(?:[.,]\d{1,2})?\s*[.!]?$/);
  const match = leading || trailing;
  return match ? Number(match[1]) : null;
}

export function extractMoneyEntities(text) {
  const humanMatches = extractMoneyEntitiesHuman(text);
  if (humanMatches.length) return humanMatches;
  const source = String(text || "");
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
  const source = repairMojibake(String(text || ""));
  const lower = normalizeRuText(source);
  const hasMoneyContext = /(пят[её]рочк|перекр[её]сток|магнит|продукт|еда|кофе|расход|потрат|купил|купить|оплат|баланс|карта|сч[её]т|зарплат|доход|заработал|пришл|получил|подписк|бюджет|лимит|перев[её]л|накоплен|руб|₽|expense|income|budget|subscription)/iu.test(lower);
  if (!hasMoneyContext) return [];
  const matches = [];
  const seen = new Set();
  const pattern = /(^|[^\d])(\d{2,9})(?:\s*)(₽|руб(?:\.|лей|ля|ль)?|р\b|rub\b)?/giu;
  let match = pattern.exec(source);
  while (match) {
    const amount = Number(match[2]);
    const numEnd = match.index + match[1].length + match[2].length;
    const after = source.slice(numEnd, numEnd + 6);
    // Число из времени/длительности — не деньги: "16:00", "16 часов", "16ч" (без валюты рядом).
    const isTimeLike = !match[3] && (/^\s*[:.]\d/u.test(after) || /^\s*ч(ас|\.|\b)/iu.test(after));
    if (Number.isFinite(amount) && amount > 0 && !isTimeLike && !seen.has(match.index + ":" + amount)) {
      seen.add(match.index + ":" + amount);
      matches.push({ amount, currency: "RUB", raw: cleanLine(match[0]) || String(amount) });
    }
    match = pattern.exec(source);
  }
  return matches.slice(0, 6);
}

export function extractBalanceAmount(text) {
  const source = repairMojibake(String(text || ""));
  const balanceMatch = source.match(/(?:баланс|остаток|на\s+карте|карта|сч[её]т)[^\d]{0,40}(\d{3,9})/iu);
  return balanceMatch ? Number(balanceMatch[1]) : 0;
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

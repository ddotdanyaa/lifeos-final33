// core/similar-thoughts.mjs — МЫСЛЬ ВСТРЕЧАЕТ СВОИ ПРОШЛЫЕ.
//
// Боль владельца дословно (2026-07-30): «я закидываю двадцать мыслей в день… система должна
// видеть похожие старые идеи → группировать → помечать как дубль или как уточнение. Результат:
// владелец видит „найдено 3 похожих идеи от 15.07, 22.07, 27.07“».
//
// ПЕРЕНОС ДОНОРА. Источник — `natural` (MIT, Copyright (c) 2012 Adam Phillabaum, Chris Umbel),
// лежит в `research/repos/natural`, лицензия прочитана файлом `LICENSE`. Взяты две меры близости:
//
//   • коэффициент Дайса по биграммам символов — `lib/natural/distance/dice_coefficient.js`;
//     он сравнивает ПРЕДЛОЖЕНИЯ и не ломается от перестановки слов;
//   • Джаро–Винклер — `lib/natural/distance/jaro-winkler_distance.js`; он сравнивает КОРОТКИЕ
//     строки (заголовки) и вознаграждает общее начало, что для заголовков и нужно.
//
// Приёмка переноса — тест-кейсы самого донора (`spec/dice_coefficient_spec.ts`,
// `spec/jaro-winkler_spec.ts`), перенесённые в `tools/audit-similar-thoughts.mjs`. Правило
// проекта: перенос считается верным, когда наш JS даёт те же числа, что код донора. Без этого
// перенос — пересказ, а не перенос.
//
// Что добавлено сверх донора и почему: русская нормализация (донор ASCII-ориентирован) и отбор
// кандидатов с ИСКЛЮЧЕНИЕМ служебных записей — иначе «похожей мыслью» становится квитанция или
// событие PWA, и совет системы превращается в мусор.
//
// Слой чистый: строки на входе, решения на выходе. Ни DOM, ни хранилища, ни сети.
import { normalizeRuText } from "./text.mjs";

// ─── НОРМАЛИЗАЦИЯ ─────────────────────────────────────────────────────────────────────────
//
// Донорский `sanitize` опускает регистр и схлопывает пробелы. Для русского этого мало: «ё» и «е»
// владелец пишет как придётся, а точка с запятой не должна делать две мысли разными.
export function normalizeForCompare(value) {
  return normalizeRuText(value)
    .replace(/ё/g, "е")
    .replace(/[^0-9a-zа-я\s]/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "");
}

// ─── МЕРА 1: КОЭФФИЦИЕНТ ДАЙСА (перенос natural/dice_coefficient.js) ──────────────────────
//
// Биграммы символов, пересечение множеств, удвоенное пересечение к сумме размеров. Одиночный
// символ дополняется пробелом — иначе биграмм нет вовсе и формула делит на ноль.
function bigrams(value) {
  const padded = value.length === 1 ? value + " " : value;
  const set = new Set();
  for (let i = 0; i < padded.length - 1; i += 1) set.add(padded.slice(i, i + 2));
  return set;
}

function intersectionSize(first, second) {
  let size = 0;
  for (const item of first) if (second.has(item)) size += 1;
  return size;
}

export function diceSimilarity(first, second) {
  const left = normalizeForCompare(first);
  const right = normalizeForCompare(second);
  if (!left || !right) return 0;
  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  const total = leftGrams.size + rightGrams.size;
  if (!total) return 0;
  return (2 * intersectionSize(leftGrams, rightGrams)) / total;
}

// ─── МЕРА 2: ДЖАРО–ВИНКЛЕР (перенос natural/jaro-winkler_distance.js) ─────────────────────
//
// Окно совпадения — половина длины большей строки минус один; затем считаются транспозиции.
// Винклеровская надбавка вознаграждает общий префикс длиной до четырёх символов.
function jaroDistance(first, second) {
  if (typeof first !== "string" || typeof second !== "string") return 0;
  if (!first.length || !second.length) return 0;

  const window = Math.floor(Math.max(first.length, second.length) / 2) - 1;
  const matchedFirst = new Array(first.length);
  const matchedSecond = new Array(second.length);
  let matches = 0;

  for (let i = 0; i < first.length; i += 1) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, second.length);
    for (let k = start; k < end; k += 1) {
      if (matchedSecond[k]) continue;
      if (first[i] !== second[k]) continue;
      matchedFirst[i] = true;
      matchedSecond[k] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < first.length; i += 1) {
    if (!matchedFirst[i]) continue;
    while (!matchedSecond[k]) k += 1;
    if (first[i] !== second[k]) transpositions += 1;
    k += 1;
  }
  transpositions = transpositions / 2;

  return ((matches / first.length) + (matches / second.length) + ((matches - transpositions) / matches)) / 3;
}

export function jaroWinkler(first, second, options) {
  const settings = options || {};
  let left = first;
  let right = second;
  if (left === right) return 1;
  if (settings.ignoreCase) {
    left = String(left).toLowerCase();
    right = String(right).toLowerCase();
  }
  const jaro = settings.dj === undefined ? jaroDistance(left, right) : settings.dj;
  let prefix = 0;
  while (left[prefix] === right[prefix] && prefix < 4) prefix += 1;
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ─── ОТБОР ПОХОЖИХ ────────────────────────────────────────────────────────────────────────
//
// Пороги названы словами владельца, а не числами на экране. Число уверенности, которое никто
// не проверял, — это ровно то, за что план ругает `confidence: 0.7`; здесь оно остаётся внутри,
// а наружу выходит человеческая причина.
const LEVELS = [
  { from: 0.82, verdict: "дубль", reason: "почти дословно то же самое" },
  { from: 0.62, verdict: "уточнение", reason: "сильно похоже — похоже, ты уточняешь прежнюю мысль" },
  { from: 0.42, verdict: "рядом", reason: "та же тема" }
];

function levelFor(score) {
  return LEVELS.find((level) => score >= level.from) || null;
}

// Служебные записи не являются мыслями владельца. Без этого отбора «похожей мыслью» становится
// квитанция или событие установки PWA — та самая жалоба про «PWA BOOT» в графе.
function isOwnerThought(note) {
  if (!note || typeof note !== "object") return false;
  if (note.systemType) return false;
  if (note.kind === "receipt" || note.kind === "system") return false;
  return Boolean(textOf(note));
}

function textOf(note) {
  return [note.title, note.text, note.summary].filter(Boolean).join(" ").trim();
}

// Измерено на живой паре (2026-07-30): «месячный прогноз финансов» против «купить корм коту»
// даёт Дайс 0.098 — верно, мысли разные, — но Джаро–Винклер даёт 0.44. У JW высокий ПОЛ: любые
// две русские строки набирают около 0.45 просто на общих буквах. Значит одна шкала на две меры
// невозможна, и первая версия этого модуля ошибочно тащила несвязанное в «похожие».
//
// Разделение: относимость решает ДАЙС — он честно падает в ноль на разных темах. Джаро–Винклер
// оставлен ровно для одного случая, ради которого он и брался, — почти одинаковые заголовки
// (опечатка, другой порядок букв), и у него собственная высокая планка.
const JARO_NEAR_IDENTICAL = 0.88;

function scorePair(draft, note) {
  const dice = Math.max(diceSimilarity(draft, textOf(note)), note.title ? diceSimilarity(draft, note.title) : 0);
  if (!note.title) return dice;
  const titles = jaroWinkler(normalizeForCompare(draft).slice(0, 60), normalizeForCompare(note.title));
  return titles >= JARO_NEAR_IDENTICAL ? Math.max(dice, titles) : dice;
}

export function findSimilarThoughts(draft, notes, options) {
  const settings = options || {};
  const limit = settings.limit || 3;
  const minLength = settings.minLength === undefined ? 12 : settings.minLength;
  const text = String(draft || "").trim();
  // Короткий черновик похож на всё сразу. Пока владелец не написал хотя бы фразу, молчим.
  if (text.length < minLength) return [];

  const scored = [];
  for (const note of notes || []) {
    if (!isOwnerThought(note)) continue;
    if (settings.excludeId && note.id === settings.excludeId) continue;
    const score = scorePair(text, note);
    const level = levelFor(score);
    if (!level) continue;
    scored.push({
      id: note.id,
      title: note.title || textOf(note).slice(0, 60),
      createdAt: note.createdAt || note.date || "",
      score,
      verdict: level.verdict,
      reason: level.reason
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

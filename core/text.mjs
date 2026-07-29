// core/text.mjs — чистый слой LifeOS: текст, даты, идентификаторы.
//
// П7 срез 1. Здесь живут функции, которые НЕ ЗНАЮТ НИЧЕГО о состоянии, DOM и хранилище: они
// принимают значение и возвращают значение. Именно поэтому их можно вынести первыми — у модуля
// нет ни одной зависимости обратно в app.js, и цикла импортов не возникает.
//
// Правило слоя: если функции понадобилось состояние владельца, DOM или провайдер — ей здесь не
// место. Слой должен остаться таким, чтобы его можно было проверить без браузера вообще.
//
// Проверено разбором зависимостей перед выносом: все 21 функций ссылаются только
// друг на друга (см. PROGRESS.md, П7 срез 1).

export function now() {
  return new Date().toISOString();
}

export function todayKey() {
  return now().slice(0, 10);
}

export function dateKeyFromOffset(offsetDays) {
  const date = new Date(todayKey() + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function normalizeRuText(value) {
  return repairMojibake(String(value || "")).toLocaleLowerCase("ru-RU");
}

export function hasRuWord(text, word) {
  return new RegExp("(^|[^0-9a-z\\u0430-\\u044f\\u0451])" + word + "(?=$|[^0-9a-z\\u0430-\\u044f\\u0451])", "iu").test(text);
}

export function makeId(prefix) {
  const cryptoId = globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : "";
  const token = cryptoId ? cryptoId.replaceAll("-", "").slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return prefix + "_" + token;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const CP1251_EXTRA_BYTES = {
  0x0402: 0x80,
  0x0403: 0x81,
  0x201A: 0x82,
  0x0453: 0x83,
  0x201E: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x20AC: 0x88,
  0x2030: 0x89,
  0x0409: 0x8A,
  0x2039: 0x8B,
  0x040A: 0x8C,
  0x040C: 0x8D,
  0x040B: 0x8E,
  0x040F: 0x8F,
  0x0452: 0x90,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201C: 0x93,
  0x201D: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x2122: 0x99,
  0x0459: 0x9A,
  0x203A: 0x9B,
  0x045A: 0x9C,
  0x045C: 0x9D,
  0x045B: 0x9E,
  0x045F: 0x9F,
  0x00A0: 0xA0,
  0x040E: 0xA1,
  0x045E: 0xA2,
  0x0408: 0xA3,
  0x00A4: 0xA4,
  0x0490: 0xA5,
  0x00A6: 0xA6,
  0x00A7: 0xA7,
  0x0401: 0xA8,
  0x00A9: 0xA9,
  0x0404: 0xAA,
  0x00AB: 0xAB,
  0x00AC: 0xAC,
  0x00AD: 0xAD,
  0x00AE: 0xAE,
  0x0407: 0xAF,
  0x00B0: 0xB0,
  0x00B1: 0xB1,
  0x0406: 0xB2,
  0x0456: 0xB3,
  0x0491: 0xB4,
  0x00B5: 0xB5,
  0x00B6: 0xB6,
  0x00B7: 0xB7,
  0x0451: 0xB8,
  0x2116: 0xB9,
  0x0454: 0xBA,
  0x00BB: 0xBB,
  0x0458: 0xBC,
  0x0405: 0xBD,
  0x0455: 0xBE,
  0x0457: 0xBF
};

// Байт CP1251 по коду символа. Нужна repairMojibake и вынесена вместе с ней: она тоже часть
// чистого слоя — принимает число, возвращает число, о состоянии не знает ничего.
function cp1251ByteForCodePoint(codePoint) {
  if (codePoint >= 0x0410 && codePoint <= 0x044F) return 0xC0 + codePoint - 0x0410;
  if (Object.prototype.hasOwnProperty.call(CP1251_EXTRA_BYTES, codePoint)) return CP1251_EXTRA_BYTES[codePoint];
  if (codePoint >= 0 && codePoint <= 0x7F) return codePoint;
  return -1;
}

// Вспомогательная для repairMojibake. Вынесена вместе с ней не по красоте, а по факту:
// она передаётся ССЫЛКОЙ в .replace(), и первый разбор зависимостей её не увидел — он
// искал только `имя(`. Гейт поймал это на первом же прогоне.
function decodeMojibakeRun(run) {
  const bytes = [];
  for (const char of run) {
    const code = char.codePointAt(0);
    const byte = cp1251ByteForCodePoint(code);
    if (byte < 0) return run;
    bytes.push(byte);
  }
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
  if (!decoded || decoded.includes("\uFFFD")) return run;
  const decodedCyrillic = (decoded.match(/[А-Яа-яЁё]/g) || []).length;
  const sourceSignals = (run.match(/[РС]/g) || []).length + (run.match(/[в]/g) || []).length;
  return decodedCyrillic >= 1 && sourceSignals >= 1 ? decoded : run;
}

export function repairMojibake(value) {
  const text = String(value == null ? "" : value);
  if (!/[РС]|\bв[А-Яа-яЁёЂ-џ]/.test(text)) return text;
  return text.replace(/[РС][А-Яа-яЁёЂ-џ№«»°·]+|в[А-Яа-яЁёЂ-џ№«»°·]+/g, decodeMojibakeRun);
}

export function escapeHtml(value) {
  return repairMojibake(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function cleanLine(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

export function shorten(value, maxLength) {
  const clean = cleanLine(value);
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "...";
}

export function normalizeTitle(value) {
  return cleanLine(value).toLocaleLowerCase();
}

export function chunkString(value, size) {
  const chunks = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks.length ? chunks : [""];
}

export function extensionForName(name) {
  const match = String(name || "").toLocaleLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

export function stripExtension(name) {
  return cleanLine(String(name || "Imported source").replace(/\.[^.]+$/, "")) || "Imported source";
}

export function uniqueCleanItems(items, limit) {
  const seen = new Set();
  const result = [];
  for (const item of items || []) {
    const value = cleanLine(item);
    if (!value) continue;
    const key = normalizeTitle(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

// Снятая команда не должна оставлять строчную букву: «Надо ответить Дмитрию» превращалось в
// «ответить Дмитрию до среды», и список дел выглядел сломанным. Заглавную ставим только когда
// первая буква действительно строчная — чужие названия и аббревиатуры не трогаем.
export function capitalizeFirstLetter(text) {
  const clean = cleanLine(text);
  if (!clean) return clean;
  const first = clean[0];
  const upper = first.toLocaleUpperCase("ru-RU");
  return upper === first ? clean : upper + clean.slice(1);
}

// Слова владельца без знаков и регистра. Цитата обязана найтись в исходнике ДОСЛОВНО: пересказ
// цитатой не считается. Это и есть защита от выдуманного намерения — правило одинаково строго
// и к регулярке, и к модели, которая «уверена».
export function speechProvenanceKey(text) {
  return String(text || "").toLocaleLowerCase("ru-RU").replace(/[^0-9a-zа-яё]+/gi, "");
}

// Срез 5: русская плюрализация в app.js (ui/components/shared.js's plural недоступен здесь).
export function pluralRu(value, one, few, many) {
  const n = Math.abs(Number(value || 0)) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

// П5: секунда в записи — это ФАКТ движка расшифровки, а не догадка по длине строки. whisper.cpp
// отдаёт её сам, если попросить `verbose_json` (замер 2026-07-28: у каждого сегмента есть start
// и end с точностью до сотых). Обратный путь «вывод → цитата → секунда» держится именно на этом:
// угаданное время увело бы владельца не туда и молча — худший вид ошибки в провенансе.
export function secondsToTimecode(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return hours ? hours + ":" + pad(minutes) + ":" + pad(rest) : minutes + ":" + pad(rest);
}

export function parseTimecodeToSeconds(timecode) {
  const parts = String(timecode || "").trim().split(":").map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return NaN;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

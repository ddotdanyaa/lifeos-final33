// Русский текст: основы слов, экранирование, нормализация.
// Основа = первые 5 букв. Проверено на практике: иначе «машину» и «машины» не встречаются
// в одной теме. Словарь тут не нужен и вреден — правило работает на любом слове.

export const STOP = new Set([
  "это", "тогда", "потом", "очень", "нужно", "надо", "быть", "есть", "весь", "всё", "все",
  "который", "когда", "если", "чтобы", "также", "такой", "туда", "сюда", "сегодня", "вчера",
  "завтра", "сейчас", "здесь", "там", "меня", "тебя", "него", "неё", "себя", "свой", "мой"
]);

export function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function clean(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

export function shorten(value, limit) {
  const text = clean(value);
  return text.length > limit ? text.slice(0, limit - 1) + "…" : text;
}

// Слова длиннее трёх букв, без стоп-слов и без цифр.
export function words(text) {
  return String(text || "").toLowerCase()
    .split(/[^а-яёa-z0-9]+/i)
    .filter((word) => word.length > 3 && !STOP.has(word) && !/^\d+$/.test(word));
}

export function stem(word) {
  return String(word || "").toLowerCase().slice(0, 5);
}

export function stems(text) {
  return new Set(words(text).map(stem));
}

// Пересечение по Жаккару на основах. Именно основы, а не слова целиком: русское слово
// расходится в хвосте, и сравнение целых слов даёт ноль там, где смысл один.
export function overlap(a, b) {
  const left = a instanceof Set ? a : stems(a);
  const right = b instanceof Set ? b : stems(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared += 1;
  return shared / (left.size + right.size - shared);
}

// Кириллица не знает \b в JavaScript — регулярка с \b по-русски не работает вовсе.
// Поэтому границы слова задаются явными lookaround'ами.
export function hasWord(text, pattern) {
  return new RegExp(`(?<![А-Яа-яЁёA-Za-z])(?:${pattern})(?![А-Яа-яЁёA-Za-z])`, "i").test(String(text || ""));
}

// Предложения — единица цитирования. Вывод без цитаты проверить нечем.
export function sentences(text) {
  return String(text || "")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map(clean)
    .filter((item) => item.length > 2);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

// Дата-ключ всегда разбирается с суффиксом Z. Местная полночь, прочитанная в UTC, уводит
// день на сутки — ошибка не воспроизводится в UTC и потому живёт долго.
export function dayKey(iso) {
  return String(iso || "").slice(0, 10);
}

export function daysBetween(isoA, isoB) {
  const a = Date.parse(dayKey(isoA) + "T00:00:00Z");
  const b = Date.parse(dayKey(isoB) + "T00:00:00Z");
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

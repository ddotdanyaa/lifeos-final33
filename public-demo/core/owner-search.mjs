// core/owner-search.mjs — ПОИСК, КОТОРЫЙ НАХОДИТ.
//
// Боль владельца 2026-07-30, дословно: «И вот этот поиск сверху „найти“, зачем он? Что я тут
// должен описать? Граф, вот я написал, найти граф. Ничего не находит, чего? Тридцать напишу.
// Расшифровка тридцать, он тоже не находит».
//
// Диагноз оказался хуже жалобы. `searchQuery` кладётся в состояние (`app.js:2325`) и рисуется
// обратно в поле (`ui/shell.js:334`) — и БОЛЬШЕ ЕГО НЕ ЧИТАЕТ НИКТО. Поиск не «плохо ищет»: он
// не ищет вообще. Поле было украшением.
//
// ВНЕДРЕНИЕ ДОНОРА. `Fuse.js` v7.5.0 (Apache-2.0, Kiro Risk) — целиком, готовой браузерной
// сборкой: `ui/vendor/fuse.mjs`, 19 КБ, без зависимостей и без шага сборки. Ровно тот случай,
// когда «внедрить папкой» возможно: донор сам отдаёт ESM-файл, который браузер грузит как есть.
// Лицензия прочитана файлом `research/repos/Fuse/LICENSE`, шапка с копирайтом в файле сохранена.
//
// Почему Fuse, а не `minisearch`, который уже в зависимостях: minisearch ищет по СЛОВАМ через
// индекс, и «30» в нём не найдётся, если слово в тексте склеено («запись30», «№30»). Fuse ищет
// по подстроке с опечатками — это то поведение, которого владелец ждёт от строки «Найти».
//
// Слой чистый: данные на входе, найденное на выходе. Ни DOM, ни хранилища.
import Fuse from "../ui/vendor/fuse.mjs";
import { looksTechnical } from "./people-filter.mjs";

// Разделы владельца, а не коллекции движка: он ищет «свою мысль», «свою задачу», «свой файл»,
// и ответ должен быть сгруппирован теми же словами, которыми подписаны разделы.
const GROUPS = [
  { key: "notes", label: "Записи", fields: ["title", "text", "summary"] },
  { key: "tasks", label: "Задачи", fields: ["title", "text"] },
  { key: "sources", label: "Файлы и записи", fields: ["title", "name", "text"] },
  { key: "goals", label: "Цели", fields: ["title", "text"] }
];

const FUSE_OPTIONS = {
  includeScore: true,
  // Сценарий 6: владелец спрашивает «что я говорил про Claude?» и обязан видеть, ПОЧЕМУ строка
  // попала в ответ. Без этого поиск остаётся чёрным ящиком, который иногда угадывает. Fuse
  // умеет вернуть совпавшее поле — берём его и показываем словами.
  includeMatches: true,
  ignoreLocation: true,
  // 0 — только точное совпадение, 1 — найдётся что угодно. 0.38 подобрано так, чтобы «расшифровка
  // тридцать» находило «Новая запись 30 расшифровка», но «корм коту» не находило «прогноз».
  threshold: 0.38,
  minMatchCharLength: 2
};

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

// Совпавшее поле человеческим словом. Ключи структуры вроде text или summary владельцу ничего
// не говорят — он думает не полями, а тем, где именно встретилось слово.
const FIELD_WORDS = {
  title: "в названии",
  text: "в тексте",
  summary: "в кратком пересказе",
  name: "в имени файла"
};

function whyMatched(hit) {
  const matches = Array.isArray(hit.matches) ? hit.matches : [];
  const words = [];
  for (const match of matches) {
    const word = FIELD_WORDS[match.key];
    if (word && !words.includes(word)) words.push(word);
  }
  // Совпадения нет в списке полей — честнее промолчать, чем придумать причину.
  return words.length ? words.join(" и ") : "";
}

function titleOf(item) {
  return item.title || item.name || item.text || "без названия";
}

// Ключ для склейки дублей: расширение файла и регистр не делают два результата разными.
function normalizeTitleForDedup(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\.(md|txt|m4a|mp3|wav|ogg|pdf|png|jpe?g|json)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Служебные записи не ищутся: владелец ищет свою жизнь, а не журнал системы. Тот же словарь,
// что у счётчика людей и у правой колонки объекта — одна болезнь, одно лекарство.
function isOwnerItem(item) {
  if (!item || typeof item !== "object") return false;
  if (item.deleted) return false;
  if (item.systemType) return false;
  return !looksTechnical(titleOf(item));
}

export function searchOwnerData(query, data, options) {
  const settings = options || {};
  const perGroup = settings.perGroup || 4;
  const text = String(query || "").trim();
  // Одна буква совпадает со всем подряд — ответ на неё был бы шумом, а не поиском.
  if (text.length < 2) return [];

  const groups = [];
  // Дефект, вскрытый первым же снимком: один захват рождает и запись, и файл-исходник, поэтому
  // мысль показывалась дважды — «Мысль про граф знаний» и «Мысль про граф знаний.md». Владелец
  // видит один и тот же результат два раза и перестаёт понимать, сколько у него всего. Первое
  // вхождение выигрывает: разделы перечислены в порядке близости к владельцу, и «Записи» стоят
  // раньше «Файлов».
  const seen = new Set();
  const seenKey = (title) => normalizeTitleForDedup(title);
  for (const group of GROUPS) {
    const items = asArray(data && data[group.key]).filter(isOwnerItem);
    if (!items.length) continue;
    const fuse = new Fuse(items, { ...FUSE_OPTIONS, keys: group.fields });
    const hits = fuse.search(text).filter((hit) => {
      const key = seenKey(titleOf(hit.item));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, perGroup);
    if (!hits.length) continue;
    groups.push({
      key: group.key,
      label: group.label,
      rows: hits.map((hit) => ({
        id: hit.item.id,
        title: titleOf(hit.item),
        // Балл наружу не выводим: «0,17» владельцу ничего не говорит. Наружу идёт порядок.
        score: hit.score,
        // Дата — первое, по чему владелец узнаёт свою запись. «Мысль про граф» без даты
        // неотличима от такой же мысли месячной давности.
        when: String(hit.item.day || hit.item.createdAt || "").slice(0, 10),
        // Почему нашлось: имя поля человеческим словом, не ключ структуры.
        why: whyMatched(hit)
      }))
    });
  }
  return groups;
}

export function countFound(groups) {
  return (groups || []).reduce((sum, group) => sum + group.rows.length, 0);
}

// core/owner-themes.mjs — ВЫВОДЫ О ТОМ, ЧТО ВЛАДЕЛЕЦ ДУМАЕТ.
//
// Чистый слой: на входе состояние, на выходе список выводов. Ни рендера, ни хранилища, ни
// побочных эффектов — поэтому проверяется без браузера и не растит монолит.
import { cleanLine, shorten, todayKey, dateKeyFromOffset, normalizeRuText } from "./text.mjs";
import { RU_CAPTURE_STOPWORDS } from "./ru-entities.mjs";
import { speechClauses } from "./speech-intents.mjs";

// ─── ВЫВОДЫ О ТОМ, ЧТО ВЛАДЕЛЕЦ ДУМАЕТ ────────────────────────────────────────────────────
//
// Блок назывался «Инсайты», а показывал «11 связей». Связь — это не вывод. Вывод звучит так:
// «третий день подряд ты возвращаешься к памяти» или «все сегодняшние записи об одном».
// Первое — наблюдение о его мышлении, второе — число из базы данных.
//
// Считаем по ЕГО СЛОВАМ и только по ним: расшифровки и заметки, ничего досчитанного. Тема — это
// значимое слово, которое он произнёс сам; служебные зачины речи и общие глаголы отброшены тем
// же словарём, что и в разборе людей, — иначе «сегодня» и «надо» станут главными темами месяца.
const THEME_MIN_DAYS = 3;
const THEME_WINDOW_DAYS = 7;

export function ownerWordsByDay(state, systemFolderId) {
  const byDay = new Map();
  const add = (day, text, noteId) => {
    const key = cleanLine(day);
    if (!key || !text) return;
    if (!byDay.has(key)) byDay.set(key, { day: key, texts: [], noteIds: [] });
    byDay.get(key).texts.push(String(text));
    if (noteId) byDay.get(key).noteIds.push(noteId);
  };
  for (const source of Object.values(state.sources || {})) {
    if (!source || source.deleted) continue;
    add(String(source.createdAt || "").slice(0, 10), source.transcriptText || source.text || "", source.noteId);
  }
  for (const note of Object.values(state.notes || {})) {
    if (!note || note.deleted) continue;
    // Тело расшифровки уже учтено через источник — второй раз тема не считается.
    if (Object.values(state.sources || {}).some((item) => item && item.noteId === note.id)) continue;
    // Документация LifeOS о самом себе — не мысли владельца. Без этой строки вывод звучал так:
    // «Сегодня ты думаешь об одном: LifeOS Product Brain», потому что 17 из 37 «сегодняшних»
    // записей завёл сам продукт при первом запуске. Считаем только то, что владелец сказал сам.
    if (systemFolderId && note.folderId === systemFolderId) continue;
    // Заметки, которые платформа завела о собственных структурах, тоже не мысли владельца.
    // Отсутствие пометки означает «это писал он» — так старые заметки остаются учтёнными.
    if (note.origin === "system") continue;
    // Заголовок заметки часто — начало её тела. Склейка «заголовок + тело» тогда удваивала первую
    // фразу, и цитата в выводе выглядела сломанной: «…связаны сильнее, чем Память и провенан…».
    const body = String(note.body || "");
    const title = String(note.title || "");
    const text = body.startsWith(title) ? body : (title + " " + body);
    add(String(note.createdAt || "").slice(0, 10), text, note.id);
  }
  return byDay;
}

// Значимые слова фразы: то, о ЧЁМ она, без служебного каркаса речи.
export function themeWords(text) {
  const words = normalizeRuText(text).split(/[^0-9a-zа-яё]+/i);
  const seen = new Set();
  for (const word of words) {
    if (word.length < 5) continue;
    if (RU_CAPTURE_STOPWORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    // Основа вместо словоформы: «память», «памяти», «памятью» должны быть ОДНОЙ темой. На шести
    // знаках они расходятся («память» ≠ «памяти»), на пяти сходятся — проверено на живых
    // записях, а не выведено из головы.
    seen.add(word.slice(0, 5));
  }
  return seen;
}

export function ownerThemeInsights(state, systemFolderId) {
  const byDay = ownerWordsByDay(state, systemFolderId);
  const window = new Set();
  for (let offset = 0; offset > -THEME_WINDOW_DAYS; offset -= 1) window.add(dateKeyFromOffset(offset));
  const themeDays = new Map();
  for (const [day, row] of byDay) {
    if (!window.has(day)) continue;
    for (const text of row.texts) {
      for (const stem of themeWords(text)) {
        if (!themeDays.has(stem)) themeDays.set(stem, { stem, days: new Set(), sample: "", sampleDay: "", noteIds: [] });
        const bucket = themeDays.get(stem);
        bucket.days.add(day);
        bucket.noteIds.push(...row.noteIds);
        // Цитата берётся из САМОГО СВЕЖЕГО дня темы, а не из первого попавшегося. Владелец
        // читает вывод сегодня — и хочет узнать в нём свои сегодняшние слова, а не позапрошлые.
        if (!bucket.sampleDay || day >= bucket.sampleDay) {
          const phrase = speechClauses(String(text)).find((line) => normalizeRuText(line).includes(stem));
          if (phrase || !bucket.sample) {
            bucket.sample = cleanLine(phrase || text);
            bucket.sampleDay = day;
          }
        }
      }
    }
  }
  const insights = [];
  for (const bucket of themeDays.values()) {
    if (bucket.days.size < THEME_MIN_DAYS) continue;
    insights.push({
      id: "theme-" + bucket.stem,
      type: "theme",
      icon: "🧭",
      title: "Ты возвращаешься к этому " + bucket.days.size + "-й день: «" + shorten(bucket.sample, 60) + "»",
      // Вывод обязан объяснять СЕБЯ: сколько дней, из чего собран. Без этого он неотличим от
      // догадки, а догадке владелец верить не должен.
      detail: "Тема звучала в записях " + bucket.days.size + " разных дней — это уже не случайность",
      confidence: bucket.days.size >= 4 ? "высокая" : "средняя",
      refs: [...new Set(bucket.noteIds)].slice(0, 5)
    });
  }
  // Однотемный день: все сегодняшние записи об одном. Это вывод про фокус, а не про количество.
  const todayRow = byDay.get(todayKey());
  if (todayRow && todayRow.texts.length >= 3) {
    const counts = new Map();
    for (const text of todayRow.texts) {
      for (const stem of themeWords(text)) counts.set(stem, (counts.get(stem) || 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    // Два условия сразу, и оба нужны. Только доля — вывод не появлялся никогда: любой день
    // разбавлен записями о другом. Только абсолют — вывод срабатывал ложно на большой базе, где
    // три записи об одном набираются случайно. Фокус — это когда об одном И не меньше трёх раз,
    // И это половина дня.
    if (top && top[1] >= 3 && top[1] * 2 >= todayRow.texts.length) {
      const sample = todayRow.texts.find((text) => normalizeRuText(text).includes(top[0])) || "";
      insights.push({
        id: "today-one-theme",
        type: "theme",
        icon: "🎯",
        title: "Сегодня ты думаешь об одном: «" + shorten(cleanLine(sample), 60) + "»",
        detail: top[1] + " из " + todayRow.texts.length + " сегодняшних записей об этом",
        confidence: "высокая",
        refs: [...new Set(todayRow.noteIds)].slice(0, 5)
      });
    }
  }
  return insights;
}

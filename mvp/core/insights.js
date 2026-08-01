// Выводы. Инсайт — это НАБЛЮДЕНИЕ, а не число: «третий день подряд про память» вместо
// «11 связей». Число из базы данных владельцу ничего не говорит.
//
// Правила, без которых панель врёт:
//   • вывод собирается минимум из ДВУХ записей в РАЗНЫЕ дни. Один вечерний дамп из двадцати
//     мыслей иначе сам себе создаёт «повторы»;
//   • у вывода всегда есть основания — записи с датами, до которых можно дойти;
//   • отклонённый владельцем вывод не возвращается.
import { dayKey, daysBetween, overlap, shorten, stems, words } from "./text.js";

const MIN_RECORDS = 2;
const MIN_DAYS = 2;
const SIMILAR = 0.18;

export function computeInsights(state) {
  const records = Object.values(state.records || {}).filter((row) => !row.deleted);
  if (records.length < MIN_RECORDS) return [];
  const dismissed = new Set(state.dismissedInsights || []);
  const out = [];

  out.push(...themes(records));
  out.push(...repeats(state, records));
  out.push(...openQuestions(state));

  return out
    .filter((item) => !dismissed.has(item.id))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}

// Тема — слово-основа, встречающееся в записях РАЗНЫХ дней. Это и есть «ты возвращаешься
// к этому третий день».
function themes(records) {
  const byStem = new Map();
  for (const record of records) {
    for (const word of new Set(words(record.text))) {
      const key = word.slice(0, 5);
      if (!byStem.has(key)) byStem.set(key, { word, days: new Set(), refs: [] });
      const bucket = byStem.get(key);
      bucket.days.add(dayKey(record.createdAt));
      if (bucket.refs.length < 5) bucket.refs.push(record.id);
    }
  }
  const out = [];
  for (const [, bucket] of byStem) {
    if (bucket.days.size < MIN_DAYS) continue;
    const days = bucket.days.size;
    out.push({
      id: `theme:${bucket.word.slice(0, 5)}`,
      kind: "тема",
      title: `Ты возвращаешься к «${bucket.word}» ${days} ${plural(days, "день", "дня", "дней")}`,
      detail: `Это уже не разовая мысль. Записи разных дней — значит тема, а не настроение.`,
      refs: bucket.refs,
      // Уверенность растёт от числа дней, но не превышает 0.95: наблюдение не факт.
      confidence: Math.min(0.95, 0.6 + days * 0.08)
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

// Повтор — две записи разных дней, похожие по смыслу. Это кандидат в дубль, и владелец
// должен решить сам: объединить или это разное.
function repeats(state, records) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = records[i];
      const b = records[j];
      if (dayKey(a.createdAt) === dayKey(b.createdAt)) continue;
      const score = overlap(stems(a.text), stems(b.text));
      if (score < SIMILAR) continue;
      const id = `repeat:${a.id}:${b.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        kind: "повтор",
        title: `Похоже, ты писал об этом дважды`,
        detail: `«${shorten(a.text, 44)}» и «${shorten(b.text, 44)}» — совпадение ${Math.round(score * 100)}%, разница ${Math.abs(daysBetween(a.createdAt, b.createdAt))} дн.`,
        refs: [a.id, b.id],
        confidence: Math.min(0.9, 0.5 + score)
      });
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

// Незакрытая петля: сомнение, которое владелец так и не разрешил.
function openQuestions(state) {
  const open = Object.values(state.facts || {})
    .filter((row) => row.type === "сомнение" && row.status === "open");
  if (!open.length) return [];
  return [{
    id: "openloop:doubts",
    kind: "незакрытое",
    title: `${open.length} ${plural(open.length, "вопрос ждёт", "вопроса ждут", "вопросов ждут")} твоего ответа`,
    detail: open.slice(0, 2).map((row) => `«${shorten(row.title, 40)}»`).join("; "),
    refs: open.map((row) => row.recordId).slice(0, 5),
    confidence: 0.88
  }];
}

function plural(n, one, few, many) {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
  return many;
}

// Похожие записи для экрана захвата: «уже было». Показывается ДО создания, чтобы владелец
// решал до, а не разгребал после.
export function findSimilar(state, text, excludeId) {
  const target = stems(text);
  if (!target.size) return [];
  return Object.values(state.records || {})
    .filter((row) => !row.deleted && row.id !== excludeId)
    .map((row) => ({ record: row, score: overlap(target, stems(row.text)) }))
    .filter((row) => row.score >= SIMILAR)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

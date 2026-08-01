// Разбор записи: текст → отдельные выводы. Тип владелец не выбирает никогда.
//
// Главное правило: у КАЖДОГО вывода есть цитата — предложение, из которого он взят. Вывод без
// цитаты нечем проверить, а непроверяемый вывод хуже отсутствующего: он выглядит знанием.
//
// Второе правило: уверенность честная. Ниже порога вывод не утверждается, а спрашивается.
import { clean, hasWord, sentences, shorten, words } from "./text.js";

export const GATE = 0.75;

// Инфинитив в начале фразы = дело. Правило языка, а не словарь: покрывает любой глагол.
const INFINITIVE = /^(?:надо\s+|нужно\s+|хочу\s+|стоит\s+|)([а-яё]{3,}[аеёиоуыэюя]ть)\b/i;
const OBLIGATION = "надо|нужно|должен|должна|обязан|не забыть|запланировать";
const DOUBT = "может быть|наверное|не уверен|не знаю|сомневаюсь|или всё-таки|думаю стоит ли";
const PROBLEM = "не работает|сломал|сломан|бесит|достал|проблема|плохо|не получается|мешает";
const DECISION = "решил|решила|передумал|выбрал|выбрала|отказался|отказалась|беру|остановился";
const DONE = "сделал|сделала|закончил|получил|получила|отправил|купил|купила|пришло|устроился";
const IDEA = "идея|придумал|придумала|а что если|можно было бы|интересно было бы";

// Границу слова задаёт lookahead, а НЕ \b: в JavaScript \b считает словом только [A-Za-z0-9_],
// поэтому после «рублей» границы нет вовсе и вся регулярка молча не срабатывает.
const MONEY = /(\d[\d\s]{0,9}?)\s*(?:₽|руб(?:лей|ля|\.)?|тыс(?:яч)?|к)(?![а-яёa-z])/i;
const NAME = /(?<![А-Яа-яЁё])([А-ЯЁ][а-яё]{2,})(?![А-Яа-яЁё])/g;

// Имена собственные, которые именами людей не являются. Список короткий и закрытый —
// открытый словарь тут врёт чаще, чем помогает.
const NOT_NAME = new Set([
  "Сегодня", "Вчера", "Завтра", "Утром", "Вечером", "Днём", "Ночью", "Понедельник", "Вторник",
  "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье", "Январь", "Москва", "Питер", "Россия"
]);

function fact(type, title, quote, confidence, why) {
  return { type, title: clean(title), quote: clean(quote), confidence, why };
}

// Один разбор — много смыслов. Одна фраза может дать и задачу, и расход: это не конфликт,
// это две разные проекции одного предложения.
export function analyze(text) {
  const found = [];
  const lines = sentences(text);
  if (!lines.length) return found;

  for (const line of lines) {
    const infinitive = line.match(INFINITIVE);
    if (infinitive || hasWord(line, OBLIGATION)) {
      found.push(fact("задача", line, line, hasWord(line, OBLIGATION) ? 0.86 : 0.78,
        infinitive ? `глагол «${infinitive[1]}» в начале фразы` : "слово обязательства"));
    }

    const money = line.match(MONEY);
    if (money) {
      const amount = Number(String(money[1]).replace(/\s/g, ""));
      if (amount > 0) {
        found.push(fact("расход", `${amount.toLocaleString("ru-RU")} ₽ — ${shorten(line, 40)}`, line, 0.9,
          "названа сумма"));
      }
    }

    if (hasWord(line, DECISION)) {
      found.push(fact("решение", line, line, 0.82, "слово решения"));
    }
    if (hasWord(line, PROBLEM)) {
      found.push(fact("проблема", line, line, 0.8, "слово проблемы"));
    }
    if (hasWord(line, IDEA)) {
      found.push(fact("идея", line, line, 0.76, "слово идеи"));
    }
    if (hasWord(line, DOUBT)) {
      // Сомнение — не задача. Ниже порога намеренно: система обязана спросить, а не решить.
      found.push(fact("сомнение", line, line, 0.62, "слово сомнения — это вопрос, а не решение"));
    }
    if (hasWord(line, DONE)) {
      found.push(fact("свершилось", line, line, 0.84, "действие уже совершено"));
    }

    for (const match of line.matchAll(NAME)) {
      const name = match[1];
      if (NOT_NAME.has(name) || line.indexOf(name) === 0) continue;
      found.push(fact("человек", name, line, 0.7, "имя с заглавной буквы в середине фразы"));
    }
  }

  // Если ничего не распознано — это не провал разбора, а мысль. Метка «не понял» должна быть
  // правдой, а не отговоркой: мысль остаётся полноценной записью.
  if (!found.length) {
    found.push(fact("мысль", shorten(text, 70), lines[0], 0.72, "обязательства и суммы не найдены — это мысль"));
  }

  return dedupe(found);
}

// Один и тот же смысл из одной фразы дважды не выводится: «Потратил 800 на такси» не должно
// дать и расход, и отдельную мысль с тем же текстом.
function dedupe(list) {
  const seen = new Map();
  for (const item of list) {
    const key = `${item.type}|${item.title.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()].slice(0, 7);
}

export function isQuestion(item) {
  return item.confidence < GATE;
}

export function keyTerms(text) {
  const counts = new Map();
  for (const word of words(text)) counts.set(word, (counts.get(word) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map((row) => row[0]);
}

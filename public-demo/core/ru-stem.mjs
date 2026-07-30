// core/ru-stem.mjs — РУССКАЯ ОСНОВА СЛОВА.
//
// Проблема, ради которой это написано: темы считались обрезкой слова до пяти знаков. На живых
// записях это склеивает разное — «память» и «памятник» дают одно «памят», «стройка» и
// «стройный» одно «строй», — и тема графа начинает врать, объединяя записи ни о чём общем.
//
// Донор — алгоритм Портера для русского (Snowball, M.F. Porter / Snowball-проект). Взят
// АЛГОРИТМ, а не код: описание опубликовано, реализация здесь своя под наш стек.
//
// Почему не Az.js, который стоял в очереди: это 9,7 МБ словаря в локально-первое приложение,
// которое обязано работать офлайн и грузиться браузером напрямую. Словарная лемматизация точнее
// на исключениях, но платить за это девятью мегабайтами в оболочке нельзя. Порядок тот же, что
// у любого донора: разобрали, сравнили, выбрали под свой стек.
//
// Слой чистый: на входе слово, на выходе основа.

const VOWELS = "аеиоуыэюя";

const PERFECTIVE_GERUND_1 = /(в|вши|вшись)$/;         // только после а/я
const PERFECTIVE_GERUND_2 = /(ив|ивши|ившись|ыв|ывши|ывшись)$/;
const ADJECTIVE = /(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/;
const PARTICIPLE_1 = /(ем|нн|вш|ющ|щ)$/;              // только после а/я
const PARTICIPLE_2 = /(ивш|ывш|ующ)$/;
const REFLEXIVE = /(ся|сь)$/;
const VERB_1 = /(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)$/;  // только после а/я
const VERB_2 = /(ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|уют|ит|ыт|ены|ить|ыть|ишь|ую|ю)$/;
const NOUN = /(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/;
const SUPERLATIVE = /(ейш|ейше)$/;
const DERIVATIONAL = /(ост|ость)$/;
const I_ENDING = /и$/;
const SOFT_SIGN = /ь$/;
const DOUBLE_N = /нн$/;

// RV — часть слова после первой гласной. R2 — часть после второй последовательности
// «гласная→согласная». Обе нужны, чтобы не срезать окончание у короткого корня.
function regions(word) {
  let rv = "";
  let rvStart = 0;
  for (let i = 0; i < word.length; i += 1) {
    if (VOWELS.includes(word[i])) {
      rvStart = i + 1;
      rv = word.slice(rvStart);
      break;
    }
  }
  let r1Start = word.length;
  for (let i = 1; i < word.length; i += 1) {
    if (!VOWELS.includes(word[i]) && VOWELS.includes(word[i - 1])) {
      r1Start = i + 1;
      break;
    }
  }
  let r2Start = word.length;
  for (let i = r1Start + 1; i < word.length; i += 1) {
    if (!VOWELS.includes(word[i]) && VOWELS.includes(word[i - 1])) {
      r2Start = i + 1;
      break;
    }
  }
  return { rv, rvStart, r2: word.slice(r2Start) };
}

// Срез в RV: окончание отрезается только если оно целиком лежит за первой гласной. Без этого
// у слов вроде «еда» съедался бы корень.
function cutRv(word, rvStart, match) {
  return word.slice(0, word.length - match.length) || word;
}

function tryAdjectival(word, rvStart) {
  const rv = word.slice(rvStart);
  const adj = rv.match(ADJECTIVE);
  if (!adj) return null;
  let stem = cutRv(word, rvStart, adj[0]);
  const stemRv = stem.slice(rvStart);
  const part2 = stemRv.match(PARTICIPLE_2);
  if (part2) return cutRv(stem, rvStart, part2[0]);
  const part1 = stemRv.match(PARTICIPLE_1);
  // Причастия на «ем/нн/вш/ющ/щ» отрезаются только после а/я — правило Snowball, без него
  // «военный» теряет корень.
  if (part1 && /[ая]$/.test(stem.slice(0, stem.length - part1[0].length))) {
    return cutRv(stem, rvStart, part1[0]);
  }
  return stem;
}

export function stemRu(input) {
  let word = String(input || "").toLowerCase().replace(/ё/g, "е");
  if (!/^[а-я]+$/.test(word) || word.length < 4) return word;

  const { rvStart } = regions(word);
  if (!rvStart) return word;

  // Шаг 1: деепричастие → возвратность+прилагательное → глагол → существительное.
  let step1 = null;
  const rv = word.slice(rvStart);
  const ger2 = rv.match(PERFECTIVE_GERUND_2);
  const ger1 = rv.match(PERFECTIVE_GERUND_1);
  if (ger2) {
    step1 = cutRv(word, rvStart, ger2[0]);
  } else if (ger1 && /[ая]$/.test(word.slice(0, word.length - ger1[0].length))) {
    step1 = cutRv(word, rvStart, ger1[0]);
  }

  if (step1 === null) {
    let base = word;
    const refl = base.slice(rvStart).match(REFLEXIVE);
    if (refl) base = cutRv(base, rvStart, refl[0]);

    const adjectival = tryAdjectival(base, rvStart);
    if (adjectival !== null) {
      step1 = adjectival;
    } else {
      const baseRv = base.slice(rvStart);
      const verb2 = baseRv.match(VERB_2);
      const verb1 = baseRv.match(VERB_1);
      if (verb2) {
        step1 = cutRv(base, rvStart, verb2[0]);
      } else if (verb1 && /[ая]$/.test(base.slice(0, base.length - verb1[0].length))) {
        step1 = cutRv(base, rvStart, verb1[0]);
      } else {
        const noun = baseRv.match(NOUN);
        step1 = noun ? cutRv(base, rvStart, noun[0]) : base;
      }
    }
  }

  // Шаг 2: снять «и».
  let result = step1;
  const iMatch = result.slice(rvStart).match(I_ENDING);
  if (iMatch) result = cutRv(result, rvStart, iMatch[0]);

  // Шаг 3: снять «ость/ост» — только если оно лежит в R2 (иначе корень рушится).
  const r2 = regions(result).r2;
  const derivational = r2.match(DERIVATIONAL);
  if (derivational) result = result.slice(0, result.length - derivational[0].length) || result;

  // Шаг 4: «нн» → «н», превосходная степень, мягкий знак.
  if (DOUBLE_N.test(result)) {
    result = result.slice(0, -1);
  } else {
    const sup = result.slice(rvStart).match(SUPERLATIVE);
    if (sup) {
      result = cutRv(result, rvStart, sup[0]);
      if (DOUBLE_N.test(result)) result = result.slice(0, -1);
    } else if (SOFT_SIGN.test(result)) {
      result = result.slice(0, -1);
    }
  }
  return result || word;
}

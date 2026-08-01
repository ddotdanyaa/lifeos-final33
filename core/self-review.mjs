// СРЕЗ Д · ЧТО СИСТЕМА ПОНЯЛА О СЕБЕ.
//
// Владелец 2026-07-31: «система сама будет писать, что ей нужно далее для разработки».
//
// Это второй цикл, не тот, что уже работает. Первый учится на данных владельца и делает
// предложения точнее. Второй смотрит на СВОИ ошибки и называет, что стоит починить в самом
// продукте. Ничего не вычисляется заново: калибровка, антилесть, канарейка и счётчик экранов
// уже посчитаны в ядре — сюда приходят готовые числа, а здесь из них собираются наблюдения.
//
// Модуль чистый и в app.js не ссылается (audit-module-closure): всё, что нужно, приходит
// аргументом. Это же делает его проверяемым без браузера — `tools/audit-self-review.mjs`.
//
// Жёсткие ограничения, без которых панель стала бы генератором шума:
//   • не больше трёх кандидатов — десять предложений владелец не прочитает, а согласится со
//     всеми, и это ровно та деградация, от которой защищает канарейка;
//   • ни одного кандидата без числа под ним — «кажется, стоит починить X» это не наблюдение;
//   • система ничего не меняет сама: она называет и показывает основание.

export const SELF_REVIEW_MAX = 3;

// Двадцать решений, а не восемь. Порог доверия к типу и порог права ПРЕДЛОЖИТЬ УБРАТЬ этот тип —
// разные вещи: ошибиться в оценке уверенности дёшево, а зря убрать из продукта работающее — нет.
const MIN_DECISIONS = 20;
const REJECT_SHARE = 0.1;
const EDIT_SHARE = 0.4;
const HINT_LOOSE = 0.5;
const HINT_TIGHT = 0.9;

// `never-useful` (docs/MVP_HARD_SPEC.md §5). Порог тот же, что у соседей — двадцать наблюдений:
// право сказать про свой тип вывода «он никогда не приводит к пользе» стоит ровно столько же,
// сколько право предложить убрать тип из продукта, потому что это одно и то же решение.
//
// Но считается порог по ПРОВЕРЕННЫМ ставкам, а не по всем: непроверяемые (владелец не открывал
// систему, у вывода нет источников, вывод удалён) в знаменатель не входят вовсе. Иначе неделя,
// которой у владельца не было, засчиталась бы типу вывода как провал — а это ровно то, что
// правило про молчание запрещает.
const NEVER_USEFUL_MIN = 20;

function percent(value) {
  return Math.round((Number(value) || 0) * 100);
}

// input: { calibration, canary, sycophancy, surfaceUsage, hintType, minDecisionsForTrust, insightBets }
export function computeSelfReview(input) {
  const data = input && typeof input === "object" ? input : {};
  const calibration = data.calibration || { total: 0, types: [], byType: {} };
  const types = Array.isArray(calibration.types) ? calibration.types : [];
  const minTrust = Number(data.minDecisionsForTrust) || 8;
  const candidates = [];

  // 0. Тип вывода, который двадцать раз проверили ВРЕМЕНЕМ и ни разу не получили дела. Стоит
  // первым сознательно: отклонение — мнение в момент показа, а здесь между выводом и приговором
  // прошла неделя и не выросло ничего. При лимите в три предложения такой кандидат не должен
  // вытесняться теми, что слабее.
  //
  // «Никогда» — слово, за которое надо отвечать, поэтому условие ровно `hit === 0`: одно
  // попадание из двадцати делает утверждение ложным, и тогда это уже разговор про долю, а не
  // про «никогда».
  for (const row of Array.isArray(data.insightBets) ? data.insightBets : []) {
    const scored = Number(row && row.scored) || 0;
    if (scored < NEVER_USEFUL_MIN || (Number(row.hit) || 0) > 0) continue;
    const silent = Number(row.unverifiable) || 0;
    candidates.push({
      id: "never-useful-" + row.type,
      title: "Вывод типа «" + row.type + "» ни разу не привёл к делу",
      evidence: "Проверено временем " + scored + " раз, дела не выросло ни разу"
        + (silent ? " (ещё " + silent + " без ответа — в счёт не идут)" : ""),
      trusted: true
    });
  }

  // 1. Тип, который владелец почти не берёт. Самое дешёвое улучшение продукта: перестать тратить
  // его внимание на то, что он отклонил двадцать раз подряд.
  for (const row of types) {
    if (row.decisions < MIN_DECISIONS || row.acceptance > REJECT_SHARE) continue;
    candidates.push({
      id: "reject-" + row.type,
      title: "Я зря показываю «" + row.type + "»",
      evidence: "Ты взял " + percent(row.acceptance) + "% из " + row.decisions + " раз",
      trusted: Boolean(row.trusted)
    });
  }

  // 2. Тип, который берут, но всегда правят. Это не «плохое предложение», а понятое наполовину —
  // и чинится оно не удалением, а разбором.
  for (const row of types) {
    if (row.decisions < MIN_DECISIONS || row.editedShare < EDIT_SHARE) continue;
    candidates.push({
      id: "edited-" + row.type,
      title: "«" + row.type + "» я понимаю наполовину",
      evidence: "Ты правишь формулировку в " + percent(row.editedShare) + "% случаев из " + row.decisions,
      trusted: Boolean(row.trusted)
    });
  }

  // 3. Подсказка о повторе. Считается по тому же журналу: «дубль» и «уточнение» записаны как
  // applied, «новое» — как dismissed, поэтому доля принятых И ЕСТЬ точность подсказки.
  const hint = data.hintType ? (calibration.byType || {})[data.hintType] : null;
  if (hint && hint.decisions >= minTrust) {
    if (hint.acceptance < HINT_LOOSE) {
      candidates.push({
        id: "similar-loose",
        title: "Я слишком часто вижу повтор там, где его нет",
        evidence: "Из " + hint.decisions + " подсказок ты подтвердил " + percent(hint.acceptance) + "%",
        trusted: Boolean(hint.trusted)
      });
    } else if (hint.acceptance > HINT_TIGHT) {
      candidates.push({
        id: "similar-tight",
        title: "Я, похоже, показываю не все повторы",
        evidence: "Ты подтверждаешь " + percent(hint.acceptance) + "% подсказок — порог можно опустить",
        trusted: Boolean(hint.trusted)
      });
    }
  }

  // 4. Экран, который не открывали ни разу. Это предложение убрать из главного меню, а НЕ
  // удалить: удалять поверхности и данные система права не имеет.
  const usage = data.surfaceUsage && typeof data.surfaceUsage === "object" ? data.surfaceUsage : {};
  const unused = Object.keys(usage).filter((key) => !Number(usage[key] && usage[key].opens));
  if (unused.length) {
    candidates.push({
      id: "unused-surfaces",
      title: "Экраны, которые ты не открывал: " + unused.slice(0, 3).join(", "),
      evidence: "Ноль открытий за всё время наблюдения",
      trusted: true
    });
  }

  return {
    total: Number(calibration.total) || 0,
    candidates: candidates.slice(0, SELF_REVIEW_MAX),
    weakest: weakestPoint(data, calibration, candidates, minTrust)
  };
}

// Самое слабое место — ОДНО. Порядок важности неслучаен: канарейка смотрит не на те данные, на
// которых система училась, поэтому её вердикт перебивает любую внутреннюю цифру. Дальше дрейф
// (система знает, что отстала), потом лесть (нравится больше, чем помогает), и только потом
// обычная неточность.
function weakestPoint(data, calibration, candidates, minTrust) {
  const canary = data.canary;
  const sycophancy = data.sycophancy;
  if (canary && canary.frozenLearning) {
    return "Обучение остановлено: на замороженных вердиктах точность упала до "
      + percent(canary.accuracy) + "% при эталоне " + percent(canary.baseline) + "%.";
  }
  if (calibration.drifted) {
    return "Ты изменился быстрее, чем я успел: последние решения расходятся с прежними, история обнулена.";
  }
  if (sycophancy && sycophancy.flattering) {
    return String(sycophancy.status || "") + " — значит я нравлюсь тебе больше, чем помогаю.";
  }
  if (candidates.length) {
    return candidates[0].title + ". " + candidates[0].evidence + ".";
  }
  if ((Number(calibration.total) || 0) < minTrust) {
    return "Пока не знаю: решений в журнале " + (Number(calibration.total) || 0) + " из " + minTrust
      + ". Меньше — это не наблюдение, а совпадение.";
  }
  // Не нашёл провалов — не то же самое, что их нет. Врать об этом нельзя.
  return "Явных провалов не вижу. Это не значит, что их нет, — значит, я их не измеряю.";
}

// core/day-correlations.mjs — ВЫВОДЫ О ВРЕМЕНИ.
//
// Владелец просит не «11 связей» (это состояние базы), а наблюдение о себе: «в дни, когда ты
// работаешь дольше, ты закрываешь меньше задач». Такой вывод считается по числовым рядам из
// того, что УЖЕ есть: записей в день, потрачено в день, задач закрыто, отметок привычек, часов
// смен. Ряда про сон в продукте нет — и выдумывать его нельзя.
//
// Почему Спирмен, а не Пирсон: ряды владельца короткие, с выбросами (одна смена на 14 часов,
// один день с крупной покупкой). Ранговая корреляция на выбросы не разваливается.
//
// ПОЧЕМУ ПОПРАВКА НА МНОЖЕСТВЕННОСТЬ — ГЛАВНОЕ ЗДЕСЬ. Пять рядов дают 10 пар, десять рядов — 45.
// При пороге p < 0.05 из 45 пар примерно две окажутся «значимыми» на ЧИСТОМ ШУМЕ. Продукт,
// который показывает выдуманную закономерность, учит не верить своим выводам вообще — а это
// дороже, чем не показать ничего. Поэтому Бенджамини-Хохберг, а не голый порог.
//
// Слой чистый: на входе числа, на выходе выводы. Ни состояния, ни DOM.

// ─── 1. РАНГИ ─────────────────────────────────────────────────────────────────────────────
//
// Связанные значения получают СРЕДНИЙ ранг. Без этого дни с одинаковым результатом (а их много:
// «ноль задач закрыто» — самый частый день) сдвигают корреляцию просто порядком в массиве.
export function ranks(values) {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);
  const out = new Array(values.length);
  let position = 0;
  while (position < indexed.length) {
    let end = position;
    while (end + 1 < indexed.length && indexed[end + 1].value === indexed[position].value) end += 1;
    const averageRank = (position + end) / 2 + 1;
    for (let i = position; i <= end; i += 1) out[indexed[i].index] = averageRank;
    position = end + 1;
  }
  return out;
}

// ─── 2. КОРРЕЛЯЦИЯ СПИРМЕНА ───────────────────────────────────────────────────────────────
export function spearman(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const rx = ranks(xs.slice(0, n));
  const ry = ranks(ys.slice(0, n));
  const meanX = rx.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ry.reduce((sum, value) => sum + value, 0) / n;
  let top = 0;
  let leftSq = 0;
  let rightSq = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = rx[i] - meanX;
    const dy = ry[i] - meanY;
    top += dx * dy;
    leftSq += dx * dx;
    rightSq += dy * dy;
  }
  // Ряд-константа (владелец каждый день закрывал ровно ноль задач) корреляции не имеет вовсе.
  if (leftSq === 0 || rightSq === 0) return 0;
  return top / Math.sqrt(leftSq * rightSq);
}

// ─── 3. P-ЗНАЧЕНИЕ ────────────────────────────────────────────────────────────────────────
//
// t-приближение и нормальная аппроксимация её хвоста. Точное распределение Спирмена на малых n
// потребовало бы таблиц; приближение здесь честнее таблицы, потому что мы всё равно режем
// результат минимальным числом дней и вторым окном.
function normalTail(z) {
  // Функция ошибок, приближение Абрамовица-Стигана 7.1.26 — точности 1e-7 хватает с запасом.
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t * t * Math.exp(-x * x) - 0.254829592 * t * Math.exp(-x * x);
  const erf = sign * y;
  return 1 - (0.5 * (1 + erf));
}

export function pValue(rho, n) {
  if (!Number.isFinite(rho) || n < 4) return 1;
  const clamped = Math.max(-0.999999, Math.min(0.999999, rho));
  const t = clamped * Math.sqrt((n - 2) / (1 - clamped * clamped));
  // Двусторонняя проверка: нас интересует связь в любую сторону.
  return Math.max(0, Math.min(1, 2 * normalTail(Math.abs(t))));
}

// ─── 4. ПОПРАВКА БЕНДЖАМИНИ-ХОХБЕРГА ──────────────────────────────────────────────────────
//
// Контролирует долю ложных открытий среди принятых, а не вероятность одной ошибки. Для продукта
// это ровно нужная гарантия: «из того, что я тебе показал, ложных не больше q».
export function benjaminiHochberg(pairs, q = 0.1) {
  const sorted = pairs.slice().sort((a, b) => a.p - b.p);
  const m = sorted.length;
  if (!m) return [];
  let cutoff = -1;
  for (let i = 0; i < m; i += 1) {
    if (sorted[i].p <= ((i + 1) / m) * q) cutoff = i;
  }
  // Порог берётся по САМОМУ БОЛЬШОМУ прошедшему индексу, а не по первому непрошедшему:
  // иначе одна «дырка» в середине отрезает всё, что за ней, и метод превращается в Бонферрони.
  if (cutoff < 0) return [];
  return sorted.slice(0, cutoff + 1);
}

// ─── 5. ВЫВОДЫ ────────────────────────────────────────────────────────────────────────────

// Дней меньше этого — не считаем вовсе. Две недели это не прихоть: на десяти днях одна яркая
// неделя задаёт всю корреляцию, и вывод рассыпается на следующей.
export const MIN_DAYS = 14;
// Слабая связь, даже настоящая, наблюдением о себе не является: «чуть-чуть чаще» человек не
// может использовать. Режем по размеру эффекта, а не только по значимости.
export const MIN_EFFECT = 0.5;

function describe(rho) {
  if (rho > 0) return "вместе растут";
  return "чем больше одного, тем меньше другого";
}

// series: [{ key, label, values: number[], dayKeys: string[] }]
export function dayCorrelationInsights(series, options) {
  const opts = options || {};
  const minDays = opts.minDays || MIN_DAYS;
  const rows = (series || []).filter((row) => row && Array.isArray(row.values) && row.values.length >= minDays);
  if (rows.length < 2) {
    return { insights: [], tested: 0, note: "Данных пока мало: нужно " + minDays + " дней хотя бы по двум показателям." };
  }

  const pairs = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      const n = Math.min(a.values.length, b.values.length);
      const rho = spearman(a.values.slice(-n), b.values.slice(-n));
      if (!Number.isFinite(rho) || rho === 0) continue;
      pairs.push({ a, b, rho, n, p: pValue(rho, n) });
    }
  }

  const survived = benjaminiHochberg(pairs, opts.q || 0.1)
    .filter((pair) => Math.abs(pair.rho) >= (opts.minEffect || MIN_EFFECT));

  const insights = survived.map((pair) => ({
    id: "daycorr-" + pair.a.key + "-" + pair.b.key,
    type: "correlation",
    icon: "📈",
    title: pair.a.label + " и " + pair.b.label + " — " + describe(pair.rho),
    // Вывод обязан объяснять себя: сколько дней, насколько сильно, в какую сторону. Иначе он
    // неотличим от догадки, а догадке владелец верить не должен.
    detail: "По " + pair.n + " дням, сила связи " + Math.abs(pair.rho).toFixed(2)
      + (pair.rho > 0 ? " (растут вместе)" : " (расходятся)")
      + ". Это наблюдение, а не причина: что на что влияет, отсюда не видно.",
    confidence: Math.abs(pair.rho) >= 0.7 ? "высокая" : "пока предположение",
    refs: []
  }));

  return {
    insights,
    tested: pairs.length,
    // Честная строка о том, сколько пар проверено и сколько пережило поправку: без неё владелец
    // не знает цену находке.
    note: pairs.length
      ? "Проверено пар: " + pairs.length + ", пережило поправку на множественность: " + insights.length + "."
      : "Считать пока нечего: ряды слишком короткие или постоянные."
  };
}

// Правило «какой день ставить, когда день не назван вслух» — и обучение этому правилу на
// правках владельца. Решение владельца 2026-07-30: «Ну как понять пустой? Предположение. Мы же
// всегда даем предположение... человек сам же вводит потом правильную дату, и система может
// видеть то, что... мы неправильно распознали, предположили другую».
// Здесь только чистая логика: список правок → смещение в днях. Запись правок и создание задач
// живут в `app.js`, потому что трогают состояние.

// Меньше трёх правок — вывод был бы шумом, а не обучением. Тогда честно остаёмся на «сегодня»,
// а не изображаем обученность на одном примере.
export const DATE_GUESS_MIN_CORRECTIONS = 3;
// Сколько правок храним. Реестр обязан сокращаться (инвариант И-5 плана): бесконечная история
// правок — это не память, а свалка.
export const DATE_GUESS_MAX_KEPT = 60;

// Сколько дней от одного ключа-даты до другого. Ключи — «ГГГГ-ММ-ДД», сравниваем в UTC:
// местная полночь в поясе восточнее Гринвича даёт сдвиг на сутки (та же ловушка описана
// в parseDateFromTextHumanSafe — владелец в UTC+3 получал сроки на день вперёд).
export function daysBetweenDateKeys(fromKey, toKey) {
  const from = Date.parse(String(fromKey || "") + "T00:00:00Z");
  const to = Date.parse(String(toKey || "") + "T00:00:00Z");
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86400000);
}

// Смещение, которому владелец научил: самое частое среди последних правок.
export function learnedDateGuessOffset(corrections) {
  const recent = (Array.isArray(corrections) ? corrections : []).slice(-12);
  if (recent.length < DATE_GUESS_MIN_CORRECTIONS) return 0;
  const counts = new Map();
  for (const correction of recent) {
    const offset = Number(correction && correction.offsetDays);
    // Отрицательные сдвиги (задним числом) и далёкие даты в правило не идут: как ответ на
    // «дня не назвали» они бессмысленны, хотя как правка конкретной задачи законны.
    if (!Number.isFinite(offset) || offset < 0 || offset > 14) continue;
    counts.set(offset, (counts.get(offset) || 0) + 1);
  }
  let best = 0;
  let bestCount = 0;
  for (const [offset, count] of counts) {
    if (count > bestCount) {
      best = offset;
      bestCount = count;
    }
  }
  return bestCount >= DATE_GUESS_MIN_CORRECTIONS ? best : 0;
}

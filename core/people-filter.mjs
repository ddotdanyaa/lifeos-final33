// core/people-filter.mjs — ЧЕЛОВЕК ИЛИ НЕ ЧЕЛОВЕК.
//
// Боль владельца 2026-07-30, дословно: «Люди пять… то есть он искусственное за людей теперь
// считает, ни хуя непонятно».
//
// Откуда берётся ошибка. Имена людей вылавливаются из текста по русским подсказкам («с Анной»,
// «звонил Максиму») — `core/ru-entities.mjs`. Но в то же хранилище попадают служебные записи
// системы, и из них в список людей приходят наши собственные технические слова: Whisper, PWA,
// install prompt, service worker. Владелец видит «Люди 5» и справедливо перестаёт верить счётчику.
//
// Правильная починка — не пускать служебные записи в разбор вообще. Она живёт в `app.js`, который
// сейчас держит параллельная сессия. Этот модуль закрывает симптом там, где владелец его видит, и
// делает это узко: отвергается ТОЛЬКО то, что заведомо не человек. Ошибка «спрятал живого» дороже
// ошибки «оставил лишнего», поэтому любое сомнение решается в пользу человека.
//
// Слой чистый: строка на входе, решение на выходе.

// Наш собственный технический словарь. Источник списка — не фантазия, а слова, которые LifeOS
// сам пишет в записи: имена движков, событий и подсистем.
const TECH_WORDS = new Set([
  "whisper", "vosk", "ollama", "tesseract", "pwa", "install", "prompt", "service", "worker",
  "indexeddb", "localstorage", "lifeos", "playwright", "chrome", "chromium", "json", "api",
  "ocr", "stt", "llm", "wasm", "onnx", "boot", "manifest", "cache", "receipt", "transcript",
  "sdk", "cli", "url", "http", "https", "github", "node", "npm", "css", "html", "dom"
]);

function hasCyrillic(value) {
  return /[а-яё]/i.test(value);
}

function hasLatin(value) {
  return /[a-z]/i.test(value);
}

// Причина возвращается всегда: сущность, отвергнутая молча, вернётся через месяц и снова съест
// вечер — то же правило, что у донорских вердиктов.
export function personVerdict(name) {
  const raw = String(name || "").trim();
  if (!raw) return { isPerson: false, why: "пустое имя" };

  const words = raw.split(/\s+/);
  const lower = raw.toLowerCase();

  // Цифра в имени человека не встречается, а в служебных строках встречается постоянно
  // («Новая запись 30», «whisper-base 2»).
  if (/\d/.test(raw)) return { isPerson: false, why: "в имени есть цифра — это не человек" };

  // Аббревиатура из заглавных латинских букв: PWA, API, OCR. Русские имена так не пишутся.
  if (/^[A-Z]{2,}$/.test(raw)) return { isPerson: false, why: "латинская аббревиатура, а не имя" };

  // Любое слово из нашего технического словаря делает всю строку служебной: «Whisper транскрипт»,
  // «install prompt» — это подписи механизма, а не собеседники владельца.
  for (const word of words) {
    if (TECH_WORDS.has(word.toLowerCase().replace(/[^a-zа-яё]/gi, ""))) {
      return { isPerson: false, why: "техническое слово «" + word + "» — это подсистема, а не человек" };
    }
  }

  // Найдено на живом экране 2026-07-30: в разборе стояло «Люди: Финансовый». Извлекатель ловит
  // имя по русской подсказке, и «финансовый прогноз» после предлога выглядит для него именем.
  //
  // Точное правило вместо словаря: русское личное имя НЕ оканчивается на «-ый» и «-ое» — это
  // окончания прилагательного. Окончание «-ий» намеренно оставлено в покое: Юрий, Виталий,
  // Дмитрий, Анатолий — настоящие имена, и отсеять их значило бы спрятать живого человека,
  // что дороже лишней строки.
  if (words.length === 1 && /(ый|ое|ые|ым|ого|ому)$/i.test(raw)) {
    return { isPerson: false, why: "«" + raw + "» — прилагательное, а не имя" };
  }

  // Латиница без единой кириллической буквы в русскоязычном продукте почти всегда означает
  // название, а не собеседника. Но «почти» — не «всегда»: John и Mike возможны, поэтому
  // отвергаем только длинные многословные конструкции, а одиночное имя оставляем.
  if (hasLatin(raw) && !hasCyrillic(raw) && words.length >= 3) {
    return { isPerson: false, why: "латинская фраза из трёх слов — похоже на название, а не на имя" };
  }

  if (!hasCyrillic(raw) && !hasLatin(raw)) return { isPerson: false, why: "в имени нет букв" };

  return { isPerson: true, why: "похоже на имя человека" };
}

export function isLikelyPerson(name) {
  return personVerdict(name).isPerson;
}

// Тот же словарь нужен второму месту с той же болью: в карточке объекта справа владелец видел
// «контракт объекта · метод · рендер · квитанции · PWA BOOT» вместо своих записей. Название
// модуля шире его текущего имени — при следующей уборке словарь переедет в `core/system-noise.mjs`,
// а пока лучше одна общая функция, чем два разошедшихся списка слов.
export function looksTechnical(title) {
  const raw = String(title || "").trim();
  if (!raw) return false;
  for (const word of raw.split(/[\s\-_/.,:]+/)) {
    const clean = word.toLowerCase().replace(/[^a-zа-яё]/gi, "");
    if (clean && TECH_WORDS.has(clean)) return true;
  }
  return false;
}

// Отбор списка целиком + честный счёт отвергнутого: скрытое молча — то же враньё, что и
// показанное лишнее. Владелец должен иметь возможность спросить «а кого ты убрал».
export function filterPeople(people) {
  const kept = [];
  const dropped = [];
  for (const person of people || []) {
    const verdict = personVerdict(person && person.name);
    if (verdict.isPerson) kept.push(person);
    else dropped.push({ name: (person && person.name) || "", why: verdict.why });
  }
  return { kept, dropped };
}

// Распознавание намерения в вопросе владельца — чистые текстовые правила, без состояния и DOM.
// Живут отдельно от `app.js` по контракту модулей (П7): решают, КАКОЙ путь ответа выбрать, а не
// как его исполнить.
import { hasAnyText, normalizeRuText, normalizeTitle } from "./text.mjs";

// V1 CHAT_BRAIN: прежний запрос цитат был сырым текстом вопроса, поэтому частое слово вроде
// «сегодня» честно-но-бесполезно совпадало по заголовку с посторонней задачей («СЕГОДНЯ В 4 В
// ШИНОМОНТАЖ») и показывалось «источником» совсем другого ответа. Отсечение коротких и частых
// слов ДО поиска означает, что цитата появляется только когда совпал настоящий, конкретный
// термин из вопроса; пустой результат здесь — это «нет подходящей заметки», а не «покажи свежее».
export const CHAT_CITATION_STOPWORDS = new Set(["сегодня", "завтра", "вчера", "утром", "вечером", "себя", "какой", "какая", "какое", "какие", "какого", "уровня", "уровень", "модель", "модели", "версия", "версии", "сравни", "умеешь", "можешь", "расскажи", "объясни", "покажи", "связям", "связи", "связях", "графе", "графу", "инсайты", "инсайт", "типо", "будешь", "делать"]);

export function chatCitationQuery(text) {
  return String(text || "")
    .split(/\s+/)
    .filter((word) => word.length >= 5 && !CHAT_CITATION_STOPWORDS.has(normalizeTitle(word)))
    .join(" ");
}

export function looksLikeQuestion(text) {
  const clean = normalizeRuText(String(text || "")).trim().toLocaleLowerCase();
  if (!clean) return false;
  if (clean.includes("?")) return true;
  const openers = ["как ", "почему ", "что ", "какой ", "какая ", "какое ", "какие ", "какого ", "сколько ", "умеешь", "можешь", "расскажи", "объясни", "сравни", "покажи", "ты "];
  return openers.some((opener) => clean.startsWith(opener));
}

export function looksLikeInsightQuestion(text) {
  const clean = normalizeRuText(String(text || "")).toLocaleLowerCase();
  return hasAnyText(clean, ["инсайт", "связи", "связям", "связях", "итог", "проанализируй", "анализ", "обзор", "паттерн", "тенденци"]);
}

// Срез 8.3: явное намерение «найди/вспомни в памяти X» -> чат ищет minisearch'ем (тот же движок,
// что панель «Память» в срезе 8.2) и кладёт результат в общий memorySearchReport, чтобы Чат и
// База показывали одно и то же. Полный сценарий: вопрос -> поиск -> ответ + панель -> клик -> заметка.
export const MEMORY_RECALL_TRIGGERS = ["найди", "найти", "поищи", "поиск по памяти", "что я писал", "что писал", "о чём я писал", "о чем я писал", "покажи заметки", "покажи в памяти", "вспомни про", "вспомни что", "в памяти про", "искать в памяти", "search"];
const MEMORY_RECALL_STOPWORDS = new Set(["найди", "найти", "поищи", "поиск", "по", "памяти", "память", "в", "во", "что", "я", "писал", "писала", "о", "чем", "чём", "покажи", "показать", "заметки", "заметку", "заметка", "вспомни", "вспомнить", "про", "search", "мне", "все", "всё", "и", "а", "мои", "моих", "было", "были"]);

export function looksLikeMemoryRecall(text) {
  const clean = normalizeRuText(String(text || "")).toLocaleLowerCase();
  return hasAnyText(clean, MEMORY_RECALL_TRIGGERS);
}

export function memoryRecallQuery(text) {
  const tokens = normalizeRuText(String(text || ""))
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  return tokens.filter((token) => token.length >= 3 && !MEMORY_RECALL_STOPWORDS.has(token)).join(" ");
}

// V1 CHAT_BRAIN: «какая ты модель / какого уровня» отвечается фактом из state.ollama, а не
// отдаётся модели на выдумывание о себе — это ровно тот класс вопроса, который на скриншоте
// владельца пошёл не так.
export function isModelIdentityQuestion(text) {
  const clean = normalizeRuText(String(text || "")).toLocaleLowerCase();
  const asksAboutModel = hasAnyText(clean, ["модель", "модели", "модельного", "уровня", "уровень", "версия", "версии", "gpt", "джпт", "чатгпт"]);
  return asksAboutModel && looksLikeQuestion(text);
}

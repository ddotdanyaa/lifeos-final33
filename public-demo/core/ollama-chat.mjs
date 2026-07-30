// Чистая часть локального чата: выбор модели, сборка промпта, зачистка чужого черновика.
// Сюда вынесено ровно то, что не трогает состояние, сеть и DOM, — сам поток (`fetch` к
// `/api/chat`) остаётся в `app.js` по контракту модулей (П7).
//
// ЗАМЕРЫ 2026-07-30 на живом демоне (Ollama 0.32.1, `qwen3:4b`, CPU этой машины) — они и есть
// причина, по которой эти функции выглядят так, а не иначе:
//   • `think: false` рассуждение НЕ выключает: шаблон модели безусловно допечатывает `<think>`,
//     и «Хорошо, мне нужно ответить…» уходит прямо в текст ответа владельцу;
//   • `think: true` на `/api/chat` уводит рассуждение в отдельное поле `message.thinking`;
//   • рассуждение съедает больше тысячи токенов ДО первого символа ответа — отсюда свой бюджет;
//   • у семейства qwen3 подсказка `/no_think` срезала время с 268 до 77 секунд при том же ответе.
import { cleanLine, shorten } from "./text.mjs";

// Бюджет размышления отдельно от бюджета ответа. С прежним общим (500 обычный вопрос / 900 разбор)
// ответа не было ВООБЩЕ: поток заканчивался `done_reason: "length"` и пустым текстом.
export const OLLAMA_THINKING_BUDGET = 1800;

// Имена моделей эмбеддингов узнаваемы по семейству. Нужно там, где возможностей от демона нет
// (Ollama до 0.32 их в /api/tags не присылала) — и в выборе модели для теста эмбеддингов.
export function looksLikeEmbeddingModelName(name) {
  return /embed|bge|e5|minilm|gte/i.test(String(name || ""));
}

// Модель ЧАТА — первая, которая умеет генерировать, а не просто первая в списке.
// НАЙДЕНО 2026-07-30 на машине владельца: /api/tags отдаёт модели по дате скачивания, поэтому
// `bge-m3` и `nomic-embed-text`, скачанные утром для замера эмбеддингов, встали ПЕРЕД `qwen3:4b`
// и по прежнему правилу «models[0]» стали моделью чата. Проверка генерации на них не может пройти
// в принципе — они умеют только эмбеддинги. То есть чат владельца сломало скачивание моделей,
// а не его код, и без этой правки он видел бы «degraded» и не понимал почему.
export function pickOllamaChatModel(entries) {
  const list = Array.isArray(entries) ? entries.filter((entry) => entry && entry.name) : [];
  const canGenerate = (entry) => (Array.isArray(entry.capabilities) && entry.capabilities.length
    ? entry.capabilities.includes("completion")
    : !looksLikeEmbeddingModelName(entry.name));
  const generative = list.find(canGenerate);
  return (generative || list[0] || { name: "" }).name;
}

// Подсказка-выключатель размышления есть у семейства qwen3 и работает прямо в тексте вопроса.
// Проверяем имя, а не «на всякий случай для всех»: другая модель увидела бы её как мусор.
export function supportsNoThinkHint(model) {
  return /^qwen3\b/i.test(String(model || ""));
}

// Защита от провайдеров, которые вставляют рассуждение прямо в текст как <think>...</think>
// вместо отдельного поля. Наш путь такого не даёт (think: true), но чужой прокси может.
export function stripModelThinkingBlocks(text) {
  return String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// V1 CHAT_BRAIN: промпт был англоязычным и без графа/дня, поэтому живой `qwen3:4b` честно отвечал
// «у меня нет доступа к инсайтам графа» (правда — графа в промпте не было) и по-английски.
// Ограничение длины здесь несущее, а не стилистическое: без него собственное размышление модели
// разрасталось и выедало весь бюджет до появления ответа.
export function buildOllamaChatPrompt(context, citedNotes, question, graphSummary, daySummary, isInsightMode, ownerInstructions) {
  const notes = Array.isArray(citedNotes) ? citedNotes : [];
  const citationBlock = notes.length
    ? "Связанные локальные заметки:\n" + notes.map((note) => "- " + note.title + ": " + shorten(cleanLine(note.body || ""), 200)).join("\n") + "\n\n"
    : "";
  // Срез 14: активные правила владельца реально влияют на ответ - вплетаем их в промпт.
  const instructionBlock = Array.isArray(ownerInstructions) && ownerInstructions.length
    ? "Правила владельца (соблюдай их): " + ownerInstructions.map((rule) => "«" + rule + "»").join("; ") + ". "
    : "";
  const lengthRule = isInsightMode
    ? "Ответь по делу, используя факты ниже, в пределах 5-6 предложений."
    : "Отвечай коротко и по делу - не больше 2 коротких предложений, максимум 40 слов.";
  const active = context && typeof context === "object" ? context : { title: "", text: "" };
  return "Ты - локальный честный ассистент LifeOS, персональной ОС данных владельца. " +
    "Отвечай ТОЛЬКО на русском языке, независимо от языка вопроса. " +
    "Используй ТОЛЬКО факты ниже, ничего не выдумывай. " + lengthRule + " " + instructionBlock +
    "\n\nАктивный контекст: " + active.title + " - " + active.text +
    "\n\n" + graphSummary + "\n" + daySummary + "\n\n" + citationBlock +
    "Вопрос: " + question + "\nОтвет:";
}

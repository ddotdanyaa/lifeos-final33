import { readFileSync } from "node:fs";

const primary = [
  "ui/shell.js",
  "ui/home.js",
  "ui/components/AssistantInput.js",
  "ui/components/HumanAnswerCard.js",
  "ui/today.js",
  "ui/calendar.js",
  "ui/finance.js",
  "ui/library.js",
  "ui/chat.js"
].map((file) => readFileSync(file, "utf8")).join("\n");

const requiredRussian = [
  "Что добавить в LifeOS?",
  "Напиши, скажи, скинь файл",
  "Что я понял из записи",
  "Главное действие",
  "Задача",
  "Расход",
  // Срез Г, 2026-07-31: «Файл / скрин» переименовано в «Прикрепить». Это НЕ ослабление гейта —
  // проверка ловит английский в основном интерфейсе, и русская метка осталась русской. Название
  // сменилось вместе с продуктом: кнопка перестала описывать ТИП вложения (владелец не обязан
  // решать, файл это или скрин) и стала называть действие. Основание — MVP_SPEC.md Т1.
  "Прикрепить",
  "Аудио",
  "Книга",
  "Сегодня",
  "Деньги",
  "Контроль"
];

const missing = requiredRussian.filter((text) => !primary.includes(text));
if (missing.length) {
  console.error("Missing Russian primary labels:", missing.join(", "));
  process.exit(1);
}

const forbiddenEnglishStatus = /\b(ready|offline|ok|needs-data|provider gate|blocked external)\b/i;
if (forbiddenEnglishStatus.test(primary)) {
  console.error("Primary UI contains English/internal status wording.");
  process.exit(1);
}

console.log("audit:primary-ui-language passed");

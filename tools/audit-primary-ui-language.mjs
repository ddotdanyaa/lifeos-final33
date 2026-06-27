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
  "LifeOS понял",
  "Главное действие",
  "Задача",
  "Расход",
  "Файл / скрин",
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

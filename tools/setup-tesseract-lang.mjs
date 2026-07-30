// Языковые данные для OCR чеков — один раз и ЛОКАЛЬНО (§2.4 очереди ноутбука).
//
// Зачем инструмент, а не «tesseract.js сам скачает»: по умолчанию движок тянет `rus.traineddata`
// с `tessdata.projectnaptha.com` при каждом холодном старте воркера. Это скрытый выход в сеть на
// каждом чеке — прямое нарушение §7 CLAUDE.md («никаких скрытых действий»), да ещё и делающий
// офлайн-режим ложью. Поэтому данные лежат рядом, как модель whisper: скачаны осознанно, один раз,
// владельцем, и отдаются локальным сервером.
//
// Лицензия проверена по файлу, а не по памяти: `tesseract.js` и `tesseract.js-core` — Apache-2.0
// (`node_modules/tesseract.js-core/LICENSE`), сами `traineddata` — Apache-2.0 из репозитория
// tesseract-ocr. Оба варианта разрешены списком владельца.
//
// Запуск: node tools/setup-tesseract-lang.mjs [fast|best] [rus,eng]
//   fast — 15 МБ на язык, быстрее; best — точнее на мятой бумаге и плохом свете. Что выбрать —
//   решает ЗАМЕР на настоящих чеках, а не название варианта (так же выбиралась модель whisper:
//   `ggml-small` победила `large-v3-turbo` по времени при том же тексте).
//
// Результат: vendor/tesseract-lang/<вариант>/<язык>.traineddata (вне git, как node_modules).
import { existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const VARIANTS = {
  fast: "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/",
  best: "https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/"
};

const variant = (process.argv[2] || "fast").toLowerCase();
const languages = String(process.argv[3] || "rus,eng").split(",").map((item) => item.trim()).filter(Boolean);

if (!VARIANTS[variant]) {
  console.error("Неизвестный вариант: " + variant + ". Доступны: fast, best");
  process.exit(1);
}

const root = join("vendor", "tesseract-lang", variant);
await mkdir(root, { recursive: true });

for (const language of languages) {
  const path = join(root, language + ".traineddata");
  if (existsSync(path) && statSync(path).size > 1_000_000) {
    console.log("Уже на месте: " + path + " (" + Math.round(statSync(path).size / 1024) + " КБ)");
    continue;
  }
  const url = VARIANTS[variant] + language + ".traineddata";
  console.log("Скачиваю " + url + " ...");
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    console.error("Не скачалось: HTTP " + response.status + " для " + url);
    process.exit(1);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(path, buffer);
  console.log("Сохранено: " + path + " (" + Math.round(buffer.length / 1024) + " КБ)");
}

console.log("\nГотово. Приложение ищет данные по этому пути само (`/vendor/tesseract-lang/...`),");
console.log("и без них честно говорит «языковые данные не скачаны», а не имитирует распознавание.");

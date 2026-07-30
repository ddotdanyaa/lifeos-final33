// Корпус НАСТОЯЩИХ голосовых для замера разбора (ноутбук, Windows).
//
// Зачем: разбор до сих пор мерили на печатном тексте, который писал сам разработчик, — а владелец
// диктует. Расшифровка отличается от печати всегда: whisper ставит цифры вместо слов, теряет
// запятые, режет фразу на предложения по паузам и иногда вставляет лишний предлог («ответить в
// Дмитрию»). Мерить надо на этом, иначе замер льстит.
//
// Что делает: системным русским голосом (SAPI, ru-RU) наговаривает фразы в WAV 16 кГц моно и
// отправляет каждую в УЖЕ ЗАПУЩЕННЫЙ локальный whisper.cpp (`npm run whisper-server`) — тот же
// демон и тот же эндпоинт, что и у приложения. Ничего не имитирует: нет голоса или демона —
// говорит об этом честно и останавливается.
//
// Запуск: node tools/make-voice-corpus.mjs [путь-к-json]
// Результат: JSON вида [{ said, heard, expect }] — что было сказано, что услышала машина и что
// владелец обязан увидеть объектами. `expect` — это ОЖИДАНИЕ, записанное ДО замера: без него
// сравнение правил с моделью превращается в разглядывание двух списков, где обе стороны «вроде
// ничего». Ожидание сформулировано по смыслу сказанного, а не по тому, что умеет разбор, — иначе
// замер льстит второй раз, теперь уже нам.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Вечерний дамп владельца: смены, деньги, дела со сроком, встречи, чужая позиция, наблюдения.
// Числа записаны словами — так их произносит человек, и так их слышит модель.
//
// Двадцать четыре записи, а не восемь: разбор надо мерить на объёме одного вечера. На восьми
// фразах разница между правилами и моделью тонет в единичном случае, а владелец диктует двадцать
// с лишним раз за день.
const RECORDS = [
  {
    said: "Работаю сегодня с шестнадцати. Потратил восемьсот рублей на такси. Надо ответить Дмитрию до среды.",
    expect: [{ type: "shift", startTime: "16:00" }, { type: "finance_expense", amount: 800 }, { type: ["task", "reminder"] }]
  },
  {
    said: "Сегодня отработал двенадцать часов, заработал восемь тысяч семьсот, бензин тысяча девятьсот.",
    expect: [{ type: "shift", hours: 12 }, { type: "finance_income", amount: 8700 }, { type: "finance_expense", amount: 1900 }]
  },
  {
    said: "Завтра в четырнадцать ноль ноль зал. Купить протеин две тысячи пятьсот.",
    expect: [{ type: "calendar" }, { type: "finance_expense", amount: 2500 }]
  },
  {
    said: "Хочу купить машину до августа. Надо посчитать свободные деньги за три месяца.",
    expect: [{ type: ["goal", "money_goal"] }, { type: ["task", "reminder"] }]
  },
  {
    said: "Марина против кредита. Она согласна если без кредита.",
    expect: [{ type: ["claim", "insight", "knowledge"] }]
  },
  {
    said: "Английский снова откладываю. После тренировки закрываю больше задач.",
    expect: [{ type: ["insight", "knowledge", "note"] }]
  },
  {
    said: "Напомни вечером записать доход. Смена с шестнадцати до двадцати двух.",
    expect: [{ type: ["reminder", "task"] }, { type: "shift", startTime: "16:00" }]
  },
  {
    said: "Счёт за воду пришёл. Оплатить до пятницы тысячу двести.",
    expect: [{ type: ["finance_expense", "bill", "subscription"], amount: 1200 }, { type: ["task", "reminder"] }]
  },
  {
    said: "Поработал с восьми до одиннадцати, три часа. Триста шестнадцать после налога пришло. Потом ещё тысяча семьсот, получается четыре тысячи семьсот всего.",
    expect: [{ type: "shift", hours: 3 }, { type: "finance_income", amount: 4700 }]
  },
  {
    said: "Еду к Володе. Надо в аптеку зайти.",
    expect: [{ type: "calendar" }, { type: ["task", "reminder"] }]
  },
  {
    said: "Завтра выхожу в семь утра, работаю до семи вечера, двенадцать часов.",
    expect: [{ type: "shift", hours: 12 }]
  },
  {
    said: "Заплатил за квартиру двадцать восемь тысяч. Осталось на карте девять тысяч.",
    expect: [{ type: "finance_expense", amount: 28000 }, { type: "balance", amount: 9000 }]
  },
  {
    said: "Позвонить маме в воскресенье. И записаться к стоматологу.",
    expect: [{ type: ["task", "reminder"] }, { type: ["task", "reminder"] }]
  },
  {
    said: "Купил кроссовки шесть тысяч четыреста. Дорого, но нужны были.",
    expect: [{ type: "finance_expense", amount: 6400 }]
  },
  {
    said: "Смена была тяжёлая, устал сильно. Спал пять часов.",
    expect: [{ type: ["insight", "knowledge", "note"] }]
  },
  {
    said: "В среду техосмотр машины в десять утра. Взять документы.",
    expect: [{ type: "calendar" }, { type: ["task", "reminder"] }]
  },
  {
    said: "За неделю заработал тридцать одну тысячу. Расходы одиннадцать тысяч. Отложить двадцать.",
    expect: [{ type: "finance_income", amount: 31000 }, { type: "finance_expense", amount: 11000 }]
  },
  {
    said: "Надо поменять масло до конца месяца, примерно четыре тысячи.",
    expect: [{ type: ["task", "reminder"] }]
  },
  {
    said: "Договорился с Сергеем на субботу, поедем смотреть машину.",
    expect: [{ type: "calendar" }]
  },
  {
    said: "Начал читать книгу про привычки. Двадцать страниц за вечер.",
    expect: [{ type: ["insight", "knowledge", "note", "media", "book"] }]
  },
  {
    said: "Отработал с девяти до девятнадцати, десять часов, вышло шесть тысяч восемьсот.",
    expect: [{ type: "shift", hours: 10 }, { type: "finance_income", amount: 6800 }]
  },
  {
    said: "Забыл записать вчерашнюю смену. Восемь часов, четыре тысячи девятьсот.",
    expect: [{ type: "shift", hours: 8 }, { type: "finance_income", amount: 4900 }]
  },
  {
    said: "Не хочу больше брать смены три дня подряд. Слишком выматывает.",
    expect: [{ type: ["insight", "knowledge", "note"] }]
  },
  {
    said: "Проверить страховку до десятого августа. Стоит около двенадцати тысяч.",
    expect: [{ type: ["task", "reminder"] }]
  }
];

const ENDPOINT = process.env.WHISPER_CPP_ENDPOINT || "http://127.0.0.1:8090";
const outPath = process.argv[2] || "output/playwright/fixtures/voice-corpus.json";

function speakToWav(text, wavPath) {
  const script = [
    "Add-Type -AssemblyName System.Speech;",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;",
    "$voice = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'ru-RU' } | Select-Object -First 1;",
    "if (-not $voice) { Write-Error 'NO_RU_VOICE'; exit 2 };",
    "$s.SelectVoice($voice.VoiceInfo.Name);",
    "$s.Rate = -1;",
    "$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono);",
    `$s.SetOutputToWaveFile('${wavPath.replace(/'/g, "''")}', $fmt);`,
    `$s.Speak('${text.replace(/'/g, "''")}');`,
    "$s.SetOutputToNull(); $s.Dispose();"
  ].join(" ");
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { stdio: ["ignore", "ignore", "pipe"] });
}

async function transcribe(wavPath) {
  const body = new FormData();
  body.append("file", new Blob([readFileSync(wavPath)], { type: "audio/wav" }), "audio.wav");
  body.append("response_format", "json");
  body.append("language", "ru");
  const response = await fetch(ENDPOINT.replace(/\/+$/, "") + "/inference", { method: "POST", body });
  if (!response.ok) throw new Error("whisper.cpp ответил HTTP " + response.status);
  const payload = await response.json();
  return String(payload.text || "").replace(/\s+/g, " ").trim();
}

async function main() {
  try {
    const probe = await fetch(ENDPOINT + "/", { method: "GET" });
    if (!probe.ok) throw new Error("HTTP " + probe.status);
  } catch (error) {
    console.error("whisper.cpp недоступен на " + ENDPOINT + ": " + (error && error.message));
    console.error("Подними его командой: npm run whisper-server");
    process.exit(1);
  }

  const workDir = mkdtempSync(join(tmpdir(), "lifeos-voice-"));
  const corpus = [];
  try {
    for (let index = 0; index < RECORDS.length; index += 1) {
      const record = RECORDS[index];
      const wavPath = join(workDir, "line-" + index + ".wav");
      speakToWav(record.said, wavPath);
      const heard = await transcribe(wavPath);
      corpus.push({ said: record.said, heard, expect: record.expect });
      console.log("[" + (index + 1) + "/" + RECORDS.length + "] " + heard);
      // Пишем после КАЖДОЙ записи: двадцать четыре фразы — это четверть часа настоящей речи и
      // настоящей расшифровки, и терять их из-за обрыва на последней — глупо.
      writeFileSync(outPath, JSON.stringify(corpus, null, 2) + "\n", "utf8");
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  writeFileSync(outPath, JSON.stringify(corpus, null, 2) + "\n", "utf8");
  console.log("Корпус записан: " + outPath + " (" + corpus.length + " записей)");
}

main();

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
// Результат: JSON вида [{ said, heard }] — что было сказано и что услышала машина.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Фразы владельца из его же сценария: смена, деньги, дела со сроком, чужая позиция, наблюдение.
// Числа записаны словами — так их произносит человек, и так их слышит модель.
const LINES = [
  "Работаю сегодня с шестнадцати. Потратил восемьсот рублей на такси. Надо ответить Дмитрию до среды.",
  "Сегодня отработал двенадцать часов, заработал восемь тысяч семьсот, бензин тысяча девятьсот.",
  "Завтра в четырнадцать ноль ноль зал. Купить протеин две тысячи пятьсот.",
  "Хочу купить машину до августа. Надо посчитать свободные деньги за три месяца.",
  "Марина против кредита. Она согласна если без кредита.",
  "Английский снова откладываю. После тренировки закрываю больше задач.",
  "Напомни вечером записать доход. Смена с шестнадцати до двадцати двух.",
  "Счёт за воду пришёл. Оплатить до пятницы тысячу двести."
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
    for (let index = 0; index < LINES.length; index += 1) {
      const said = LINES[index];
      const wavPath = join(workDir, "line-" + index + ".wav");
      speakToWav(said, wavPath);
      const heard = await transcribe(wavPath);
      corpus.push({ said, heard });
      console.log("[" + (index + 1) + "/" + LINES.length + "] " + heard);
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  writeFileSync(outPath, JSON.stringify(corpus, null, 2) + "\n", "utf8");
  console.log("Корпус записан: " + outPath + " (" + corpus.length + " записей)");
}

main();

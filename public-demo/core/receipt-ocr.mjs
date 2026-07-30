// core/receipt-ocr.mjs — чек с фотографии: из распознанного текста в поля расхода.
//
// Чистый слой: ни движка, ни сети, ни DOM. Разбор чека проверяется без OCR вообще — на строках,
// которые OCR отдаёт. Это важно: движок медленный и шумный, а правила разбора обязаны быть
// проверяемыми за миллисекунды и на настоящем мусоре («ИT0ГO» вместо «ИТОГО»).
//
// Что чек отличает от любого другого текста: сумма к оплате — НЕ самая большая и НЕ первая. На
// чеке есть цены позиций, скидки, «сдача», «наличными», НДС. Владельцу нужна одна строка — та,
// что рядом со словом итога. Поэтому правило то же, что в разборе речи (§2.2): решает СЛОВО, а
// не величина.

// Слова итога на русских чеках, включая то, во что их превращает OCR: «О» ↔ «0», «И» ↔ «Н».
// Список сознательно короткий: каждое слово здесь — то, что реально печатают на чеках.
const TOTAL_WORDS = [
  "итого", "итог", "к оплате", "всего к оплате", "всего", "сумма", "total",
  "оплачено", "к уплате"
];

// Строки, которые СУММОЙ ЧЕКА не являются никогда, даже если стоят рядом со словом итога.
// «Сдача» и «наличными» — это про то, чем платили, а не сколько стоило; НДС уже внутри суммы.
const NOT_TOTAL_WORDS = ["сдача", "сдачи", "наличн", "картой", "нал.", "ндс", "без ндс", "в т.ч", "скидка", "бонус"];

// Число с чека: «1 234,56», «1234.56», «1 234». Пробел и точка внутри — разделители, а не конец.
const RECEIPT_AMOUNT_RE = /(\d{1,3}(?:[  ]\d{3})+|\d+)(?:[.,](\d{2}))?/g;

export function receiptLines(text) {
  return String(text || "")
    .split(/[\r\n]+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function parseReceiptAmount(line) {
  const matches = [...String(line || "").matchAll(RECEIPT_AMOUNT_RE)];
  if (!matches.length) return 0;
  // Из строки итога берём ПОСЛЕДНЕЕ число: на чеке слева стоит номер строки или количество,
  // а сумма печатается справа («2 x 89.50 = 179.00»).
  const last = matches[matches.length - 1];
  const whole = Number(String(last[1]).replace(/[  ]/g, ""));
  const cents = last[2] ? Number(last[2]) / 100 : 0;
  const amount = whole + cents;
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0;
}

// Дата чека — «12.07.2026», «12/07/26», «2026-07-12». Возвращает ключ дня или пустую строку:
// выдумывать сегодняшний день за владельца нельзя, чек может быть вчерашним.
export function parseReceiptDay(text) {
  const source = String(text || "");
  const dotted = source.match(/(\d{2})[.\/-](\d{2})[.\/-](\d{2,4})/);
  if (dotted) {
    const year = dotted[3].length === 2 ? "20" + dotted[3] : dotted[3];
    const month = Number(dotted[2]);
    const day = Number(dotted[1]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    }
  }
  const iso = source.match(/(20\d{2})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : "";
}

// Магазин — первая содержательная строка чека. Служебные шапки («ООО», «ИНН», «кассовый чек»)
// названием магазина не являются: владелец узнаёт магазин по вывеске, а не по форме собственности.
const MERCHANT_NOISE_RE = /^(ооо|оао|зао|ип|инн|кпп|огрн|касс|чек|смена|терминал|адрес|тел|www|http|фн|фд|фпд|рн\s?кк?м)/iu;

export function parseReceiptMerchant(lines) {
  for (const line of Array.isArray(lines) ? lines : []) {
    const clean = line.replace(/["«»*]/g, "").trim();
    if (clean.length < 3 || clean.length > 40) continue;
    if (MERCHANT_NOISE_RE.test(clean)) continue;
    if (/^\d+[\d\s.,:-]*$/.test(clean)) continue;
    return clean;
  }
  return "";
}

// Главное правило: сумма чека — та, что рядом со словом итога. Если слова итога нет вовсе, чек не
// понят, и НИЧЕГО не возвращается: владельцу честнее пустое поле, чем случайная цена одной позиции
// в качестве суммы покупки.
export function parseReceipt(text) {
  const lines = receiptLines(text);
  const lower = lines.map((line) => line.toLocaleLowerCase("ru-RU"));
  let amount = 0;
  let quote = "";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lower[index];
    if (NOT_TOTAL_WORDS.some((word) => line.includes(word))) continue;
    if (!TOTAL_WORDS.some((word) => line.includes(word))) continue;
    const found = parseReceiptAmount(lines[index]);
    // Слово итога бывает в одной строке, а число — в следующей: печать сдвигает столбец.
    const carried = found || (index + 1 < lines.length ? parseReceiptAmount(lines[index + 1]) : 0);
    if (carried > amount) {
      amount = carried;
      quote = found ? lines[index] : lines[index] + " " + (lines[index + 1] || "");
    }
  }
  return {
    amount,
    day: parseReceiptDay(text),
    merchant: parseReceiptMerchant(lines),
    quote: quote.trim(),
    lines: lines.length,
    // Понят чек или нет — отдельное поле, а не догадка по нулю: ноль бывает и у чека на возврат.
    understood: amount > 0
  };
}

// П7 · Человеческие подписи дат, денег и размеров
//
// П7: вынесено из app.js замыканием от семени — инструмент сам добрал все зависимости и
// проверил, что ни одна из них не трогает состояние, хранилище и DOM. Модуль замкнут:
// ссылок обратно в app.js нет (audit-module-closure это подтверждает).

import {
  dateKeyFromOffset,
  todayKey
} from "./text.mjs";

export function formatTimelineDayLabel(day) {
  if (day === todayKey()) return "Сегодня";
  if (day === dateKeyFromOffset(-1)) return "Вчера";
  const date = new Date(day + "T00:00:00Z");
  if (!Number.isNaN(date.getTime())) return date.getUTCDate() + " " + RU_MONTHS[date.getUTCMonth()] + ", " + RU_WEEKDAYS[date.getUTCDay()];
  return day;
}

export const OBJECT_MONTH_NAMES = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function formatObjectStamp(iso) {
  const date = new Date(iso);
  if (!iso || isNaN(date.getTime())) return "без даты";
  const day = date.getDate() + " " + OBJECT_MONTH_NAMES[date.getMonth()];
  const time = String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
  return day + " " + time;
}

// Год показываем всегда, когда он не текущий: «24 авг» для даты 2028 года — это обман,
// на нём легко принять решение, которого не принимал бы, увидев настоящий срок.
export function formatObjectDay(iso) {
  const date = new Date(iso);
  if (!iso || isNaN(date.getTime())) return "—";
  const head = date.getDate() + " " + OBJECT_MONTH_NAMES[date.getMonth()];
  return date.getFullYear() === new Date().getFullYear() ? head : head + " " + date.getFullYear();
}

export function formatObjectMoney(amount) {
  return Math.round(Number(amount) || 0).toLocaleString("ru-RU") + " ₽";
}

export const RU_WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

export const RU_MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export function humanDayLabel(day) {
  if (!day) return "";
  if (day === todayKey()) return "сегодня";
  if (day === dateKeyFromOffset(1)) return "завтра";
  if (day === dateKeyFromOffset(2)) return "послезавтра";
  return day;
}

// I-пачка (донор-идея Graphiti): ISO-дата валидности ребра → человекочитаемое «с DD.MM.YYYY».
export function formatGraphEdgeSince(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear();
}

export function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return Math.round(value / 102.4) / 10 + " KB";
  return Math.round(value / 1024 / 102.4) / 10 + " MB";
}

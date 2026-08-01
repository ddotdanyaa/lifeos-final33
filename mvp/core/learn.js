// Обучение: правка владельца меняет БУДУЩЕЕ поведение, а не только запись в журнале.
//
// Смысл всей затеи в одной строке: если вывод типа «сомнение» владелец отклоняет восемь раз,
// девятое такое же должно прийти с меньшей уверенностью — или не прийти вовсе. Сигнал, который
// пишется и никогда не читается, обучением не является.
//
// Три границы, за которые автоматика не заходит:
//   • один сигнал не двигает почти ничего (шаг 0.03) — «поехать» можно только согласованно;
//   • вес живёт в коридоре [0.5, 1.4] — тип не может ни умереть, ни захватить экран;
//   • обучение меняет ТОЛЬКО уверенность и порядок. Оно не создаёт, не правит и не удаляет
//     ни одной записи владельца.
import { makeId } from "./db.js";

export const STEP = 0.03;
export const MIN_WEIGHT = 0.5;
export const MAX_WEIGHT = 1.4;
export const TRUST_AFTER = 5;   // столько сигналов по типу — и вес начинает применяться

// Что именно означает каждое действие владельца. Принял молча и принял с правкой — разные
// вещи: второе значит «тип угадан, формулировка нет».
export const SIGNALS = {
  accepted: { value: +1.0, label: "принял" },
  edited: { value: +0.4, label: "принял с правкой" },
  rejected: { value: -1.0, label: "отклонил" },
  dismissedInsight: { value: -0.8, label: "отклонил вывод" }
};

export function record(state, kind, factType, extra) {
  const rule = SIGNALS[kind];
  if (!rule) return null;
  const before = weightOf(state, factType);
  const signal = {
    id: makeId("sig"),
    at: new Date().toISOString(),
    kind,
    factType,
    value: rule.value,
    quote: (extra && extra.quote) || "",
    recordId: (extra && extra.recordId) || "",
    weightBefore: before,
    weightAfter: before
  };
  state.signals.push(signal);

  // Вес пересчитывается только когда сигналов по типу набралось достаточно. Меньше — честнее
  // не двигать: по трём случаям различить закономерность и совпадение нельзя.
  const mine = state.signals.filter((row) => row.factType === factType);
  if (mine.length >= TRUST_AFTER) {
    const mean = mine.reduce((sum, row) => sum + row.value, 0) / mine.length;
    const target = clamp(1 + mean * 0.4, MIN_WEIGHT, MAX_WEIGHT);
    const moved = clamp(before + Math.sign(target - before) * STEP, MIN_WEIGHT, MAX_WEIGHT);
    state.weights[factType] = Number(moved.toFixed(3));
    signal.weightAfter = state.weights[factType];
  }
  return signal;
}

export function weightOf(state, factType) {
  const value = Number(state.weights && state.weights[factType]);
  return Number.isFinite(value) ? value : 1;
}

// Уверенность, показанная владельцу, — заявленная разбором и поправленная его же историей.
export function adjusted(state, item) {
  const weight = weightOf(state, item.type);
  return { value: clamp(item.confidence * weight, 0.05, 0.99), weight, trusted: weight !== 1 };
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

// «Чему научилась за сутки»: не остаток, а изменение. Считается вычитанием из того же журнала,
// поэтому разойтись с ним не может.
export function delta(state, sinceIso) {
  const since = Date.parse(sinceIso) || Date.now() - 86400000;
  const fresh = state.signals.filter((row) => Date.parse(row.at) >= since);
  const changes = new Map();
  for (const row of fresh) {
    if (row.weightAfter === row.weightBefore) continue;
    const current = changes.get(row.factType) || { type: row.factType, from: row.weightBefore, to: row.weightAfter, count: 0 };
    current.to = row.weightAfter;
    current.count += 1;
    changes.set(row.factType, current);
  }
  return {
    signals: fresh.length,
    accepted: fresh.filter((row) => row.value > 0).length,
    rejected: fresh.filter((row) => row.value < 0).length,
    changes: [...changes.values()],
    recent: fresh.slice(-6).reverse()
  };
}

// Сколько ещё сигналов нужно типу, чтобы вес начал применяться. Честный ответ вместо молчания.
export function needsMore(state, factType) {
  const mine = state.signals.filter((row) => row.factType === factType).length;
  return Math.max(0, TRUST_AFTER - mine);
}

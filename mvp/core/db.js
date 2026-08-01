// Хранилище. IndexedDB напрямую, без обёрток: одна база, одно хранилище состояния.
//
// Два правила, оба из уже случившейся потери данных:
//   • состояние по умолчанию НИКОГДА не пишется поверх непустого. Сорвавшаяся загрузка + первое
//     автосохранение = стёртый диск. Поэтому в снимок пишется число записей, и сохранение с нулём
//     поверх ненулевого отвергается;
//   • черновик сбрасывается на закрытии вкладки, а не только по таймеру: между последней буквой
//     и таймером человек успевает закрыть окно.

const DB_NAME = "lifeos-mvp";
const STORE = "state";
const KEY = "current";

let handle = null;

function open() {
  if (handle) return handle;
  handle = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return handle;
}

export function emptyState() {
  return {
    version: 1,
    records: {},        // {id, text, createdAt, day}
    facts: {},          // {id, recordId, type, title, quote, confidence, status}
    dismissedInsights: [],
    signals: [],        // {id, at, kind, factType, weightBefore, weightAfter}
    weights: {},        // тип факта → множитель уверенности
    draft: "",
    updatedAt: ""
  };
}

function countOwn(state) {
  return Object.keys(state.records || {}).length + Object.keys(state.facts || {}).length;
}

export async function load() {
  try {
    const db = await open();
    const raw = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!raw) return emptyState();
    return Object.assign(emptyState(), raw);
  } catch (error) {
    // Отказ хранилища не должен уронить приложение — но и молчать о нём нельзя.
    console.error("Хранилище не открылось:", error);
    window.__lifeosLastError = error;
    return emptyState();
  }
}

export async function save(state) {
  const db = await open();
  const previous = await new Promise((resolve) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
  // Защита от затирания: пустое поверх непустого не пишется никогда.
  if (previous && countOwn(previous) > 0 && countOwn(state) === 0) {
    console.warn("Сохранение отменено: пустое состояние поверх непустого");
    return false;
  }
  state.updatedAt = new Date().toISOString();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(state, KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  return true;
}

export async function wipe() {
  const db = await open();
  await new Promise((resolve) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
}

export function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

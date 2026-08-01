// Сборка MVP: состояние, события, отрисовка. Один делегат на все клики — обработчиков,
// висящих на элементах, нет, поэтому перерисовка ничего не ломает.
import { load, save, emptyState, makeId, wipe } from "./core/db.js";
import { analyze } from "./core/analyze.js";
import { computeInsights, findSimilar } from "./core/insights.js";
import { record as recordSignal, delta } from "./core/learn.js";
import { renderCapture, renderFacts, renderInsights, renderLearning, renderRecords } from "./ui/views.js";

let state = emptyState();
let saveTimer = null;

const root = () => document.getElementById("app");

function render() {
  const input = document.getElementById("capture-input");
  const caret = input ? input.selectionStart : null;
  const focused = document.activeElement && document.activeElement.id === "capture-input";

  const similar = state.draft.trim().length > 8 ? findSimilar(state, state.draft) : [];
  const insights = computeInsights(state);

  root().innerHTML = [
    renderCapture(state, similar),
    renderFacts(state),
    renderInsights(state, insights),
    renderLearning(state, delta(state, new Date(Date.now() - 86400000).toISOString())),
    renderRecords(state)
  ].join("");

  // Фокус и позиция курсора возвращаются: без этого ввод рвётся на каждой перерисовке.
  if (focused) {
    const next = document.getElementById("capture-input");
    if (next) {
      next.focus();
      if (caret != null) next.setSelectionRange(caret, caret);
    }
  }
}

async function commit(mutate) {
  mutate(state);
  render();
  await save(state);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(state), 600);
}

function saveRecord() {
  const text = state.draft.trim();
  if (!text) return;
  return commit((draft) => {
    const id = makeId("rec");
    draft.records[id] = { id, text, createdAt: new Date().toISOString(), deleted: false };
    for (const item of analyze(text)) {
      const factId = makeId("fact");
      draft.facts[factId] = { id: factId, recordId: id, status: "open", ...item };
    }
    draft.draft = "";
  });
}

function factAction(id, kind) {
  const item = state.facts[id];
  if (!item) return;
  return commit((draft) => {
    const target = draft.facts[id];
    target.status = kind === "rejected" ? "rejected" : "confirmed";
    recordSignal(draft, kind, target.type, { quote: target.quote, recordId: target.recordId });
  });
}

function editFact(id) {
  const item = state.facts[id];
  if (!item) return;
  const next = window.prompt("Как правильно?", item.title);
  if (next == null) return;
  const text = String(next).trim();
  if (!text) return;
  return commit((draft) => {
    const target = draft.facts[id];
    target.title = text;
    target.status = "confirmed";
    // Правка — отдельный сигнал: тип угадан, формулировка нет.
    recordSignal(draft, "edited", target.type, { quote: target.quote, recordId: target.recordId });
  });
}

function dismissInsight(id) {
  const found = computeInsights(state).find((row) => row.id === id);
  if (!found) return;
  return commit((draft) => {
    if (!draft.dismissedInsights.includes(id)) draft.dismissedInsights.push(id);
    recordSignal(draft, "dismissedInsight", found.kind, { quote: found.title });
  });
}

function insightToTask(id) {
  const found = computeInsights(state).find((row) => row.id === id);
  if (!found) return;
  return commit((draft) => {
    const factId = makeId("fact");
    draft.facts[factId] = {
      id: factId, recordId: found.refs[0] || "", status: "open",
      type: "задача", title: found.title, quote: found.detail,
      confidence: 0.9, why: "сделано из вывода вручную"
    };
  });
}

function openRecord(id) {
  const node = document.getElementById(`rec-${id}`);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.classList.add("flash");
  setTimeout(() => node.classList.remove("flash"), 1200);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "save-record") saveRecord();
  else if (action === "fact-accept") factAction(id, "accepted");
  else if (action === "fact-reject") factAction(id, "rejected");
  else if (action === "fact-edit") editFact(id);
  else if (action === "insight-dismiss") dismissInsight(id);
  else if (action === "insight-to-task") insightToTask(id);
  else if (action === "open-record") openRecord(id);
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "capture-input") return;
  state.draft = event.target.value;
  scheduleSave();
  // Похожие пересчитываются на вводе, но перерисовка — только когда их набор изменился,
  // иначе каждая буква перестраивает экран.
  const next = state.draft.trim().length > 8 ? findSimilar(state, state.draft) : [];
  const shown = document.querySelectorAll('[data-testid="similar-record"]').length;
  if (next.length !== shown) render();
});

// Черновик сбрасывается на закрытии, а не только по таймеру: между последней буквой и таймером
// человек успевает закрыть вкладку — и теряет напечатанное.
window.addEventListener("pagehide", () => { save(state); });
document.addEventListener("visibilitychange", () => { if (document.hidden) save(state); });

// Крючки для спек: состояние читается и сбрасывается снаружи.
window.__mvp = {
  get state() { return state; },
  async reset() { await wipe(); state = emptyState(); render(); },
  async seed(records) {
    await commit((draft) => {
      for (const row of records) {
        const id = makeId("rec");
        draft.records[id] = { id, text: row.text, createdAt: row.createdAt, deleted: false };
      }
    });
  },
  insights: () => computeInsights(state),
  delta: () => delta(state, new Date(Date.now() - 86400000).toISOString())
};

load().then((loaded) => { state = loaded; render(); });

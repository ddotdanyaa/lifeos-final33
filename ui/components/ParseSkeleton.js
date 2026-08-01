import { escapeHtml } from "./shared.js";

// Т2 · СКЕЛЕТОН РАЗБОРА.
//
// Претензия владельца №3: «если что-то грузится, пусть этот значок появляется, что грузится».
// До этого пакета разбор шёл молча — и это честно читалось как зависание.
//
// Скелетон повторяет ФОРМУ будущего результата: три строки разбора с местом под цитату. Не
// абстрактный прямоугольник и не крутящийся кружок. Причина простая: когда придут настоящие
// строки, экран не должен дёрнуться — иначе владелец теряет то место, куда смотрел.
//
// Подпись обязательна и обязана называть работу: «Загрузка…» без предмета врёт не меньше, чем
// молчание. Что именно делается, приходит из `withBusy(...)` в app.js.
//
// Роль `status` и `aria-busy` — не украшение: экранный диктор обязан сказать, что идёт работа,
// иначе для него страница просто замерла.
export function renderParseSkeleton(ctx) {
  const busy = ctx.busy;
  if (!busy || !busy.what) return "";
  return [
    `<section class="parse-skeleton" role="status" aria-busy="true" data-testid="parse-skeleton">`,
    `<span class="parse-skeleton-label" data-testid="parse-skeleton-label">${escapeHtml(busy.what)}…</span>`,
    // Три строки — столько же, сколько обычно даёт разбор короткой мысли. Больше рисовать нечестно:
    // это обещание объёма, которого может не быть.
    [0, 1, 2].map(() => [
      `<div class="parse-skeleton-row">`,
      `<div class="parse-skeleton-line parse-skeleton-title"></div>`,
      `<div class="parse-skeleton-line parse-skeleton-quote"></div>`,
      `</div>`
    ].join("")).join(""),
    `</section>`
  ].join("");
}

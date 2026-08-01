// МИКРОФОН ОТВЕЧАЕТ У ПОЛЯ — ЗАПИСЬЮ ИЛИ ОТКАЗОМ, НО ВСЕГДА.
//
// Владелец 2026-08-01 дословно: «у меня даже микрофон на сайте не работает». Он работал — но
// нажатие «Записать голос» не меняло на Доме НИЧЕГО. Индикатор записи и кнопка «Стоп» жили
// только на экране Аудио, далеко внизу, а ошибка доступа уезжала в `control.audioRecordingStatus`
// и на глаза не попадалась вовсе. Запись шла молча, останавливать её было нечем, отказ браузера
// выглядел так же, как успех, — то есть никак. Молчащая кнопка неотличима от сломанной, и вывод
// владельца был единственно возможным.
//
// Спека проверяет обе ветки, потому что честны обязаны быть обе:
//   1) доступ есть — у поля стоит `capture-recording` и кнопка «Остановить», и запись реально
//      доходит до сохранённого аудио;
//   2) доступа нет — у поля стоит `capture-recording-error` с причиной и выходом («напиши
//      текстом»), и продукт НЕ изображает, будто пишет;
//   3) и то и другое — В САМОМ БЛОКЕ ВВОДА и в видимой части экрана. Именно это отличало
//      «не работает» от «работает»: не наличие разметки, а место, где она стоит.
//
// Микрофона в headless нет, поэтому обе ветки задаются явно и одинаково честно. Запись идёт на
// синтетическом устройстве Chromium (`--use-fake-device-for-media-stream`) — getUserMedia,
// MediaRecorder и AnalyserNode работают по-настоящему, ненастоящее только железо; тот же приём,
// что в waveform-record.spec.mjs. Отказ задаётся на ГРАНИЦЕ СИСТЕМЫ — сам микрофон отвечает
// `NotAllowedError`, ровно как в браузере владельца до первого «разрешить». Продуктовый путь
// (перехват ошибки → статус → отрисовка у поля) при этом настоящий, ни одна его строка не
// подменена. Иначе пришлось бы полагаться на то, ЧЕМ именно откажет конкретный headless, — то
// есть проверять машину, а не продукт.
//
// `launchOptions` Playwright разрешает только на верхнем уровне файла (в describe они заставили
// бы поднимать второй воркер), поэтому синтетическое устройство включено для всего файла, а
// отказ задаётся поверх него — в той ветке, где он проверяется.
import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort().reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
test.use({
  launchOptions: {
    executablePath: localChromium,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["microphone"]
});
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// «У поля» — это утверждение о МЕСТЕ, и проверять его надо разметкой, а не глазами: ответ
// микрофона обязан лежать внутри того же блока ввода, что и само поле. Ответ, стоящий в другой
// секции, — ровно тот дефект, из-за которого владелец решил, что микрофон не работает.
async function livesInsideComposer(page, testId) {
  return page.evaluate((id) => {
    const element = document.querySelector(`[data-testid="${id}"]`);
    const composer = document.querySelector('[data-testid="mega-dropzone"]');
    const field = document.querySelector("#capture-input");
    if (!element || !composer || !field) return { inside: false, sameBlock: false };
    return {
      inside: composer.contains(element),
      // И именно рядом с полем, а не в дальнем углу того же блока: между ними меньше высоты
      // экрана, то есть владелец видит их одним взглядом.
      sameBlock: Math.abs(element.getBoundingClientRect().top - field.getBoundingClientRect().bottom) < window.innerHeight
    };
  }, testId);
}

// Отказ браузера в доступе к микрофону — не поломка, а обычное состояние: владелец не нажал
// «разрешить», или разрешение снято, или устройства нет вовсе.
const DENIAL_REASON = "Permission denied";

// ── Ветка отказа. ────────────────────────────────────────────────────────────────────────────
test.describe("микрофон не открылся", () => {
  test.beforeEach(async ({ page }) => {
    // Отказывает САМ микрофон, той же ошибкой, что и настоящий браузер. Ниже по течению всё
    // продуктовое: try/catch в startAudioRecording, статус в состоянии, отрисовка у поля.
    await page.addInitScript((reason) => {
      if (!navigator.mediaDevices) return;
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: () => Promise.reject(new DOMException(reason, "NotAllowedError"))
      });
    }, DENIAL_REASON);
  });

  test("отказ микрофона виден у поля и говорит, что делать", async ({ page }) => {
    await reset(page, "mic-denied");
    // До нажатия у поля не висит ни запись, ни ошибка: экран спокоен, пока его не спросили.
    await expect(page.getByTestId("capture-recording")).toHaveCount(0);
    await expect(page.getByTestId("capture-recording-error")).toHaveCount(0);

    await page.getByTestId("quick-voice").click();

    const failure = page.getByTestId("capture-recording-error");
    await expect(failure).toBeVisible({ timeout: 20000 });
    // Ответ состоит из трёх частей, и без любой из них он бесполезен: что случилось, почему,
    // и что владелец может сделать прямо сейчас.
    await expect(failure).toContainText("Микрофон не открылся");
    await expect(failure).toContainText("разрешение");
    await expect(failure).toContainText("напиши текстом");
    // Причина названа браузером, а не выдумана нами: пустая причина превратила бы честный
    // отказ в отписку.
    const reason = await page.evaluate(() => (window.__lifeosKnowledgeBase.getStateSnapshot().control.audioRecordingStatus || {}).error || "");
    expect(reason.trim().length, "браузер обязан назвать причину, и она обязана дойти до экрана").toBeGreaterThan(0);
    expect(reason, "причина берётся у браузера, а не сочиняется продуктом").toContain(DENIAL_REASON);
    await expect(failure).toContainText(reason);

    // §7: отказ не маскируется под успех. Никакой «идёт запись» на экране быть не может.
    await expect(page.getByTestId("capture-recording")).toHaveCount(0);
    await expect(page.getByTestId("capture-stop-recording")).toHaveCount(0);
    const status = await page.evaluate(() => (window.__lifeosKnowledgeBase.getStateSnapshot().control.audioRecordingStatus || {}).status || "");
    expect(status).toBe("error");

    // И главное — МЕСТО. Ответ стоит в блоке ввода, у поля, в видимой части экрана.
    const place = await livesInsideComposer(page, "capture-recording-error");
    expect(place.inside, "ответ микрофона обязан стоять в блоке ввода, а не на экране Аудио").toBe(true);
    expect(place.sameBlock, "ответ обязан быть виден одним взглядом с полем").toBe(true);
    await expect(failure).toBeInViewport();
  });

  test("отказ не ломает ввод: текстом записать по-прежнему можно", async ({ page }) => {
    await reset(page, "mic-denied-typing");
    await page.getByTestId("quick-voice").click();
    await expect(page.getByTestId("capture-recording-error")).toBeVisible({ timeout: 20000 });

    // Изоляция отказов (CLAUDE.md §7): подсистема отвалилась — платформа работает. Совет
    // «просто напиши текстом» обязан быть выполнимым, иначе это издевательство.
    const TYPED = "Записал руками, потому что микрофон не дали";
    await page.getByTestId("capture-input").fill(TYPED);
    await page.getByTestId("capture-text").click();
    await expect(page.getByTestId("capture-input")).toHaveValue("", { timeout: 20000 });
    const titles = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().notes || {})
      .filter((note) => note && !note.deleted).map((note) => String(note.title || "")));
    expect(titles).toContain(TYPED);
  });
});

// ── Ветка записи. Синтетический микрофон включён для всего файла (см. шапку), здесь он не
// перекрыт отказом — значит запись идёт по-настоящему. ───────────────────────────────────────
test.describe("микрофон открылся", () => {
  test("состояние записи видно у поля, и остановить её можно оттуда же", async ({ page }) => {
    await reset(page, "mic-recording");
    await expect(page.getByTestId("capture-recording")).toHaveCount(0);

    await page.getByTestId("quick-voice").click();

    const recording = page.getByTestId("capture-recording");
    await expect(recording).toBeVisible({ timeout: 20000 });
    // Строка отвечает на оба вопроса владельца: «пишется ли сейчас» и «что будет, когда
    // остановлю». Без второго он не знает, стоит ли вообще говорить.
    await expect(recording).toContainText("Идёт запись");
    await expect(recording).toContainText("расшифрую");
    await expect(page.getByTestId("capture-recording-error")).toHaveCount(0);

    const place = await livesInsideComposer(page, "capture-recording");
    expect(place.inside, "индикатор записи обязан стоять у поля, а не только на экране Аудио").toBe(true);
    expect(place.sameBlock).toBe(true);
    await expect(recording).toBeInViewport();

    // Остановка — тут же. Раньше её здесь не было вовсе: запись шла, а остановить её было
    // нечем, не уйдя на другой экран.
    const stop = page.getByTestId("capture-stop-recording");
    await expect(stop).toBeVisible();
    const audioBefore = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {})
      .filter((source) => source.kind === "audio").length);
    await stop.click();

    // Запись не «остановилась на экране» — она стала аудиозаписью в базе. Иначе кнопка
    // выглядела бы рабочей, а сказанное пропадало.
    await expect.poll(async () => page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {})
      .filter((source) => source.kind === "audio").length), { timeout: 30000 }).toBeGreaterThan(audioBefore);
    // И индикатор гаснет: «идёт запись» после остановки — это ложь о состоянии.
    await expect(page.getByTestId("capture-recording")).toHaveCount(0, { timeout: 20000 });
  });
});

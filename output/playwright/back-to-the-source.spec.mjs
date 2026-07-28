// П5 · ОБРАТНЫЙ ПУТЬ ОТ ВЫВОДА К ИСТОЧНИКУ.
//
// Провенанс в данных был всегда: у вывода есть цитата, у цитаты — источник. Навигации не было.
// Владелец видел утверждение и не мог проверить, откуда оно взялось: карточка показывала
// полную расшифровку целиком, а искать в ней ту самую фразу — его работа. Именно
// проверяемость отличает второй мозг от генератора уверенных фраз.
//
// Спека проверяет весь путь: утверждение → цитата → секунда записи, и то, что секунда
// НАСТОЯЩАЯ. Время берётся из сегментов whisper.cpp (`verbose_json`), а не из номера строки:
// «слушать с 0:00» выглядит как ответ, ответом не являясь.
import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";

// Как отдаёт whisper.cpp с `response_format=verbose_json` — замер 2026-07-28 на ggml-small.
const ENGINE_SEGMENTS = [
  { start: 0.0, end: 2.72, text: " Работаю сегодня с 16." },
  { start: 2.72, end: 5.94, text: " Потратил 800 рублей на такси." },
  { start: 5.94, end: 9.31, text: " Надо ответить Дмитрию до среды." }
];
const TRANSCRIPT = ENGINE_SEGMENTS.map((segment) => segment.text.trim()).join("\n");

// Настоящий проигрываемый файл, а не заглушка: перемотку нельзя проверить на записи, которой
// нет. 16 кГц моно, тишина — ровно тот формат, в котором до whisper.cpp доходит голос владельца.
const SILENT_WAV = `(seconds) => {
  const rate = 16000;
  const frames = Math.round(rate * seconds);
  const buffer = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(buffer);
  const ascii = (offset, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i)); };
  ascii(0, "RIFF"); view.setUint32(4, 36 + frames * 2, true); ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); ascii(36, "data"); view.setUint32(40, frames * 2, true);
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(binary);
}`;

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

test("секунда цитаты берётся у движка, а не выдумывается", async ({ page }) => {
  await reset(page, "back-to-source-seconds");

  const located = await page.evaluate(async ([text, segments]) => {
    const kb = window.__lifeosKnowledgeBase;
    const id = await kb.addImportedSourceForTest({
      name: "смена.m4a", kind: "audio", mime: "audio/mp4", size: 90000, checksum: "back-source-" + Date.now()
    });
    await kb.saveSourceTranscriptWithSegmentsForTest(id, text, segments);
    return {
      sourceId: id,
      // Каждая фраза находит СВОЁ время, а не время начала записи.
      first: kb.locateQuoteInSourceForTest(id, "Работаю сегодня с 16."),
      second: kb.locateQuoteInSourceForTest(id, "Потратил 800 рублей на такси."),
      third: kb.locateQuoteInSourceForTest(id, "Надо ответить Дмитрию до среды."),
      // Чего в записи не было — не находится вовсе. Иначе провенанс указывал бы куда попало.
      absent: kb.locateQuoteInSourceForTest(id, "Купить билеты в Сочи на январь.")
    };
  }, [TRANSCRIPT, ENGINE_SEGMENTS]);

  expect(located.first.seconds).toBe(0);
  expect(located.second.seconds, "вторая фраза начинается на 2.72 секунде").toBeCloseTo(2.72, 1);
  expect(located.second.timecode).toBe("0:02");
  expect(located.third.seconds, "третья фраза начинается на 5.94 секунде").toBeCloseTo(5.94, 1);
  expect(located.third.timecode).toBe("0:05");
  expect(located.absent, "фраза не из записи не получает места в ней").toBeNull();
});

test("из вывода два клика до места в записи", async ({ page }) => {
  await reset(page, "back-to-source-clicks");

  // Расход «800 рублей на такси» вырос из второй фразы записи — у него есть цитата и источник.
  const objectId = await page.evaluate(async ([text, segments, wavCode]) => {
    const kb = window.__lifeosKnowledgeBase;
    const makeWav = eval(wavCode);
    const sourceId = await kb.addImportedSourceForTest({
      name: "смена.wav", kind: "audio", mime: "audio/wav", size: 112044,
      dataUrl: makeWav(6), checksum: "back-clicks-" + Date.now()
    });
    await kb.saveSourceTranscriptWithSegmentsForTest(sourceId, text, segments);
    const state = kb.getStateSnapshot();
    const proposal = Object.values(state.proposals)
      .find((item) => item.status === "open" && item.type === "finance_expense" && /такси/i.test(item.title + " " + item.quote));
    if (!proposal) return "";
    await kb.applyProposalForTest(proposal.id);
    // Применённое предложение записывает id созданного объекта на себя — оттуда его и берём.
    const applied = kb.getStateSnapshot().proposals[proposal.id];
    return applied ? applied.appliedObjectId : "";
  }, [TRANSCRIPT, ENGINE_SEGMENTS, SILENT_WAV]);
  expect(objectId, "расход из надиктовки должен появиться").toBeTruthy();

  // Клик 1: открыть объект.
  await page.evaluate((id) => window.__lifeosKnowledgeBase.openObjectForTest(id), objectId);
  await expect(page.getByTestId("object-panel-sut")).toBeVisible();

  // На «Сути» сразу видна ТА САМАЯ фраза, а не вся расшифровка.
  const quote = page.getByTestId("object-source-quote").first();
  await expect(quote).toBeVisible();
  await expect(quote).toContainText("такси");

  // Клик 2: слушать с этого места. Время на кнопке — настоящее, не 0:00.
  const play = page.getByTestId("object-quote-play").first();
  await expect(play).toBeVisible();
  await expect(play).toContainText("0:02");
  await play.click();

  // Запись действительно перемотана на секунду цитаты.
  await expect.poll(async () => page.evaluate(() => {
    const player = document.querySelector('[data-testid="object-source-audio"]');
    return player ? Math.round(player.currentTime) : -1;
  }), { timeout: 10000 }).toBeGreaterThanOrEqual(2);
});

test("нет времени — нет обещания: честная подпись вместо кнопки", async ({ page }) => {
  await reset(page, "back-to-source-honest");

  // Ручная расшифровка приходит без таймкодов. Провенанс есть, времени нет — и врать о нём нельзя.
  await page.evaluate(async ([text, wavCode]) => {
    const kb = window.__lifeosKnowledgeBase;
    const makeWav = eval(wavCode);
    const sourceId = await kb.addImportedSourceForTest({
      name: "надиктовка-без-времени.wav", kind: "audio", mime: "audio/wav", size: 112044,
      dataUrl: makeWav(6), checksum: "back-honest-" + Date.now()
    });
    await kb.saveSourceTranscriptForTest(sourceId, text);
    const state = kb.getStateSnapshot();
    const proposal = Object.values(state.proposals)
      .find((item) => item.status === "open" && item.type === "finance_expense" && /такси/i.test(item.title + " " + item.quote));
    if (!proposal) return "";
    await kb.applyProposalForTest(proposal.id);
    const applied = kb.getStateSnapshot().proposals[proposal.id];
    const objectId = applied ? applied.appliedObjectId : "";
    if (objectId) await kb.openObjectForTest(objectId);
    return objectId;
  }, [TRANSCRIPT, SILENT_WAV]);

  await expect(page.getByTestId("object-panel-sut")).toBeVisible();
  const quote = page.getByTestId("object-source-quote").first();
  await expect(quote).toBeVisible();
  // Первая фраза записи стоит на нулевой секунде и без таймкодов неотличима от «времени нет»,
  // поэтому у цитаты со второй фразы кнопки быть не должно вовсе.
  await expect(page.getByTestId("object-quote-play")).toHaveCount(0);
  await expect(page.getByTestId("object-quote-no-time").first()).toContainText("без таймкодов");
});
